import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Check,
  ArrowLeft,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react";

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  metadata: { tier?: string; features?: string; dealLimit?: string; order?: string };
  prices: Array<{
    id: string;
    unitAmount: number;
    currency: string;
    recurring: { interval: string } | null;
  }>;
}

export default function PricingPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const { data: productsData, isLoading } = useQuery<{ products: StripeProduct[] }>({
    queryKey: ["/api/stripe/products"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
  });

  const products = productsData?.products || [];
  const sortedProducts = [...products].sort((a, b) => {
    const orderA = parseInt(a.metadata?.order || "99");
    const orderB = parseInt(b.metadata?.order || "99");
    return orderA - orderB;
  });

  const handleSelect = (priceId: string) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    checkoutMutation.mutate(priceId);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="pricing-page">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(isAuthenticated ? "/app" : "/")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[hsl(var(--primary))]" />
              <span className="font-bold">OfferIQ</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Start with a free trial, then upgrade to unlock more features.
          </p>
          <div className="inline-flex items-center bg-muted rounded-md p-1 gap-1">
            <Button
              variant={billingInterval === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBillingInterval("month")}
              data-testid="button-billing-monthly"
            >
              Monthly
            </Button>
            <Button
              variant={billingInterval === "year" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBillingInterval("year")}
              data-testid="button-billing-yearly"
            >
              Yearly <span className="text-[hsl(var(--primary))] ml-1">Save 17%</span>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 flex flex-col" data-testid="card-pricing-free">
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-1">Free Trial</h3>
              <p className="text-muted-foreground text-sm mb-4">Try OfferIQ risk-free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {["AVM blending & valuation", "Offer calculator & ladder", "3 saved deals", "2 AI presentations", "Comparable sales table"].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(isAuthenticated ? "/app" : "/")}
              data-testid="button-select-free"
            >
              {isAuthenticated ? "Current Plan" : "Get Started Free"}
            </Button>
          </Card>

          {sortedProducts.map((product) => {
            const monthlyPrice = product.prices.find(p => p.recurring?.interval === "month");
            const yearlyPrice = product.prices.find(p => p.recurring?.interval === "year");
            const currentPrice = billingInterval === "year" && yearlyPrice ? yearlyPrice : monthlyPrice;
            const displayAmount = currentPrice ? currentPrice.unitAmount / 100 : 0;
            const features = product.metadata?.features?.split(",") || [];
            const isPremium = product.metadata?.tier === "premium";

            return (
              <Card
                key={product.id}
                className={`p-6 flex flex-col ${isPremium ? "border-[hsl(var(--primary))] border-2 relative" : ""}`}
                data-testid={`card-pricing-${product.metadata?.tier}`}
              >
                {isPremium && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
                )}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-1">{product.name.replace("OfferIQ ", "")}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${displayAmount}</span>
                    <span className="text-muted-foreground">/{billingInterval === "month" ? "mo" : "yr"}</span>
                  </div>
                  {billingInterval === "year" && monthlyPrice && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${Math.round(monthlyPrice.unitAmount / 100)}/mo billed monthly
                    </p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isPremium ? "default" : "outline"}
                  onClick={() => currentPrice && handleSelect(currentPrice.id)}
                  disabled={checkoutMutation.isPending || !currentPrice}
                  data-testid={`button-select-${product.metadata?.tier}`}
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  {isPremium ? "Start Premium" : "Choose Basic"} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
