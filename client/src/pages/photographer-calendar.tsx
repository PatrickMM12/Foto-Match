import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import CalendarView from '@/components/photographer/calendar-view';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useCalendar } from '@/hooks/use-calendar';
import { AvailabilitySchedule } from '@/components/photographer/availability-schedule';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PhotographerCalendar = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isBlockingTime, setIsBlockingTime] = useState(false);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/photographers/profile'],
  });
  
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/sessions'],
  });
  
  const isLoading = isLoadingProfile || isLoadingSessions;
  
  const { 
    availableTimes,
    blockedTimes,
    bookings,
    toggleTimeBlock,
    weekdayAvailability,
    updateWeekdayAvailability,
    applyWeekdayAvailability
  } = useCalendar(profileData?.availableTimes, sessionsData);
  
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (newAvailableTimes: any) => {
      return await apiRequest('PATCH', '/api/photographers/profile', {
        availableTimes: newAvailableTimes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/profile'] });
      toast({
        title: 'Disponibilidade atualizada',
        description: 'Sua disponibilidade foi atualizada com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar disponibilidade',
        description: 'Não foi possível atualizar sua disponibilidade',
        variant: 'destructive',
      });
    }
  });
  
  const handleBlockTime = (date: Date, blockStatus: boolean) => {
    const newAvailableTimes = toggleTimeBlock(date, blockStatus);
    updateAvailabilityMutation.mutate(newAvailableTimes);
  };
  
  const handleApplyWeekdayConfig = (months: number) => {
    const newAvailableTimes = applyWeekdayAvailability(months);
    updateAvailabilityMutation.mutate(newAvailableTimes);
    setAvailabilityDialogOpen(false);
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <PhotographerSidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center">
          <PageTitle title="Agenda" />
          <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Gerenciar Disponibilidade</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Disponibilidade</DialogTitle>
                <DialogDescription>
                  Configure seus horários disponíveis para reservas.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Tabs defaultValue="weekly">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="weekly">Por dia da semana</TabsTrigger>
                    <TabsTrigger value="info">Informações</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="weekly" className="space-y-4 pt-4">
                    <AvailabilitySchedule
                      weekdayAvailability={weekdayAvailability}
                      onUpdateWeekday={updateWeekdayAvailability}
                      onApply={handleApplyWeekdayConfig}
                    />
                  </TabsContent>
                  
                  <TabsContent value="info" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Como gerenciar sua disponibilidade</h3>
                      
                      <div className="space-y-2">
                        <h4 className="text-base font-medium">Configuração por dia da semana</h4>
                        <p className="text-sm text-muted-foreground">
                          Na guia "Por dia da semana", você pode configurar quais dias da semana está disponível 
                          e em quais horários. Estas configurações serão aplicadas automaticamente ao seu calendário.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-base font-medium">Configuração manual no calendário</h4>
                        <p className="text-sm text-muted-foreground">
                          Para ajustes pontuais, você também pode clicar no botão "Editar disponibilidade" 
                          no calendário e clicar nos horários para marcá-los como disponíveis ou bloqueados.
                        </p>
                      </div>
                      
                      <div className="rounded-md bg-blue-50 p-3 space-y-1">
                        <h4 className="text-sm font-medium text-blue-800">Dica</h4>
                        <p className="text-xs text-blue-700">
                          Configure primeiro a disponibilidade por dia da semana para facilitar o gerenciamento,
                          depois faça ajustes pontuais no calendário para dias específicos.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Calendário de Reservas</CardTitle>
            <CardDescription>
              Gerencie suas sessões e disponibilidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarView 
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              availableTimes={availableTimes}
              blockedTimes={blockedTimes}
              bookings={bookings}
              onBlockTime={handleBlockTime}
              isBlockingTime={isBlockingTime}
              setIsBlockingTime={setIsBlockingTime}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PhotographerCalendar;
