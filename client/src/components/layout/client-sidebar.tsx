import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  User, 
  Calendar, 
  LogOut, 
  Menu, 
  X, 
  Camera 
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useEffect, useState } from 'react';

const ClientSidebar = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      toast({
        title: 'Logout realizado',
        description: 'Você saiu da sua conta com sucesso.',
      });
      navigate('/');
      window.location.reload(); // Ensure all auth state is cleared
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao fazer logout',
        description: error.message || 'Ocorreu um erro ao sair da conta.',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location.startsWith(path);
  };

  const navItems = [
    { icon: <Search className="h-5 w-5" />, label: 'Buscar Fotógrafos', path: '/client/search' },
    { icon: <Calendar className="h-5 w-5" />, label: 'Minhas Reservas', path: '/client/bookings' },
    { icon: <User className="h-5 w-5" />, label: 'Meu Perfil', path: '/client/profile' },
  ];

  // Desktop sidebar
  const DesktopSidebar = (
    <div className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Link href="/" className="flex items-center space-x-2">
          <Camera className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl text-gray-900">FotoConnect</span>
        </Link>
      </div>
      <div className="flex flex-col flex-1 py-6 px-4">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-gray-200">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile sidebar button and sheet
  const MobileSidebar = (
    <div className="lg:hidden fixed top-4 left-4 z-30">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full bg-white shadow-md">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-2">
              <Camera className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl text-gray-900">FotoConnect</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-col flex-1 py-6 px-4">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <a
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t border-gray-200">
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <>
      {DesktopSidebar}
      {isMobile && MobileSidebar}
    </>
  );
};

export default ClientSidebar;
