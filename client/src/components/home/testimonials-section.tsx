import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: "Ricardo Oliveira",
    role: "Fotógrafo de Casamentos",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=48&h=48",
    rating: 5,
    comment: "Desde que comecei a usar o FotoConnect, minha gestão financeira melhorou drasticamente. Consigo visualizar exatamente quanto estou ganhando em cada categoria de fotografia e meus agendamentos aumentaram em 30%.",
    duration: "Usuário há 8 meses"
  },
  {
    name: "Carla Mendes",
    role: "Cliente",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=48&h=48",
    rating: 4.5,
    comment: "Encontrar um fotógrafo para o aniversário do meu filho nunca foi tão fácil! O mapa me mostrou profissionais próximos com seus portfólios e avaliações. Em minutos já tinha feito minha reserva.",
    duration: "Usuária há 3 meses"
  },
  {
    name: "André Santos",
    role: "Fotógrafo de Eventos",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=48&h=48",
    rating: 5,
    comment: "A integração com o Instagram foi um diferencial incrível para mim. Meus seguidores agora podem agendar sessões diretamente. E o controle financeiro me ajudou a entender melhor meus custos e lucros.",
    duration: "Usuário há 12 meses"
  }
];

const TestimonialsSection = () => {
  // Function to render stars based on rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`star-${i}`} className="fill-yellow-400 text-yellow-400 h-4 w-4" />
      );
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <div key="half-star" className="relative">
          <Star className="text-gray-300 h-4 w-4" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="fill-yellow-400 text-yellow-400 h-4 w-4" />
          </div>
        </div>
      );
    }
    
    // Add empty stars to make a total of 5
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="text-gray-300 h-4 w-4" />
      );
    }
    
    return stars;
  };

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">O que nossos usuários dizem</h2>
          <p className="text-muted-foreground text-lg">
            Veja como nossa plataforma está ajudando fotógrafos a crescerem e clientes a encontrarem os melhores profissionais.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    className="w-12 h-12 rounded-full object-cover" 
                  />
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {renderStars(testimonial.rating)}
                </div>
                <p className="text-muted-foreground mb-4">"{testimonial.comment}"</p>
                <p className="text-primary font-medium">{testimonial.duration}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
