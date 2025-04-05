import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

  // Fetch user and profile data
  const { data, isLoading } = useQuery({
    queryKey: ['/api/users/me'],
  });

  const { data: photographerProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/photographers/profile'],
    enabled: !!data,
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

  // Update form values when data is loaded
  React.useEffect(() => {
    if (data && photographerProfile) {
      form.reset({
        name: data.name || '',
        phone: data.phone || '',
        bio: data.bio || '',
        location: data.location || '',
        instagramUsername: photographerProfile.instagramUsername || '',
        yearsOfExperience: photographerProfile.yearsOfExperience || 0,
        equipmentDescription: photographerProfile.equipmentDescription || '',
        specialties: photographerProfile.specialties || [],
      });
    }
  }, [data, photographerProfile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      // Update user data
      const userRes = await apiRequest('PATCH', '/api/users/me', {
        name: values.name,
        phone: values.phone,
        bio: values.bio,
        location: values.location,
      });

      // Update photographer profile
      const profileRes = await apiRequest('PATCH', '/api/photographers/profile', {
        instagramUsername: values.instagramUsername,
        yearsOfExperience: values.yearsOfExperience,
        equipmentDescription: values.equipmentDescription,
        specialties: values.specialties,
      });

      return {
        user: await userRes.json(),
        profile: await profileRes.json(),
      };
    },
    onSuccess: () => {
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/photographers/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message || 'Ocorreu um erro ao atualizar suas informações',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  if (isLoading || isLoadingProfile) {
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
                    apiRequest('PATCH', '/api/users/me', { avatar: url })
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
                        toast({
                          title: 'Foto atualizada',
                          description: 'Sua foto de perfil foi atualizada com sucesso',
                        });
                      })
                      .catch(() => {
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
