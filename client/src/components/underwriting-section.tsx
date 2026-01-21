import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, TrendingUp, AlertCircle, CheckCircle2, HelpCircle, Search, Loader2, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { CompsSection } from "@/components/comps-section";
import { UserCompsSection } from "@/components/user-comps-section";
import type { PropertyInfo, SellerInfo, PublicInfo, AVMBaselines, UnderwritingOutput, CompsData, UserCompsState } from "@/types";

interface UnderwritingSectionProps {
  property: PropertyInfo;
  seller: SellerInfo;
  publicInfo: PublicInfo;
  avmBaselines: AVMBaselines;
  underwritingOutput: UnderwritingOutput | null;
  onPropertyChange: (property: PropertyInfo) => void;
  onSellerChange: (seller: SellerInfo) => void;
  onPublicInfoChange: (publicInfo: PublicInfo) => void;
  onAVMChange: (avmBaselines: AVMBaselines) => void;
  manualAsIsEstimate: number;
  onManualEstimateChange: (value: number) => void;
  manualARV: number;
  onManualARVChange: (value: number) => void;
  manualRepairs: number;
  onManualRepairsChange: (value: number) => void;
  userComps: UserCompsState;
  onUserCompsChange: (userComps: UserCompsState) => void;
}

function formatCurrency(value: number | undefined): string {
  if (!value) return "$0";
  return "$" + value.toLocaleString();
}

