import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import ClientSidebar from '@/components/layout/client-sidebar';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import ReviewForm from '@/components/client/review-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, DollarSign, User, Star } from 'lucide-react';

const ClientBookings = () => {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['/api/sessions'],
  });
  
  const handleViewSession = (session: any) => {
    setSelectedSession(session);
  };
  
  const handleOpenReview = (session: any) => {
    setSelectedSession(session);
    setIsReviewDialogOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmada</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Concluída</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case 'partial':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Parcial</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pago</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  const formatCurrency = (amount: number) => {
    return `R$ ${(amount / 100).toFixed(2).replace('.', ',')}`;
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  const upcomingSessions = sessions?.filter(s => 
    (s.status === 'confirmed' || s.status === 'pending') && 
    new Date(s.date) > new Date()
  ) || [];
  
  const pastSessions = sessions?.filter(s => 
    s.status === 'completed' || 
    (s.status === 'confirmed' && new Date(s.date) <= new Date())
  ) || [];
  
  const canceledSessions = sessions?.filter(s => s.status === 'canceled') || [];
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientSidebar />
      <div className="flex-1 p-8">
        <PageTitle title="Minhas Reservas" />
        
        <Tabs defaultValue="upcoming" className="mt-6">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="upcoming">
              Próximas ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Concluídas ({pastSessions.length})
            </TabsTrigger>
            <TabsTrigger value="canceled">
              Canceladas ({canceledSessions.length})
            </TabsTrigger>
          </TabsList>
          
          {(['upcoming', 'past', 'canceled'] as const).map(tabValue => {
            let sessionsToShow;
            
            switch (tabValue) {
              case 'upcoming':
                sessionsToShow = upcomingSessions;
                break;
              case 'past':
                sessionsToShow = pastSessions;
                break;
              case 'canceled':
                sessionsToShow = canceledSessions;
                break;
              default:
                sessionsToShow = [];
            }
            
            return (
              <TabsContent value={tabValue} key={tabValue}>
                {sessionsToShow.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">Nenhuma sessão encontrada.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessionsToShow.map((session) => (
                      <Card key={session.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{session.title}</CardTitle>
                            {getStatusBadge(session.status)}
                          </div>
                          <CardDescription>
                            Fotógrafo: {session.photographerName || `ID: ${session.photographerId}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{formatDate(session.date)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{session.duration} minutos</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span>{session.location}</span>
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />
                              <span>{formatCurrency(session.totalPrice)}</span>
                              <span className="ml-2">
                                {getPaymentStatusBadge(session.paymentStatus)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                          <Button variant="outline" onClick={() => handleViewSession(session)}>
                            Detalhes
                          </Button>
                          
                          {session.status === 'completed' && (
                            <Button 
                              variant="outline"
                              onClick={() => handleOpenReview(session)}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Avaliar
                            </Button>
                          )}
                          
                          {session.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800"
                            >
                              Cancelar
                            </Button>
                          )}
                          
                          {session.paymentStatus !== 'paid' && session.status !== 'canceled' && (
                            <Button>
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
        
        {/* Review Dialog */}
        {selectedSession && (
          <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Avaliar Sessão</DialogTitle>
              </DialogHeader>
              <ReviewForm 
                sessionId={selectedSession.id}
                photographerId={selectedSession.photographerId}
                onReviewSubmitted={() => setIsReviewDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default ClientBookings;
