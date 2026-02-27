import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueries } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/lib/auth-utils";
import {
  ArrowLeft,
  GitCompareArrows,
  TrendingUp,
  DollarSign,
  Shield,
  Wrench,
  BarChart3,
  ExternalLink,
  Trophy,
  FileText,
} from "lucide-react";
import type { SavedDeal } from "@shared/models/savedDeals";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-600 dark:bg-green-700 text-white",
  B: "bg-blue-600 dark:bg-blue-700 text-white",
  C: "bg-yellow-600 dark:bg-yellow-700 text-white",
  D: "bg-red-600 dark:bg-red-700 text-white",
};

const gradeOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };

function formatCurrency(val: number | null | undefined): string {
  if (val == null || val === 0) return "--";
  return `$${val.toLocaleString()}`;
}

function formatPct(val: number | null | undefined): string {
  if (val == null) return "--";
  return `${val.toFixed(1)}%`;
}

interface CompareRowProps {
  label: string;
  values: (string | number | null | undefined)[];
  format?: "currency" | "pct" | "text" | "number";
  icon?: React.ReactNode;
  highlight?: "highest" | "lowest" | "best-grade" | "none";
}

function CompareRow({ label, values, format = "text", icon, highlight = "none" }: CompareRowProps) {
  const formatted = values.map((v) => {
    if (v == null || v === "" || v === 0) return "--";
    if (format === "currency") return formatCurrency(v as number);
    if (format === "pct") return formatPct(v as number);
    if (format === "number") return (v as number).toLocaleString();
    return String(v);
  });

  let bestIdx = -1;
  if (highlight !== "none" && values.some((v) => v != null && v !== 0)) {
    const nums = values.map((v) => (typeof v === "number" ? v : null));
    if (highlight === "highest") {
      let max = -Infinity;
      nums.forEach((n, i) => { if (n != null && n > max) { max = n; bestIdx = i; } });
    } else if (highlight === "lowest") {
      let min = Infinity;
      nums.forEach((n, i) => { if (n != null && n < min) { min = n; bestIdx = i; } });
    } else if (highlight === "best-grade") {
      let bestGrade = Infinity;
      values.forEach((v, i) => {
        const g = gradeOrder[String(v)] || 99;
        if (g < bestGrade) { bestGrade = g; bestIdx = i; }
      });
    }
  }

  return (
    <div className="grid items-center gap-4 py-2" style={{ gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      {formatted.map((val, i) => (
        <div
          key={i}
          className={`text-sm font-mono font-medium ${i === bestIdx ? "text-green-600 dark:text-green-400 font-bold" : ""}`}
          data-testid={`compare-cell-${label.toLowerCase().replace(/\s/g, "-")}-${i}`}
        >
          {val}
          {i === bestIdx && <Trophy className="h-3 w-3 inline ml-1 text-green-600 dark:text-green-400" />}
        </div>
      ))}
    </div>
  );
}

export default function CompareDeals() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const searchString = useSearch();

  const dealIds = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const ids = params.get("ids");
    return ids ? ids.split(",").filter(Boolean) : [];
  }, [searchString]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const dealQueries = useQueries({
    queries: dealIds.map((id) => ({
      queryKey: ["/api/deals", id],
      queryFn: async () => {
        const res = await fetch(`/api/deals/${id}`, { credentials: "include" });
        if (res.status === 401) { redirectToLogin(toast as any); throw new Error("Unauthorized"); }
        if (!res.ok) throw new Error("Failed to load deal");
        return res.json() as Promise<SavedDeal>;
      },
      enabled: isAuthenticated && !!id,
    })),
  });

  const isLoading = dealQueries.some((q) => q.isLoading);
  const deals = dealQueries.map((q) => q.data).filter(Boolean) as SavedDeal[];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (dealIds.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/deals")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <GitCompareArrows className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Compare Deals</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-12">
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <GitCompareArrows className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold" data-testid="text-empty-compare">Select deals to compare</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to your saved deals and select 2-3 deals using the checkboxes, then click Compare.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Compare ARV, offer prices, and margins side by side</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>See which deal has the best grade and highest potential</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Review risk and confidence scores across deals</span>
                </div>
              </div>
              <Button className="mt-2" onClick={() => setLocation("/deals")} data-testid="button-go-back">
                Go to My Deals
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/deals")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <GitCompareArrows className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">Compare Deals</h1>
            <Badge variant="secondary" className="text-xs">{deals.length} deals</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : deals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Could not load the selected deals.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <CardHeader className="pb-2">
              <div
                className="grid items-center gap-4"
                style={{ gridTemplateColumns: `140px repeat(${deals.length}, 1fr)` }}
              >
                <div />
                {deals.map((deal) => (
                  <div key={deal.id} className="space-y-1">
                    <CardTitle className="text-sm font-semibold truncate" data-testid={`compare-header-${deal.id}`}>
                      {deal.propertyAddress || "Untitled"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {deal.dealGrade && (
                        <Badge className={`${GRADE_COLORS[deal.dealGrade]} text-xs font-bold no-default-hover-elevate no-default-active-elevate`}>
                          {deal.dealGrade}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/app?deal=${deal.id}`)}
                        data-testid={`button-open-compare-${deal.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-0">
              <Separator className="mb-2" />

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">Valuation</p>
              <CompareRow
                label="ARV"
                values={deals.map((d) => d.arv)}
                format="currency"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                highlight="highest"
              />
              <CompareRow
                label="Seller Offer"
                values={deals.map((d) => d.sellerOffer)}
                format="currency"
                icon={<DollarSign className="h-3.5 w-3.5" />}
                highlight="lowest"
              />
              <CompareRow
                label="Wholesale Price"
                values={deals.map((d) => {
                  const od = d.offerData as Record<string, any> | null;
                  return d.wholesalePrice || od?.offerOutput?.investorBuyPrice || null;
                })}
                format="currency"
                icon={<DollarSign className="h-3.5 w-3.5" />}
              />

              <Separator className="my-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">Repairs & Risk</p>
              <CompareRow
                label="Repair Estimate"
                values={deals.map((d) => {
                  const ud = d.underwritingData as Record<string, any> | null;
                  return d.repairEstimate || ud?.underwritingOutput?.repairBase || null;
                })}
                format="currency"
                icon={<Wrench className="h-3.5 w-3.5" />}
                highlight="lowest"
              />
              <CompareRow
                label="Confidence"
                values={deals.map((d) => {
                  const ud = d.underwritingData as Record<string, any> | null;
                  return d.confidenceScore || ud?.underwritingOutput?.confidenceScore || null;
                })}
                format="pct"
                icon={<Shield className="h-3.5 w-3.5" />}
                highlight="highest"
              />
              <CompareRow
                label="Deal Grade"
                values={deals.map((d) => d.dealGrade || null)}
                format="text"
                icon={<BarChart3 className="h-3.5 w-3.5" />}
                highlight="best-grade"
              />

              <Separator className="my-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">Margins</p>
              <CompareRow
                label="Margin $"
                values={deals.map((d) => {
                  const od = d.offerData as Record<string, any> | null;
                  return od?.offerOutput?.margin || null;
                })}
                format="currency"
                highlight="highest"
              />
              <CompareRow
                label="Margin %"
                values={deals.map((d) => {
                  const od = d.offerData as Record<string, any> | null;
                  return od?.offerOutput?.marginPct || null;
                })}
                format="pct"
                highlight="highest"
              />

              <Separator className="my-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">Property</p>
              <CompareRow
                label="Sq Ft"
                values={deals.map((d) => {
                  const ud = d.underwritingData as Record<string, any> | null;
                  return ud?.property?.sqft || null;
                })}
                format="number"
              />
              <CompareRow
                label="Beds"
                values={deals.map((d) => {
                  const ud = d.underwritingData as Record<string, any> | null;
                  return ud?.property?.beds || null;
                })}
                format="number"
              />
              <CompareRow
                label="Baths"
                values={deals.map((d) => {
                  const ud = d.underwritingData as Record<string, any> | null;
                  return ud?.property?.baths || null;
                })}
                format="number"
              />
              <CompareRow
                label="Year Built"
                values={deals.map((d) => {
                  const ud = d.underwritingData as Record<string, any> | null;
                  return ud?.property?.yearBuilt || null;
                })}
                format="number"
              />
              <CompareRow
                label="Condition"
                values={deals.map((d) => {
                  const ud = d.underwritingData as Record<string, any> | null;
                  const score = ud?.property?.conditionScore;
                  return score != null ? `${score}/10` : null;
                })}
                format="text"
              />

              {deals.some((d) => d.presentationPdfUrl) && (
                <>
                  <Separator className="my-2" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">Documents</p>
                  <div
                    className="grid items-center gap-4 py-2"
                    style={{ gridTemplateColumns: `200px repeat(${deals.length}, 1fr)` }}
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      PDF
                    </div>
                    {deals.map((d) => (
                      <div key={d.id}>
                        {d.presentationPdfUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(d.presentationPdfUrl!, "_blank")}
                            data-testid={`compare-pdf-${d.id}`}
                          >
                            <FileText className="h-4 w-4" />
                            View
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">--</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
