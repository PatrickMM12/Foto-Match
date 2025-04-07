import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Image, Plus, Trash2, Star, StarOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface PortfolioItem {
  id: number;
  userId: number;
  imageUrl: string;
  title?: string;
  category?: string;
  featured: boolean;
  createdAt: string;
}

interface PortfolioEditorProps {
  userId?: number;
}

const PortfolioEditor: React.FC<PortfolioEditorProps> = ({ userId }) => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    imageUrl: '',
    title: '',
    category: '',
  });
  const [imagePreview, setImagePreview] = useState('');

  // Fetch portfolio items
  const { data: portfolioItems = [], isLoading, refetch: refetchPortfolio } = useQuery<PortfolioItem[]>({
    queryKey: [`/api/portfolio/${userId}`],
    enabled: !!userId,
    staleTime: 0, // Força revalidação ao refetch
    refetchOnWindowFocus: true, // Recarrega dados quando a janela ganha foco
  });

  // Add portfolio item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/portfolio', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portfolio/${userId}`] });
      
      // Recarregar dados imediatamente
      refetchPortfolio().then(() => {
        console.log('Portfólio recarregado após adicionar item');
      });
      
      toast({
        title: 'Item adicionado',
        description: 'O item foi adicionado ao seu portfólio com sucesso.',
      });
      setIsAddDialogOpen(false);
      setNewItem({ imageUrl: '', title: '', category: '' });
      setImagePreview('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar item',
        description: error.message || 'Houve um erro ao adicionar o item ao portfólio.',
        variant: 'destructive',
      });
    },
  });

  // Delete portfolio item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/portfolio/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portfolio/${userId}`] });
      
      // Recarregar dados imediatamente
      refetchPortfolio().then(() => {
        console.log('Portfólio recarregado após remover item');
      });
      
      toast({
        title: 'Item removido',
        description: 'O item foi removido do seu portfólio com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover item',
        description: error.message || 'Houve um erro ao remover o item do portfólio.',
        variant: 'destructive',
      });
    },
  });

  // Toggle featured status mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: number; featured: boolean }) => {
      return await apiRequest('PATCH', `/api/portfolio/${id}`, { featured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portfolio/${userId}`] });
      
      // Recarregar dados imediatamente
      refetchPortfolio().then(() => {
        console.log('Portfólio recarregado após alterar destaque');
      });
      
      toast({
        title: 'Status atualizado',
        description: 'O status de destaque foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message || 'Houve um erro ao atualizar o status de destaque.',
        variant: 'destructive',
      });
    },
  });

  // Usar um efeito para garantir que os dados do portfólio sejam atualizados regularmente
  useEffect(() => {
    console.log('PortfolioEditor montado - carregando dados do portfólio...');
    
    // Recarregar dados do portfólio ao montar o componente
    if (userId) {
      refetchPortfolio().then(() => {
        console.log('Dados do portfólio carregados na montagem do componente');
      }).catch(error => {
        console.error('Erro ao carregar dados do portfólio:', error);
      });
    }
    
    // Verificar se há atualizações a cada 30 segundos
    const intervalId = setInterval(() => {
      if (userId) {
        refetchPortfolio().then(() => {
          console.log('Verificação periódica: Dados do portfólio atualizados');
        });
      }
    }, 30000);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => {
      clearInterval(intervalId);
      console.log('PortfolioEditor desmontado - intervalo limpo');
    };
  }, [userId, refetchPortfolio]);

  // Handle image URL change with preview
  const handleImageUrlChange = (url: string) => {
    setNewItem({ ...newItem, imageUrl: url });
    setImagePreview(url);
  };

  // Handle add item form submission
  const handleAddItem = () => {
    if (!newItem.imageUrl) {
      toast({
        title: 'URL da imagem obrigatória',
        description: 'Por favor, informe a URL da imagem para adicionar ao portfólio.',
        variant: 'destructive',
      });
      return;
    }

    addItemMutation.mutate({
      ...newItem,
      userId,
    });
  };

  // Handle delete item
  const handleDeleteItem = (id: number) => {
    if (confirm('Tem certeza que deseja remover esta imagem do seu portfólio?')) {
      deleteItemMutation.mutate(id);
    }
  };

  // Handle toggle featured status
  const handleToggleFeatured = (id: number, currentStatus: boolean) => {
    toggleFeaturedMutation.mutate({ id, featured: !currentStatus });
  };

  // Categories for portfolio items
  const categories = [
    'Casamento',
    'Retrato',
    'Eventos',
    'Família',
    'Ensaio',
    'Moda',
    'Gastronomia',
    'Produto',
    'Arquitetura',
    'Natureza',
    'Outro'
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Portfólio</CardTitle>
          <CardDescription>
            Gerencie as imagens do seu portfólio para exibir aos clientes
          </CardDescription>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar Imagem
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : portfolioItems && portfolioItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {portfolioItems.map((item: PortfolioItem) => (
              <div key={item.id} className="group relative rounded-md overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title || 'Imagem de portfólio'}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex flex-col justify-between p-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-black hover:bg-opacity-30"
                      onClick={() => handleToggleFeatured(item.id, item.featured)}
                    >
                      {item.featured ? (
                        <StarOff className="h-5 w-5" />
                      ) : (
                        <Star className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-white text-sm font-medium mb-1 truncate">
                      {item.title || 'Sem título'}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                        {item.category || 'Sem categoria'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-red-500 hover:bg-black hover:bg-opacity-30"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
                {item.featured && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
                    Destaque
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Image className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Seu portfólio está vazio</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Adicione suas melhores fotos para mostrar seu trabalho aos potenciais clientes.
              Um bom portfólio aumenta suas chances de conseguir mais sessões.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Primeira Imagem
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add Image Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Imagem ao Portfólio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Input
                id="imageUrl"
                placeholder="https://exemplo.com/minha-foto.jpg"
                value={newItem.imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
              />
            </div>

            {imagePreview && (
              <div className="relative w-full h-48 rounded-md overflow-hidden bg-gray-100">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  onError={() => setImagePreview('')}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                placeholder="Casamento João e Maria"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria (opcional)</Label>
              <Select
                value={newItem.category}
                onValueChange={(value) => setNewItem({ ...newItem, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
              {addItemMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PortfolioEditor;
