/// <reference types="@types/google.maps" />
import { useState, useRef, useEffect, useCallback } from "react";
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

interface SuggestionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
  "data-testid": testId,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    const initPlaces = async () => {
      try {
        if (typeof google === "undefined" || !google.maps) return;

        if (typeof google.maps.importLibrary === "function") {
          await google.maps.importLibrary("places");
        }

        if (google.maps?.places?.AutocompleteSuggestion) {
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          setIsReady(true);
        }
      } catch (err) {
        console.warn("Google Places init failed:", err);
      }
    };

    if (typeof google !== "undefined" && google.maps) {
      initPlaces();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => initPlaces());
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => initPlaces();
    script.onerror = () => console.warn("Failed to load Google Maps script");
    document.head.appendChild(script);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!isReady || input.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }

      const request = {
        input,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ["us"],
        includedPrimaryTypes: ["street_address", "subpremise", "premise"],
        language: "en-US",
      };

      const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      const mapped: SuggestionItem[] = results
        .filter((s: any) => s.placePrediction)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          mainText: s.placePrediction.mainText?.text || "",
          secondaryText: s.placePrediction.secondaryText?.text || "",
          fullText: s.placePrediction.text?.text || "",
        }));

      setSuggestions(mapped);
      if (mapped.length > 0) setIsOpen(true);
    } catch (err) {
      console.warn("Places autocomplete error:", err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelect = async (suggestion: SuggestionItem) => {
    setInputValue(suggestion.fullText);
    setIsOpen(false);
    setSuggestions([]);

    try {
      const place = new google.maps.places.Place({ id: suggestion.placeId });
      await place.fetchFields({
        fields: ["formattedAddress", "addressComponents"],
      });

      const details: PlaceDetails = {
        formattedAddress: place.formattedAddress || suggestion.fullText,
      };

      if (place.addressComponents) {
        for (const component of place.addressComponents) {
          const types = component.types;
          if (types.includes("locality")) {
            details.city = component.longText ?? undefined;
          } else if (types.includes("administrative_area_level_1")) {
            details.state = component.shortText ?? undefined;
          } else if (types.includes("postal_code")) {
            details.zip = component.longText ?? undefined;
          } else if (types.includes("street_number")) {
            details.streetNumber = component.longText ?? undefined;
          } else if (types.includes("route")) {
            details.route = component.longText ?? undefined;
          }
        }
      }

      setInputValue(details.formattedAddress);
      onChange(details.formattedAddress, details);

      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    } catch (err) {
      console.warn("Place details error:", err);
      onChange(suggestion.fullText);
    }
  };

  if (!isReady || !import.meta.env.VITE_GOOGLE_MAPS_KEY) {
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
    <Popover open={isOpen && suggestions.length > 0} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
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
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.placeId}
                  value={suggestion.fullText}
                  onSelect={() => handleSelect(suggestion)}
                  className="cursor-pointer"
                  data-testid={`address-suggestion-${suggestion.placeId}`}
                >
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                      {suggestion.mainText}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {suggestion.secondaryText}
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
