import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import { Link } from 'wouter';

const plans = [
  {
    name: "Básico",
    description: "Para quem está começando",
    price: "Grátis",
    period: "",
    features: [
      { included: true, text: "Perfil profissional" },
      { included: true, text: "Agenda básica" },
      { included: true, text: "Até 5 sessões por mês" },
      { included: true, text: "Controle financeiro simples" },
      { included: false, text: "Integração com Instagram" },
      { included: false, text: "Destaque no mapa de busca" }
    ],
    buttonText: "Começar Grátis",
    buttonVariant: "outline",
    highlight: false
  },
  {
    name: "Profissional",
    description: "Para fotógrafos estabelecidos",
    price: "R$49",
    period: "/mês",
    features: [
      { included: true, text: "Tudo do plano Básico" },
      { included: true, text: "Sessões ilimitadas" },
      { included: true, text: "Integração com Instagram" },
      { included: true, text: "Destaque no mapa de busca" },
      { included: true, text: "Gestão financeira completa" },
      { included: true, text: "Suporte prioritário" }
    ],
    buttonText: "Assinar Agora",
    buttonVariant: "default",
    highlight: true,
    badge: "Mais Popular"
  },
  {
    name: "Business",
    description: "Para estúdios e equipes",
    price: "R$99",
    period: "/mês",
    features: [
      { included: true, text: "Tudo do plano Profissional" },
      { included: true, text: "Até 5 fotógrafos na mesma conta" },
      { included: true, text: "Agendamento para equipes" },
      { included: true, text: "Análise avançada de negócios" },
      { included: true, text: "Website personalizado" },
      { included: true, text: "Suporte VIP" }
    ],
    buttonText: "Começar Trial",
    buttonVariant: "outline",
    highlight: false
  }
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Planos para todos os perfis</h2>
          <p className="text-muted-foreground text-lg">
            Escolha o plano ideal para suas necessidades e comece a transformar sua fotografia em negócio.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${plan.highlight ? 'border-primary shadow-lg transform scale-105' : 'border-gray-200 shadow'}`}
            >
              {plan.highlight && plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  {plan.badge}
                </div>
              )}
              
              <CardHeader className={`text-center ${plan.highlight ? 'bg-primary text-white' : ''}`}>
                <CardTitle className={`text-xl ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</CardTitle>
                <CardDescription className={plan.highlight ? 'text-blue-100' : 'text-muted-foreground'}>
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={plan.highlight ? 'text-blue-100' : 'text-muted-foreground'}>
                    {plan.period}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      {feature.included ? (
                        <Check className={`h-5 w-5 mt-0.5 mr-3 ${plan.highlight ? 'text-primary' : 'text-green-500'}`} />
                      ) : (
                        <X className="h-5 w-5 mt-0.5 mr-3 text-muted-foreground" />
                      )}
                      <span className={feature.included ? 'text-gray-700' : 'text-muted-foreground opacity-70'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Link href="/register" className="w-full">
                  <Button 
                    variant={plan.buttonVariant as "default" | "outline" | "ghost" | "link"} 
                    className={`w-full ${plan.highlight ? '' : 'border-primary text-primary hover:bg-primary hover:text-white'}`}
                  >
                    {plan.buttonText}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
