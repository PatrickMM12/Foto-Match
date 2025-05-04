import React, { useRef, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { useGoogleMaps } from '@/hooks/use-google-maps'; // Assuming this loads the 'places' library

// --- TypeScript Global Augmentation for Custom Element ---
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        // Define expected attributes/props here if known, using 'any' for now
        ref?: React.Ref<any>;
        id?: string;
        placeholder?: string;
        value?: string; 
        country?: string;
        class?: string; // For className
        // Add other attributes like 'apiKey', 'requested-language' etc. if needed
      };
    }
  }
}
// --- End Augmentation ---

interface PlaceDetails {
  name: string; // Full address or name
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface LocationAutocompleteInputProps {
  label: string;
  placeholder?: string;
  onPlaceSelected: (details: PlaceDetails | null) => void;
  initialValue?: string;
  id?: string;
  required?: boolean;
  description?: string;
}

// Type definition for the PlaceAutocompleteElement - may need refinement
// based on actual properties after Google Maps API loads.
// We use 'any' for now as official types might not be readily available
// or require specific @types/google.maps package updates.
interface PlaceAutocompleteElement extends HTMLElement {
  value: string | null;
  getPlace(): google.maps.places.PlaceResult | undefined; // Hypothetical, might not exist
  getPlaceDetails(): Promise<google.maps.places.PlaceResult | undefined>; // More likely method
  // Add other potential properties/methods if known
}

const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  label,
  placeholder,
  onPlaceSelected,
  initialValue = '',
  id,
  required = false,
  description,
}) => {
  const { isLoaded, loadError } = useGoogleMaps(); // Ensure 'places' library is loaded by this hook
  const autocompleteInputRef = useRef<PlaceAutocompleteElement>(null); // Ref for the new element
  const [internalValue, setInternalValue] = useState<string | null>(initialValue);

  // Effect to handle the place selection event from the web component
  useEffect(() => {
    const inputElement = autocompleteInputRef.current;

    if (!isLoaded || !inputElement) {
      // console.log('Autocomplete: Waiting for API or element ref...');
      return; // Wait for API and element ref
    }

    // console.log('Autocomplete: API loaded and element ref found:', inputElement); // REMOVIDO

    // Type assertion para o evento, esperando placePrediction
    const handlePlaceSelect = async (event: Event & { placePrediction?: any }) => {
        // console.log("Autocomplete: gmp-select event received:", event); // REMOVIDO
        
        const placePrediction = event.placePrediction;

        if (!placePrediction || typeof placePrediction.toPlace !== 'function') {
          console.error('Autocomplete: placePrediction or toPlace method missing in event.');
          onPlaceSelected(null);
          return;
        }
        
        try {
            // Obtém o objeto Place
            const place = placePrediction.toPlace();
            
            // Busca os campos necessários (agora usando camelCase)
            await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] });
            // console.log("Autocomplete: Fetched Place details:", place); // REMOVIDO

            if (place.location) {
              const details: PlaceDetails = {
                name: place.displayName || place.formattedAddress || '', // Usar displayName ou formattedAddress
                city: null,
                state: null,
                country: null,
                latitude: place.location.lat(),
                longitude: place.location.lng(),
              };

              // Extrair city, state, country de addressComponents (usando camelCase)
              place.addressComponents?.forEach((component: any) => { 
                if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                  details.city = component.longText; // Usar longText ou shortText
                } else if (component.types.includes('administrative_area_level_1')) {
                  details.state = component.shortText; // Usar shortText
                } else if (component.types.includes('country')) {
                  details.country = component.longText; // Usar longText
                }
              });

              // console.log("Autocomplete: Extracted details:", details); // REMOVIDO
              setInternalValue(details.name); // Update internal state
              onPlaceSelected(details);
            } else {
              console.warn("Autocomplete: Place location missing after fetching fields.");
              onPlaceSelected(null);
            }
        } catch (error) {
             console.error("Autocomplete: Error fetching/processing place details:", error);
             onPlaceSelected(null);
        }
    };

    // --- CORREÇÃO: Usar o nome de evento correto --- 
    const eventName = 'gmp-select'; // Nome correto do evento
    inputElement.addEventListener(eventName, handlePlaceSelect);

    // Cleanup
    return () => {
      inputElement.removeEventListener(eventName, handlePlaceSelect);
    };
  }, [isLoaded, onPlaceSelected]);


  // Effect to set initial value (might need specific attribute for web component)
  useEffect(() => {
     setInternalValue(initialValue);
     // If the web component uses a 'value' attribute/property:
     if (isLoaded && autocompleteInputRef.current) {
       // Attempt to set value directly - check if this works
       autocompleteInputRef.current.value = initialValue;
     }
  }, [initialValue, isLoaded]);

  // Handle manual input change if needed (may interfere with autocomplete)
  // const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //     setInternalValue(event.target.value);
  //     if(event.target.value.trim() === '') {
  //         onPlaceSelected(null);
  //     }
  // };

  if (loadError) {
    return <div>Erro ao carregar Google Maps API.</div>;
  }

  // JSX needs to be adjusted for the web component
  // We might need to use `React.createElement` or ensure TS knows about the custom element.
  // For simplicity, using string tag name. Requires proper TS setup for custom elements.

  return (
    <div className="space-y-1.5 w-full">
      {label && <Label htmlFor={id}>{label}{required && ' *'}</Label>}
      {isLoaded ? (
        // Apply basic layout/border styling to a wrapper div
        <div className="w-full flex h-10 rounded-md border border-input bg-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <gmp-place-autocomplete
            ref={autocompleteInputRef}
            id={id}
            placeholder={placeholder}
            value={internalValue ?? ''} 
            country="br"
            // Removed direct styling from the component itself
            // Applying minimal inline style to fill the container
            style={{ 
              width: '100%', 
              height: '100%', 
              border: 'none', 
              outline: 'none', 
              paddingLeft: '12px', // Adjust padding as needed
              paddingRight: '12px', 
              backgroundColor: 'transparent'
            }}
          >
          </gmp-place-autocomplete>
        </div>
      ) : (
        // Show a disabled input while loading
        <input
          id={id}
          placeholder={placeholder}
          value={internalValue ?? ''}
          disabled={true}
          required={required}
          className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" // Apply Tailwind/Shadcn styles
        />
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
};

export default LocationAutocompleteInput; 