import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Link } from 'wouter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoCircledIcon } from '@radix-ui/react-icons';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfirmNeeded, setEmailConfirmNeeded] = useState(false);
  const [emailToConfirm, setEmailToConfirm] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const confirmEmail = () => {
    if (!emailToConfirm) return;
    
    setConfirmLoading(true);
    fetch('/api/auth/confirm-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: emailToConfirm }),
    })
      .then(res => res.json())
      .then(data => {
        setConfirmLoading(false);
        if (data.message === "Email confirmed successfully") {
          toast({
            title: 'Email confirmado',
            description: 'Seu email foi confirmado manualmente. Tente fazer login novamente.',
            duration: 5000,
          });
          setEmailConfirmNeeded(false);
        } else {
          toast({
            title: 'Erro ao confirmar email',
            description: data.message || 'Não foi possível confirmar seu email.',
            variant: 'destructive',
            duration: 5000,
          });
        }
      })
      .catch(err => {
        setConfirmLoading(false);
        console.error('Erro ao confirmar email:', err);
        toast({
          title: 'Erro ao confirmar email',
          description: 'Ocorreu um erro ao tentar confirmar seu email.',
          variant: 'destructive',
          duration: 5000,
        });
      });
  };

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      setIsLoading(true);
      try {
        const res = await apiRequest('POST', '/api/auth/login', data);
        return await res.json();
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      setEmailConfirmNeeded(false);
      
      // Salvar o token de autenticação
      if (data.session && data.session.access_token) {
        localStorage.setItem('authToken', data.session.access_token);
        console.log('Token de autenticação salvo:', data.session.access_token.substring(0, 10) + '...');
      } else {
        console.error('Erro: Token de autenticação não disponível na resposta');
      }
      
      toast({
        title: 'Login realizado com sucesso!',
        description: `Bem-vindo de volta, ${data.user.name}!`,
      });
      
      // Redirect based on user type - usando window.location diretamente
      const destination = data.user.userType === 'photographer' 
        ? '/photographer/dashboard' 
        : '/client/search';
        
      console.log(`Redirecionando para: ${destination}`);
      
      // Adicionar um pequeno atraso para garantir que o toast seja exibido
      setTimeout(() => {
        window.location.href = destination;
      }, 300);
    },
    onError: (error: any) => {
      let errorMessage = 'Verifique suas credenciais e tente novamente.';
      let title = 'Erro ao fazer login';
      
      if (error.message) {
        if (error.message.includes("Incorrect email or password")) {
          errorMessage = 'Email ou senha incorretos. Verifique seus dados e tente novamente.';
          setEmailConfirmNeeded(false);
        } else if (error.message.includes("not confirmed") || error.message.includes("Email not confirmed")) {
          title = 'Email não confirmado';
          errorMessage = 'Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada.';
          setEmailToConfirm(form.getValues('email'));
          setEmailConfirmNeeded(true);
        } else if (error.message.includes("User not found")) {
          errorMessage = 'Usuário não encontrado. Verifique se você digitou o email corretamente ou crie uma nova conta.';
          setEmailConfirmNeeded(false);
        } else {
          setEmailConfirmNeeded(false);
        }
      }
      
      toast({
        title: title,
        description: errorMessage,
        variant: 'destructive',
        duration: 6000,
      });
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Entrar na sua conta</CardTitle>
          <CardDescription className="text-center">
            Digite seu email e senha para acessar a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailConfirmNeeded && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <InfoCircledIcon className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                Seu email não foi confirmado. Verifique sua caixa de entrada ou clique abaixo para confirmar manualmente.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 w-full border-amber-300 hover:bg-amber-100"
                  onClick={confirmEmail}
                  disabled={confirmLoading}
                >
                  {confirmLoading ? 'Confirmando...' : 'Confirmar Email Manualmente'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Esqueceu sua senha?
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm mt-2">
            Não tem uma conta?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Criar conta
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
