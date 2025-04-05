import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, Clock, MapPin, DollarSign, Camera } from 'lucide-react';

// Booking schema for form validation
const bookingSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  location: z.string().min(3, 'Informe o local da sessão'),
  serviceId: z.coerce.number().optional(),
  date: z.date({
    required_error: 'Selecione uma data',
  }),
  time: z.string({
    required_error: 'Selecione um horário',
  }),
  photosIncluded: z.coerce.number().min(1, 'Informe o número de fotos'),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  photographerId: number;
  services?: any[];
  onBookingComplete: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
  photographerId,
  services = [],
  onBookingComplete,
}) => {
  const [selectedService, setSelectedService] = useState<any | null>(null);
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      photosIncluded: services[0]?.maxPhotos || 10,
    },
  });

  // Watch form values
  const serviceId = form.watch('serviceId');
  const date = form.watch('date');

  // Update selected service when serviceId changes
  const handleServiceChange = (value: string) => {
    const id = parseInt(value);
    form.setValue('serviceId', id);
    
    const service = services.find(s => s.id === id);
    if (service) {
      setSelectedService(service);
      form.setValue('photosIncluded', service.maxPhotos || 10);
    } else {
      setSelectedService(null);
    }
  };

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/sessions', data);
    },
    onSuccess: () => {
      onBookingComplete();
    },
  });

  // Handle form submission
  const onSubmit = (values: BookingFormValues) => {
    const { time, ...rest } = values;
    
    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number);
    const sessionDate = addMinutes(
      addMinutes(new Date(values.date.setHours(0, 0, 0, 0)), hours * 60),
      minutes
    );
    
    // Calculate total price
    const totalPrice = selectedService 
      ? selectedService.price 
      : 0;
      
    // Create session data
    const sessionData = {
      ...rest,
      photographerId,
      date: sessionDate.toISOString(),
      duration: selectedService ? selectedService.duration : 60,
      totalPrice,
      additionalPhotos: 0,
      additionalPhotoPrice: selectedService ? selectedService.additionalPhotoPrice : 0,
    };
    
    bookingMutation.mutate(sessionData);
  };

  // Available time slots
  const availableTimes = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', 
    '18:00', '18:30', '19:00'
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da Sessão</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Ensaio Familiar" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="serviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serviço</FormLabel>
              <Select 
                onValueChange={handleServiceChange}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services && services.length > 0 ? (
                    services.map(service => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name} - {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(service.price / 100)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="custom">Serviço Personalizado</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className={`w-full pl-3 text-left font-normal ${
                          !field.value && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecionar data</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      locale={ptBR}
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableTimes.map(time => (
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
              <FormLabel>Local</FormLabel>
              <FormControl>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Endereço da sessão" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva detalhes adicionais sobre a sessão..." 
                  className="resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="photosIncluded"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade de Fotos</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1}
                  {...field}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedService && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Resumo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <Camera className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Serviço:</span>
                  </div>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Duração:</span>
                  </div>
                  <span>{selectedService.duration} minutos</span>
                </div>
                
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Valor:</span>
                  </div>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(selectedService.price / 100)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
        
        <Button type="submit" className="w-full" disabled={bookingMutation.isPending}>
          {bookingMutation.isPending ? 'Agendando...' : 'Solicitar Agendamento'}
        </Button>
      </form>
    </Form>
  );
};

export default BookingForm;
