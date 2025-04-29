import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

import ClientSidebar from '@/components/layout/client-sidebar';
import PageTitle from '@/components/shared/page-title';
import LoadingSpinner from '@/components/shared/loading-spinner';
import PhotographerMap from '@/components/client/photographer-map';
import LocationAutocompleteInput from '@/components/shared/location-autocomplete-input';
import { useGoogleMaps } from '@/hooks/use-google-maps';
import { apiRequest } from '@/lib/queryClient';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, MapPin, Star, Filter } from 'lucide-react';

interface Photographer {
  id: number;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  photographerProfile?: {
    specialties?: string[];
  };
}

interface PlaceDetails {
  name: string; 
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

const ClientSearch = () => {
  const [, navigate] = useLocation();
  const [selectedLocationDetails, setSelectedLocationDetails] = useState<PlaceDetails | null>(null);
  const [textSearchTerm, setTextSearchTerm] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [mapCenter, setMapCenter] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const { isLoaded, loadError } = useGoogleMaps();
  
  const { data: availableSpecialties, isLoading: isLoadingSpecialties } = useQuery<string[]>({ 
    queryKey: ['/api/specialties'], 
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/specialties');
      if (!res.ok) throw new Error('Failed to fetch specialties');
      return res.json();
    },
    staleTime: Infinity,
    placeholderData: [],
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setMapCenter({ lat: -23.5505, lng: -46.6333 });
        }
      );
    } else {
      setMapCenter({ lat: -23.5505, lng: -46.6333 });
    }
  }, []);
  
  const { data: photographers, isLoading, refetch } = useQuery<Photographer[]>({
    queryKey: ['/api/search/photographers-by-location', searchTrigger],
    queryFn: async () => {
      if (!selectedLocationDetails) {
        return [];
      } 
      
  const searchParams = new URLSearchParams();
      
      if (selectedLocationDetails.latitude && selectedLocationDetails.longitude) {
        searchParams.append('lat', selectedLocationDetails.latitude.toString());
        searchParams.append('lng', selectedLocationDetails.longitude.toString());
      } else if (selectedLocationDetails.city) {
        searchParams.append('city', selectedLocationDetails.city); 
        if (selectedLocationDetails.state) searchParams.append('state', selectedLocationDetails.state);
        if (selectedLocationDetails.country) searchParams.append('country', selectedLocationDetails.country);
      } else {
        console.error("Selected location has neither lat/lng nor city.");
        return [];
      }

      if (textSearchTerm) {
        searchParams.append('query', textSearchTerm);
      }
      
      if (selectedSpecialties.length > 0) {
        searchParams.append('specialties', selectedSpecialties.join(','));
      }
      
      const apiUrl = `/api/search/photographers-by-location?${searchParams.toString()}`;
      console.log("API Request URL:", apiUrl);
      const res = await apiRequest('GET', apiUrl);
      if (!res.ok) {
        throw new Error('Falha ao buscar fotógrafos');
      }
      const data = await res.json();
      
      if (data && data.length > 0) {
        if (selectedLocationDetails.latitude && selectedLocationDetails.longitude) {
          setMapCenter({ lat: selectedLocationDetails.latitude, lng: selectedLocationDetails.longitude });
        }
      } else if (selectedLocationDetails.latitude && selectedLocationDetails.longitude) {
        setMapCenter({ lat: selectedLocationDetails.latitude, lng: selectedLocationDetails.longitude });
      } else if (mapCenter.lat === null) {
        setMapCenter({ lat: -23.5505, lng: -46.6333 });
      }
      
      return data;
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  const handleSpecialtyChange = (specialty: string, checked: boolean | string) => {
    setSelectedSpecialties(prev => 
      checked 
        ? [...prev, specialty] 
        : prev.filter(s => s !== specialty)
    );
  };

  const triggerSearch = useCallback(() => {
    if (!selectedLocationDetails) {
      console.warn("Selected location details are required to search.");
      return;
    }
    console.log("Triggering search with:", { selectedLocationDetails, textSearchTerm, selectedSpecialties });
    setSearchTrigger(prev => prev + 1);
    refetch();
  }, [selectedLocationDetails, textSearchTerm, selectedSpecialties, refetch]);
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch();
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
                  Encontre fotógrafos por localidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  <LocationAutocompleteInput
                    id="locality-search"
                    label="Localidade"
                    placeholder="Digite a cidade ou região"
                    onPlaceSelected={setSelectedLocationDetails}
                    required
                    description="Onde você deseja realizar o ensaio?"
                  />
                  
                  <div className="space-y-1.5">
                    <label htmlFor="searchTerm" className="text-sm font-medium">Busca Adicional (Opcional)</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="searchTerm"
                        placeholder="Nome, especialidade..."
                        value={textSearchTerm}
                        onChange={(e) => setTextSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-1.5"><Filter className="h-4 w-4"/>Especialidades</Label>
                    {isLoadingSpecialties ? (
                      <LoadingSpinner size="sm" />
                    ) : availableSpecialties && availableSpecialties.length > 0 ? (
                      <ScrollArea className="h-40 w-full rounded-md border p-4">
                        <div className="space-y-3">
                          {availableSpecialties.map((spec) => (
                            <div key={spec} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`spec-${spec}`}
                                checked={selectedSpecialties.includes(spec)}
                                onCheckedChange={(checked) => handleSpecialtyChange(spec, checked)}
                              />
                              <Label htmlFor={`spec-${spec}`} className="text-sm font-normal cursor-pointer">
                                {spec} 
                              </Label>
                            </div>
                          ))}
                    </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhuma especialidade encontrada.</p>
                    )}
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading || !selectedLocationDetails}>
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Buscar Fotógrafos'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <div className="mt-6 space-y-4">
              <h3 className="font-medium">Fotógrafos Encontrados ({photographers?.length || 0})</h3>
              
              {isLoading ? (
                <LoadingSpinner />
              ) : photographers?.length === 0 ? (
                searchTrigger > 0 ? (
                  <p className="text-muted-foreground italic">Nenhum fotógrafo encontrado para os critérios informados.</p>
                ) : (
                  <p className="text-muted-foreground italic">Informe a localidade e clique em buscar.</p>
                )
              ) : (
                photographers?.map((photographer) => (
                  <Card key={photographer.id} className='overflow-hidden'>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start space-x-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {photographer.avatar ? (
                            <img 
                              src={photographer.avatar} 
                              alt={photographer.name} 
                              className="h-full w-full object-cover" 
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-primary text-primary-foreground text-lg font-semibold">
                              {photographer.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate" title={photographer.name}>{photographer.name}</CardTitle>
                          {photographer.photographerProfile?.specialties && photographer.photographerProfile.specialties.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {photographer.photographerProfile.specialties.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {photographer.location && (
                        <div className="flex items-center text-xs text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{photographer.location}</span>
                        </div>
                      )}
                      {photographer.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {photographer.bio}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="p-4 pt-0 bg-muted/30">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleViewPhotographer(photographer.id)}
                      >
                        Ver Perfil Completo
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </div>
          
          <div className="col-span-12 lg:col-span-8">
            <Card className="h-[calc(100vh-12rem)] sticky top-8">
              <CardContent className="p-0 h-full">
                {mapCenter.lat && mapCenter.lng ? (
                <PhotographerMap 
                    center={mapCenter}
                  photographers={photographers || []} 
                  onMarkerClick={handleViewPhotographer}
                />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Carregando mapa...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSearch;
