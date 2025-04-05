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

    // Get API key from environment
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

    // Load the Google Maps API
    const loader = new Loader({
      apiKey,
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
