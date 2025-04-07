import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Obter o token de autenticação do localStorage
  const token = localStorage.getItem('authToken');
  console.log(`Requisição ${method} para ${url}, token presente:`, !!token);
  
  // Preparar os headers
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Adicionar o token de autenticação se disponível
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`Resposta para ${method} ${url}:`, res.status, res.ok);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Erro na requisição ${method} ${url}:`, res.status, errorText);
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`Erro ao fazer requisição ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Obter o token de autenticação do localStorage
    const token = localStorage.getItem('authToken');
    
    // Preparar os headers
    const headers: Record<string, string> = {};
    
    // Adicionar o token de autenticação se disponível
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30000,
      retry: 1,
      onError: (error) => {
        console.error('React Query error:', error);
      },
      onSuccess: (data) => {
        console.log('React Query success, data received', !!data);
      },
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('React Query mutation error:', error);
      },
      onSuccess: () => {
        console.log('React Query mutation completed successfully');
      },
    },
  },
});
