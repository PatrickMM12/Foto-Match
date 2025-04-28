import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGoogleMaps } from '@/hooks/use-google-maps';

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

const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  label,
  placeholder,
  onPlaceSelected,
  initialValue = '',
  id,
  required = false,
  description,
}) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    setInputValue(initialValue); // Sync with external changes if needed
  }, [initialValue]);

  useEffect(() => {
    if (isLoaded && inputRef.current) {
      // Initialize Autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        // types: ['(cities)'], // Restrict to cities? Consider regions too.
        componentRestrictions: { country: 'br' }, // Restrict to Brazil initially? Can be prop later.
        fields: ['address_components', 'geometry.location', 'name', 'formatted_address'],
      });

      // Add listener for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place?.geometry?.location) {
          const details: PlaceDetails = {
            name: place.formatted_address || place.name || '',
            city: null,
            state: null,
            country: null,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          };

          // Extract city, state, country from address components
          place.address_components?.forEach(component => {
            if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
              details.city = component.long_name;
            } else if (component.types.includes('administrative_area_level_1')) {
              details.state = component.short_name; // Use short name (e.g., SP)
            } else if (component.types.includes('country')) {
              details.country = component.long_name;
            }
          });
          
          // If city wasn't found directly, try using the place name if it looks like a city
          if (!details.city && place.name && !place.formatted_address?.includes(place.name)) {
             // Heuristic: if name is part of formatted address but not the whole thing, it might be the city/locality.
             // This needs refinement based on typical Google Places results for cities.
             // Or rely solely on address_components. For now, let's prioritize components.
          }


          setInputValue(details.name); // Update input field with selected place name/address
          onPlaceSelected(details);
        } else {
           // Handle case where user types something but doesn't select a suggestion
           // Or if the selected place has no geometry (less common)
           onPlaceSelected(null); 
        }
      });
    }
    
    // Clean up listener on unmount (optional but good practice)
    // return () => {
    //   if (autocompleteRef.current) {
    //      google.maps.event.clearInstanceListeners(autocompleteRef.current);
    //   }
    // };

  }, [isLoaded, onPlaceSelected]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      // If user clears the input or types something invalidating selection, notify parent
      if(event.target.value.trim() === '') {
          onPlaceSelected(null);
      }
      // We might not call onPlaceSelected(null) here always,
      // as the user might be typing towards a valid selection.
      // The place_changed event handles the final selection.
  };

  if (loadError) {
    return <div>Erro ao carregar Google Maps API.</div>;
  }

  return (
    <div className="space-y-1.5 w-full">
      {label && <Label htmlFor={id}>{label}{required && ' *'}</Label>}
      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        disabled={!isLoaded} // Disable input until Maps API is loaded
        required={required}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
};

export default LocationAutocompleteInput; 