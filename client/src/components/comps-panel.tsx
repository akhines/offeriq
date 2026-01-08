import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Home, DollarSign, Calendar, Ruler, Search, AlertCircle, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CompsData, ComparableSale } from "@shared/schema";
import { formatCurrency } from "@/lib/underwriting";

interface CompsPanelProps {
  address: string;
  onSuggestedARV?: (arv: number) => void;
}

export function CompsPanel({ address, onSuggestedARV }: CompsPanelProps) {
  const [compsData, setCompsData] = useState<CompsData | null>(null);
  const [error, setError] = useState<string>();
  const [needsApiKey, setNeedsApiKey] = useState(false);

  const fetchComps = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/comps", { address });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data as CompsData;
    },
    onSuccess: (data) => {
      setCompsData(data);
      setError(undefined);
      setNeedsApiKey(false);
      if (data.suggestedARV && onSuggestedARV) {
        onSuggestedARV(data.suggestedARV);
      }
    },
    onError: (err: any) => {
      if (err.message?.includes("not configured") || err.needsApiKey) {
        setNeedsApiKey(true);
      }
      setError(err instanceof Error ? err.message : "Failed to fetch comparable sales");
    },
  });

  const canFetch = address && address.length >= 10;

  return (
    <Card data-testid="card-comps-panel">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <MapPin className="h-5 w-5" />
            Comparable Sales
          </div>
          <Button
            size="sm"
            onClick={() => fetchComps.mutate()}
            disabled={!canFetch || fetchComps.isPending}
            data-testid="button-fetch-comps"
          >
            {fetchComps.isPending ? (
              <>Searching...</>
            ) : (
              <>
                <Search className="h-4 w-4 mr-1" />
                Pull Comps
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canFetch && !compsData && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Enter a property address to search for comparable sales</p>
          </div>
        )}

        {fetchComps.isPending && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Unable to fetch comps</p>
              <p className="text-sm opacity-80">{error}</p>
              {needsApiKey && (
                <p className="text-sm mt-2">
                  To enable comparable sales, add a RentCast API key in the secrets panel.
                </p>
              )}
            </div>
          </div>
        )}

        {compsData && !fetchComps.isPending && (
          <>
            {compsData.subjectProperty && (
              <div className="bg-muted/50 rounded-md p-4 space-y-2">
                <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                  Subject Property
                </h4>
                <p className="font-medium" data-testid="text-subject-address">
                  {compsData.subjectProperty.address}
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {compsData.subjectProperty.bedrooms !== undefined && (
                    <span>{compsData.subjectProperty.bedrooms} bed</span>
                  )}
                  {compsData.subjectProperty.bathrooms !== undefined && (
                    <span>{compsData.subjectProperty.bathrooms} bath</span>
                  )}
                  {compsData.subjectProperty.sqft !== undefined && (
                    <span>{compsData.subjectProperty.sqft.toLocaleString()} sqft</span>
                  )}
                  {compsData.subjectProperty.yearBuilt !== undefined && (
                    <span>Built {compsData.subjectProperty.yearBuilt}</span>
                  )}
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg $/sqft</p>
                <p className="text-xl font-bold font-mono" data-testid="text-avg-ppsf">
                  ${compsData.avgPricePerSqft}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Median Price</p>
                <p className="text-xl font-bold font-mono" data-testid="text-median-price">
                  {formatCurrency(compsData.medianPrice)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Suggested ARV</p>
                <p className="text-xl font-bold font-mono text-chart-3" data-testid="text-suggested-arv">
                  {formatCurrency(compsData.suggestedARV)}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
                {compsData.comps.length} Comparable Sales
              </h4>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {compsData.comps.map((comp, idx) => (
                    <CompCard key={idx} comp={comp} index={idx} />
                  ))}
                  {compsData.comps.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No comparable sales found within the search criteria
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CompCard({ comp, index }: { comp: ComparableSale; index: number }) {
  const formatDate = (dateStr: string) => {
    if (dateStr === "Unknown") return dateStr;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="bg-muted/30 rounded-md p-3 space-y-2"
      data-testid={`card-comp-${index}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" data-testid={`text-comp-address-${index}`}>
            {comp.address}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Badge variant="secondary" className="text-xs">
              {comp.distanceMiles.toFixed(1)} mi
            </Badge>
            {comp.propertyType && (
              <Badge variant="outline" className="text-xs">
                {comp.propertyType}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold font-mono text-chart-3" data-testid={`text-comp-price-${index}`}>
            {formatCurrency(comp.price)}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            ${comp.pricePerSqft}/sqft
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Home className="h-3 w-3" />
          {comp.bedrooms}bd / {comp.bathrooms}ba
        </span>
        <span className="flex items-center gap-1">
          <Ruler className="h-3 w-3" />
          {comp.sqft.toLocaleString()} sqft
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(comp.soldDate)}
        </span>
        {comp.yearBuilt > 0 && (
          <span>Built {comp.yearBuilt}</span>
        )}
      </div>
    </div>
  );
}
