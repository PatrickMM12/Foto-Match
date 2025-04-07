import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import PhotographerSidebar from '@/components/layout/photographer-sidebar';
import PageTitle from '@/components/shared/page-title';
import AvatarUpload from '@/components/shared/avatar-upload';
import PortfolioEditor from '@/components/photographer/portfolio-editor';
import LoadingSpinner from '@/components/shared/loading-spinner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Definindo tipos para dados da API
interface UserData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  userType: string;
}

interface PhotographerProfileData {
  userId: number;
  instagramUsername?: string;
  yearsOfExperience?: number;
  equipmentDescription?: string;
  specialties?: string[];
  portfolioImages?: string[];
  availableTimes?: Record<string, any>;
}

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  instagramUsername: z.string().optional(),
  yearsOfExperience: z.coerce.number().optional(),
  equipmentDescription: z.string().optional(),
  specialties: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const PhotographerProfile = () => {
  const { toast } = useToast();

  // Fetch user and profile data with explicit typing
  const { data, isLoading, refetch: refetchUser } = useQuery<UserData>({
    queryKey: ['/api/users/me'],
    queryFn: async () => {
      console.log('Buscando dados do usuário...');
      const token = localStorage.getItem('authToken');
      console.log('Token disponível:', !!token);
      
      try {
        const res = await apiRequest('GET', '/api/users/me', undefined);
        const userData = await res.json();
        console.log('Dados do usuário recebidos:', userData);
        return userData;
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        throw error;
      }
    },
    staleTime: 0, // Força revalidação ao refetch
    refetchOnWindowFocus: true, // Recarrega dados quando a janela ganha foco
  });

  const { 
    data: photographerProfile, 
    isLoading: isLoadingProfile, 
    refetch: refetchProfile 
  } = useQuery<PhotographerProfileData>({
    queryKey: ['/api/photographers/profile'],
    queryFn: async () => {
      console.log('Buscando dados do perfil de fotógrafo...');
      const token = localStorage.getItem('authToken');
      console.log('Token disponível:', !!token);
      
      try {
        const res = await apiRequest('GET', '/api/photographers/profile', undefined);
        const profileData = await res.json();
        console.log('Dados do perfil recebidos:', profileData);
        return profileData;
      } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        throw error;
      }
    },
    enabled: !!data,
    staleTime: 0, // Força revalidação ao refetch
    refetchOnWindowFocus: true, // Recarrega dados quando a janela ganha foco
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      bio: '',
      location: '',
      instagramUsername: '',
      yearsOfExperience: 0,
      equipmentDescription: '',
      specialties: [],
    },
  });

  // Use um efeito para garantir que os dados sejam recarregados quando o componente for montado
  useEffect(() => {
    console.log('PhotographerProfile montado - carregando dados...');
    
    // Recarregar dados ao montar o componente
    const loadData = async () => {
      try {
        await refetchUser();
        console.log('Dados do usuário recarregados na montagem do componente');
        
        if (data) {
          await refetchProfile();
          console.log('Dados do perfil recarregados na montagem do componente');
        }
      } catch (error) {
        console.error('Erro ao recarregar dados:', error);
      }
    };
    
    loadData();
    
    // Configurar um intervalo para verificar se há dados novos a cada 30 segundos
    const intervalId = setInterval(() => {
      console.log('Verificando atualizações de dados...');
      refetchUser();
      if (data) {
        refetchProfile();
      }
    }, 30000);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => {
      clearInterval(intervalId);
      console.log('PhotographerProfile desmontado - intervalos limpos');
    };
  }, [refetchUser, refetchProfile, data]);

  // Update form values when data is loaded - modificado para ser mais eficaz
  useEffect(() => {
    console.log("useEffect: Atualizando valores do formulário com os dados recebidos");
    if (data || photographerProfile) {
      form.reset({
        name: data?.name || '',
        phone: data?.phone || '',
        bio: data?.bio || '',
        location: data?.location || '',
        instagramUsername: photographerProfile?.instagramUsername || '',
        yearsOfExperience: photographerProfile?.yearsOfExperience || 0,
        equipmentDescription: photographerProfile?.equipmentDescription || '',
        specialties: photographerProfile?.specialties || [],
      });
    }
  }, [data, photographerProfile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      console.log('Enviando dados de usuário:', {
        name: values.name,
        phone: values.phone,
        bio: values.bio,
        location: values.location,
      });
      
      // Update user data
      const userRes = await apiRequest('PATCH', '/api/users/me', {
        name: values.name,
        phone: values.phone,
        bio: values.bio,
        location: values.location,
      });

      console.log('Enviando dados de perfil de fotógrafo:', {
        instagramUsername: values.instagramUsername,
        yearsOfExperience: values.yearsOfExperience,
        equipmentDescription: values.equipmentDescription,
        specialties: values.specialties,
      });
      
      // Update photographer profile
      const profileRes = await apiRequest('PATCH', '/api/photographers/profile', {
        instagramUsername: values.instagramUsername,
        yearsOfExperience: values.yearsOfExperience,
        equipmentDescription: values.equipmentDescription,
        specialties: values.specialties || [],
      });

      const user = await userRes.json();
      const profile = await profileRes.json();
      
      console.log('Resposta da atualização do usuário:', user);
      console.log('Resposta da atualização do perfil:', profile);
      
      return { user, profile };
    },
    onSuccess: (data) => {
      console.log('Perfil atualizado com sucesso:', data);
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso',
      });
      
      // Forçar recarregamento dos dados do usuário e perfil
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/profile'] });
      
      // Recarregar dados imediatamente sem esperar a invalidação
      Promise.all([
        refetchUser(),
        refetchProfile()
      ]).then(() => {
        console.log('Dados recarregados após atualização');
      });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar perfil:', error);
      
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message || 'Ocorreu um erro ao atualizar suas informações',
        variant: 'destructive',
      });
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async () => {
      console.log('Criando novo perfil de fotógrafo...');
      
      const res = await apiRequest('PATCH', '/api/photographers/profile', {
        instagramUsername: '',
        yearsOfExperience: 0,
        equipmentDescription: '',
        specialties: [],
        portfolioImages: [],
        availableTimes: {},
      });
      
      const profile = await res.json();
      console.log('Novo perfil criado:', profile);
      return profile;
    },
    onSuccess: (data) => {
      console.log('Perfil criado com sucesso:', data);
      
      toast({
        title: 'Perfil criado',
        description: 'Seu perfil de fotógrafo foi criado com sucesso. Você pode atualizá-lo agora.',
      });
      
      // Forçar recarregamento dos dados do perfil
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/profile'] });
      
      // Recarregar dados imediatamente
      refetchProfile().then(() => {
        console.log('Dados do perfil recarregados após criação');
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar perfil:', error);
      
      toast({
        title: 'Erro ao criar perfil',
        description: error.message || 'Ocorreu um erro ao criar seu perfil de fotógrafo.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Se o perfil do fotógrafo não existir mas o usuário estiver autenticado
  if (!isLoadingProfile && !photographerProfile && data) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <PhotographerSidebar />
        <div className="flex-1 p-8">
          <PageTitle title="Perfil do Fotógrafo" />
          
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Perfil não encontrado</CardTitle>
              <CardDescription>
                Seu perfil de fotógrafo não foi criado ainda. Crie-o para começar a utilizar a plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <Button 
                onClick={() => createProfileMutation.mutate()}
                disabled={createProfileMutation.isPending}
                size="lg"
              >
                {createProfileMutation.isPending ? 'Criando perfil...' : 'Criar perfil de fotógrafo'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingProfile) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PhotographerSidebar />
      <div className="flex-1 p-8">
        <PageTitle title="Perfil do Fotógrafo" />

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>Informações pessoais</CardTitle>
                <CardDescription>
                  Atualize seus dados de perfil e informações profissionais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
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
                    </div>

                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Biografia</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Conte um pouco sobre você e sua experiência como fotógrafo"
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
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização</FormLabel>
                          <FormControl>
                            <Input placeholder="São Paulo, SP" {...field} />
                          </FormControl>
                          <FormDescription>
                            Sua cidade e estado para aparecer nas buscas locais
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="instagramUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuário do Instagram</FormLabel>
                          <FormControl>
                            <Input placeholder="@seuperfil" {...field} />
                          </FormControl>
                          <FormDescription>
                            Seu perfil profissional no Instagram (sem o @)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="yearsOfExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Anos de experiência</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="equipmentDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipamentos</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva os equipamentos que você utiliza"
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
                      className="w-full md:w-auto"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Foto de perfil</CardTitle>
                <CardDescription>
                  Sua imagem será exibida no seu perfil e nas buscas
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <AvatarUpload
                  currentAvatar={data?.avatar}
                  onUpload={(url) => {
                    console.log('Atualizando avatar para:', url);
                    apiRequest('PATCH', '/api/users/me', { avatar: url })
                      .then(() => {
                        console.log('Avatar atualizado com sucesso no servidor');
                        
                        // Invalidar a consulta
                        queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
                        
                        // Recarregar os dados do usuário imediatamente sem esperar a invalidação
                        refetchUser().then(() => {
                          console.log('Dados do usuário recarregados após atualização do avatar');
                        });
                        
                        toast({
                          title: 'Foto atualizada',
                          description: 'Sua foto de perfil foi atualizada com sucesso',
                        });
                      })
                      .catch((error) => {
                        console.error('Erro ao atualizar avatar:', error);
                        toast({
                          title: 'Erro ao atualizar foto',
                          description: 'Não foi possível atualizar sua foto de perfil',
                          variant: 'destructive',
                        });
                      });
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <PortfolioEditor userId={data?.id} />
        </div>
      </div>
    </div>
  );
};

export default PhotographerProfile;
