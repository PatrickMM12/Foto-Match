import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import Header from './header';
import Footer from './footer';
import AppFooter from './app-footer';
import { useAuth } from '@/hooks/use-auth';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Verifica se estamos na landing page (rota /)
  const isLandingPage = location === '/';
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} />
      <main className="flex-grow">
        {children}
      </main>
      {isLandingPage ? <Footer /> : <AppFooter />}
    </div>
  );
};

export default Layout;