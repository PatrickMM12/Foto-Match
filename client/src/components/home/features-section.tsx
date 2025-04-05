import { 
  Camera, 
  Calendar, 
  BarChart, 
  MapPin, 
  CreditCard, 
  Star, 
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: <Camera className="text-primary text-xl" />,
    title: "Portfólio Profissional",
    description: "Crie um perfil atraente com suas melhores fotos e integração direta com seu Instagram.",
    bgColor: "bg-blue-100",
  },
  {
    icon: <Calendar className="text-green-500 text-xl" />,
    title: "Agendamento Inteligente",
    description: "Gerencie sua disponibilidade com calendário interativo e aceite reservas automaticamente.",
    bgColor: "bg-green-100",
  },
  {
    icon: <BarChart className="text-orange-500 text-xl" />,
    title: "Gestão Financeira",
    description: "Controle receitas e despesas com categorização específica para negócios fotográficos.",
    bgColor: "bg-orange-100",
  },
  {
    icon: <MapPin className="text-red-500 text-xl" />,
    title: "Busca por Localização",
    description: "Clientes encontram fotógrafos próximos através de um mapa interativo com filtros avançados.",
    bgColor: "bg-red-100",
  },
  {
    icon: <CreditCard className="text-yellow-500 text-xl" />,
    title: "Pagamentos Seguros",
    description: "Processo de pagamento simplificado e seguro para clientes e fotógrafos.",
    bgColor: "bg-yellow-100",
  },
  {
    icon: <Star className="text-purple-500 text-xl" />,
    title: "Sistema de Avaliações",
    description: "Avaliações detalhadas por critérios específicos para construir sua reputação.",
    bgColor: "bg-purple-100",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Tudo o que você precisa em um só lugar</h2>
          <p className="text-muted-foreground text-lg">
            Nossa plataforma oferece ferramentas especializadas para fotógrafos gerenciarem seus negócios e para clientes encontrarem os melhores profissionais.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gray-50 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <a href="#" className="text-primary font-medium hover:text-primary/80 inline-flex items-center">
                  Saiba mais <ChevronRight className="ml-1 h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
