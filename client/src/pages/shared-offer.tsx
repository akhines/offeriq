import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FileText,
  Home,
  TrendingUp,
  BarChart3,
  Layers,
  Award,
  Loader2,
  AlertCircle,
  LinkIcon,
  BedDouble,
  Bath,
  Ruler,
  CalendarDays,
  ExternalLink,
  MapPin,
  DollarSign,
  CheckCircle2,
  Phone,
  Mail,
  Globe,
  Clock,
  MessageCircle,
  StickyNote,
  ShieldCheck,
  Zap,
  Wrench,
  HandshakeIcon,
  Scale,
  XCircle,
  Check,
} from "lucide-react";
import type { OfferBenefit } from "@/components/share-offer-dialog";
import type {
  PropertyInfo,
  AVMBaselines,
  UnderwritingOutput,
  OfferOutput,
  OfferSettings,
  CompsData,
  ComparableSale,
  UserCompsState,
  SellerComp,
} from "@/types";

interface DealSnapshot {
  property: PropertyInfo;
  avmBaselines: AVMBaselines;
  underwritingOutput: UnderwritingOutput | null;
  offerOutput: OfferOutput | null;
  offerSettings: OfferSettings;
  presentationOutput?: any | null;
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
  sellerComps?: SellerComp[] | null;
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

function PropertyValueSection({ output }: { output: UnderwritingOutput }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Property Value Estimate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Estimated Value Range</p>
            <p className="font-semibold">
              {formatCurrency(output.asIsLow)} - {formatCurrency(output.asIsHigh)}
            </p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Market Value</p>
            <p className="text-xl font-bold text-primary" data-testid="text-shared-arv">
              {formatCurrency(output.arv)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OfferBenefitsSection({ benefits }: { benefits: OfferBenefit[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Why This Offer Works for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {benefits.map((benefit, i) => (
            <li
              key={i}
              className="flex gap-3 items-start"
              data-testid={`benefit-card-${i}`}
            >
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" data-testid={`benefit-title-${i}`}>{benefit.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed" data-testid={`benefit-desc-${i}`}>{benefit.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "zillow": return "Zillow";
    case "redfin": return "Redfin";
    case "realtor": return "Realtor.com";
    default: return "Listing";
  }
}

function SellerCompsSection({ comps }: { comps: SellerComp[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          Comparable Properties
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comps.map((comp, i) => (
            <div
              key={i}
              className="rounded-md border overflow-hidden"
              data-testid={`seller-comp-card-${i}`}
            >
              {comp.imageUrl && (
                <div className="h-40 bg-muted overflow-hidden">
                  <img
                    src={comp.imageUrl}
                    alt={comp.address}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                    data-testid={`seller-comp-image-${i}`}
                  />
                </div>
              )}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight" data-testid={`seller-comp-address-${i}`}>
                      {comp.address}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {comp.beds > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <BedDouble className="h-3 w-3" /> {comp.beds}bd
                        </span>
                      )}
                      {comp.baths > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Bath className="h-3 w-3" /> {comp.baths}ba
                        </span>
                      )}
                      {comp.sqft > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Ruler className="h-3 w-3" /> {comp.sqft.toLocaleString()} sqft
                        </span>
                      )}
                    </div>
                  </div>
                  {comp.price > 0 && (
                    <p className="text-sm font-bold text-primary whitespace-nowrap" data-testid={`seller-comp-price-${i}`}>
                      ${comp.price.toLocaleString()}
                    </p>
                  )}
                </div>

                {comp.soldDate && (
                  <p className="text-xs text-muted-foreground">
                    Sold: {new Date(comp.soldDate).toLocaleDateString()}
                  </p>
                )}

                {comp.notes && (
                  <div className="flex gap-2 p-2 rounded bg-muted/40">
                    <StickyNote className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`seller-comp-notes-${i}`}>
                      {comp.notes}
                    </p>
                  </div>
                )}

                {comp.url && (
                  <a
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium"
                    data-testid={`seller-comp-link-${i}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on {getSourceLabel(comp.source)}
                  </a>
                )}
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

function SellerDealGradeSection({ output, snapshot }: { output: OfferOutput; snapshot: DealSnapshot }) {
  const gradeColors: Record<string, string> = {
    A: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    D: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const gradeLabels: Record<string, string> = {
    A: "Excellent Offer",
    B: "Strong Offer",
    C: "Fair Offer",
    D: "Starting Point",
  };

  const gradeBenefits: Record<string, Array<{ icon: typeof ShieldCheck; text: string }>> = {
    A: [
      { icon: Wrench, text: "No repairs needed — sell as-is" },
      { icon: Zap, text: "Fast closing timeline" },
      { icon: DollarSign, text: "No realtor commissions or hidden fees" },
      { icon: ShieldCheck, text: "High certainty of closing" },
      { icon: HandshakeIcon, text: "Clear, simple terms" },
      { icon: Scale, text: "Flexible on your timeline" },
    ],
    B: [
      { icon: Wrench, text: "No repairs needed — sell as-is" },
      { icon: HandshakeIcon, text: "Competitive offer with flexible terms" },
      { icon: DollarSign, text: "No commissions or listing fees" },
      { icon: Zap, text: "Faster than a traditional sale" },
      { icon: ShieldCheck, text: "Reliable closing process" },
    ],
    C: [
      { icon: DollarSign, text: "Fair market offer" },
      { icon: Wrench, text: "Sell as-is — skip the repairs" },
      { icon: HandshakeIcon, text: "Simplified selling process" },
      { icon: Zap, text: "Quicker than listing on the market" },
    ],
    D: [
      { icon: HandshakeIcon, text: "A starting point for discussion" },
      { icon: Scale, text: "Room for creative terms" },
      { icon: Wrench, text: "No repairs or prep needed" },
      { icon: DollarSign, text: "No commissions" },
    ],
  };

  const benefits = gradeBenefits[output.dealGrade] || gradeBenefits.C;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Offer Strength
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex items-center justify-center w-16 h-16 rounded-md text-3xl font-bold flex-shrink-0 ${gradeColors[output.dealGrade] || "bg-muted"}`} data-testid="text-shared-deal-grade">
            {output.dealGrade}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-base" data-testid="text-grade-label">
              {gradeLabels[output.dealGrade] || "Offer Assessment"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Here's why this is a strong offer for you:
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <li key={i} className="flex items-center gap-3 text-sm" data-testid={`grade-benefit-${i}`}>
                <Icon className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span>{b.text}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function DealTermsSection({ snapshot }: { snapshot: DealSnapshot }) {
  const hasTerms = snapshot.closingTimeline || snapshot.earnestMoneyDeposit || snapshot.additionalTerms;
  if (!hasTerms) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Deal Terms
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {snapshot.closingTimeline && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Closing Timeline
              </span>
              <span className="font-medium" data-testid="text-closing-timeline">{snapshot.closingTimeline}</span>
            </div>
          )}
          {snapshot.earnestMoneyDeposit && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Earnest Money
              </span>
              <span className="font-medium" data-testid="text-earnest-money">{snapshot.earnestMoneyDeposit}</span>
            </div>
          )}
          {snapshot.additionalTerms && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">Additional Terms</p>
              <p className="text-sm whitespace-pre-wrap" data-testid="text-additional-terms">{snapshot.additionalTerms}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonSection({ snapshot }: { snapshot: DealSnapshot }) {
  const offerPrice = (snapshot.customOfferPrice && snapshot.customOfferPrice > 0)
    ? snapshot.customOfferPrice
    : snapshot.offerOutput?.sellerOffer || 0;

  const arv = snapshot.underwritingOutput?.arv || 0;
  const traditionalPrice = arv > 0 ? arv : offerPrice * 1.15;
  const traditionalNet = Math.round(traditionalPrice * 0.94);

  const rows = [
    {
      label: "Sale Price",
      traditional: formatCurrency(Math.round(traditionalPrice)),
      ourOffer: formatCurrency(offerPrice),
    },
    {
      label: "Repairs Needed",
      traditional: "Likely",
      traditionalBad: true,
      ourOffer: "None",
      ourOfferGood: true,
    },
    {
      label: "Commissions & Fees",
      traditional: "5-6%",
      traditionalBad: true,
      ourOffer: "None",
      ourOfferGood: true,
    },
    {
      label: "Net to You",
      traditional: `~${formatCurrency(traditionalNet)}`,
      ourOffer: formatCurrency(offerPrice),
      highlight: true,
    },
    {
      label: "Time to Close",
      traditional: "3-6 months",
      traditionalBad: true,
      ourOffer: snapshot.closingTimeline || "2-3 weeks",
      ourOfferGood: true,
    },
    {
      label: "Certainty",
      traditional: "Depends on buyer financing",
      traditionalBad: true,
      ourOffer: "Cash — high certainty",
      ourOfferGood: true,
    },
    {
      label: "Convenience",
      traditional: "Showings, staging, inspections",
      traditionalBad: true,
      ourOffer: "Simple, hassle-free",
      ourOfferGood: true,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Compare Your Options
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          See how this offer stacks up against listing on the open market.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-comparison">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3 text-muted-foreground font-medium w-1/3"></th>
                <th className="text-center py-2 px-2 text-muted-foreground font-medium w-1/3">Traditional Listing</th>
                <th className="text-center py-2 pl-2 font-semibold text-primary w-1/3">Our Offer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`border-b last:border-0 ${row.highlight ? "bg-primary/5" : ""}`} data-testid={`comparison-row-${i}`}>
                  <td className="py-2.5 pr-3 text-muted-foreground font-medium">{row.label}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 ${row.traditionalBad ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {row.traditionalBad && <XCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                      {row.traditional}
                    </span>
                  </td>
                  <td className="py-2.5 pl-2 text-center">
                    <span className={`inline-flex items-center gap-1 font-medium ${row.ourOfferGood ? "text-green-600 dark:text-green-400" : row.highlight ? "text-primary font-bold" : ""}`}>
                      {row.ourOfferGood && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                      {row.ourOffer}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

        if (json.propertyAddress) {
          const companyLabel = json.dealSnapshot?.companyName || "OfferIQ";
          document.title = `Offer for ${json.propertyAddress} | ${companyLabel}`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute("content", `Review the offer package for ${json.propertyAddress}, prepared by ${companyLabel}.`);
          }
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) {
            ogTitle.setAttribute("content", `Offer for ${json.propertyAddress} | ${companyLabel}`);
          }
          const ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc) {
            ogDesc.setAttribute("content", `Review the offer package for ${json.propertyAddress}, prepared by ${companyLabel}.`);
          }
          const twTitle = document.querySelector('meta[name="twitter:title"]');
          if (twTitle) {
            twTitle.setAttribute("content", `Offer for ${json.propertyAddress} | ${companyLabel}`);
          }
          const twDesc = document.querySelector('meta[name="twitter:description"]');
          if (twDesc) {
            twDesc.setAttribute("content", `Review the offer package for ${json.propertyAddress}, prepared by ${companyLabel}.`);
          }
        }
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
      <div className="min-h-screen bg-background" data-testid="shared-offer-loading">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="text-center mb-6">
            <Skeleton className="h-6 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-5 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-48 mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-5 w-40" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-5 w-28" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        </main>
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
  const { property, underwritingOutput, offerOutput, companyLogoPath, companyName } = dealSnapshot;

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
              return underwritingOutput ? <PropertyValueSection key={sectionId} output={underwritingOutput} /> : null;
            case "comparable_sales":
              return <ComparableSalesSection key={sectionId} compsData={dealSnapshot?.compsData} userComps={dealSnapshot?.userComps} />;
            case "offer_benefits":
              return dealSnapshot?.offerBenefits && dealSnapshot.offerBenefits.length > 0
                ? <OfferBenefitsSection key={sectionId} benefits={dealSnapshot.offerBenefits} /> : null;
            case "offer_ladder":
              return offerOutput ? <OfferLadderSection key={sectionId} output={offerOutput} /> : null;
            case "deal_grade":
              return offerOutput ? <SellerDealGradeSection key={sectionId} output={offerOutput} snapshot={dealSnapshot} /> : null;
            case "deal_terms":
              return <DealTermsSection key={sectionId} snapshot={dealSnapshot} />;
            case "apples_to_apples":
              return <ComparisonSection key={sectionId} snapshot={dealSnapshot} />;
            default:
              return null;
          }
        })}

        {dealSnapshot.sellerComps && dealSnapshot.sellerComps.length > 0 && (
          <SellerCompsSection comps={dealSnapshot.sellerComps} />
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
