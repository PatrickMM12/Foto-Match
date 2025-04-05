import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, LogOut, User, Search, Camera, Calendar, FileText } from 'lucide-react';

type HeaderProps = {
  user?: any;
};

const Header: React.FC<HeaderProps> = ({ user }) => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    return location === path;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <Link href="/" className="flex items-center space-x-2">
          <Camera className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl text-gray-900">FotoConnect</span>
        </Link>

        <div className="flex items-center space-x-4 sm:space-x-6">
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className={`transition-colors ${isActive('/') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}>
                Início
              </a>
            </Link>
            <Link href="/#how-it-works">
              <a className={`transition-colors ${isActive('/#how-it-works') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}>
                Como Funciona
              </a>
            </Link>
            <Link href="/#features">
              <a className={`transition-colors ${isActive('/#features') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}>
                Recursos
              </a>
            </Link>
            <Link href="/#pricing">
              <a className={`transition-colors ${isActive('/#pricing') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}>
                Preços
              </a>
            </Link>
          </nav>

          {user ? (
            <div className="flex items-center space-x-3">
              {user.userType === 'client' && (
                <Link href="/client/search">
                  <Button variant="ghost" size="sm" className="hidden md:flex">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Fotógrafos
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="flex items-center justify-start p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {user.userType === 'photographer' ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/photographer/dashboard">
                          <a className="w-full cursor-pointer flex items-center">
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                          </a>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/photographer/profile">
                          <a className="w-full cursor-pointer flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            <span>Perfil</span>
                          </a>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/photographer/calendar">
                          <a className="w-full cursor-pointer flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Agenda</span>
                          </a>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/client/search">
                          <a className="w-full cursor-pointer flex items-center">
                            <Search className="mr-2 h-4 w-4" />
                            <span>Buscar Fotógrafos</span>
                          </a>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/client/bookings">
                          <a className="w-full cursor-pointer flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Minhas Reservas</span>
                          </a>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/client/profile">
                          <a className="w-full cursor-pointer flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            <span>Meu Perfil</span>
                          </a>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center text-destructive focus:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost" className="hidden md:inline-flex">
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button>Cadastrar</Button>
              </Link>
            </div>
          )}

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="p-0 md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                <span className="sr-only">Abrir menu</span>
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-primary" />
                  <span className="font-bold">FotoConnect</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex flex-col space-y-4 mt-8">
                {user ? (
                  <>
                    <div className="flex items-center space-x-3 mb-6">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>

                    {user.userType === 'photographer' ? (
                      <>
                        <Link href="/photographer/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                          <a className="flex items-center py-2 font-medium">
                            <FileText className="mr-2 h-4 w-4" />
                            Dashboard
                          </a>
                        </Link>
                        <Link href="/photographer/profile" onClick={() => setIsMobileMenuOpen(false)}>
                          <a className="flex items-center py-2 font-medium">
                            <User className="mr-2 h-4 w-4" />
                            Perfil
                          </a>
                        </Link>
                        <Link href="/photographer/calendar" onClick={() => setIsMobileMenuOpen(false)}>
                          <a className="flex items-center py-2 font-medium">
                            <Calendar className="mr-2 h-4 w-4" />
                            Agenda
                          </a>
                        </Link>
                        <Link href="/photographer/sessions" onClick={() => setIsMobileMenuOpen(false)}>
                          <a className="flex items-center py-2 font-medium">
                            <Camera className="mr-2 h-4 w-4" />
                            Sessões
                          </a>
                        </Link>
                        <Link href="/photographer/finances" onClick={() => setIsMobileMenuOpen(false)}>
                          <a className="flex items-center py-2 font-medium">
                            <FileText className="mr-2 h-4 w-4" />
                            Finanças
                          </a>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link href="/client/search" onClick={() => setIsMobileMenuOpen(false)}>
                          <a className="flex items-center py-2 font-medium">
                            <Search className="mr-2 h-4 w-4" />
                            Buscar Fotógrafos
                          </a>
                        </Link>
                        <Link href="/client/bookings" onClick={() => setIsMobileMenuOpen(false)}>
                          <a className="flex items-center py-2 font-medium">
                            <Calendar className="mr-2 h-4 w-4" />
                            Minhas Reservas
                          </a>
                        </Link>
                        <Link href="/client/profile" onClick={() => setIsMobileMenuOpen(false)}>
                          <a className="flex items-center py-2 font-medium">
                            <User className="mr-2 h-4 w-4" />
                            Meu Perfil
                          </a>
                        </Link>
                      </>
                    )}

                    <div className="border-t pt-4 mt-4">
                      <Button 
                        variant="ghost" 
                        className="w-full flex items-center justify-start p-0 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                      <a className="py-2 font-medium">Início</a>
                    </Link>
                    <Link href="/#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>
                      <a className="py-2 font-medium">Como Funciona</a>
                    </Link>
                    <Link href="/#features" onClick={() => setIsMobileMenuOpen(false)}>
                      <a className="py-2 font-medium">Recursos</a>
                    </Link>
                    <Link href="/#pricing" onClick={() => setIsMobileMenuOpen(false)}>
                      <a className="py-2 font-medium">Preços</a>
                    </Link>
                    <div className="border-t pt-4 mt-4 flex flex-col space-y-2">
                      <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full">Entrar</Button>
                      </Link>
                      <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full">Cadastrar</Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
