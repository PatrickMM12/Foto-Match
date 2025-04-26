import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useAuth, EmailNotConfirmedError } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Link } from 'wouter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoCircledIcon, EnvelopeClosedIcon, ReloadIcon } from '@radix-ui/react-icons';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfirmNeeded, setEmailConfirmNeeded] = useState(false);
  const [emailToConfirm, setEmailToConfirm] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [showDebugButtons, setShowDebugButtons] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
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
          toast({ title: 'Email confirmado', description: 'Tente fazer login novamente.' });
          setEmailConfirmNeeded(false);
        } else {
          toast({ title: 'Erro ao confirmar', description: data.message, variant: 'destructive' });
        }
      })
      .catch(err => {
        setConfirmLoading(false);
        console.error('Erro ao confirmar email:', err);
        toast({ title: 'Erro ao confirmar', description: 'Ocorreu um erro.', variant: 'destructive' });
      });
  };

  const resendVerificationEmail = () => {
    if (!emailToConfirm) return;
    setResendLoading(true);
    fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: emailToConfirm }),
    })
      .then(res => res.json())
      .then(data => {
        setResendLoading(false);
        if (data.success) {
          toast({ title: 'Email enviado', description: 'Verifique sua caixa de entrada e spam.' });
        } else {
          toast({ title: 'Erro ao enviar', description: data.message, variant: 'destructive' });
        }
      })
      .catch(err => {
        setResendLoading(false);
        console.error('Erro ao reenviar email:', err);
        toast({ title: 'Erro ao enviar', description: 'Ocorreu um erro.', variant: 'destructive' });
      });
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setEmailConfirmNeeded(false);
    try {
      await auth.login(data);
    } catch (error) {
      console.error('Erro no componente Login:', error);
      if (error instanceof EmailNotConfirmedError) {
        setEmailToConfirm(error.email || data.email);
        setEmailConfirmNeeded(true);
        setDebugInfo(`EmailNotConfirmedError recebido às ${new Date().toLocaleTimeString()}`);
      } else if (error instanceof Error) {
        toast({
          title: 'Erro ao fazer login',
          description: error.message || 'Verifique suas credenciais e tente novamente.',
          variant: 'destructive',
          duration: 6000,
        });
      } else {
        toast({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro desconhecido durante o login.',
          variant: 'destructive',
          duration: 6000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testShowEmailAlert = () => {
    const email = form.getValues('email');
    if (!email) {
      toast({ title: 'Preencha o email', variant: 'destructive' });
      return;
    }
    setEmailToConfirm(email);
    setEmailConfirmNeeded(true);
    setDebugInfo(`Alerta de teste ativado às ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Entrar na sua conta
            <button 
              onClick={() => setShowDebugButtons(!showDebugButtons)} 
              className="text-xs text-gray-400 ml-2 hover:text-gray-600"
            >
              [debug]
            </button>
          </CardTitle>
          <CardDescription className="text-center">
            Digite seu email e senha para acessar a plataforma
          </CardDescription>
          {showDebugButtons && (
            <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">Ferramentas de depuração:</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs" onClick={testShowEmailAlert}>Testar alerta</Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setEmailConfirmNeeded(false)}>Esconder alerta</Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {emailConfirmNeeded && (
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <EnvelopeClosedIcon className="h-5 w-5 text-amber-600" />
              <AlertTitle className="text-amber-900 font-medium text-base">
                Verificação de email pendente
              </AlertTitle>
              <AlertDescription className="text-amber-800 mt-2">
                <p className="mb-3">Você precisa verificar seu email <strong>{emailToConfirm}</strong> antes de fazer login.</p>
                <div className="space-y-3">
                  <Button variant="outline" size="sm" className="w-full border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium" onClick={resendVerificationEmail} disabled={resendLoading}>
                    {resendLoading ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <EnvelopeClosedIcon className="mr-2 h-4 w-4" />
                        Reenviar email de verificação
                      </>
                    )}
                  </Button>
                  <div className="text-sm text-amber-800 flex items-center justify-center">
                    <span>ou</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-amber-300 hover:bg-amber-100" onClick={confirmEmail} disabled={confirmLoading}>
                    {confirmLoading ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      'Confirmar manualmente (apenas desenvolvimento)'
                    )}
                  </Button>
                </div>
                {debugInfo && (<p className="text-xs text-amber-700 mt-1 mb-2">Debug: {debugInfo}</p>)}
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
                    <FormControl><Input placeholder="seu@email.com" {...field} /></FormControl>
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
                    <FormControl><Input type="password" placeholder="******" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || auth.isLoading}>
                {isLoading || auth.isLoading ? (
                  <><ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">Esqueceu sua senha?</Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm mt-2">
            Não tem uma conta? <Link href="/register" className="text-primary hover:underline">Criar conta</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;