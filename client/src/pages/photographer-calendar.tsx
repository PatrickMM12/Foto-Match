import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import CalendarView from '@/components/photographer/calendar-view';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useCalendar } from '@/hooks/use-calendar';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PhotographerCalendar = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isBlockingTime, setIsBlockingTime] = useState(false);
  
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
    toggleTimeBlock 
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
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <PhotographerSidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center">
          <PageTitle title="Agenda" />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Gerenciar Disponibilidade</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Gerenciar Disponibilidade</DialogTitle>
                <DialogDescription>
                  Configure seus horários disponíveis para reservas.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Selecione os dias e horários em que você está disponível para sessões fotográficas.
                  Clique nos horários no calendário para bloqueá-los ou liberá-los.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => {}} disabled={updateAvailabilityMutation.isPending}>
                  {updateAvailabilityMutation.isPending ? 'Salvando...' : 'Salvar Disponibilidade'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 gap-8 mt-6">
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
    </div>
  );
};

export default PhotographerCalendar;
