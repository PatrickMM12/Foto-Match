import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React from 'react';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, MapPin, DollarSign, Camera, CheckCircle } from 'lucide-react';

// Session schema for form validation
const sessionSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  location: z.string().min(3, 'Informe o local da sessão'),
  status: z.enum(['pending', 'confirmed', 'canceled', 'completed']),
  photosDelivered: z.coerce.number().min(0, 'O número não pode ser negativo'),
  paymentStatus: z.enum(['pending', 'partial', 'paid']),
  amountPaid: z.coerce.number().min(0, 'O valor não pode ser negativo'),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

interface SessionFormProps {
  session: any;
  onSave: (data: any) => void;
  isLoading: boolean;
  isEditing?: boolean;
}

const SessionForm: React.FC<SessionFormProps> = ({
  session,
  onSave,
  isLoading,
  isEditing = false,
}) => {
  const [date, setDate] = useState<Date | undefined>(
    session?.date ? new Date(session.date) : undefined
  );
  
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: session?.title || '',
      description: session?.description || '',
      location: session?.location || '',
      status: session?.status || 'pending',
      photosDelivered: session?.photosDelivered || 0,
      paymentStatus: session?.paymentStatus || 'pending',
      amountPaid: session?.amountPaid || 0,
    },
  });

  const onSubmit = (values: SessionFormValues) => {
    onSave({
      ...values,
      date: date?.toISOString(),
      clientId: session.clientId,
      photographerId: session.photographerId,
      serviceId: session.serviceId,
      totalPrice: session.totalPrice || 0,
      photosIncluded: session.photosIncluded || 0,
      additionalPhotos: session.additionalPhotos || 0,
      additionalPhotoPrice: session.additionalPhotoPrice || 0,
    });
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <h3 className="text-lg font-semibold">Detalhes da Sessão</h3>
          {isEditing && getStatusBadge(session.status)}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título da Sessão</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Casamento João e Maria" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-2">
            <FormLabel>Data e Hora</FormLabel>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${!date && 'text-muted-foreground'}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: ptBR }) : <span>Selecionar data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              
              <Select
                value={date ? format(date, 'HH:mm') : undefined}
                onValueChange={(time) => {
                  if (date && time) {
                    const [hours, minutes] = time.split(':');
                    const newDate = new Date(date);
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setDate(newDate);
                  }
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Hora">
                    {date ? format(date, 'HH:mm') : <Clock className="h-4 w-4" />}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <React.Fragment key={hour}>
                      <SelectItem key={`${hour}-00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                        {hour.toString().padStart(2, '0')}:00
                      </SelectItem>
                      <SelectItem key={`${hour}-30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                        {hour.toString().padStart(2, '0')}:30
                      </SelectItem>
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detalhes adicionais sobre a sessão..." 
                  className="resize-none h-20"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">Duração</p>
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              <span>{session?.duration || 0} minutos</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium">Valor Total</p>
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-2" />
              <span>R$ {((session?.totalPrice || 0) / 100).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium">Quantidade de Fotos</p>
            <div className="flex items-center text-muted-foreground">
              <Camera className="h-4 w-4 mr-2" />
              <span>{session?.photosIncluded || 0} incluídas</span>
              {session?.additionalPhotos > 0 && (
                <span className="ml-1">+ {session.additionalPhotos} adicionais</span>
              )}
            </div>
          </div>
        </div>
        
        {isEditing && (
          <>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Status da Sessão</h4>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue>{getStatusBadge(field.value)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="confirmed">Confirmada</SelectItem>
                          <SelectItem value="completed">Concluída</SelectItem>
                          <SelectItem value="canceled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Status do Pagamento</h4>
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue>{getPaymentStatusBadge(field.value)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="partial">Parcial</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="photosDelivered"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fotos Entregues</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Pago (em centavos)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SessionForm;
