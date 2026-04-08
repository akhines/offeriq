import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  MapPin,
  TrendingUp,
  Home,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  Map,
  List,
  X,
  Image as ImageIcon,
  Ruler,
  DollarSign,
  Navigation,
} from "lucide-react";
import { CompsMap } from "@/components/comps-map";
import type { CompsData, ComparableSale } from "@/types";

const COMPACT_BREAKPOINT = 480;

function useIsCompact() {
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);
    const onChange = () => setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isCompact;
}

interface CompsSectionProps {
  compsData: CompsData | null;
  isLoading: boolean;
  subjectSqft?: number;
  onUseSuggestedARV?: (arv: number) => void;
  onRefreshComps?: () => void;
  selectedCompIndices?: Set<number>;
  onCompSelectionChange?: (indices: Set<number>) => void;
}

type SortField = "price" | "pricePerSqft" | "sqft" | "distanceMiles" | "soldDate" | "correlation";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "map";

function formatCurrency(value: number): string {
  if (!value) return "$0";
  return "$" + value.toLocaleString();
}

function formatDate(dateString: string): string {
  if (!dateString || dateString === "Unknown") return "Unknown";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateString;
  }
}

function getDaysAgo(dateString: string): number | null {
  if (!dateString || dateString === "Unknown") return null;
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function getStreetViewUrl(address: string): string {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";
  if (!apiKey) return "";
  return `https://maps.googleapis.com/maps/api/streetview?size=120x80&location=${encodeURIComponent(address)}&key=${apiKey}`;
}

const PROPERTY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "single family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi family", label: "Multi Family" },
];

