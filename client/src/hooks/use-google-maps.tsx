import { useState, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip loading if it's already loaded or has errored
    if (isLoaded || loadError) return;

    // If window.google is already defined, we're good to go
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Get API key from environment (usando o padrão do Vite para variáveis de ambiente)
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    
    // Fallback para um valor estático se a variável de ambiente não estiver disponível
    // Isso evita erros em ambiente de desenvolvimento
    const fallbackApiKey = 'AIzaSyD26qsgGUZ3IasPhI4S2HNXTQi6oQ_RMRo';
    
    // Use o apiKey se estiver disponível, senão use o fallback
    const googleMapsApiKey = apiKey || fallbackApiKey;

    // Load the Google Maps API
    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    loader.load()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Error loading Google Maps API:', error);
        setLoadError(error);
      });
  }, [isLoaded, loadError]);

  return { isLoaded, loadError };
};

// Declare google maps types for TypeScript
declare global {
  interface Window {
    google: {
      maps: any;
    };
  }
}
