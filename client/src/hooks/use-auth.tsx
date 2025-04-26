import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@shared/schema';

// Definir tipo para dados de login
interface LoginCredentials {
  email: string;
  password: string;
}

// Definir tipo para resposta de login (simplificado)
interface LoginResponse {
  user: User;
  session: {
    access_token: string;
    // outros campos da sessão, se houver
  };
  message?: string; // Para mensagens como "Email not confirmed"
  errorCode?: string; // Para códigos de erro como "EMAIL_NOT_CONFIRMED"
  email?: string; // Para o email não confirmado
}

// Erro customizado para email não confirmado
export class EmailNotConfirmedError extends Error {
  email: string;
  constructor(email: string, message?: string) {
    super(message || `Email ${email} requires confirmation.`);
    this.name = 'EmailNotConfirmedError';
    this.email = email;
    // Manter a stack trace (necessário para V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailNotConfirmedError);
    }
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current session
  const { data: sessionData, isLoading: isLoadingSession } = useQuery<{ user: User | null }>({
    queryKey: ['/api/auth/session'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          return { user: null };
        }
        const res = await fetch('/api/auth/session', {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('authToken');
          }
          console.error('Session fetch failed:', res.status);
          return { user: null };
        }
        const data = await res.json();
        if (data.user) {
          data.user.password = undefined;
        }
        return data as { user: User | null };
      } catch (error) {
        console.error('Session fetch error:', error);
        return { user: null };
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const isLoading = isLoadingSession;
  const user = sessionData?.user ?? null;
  const isAuthenticated = !!user;

  // Login mutation
  const loginMutation = useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      console.log('useAuth: Tentando fazer login para:', credentials.email);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      console.log('useAuth: Resposta do login:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        return data as LoginResponse;
      }

      let errorData: any = null;
      try {
        errorData = await response.json();
        console.log('useAuth: Erro de login (JSON):', errorData);
      } catch (jsonError) {
        const errorText = await response.text();
        console.log('useAuth: Erro de login (Texto):', errorText);
        errorData = { message: errorText || `HTTP error ${response.status}` };
      }

      if (errorData.errorCode === 'EMAIL_NOT_CONFIRMED' ||
          (errorData.message && typeof errorData.message === 'string' &&
           (errorData.message.includes('Email not confirmed') || errorData.message.includes('not confirmed')))) {
        console.log('useAuth: Detectado erro de email não confirmado');
        const emailToConfirm = errorData.email || credentials.email;
        throw new EmailNotConfirmedError(emailToConfirm, errorData.message);
      }

      const errorMessage = errorData.message || 'Authentication failed';
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).errorCode = errorData.errorCode;
      (error as any).details = errorData.details;
      throw error;
    },
    onSuccess: (data, variables) => {
      console.log("useAuth: Login onSuccess", data);
      if (data.session?.access_token) {
        localStorage.setItem('authToken', data.session.access_token);
        console.log('useAuth: Token salvo');
      } else {
         console.error('useAuth Error: Auth token not available in login response');
      }

      const userData = { user: { ...data.user, password: undefined } };
      queryClient.setQueryData(['/api/auth/session'], userData);

      toast({
        title: 'Login realizado com sucesso!',
        description: `Bem-vindo de volta, ${data.user.name}!`,
      });

      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');
      let destination = '';

      if (redirectUrl && redirectUrl.startsWith('/')) {
         destination = redirectUrl;
         console.log(`useAuth: Redirecionando para URL de origem: ${destination}`);
      } else {
         destination = data.user.userType === 'photographer'
           ? '/photographer/dashboard'
           : '/client/search';
         console.log(`useAuth: Redirecionando para destino padrão: ${destination}`);
      }

      navigate(destination, { replace: true });
    },
    onError: (error: Error, variables) => {
      console.error('useAuth: Login onError:', error);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest('POST', '/api/auth/register', userData);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.message && data.message.includes("Verification email")) {
         toast({
            title: 'Conta criada com sucesso!',
            description: 'Um email de verificação foi enviado. Verifique sua caixa de entrada (e spam) para confirmar seu cadastro antes de fazer login.',
            duration: 8000,
         });
         setTimeout(() => navigate('/login'), 300);
         return;
      }

      if (data.session?.access_token) {
        localStorage.setItem('authToken', data.session.access_token);
      } else {
         console.warn('Nenhum token de acesso disponível após registro');
      }

      queryClient.setQueryData(['/api/auth/session'], { user: data.user });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });

      toast({
        title: 'Cadastro realizado com sucesso!',
        description: `Bem-vindo ao FotoConnect, ${data.user.name}!`,
      });

      const destination = data.user.userType === 'photographer'
           ? '/photographer/dashboard'
           : '/client/search';
      navigate(destination, { replace: true });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar conta',
        description: error.message || 'Verifique seus dados e tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      return response;
    },
    onSuccess: () => {
      localStorage.removeItem('authToken');
      queryClient.setQueryData(['/api/auth/session'], { user: null });
      toast({
        title: 'Logout realizado',
        description: 'Você saiu da sua conta com sucesso.',
      });
      navigate('/');
    },
    onError: (error: any) => {
      localStorage.removeItem('authToken');
      queryClient.setQueryData(['/api/auth/session'], { user: null });
      toast({
        title: 'Erro ao fazer logout',
        description: error.message || 'Ocorreu um erro ao sair da conta.',
        variant: 'destructive',
      });
      navigate('/');
    },
  });

  // Login function
  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials);
  };

  // Register function
  const register = async (userData: any) => {
    await registerMutation.mutateAsync(userData);
  };

  // Logout function
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
