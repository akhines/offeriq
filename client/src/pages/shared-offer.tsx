import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FileText,
  Home,
  TrendingUp,
  BarChart3,
  Calculator,
  Layers,
  Award,
  MessageSquare,
  Loader2,
  AlertCircle,
  LinkIcon,
  BedDouble,
  Bath,
  Ruler,
  CalendarDays,
  ArrowUpDown,
  ExternalLink,
  MapPin,
  DollarSign,
  Gift,
  CheckCircle2,
  Phone,
  Mail,
  Globe,
  Clock,
  MessageCircle,
  FileText as FileTextIcon,
} from "lucide-react";
import type { OfferBenefit } from "@/components/share-offer-dialog";
import type {
  PropertyInfo,
  AVMBaselines,
  UnderwritingOutput,
  OfferOutput,
  OfferSettings,
  PresentationOutput,
  CompsData,
  ComparableSale,
  UserCompsState,
} from "@/types";

interface DealSnapshot {
  property: PropertyInfo;
  avmBaselines: AVMBaselines;
  underwritingOutput: UnderwritingOutput | null;
  offerOutput: OfferOutput | null;
  offerSettings: OfferSettings;
  presentationOutput: PresentationOutput | null;
  compsData?: CompsData | null;
  userComps?: UserCompsState | null;
  offerBenefits?: OfferBenefit[] | null;
  companyLogoPath?: string | null;
  companyName?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  personalMessage?: string | null;
  closingTimeline?: string | null;
  earnestMoneyDeposit?: string | null;
  additionalTerms?: string | null;
  customOfferPrice?: number | null;
}

interface SharedOfferData {
  propertyAddress: string;
  sections: string[];
  dealSnapshot: DealSnapshot;
  createdAt: string;
}

function formatCurrency(value: number | undefined): string {
  if (!value) return "$0";
  return "$" + value.toLocaleString();
}

