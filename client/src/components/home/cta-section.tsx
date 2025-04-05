import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

const CtaSection = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-primary to-blue-600 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 max-w-3xl mx-auto">
          Pronto para transformar sua fotografia em um negócio de sucesso?
        </h2>
        <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
          Junte-se a milhares de fotógrafos que já estão usando o FotoConnect para gerenciar e expandir seus negócios.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="bg-white text-primary hover:bg-blue-50">
              Criar Conta Grátis
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Saiba Mais
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
