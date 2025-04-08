import { Link } from 'wouter';

const AppFooter = () => {
  return (
    <footer className="bg-gray-100 text-gray-600 py-4 border-t">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm mb-2 md:mb-0">&copy; {new Date().getFullYear()} FotoConnect. Todos os direitos reservados.</p>
          <div className="flex space-x-6">
            <Link href="/termos" className="text-sm hover:text-primary transition-colors">Termos</Link>
            <Link href="/privacidade" className="text-sm hover:text-primary transition-colors">Privacidade</Link>
            <Link href="/ajuda" className="text-sm hover:text-primary transition-colors">Ajuda</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter; 