function PropertyDetailsSection({ property }: { property: PropertyInfo }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          Property Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium" data-testid="text-shared-address">{property.address}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {property.beds !== undefined && (
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Beds</p>
                  <p className="font-medium">{property.beds}</p>
                </div>
              </div>
            )}
            {property.baths !== undefined && (
              <div className="flex items-center gap-2">
                <Bath className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Baths</p>
                  <p className="font-medium">{property.baths}</p>
                </div>
              </div>
            )}
            {property.sqft !== undefined && property.sqft > 0 && (
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Sqft</p>
                  <p className="font-medium">{property.sqft?.toLocaleString()}</p>
                </div>
              </div>
            )}
            {property.yearBuilt !== undefined && property.yearBuilt > 0 && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Year Built</p>
                  <p className="font-medium">{property.yearBuilt}</p>
                </div>
              </div>
            )}
          </div>
          {property.propertyType && (
            <div>
              <p className="text-sm text-muted-foreground">Property Type</p>
              <Badge variant="outline" className="capitalize">
                {property.propertyType.replace(/_/g, " ")}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AVMValuationSection({ output }: { output: UnderwritingOutput }) {
  const confidenceColor =
    output.confidenceScore >= 80
      ? "text-green-600 dark:text-green-400"
      : output.confidenceScore >= 60
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Valuation Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">As-Is Value Range</p>
            <p className="font-semibold">
              {formatCurrency(output.asIsLow)} - {formatCurrency(output.asIsHigh)}
            </p>
            <p className="text-sm text-muted-foreground">Base: {formatCurrency(output.asIsBase)}</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">After Repair Value (ARV)</p>
            <p className="text-xl font-bold text-primary" data-testid="text-shared-arv">
              {formatCurrency(output.arv)}
            </p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Confidence Score</p>
            <p className={`text-xl font-bold ${confidenceColor}`} data-testid="text-shared-confidence">
              {output.confidenceScore}%
            </p>
          </div>
        </div>
        {output.repairBase > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">Estimated Repairs</p>
            <p className="font-medium">
              {formatCurrency(output.repairLow)} - {formatCurrency(output.repairHigh)}
              <span className="text-muted-foreground text-sm ml-2">(base: {formatCurrency(output.repairBase)})</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OfferBenefitsSection({ benefits }: { benefits: OfferBenefit[] }) {
  const benefitIcons = [
    <Home className="h-5 w-5" />,
    <DollarSign className="h-5 w-5" />,
    <Gift className="h-5 w-5" />,
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Why This Offer Works for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-md bg-muted/30"
              data-testid={`benefit-card-${i}`}
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary flex-shrink-0">
                {benefitIcons[i] || <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" data-testid={`benefit-title-${i}`}>{benefit.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed" data-testid={`benefit-desc-${i}`}>{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function buildZillowLink(address: string): string {
  const formatted = address.trim().replace(/\s+/g, "-").replace(/[,#]/g, "");
  return `https://www.zillow.com/homes/${encodeURIComponent(formatted)}_rb/`;
}

function CompCard({ comp, index }: { comp: ComparableSale; index: number }) {
  const zillowUrl = buildZillowLink(comp.address);
  return (
    <div className="p-3 rounded-md border bg-muted/20 space-y-2" data-testid={`comp-card-${index}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight" data-testid={`comp-address-${index}`}>{comp.address}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {comp.bedrooms > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <BedDouble className="h-3 w-3" /> {comp.bedrooms}bd
              </span>
            )}
            {comp.bathrooms > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Bath className="h-3 w-3" /> {comp.bathrooms}ba
              </span>
            )}
            {comp.sqft > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Ruler className="h-3 w-3" /> {comp.sqft.toLocaleString()} sqft
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono font-semibold text-sm" data-testid={`comp-price-${index}`}>{formatCurrency(comp.price)}</p>
          {comp.pricePerSqft > 0 && (
            <p className="text-xs text-muted-foreground font-mono">${Math.round(comp.pricePerSqft)}/sqft</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {comp.soldDate && (
            <Badge variant="outline" className="text-xs">
              <CalendarDays className="h-3 w-3 mr-1" />
              Sold {new Date(comp.soldDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </Badge>
          )}
          {comp.distanceMiles > 0 && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {comp.distanceMiles.toFixed(1)} mi
            </Badge>
          )}
        </div>
        <a
          href={zillowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary font-medium"
          data-testid={`comp-zillow-link-${index}`}
        >
          View on Zillow
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function ComparableSalesSection({ compsData, userComps }: { compsData?: CompsData | null; userComps?: UserCompsState | null }) {
  const apiComps = compsData?.comps || [];
  const userCompsList = userComps?.comps || [];
  const hasApiComps = apiComps.length > 0;
  const hasUserComps = userCompsList.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Comparable Sales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hasApiComps && compsData && (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Avg $/Sqft</p>
                  <p className="font-mono font-semibold">${Math.round(compsData.avgPricePerSqft)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Median Price</p>
                  <p className="font-mono font-semibold">{formatCurrency(compsData.medianPrice)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Suggested ARV</p>
                  <p className="font-mono font-semibold text-primary">{formatCurrency(compsData.suggestedARV)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{apiComps.length} Comparable Properties</p>
                {apiComps.map((comp, i) => (
                  <CompCard key={i} comp={comp} index={i} />
                ))}
              </div>
            </>
          )}

          {hasUserComps && (
            <>
              {hasApiComps && <Separator />}
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Comparables</p>
                {userCompsList.map((uc, i) => {
                  const comp: ComparableSale = {
                    address: uc.address,
                    price: uc.price,
                    sqft: uc.sqft || 0,
                    pricePerSqft: uc.sqft && uc.sqft > 0 ? uc.price / uc.sqft : 0,
                    bedrooms: uc.beds || 0,
                    bathrooms: uc.baths || 0,
                    yearBuilt: 0,
                    soldDate: uc.soldDate || "",
                    distanceMiles: 0,
                  };
                  return <CompCard key={`user-${i}`} comp={comp} index={100 + i} />;
                })}
              </div>
            </>
          )}

          {!hasApiComps && !hasUserComps && (
            <p className="text-sm text-muted-foreground text-center py-4">No comparable sales data available for this analysis.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OfferFormulaSection({ output, settings }: { output: OfferOutput; settings: OfferSettings }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Offer Formula
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="p-4 bg-muted/30 rounded-md">
            <p className="text-xs text-muted-foreground mb-2">Calculation Method: {settings.strategy.charAt(0).toUpperCase() + settings.strategy.slice(1)}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>Closing Cost %</span>
                <span>{settings.closingCostPct}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Profit Target %</span>
                <span>{settings.profitPct}%</span>
              </div>
              {settings.assignmentFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Assignment Fee</span>
                  <span>{formatCurrency(settings.assignmentFee)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Investor Buy Price</span>
                <span data-testid="text-shared-investor-price">{formatCurrency(output.investorBuyPrice)}</span>
              </div>
              <div className="flex justify-between font-bold text-primary">
                <span>Your Offer to Seller</span>
                <span data-testid="text-shared-seller-offer">{formatCurrency(output.sellerOffer)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
            <span className="text-sm">Margin</span>
            <span className="font-medium">
              {formatCurrency(output.margin)} ({output.marginPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OfferLadderSection({ output }: { output: OfferOutput }) {
  const tierColors: Record<string, string> = {
    "Fast Yes": "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800",
    Fair: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
    Stretch: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Offer Ladder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {output.offerLadder.map((tier, i) => (
            <div
              key={i}
              className={`p-4 rounded-md border ${tierColors[tier.name] || "bg-muted/30"}`}
              data-testid={`card-offer-tier-${i}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{tier.name}</span>
                <span className="text-lg font-bold">{formatCurrency(tier.price)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{tier.useWhen}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DealGradeSection({ output }: { output: OfferOutput }) {
  const gradeColors: Record<string, string> = {
    A: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    D: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const gradeDescriptions: Record<string, string> = {
    A: "High confidence, strong margins, and adequate buffers. This is a solid deal.",
    B: "Decent confidence and margins. Good deal with manageable risk.",
    C: "Lower confidence or margins. Proceed with caution.",
    D: "Risky deal. Requires careful consideration and negotiation.",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Deal Grade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-16 h-16 rounded-md text-3xl font-bold ${gradeColors[output.dealGrade] || "bg-muted"}`} data-testid="text-shared-deal-grade">
            {output.dealGrade}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {gradeDescriptions[output.dealGrade] || "Deal assessment unavailable."}
            </p>
            <div className="flex gap-3 mt-2">
              <Badge variant="outline" className="text-xs">
                Margin: {output.marginPct.toFixed(1)}%
              </Badge>
              <Badge variant="outline" className="text-xs">
                Spread: {formatCurrency(output.margin)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NegotiationPlanSection({ plan }: { plan: PresentationOutput }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Negotiation Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Seller Summary</p>
            <p className="text-sm text-muted-foreground">{plan.sellerSummary}</p>
          </div>

          {plan.recommendedOfferTier && (
            <div className="p-3 bg-primary/5 rounded-md">
              <p className="text-sm font-medium mb-1">Recommended Approach</p>
              <Badge variant="secondary" className="capitalize">
                {plan.recommendedOfferTier.replace(/_/g, " ")}
              </Badge>
            </div>
          )}

          {plan.talkTrackSoft && (
            <div>
              <p className="text-sm font-medium mb-1">Suggested Talk Track</p>
              <p className="text-sm text-muted-foreground italic">"{plan.talkTrackSoft}"</p>
            </div>
          )}

          {plan.objectionHandling && plan.objectionHandling.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Objection Handling</p>
              <div className="space-y-2">
                {plan.objectionHandling.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <ArrowUpDown className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.nextActions && plan.nextActions.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Next Steps</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                {plan.nextActions.map((action, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{action}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SharedOfferPage() {
  const params = useParams<{ code: string }>();
  const [data, setData] = useState<SharedOfferData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const res = await fetch(`/api/s/${params.code}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Failed to load offer");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load offer. Please check the link and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchShare();
  }, [params.code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted-foreground">Loading offer package...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load Offer</h2>
            <p className="text-muted-foreground text-sm">{error || "This link may be invalid or expired."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { sections, dealSnapshot } = data;
  const { property, underwritingOutput, offerOutput, offerSettings, presentationOutput, companyLogoPath, companyName } = dealSnapshot;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {companyLogoPath ? (
              <img
                src={companyLogoPath}
                alt={companyName || "Company logo"}
                className="h-8 w-8 rounded-md object-contain"
                data-testid="img-shared-company-logo"
              />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            <span className="font-bold" data-testid="text-shared-brand">{companyName || "OfferIQ"}</span>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">Shared Offer</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <LinkIcon className="h-3 w-3 mr-1" />
              {params.code}
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center mb-6">
          {companyLogoPath && (
            <div className="flex justify-center mb-3">
              <img
                src={companyLogoPath}
                alt={companyName || "Company logo"}
                className="h-12 w-auto max-w-[180px] object-contain"
                data-testid="img-shared-hero-logo"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold" data-testid="text-shared-title">
            {data.propertyAddress}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {companyName ? `Offer package from ${companyName}` : "Offer package prepared for your review"}
          </p>
        </div>

        {dealSnapshot.personalMessage && (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex gap-3">
                <MessageCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">A message from {companyName || "your buyer"}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-personal-message">
                    {dealSnapshot.personalMessage}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {dealSnapshot.customOfferPrice && dealSnapshot.customOfferPrice > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Our Offer for Your Property</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-custom-offer-price">
                  ${dealSnapshot.customOfferPrice.toLocaleString()}
                </p>
                {dealSnapshot.closingTimeline && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Closing in {dealSnapshot.closingTimeline}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {sections.map((sectionId: string) => {
          switch (sectionId) {
            case "property_details":
              return property ? <PropertyDetailsSection key={sectionId} property={property} /> : null;
            case "avm_valuation":
              return underwritingOutput ? <AVMValuationSection key={sectionId} output={underwritingOutput} /> : null;
            case "comparable_sales":
              return <ComparableSalesSection key={sectionId} compsData={dealSnapshot?.compsData} userComps={dealSnapshot?.userComps} />;
            case "offer_benefits":
              return dealSnapshot?.offerBenefits && dealSnapshot.offerBenefits.length > 0
                ? <OfferBenefitsSection key={sectionId} benefits={dealSnapshot.offerBenefits} /> : null;
            case "offer_formula":
              return offerOutput && offerSettings
                ? <OfferFormulaSection key={sectionId} output={offerOutput} settings={offerSettings} /> : null;
            case "offer_ladder":
              return offerOutput ? <OfferLadderSection key={sectionId} output={offerOutput} /> : null;
            case "deal_grade":
              return offerOutput ? <DealGradeSection key={sectionId} output={offerOutput} /> : null;
            case "negotiation_plan":
              return presentationOutput ? <NegotiationPlanSection key={sectionId} plan={presentationOutput} /> : null;
            default:
              return null;
          }
        })}

        {(dealSnapshot.closingTimeline || dealSnapshot.earnestMoneyDeposit || dealSnapshot.additionalTerms) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-primary" />
                Deal Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dealSnapshot.closingTimeline && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Closing Timeline
                    </span>
                    <span className="font-medium" data-testid="text-closing-timeline">{dealSnapshot.closingTimeline}</span>
                  </div>
                )}
                {dealSnapshot.earnestMoneyDeposit && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> Earnest Money
                    </span>
                    <span className="font-medium" data-testid="text-earnest-money">{dealSnapshot.earnestMoneyDeposit}</span>
                  </div>
                )}
                {dealSnapshot.additionalTerms && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Additional Terms</p>
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-additional-terms">{dealSnapshot.additionalTerms}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(dealSnapshot.companyPhone || dealSnapshot.companyEmail || dealSnapshot.companyWebsite) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dealSnapshot.companyPhone && (
                  <a
                    href={`tel:${dealSnapshot.companyPhone}`}
                    className="flex items-center gap-2 text-sm text-primary"
                    data-testid="link-company-phone"
                  >
                    <Phone className="h-4 w-4" />
                    {dealSnapshot.companyPhone}
                  </a>
                )}
                {dealSnapshot.companyEmail && (
                  <a
                    href={`mailto:${dealSnapshot.companyEmail}`}
                    className="flex items-center gap-2 text-sm text-primary"
                    data-testid="link-company-email"
                  >
                    <Mail className="h-4 w-4" />
                    {dealSnapshot.companyEmail}
                  </a>
                )}
                {dealSnapshot.companyWebsite && (
                  <a
                    href={dealSnapshot.companyWebsite.startsWith("http") ? dealSnapshot.companyWebsite : `https://${dealSnapshot.companyWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary"
                    data-testid="link-company-website"
                  >
                    <Globe className="h-4 w-4" />
                    {dealSnapshot.companyWebsite}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-6 pb-8">
          <Separator className="mb-6" />
          <p className="text-xs text-muted-foreground">
            {companyName ? `${companyName} · ` : ""}Powered by OfferIQ
          </p>
        </div>
      </main>
    </div>
  );
}
