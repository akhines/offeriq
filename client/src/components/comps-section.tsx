import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ArrowUpDown, 
  MapPin, 
  TrendingUp, 
  Home, 
  Calendar,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { CompsData, ComparableSale } from "@/types";

interface CompsSectionProps {
  compsData: CompsData | null;
  isLoading: boolean;
  subjectSqft?: number;
  onUseSuggestedARV?: (arv: number) => void;
}

type SortField = "price" | "pricePerSqft" | "sqft" | "distanceMiles" | "soldDate";
type SortDirection = "asc" | "desc";

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

export function CompsSection({ 
  compsData, 
  isLoading, 
  subjectSqft,
  onUseSuggestedARV 
}: CompsSectionProps) {
  const [sortField, setSortField] = useState<SortField>("distanceMiles");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showAllComps, setShowAllComps] = useState(false);

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

  if (!compsData || compsData.comps.length === 0) {
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

  const sortedComps = [...compsData.comps].sort((a, b) => {
    let aVal: number | string = a[sortField];
    let bVal: number | string = b[sortField];
    
    if (sortField === "soldDate") {
      aVal = new Date(a.soldDate).getTime() || 0;
      bVal = new Date(b.soldDate).getTime() || 0;
    }
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const displayedComps = showAllComps ? sortedComps : sortedComps.slice(0, 5);

  const priceRange = {
    min: Math.min(...compsData.comps.map(c => c.price)),
    max: Math.max(...compsData.comps.map(c => c.price)),
  };

  const sqftRange = {
    min: Math.min(...compsData.comps.map(c => c.sqft)),
    max: Math.max(...compsData.comps.map(c => c.sqft)),
  };

  const avgPrice = Math.round(compsData.comps.reduce((sum, c) => sum + c.price, 0) / compsData.comps.length);

  const estimatedValueFromComps = subjectSqft && compsData.avgPricePerSqft 
    ? subjectSqft * compsData.avgPricePerSqft 
    : compsData.suggestedARV;

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Comparable Sales
            <Badge variant="secondary" data-testid="badge-comp-count">{compsData.comps.length} comps</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground mb-1">Avg $/Sqft</div>
            <div className="text-lg font-bold font-mono">${compsData.avgPricePerSqft}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground mb-1">Median Price</div>
            <div className="text-lg font-bold font-mono">{formatCurrency(compsData.medianPrice)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground mb-1">Avg Price</div>
            <div className="text-lg font-bold font-mono">{formatCurrency(avgPrice)}</div>
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
          <span>Price Range: {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}</span>
          <span>Sqft Range: {sqftRange.min.toLocaleString()} - {sqftRange.max.toLocaleString()}</span>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Address</TableHead>
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
                  <SortButton field="distanceMiles" testId="sort-distance">Distance</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="soldDate" testId="sort-sold">Sold</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedComps.map((comp, index) => {
                const daysAgo = getDaysAgo(comp.soldDate);
                return (
                  <TableRow key={index} data-testid={`row-comp-${index}`}>
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[200px]" title={comp.address}>
                        {comp.address}
                      </div>
                      {comp.propertyType && (
                        <div className="text-xs text-muted-foreground">{comp.propertyType}</div>
                      )}
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
            </TableBody>
          </Table>
        </div>

        {compsData.comps.length > 5 && (
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
                Show All {compsData.comps.length} Comps
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          <Calendar className="h-3 w-3 inline mr-1" />
          Comps from last 180 days within 1 mile radius
        </p>
      </CardContent>
    </Card>
  );
}
