import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { convertCentsToDecimal } from '@/lib/formatters';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/shared/loading-spinner';

// Tipo para serviço
interface Service {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  price: number; // in cents
  duration: number; // in minutes
  maxPhotos: number | null;
  additionalPhotoPrice: number | null; // in cents
  active: boolean;
}

// Esquema de validação do formulário
const bookingSchema = z.object({
  serviceId: z.string().min(1, "Selecione um serviço"),
  date: z.date({
    required_error: "Selecione uma data para a sessão",
  }),
  time: z.string().min(1, "Selecione um horário"),
  location: z.string().min(3, "Informe o local da sessão"),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  photographerId: number;
  services: Service[];
  onBookingComplete: () => void;
}

const BookingForm = ({ photographerId, services, onBookingComplete }: BookingFormProps) => {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Configurar horários disponíveis (exemplo)
  const availableTimes = [
    '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];
  
  // Configurar formulário
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceId: '',
      location: '',
      notes: '',
    },
  });
  
  // Atualizar serviço selecionado quando o ID mudar
  useEffect(() => {
    const serviceId = form.watch('serviceId');
    if (serviceId) {
      const service = services.find(s => s.id.toString() === serviceId);
      setSelectedService(service || null);
    } else {
      setSelectedService(null);
    }
  }, [form.watch('serviceId'), services]);
  
  // Mutation para criar sessão
  const createSessionMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      if (!selectedService) {
        throw new Error('Nenhum serviço selecionado');
      }
      
      // Combinar data e hora
      const [hours, minutes] = data.time.split(':').map(Number);
      const sessionDate = new Date(data.date);
      sessionDate.setHours(hours, minutes, 0, 0);
      
      // Preparar dados da sessão
      const sessionData = {
        photographerId,
        clientId: 0, // Será preenchido pelo backend
        serviceId: parseInt(data.serviceId),
        title: `Sessão com Serviço: ${selectedService.name}`,
        description: data.notes || '',
        date: sessionDate.toISOString(),
        duration: selectedService.duration,
        location: data.location,
        locationLat: null,
        locationLng: null,
        totalPrice: selectedService.price,
        photosIncluded: selectedService.maxPhotos || 0,
        additionalPhotoPrice: selectedService.additionalPhotoPrice,
      };
      
      // Enviar requisição para criar sessão
      const res = await apiRequest('POST', '/api/sessions', sessionData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Agendamento realizado',
        description: 'Sua solicitação de sessão foi enviada com sucesso para o fotógrafo.',
      });
      form.reset();
      onBookingComplete();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao agendar sessão',
        description: error.message || 'Ocorreu um erro ao processar sua solicitação.',
        variant: 'destructive',
      });
    },
  });
  
  // Formatar preço
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100); // Manter conversão de centavos para real
  };
  
  // Handler de submit
  const onSubmit = (values: BookingFormValues) => {
    createSessionMutation.mutate(values);
  };
  
  // Verificar se há serviços disponíveis
  if (!services || services.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">
          Este fotógrafo não possui serviços disponíveis para agendamento.
        </p>
      </div>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="serviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serviço</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} - {formatCurrency(service.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                O serviço que você deseja contratar
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedService && (
          <div className="bg-muted p-3 rounded-md text-sm space-y-2">
            <p><strong>Descrição:</strong> {selectedService.description || 'Sem descrição'}</p>
            <p><strong>Duração:</strong> {selectedService.duration} minutos</p>
            {selectedService.maxPhotos && (
              <p><strong>Fotos incluídas:</strong> {selectedService.maxPhotos}</p>
            )}
            {selectedService.additionalPhotoPrice && (
              <p><strong>Fotos adicionais:</strong> {formatCurrency(selectedService.additionalPhotoPrice)} por foto</p>
            )}
            <p className="font-bold">Total: {formatCurrency(selectedService.price)}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        // Desabilitar datas passadas
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableTimes.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local da sessão</FormLabel>
              <FormControl>
                <Input placeholder="Endereço completo" {...field} />
              </FormControl>
              <FormDescription>
                Onde será realizada a sessão fotográfica
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Informações adicionais ou pedidos especiais" 
                  className="resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={createSessionMutation.isPending}
        >
          {createSessionMutation.isPending ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Enviando...
            </>
          ) : (
            'Solicitar Agendamento'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default BookingForm;
