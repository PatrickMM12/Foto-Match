import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  User, 
  Calendar, 
  Camera, 
  BarChart, 
  Menu, 
  X 
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useEffect, useState } from 'react';

const PhotographerSidebar = () => {
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

  const isActive = (path: string) => {
    return location.startsWith(path);
  };

  const navItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/photographer/dashboard' },
    { icon: <User className="h-5 w-5" />, label: 'Perfil', path: '/photographer/profile' },
    { icon: <Calendar className="h-5 w-5" />, label: 'Agenda', path: '/photographer/calendar' },
    { icon: <Camera className="h-5 w-5" />, label: 'Sessões', path: '/photographer/sessions' },
    { icon: <BarChart className="h-5 w-5" />, label: 'Finanças', path: '/photographer/finances' },
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
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
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
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
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

export default PhotographerSidebar;
