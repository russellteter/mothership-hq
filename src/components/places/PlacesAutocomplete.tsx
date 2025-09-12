import { useEffect, useRef } from 'react';

export function PlacesAutocomplete() {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  useEffect(() => {
    if (!inputRef.current || !apiKey) return;

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current!, {
        types: ['establishment'],
        componentRestrictions: { country: 'us' }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('Selected:', place);
      });
    };
    document.head.appendChild(script);
  }, [apiKey]);

  return (
    <input
      ref={inputRef}
      placeholder="Search for places..."
      className="w-full px-4 py-2 border rounded-lg"
    />
  );
}
