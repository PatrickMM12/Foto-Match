import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
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

  // Verificar se estamos na landing page
  const isLandingPage = location === "/";

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Obter o token do localStorage para incluir no cabeçalho
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      
      return response;
    },
    onSuccess: () => {
      // Remover o token do localStorage
      localStorage.removeItem('authToken');
      console.log('Token removido do localStorage durante logout');
      
      toast({
        title: 'Logout realizado',
        description: 'Você saiu da sua conta com sucesso.',
      });
      
      // Redirecionar para a página inicial
      window.location.href = '/';
    },
    onError: (error: any) => {
      // Tentar remover o token mesmo em caso de erro
      localStorage.removeItem('authToken');
      console.log('Token removido do localStorage após erro no logout');
      
      toast({
        title: 'Erro ao fazer logout',
        description: error.message || 'Ocorreu um erro ao sair da conta.',
        variant: 'destructive',
      });
      
      // Redirecionar para a página inicial mesmo em caso de erro
      window.location.href = '/';
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

  // Função para rolar para a seção quando clicar no link
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Se não encontrar a seção na página atual, navegar para a landing page com o hash
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <Link href="/" className="flex items-center space-x-2">
          <Camera className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl text-gray-900">FotoConnect</span>
        </Link>

        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Menu de navegação desktop - mostrar apenas na landing page */}
          {isLandingPage && (
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#home" 
                onClick={(e) => scrollToSection(e, 'home')} 
                className={`transition-colors ${isActive('/#home') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}>
                Início
              </a>
              <a href="#features" 
                onClick={(e) => scrollToSection(e, 'features')} 
                className={`transition-colors ${isActive('/#features') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}>
                Recursos
              </a>
              <a href="#how-it-works" 
                onClick={(e) => scrollToSection(e, 'how-it-works')} 
                className={`transition-colors ${isActive('/#how-it-works') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}>
                Como Funciona
              </a>
              <a href="#pricing" 
                onClick={(e) => scrollToSection(e, 'pricing')} 
                className={`transition-colors ${isActive('/#pricing') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary'}`}>
                Preços
              </a>
            </nav>
          )}

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
                        <Link href="/photographer/dashboard" className="w-full cursor-pointer flex items-center">
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/photographer/profile" className="w-full cursor-pointer flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            <span>Perfil</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/photographer/calendar" className="w-full cursor-pointer flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Agenda</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/client/search" className="w-full cursor-pointer flex items-center">
                            <Search className="mr-2 h-4 w-4" />
                            <span>Buscar Fotógrafos</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/client/bookings" className="w-full cursor-pointer flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Minhas Reservas</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/client/profile" className="w-full cursor-pointer flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            <span>Meu Perfil</span>
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
                        <Link href="/photographer/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center py-2 font-medium">
                          <FileText className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                        <Link href="/photographer/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center py-2 font-medium">
                          <User className="mr-2 h-4 w-4" />
                          Perfil
                        </Link>
                        <Link href="/photographer/calendar" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center py-2 font-medium">
                          <Calendar className="mr-2 h-4 w-4" />
                          Agenda
                        </Link>
                        <Link href="/photographer/sessions" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center py-2 font-medium">
                          <Camera className="mr-2 h-4 w-4" />
                          Sessões
                        </Link>
                        <Link href="/photographer/finances" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center py-2 font-medium">
                          <FileText className="mr-2 h-4 w-4" />
                          Finanças
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link href="/client/search" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center py-2 font-medium">
                          <Search className="mr-2 h-4 w-4" />
                          Buscar Fotógrafos
                        </Link>
                        <Link href="/client/bookings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center py-2 font-medium">
                          <Calendar className="mr-2 h-4 w-4" />
                          Minhas Reservas
                        </Link>
                        <Link href="/client/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center py-2 font-medium">
                          <User className="mr-2 h-4 w-4" />
                          Meu Perfil
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
                    {/* Links da landing page no menu mobile - apenas mostrar na landing page */}
                    {isLandingPage && (
                      <>
                        <a href="#home" onClick={(e) => {
                          scrollToSection(e, 'home');
                          setIsMobileMenuOpen(false);
                        }} className="py-2 font-medium">
                          Início
                        </a>
                        <a href="#how-it-works" onClick={(e) => {
                          scrollToSection(e, 'how-it-works');
                          setIsMobileMenuOpen(false);
                        }} className="py-2 font-medium">
                          Como Funciona
                        </a>
                        <a href="#features" onClick={(e) => {
                          scrollToSection(e, 'features');
                          setIsMobileMenuOpen(false);
                        }} className="py-2 font-medium">
                          Recursos
                        </a>
                        <a href="#pricing" onClick={(e) => {
                          scrollToSection(e, 'pricing');
                          setIsMobileMenuOpen(false);
                        }} className="py-2 font-medium">
                          Preços
                        </a>
                      </>
                    )}
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
