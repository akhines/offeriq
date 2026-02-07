import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import {
  Plus,
  Trash2,
  ExternalLink,
  FolderOpen,
  ArrowLeft,
} from "lucide-react";
import type { SavedDeal } from "@shared/models/savedDeals";

const GRADE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  A: "default",
  B: "secondary",
  C: "outline",
  D: "destructive",
};

export default function SavedDeals() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const { data: deals, isLoading, error } = useQuery<SavedDeal[]>({
    queryKey: ["/api/deals"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/deals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ description: "Deal deleted" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        redirectToLogin(toast as any);
        return;
      }
      toast({ description: "Failed to delete deal", variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this deal?")) {
      deleteMutation.mutate(id);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
              aria-label="Back to deal desk"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <FolderOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">My Deals</h1>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setLocation("/")}
            data-testid="button-new-deal"
          >
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="loading-skeleton">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive" data-testid="text-error">
                Failed to load deals. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : !deals || deals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-empty-state">
                No saved deals yet. Start analyzing a property to save your first deal.
              </p>
              <Button
                variant="default"
                className="mt-4"
                onClick={() => setLocation("/")}
                data-testid="button-start-deal"
              >
                <Plus className="h-4 w-4" />
                Start a New Deal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="deals-grid">
            {deals.map((deal) => (
              <Card key={deal.id} data-testid={`card-deal-${deal.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <CardTitle className="text-base font-semibold leading-tight" data-testid={`text-address-${deal.id}`}>
                    {deal.propertyAddress || deal.dealName || "Untitled Deal"}
                  </CardTitle>
                  {deal.dealGrade && (
                    <Badge
                      variant={GRADE_VARIANT[deal.dealGrade] || "outline"}
                      data-testid={`badge-grade-${deal.id}`}
                    >
                      {deal.dealGrade}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {deal.sellerOffer != null && (
                    <p data-testid={`text-seller-offer-${deal.id}`}>
                      Seller Offer: ${deal.sellerOffer.toLocaleString()}
                    </p>
                  )}
                  {deal.arv != null && (
                    <p data-testid={`text-arv-${deal.id}`}>
                      ARV: ${deal.arv.toLocaleString()}
                    </p>
                  )}
                  {deal.updatedAt && (
                    <p className="text-xs" data-testid={`text-updated-${deal.id}`}>
                      Updated: {new Date(deal.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/?deal=${deal.id}`)}
                    data-testid={`button-open-${deal.id}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(deal.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${deal.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
