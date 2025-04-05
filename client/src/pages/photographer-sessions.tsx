import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import SessionForm from '@/components/photographer/session-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, DollarSign, User, CheckCircle, XCircle } from 'lucide-react';

const PhotographerSessions = () => {
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['/api/sessions'],
  });
  
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest('PATCH', `/api/sessions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({
        title: 'Sessão atualizada',
        description: 'A sessão foi atualizada com sucesso',
      });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar sessão',
        description: 'Não foi possível atualizar a sessão',
        variant: 'destructive',
      });
    }
  });
  
  const handleViewSession = (session: any) => {
    setSelectedSession(session);
    setIsDialogOpen(true);
  };
  
  const handleUpdateStatus = (id: number, status: string) => {
    updateSessionMutation.mutate({ id, data: { status } });
  };
  
  const handleUpdateDelivery = (id: number, photosDelivered: number) => {
    updateSessionMutation.mutate({ id, data: { photosDelivered } });
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
  
  const pendingSessions = sessions?.filter(s => s.status === 'pending') || [];
  const upcomingSessions = sessions?.filter(s => s.status === 'confirmed' && new Date(s.date) > new Date()) || [];
  const pastSessions = sessions?.filter(s => s.status === 'completed' || (s.status === 'confirmed' && new Date(s.date) <= new Date())) || [];
  const canceledSessions = sessions?.filter(s => s.status === 'canceled') || [];
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <PhotographerSidebar />
      <div className="flex-1 p-8">
        <PageTitle title="Sessões Fotográficas" />
        
        <Tabs defaultValue="upcoming" className="mt-6">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="pending">
              Pendentes ({pendingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Agendadas ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Concluídas ({pastSessions.length})
            </TabsTrigger>
            <TabsTrigger value="canceled">
              Canceladas ({canceledSessions.length})
            </TabsTrigger>
          </TabsList>
          
          {(['pending', 'upcoming', 'past', 'canceled'] as const).map(tabValue => {
            let sessionsToShow;
            
            switch (tabValue) {
              case 'pending':
                sessionsToShow = pendingSessions;
                break;
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
                            Cliente: {session.clientName || `ID: ${session.clientId}`}
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
                          
                          {session.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                                onClick={() => handleUpdateStatus(session.id, 'confirmed')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aceitar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800"
                                onClick={() => handleUpdateStatus(session.id, 'canceled')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Recusar
                              </Button>
                            </div>
                          )}
                          
                          {session.status === 'confirmed' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateStatus(session.id, 'completed')}
                            >
                              Concluir
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
        
        {selectedSession && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Detalhes da Sessão</DialogTitle>
              </DialogHeader>
              <SessionForm 
                session={selectedSession}
                onSave={(data) => updateSessionMutation.mutate({ id: selectedSession.id, data })}
                isLoading={updateSessionMutation.isPending}
                isEditing
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default PhotographerSessions;
