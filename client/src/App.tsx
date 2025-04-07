import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import PhotographerDashboard from "@/pages/photographer-dashboard";
import PhotographerProfile from "@/pages/photographer-profile";
import PhotographerCalendar from "@/pages/photographer-calendar";
import PhotographerFinances from "@/pages/photographer-finances";
import PhotographerSessions from "@/pages/photographer-sessions";
import ClientSearch from "@/pages/client-search";
import ClientProfile from "@/pages/client-profile";
import ClientBookings from "@/pages/client-bookings";
import PhotographerDetail from "@/pages/photographer-detail";
import NotFound from "@/pages/not-found";

// Components
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import LoadingSpinner from "@/components/shared/loading-spinner";

function App() {
  const [location, setLocation] = useLocation();

  // Check if user is logged in on app load
  const { data: session, isLoading } = useQuery({
    queryKey: ["/api/auth/session"],
    queryFn: async () => {
      try {
        // Obter o token do localStorage
        const token = localStorage.getItem('authToken');
        console.log('Token obtido do localStorage:', token ? 'Presente' : 'Ausente');
        
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch("/api/auth/session", {
          headers,
          credentials: "include"
        });
        
        console.log('Resposta da verificação de sessão:', res.status, res.statusText);
        
        if (!res.ok) {
          if (res.status === 401) {
            // Se o token for inválido, remover do localStorage
            localStorage.removeItem('authToken');
            console.log('Token removido por ser inválido');
            return { user: null };
          }
          throw new Error("Failed to fetch session");
        }
        const data = await res.json();
        console.log('Dados de sessão obtidos:', data.user ? 'Usuário autenticado' : 'Sem usuário');
        return data;
      } catch (error) {
        console.error("Session fetch error:", error);
        return { user: null };
      }
    },
    retry: false,
  });

  const user = session?.user;

  // Log para debug
  useEffect(() => {
    if (user) {
      console.log('Usuário autenticado:', user.name, user.userType);
    } else {
      console.log('Nenhum usuário autenticado');
    }
  }, [user]);

  // Redirecionar para login quando o usuário tentar acessar páginas protegidas sem estar autenticado
  useEffect(() => {
    if (!isLoading && !user) {
      if (
        location.startsWith('/photographer/') ||
        location.startsWith('/client/')
      ) {
        console.log('Tentativa de acesso a rota protegida sem autenticação, redirecionando para login');
        setLocation('/login');
      }
    }
  }, [location, user, isLoading, setLocation]);

  // Determine if showing auth pages or app pages
  const isLoggedIn = !!user;
  const isPhotographer = user?.userType === "photographer";
  const isClient = user?.userType === "client";

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} />
      <main className="flex-grow">
        <Switch>
          {/* Public Routes */}
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />

          {/* Photographer Routes */}
          <Route path="/photographer/dashboard">
            {isLoggedIn && isPhotographer ? <PhotographerDashboard /> : <Login />}
          </Route>
          <Route path="/photographer/profile">
            {isLoggedIn && isPhotographer ? <PhotographerProfile /> : <Login />}
          </Route>
          <Route path="/photographer/calendar">
            {isLoggedIn && isPhotographer ? <PhotographerCalendar /> : <Login />}
          </Route>
          <Route path="/photographer/finances">
            {isLoggedIn && isPhotographer ? <PhotographerFinances /> : <Login />}
          </Route>
          <Route path="/photographer/sessions">
            {isLoggedIn && isPhotographer ? <PhotographerSessions /> : <Login />}
          </Route>

          {/* Client Routes */}
          <Route path="/client/search">
            {isLoggedIn && isClient ? <ClientSearch /> : <Login />}
          </Route>
          <Route path="/client/profile">
            {isLoggedIn && isClient ? <ClientProfile /> : <Login />}
          </Route>
          <Route path="/client/bookings">
            {isLoggedIn && isClient ? <ClientBookings /> : <Login />}
          </Route>
          <Route path="/photographer/:id">
            <PhotographerDetail />
          </Route>

          {/* Fallback */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

export default App;