export function CompsSection({
  compsData,
  isLoading,
  subjectSqft,
  onUseSuggestedARV,
  onRefreshComps,
  selectedCompIndices,
  onCompSelectionChange,
}: CompsSectionProps) {
  const isCompact = useIsCompact();
  const [sortField, setSortField] = useState<SortField>("distanceMiles");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showAllComps, setShowAllComps] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showFilters, setShowFilters] = useState(false);

  const [maxDistance, setMaxDistance] = useState(5);
  const [dateRangeMonths, setDateRangeMonths] = useState(24);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");

  const comps = compsData?.comps ?? [];

  const filteredComps = useMemo(() => {
    if (comps.length === 0) return [];
    let result = [...comps];

    if (maxDistance < 5) {
      result = result.filter(c => c.distanceMiles <= maxDistance);
    }

    if (dateRangeMonths < 24) {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - dateRangeMonths);
      result = result.filter(c => {
        if (!c.soldDate || c.soldDate === "Unknown") return true;
        try {
          return new Date(c.soldDate) >= cutoffDate;
        } catch {
          return true;
        }
      });
    }

    if (propertyTypeFilter !== "all") {
      result = result.filter(c => {
        if (!c.propertyType) return false;
        const compType = c.propertyType.toLowerCase().replace(/_/g, " ");
        return compType.includes(propertyTypeFilter);
      });
    }

    return result;
  }, [comps, maxDistance, dateRangeMonths, propertyTypeFilter]);

  const sortedComps = useMemo(() => {
    if (filteredComps.length === 0) return [];
    return [...filteredComps].sort((a, b) => {
      let aVal: number | string = (a as any)[sortField] ?? 0;
      let bVal: number | string = (b as any)[sortField] ?? 0;

      if (sortField === "soldDate") {
        aVal = new Date(a.soldDate).getTime() || 0;
        bVal = new Date(b.soldDate).getTime() || 0;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredComps, sortField, sortDirection]);

  const displayedComps = showAllComps ? sortedComps : sortedComps.slice(0, 5);

  const filteredStats = useMemo(() => {
    if (filteredComps.length === 0) {
      return {
        avgPricePerSqft: 0,
        medianPrice: 0,
        avgPrice: 0,
        priceRange: { min: 0, max: 0 },
        sqftRange: { min: 0, max: 0 },
      };
    }
    const prices = filteredComps.map(c => c.price);
    const pricesPerSqft = filteredComps.map(c => c.pricePerSqft);
    return {
      avgPricePerSqft: pricesPerSqft.length > 0
        ? Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length)
        : 0,
      medianPrice: prices.length > 0
        ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]
        : 0,
      avgPrice: prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
      sqftRange: {
        min: filteredComps.length > 0 ? Math.min(...filteredComps.map(c => c.sqft)) : 0,
        max: filteredComps.length > 0 ? Math.max(...filteredComps.map(c => c.sqft)) : 0,
      },
    };
  }, [filteredComps]);

  const hasActiveFilters = maxDistance < 5 || dateRangeMonths < 24 || propertyTypeFilter !== "all";
  const hasMapData = comps.some(c => c.latitude && c.longitude) ||
    (compsData?.subjectProperty?.latitude && compsData?.subjectProperty?.longitude);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Comparable Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading comparable sales...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!compsData || comps.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Comparable Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comparable sales found.</p>
            <p className="text-sm">Fetch property data to load comps.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "distanceMiles" ? "asc" : "desc");
    }
  };

  const SortButton = ({ field, children, testId }: { field: SortField; children: React.ReactNode; testId: string }) => (
    <span
      className="inline-flex items-center cursor-pointer font-medium text-muted-foreground hover-elevate rounded px-1"
      onClick={() => handleSort(field)}
      data-testid={testId}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </span>
  );

  const streetViewAvailable = !!import.meta.env.VITE_GOOGLE_MAPS_KEY;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              Comparable Sales
              <Badge variant="secondary" data-testid="badge-comp-count">
                {filteredComps.length}{filteredComps.length !== compsData.comps.length ? ` / ${compsData.comps.length}` : ""} comps
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              {onRefreshComps && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshComps}
                  disabled={isLoading}
                  data-testid="button-refresh-comps"
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Pull Comps
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={`toggle-elevate ${showFilters ? "toggle-elevated" : ""}`}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
              {hasMapData && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("table")}
                    className={`toggle-elevate ${viewMode === "table" ? "toggle-elevated" : ""}`}
                    data-testid="button-view-table"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("map")}
                    className={`toggle-elevate ${viewMode === "map" ? "toggle-elevated" : ""}`}
                    data-testid="button-view-map"
                  >
                    <Map className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFilters && (
            <div className="p-4 rounded-lg bg-muted space-y-4" data-testid="filters-panel">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Filters</span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMaxDistance(5);
                      setDateRangeMonths(24);
                      setPropertyTypeFilter("all");
                    }}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Max Distance: {maxDistance} mi</Label>
                  <Slider
                    value={[maxDistance]}
                    onValueChange={([v]) => setMaxDistance(v)}
                    min={0.25}
                    max={5}
                    step={0.25}
                    data-testid="slider-distance"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Sold Within: {dateRangeMonths} months</Label>
                  <Slider
                    value={[dateRangeMonths]}
                    onValueChange={([v]) => setDateRangeMonths(v)}
                    min={1}
                    max={24}
                    step={1}
                    data-testid="slider-date-range"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Property Type</Label>
                  <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(pt => (
                        <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Avg $/Sqft</div>
              <div className="text-lg font-bold font-mono">${filteredStats.avgPricePerSqft}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Median Price</div>
              <div className="text-lg font-bold font-mono">{formatCurrency(filteredStats.medianPrice)}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Avg Price</div>
              <div className="text-lg font-bold font-mono">{formatCurrency(filteredStats.avgPrice)}</div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Suggested ARV
              </div>
              <div className="text-lg font-bold font-mono text-primary">{formatCurrency(compsData.suggestedARV)}</div>
            </div>
          </div>

          {onUseSuggestedARV && compsData.suggestedARV > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUseSuggestedARV(compsData.suggestedARV)}
              className="w-full"
              data-testid="button-use-suggested-arv"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Use Suggested ARV ({formatCurrency(compsData.suggestedARV)})
            </Button>
          )}

          <Separator />

          <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
            <span>Price Range: {formatCurrency(filteredStats.priceRange.min)} - {formatCurrency(filteredStats.priceRange.max)}</span>
            <span>Sqft Range: {filteredStats.sqftRange.min.toLocaleString()} - {filteredStats.sqftRange.max.toLocaleString()}</span>
          </div>

          {onCompSelectionChange && selectedCompIndices && (
            (() => {
              const selected = sortedComps.filter((_, i) => selectedCompIndices.has(i));
              if (selected.length === 0) return <div className="text-xs text-amber-600 font-medium">No comps selected — check at least one to calculate ARV</div>;
              const selPsf = selected.filter(c => c.pricePerSqft > 0).map(c => c.pricePerSqft).sort((a, b) => a - b);
              const medianPsf = selPsf.length > 0 ? selPsf[Math.floor(selPsf.length / 2)] : 0;
              const selPrices = selected.map(c => c.price).sort((a, b) => a - b);
              const medianPrice = selPrices[Math.floor(selPrices.length / 2)] || 0;
              const arvEst = subjectSqft && medianPsf > 0 ? medianPsf * subjectSqft : medianPrice;
              return (
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm space-y-1">
                  <div className="font-medium text-accent flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Selected Comps: {selected.length} of {sortedComps.length}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span>Median $/sqft: <strong>${medianPsf}</strong></span>
                    <span>Median Price: <strong>{formatCurrency(medianPrice)}</strong></span>
                    {subjectSqft && medianPsf > 0 && (
                      <span>Estimated ARV: <strong>{formatCurrency(arvEst)}</strong>
                        {onUseSuggestedARV && (
                          <button className="ml-1 text-accent underline" onClick={() => onUseSuggestedARV(arvEst)}>Use this</button>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {viewMode === "map" && hasMapData ? (
            <CompsMap compsData={compsData} filteredComps={filteredComps} />
          ) : isCompact ? (
            <>
              {displayedComps.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No comps match current filters. Try widening your criteria.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Sort by:</span>
                    <Select value={sortField} onValueChange={(v) => { setSortField(v as SortField); }}>
                      <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]" data-testid="select-mobile-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="pricePerSqft">$/Sqft</SelectItem>
                        <SelectItem value="sqft">Sqft</SelectItem>
                        <SelectItem value="distanceMiles">Distance</SelectItem>
                        <SelectItem value="soldDate">Sold Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                      data-testid="button-mobile-sort-direction"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                  {displayedComps.map((comp, index) => {
                    const globalIndex = sortedComps.indexOf(comp);
                    const isSelected = selectedCompIndices?.has(globalIndex) ?? true;
                    const daysAgo = getDaysAgo(comp.soldDate);
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-md border space-y-2 ${isSelected ? 'bg-muted/30' : 'bg-muted/10 opacity-50'}`}
                        data-testid={`card-comp-${index}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 flex items-start gap-2">
                            {onCompSelectionChange && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const next = new Set(selectedCompIndices || new Set(sortedComps.map((_, i) => i)));
                                  if (next.has(globalIndex)) next.delete(globalIndex);
                                  else next.add(globalIndex);
                                  onCompSelectionChange(next);
                                }}
                                className="mt-1 h-4 w-4 rounded border-gray-300 flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate" title={comp.address} data-testid={`text-comp-address-${index}`}>
                              <MapPin className="h-3 w-3 inline mr-1 flex-shrink-0" />
                              {comp.address}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {comp.propertyType && (
                                <span className="text-xs text-muted-foreground">{comp.propertyType}</span>
                              )}
                              {comp.correlation !== undefined && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {Math.round(comp.correlation * 100)}% match
                                </Badge>
                              )}
                            </div>
                          </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold font-mono text-sm" data-testid={`text-comp-price-${index}`}>
                              {formatCurrency(comp.price)}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Ruler className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono" data-testid={`text-comp-sqft-${index}`}>{comp.sqft.toLocaleString()} sqft</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono" data-testid={`text-comp-ppsqft-${index}`}>${comp.pricePerSqft}/sqft</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Navigation className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span data-testid={`text-comp-distance-${index}`}>{comp.distanceMiles.toFixed(2)} mi</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{comp.bedrooms} bed / {comp.bathrooms} bath</span>
                          <span data-testid={`text-comp-sold-${index}`}>
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {formatDate(comp.soldDate)}
                            {daysAgo !== null && <span className="ml-1">({daysAgo}d ago)</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {sortedComps.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllComps(!showAllComps)}
                  className="w-full"
                  data-testid="button-toggle-all-comps"
                >
                  {showAllComps ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show All {sortedComps.length} Comps
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {onCompSelectionChange && <TableHead className="w-[40px]">Use</TableHead>}
                      {streetViewAvailable && <TableHead className="w-[70px]">Photo</TableHead>}
                      <TableHead className="w-[180px]">Address</TableHead>
                      <TableHead className="text-right">
                        <SortButton field="price" testId="sort-price">Price</SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="sqft" testId="sort-sqft">Sqft</SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="pricePerSqft" testId="sort-price-sqft">$/Sqft</SortButton>
                      </TableHead>
                      <TableHead className="text-center">Bed/Bath</TableHead>
                      <TableHead className="text-right">
                        <SortButton field="distanceMiles" testId="sort-distance">Dist</SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="soldDate" testId="sort-sold">Sold</SortButton>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedComps.map((comp, index) => {
                      const globalIndex = sortedComps.indexOf(comp);
                      const isSelected = selectedCompIndices?.has(globalIndex) ?? true;
                      const daysAgo = getDaysAgo(comp.soldDate);
                      const streetViewSrc = streetViewAvailable ? getStreetViewUrl(comp.address) : "";
                      return (
                        <TableRow key={index} data-testid={`row-comp-${index}`} className={isSelected ? '' : 'opacity-40'}>
                          {onCompSelectionChange && (
                            <TableCell className="p-1 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const next = new Set(selectedCompIndices || new Set(sortedComps.map((_, i) => i)));
                                  if (next.has(globalIndex)) next.delete(globalIndex);
                                  else next.add(globalIndex);
                                  onCompSelectionChange(next);
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableCell>
                          )}
                          {streetViewAvailable && (
                            <TableCell className="p-1">
                              <div className="w-[60px] h-[40px] rounded overflow-hidden bg-muted flex items-center justify-center">
                                <img
                                  src={comp.photoUrl || streetViewSrc}
                                  alt={`${comp.photoUrl ? "Listing photo" : "Street view"} of ${comp.address}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    if (comp.photoUrl && streetViewSrc && img.src !== streetViewSrc) {
                                      img.src = streetViewSrc;
                                    } else {
                                      img.style.display = "none";
                                      img.nextElementSibling?.classList.remove("hidden");
                                    }
                                  }}
                                  data-testid={`img-comp-photo-${index}`}
                                />
                                <ImageIcon className="h-4 w-4 text-muted-foreground hidden" />
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="font-medium">
                            <div className="truncate max-w-[180px]" title={comp.address}>
                              {comp.address}
                            </div>
                            <div className="flex items-center gap-1">
                              {comp.propertyType && (
                                <span className="text-xs text-muted-foreground">{comp.propertyType}</span>
                              )}
                              {comp.correlation !== undefined && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {Math.round(comp.correlation * 100)}% match
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(comp.price)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {comp.sqft.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${comp.pricePerSqft}
                          </TableCell>
                          <TableCell className="text-center">
                            {comp.bedrooms}/{comp.bathrooms}
                          </TableCell>
                          <TableCell className="text-right">
                            {comp.distanceMiles.toFixed(2)} mi
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs">{formatDate(comp.soldDate)}</span>
                              {daysAgo !== null && (
                                <span className="text-xs text-muted-foreground">{daysAgo}d ago</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {displayedComps.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={streetViewAvailable ? 8 : 7} className="text-center py-6 text-muted-foreground">
                          No comps match current filters. Try widening your criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {sortedComps.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllComps(!showAllComps)}
                  className="w-full"
                  data-testid="button-toggle-all-comps"
                >
                  {showAllComps ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show All {sortedComps.length} Comps
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground text-center">
            <Calendar className="h-3 w-3 inline mr-1" />
            {hasActiveFilters
              ? `Filtered: ${filteredComps.length} of ${compsData.comps.length} comps shown`
              : `${compsData.comps.length} comps loaded`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
