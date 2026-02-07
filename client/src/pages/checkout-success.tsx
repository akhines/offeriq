import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Check, ArrowRight, Loader2 } from "lucide-react";

export default function CheckoutSuccess() {
  const [, navigate] = useLocation();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/sync-subscription");
      return await res.json();
    },
    onSuccess: () => {
      setTimeout(() => navigate("/app"), 3000);
    },
  });

  useEffect(() => {
    syncMutation.mutate();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="checkout-success-page">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-[hsl(var(--primary))]" />
        </div>
        <h1 className="text-2xl font-bold mb-2" data-testid="text-success-title">Welcome to OfferIQ!</h1>
        <p className="text-muted-foreground mb-6">
          Your subscription is now active. You're ready to start underwriting deals like a pro.
        </p>
        {syncMutation.isPending ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Activating your account...</span>
          </div>
        ) : (
          <Button onClick={() => navigate("/app")} className="w-full" data-testid="button-go-to-app">
            Go to OfferIQ <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </Card>
    </div>
  );
}
