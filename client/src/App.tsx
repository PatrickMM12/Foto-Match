import { Switch, Route } from "wouter";
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
  // Check if user is logged in on app load
  const { data: session, isLoading } = useQuery({
    queryKey: ["/api/auth/session"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include"
        });
        if (!res.ok) {
          if (res.status === 401) {
            return { user: null };
          }
          throw new Error("Failed to fetch session");
        }
        return res.json();
      } catch (error) {
        console.error("Session fetch error:", error);
        return { user: null };
      }
    },
    retry: false,
  });

  const user = session?.user;

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
