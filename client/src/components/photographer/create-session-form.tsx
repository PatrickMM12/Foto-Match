import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, MapPin, DollarSign, Camera, User, SearchIcon, Plus, Minus, UserPlus } from 'lucide-react';
import React from 'react';

// Schema para validação do formulário de criação de sessão
const createSessionSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente'),
  serviceId: z.string().min(1, 'Selecione um serviço'),
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  location: z.string().min(3, 'Informe o local da sessão'),
  status: z.enum(['pending', 'confirmed', 'completed', 'canceled']).default('confirmed'),
  totalPrice: z.number().min(0, 'O preço deve ser maior ou igual a zero'),
  duration: z.number().min(1, 'A duração deve ser maior que zero'),
  photosIncluded: z.number().min(0, 'O número de fotos deve ser maior ou igual a zero'),
  additionalPhotoPrice: z.number().min(0, 'O preço por foto adicional deve ser maior ou igual a zero'),
  additionalPhotos: z.number().default(0),
});

// Schema para validação do formulário de novo cliente
const newClientSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
});

type CreateSessionValues = z.infer<typeof createSessionSchema>;
type NewClientValues = z.infer<typeof newClientSchema>;

interface CreateSessionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateSessionForm: React.FC<CreateSessionFormProps> = ({ onSuccess, onCancel }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [clientSearch, setClientSearch] = useState('');
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  
  // Buscar lista de clientes
  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ['/api/users/clients'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/users/clients', undefined);
      return res.json();
    },
  });
  
  // Buscar serviços do fotógrafo
  const { data: services } = useQuery({
    queryKey: ['/api/photographers/services'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/photographers/services', undefined);
      return res.json();
    },
  });
  
  // Detalhes do serviço selecionado
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Configurar o formulário principal
  const form = useForm<CreateSessionValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      status: 'confirmed',
      totalPrice: 0,
      duration: 60,
      photosIncluded: 0,
      additionalPhotoPrice: 0,
      additionalPhotos: 0,
    },
  });
  
  // Configurar o formulário de novo cliente
  const clientForm = useForm<NewClientValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });
  
  // Quando o serviço mudar, atualizar o título e detalhes
  useEffect(() => {
    if (selectedService) {
      form.setValue('title', `Sessão de ${selectedService.name}`);
      form.setValue('totalPrice', selectedService.price / 100);
      form.setValue('duration', selectedService.duration);
      form.setValue('photosIncluded', selectedService.maxPhotos || 0);
      form.setValue('additionalPhotoPrice', (selectedService.additionalPhotoPrice || 0) / 100);
    }
  }, [selectedService, form]);
  
  // Mutation para criar sessão
  const createSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/sessions', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sessão criada',
        description: 'A sessão foi criada com sucesso',
      });
      
      // Invalidar consulta e forçar a recarga imediata
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      
      // Atualizar o cache manualmente para garantir que a sessão apareça imediatamente
      queryClient.setQueryData(['/api/sessions'], (oldData: any) => {
        // Se já existem dados em cache, adicione a nova sessão
        if (Array.isArray(oldData)) {
          return [...oldData, data];
        }
        // Caso contrário, retorne um array com a nova sessão
        return [data];
      });
      
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao criar a sessão',
        variant: 'destructive',
      });
    },
  });
  
  // Mutation para criar cliente
  const createClientMutation = useMutation({
    mutationFn: async (data: NewClientValues) => {
      const res = await apiRequest('POST', '/api/users/clients', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Cliente criado',
        description: 'O cliente foi criado com sucesso',
      });
      refetchClients();
      form.setValue('clientId', data.id.toString());
      setIsNewClientDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao criar o cliente',
        variant: 'destructive',
      });
    },
  });
  
  // Buscar detalhes do serviço quando selecionado
  const handleServiceChange = (serviceId: string) => {
    const service = services?.find((s: any) => s.id.toString() === serviceId);
    setSelectedService(service);
  };
  
  // Função para filtrar clientes baseado na busca
  const filteredClients = clients?.filter((client: any) => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    client.email.toLowerCase().includes(clientSearch.toLowerCase())
  ) || [];
  
  // Manipular envio do formulário de novo cliente
  const onSubmitNewClient = (values: NewClientValues) => {
    createClientMutation.mutate(values);
  };
  
  // Manipular envio do formulário principal
  const onSubmit = (values: CreateSessionValues) => {
    if (!date) {
      toast({
        title: 'Data obrigatória',
        description: 'Por favor, selecione uma data para a sessão',
        variant: 'destructive',
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        title: 'Erro de autenticação',
        description: 'Não foi possível identificar o fotógrafo. Tente fazer login novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    // Calcular preço total considerando fotos adicionais
    const basePrice = values.totalPrice;
    const additionalPhotosPrice = values.additionalPhotos * (values.additionalPhotoPrice || 0);
    const calculatedTotalPrice = basePrice + additionalPhotosPrice;
    
    // Garantir que todos os valores numéricos sejam números
    const sessionData = {
      photographerId: Number(user.id),
      clientId: Number(values.clientId),
      serviceId: Number(values.serviceId),
      title: values.title,
      description: values.description || '',
      date: date.toISOString(),
      duration: Number(values.duration),
      location: values.location,
      status: values.status,
      totalPrice: Number(calculatedTotalPrice),
      photosIncluded: Number(values.photosIncluded),
      photosDelivered: 0,
      additionalPhotos: Number(values.additionalPhotos),
      additionalPhotoPrice: Number(values.additionalPhotoPrice || 0),
      paymentStatus: 'pending',
      amountPaid: 0,
    };
    
    console.log('Enviando dados da sessão:', sessionData);
    
    createSessionMutation.mutate(sessionData);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value); // Não converter centavos para reais
  };

  // Calcular o valor das fotos adicionais
  const additionalPhotosValue = form.watch('additionalPhotos') * (form.watch('additionalPhotoPrice') || 0);
  
  // Calcular preço total
  const totalPrice = (form.watch('totalPrice') || 0) + additionalPhotosValue;
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <h3 className="text-lg font-semibold">Criar Nova Sessão</h3>
          </div>
          
          {/* Cliente */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <FormLabel>Cliente</FormLabel>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsNewClientDialogOpen(true)}
                className="h-8 px-3 text-xs"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Novo Cliente
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="Buscar cliente por nome ou email" 
                  value={clientSearch} 
                  onChange={(e) => setClientSearch(e.target.value)} 
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClients.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Nenhum cliente encontrado
                        </div>
                      ) : (
                        filteredClients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name} ({client.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Serviço */}
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serviço</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleServiceChange(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {!services || services.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nenhum serviço disponível
                      </div>
                    ) : (
                      services
                        .filter((service: any) => service.active)
                        .map((service: any) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name} - {formatCurrency(service.price / 100)}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Título e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Sessão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ensaio de Família" {...field} />
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
          
          {/* Descrição */}
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
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Local */}
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
          
          {/* Detalhes financeiros e de duração */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="totalPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço Base (R$)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-9" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-9" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Detalhes das fotos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="photosIncluded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fotos Incluídas</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Camera className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-9" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="additionalPhotoPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço por foto adicional (R$)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-9" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Fotos adicionais */}
          <FormField
            control={form.control}
            name="additionalPhotos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fotos Adicionais</FormLabel>
                <div className="flex items-center space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      if (field.value > 0) {
                        field.onChange(field.value - 1);
                      }
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <FormControl>
                    <Input 
                      type="number" 
                      className="w-20 text-center" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
                    />
                  </FormControl>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      field.onChange(field.value + 1);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    {additionalPhotosValue > 0 && (
                      <span>
                        Valor adicional: {formatCurrency(additionalPhotosValue)}
                      </span>
                    )}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status da Sessão</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="canceled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Por padrão, as sessões criadas manualmente começam como confirmadas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Resumo do preço */}
          <div className="rounded-md border p-4 mt-4">
            <h4 className="font-medium mb-2">Resumo Financeiro</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Preço base:</span>
                <span>{formatCurrency(form.watch('totalPrice') || 0)}</span>
              </div>
              {additionalPhotosValue > 0 && (
                <div className="flex justify-between items-center">
                  <span>Fotos adicionais ({form.watch('additionalPhotos')} x {formatCurrency(form.watch('additionalPhotoPrice') || 0)}):</span>
                  <span>{formatCurrency(additionalPhotosValue)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-medium border-t pt-2 mt-2">
                <span>Total:</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createSessionMutation.isPending}>
              {createSessionMutation.isPending ? 'Criando...' : 'Criar Sessão'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Modal para criação de novo cliente */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
          </DialogHeader>
          
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onSubmitNewClient)} className="space-y-4 py-2">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={clientForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={clientForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewClientDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? 'Criando...' : 'Criar Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateSessionForm; 