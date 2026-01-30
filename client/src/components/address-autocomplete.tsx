/// <reference types="@types/google.maps" />
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, placeDetails?: PlaceDetails) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export interface PlaceDetails {
  formattedAddress: string;
  city?: string;
  state?: string;
  zip?: string;
  streetNumber?: string;
  route?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

type AutocompleteService = google.maps.places.AutocompleteService;
type PlacesService = google.maps.places.PlacesService;
type AutocompletePrediction = google.maps.places.AutocompletePrediction;
type PlacesServiceStatus = google.maps.places.PlacesServiceStatus;
type PlaceResult = google.maps.places.PlaceResult;
type GeocoderAddressComponent = google.maps.GeocoderAddressComponent;

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
  "data-testid": testId,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const autocompleteServiceRef = useRef<AutocompleteService | null>(null);
  const placesServiceRef = useRef<PlacesService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      return;
    }

    const initializeServices = () => {
      if (typeof google !== "undefined" && google.maps?.places) {
        setIsScriptLoaded(true);
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement("div");
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
      }
    };

    if (typeof google !== "undefined" && google.maps?.places) {
      initializeServices();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener("load", initializeServices);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeServices;
    document.head.appendChild(script);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const fetchPredictions = (input: string) => {
    if (!autocompleteServiceRef.current || input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "us" },
        types: ["address"],
      },
      (results: AutocompletePrediction[] | null, status: PlacesServiceStatus) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results as unknown as Prediction[]);
          setIsOpen(true);
        } else {
          setPredictions([]);
        }
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  const getPlaceDetails = (placeId: string, description: string) => {
    if (!placesServiceRef.current) {
      onChange(description);
      setIsOpen(false);
      return;
    }

    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ["address_components", "formatted_address"],
      },
      (place: PlaceResult | null, status: PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const details: PlaceDetails = {
            formattedAddress: place.formatted_address || description,
          };

          place.address_components?.forEach((component: GeocoderAddressComponent) => {
            const types = component.types;
            if (types.includes("locality")) {
              details.city = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              details.state = component.short_name;
            } else if (types.includes("postal_code")) {
              details.zip = component.long_name;
            } else if (types.includes("street_number")) {
              details.streetNumber = component.long_name;
            } else if (types.includes("route")) {
              details.route = component.long_name;
            }
          });

          setInputValue(details.formattedAddress);
          onChange(details.formattedAddress, details);
        } else {
          onChange(description);
        }
        setIsOpen(false);
        setPredictions([]);
      }
    );
  };

  const handleSelect = (prediction: Prediction) => {
    setInputValue(prediction.description);
    getPlaceDetails(prediction.place_id, prediction.description);
  };

  if (!isScriptLoaded || !import.meta.env.VITE_GOOGLE_PLACES_API_KEY) {
    return (
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className={className}
        data-testid={testId}
      />
    );
  }

  return (
    <Popover open={isOpen && predictions.length > 0} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (predictions.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            className={cn("pr-8", className)}
            data-testid={testId}
          />
          {isLoading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            <CommandEmpty>No addresses found</CommandEmpty>
            <CommandGroup>
              {predictions.map((prediction) => (
                <CommandItem
                  key={prediction.place_id}
                  value={prediction.description}
                  onSelect={() => handleSelect(prediction)}
                  className="cursor-pointer"
                  data-testid={`address-suggestion-${prediction.place_id}`}
                >
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                      {prediction.structured_formatting.main_text}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {prediction.structured_formatting.secondary_text}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
