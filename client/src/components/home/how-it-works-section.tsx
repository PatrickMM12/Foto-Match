import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-r from-indigo-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Como Funciona</h2>
          <p className="text-muted-foreground text-lg">
            Processo simples para fotógrafos e clientes conectarem-se e realizarem sessões fotográficas.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* For Photographers */}
          <Card className="shadow-md">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg">F</div>
                <h3 className="text-2xl font-bold ml-4 text-gray-900">Para Fotógrafos</h3>
              </div>
              
              <div className="space-y-8">
                <div className="flex">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold shrink-0">1</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Crie seu perfil profissional</h4>
                    <p className="text-muted-foreground">Cadastre-se e crie um perfil com seu portfólio, integrando com seu Instagram e destacando suas especialidades.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold shrink-0">2</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Configure sua disponibilidade</h4>
                    <p className="text-muted-foreground">Use o calendário para definir dias e horários disponíveis para sessões, bloqueando períodos ocupados.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold shrink-0">3</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Gerencie sessões e pagamentos</h4>
                    <p className="text-muted-foreground">Receba solicitações de agendamento, aprove clientes e acompanhe pagamentos em um só lugar.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold shrink-0">4</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Controle suas finanças</h4>
                    <p className="text-muted-foreground">Visualize receitas e despesas com categorização específica para fotografia e análises detalhadas.</p>
                  </div>
                </div>
              </div>
              
              <Link href="/register">
                <Button className="w-full mt-8">Começar como Fotógrafo</Button>
              </Link>
            </CardContent>
          </Card>
          
          {/* For Clients */}
          <Card className="shadow-md">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">C</div>
                <h3 className="text-2xl font-bold ml-4 text-gray-900">Para Clientes</h3>
              </div>
              
              <div className="space-y-8">
                <div className="flex">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-semibold shrink-0">1</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Encontre fotógrafos próximos</h4>
                    <p className="text-muted-foreground">Busque no mapa fotógrafos disponíveis na sua região, filtrando por especialidade, preço e avaliações.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-semibold shrink-0">2</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Visualize portfólios e avaliações</h4>
                    <p className="text-muted-foreground">Explore o trabalho de cada fotógrafo e veja o que outros clientes acharam de suas sessões.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-semibold shrink-0">3</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Agende sua sessão</h4>
                    <p className="text-muted-foreground">Escolha data e horário disponíveis e solicite o agendamento com o fotógrafo selecionado.</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-semibold shrink-0">4</div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Realize pagamento seguro</h4>
                    <p className="text-muted-foreground">Pague com segurança através da plataforma e avalie o serviço após a conclusão.</p>
                  </div>
                </div>
              </div>
              
              <Link href="/register">
                <Button className="w-full mt-8 bg-orange-500 hover:bg-orange-600">Encontrar Fotógrafos</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
