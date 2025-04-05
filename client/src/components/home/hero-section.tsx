import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search } from 'lucide-react';

const HeroSection = () => {
  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 pt-16 pb-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Transforme sua paixão por fotografia em um negócio de sucesso
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              A plataforma completa que conecta fotógrafos e clientes com ferramentas de gestão financeira, agendamento e portfólio integrado.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register">
                <Button size="lg" className="flex items-center bg-primary hover:bg-primary/90">
                  <span>Sou Fotógrafo</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/client/search">
                <Button size="lg" variant="outline" className="flex items-center">
                  <span>Buscar Fotógrafos</span>
                  <Search className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 overflow-hidden aspect-[3/2] bg-cover bg-center" 
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1612538498456-e861df91d4d0?auto=format&fit=crop&w=500&h=350)' }}>
                </div>
                <div className="rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 overflow-hidden aspect-[3/2] bg-cover bg-center" 
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=500&h=250)' }}>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 overflow-hidden aspect-[3/2] bg-cover bg-center" 
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?auto=format&fit=crop&w=500&h=250)' }}>
                </div>
                <div className="rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 overflow-hidden aspect-[3/2] bg-cover bg-center" 
                  style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1604537466608-109fa2f16c3b?auto=format&fit=crop&w=500&h=350)' }}>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
