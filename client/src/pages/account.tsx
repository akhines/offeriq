import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  CreditCard,
  User,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react";

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const { data: subData, isLoading: subLoading } = useQuery<{
    subscription: any;
    tier: string;
  }>({
    queryKey: ["/api/stripe/subscription"],
    enabled: isAuthenticated,
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal");
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
  });

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  const tier = subData?.tier || "free";
  const tierLabels: Record<string, string> = {
    free: "Free Trial",
    basic: "Basic",
    premium: "Premium",
  };

  return (
    <div className="min-h-screen bg-background" data-testid="account-page">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-account-title">Account</h1>
        </div>

        <div className="space-y-6">
          <Card className="p-6" data-testid="card-profile">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Profile</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span data-testid="text-user-name">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span data-testid="text-user-email">{user?.email}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-subscription">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Subscription</h2>
            </div>
            {subLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Plan</span>
                  <Badge variant={tier === "premium" ? "default" : "secondary"} data-testid="badge-tier">
                    {tierLabels[tier] || tier}
                  </Badge>
                </div>
                {subData?.subscription && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="secondary" data-testid="badge-status">
                      {(subData.subscription as any).status}
                    </Badge>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {tier === "free" ? (
                    <Button onClick={() => navigate("/pricing")} data-testid="button-upgrade">
                      Upgrade Plan
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      data-testid="button-manage-billing"
                    >
                      {portalMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-1" />
                      )}
                      Manage Billing <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6" data-testid="card-actions">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Session</span>
              <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
                Log Out
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
