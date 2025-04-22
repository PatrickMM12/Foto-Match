import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/loading-spinner';
import PhotoGallery from '@/components/shared/photo-gallery';
import BookingForm from '@/components/client/booking-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, MapPin, Camera, Calendar, Clock, Award, DollarSign } from 'lucide-react';
import { formatPriceBRL } from '@/lib/formatters';

// Interfaces para tipagem
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

interface Review {
  id: number;
  sessionId: number;
  reviewerId: number;
  photographerId: number;
  rating: number;
  qualityRating: number;
  professionalismRating: number;
  comment: string | null;
  createdAt: string;
}

interface PortfolioItem {
  id: number;
  userId: number;
  imageUrl: string;
  title: string | null;
  category: string | null;
  featured: boolean;
  createdAt: string;
}

const PhotographerDetail = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  
  // Fetch photographer data
  const { data: photographer, isLoading: isLoadingPhotographer } = useQuery({
    queryKey: [`/api/users/${id}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/users/${id}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error('Failed to fetch photographer');
        }
        return res.json();
      } catch (error) {
        console.error('Photographer fetch error:', error);
        navigate('/client/search');
        throw error;
      }
    }
  });
  
  // Fetch portfolio items
  const { data: portfolioItems = [], isLoading: isLoadingPortfolio } = useQuery<PortfolioItem[]>({
    queryKey: [`/api/portfolio/${id}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/portfolio/${id}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error('Failed to fetch portfolio');
        }
        return res.json();
      } catch (error) {
        console.error('Portfolio fetch error:', error);
        return [];
      }
    },
    enabled: !!id,
  });
  
  // Fetch services
  const { data: services = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: [`/api/photographers/${id}/services`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/photographers/${id}/services`, {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error('Failed to fetch services');
        }
        return res.json();
      } catch (error) {
        console.error('Services fetch error:', error);
        return [];
      }
    },
    enabled: !!id,
  });
  
  // Fetch reviews
  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery<Review[]>({
    queryKey: [`/api/reviews/photographer/${id}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/reviews/photographer/${id}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error('Failed to fetch reviews');
        }
        return res.json();
      } catch (error) {
        console.error('Reviews fetch error:', error);
        return [];
      }
    },
    enabled: !!id,
  });
  
  const isLoading = isLoadingPhotographer || isLoadingPortfolio || isLoadingServices || isLoadingReviews;
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!photographer) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p>Fotógrafo não encontrado.</p>
            <Button onClick={() => navigate('/client/search')} className="mt-4">
              Voltar para a busca
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { name, location, bio, avatar, photographerProfile } = photographer;
  
  // Calculate average rating
  const calculateAverageRating = () => {
    if (!reviews || reviews.length === 0) return { overall: 0, quality: 0, professionalism: 0 };
    
    const overall = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const quality = reviews.reduce((sum, review) => sum + review.qualityRating, 0) / reviews.length;
    const professionalism = reviews.reduce((sum, review) => sum + review.professionalismRating, 0) / reviews.length;
    
    return { overall, quality, professionalism };
  };
  
  const ratings = calculateAverageRating();
  
  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header/Cover */}
      <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
      
      <div className="container mx-auto px-4 -mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white mb-4 bg-gray-100">
                    {avatar ? (
                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary text-white text-4xl font-bold">
                        {name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-center">{name}</h1>
                  
                  {location && (
                    <div className="flex items-center mt-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center mt-4">
                    {renderStars(ratings.overall)}
                    <span className="ml-2 text-sm">
                      {ratings.overall.toFixed(1)} ({reviews?.length || 0} avaliações)
                    </span>
                  </div>
                  
                  <div className="w-full mt-6">
                    <Button className="w-full" onClick={() => setIsBookingDialogOpen(true)}>
                      Agendar Sessão
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Sobre</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{bio || 'Nenhuma informação disponível.'}</p>
                
                {photographerProfile && (
                  <div className="mt-4 space-y-4">
                    {photographerProfile.yearsOfExperience > 0 && (
                      <div className="flex items-start">
                        <Award className="h-5 w-5 mr-2 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">Experiência</h4>
                          <p className="text-sm text-muted-foreground">
                            {photographerProfile.yearsOfExperience} {photographerProfile.yearsOfExperience === 1 ? 'ano' : 'anos'} de experiência
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {photographerProfile.specialties && photographerProfile.specialties.length > 0 && (
                      <div className="flex items-start">
                        <Camera className="h-5 w-5 mr-2 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">Especialidades</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {photographerProfile.specialties.map((specialty: string, index: number) => (
                              <Badge key={index} variant="secondary">{specialty}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {photographerProfile.equipmentDescription && (
                      <div className="flex items-start">
                        <Camera className="h-5 w-5 mr-2 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">Equipamentos</h4>
                          <p className="text-sm text-muted-foreground">{photographerProfile.equipmentDescription}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Portfolio and Reviews */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="portfolio">
              <TabsList className="w-full">
                <TabsTrigger value="portfolio" className="flex-1">Portfólio</TabsTrigger>
                <TabsTrigger value="services" className="flex-1">Serviços</TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1">Avaliações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="portfolio" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Portfólio</CardTitle>
                    <CardDescription>Trabalhos realizados pelo fotógrafo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {portfolioItems && portfolioItems.length > 0 ? (
                      <PhotoGallery images={portfolioItems.map(item => ({
                        id: item.id,
                        url: item.imageUrl,
                        title: item.title || '',
                        category: item.category || ''
                      }))} />
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma foto no portfólio ainda.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="services" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Serviços Oferecidos</CardTitle>
                    <CardDescription>Pacotes e opções disponíveis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {services && services.length > 0 ? (
                      <div className="grid gap-4">
                        {services.map((service) => (
                          <Card key={service.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">{service.name}</CardTitle>
                              <CardDescription>
                                {service.description || 'Nenhuma descrição disponível.'}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <h3 className="text-base font-medium">{service.name}</h3>
                                  <span>{formatPriceBRL(service.price)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1 text-primary" />
                                    <span className="font-medium">Duração:</span>
                                  </div>
                                  <span>{service.duration} minutos</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Camera className="h-4 w-4 mr-1 text-primary" />
                                    <span className="font-medium">Fotos incluídas:</span>
                                  </div>
                                  <span>{service.maxPhotos || 'Não especificado'}</span>
                                </div>
                                {service.additionalPhotoPrice !== null && service.additionalPhotoPrice > 0 && (
                                  <div className="mt-2 text-sm text-gray-500 flex justify-between">
                                    <span>Fotos adicionais:</span>
                                    <span>{formatPriceBRL(service.additionalPhotoPrice)}</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button onClick={() => setIsBookingDialogOpen(true)} className="w-full">
                                Agendar
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum serviço cadastrado.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Avaliações</CardTitle>
                    <CardDescription>Feedback de clientes anteriores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reviews && reviews.length > 0 ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-center mb-2">
                              <span className="text-3xl font-bold text-primary">{ratings.overall.toFixed(1)}</span>
                              <span className="text-sm text-muted-foreground">/5</span>
                            </div>
                            <div className="flex justify-center">{renderStars(ratings.overall)}</div>
                            <p className="text-center text-sm text-muted-foreground mt-2">
                              Avaliação geral
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-center mb-2">
                              <span className="text-3xl font-bold text-primary">{ratings.quality.toFixed(1)}</span>
                              <span className="text-sm text-muted-foreground">/5</span>
                            </div>
                            <div className="flex justify-center">{renderStars(ratings.quality)}</div>
                            <p className="text-center text-sm text-muted-foreground mt-2">
                              Qualidade das fotos
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-center mb-2">
                              <span className="text-3xl font-bold text-primary">{ratings.professionalism.toFixed(1)}</span>
                              <span className="text-sm text-muted-foreground">/5</span>
                            </div>
                            <div className="flex justify-center">{renderStars(ratings.professionalism)}</div>
                            <p className="text-center text-sm text-muted-foreground mt-2">
                              Profissionalismo
                            </p>
                          </div>
                        </div>
                        
                        {reviews.map((review) => (
                          <div key={review.id} className="border-b pb-6 last:border-b-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center">
                                  <h4 className="font-medium">Cliente #{review.reviewerId}</h4>
                                  <span className="mx-2">•</span>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex mt-1">{renderStars(review.rating)}</div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center text-sm">
                                  <span className="mr-1">Qualidade:</span>
                                  {renderStars(review.qualityRating)}
                                </div>
                                <div className="flex items-center text-sm mt-1">
                                  <span className="mr-1">Profissionalismo:</span>
                                  {renderStars(review.professionalismRating)}
                                </div>
                              </div>
                            </div>
                            {review.comment && (
                              <p className="mt-3 text-muted-foreground">{review.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma avaliação encontrada.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Sessão com {name}</DialogTitle>
          </DialogHeader>
          <BookingForm
            photographerId={parseInt(id!)}
            services={services}
            onBookingComplete={() => {
              setIsBookingDialogOpen(false);
              toast({
                title: 'Sessão agendada!',
                description: 'Sua solicitação foi enviada ao fotógrafo.',
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotographerDetail;
