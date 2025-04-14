import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import SessionForm from '@/components/photographer/session-form';
import CreateSessionForm from '@/components/photographer/create-session-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, DollarSign, User, CheckCircle, XCircle, Plus } from 'lucide-react';

// Definir a interface da sessão para evitar erros de tipagem
interface Session {
  id: number;
  title: string;
  description?: string;
  date: string;
  duration: number;
  location: string;
  status: string;
  totalPrice: number;
  photosIncluded: number;
  photosDelivered: number;
  additionalPhotos: number;
  additionalPhotoPrice: number;
  paymentStatus: string;
  amountPaid: number;
  clientId: number;
  clientName?: string;
  photographerId: number;
  serviceId: number;
  createdAt: string;
}

const PhotographerSessions = () => {
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("upcoming");
  
  const { data: sessions, isLoading, refetch } = useQuery<Session[]>({
    queryKey: ['/api/sessions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/sessions', undefined);
      if (!res.ok) {
        throw new Error('Erro ao buscar sessões');
      }
      const data = await res.json();
      console.log('Dados de sessões recebidos:', data);
      return data;
    },
  });
  
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest('PATCH', `/api/sessions/${id}`, data);
      const updatedSession = await response.json();
      return updatedSession as Session;
    },
    onSuccess: async (updatedSession: Session) => {
      // Atualizar a sessão selecionada
      setSelectedSession(updatedSession);
      
      // Buscar novamente os dados do backend para garantir que tudo esteja atualizado
      await refetch();
      
      // Verificar a categoria da sessão atualizada e mudar para a aba apropriada, se necessário
      const oldStatus = selectedSession?.status;
      if (oldStatus !== updatedSession.status) {
        // Se o status mudou, ajustar a aba ativa apropriadamente
        if (updatedSession.status === 'pending') {
          setActiveTab('pending');
        } else if (updatedSession.status === 'confirmed') {
          const isUpcoming = new Date(updatedSession.date) > new Date();
          setActiveTab(isUpcoming ? 'upcoming' : 'past');
        } else if (updatedSession.status === 'completed') {
          setActiveTab('past');
        } else if (updatedSession.status === 'canceled') {
          setActiveTab('canceled');
        }
      }
      
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
  
  const handleViewSession = (session: Session) => {
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
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };
  
  // Usamos useMemo para calcular as listas filtradas sempre que sessions mudar
  const pendingSessions = React.useMemo(() => 
    sessions?.filter((s: Session) => s.status === 'pending') || [],
  [sessions]);
  
  const upcomingSessions = React.useMemo(() => 
    sessions?.filter((s: Session) => s.status === 'confirmed') || [],
  [sessions]);
  
  const pastSessions = React.useMemo(() => 
    sessions?.filter((s: Session) => s.status === 'completed') || [],
  [sessions]);
  
  const canceledSessions = React.useMemo(() => 
    sessions?.filter((s: Session) => s.status === 'canceled') || [],
  [sessions]);
  
  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
    // Forçar um refetch para garantir que os dados estejam atualizados
    refetch();
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <PhotographerSidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center">
          <PageTitle title="Sessões Fotográficas" />
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Sessão
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
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
            let sessionsToShow: Session[] = [];
            
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
                    {sessionsToShow.map((session: Session) => (
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
                        <CardFooter className="flex flex-col gap-2">
                          <Button variant="outline" onClick={() => handleViewSession(session)} className="w-full">
                            Detalhes
                          </Button>
                          
                          {session.status === 'pending' && (
                            <div className="flex flex-wrap gap-2 w-full">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 flex-1 min-w-[140px]"
                                onClick={() => handleUpdateStatus(session.id, 'confirmed')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aceitar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 flex-1 min-w-[140px]"
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
                              className="w-full"
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
        
        {/* Diálogo para criar nova sessão manualmente */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            // Quando o diálogo for fechado, recarregar as sessões
            refetch();
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Sessão</DialogTitle>
            </DialogHeader>
            <CreateSessionForm 
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                // Recarregar as sessões quando uma nova sessão for criada
                refetch();
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PhotographerSessions;
