import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
      try {
        // Clone a resposta para poder ler o corpo
        const resClone = res.clone();
        let errorData;
        
        try {
          // Tentar interpretar como JSON
          errorData = await resClone.json();
          console.log("Resposta de erro como JSON:", errorData);
          
          // Verificar explicitamente por erro de email não confirmado
          if (errorData.errorCode === "EMAIL_NOT_CONFIRMED" || 
              (errorData.message && errorData.message.includes("Email not confirmed"))) {
            console.log("Detectado erro de email não confirmado via JSON");
            throw {
              status: res.status,
              message: errorData.message,
              errorCode: "EMAIL_NOT_CONFIRMED",
              email: errorData.email || (data && typeof data === 'object' && 'email' in data ? (data as any).email : undefined)
            };
          }
          
          // Outros erros estruturados
          throw {
            status: res.status,
            message: errorData.message || "Unknown error",
            errorCode: errorData.errorCode,
            email: errorData.email,
            details: errorData.details
          };
        } catch (jsonError) {
          // Se o jsonError tem propriedades que esperamos de um erro estruturado, provavelmente é o nosso throw
          if (jsonError && typeof jsonError === 'object' && 'errorCode' in jsonError) {
            console.log("Propagando erro estruturado:", jsonError);
            throw jsonError;
          }
          
          // Não conseguiu interpretar como JSON ou não tinha o formato esperado
          const errorText = await res.text();
          console.log("Resposta de erro como texto:", errorText);
          
          // Tentar parsear como JSON (pode ser um JSON válido retornado como texto)
          try {
            const errorObj = JSON.parse(errorText);
            
            // Verificar se é um erro de email não confirmado no JSON
            if (errorObj.errorCode === "EMAIL_NOT_CONFIRMED" || 
                (errorObj.message && errorObj.message.includes("Email not confirmed"))) {
              console.log("Detectado erro de email não confirmado no JSON texto");
              throw {
                status: res.status,
                message: errorObj.message,
                errorCode: "EMAIL_NOT_CONFIRMED",
                email: errorObj.email || (data && typeof data === 'object' && 'email' in data ? (data as any).email : undefined)
              };
            }
            
            throw {
              status: res.status,
              message: errorObj.message || "Unknown error",
              errorCode: errorObj.errorCode,
              details: errorObj.details
            };
          } catch (e) {
            // Não é JSON - verificar manualmente por padrões de texto
            if (errorText.includes("Email not confirmed")) {
              console.log("Detectado erro de email não confirmado no texto");
              throw {
                status: res.status,
                message: "Email not confirmed",
                errorCode: "EMAIL_NOT_CONFIRMED",
                email: data && typeof data === 'object' && 'email' in data ? (data as any).email : undefined
              };
            }
            
            // Erro genérico
            throw new Error(`${res.status}: ${errorText || res.statusText}`);
          }
        }
      } catch (e) {
        // Se o erro já tem a estrutura que esperamos, apenas propague
        if (e && typeof e === 'object' && 'errorCode' in e) {
          throw e;
        }
        // Fallback para erros genéricos
        throw new Error(e instanceof Error ? e.message : String(e));
      }
    }

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

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    }
    
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
