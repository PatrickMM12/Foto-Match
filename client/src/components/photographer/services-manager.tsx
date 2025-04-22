import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/shared/loading-spinner';

import { Trash2, Pencil, Plus, Tag, Clock, Camera, DollarSign, Package } from 'lucide-react';

// Tipos para os serviços
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

// Esquema de validação do formulário de serviço
const serviceSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(1, 'Valor deve ser maior que zero'),
  duration: z.coerce.number().min(15, 'Duração mínima deve ser 15 minutos'),
  maxPhotos: z.coerce.number().optional().nullable(),
  additionalPhotoPrice: z.coerce.number().optional().nullable(),
  active: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const ServiceManager = ({ userId }: { userId: number }) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Fetch services from API
  const { 
    data: services, 
    isLoading, 
    refetch 
  } = useQuery<Service[]>({
    queryKey: ['/api/photographers/services'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/photographers/services', undefined);
      const allServices = await res.json();
      
      // Logar os serviços para diagnóstico
      console.log('Todos os serviços retornados pela API:', allServices);
      
      // Filtrar serviços para garantir que só mostramos os do usuário atual
      const filteredServices = allServices.filter((service: any) => {
        // Verificar tanto userId quanto user_id
        const serviceUserId = service.userId || service.user_id;
        console.log(`Verificando serviço ${service.id}: userId do serviço = ${serviceUserId}, userId atual = ${userId}`);
        return serviceUserId === userId;
      });
      
      if (filteredServices.length !== allServices.length) {
        console.warn(`Filtrados ${allServices.length - filteredServices.length} serviços que não pertencem ao usuário ${userId}`);
      }
      
      // Garantir que todos os serviços tenham um userId no formato correto
      return filteredServices.map((service: any) => {
        if (!service.userId && service.user_id) {
          return { ...service, userId: service.user_id };
        }
        return service;
      });
    },
  });

  // Set up form
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration: 60,
      maxPhotos: null,
      additionalPhotoPrice: null,
      active: true,
    },
  });

  // Update form values when editing a service
  useEffect(() => {
    if (editingService) {
      form.reset({
        name: editingService.name,
        description: editingService.description || '',
        price: editingService.price / 100, // Convert cents to currency
        duration: editingService.duration,
        maxPhotos: editingService.maxPhotos,
        additionalPhotoPrice: editingService.additionalPhotoPrice ? editingService.additionalPhotoPrice / 100 : null, // Convert cents to currency
        active: editingService.active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        price: 0,
        duration: 60,
        maxPhotos: null,
        additionalPhotoPrice: null,
        active: true,
      });
    }
  }, [editingService, form]);

  // Create or update service mutation
  const serviceMutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      // Converter valores para centavos
      const priceInCents = Math.round(values.price * 100);
      let additionalPriceInCents = null;
      
      if (values.additionalPhotoPrice !== null && values.additionalPhotoPrice !== undefined) {
        additionalPriceInCents = Math.round(values.additionalPhotoPrice * 100);
      }
      
      const serviceData = {
        ...values,
        userId,
        price: priceInCents,
        additionalPhotoPrice: additionalPriceInCents,
      };
      
      console.log('Valores originais:', {
        price: values.price,
        additionalPhotoPrice: values.additionalPhotoPrice
      });
      
      console.log('Valores convertidos para centavos:', {
        price: priceInCents,
        additionalPhotoPrice: additionalPriceInCents
      });
      
      console.log('Dados completos a serem enviados:', serviceData);
      
      try {
        if (editingService) {
          // Update existing service
          console.log(`Atualizando serviço ID ${editingService.id}`);
          console.log(`- userId do serviço: ${editingService.userId}`);
          console.log(`- userId atual: ${userId}`);
          
          if (editingService.userId !== userId) {
            console.error(`Conflito de propriedade: o serviço pertence ao usuário ${editingService.userId}, mas o usuário atual é ${userId}`);
            throw new Error(`Você não tem permissão para editar este serviço. ID do proprietário: ${editingService.userId}, Seu ID: ${userId}`);
          }
          
          // Enviar dados no formato camelCase, conforme definido no schema
          const res = await apiRequest('PATCH', `/api/photographers/services/${editingService.id}`, serviceData);
          
          if (!res.ok) {
            // Se a resposta não for OK, tentar ler o corpo da resposta
            const errorText = await res.text();
            let errorObj;
            try {
              errorObj = JSON.parse(errorText);
            } catch (e) {
              console.error('Erro ao parsear resposta como JSON:', e);
              console.error('Corpo da resposta:', errorText);
              console.error('Content-Type:', res.headers.get('Content-Type'));
              errorObj = { message: errorText || res.statusText };
            }
            
            console.error(`Erro ao atualizar serviço ${editingService.id}:`, errorObj);
            throw new Error(errorObj.message || `Erro ${res.status}: ${res.statusText}`);
          }
          
          const responseData = await res.json();
          console.log('Resposta do servidor (update):', responseData);
          return responseData;
        } else {
          // Create new service
          console.log('Criando novo serviço');
          
          // Usar os nomes de campos camelCase conforme o schema define
          const res = await apiRequest('POST', '/api/photographers/services', serviceData);
          
          console.log('Status da resposta:', res.status, res.statusText);
          console.log('Content-Type:', res.headers.get('Content-Type'));
          
          if (!res.ok) {
            console.error('Erro na resposta HTTP:', res.status, res.statusText);
            
            // Tentar ler o corpo da resposta como texto para diagnóstico
            let errorMessage = 'Erro desconhecido do servidor';
            try {
              const responseText = await res.text();
              console.error('Corpo da resposta:', responseText);
              console.error('Tipo de conteúdo da resposta:', res.headers.get('Content-Type'));
              
              // Tentar parsear como JSON
              try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || 'Erro desconhecido';
                if (errorData.details) {
                  errorMessage += `: ${errorData.details}`;
                }
              } catch (parseError) {
                console.error('Erro ao parsear resposta como JSON:', parseError);
                // Se não for JSON, usar o texto da resposta
                if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
                  errorMessage = 'O servidor retornou uma página HTML em vez de uma resposta JSON. Possível erro interno.';
                } else {
                  errorMessage = responseText || res.statusText || 'Erro desconhecido';
                }
              }
            } catch (textError) {
              console.error('Erro ao ler resposta como texto:', textError);
            }
            
            throw new Error(errorMessage);
          }
          
          const responseData = await res.json();
          console.log('Resposta do servidor (create):', responseData);
          return responseData;
        }
      } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: editingService ? 'Serviço atualizado' : 'Serviço criado',
        description: editingService 
          ? 'O serviço foi atualizado com sucesso' 
          : 'O novo serviço foi criado com sucesso',
      });
      
      // Reset form and close dialog
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      
      // Refresh services list
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/services'] });
      refetch();
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Ocorreu um erro ao salvar o serviço';
      console.error('Erro ao salvar serviço:', errorMessage);
      
      toast({
        title: 'Erro ao salvar serviço:',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return await apiRequest('DELETE', `/api/photographers/services/${serviceId}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: 'Serviço excluído',
        description: 'O serviço foi excluído com sucesso',
      });
      
      // Refresh services list
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/services'] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Ocorreu um erro ao excluir o serviço',
        variant: 'destructive',
      });
    },
  });

  // Toggle service active status
  const toggleServiceStatus = useMutation({
    mutationFn: async ({ serviceId, active }: { serviceId: number, active: boolean }) => {
      return await apiRequest('PATCH', `/api/photographers/services/${serviceId}`, { active });
    },
    onSuccess: () => {
      toast({
        title: 'Status atualizado',
        description: 'O status do serviço foi atualizado com sucesso',
      });
      
      // Refresh services list
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/services'] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message || 'Ocorreu um erro ao atualizar o status do serviço',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: ServiceFormValues) => {
    serviceMutation.mutate(values);
  };

  const handleEditService = (service: Service) => {
    // Verificar se o serviço pertence ao usuário atual
    if (service.userId !== userId) {
      toast({
        title: 'Permissão negada',
        description: 'Você não tem permissão para editar este serviço',
        variant: 'destructive',
      });
      return;
    }
    
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleDeleteService = (serviceId: number, serviceUserId: number) => {
    // Verificar se o serviço pertence ao usuário atual
    if (serviceUserId !== userId) {
      toast({
        title: 'Permissão negada',
        description: 'Você não tem permissão para excluir este serviço',
        variant: 'destructive',
      });
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  const handleToggleServiceStatus = (serviceId: number, serviceUserId: number, active: boolean) => {
    // Verificar se o serviço pertence ao usuário atual
    if (serviceUserId !== userId) {
      toast({
        title: 'Permissão negada',
        description: 'Você não tem permissão para alterar este serviço',
        variant: 'destructive',
      });
      return;
    }
    
    toggleServiceStatus.mutate({ serviceId, active: !active });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100); // Convert cents to currency
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutos`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return hours === 1 ? `1 hora` : `${hours} horas`;
    }
    
    return `${hours}h${remainingMinutes}min`;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meus Serviços</h2>
          <p className="text-muted-foreground">
            Gerencie os serviços que você oferece aos seus clientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setEditingService(null)} 
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
              <DialogDescription>
                {editingService 
                  ? 'Atualize as informações do serviço que você oferece.' 
                  : 'Adicione um novo serviço que você oferece aos seus clientes.'}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do serviço</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Ensaio Fotográfico Standard" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nome claro e descritivo para o serviço
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva os detalhes do serviço, o que está incluído, locação, etc." 
                          className="resize-none" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Valor total do serviço
                        </FormDescription>
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
                          <Input 
                            type="number" 
                            min="15" 
                            step="15" 
                            placeholder="60" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Tempo estimado da sessão
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="maxPhotos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de fotos incluídas</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="Quantidade de fotos" 
                            {...field}
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Deixe em branco se ilimitado
                        </FormDescription>
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
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field}
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Deixe em branco se não aplicável
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Disponível para agendamento</FormLabel>
                        <FormDescription>
                          Serviços inativos não aparecerão para os clientes
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={serviceMutation.isPending}
                  >
                    {serviceMutation.isPending ? 'Salvando...' : 'Salvar Serviço'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {services && services.length > 0 ? (
          services.map((service) => (
            <Card key={service.id} className={!service.active ? 'opacity-70' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold">{service.name}</h3>
                    {!service.active && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditService(service)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteService(service.id, service.userId)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {formatCurrency(service.price)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDuration(service.duration)}
                  </Badge>
                  {service.maxPhotos && (
                    <Badge variant="secondary" className="text-xs">
                      <Camera className="h-3 w-3 mr-1" />
                      {service.maxPhotos} fotos
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {service.description || 'Sem descrição adicional.'}
                </p>
                
                {service.maxPhotos && service.additionalPhotoPrice && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Fotos adicionais:</span>
                    <span className="text-muted-foreground ml-1">
                      {formatCurrency(service.additionalPhotoPrice)} por foto
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-muted-foreground">
                    {service.active ? 'Disponível para agendamento' : 'Indisponível para agendamento'}
                  </span>
                  <Switch
                    checked={service.active}
                    onCheckedChange={() => handleToggleServiceStatus(service.id, service.userId, service.active)}
                  />
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum serviço cadastrado</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                Você ainda não possui serviços cadastrados. Adicione seu primeiro serviço para que os clientes possam agendar sessões com você.
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setEditingService(null)} 
                    className="flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Serviço
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ServiceManager; 