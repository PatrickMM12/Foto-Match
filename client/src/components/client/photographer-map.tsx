import { useRef, useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface PhotographerMapProps {
  center: { lat: number | null; lng: number | null };
  photographers: any[];
  onMarkerClick: (id: number) => void;
}

const PhotographerMap: React.FC<PhotographerMapProps> = ({ 
  center,
  photographers,
  onMarkerClick
}) => {
  const [selectedPhotographer, setSelectedPhotographer] = useState<any | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  
  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  });

  // Map options
  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };

  // Set map reference on load
  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  // Clear selected photographer when map unmounts
  const onUnmount = () => {
    mapRef.current = null;
  };

  // When center changes, update map center
  useEffect(() => {
    if (isLoaded && mapRef.current && center.lat && center.lng) {
      mapRef.current.setCenter({ lat: center.lat, lng: center.lng });
    }
  }, [center, isLoaded]);

  // If photographers change, fit bounds to include all of them
  useEffect(() => {
    if (isLoaded && mapRef.current && photographers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      // Add center to bounds
      if (center.lat && center.lng) {
        bounds.extend({ lat: center.lat, lng: center.lng });
      }
      
      // Add all photographers with coordinates to bounds
      photographers.forEach(photographer => {
        if (photographer.latitude && photographer.longitude) {
          bounds.extend({ 
            lat: photographer.latitude, 
            lng: photographer.longitude 
          });
        }
      });
      
      // Only fit bounds if there are multiple points
      if (photographers.length > 1 || (photographers.length === 1 && center.lat && center.lng)) {
        mapRef.current.fitBounds(bounds);
      }
    }
  }, [photographers, isLoaded, center]);

  // Render Stars for ratings
  const renderStars = (rating: number = 4.5) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= Math.round(rating) 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Carregando mapa...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center.lat && center.lng ? center : { lat: -23.5505, lng: -46.6333 }}
      zoom={10}
      onLoad={onMapLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {/* User's location marker */}
      {center.lat && center.lng && (
        <MarkerF
          position={{ lat: center.lat, lng: center.lng }}
          icon={{
            url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233B82F6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3C/svg%3E",
            scaledSize: new google.maps.Size(30, 30),
          }}
        />
      )}

      {/* Photographer markers */}
      {photographers.map(photographer => {
        if (!photographer.latitude || !photographer.longitude) return null;
        
        return (
          <MarkerF
            key={photographer.id}
            position={{ lat: photographer.latitude, lng: photographer.longitude }}
            onClick={() => setSelectedPhotographer(photographer)}
            icon={{
              url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23F97316' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3C/svg%3E",
              scaledSize: new google.maps.Size(30, 30),
            }}
          />
        );
      })}

      {/* Info window for selected photographer */}
      {selectedPhotographer && (
        <InfoWindowF
          position={{ lat: selectedPhotographer.latitude, lng: selectedPhotographer.longitude }}
          onCloseClick={() => setSelectedPhotographer(null)}
        >
          <Card className="w-64 border-none shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center space-x-3 mb-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedPhotographer.avatar} alt={selectedPhotographer.name} />
                  <AvatarFallback>{getInitials(selectedPhotographer.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedPhotographer.name}</h3>
                  <div className="flex items-center space-x-1">
                    {renderStars()}
                    <span className="text-xs text-muted-foreground">4.5</span>
                  </div>
                </div>
              </div>
              
              {selectedPhotographer.specialties && selectedPhotographer.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedPhotographer.specialties.slice(0, 3).map((specialty: string, i: number) => (
                    <span key={i} className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {specialty}
                    </span>
                  ))}
                  {selectedPhotographer.specialties.length > 3 && (
                    <span className="inline-block text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                      +{selectedPhotographer.specialties.length - 3}
                    </span>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {selectedPhotographer.bio || 'Fotógrafo profissional.'}
              </p>
              
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => onMarkerClick(selectedPhotographer.id)}
              >
                Ver Perfil
              </Button>
            </CardContent>
          </Card>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
};

export default PhotographerMap;
