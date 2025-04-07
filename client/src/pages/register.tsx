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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link } from 'wouter';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirme sua senha'),
  userType: z.enum(['photographer', 'client'], {
    required_error: 'Selecione um tipo de usuário',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      userType: 'client',
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      setIsLoading(true);
      try {
        const res = await apiRequest('POST', '/api/auth/register', data);
        return await res.json();
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      // Verifica se recebemos uma mensagem sobre email de verificação
      if (data.message && data.message.includes("Verification email")) {
        toast({
          title: 'Conta criada com sucesso!',
          description: 'Um email de verificação foi enviado para o seu endereço de email. Por favor, verifique sua caixa de entrada (e pasta de spam) para confirmar seu cadastro antes de fazer login.',
          duration: 8000,
        });
        
        // Redirecionar para a página de login após pequeno atraso
        setTimeout(() => {
          window.location.href = '/login';
        }, 300);
        return;
      }
      
      // Salva o token de autenticação se disponível
      if (data.session && data.session.access_token) {
        localStorage.setItem('authToken', data.session.access_token);
        console.log('Token de autenticação salvo após registro:', data.session.access_token.substring(0, 10) + '...');
      } else {
        console.warn('Nenhum token de acesso disponível após registro');
      }
      
      toast({
        title: 'Conta criada com sucesso!',
        description: `Bem-vindo à FotoConnect, ${data.user.name}!`,
      });
      
      // Redirect based on user type
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
      let errorMessage = 'Verifique seus dados e tente novamente.';
      
      if (error.message) {
        if (error.message.includes("Email already in use")) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login ou recuperar sua senha.';
        } else if (error.message.includes("not confirmed")) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada para o link de confirmação.';
        }
      }
      
      toast({
        title: 'Erro ao criar conta',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Criar uma nova conta</CardTitle>
          <CardDescription className="text-center">
            Preencha os dados abaixo para se registrar na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme sua senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tipo de conta</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="photographer" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Sou fotógrafo e quero oferecer meus serviços
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="client" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Sou cliente e quero contratar fotógrafos
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Registrando...' : 'Criar conta'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm mt-2">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;
