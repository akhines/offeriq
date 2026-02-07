import { useState, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Loader2 } from "lucide-react";
import type { ComparableSale, CompsData } from "@/types";

interface CompsMapProps {
  compsData: CompsData;
  filteredComps?: ComparableSale[];
}

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "0.375rem",
};

function formatCurrency(value: number): string {
  if (!value) return "$0";
  return "$" + value.toLocaleString();
}

export function CompsMap({ compsData, filteredComps }: CompsMapProps) {
  const [selectedComp, setSelectedComp] = useState<ComparableSale | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || "",
  });

  const compsToShow = filteredComps || compsData.comps;
  const compsWithCoords = compsToShow.filter(c => c.latitude && c.longitude);

  const subjectLat = compsData.subjectProperty?.latitude;
  const subjectLng = compsData.subjectProperty?.longitude;

  const center = useMemo(() => {
    if (subjectLat && subjectLng) {
      return { lat: subjectLat, lng: subjectLng };
    }
    if (compsWithCoords.length > 0) {
      const avgLat = compsWithCoords.reduce((sum, c) => sum + (c.latitude || 0), 0) / compsWithCoords.length;
      const avgLng = compsWithCoords.reduce((sum, c) => sum + (c.longitude || 0), 0) / compsWithCoords.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 32.7767, lng: -96.797 };
  }, [subjectLat, subjectLng, compsWithCoords]);

  const onMapClick = useCallback(() => {
    setSelectedComp(null);
  }, []);

  if (compsWithCoords.length === 0 && !subjectLat) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground text-sm">
            <Map className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No location data available for map view.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground text-sm">
            Failed to load map. Please check your Google Maps API key.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading map...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Map className="h-5 w-5" />
          Comp Locations
          <Badge variant="secondary" data-testid="badge-map-comp-count">
            {compsWithCoords.length} mapped
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onClick={onMapClick}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          }}
          data-testid="comps-map"
        >
          {subjectLat && subjectLng && (
            <Marker
              position={{ lat: subjectLat, lng: subjectLng }}
              icon={{
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#2563eb" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`
                ),
                scaledSize: new google.maps.Size(36, 36),
                anchor: new google.maps.Point(18, 36),
              }}
              title="Subject Property"
              zIndex={1000}
            />
          )}

          {compsWithCoords.map((comp, index) => (
            <Marker
              key={index}
              position={{ lat: comp.latitude!, lng: comp.longitude! }}
              icon={{
                url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#16a34a" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`
                ),
                scaledSize: new google.maps.Size(28, 28),
                anchor: new google.maps.Point(14, 28),
              }}
              title={comp.address}
              onClick={() => setSelectedComp(comp)}
            />
          ))}

          {selectedComp && selectedComp.latitude && selectedComp.longitude && (
            <InfoWindow
              position={{ lat: selectedComp.latitude, lng: selectedComp.longitude }}
              onCloseClick={() => setSelectedComp(null)}
            >
              <div className="p-1 max-w-[220px] text-xs" style={{ color: '#1a1a1a' }}>
                <div className="font-semibold text-sm mb-1">{selectedComp.address}</div>
                <div className="space-y-0.5">
                  <div><strong>Price:</strong> {formatCurrency(selectedComp.price)}</div>
                  <div><strong>$/Sqft:</strong> ${selectedComp.pricePerSqft}</div>
                  <div><strong>Size:</strong> {selectedComp.sqft.toLocaleString()} sqft</div>
                  <div><strong>Bed/Bath:</strong> {selectedComp.bedrooms}/{selectedComp.bathrooms}</div>
                  <div><strong>Distance:</strong> {selectedComp.distanceMiles.toFixed(2)} mi</div>
                  {selectedComp.correlation !== undefined && (
                    <div><strong>Similarity:</strong> {Math.round(selectedComp.correlation * 100)}%</div>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#2563eb' }} />
            Subject Property
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#16a34a' }} />
            Comparable Sale
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
