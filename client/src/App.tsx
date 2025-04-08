import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";

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
import Layout from "@/components/layout/layout";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { useAuth } from "@/hooks/use-auth";

function App() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

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
    <Layout>
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
    </Layout>
  );
}

export default App;
