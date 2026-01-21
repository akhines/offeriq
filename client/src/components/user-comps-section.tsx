import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Link,
  User,
  BarChart3,
  ArrowUpDown,
} from "lucide-react";
import type { UserComp, UserCompsState } from "@/types";

interface UserCompsSectionProps {
  userComps: UserCompsState;
  onUserCompsChange: (state: UserCompsState) => void;
  onUseUserARV?: (arv: number) => void;
  subjectSqft?: number;
  embedded?: boolean;
}

type SortField = "price" | "pricePerSqft" | "sqft" | "distanceMiles";
type SortDirection = "asc" | "desc";

function formatCurrency(value: number): string {
  if (!value) return "$0";
  return "$" + value.toLocaleString();
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function calculateUserCompsARV(comps: UserComp[], subjectSqft?: number): number {
  if (comps.length === 0) return 0;
  
  const avgPricePerSqft = comps.reduce((sum, c) => sum + c.pricePerSqft, 0) / comps.length;
  
  if (subjectSqft && subjectSqft > 0) {
    return Math.round(avgPricePerSqft * subjectSqft);
  }
  
  const medianPrice = [...comps].sort((a, b) => a.price - b.price)[Math.floor(comps.length / 2)]?.price || 0;
  return Math.round(medianPrice);
}

export function UserCompsSection({
  userComps,
  onUserCompsChange,
  onUseUserARV,
  subjectSqft,
  embedded = false,
}: UserCompsSectionProps) {
  const [urlInput, setUrlInput] = useState("");
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [sortField, setSortField] = useState<SortField>("price");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  const [newComp, setNewComp] = useState<Partial<UserComp>>({
    address: "",
    price: 0,
    sqft: 0,
    bedrooms: 3,
    bathrooms: 2,
  });

  const handleAddManualComp = () => {
    if (!newComp.address || !newComp.price || !newComp.sqft) return;
    
    const comp: UserComp = {
      id: generateId(),
      address: newComp.address,
      price: newComp.price,
      sqft: newComp.sqft,
      pricePerSqft: Math.round(newComp.price / newComp.sqft),
      bedrooms: newComp.bedrooms || 3,
      bathrooms: newComp.bathrooms || 2,
      yearBuilt: newComp.yearBuilt,
      soldDate: newComp.soldDate,
      distanceMiles: newComp.distanceMiles,
      sourceUrl: newComp.sourceUrl,
      notes: newComp.notes,
    };
    
    const newComps = [...userComps.comps, comp];
    const suggestedARV = calculateUserCompsARV(newComps, subjectSqft);
    
    onUserCompsChange({
      ...userComps,
      comps: newComps,
      suggestedARV,
    });
    
    setNewComp({
      address: "",
      price: 0,
      sqft: 0,
      bedrooms: 3,
      bathrooms: 2,
    });
    setIsAddingManual(false);
  };

  const handleRemoveComp = (id: string) => {
    const newComps = userComps.comps.filter((c) => c.id !== id);
    const suggestedARV = calculateUserCompsARV(newComps, subjectSqft);
    
    onUserCompsChange({
      ...userComps,
      comps: newComps,
      suggestedARV,
    });
  };

  const handleConfidenceChange = (value: number[]) => {
    onUserCompsChange({
      ...userComps,
      confidenceScore: value[0],
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedComps = [...userComps.comps].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    return sortDirection === "asc" 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  const avgPricePerSqft = userComps.comps.length > 0
    ? userComps.comps.reduce((sum, c) => sum + c.pricePerSqft, 0) / userComps.comps.length
    : 0;
  
  const avgPrice = userComps.comps.length > 0
    ? userComps.comps.reduce((sum, c) => sum + c.price, 0) / userComps.comps.length
    : 0;

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return "High";
    if (score >= 50) return "Medium";
    return "Low";
  };

  const content = (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              placeholder="Paste MLS or listing URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              data-testid="input-comp-url"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!urlInput}
            onClick={() => {
              setNewComp({ ...newComp, sourceUrl: urlInput });
              setUrlInput("");
              setIsAddingManual(true);
            }}
            data-testid="button-extract-url"
          >
            <Link className="h-4 w-4 mr-1" />
            Add from URL
          </Button>
          <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" data-testid="button-add-manual-comp">
                <Plus className="h-4 w-4 mr-1" />
                Add Comp
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Comparable Sale</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="comp-address">Address *</Label>
                  <Input
                    id="comp-address"
                    placeholder="123 Main St, City, ST 12345"
                    value={newComp.address || ""}
                    onChange={(e) => setNewComp({ ...newComp, address: e.target.value })}
                    data-testid="input-comp-address"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comp-price">Sale Price *</Label>
                    <Input
                      id="comp-price"
                      type="number"
                      placeholder="350000"
                      value={newComp.price || ""}
                      onChange={(e) => setNewComp({ ...newComp, price: parseInt(e.target.value) || 0 })}
                      data-testid="input-comp-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-sqft">Sq Ft *</Label>
                    <Input
                      id="comp-sqft"
                      type="number"
                      placeholder="1800"
                      value={newComp.sqft || ""}
                      onChange={(e) => setNewComp({ ...newComp, sqft: parseInt(e.target.value) || 0 })}
                      data-testid="input-comp-sqft"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comp-beds">Beds</Label>
                    <Input
                      id="comp-beds"
                      type="number"
                      value={newComp.bedrooms || ""}
                      onChange={(e) => setNewComp({ ...newComp, bedrooms: parseInt(e.target.value) || 0 })}
                      data-testid="input-comp-beds"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-baths">Baths</Label>
                    <Input
                      id="comp-baths"
                      type="number"
                      step="0.5"
                      value={newComp.bathrooms || ""}
                      onChange={(e) => setNewComp({ ...newComp, bathrooms: parseFloat(e.target.value) || 0 })}
                      data-testid="input-comp-baths"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comp-sold-date">Sold Date</Label>
                    <Input
                      id="comp-sold-date"
                      type="date"
                      value={newComp.soldDate || ""}
                      onChange={(e) => setNewComp({ ...newComp, soldDate: e.target.value })}
                      data-testid="input-comp-sold-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-distance">Distance (mi)</Label>
                    <Input
                      id="comp-distance"
                      type="number"
                      step="0.1"
                      placeholder="0.5"
                      value={newComp.distanceMiles || ""}
                      onChange={(e) => setNewComp({ ...newComp, distanceMiles: parseFloat(e.target.value) || 0 })}
                      data-testid="input-comp-distance"
                    />
                  </div>
                </div>

                {newComp.sourceUrl && (
                  <div className="text-xs text-muted-foreground">
                    Source: {newComp.sourceUrl}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingManual(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddManualComp}
                    disabled={!newComp.address || !newComp.price || !newComp.sqft}
                    className="flex-1"
                    data-testid="button-save-comp"
                  >
                    Save Comp
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Your Confidence Score
            </Label>
            <span className={`font-mono font-bold ${getConfidenceColor(userComps.confidenceScore)}`}>
              {userComps.confidenceScore}% ({getConfidenceLabel(userComps.confidenceScore)})
            </span>
          </div>
          <Slider
            value={[userComps.confidenceScore]}
            onValueChange={handleConfidenceChange}
            min={0}
            max={100}
            step={5}
            className="w-full"
            data-testid="slider-confidence-score"
          />
          <p className="text-xs text-muted-foreground">
            Higher confidence = more weight given to your comps vs. API comps when calculating ARV
          </p>
        </div>

        {userComps.comps.length > 0 && (
          <>
            <Separator />
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Avg $/SqFt</p>
                <p className="font-mono font-bold">${Math.round(avgPricePerSqft)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Avg Price</p>
                <p className="font-mono font-bold">{formatCurrency(Math.round(avgPrice))}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Your ARV</p>
                <p className="font-mono font-bold text-primary">{formatCurrency(userComps.suggestedARV)}</p>
              </div>
            </div>

            {onUseUserARV && userComps.suggestedARV > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onUseUserARV(userComps.suggestedARV)}
                data-testid="button-use-user-arv"
              >
                Use Your ARV ({formatCurrency(userComps.suggestedARV)})
              </Button>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Address</TableHead>
                    <TableHead 
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("price")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Price
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("sqft")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        SqFt
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("pricePerSqft")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        $/SqFt
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">Bed/Bath</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedComps.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium text-sm">
                        {comp.address}
                        {comp.sourceUrl && (
                          <a
                            href={comp.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-primary hover:underline"
                          >
                            <Link className="h-3 w-3 inline" />
                          </a>
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveComp(comp.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-comp-${comp.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

      {userComps.comps.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No comps added yet.</p>
          <p className="text-sm">Add your own comparable sales to refine the ARV.</p>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          Your Comps
          {userComps.comps.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {userComps.comps.length} comp{userComps.comps.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </h4>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Your Comps
          {userComps.comps.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {userComps.comps.length} comp{userComps.comps.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
