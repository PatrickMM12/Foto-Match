import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current session
  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/auth/session'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        if (!res.ok) {
          if (res.status === 401) {
            return { user: null };
          }
          throw new Error('Failed to fetch session');
        }
        return res.json();
      } catch (error) {
        console.error('Session fetch error:', error);
        return { user: null };
      }
    },
    retry: false,
  });

  const isAuthenticated = !!session?.user;
  const user = session?.user;

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/session'], { user: data.user });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      
      toast({
        title: 'Login realizado com sucesso!',
        description: `Bem-vindo de volta, ${data.user.name}!`,
      });
      
      // Redirect based on user type
      if (data.user.userType === 'photographer') {
        navigate('/photographer/dashboard');
      } else {
        navigate('/client/search');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao fazer login',
        description: error.message || 'Verifique suas credenciais e tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest('POST', '/api/auth/register', userData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/session'], { user: data.user });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      
      toast({
        title: 'Cadastro realizado com sucesso!',
        description: `Bem-vindo ao FotoConnect, ${data.user.name}!`,
      });
      
      // Redirect based on user type
      if (data.user.userType === 'photographer') {
        navigate('/photographer/dashboard');
      } else {
        navigate('/client/search');
      }
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
      return await apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/session'], { user: null });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      
      toast({
        title: 'Logout realizado',
        description: 'Você saiu da sua conta com sucesso.',
      });
      
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao fazer logout',
        description: error.message || 'Ocorreu um erro ao sair da conta.',
        variant: 'destructive',
      });
    },
  });

  // Login function
  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
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
