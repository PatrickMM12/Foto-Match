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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoCircledIcon, EnvelopeClosedIcon, ReloadIcon } from '@radix-ui/react-icons';

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
  const [resendLoading, setResendLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  // Botão para testar o alerta manualmente no modo de desenvolvimento
  const [showDebugButtons, setShowDebugButtons] = useState(false);

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

  // Adicionar função para reenviar email de verificação
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
          toast({
            title: 'Email enviado',
            description: 'Um novo email de verificação foi enviado. Verifique sua caixa de entrada e spam.',
            duration: 6000,
          });
        } else {
          toast({
            title: 'Erro ao enviar email',
            description: data.message || 'Não foi possível enviar o email de verificação.',
            variant: 'destructive',
            duration: 5000,
          });
        }
      })
      .catch(err => {
        setResendLoading(false);
        console.error('Erro ao reenviar email de verificação:', err);
        toast({
          title: 'Erro ao enviar email',
          description: 'Ocorreu um erro ao tentar enviar o email de verificação.',
          variant: 'destructive',
          duration: 5000,
        });
      });
  };
  
  const processEmailNotConfirmedError = (email: string) => {
    console.log('Processando erro de email não confirmado para:', email);
    setEmailToConfirm(email || form.getValues('email'));
    setEmailConfirmNeeded(true);
    setDebugInfo(`Erro detectado às ${new Date().toLocaleTimeString()}`);
  };
  
  // Função para mostrar manualmente o alerta de confirmação de email (apenas para testes)
  const testShowEmailAlert = () => {
    const email = form.getValues('email');
    if (!email) {
      toast({
        title: 'Preencha o email',
        description: 'Preencha o campo de email para testar o alerta',
        variant: 'destructive',
      });
      return;
    }
    processEmailNotConfirmedError(email);
  };

  // Implementar um método direto de login que não depende de apiRequest
  const directLogin = async (data: LoginFormValues): Promise<any> => {
    console.log('Tentando fazer login direto para:', data.email);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      console.log('Resposta do login direto:', response.status, response.ok);
      
      // Se a resposta for bem-sucedida, retornar os dados
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      // Tentar ler a resposta de erro como JSON
      try {
        const errorData = await response.json();
        console.log('Erro de login como JSON:', errorData);
        
        // Verificar explicitamente por erro de email não confirmado
        if (errorData.errorCode === 'EMAIL_NOT_CONFIRMED' || 
            (errorData.message && errorData.message.includes('Email not confirmed'))) {
          console.log('Detectado erro de email não confirmado no JSON da resposta');
          
          // Definir o estado diretamente
          processEmailNotConfirmedError(errorData.email || data.email);
          
          throw {
            status: response.status,
            message: errorData.message,
            errorCode: 'EMAIL_NOT_CONFIRMED',
            email: errorData.email || data.email
          };
        }
        
        // Outros erros estruturados
        throw {
          status: response.status,
          message: errorData.message || 'Erro de autenticação',
          errorCode: errorData.errorCode,
          details: errorData.details
        };
      } catch (jsonError) {
        // Se o erro já está estruturado como esperamos, propague-o
        if (jsonError && typeof jsonError === 'object' && 'errorCode' in jsonError) {
          throw jsonError;
        }
        
        // Não conseguiu interpretar como JSON, tenta como texto
        const errorText = await response.text();
        console.log('Erro de login como texto:', errorText);
        
        // Verificar pelo padrão de email não confirmado no texto
        if (errorText.includes('Email not confirmed') || errorText.includes('not confirmed')) {
          console.log('Detectado erro de email não confirmado no texto da resposta');
          
          // Definir o estado diretamente
          processEmailNotConfirmedError(data.email);
          
          throw {
            status: response.status,
            message: 'Email not confirmed',
            errorCode: 'EMAIL_NOT_CONFIRMED',
            email: data.email
          };
        }
        
        throw new Error(`${response.status}: ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Erro durante o login direto:', error);
      throw error;
    }
  };

  // Alterar o mutationFn para usar o método direto
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      setIsLoading(true);
      try {
        // Usar o método direto em vez do apiRequest
        return await directLogin(data);
      } catch (error: any) {
        console.log('Erro capturado no mutationFn:', error);
        console.dir(error);
        
        // Garantir que identificamos corretamente o erro de email não confirmado
        if (typeof error === 'object') {
          if (error.errorCode === 'EMAIL_NOT_CONFIRMED' || 
              (error.message && typeof error.message === 'string' && 
               (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')))) {
            console.log('Erro de email não confirmado identificado no mutationFn');
            
            // Garantir que o email seja definido
            const emailToUse = error.email || data.email;
            
            // Chamar a função de processamento se ainda não foi chamada
            if (!emailConfirmNeeded) {
              processEmailNotConfirmedError(emailToUse);
            }
            
            // Garantir que o erro tenha as propriedades corretas
            error.errorCode = 'EMAIL_NOT_CONFIRMED';
            error.email = emailToUse;
          }
        }
        
        throw error;
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
      console.log('onError recebeu o seguinte erro:', error);
      console.dir(error);
      
      let errorMessage = 'Verifique suas credenciais e tente novamente.';
      let title = 'Erro ao fazer login';
      let shouldShowEmailConfirmation = false;
      
      // Utilizar uma função mais explícita para verificar se é um erro de email não confirmado
      const isEmailNotConfirmedError = (err: any): boolean => {
        if (!err) return false;
        
        // Verificar todas as formas possíveis do erro aparecer
        if (typeof err === 'object') {
          // Pelo código de erro
          if (err.errorCode === 'EMAIL_NOT_CONFIRMED') return true;
          
          // Pela mensagem
          if (err.message && typeof err.message === 'string') {
            const msg = err.message.toLowerCase();
            if (msg.includes('email not confirmed') || 
                msg.includes('not confirmed') || 
                msg.includes('confirm your email')) {
              return true;
            }
          }
          
          // Pelo statusCode e código de erro do Supabase
          if (err.code === 'email_not_confirmed' || 
              (err.error && err.error.code === 'email_not_confirmed')) {
            return true;
          }
        }
        
        return false;
      };
      
      // Verificar se é um erro de email não confirmado
      if (isEmailNotConfirmedError(error)) {
        console.log('Processando erro de email não confirmado em onError');
        title = 'Email não verificado';
        errorMessage = 'Você precisa verificar seu email antes de fazer login. Confira sua caixa de entrada e pasta de spam.';
        shouldShowEmailConfirmation = true;
        
        // Garantir que o email seja definido
        const emailToUse = error.email || form.getValues('email');
        
        // Definir o estado diretamente se não foi definido no mutationFn
        if (!emailConfirmNeeded) {
          processEmailNotConfirmedError(emailToUse);
        }
      } else if (error.errorCode === 'INVALID_CREDENTIALS' || 
                (error.message && error.message.includes('Incorrect email or password'))) {
        errorMessage = 'Email ou senha incorretos. Verifique seus dados e tente novamente.';
      } else if (error.errorCode === 'USER_NOT_FOUND' || 
                (error.message && error.message.includes('User not found'))) {
        errorMessage = 'Usuário não encontrado. Verifique se você digitou o email corretamente ou crie uma nova conta.';
      } else if (error instanceof Error) {
        errorMessage = `Erro: ${error.message}`;
      } else if (typeof error === 'object') {
        errorMessage = `Erro: ${error.message || JSON.stringify(error)}`;
      } else {
        errorMessage = `Erro inesperado: ${String(error)}`;
      }
      
      // Mostrar toast apenas se não estivermos mostrando o alerta de confirmação
      if (!emailConfirmNeeded && !shouldShowEmailConfirmation) {
        console.log('Mostrando toast com erro:', title, errorMessage);
        toast({
          title: title,
          description: errorMessage,
          variant: 'destructive',
          duration: 6000,
        });
      } else {
        console.log('Não mostrando toast porque o alerta de email já está sendo exibido:', 
                  'emailConfirmNeeded =', emailConfirmNeeded, 
                  'shouldShowEmailConfirmation =', shouldShowEmailConfirmation);
      }
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
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
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs"
                  onClick={testShowEmailAlert}
                >
                  Testar alerta de email
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs"
                  onClick={() => setEmailConfirmNeeded(false)}
                >
                  Esconder alerta
                </Button>
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
                <p className="mb-3">
                  Você precisa verificar seu email <strong>{emailToConfirm}</strong> antes de fazer login.
                </p>
                
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium"
                    onClick={resendVerificationEmail}
                    disabled={resendLoading}
                  >
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
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-amber-300 hover:bg-amber-100"
                    onClick={confirmEmail}
                    disabled={confirmLoading}
                  >
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
                {debugInfo && (
                  <p className="text-xs text-amber-700 mt-1 mb-2">
                    Debug: {debugInfo}
                  </p>
                )}
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
                {isLoading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
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