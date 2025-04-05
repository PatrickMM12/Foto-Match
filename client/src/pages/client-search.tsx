import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import ClientSidebar from '@/components/layout/client-sidebar';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import PhotographerMap from '@/components/client/photographer-map';
import { useGoogleMaps } from '@/hooks/use-google-maps';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Search, MapPin, Star } from 'lucide-react';

const ClientSearch = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [radius, setRadius] = useState([25]); // km
  const [location, setLocation] = useState({ lat: null, lng: null });
  const { isLoaded, loadError } = useGoogleMaps();
  
  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Default to São Paulo if geolocation fails
          setLocation({ lat: -23.5505, lng: -46.6333 });
        }
      );
    } else {
      // Default to São Paulo if geolocation not available
      setLocation({ lat: -23.5505, lng: -46.6333 });
    }
  }, []);
  
  // Search for photographers
  const searchParams = new URLSearchParams();
  if (searchTerm) searchParams.append('query', searchTerm);
  if (location.lat && location.lng) {
    searchParams.append('lat', location.lat.toString());
    searchParams.append('lng', location.lng.toString());
    searchParams.append('radius', radius[0].toString());
  }
  
  const { data: photographers, isLoading } = useQuery({
    queryKey: [`/api/search/photographers?${searchParams.toString()}`],
    enabled: !!location.lat && !!location.lng,
  });
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Refetch with current search params
    // This is already handled by the queryKey changes
  };
  
  const handleViewPhotographer = (id: number) => {
    navigate(`/photographer/${id}`);
  };
  
  if (!isLoaded) return <LoadingSpinner />;
  if (loadError) return <div>Erro ao carregar o mapa. Por favor, recarregue a página.</div>;
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientSidebar />
      <div className="flex-1 p-8">
        <PageTitle title="Encontre Fotógrafos" />
        
        <div className="grid grid-cols-12 gap-6 mt-6">
          <div className="col-span-12 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Filtros de Busca</CardTitle>
                <CardDescription>
                  Encontre fotógrafos próximos a você
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, especialidade..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Distância: {radius[0]} km</span>
                    </div>
                    <Slider
                      value={radius}
                      onValueChange={setRadius}
                      max={100}
                      step={5}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Buscar
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <div className="mt-6 space-y-4">
              <h3 className="font-medium">Fotógrafos Encontrados ({photographers?.length || 0})</h3>
              
              {isLoading ? (
                <LoadingSpinner />
              ) : photographers?.length === 0 ? (
                <p className="text-muted-foreground">Nenhum fotógrafo encontrado na região.</p>
              ) : (
                photographers?.map((photographer) => (
                  <Card key={photographer.id}>
                    <CardHeader className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-muted">
                          {photographer.avatar ? (
                            <img 
                              src={photographer.avatar} 
                              alt={photographer.name} 
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-primary text-primary-foreground">
                              {photographer.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{photographer.name}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <CardDescription className="text-xs">
                              4.8 (42 avaliações)
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {photographer.location && (
                        <div className="flex items-center text-xs text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{photographer.location}</span>
                        </div>
                      )}
                      <div className="line-clamp-2 text-sm">
                        {photographer.bio || 'Fotógrafo profissional.'}
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleViewPhotographer(photographer.id)}
                      >
                        Ver perfil
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </div>
          
          <div className="col-span-12 lg:col-span-8">
            <Card className="h-[calc(100vh-12rem)]">
              <CardContent className="p-0 h-full">
                <PhotographerMap 
                  center={location} 
                  photographers={photographers || []} 
                  onMarkerClick={handleViewPhotographer}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSearch;