export function UnderwritingSection({
  property,
  seller,
  publicInfo,
  avmBaselines,
  underwritingOutput,
  onPropertyChange,
  onSellerChange,
  onPublicInfoChange,
  onAVMChange,
  manualAsIsEstimate,
  onManualEstimateChange,
  manualARV,
  onManualARVChange,
  manualRepairs,
  onManualRepairsChange,
  userComps,
  onUserCompsChange,
}: UnderwritingSectionProps) {
  const [isLoadingValuation, setIsLoadingValuation] = useState(false);
  const [isLoadingComps, setIsLoadingComps] = useState(false);
  const [compsData, setCompsData] = useState<CompsData | null>(null);
  const [zillowLink, setZillowLink] = useState<string | null>(null);
  const [redfinLink, setRedfinLink] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchComps = async (address: string, propertyType?: string) => {
    setIsLoadingComps(true);
    setCompsData(null);
    try {
      const response = await fetch("/api/comps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, propertyType }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Comps fetch failed:", data.error);
        if (response.status === 404) {
          toast({
            title: "No Comparable Sales Found",
            description: "Could not find recent sales near this property.",
          });
        }
        return;
      }

      const data: CompsData = await response.json();
      setCompsData(data);
      
      if (data.comps.length > 0) {
        toast({
          title: "Comparable Sales Loaded",
          description: `Found ${data.comps.length} comparable properties.`,
        });
      }
    } catch (error) {
      console.error("Failed to fetch comps:", error);
      toast({
        title: "Error",
        description: "Failed to load comparable sales. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingComps(false);
    }
  };

  const handleUseSuggestedARV = (arv: number) => {
    onManualARVChange(arv);
    toast({
      title: "ARV Updated",
      description: `Set ARV to ${formatCurrency(arv)} based on comparable sales analysis.`,
    });
  };

  const fetchPropertyValuation = async () => {
    if (!property.address?.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter a property address first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingValuation(true);
    try {
      const response = await fetch("/api/property/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: property.address }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsApiKey) {
          toast({
            title: "API Key Required",
            description: "Please add a RentCast API key to enable property data lookup.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Lookup Failed",
            description: data.error || "Could not fetch property data.",
            variant: "destructive",
          });
        }
        return;
      }

      onPropertyChange({
        ...property,
        sqft: data.sqft || property.sqft,
        beds: data.bedrooms || property.beds,
        baths: data.bathrooms || property.baths,
        yearBuilt: data.yearBuilt || property.yearBuilt,
        propertyType: mapPropertyType(data.propertyType) || property.propertyType,
      });

      if (data.estimatedValue) {
        const rentcastAVMs = [];
        if (data.estimatedValue) {
          rentcastAVMs.push({ name: "RentCast Estimate", value: data.estimatedValue });
        }
        if (data.priceRangeLow) {
          rentcastAVMs.push({ name: "RentCast Low", value: data.priceRangeLow });
        }
        if (data.priceRangeHigh) {
          rentcastAVMs.push({ name: "RentCast High", value: data.priceRangeHigh });
        }
        
        onAVMChange({
          ...avmBaselines,
          otherAVMs: rentcastAVMs.length > 0 ? rentcastAVMs : avmBaselines.otherAVMs,
        });
      }

      // Use Zillow and Redfin links from API response
      if (data.zillowLink) {
        setZillowLink(data.zillowLink);
      }
      if (data.redfinLink) {
        setRedfinLink(data.redfinLink);
      }

      fetchComps(property.address, mapPropertyType(data.propertyType));

      toast({
        title: "Property Data Loaded",
        description: `Found data for ${data.address || property.address}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch property data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingValuation(false);
    }
  };

  const mapPropertyType = (apiType: string | undefined): PropertyInfo["propertyType"] | undefined => {
    if (!apiType) return undefined;
    const lower = apiType.toLowerCase();
    if (lower.includes("single")) return "single_family";
    if (lower.includes("multi")) return "multi_family";
    if (lower.includes("condo")) return "condo";
    if (lower.includes("town")) return "townhouse";
    if (lower.includes("land")) return "land";
    if (lower.includes("commercial")) return "commercial";
    return "other";
  };

  const confidenceColor = underwritingOutput
    ? underwritingOutput.confidenceScore >= 80
      ? "text-green-600 dark:text-green-400"
      : underwritingOutput.confidenceScore >= 60
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400"
    : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Property Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Property Address *</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  data-testid="input-property-address"
                  value={property.address || ""}
                  onChange={(e) => onPropertyChange({ ...property, address: e.target.value })}
                  placeholder="10 Victor Pkwy, Annapolis, MD 21043"
                  className="flex-1"
                />
                <Button
                  type="button"
                  data-testid="button-fetch-property"
                  onClick={fetchPropertyValuation}
                  disabled={isLoadingValuation || !property.address?.trim()}
                  size="default"
                >
                  {isLoadingValuation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">{isLoadingValuation ? "Loading..." : "Fetch Data"}</span>
                </Button>
              </div>
              {zillowLink && (
                <a
                  href={zillowLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  data-testid="link-zillow"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on Zillow
                </a>
              )}
            </div>

            <div>
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                value={property.propertyType || ""}
                onValueChange={(value) => onPropertyChange({ ...property, propertyType: value as PropertyInfo["propertyType"] })}
              >
                <SelectTrigger data-testid="select-property-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_family">Single Family</SelectItem>
                  <SelectItem value="multi_family">Multi-Family</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label htmlFor="beds">Beds</Label>
                <Input
                  id="beds"
                  type="number"
                  data-testid="input-beds"
                  value={property.beds || ""}
                  onChange={(e) => onPropertyChange({ ...property, beds: Number(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="baths">Baths</Label>
                <Input
                  id="baths"
                  type="number"
                  step="0.5"
                  data-testid="input-baths"
                  value={property.baths || ""}
                  onChange={(e) => onPropertyChange({ ...property, baths: Number(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="sqft">Sqft</Label>
                <Input
                  id="sqft"
                  type="number"
                  data-testid="input-sqft"
                  value={property.sqft || ""}
                  onChange={(e) => onPropertyChange({ ...property, sqft: Number(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="yearBuilt">Year</Label>
                <Input
                  id="yearBuilt"
                  type="number"
                  data-testid="input-year-built"
                  value={property.yearBuilt || ""}
                  onChange={(e) => onPropertyChange({ ...property, yearBuilt: Number(e.target.value) || undefined })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="occupancy">Occupancy Status</Label>
              <Select
                value={property.occupancy || "unknown"}
                onValueChange={(value) => onPropertyChange({ ...property, occupancy: value as PropertyInfo["occupancy"] })}
              >
                <SelectTrigger data-testid="select-occupancy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="owner">Owner Occupied</SelectItem>
                  <SelectItem value="tenant">Tenant Occupied</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Condition Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Condition Score: {property.conditionScore ?? 5}/10</Label>
                <Badge variant={
                  (property.conditionScore ?? 5) >= 7 ? "default" :
                  (property.conditionScore ?? 5) >= 4 ? "secondary" : "destructive"
                }>
                  {(property.conditionScore ?? 5) >= 7 ? "Good" :
                   (property.conditionScore ?? 5) >= 4 ? "Fair" : "Poor"}
                </Badge>
              </div>
              <Slider
                data-testid="slider-condition"
                value={[property.conditionScore ?? 5]}
                min={0}
                max={10}
                step={1}
                onValueChange={([value]) => onPropertyChange({ ...property, conditionScore: value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                0-2: Major rehab | 3-4: Heavy repairs | 5-6: Moderate | 7-8: Light | 9-10: Move-in ready
              </p>
            </div>

            <div>
              <Label htmlFor="improvements">Improvements Needed</Label>
              <Textarea
                id="improvements"
                data-testid="input-improvements"
                value={property.improvementsNeeded || ""}
                onChange={(e) => onPropertyChange({ ...property, improvementsNeeded: e.target.value })}
                placeholder="Kitchen update, flooring, paint..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="issues">Known Issues (affects repair estimate)</Label>
              <Textarea
                id="issues"
                data-testid="input-issues"
                value={property.knownIssues || ""}
                onChange={(e) => onPropertyChange({ ...property, knownIssues: e.target.value })}
                placeholder="HVAC needs replacement, roof leak, foundation crack..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Keywords: HVAC, roof, plumbing, electrical, foundation, waterproofing
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hvac">Has Central HVAC</Label>
              <Switch
                id="hvac"
                data-testid="switch-hvac"
                checked={property.hvacCentral ?? false}
                onCheckedChange={(checked) => onPropertyChange({ ...property, hvacCentral: checked })}
              />
            </div>

            {property.hvacCentral && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hvacAge">HVAC Age (years)</Label>
                  <Input
                    id="hvacAge"
                    type="number"
                    data-testid="input-hvac-age"
                    value={property.hvacAgeYears || ""}
                    onChange={(e) => onPropertyChange({ ...property, hvacAgeYears: Number(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="roofAge">Roof Age (years)</Label>
                  <Input
                    id="roofAge"
                    type="number"
                    data-testid="input-roof-age"
                    value={property.roofAgeYears || ""}
                    onChange={(e) => onPropertyChange({ ...property, roofAgeYears: Number(e.target.value) || undefined })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">AVM Baselines</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">AVMs are automated estimates. Verify with comps before making offers.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zillow">Zillow Zestimate</Label>
                <Input
                  id="zillow"
                  type="number"
                  data-testid="input-zillow"
                  value={avmBaselines.zillowZestimate || ""}
                  onChange={(e) => onAVMChange({ ...avmBaselines, zillowZestimate: Number(e.target.value) || undefined })}
                  placeholder="Enter value"
                />
              </div>
              <div>
                <Label htmlFor="redfin">Redfin Estimate</Label>
                <Input
                  id="redfin"
                  type="number"
                  data-testid="input-redfin"
                  value={avmBaselines.redfinEstimate || ""}
                  onChange={(e) => onAVMChange({ ...avmBaselines, redfinEstimate: Number(e.target.value) || undefined })}
                  placeholder="Enter value"
                />
              </div>
            </div>

            {avmBaselines.otherAVMs && avmBaselines.otherAVMs.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">RentCast Estimates (from API)</Label>
                  <div className="mt-2 space-y-2">
                    {avmBaselines.otherAVMs.map((avm, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded-md bg-muted">
                        <span className="text-sm">{avm.name}</span>
                        <span className="font-mono font-semibold">${avm.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <Label htmlFor="manualEstimate">Manual As-Is Estimate (if no AVMs)</Label>
              <Input
                id="manualEstimate"
                type="number"
                data-testid="input-manual-estimate"
                value={manualAsIsEstimate || ""}
                onChange={(e) => onManualEstimateChange(Number(e.target.value) || 0)}
                placeholder="Your estimated as-is value"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              AVMs are estimates only. Always verify with comparable sales analysis.
            </p>

            {(zillowLink || redfinLink) && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Property Links</Label>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {zillowLink && (
                      <a
                        href={zillowLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                        data-testid="link-zillow-avm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Zillow
                      </a>
                    )}
                    {redfinLink && (
                      <a
                        href={redfinLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                        data-testid="link-redfin-avm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Redfin
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Manual Overrides</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Override calculated values with your own estimates based on comps analysis or contractor quotes.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manualARV">ARV (After Repair Value)</Label>
                <Input
                  id="manualARV"
                  type="number"
                  data-testid="input-manual-arv"
                  value={manualARV || ""}
                  onChange={(e) => onManualARVChange(Number(e.target.value) || 0)}
                  placeholder="Your ARV estimate"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  What the property will be worth after repairs
                </p>
              </div>
              <div>
                <Label htmlFor="manualRepairs">Repairs Estimate</Label>
                <Input
                  id="manualRepairs"
                  type="number"
                  data-testid="input-manual-repairs"
                  value={manualRepairs || ""}
                  onChange={(e) => onManualRepairsChange(Number(e.target.value) || 0)}
                  placeholder="Total repair cost"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  From contractor quotes or your estimate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Seller Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="timeline">Timeline to Sell</Label>
              <Select
                value={seller.timelineToSell || ""}
                onValueChange={(value) => onSellerChange({ ...seller, timelineToSell: value })}
              >
                <SelectTrigger data-testid="select-timeline">
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASAP">ASAP (within 2 weeks)</SelectItem>
                  <SelectItem value="30 days">Within 30 days</SelectItem>
                  <SelectItem value="60 days">Within 60 days</SelectItem>
                  <SelectItem value="90+ days">90+ days / Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Selling</Label>
              <Textarea
                id="reason"
                data-testid="input-reason"
                value={seller.reasonForSelling || ""}
                onChange={(e) => onSellerChange({ ...seller, reasonForSelling: e.target.value })}
                placeholder="Relocating, inherited, financial..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owed">Amount Owed</Label>
                <Input
                  id="owed"
                  type="number"
                  data-testid="input-owed"
                  value={seller.owed || ""}
                  onChange={(e) => onSellerChange({ ...seller, owed: Number(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="piti">Monthly PITI</Label>
                <Input
                  id="piti"
                  type="number"
                  data-testid="input-piti"
                  value={seller.pitiMonthly || ""}
                  onChange={(e) => onSellerChange({ ...seller, pitiMonthly: Number(e.target.value) || undefined })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="neededProfit">Seller Needs to Walk Away With</Label>
                <Input
                  id="neededProfit"
                  type="number"
                  data-testid="input-needed-profit"
                  value={seller.neededProfit || ""}
                  onChange={(e) => onSellerChange({ ...seller, neededProfit: Number(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="sellerARV">Seller's Value Estimate</Label>
                <Input
                  id="sellerARV"
                  type="number"
                  data-testid="input-seller-arv"
                  value={seller.sellerThinksAs10Value || ""}
                  onChange={(e) => onSellerChange({ ...seller, sellerThinksAs10Value: Number(e.target.value) || undefined })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <CompsSection
          compsData={compsData}
          isLoading={isLoadingComps}
          subjectSqft={property.sqft}
          onUseSuggestedARV={handleUseSuggestedARV}
        />

        <UserCompsSection
          userComps={userComps}
          onUserCompsChange={onUserCompsChange}
          subjectSqft={property.sqft}
          onUseUserARV={handleUseSuggestedARV}
        />

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Underwriting Output</CardTitle>
              {underwritingOutput && (
                <Badge className={confidenceColor} variant="outline">
                  {underwritingOutput.confidenceScore}% Confidence
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {underwritingOutput ? (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    As-Is Value Range
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground">Low</p>
                      <p className="font-mono text-lg font-semibold">{formatCurrency(underwritingOutput.asIsLow)}</p>
                    </div>
                    <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground">Base</p>
                      <p className="font-mono text-lg font-bold text-primary">{formatCurrency(underwritingOutput.asIsBase)}</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground">High</p>
                      <p className="font-mono text-lg font-semibold">{formatCurrency(underwritingOutput.asIsHigh)}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Repair Estimate
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground">Low</p>
                      <p className="font-mono text-lg font-semibold">{formatCurrency(underwritingOutput.repairLow)}</p>
                    </div>
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-muted-foreground">Base</p>
                      <p className="font-mono text-lg font-bold text-destructive">{formatCurrency(underwritingOutput.repairBase)}</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted">
                      <p className="text-xs text-muted-foreground">High</p>
                      <p className="font-mono text-lg font-semibold">{formatCurrency(underwritingOutput.repairHigh)}</p>
                    </div>
                  </div>
                </div>

                {underwritingOutput.marketabilityDiscount > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Marketability Discount</span>
                      <span className="font-mono text-destructive">-{formatCurrency(underwritingOutput.marketabilityDiscount)}</span>
                    </div>
                  </>
                )}

                {underwritingOutput.avmBlendUsed.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">AVM Blend Used</h4>
                      <div className="space-y-1">
                        {underwritingOutput.avmBlendUsed.map((avm, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{avm.source}</span>
                            <span className="font-mono">
                              {formatCurrency(avm.value)} ({(avm.weight * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Value Drivers
                  </h4>
                  <ul className="space-y-1">
                    {underwritingOutput.drivers.map((driver, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {driver}
                      </li>
                    ))}
                  </ul>
                </div>

                {underwritingOutput.missingData.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Missing Data
                      </h4>
                      <ul className="space-y-1">
                        {underwritingOutput.missingData.map((item, i) => (
                          <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
                            <span>•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Enter property details to generate underwriting analysis</p>
                <p className="text-sm mt-1">At minimum, provide an address and either AVM values or a manual estimate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
