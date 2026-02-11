import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SHAREABLE_SECTIONS, type SectionId } from "@/components/share-offer-dialog";
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
  Search,
  Archive,
  RotateCcw,
  FileText,
  ArrowUpDown,
  GitCompareArrows,
  DollarSign,
  TrendingUp,
  Shield,
  Calendar,
  Share2,
  Loader2,
  Check,
  Link2,
  Copy,
} from "lucide-react";
import type { SavedDeal } from "@shared/models/savedDeals";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-600 dark:bg-green-700 text-white",
  B: "bg-blue-600 dark:bg-blue-700 text-white",
  C: "bg-yellow-600 dark:bg-yellow-700 text-white",
  D: "bg-red-600 dark:bg-red-700 text-white",
};

type SortField = "updatedAt" | "createdAt" | "sellerOffer" | "arv" | "dealGrade" | "propertyAddress";
type SortDir = "asc" | "desc";

const gradeOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };

function formatCurrency(val: number | null | undefined): string {
  if (val == null || val === 0) return "--";
  return `$${val.toLocaleString()}`;
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sortDeals(deals: SavedDeal[], field: SortField, dir: SortDir): SavedDeal[] {
  return [...deals].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "updatedAt":
        cmp = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
        break;
      case "createdAt":
        cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        break;
      case "sellerOffer":
        cmp = (a.sellerOffer || 0) - (b.sellerOffer || 0);
        break;
      case "arv":
        cmp = (a.arv || 0) - (b.arv || 0);
        break;
      case "dealGrade":
        cmp = (gradeOrder[a.dealGrade || "D"] || 5) - (gradeOrder[b.dealGrade || "D"] || 5);
        break;
      case "propertyAddress":
        cmp = (a.propertyAddress || "").localeCompare(b.propertyAddress || "");
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function SavedDeals() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [statusTab, setStatusTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingSellerId, setCreatingSellerId] = useState<string | null>(null);
  const [dealShareUrls, setDealShareUrls] = useState<Record<string, string>>({});
  const [sellerDialogDeal, setSellerDialogDeal] = useState<SavedDeal | null>(null);
  const [sellerSections, setSellerSections] = useState<Set<SectionId>>(new Set());
  const [sellerShareUrl, setSellerShareUrl] = useState<string | null>(null);
  const [sellerCopied, setSellerCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const { data: deals, isLoading, error } = useQuery<SavedDeal[]>({
    queryKey: ["/api/deals", { status: statusTab }],
    queryFn: async () => {
      const res = await fetch(`/api/deals?status=${statusTab}`, { credentials: "include" });
      if (res.status === 401) { redirectToLogin(toast as any); return []; }
      if (!res.ok) throw new Error("Failed to load deals");
      return res.json();
    },
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
      if (isUnauthorizedError(error)) { redirectToLogin(toast as any); return; }
      toast({ description: "Failed to delete deal", variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/deals/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setSelectedIds(new Set());
      toast({ description: statusTab === "active" ? "Deal archived" : "Deal restored" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) { redirectToLogin(toast as any); return; }
      toast({ description: "Failed to update deal", variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Delete this deal permanently? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const getDealAvailableSections = (deal: SavedDeal): Set<SectionId> => {
    const underwritingData = deal.underwritingData as Record<string, any> | null;
    const offerData = deal.offerData as Record<string, any> | null;
    const presentationData = deal.presentationData as Record<string, any> | null;
    const available = new Set<SectionId>();
    if (deal.propertyAddress) available.add("property_details");
    if (underwritingData?.underwritingOutput) { available.add("avm_valuation"); }
    if ((deal as any).compsData?.comps?.length || (deal as any).userComps?.comps?.length) { available.add("comparable_sales"); }
    if (offerData?.offerOutput) { available.add("offer_formula"); available.add("offer_ladder"); available.add("deal_grade"); }
    if (presentationData?.presentationOutput) available.add("negotiation_plan");
    return available;
  };

  const openSellerDialog = (deal: SavedDeal) => {
    const available = getDealAvailableSections(deal);
    setSellerDialogDeal(deal);
    setSellerSections(new Set(available));
    setSellerShareUrl(null);
    setSellerCopied(false);
  };

  const toggleSellerSection = (id: SectionId) => {
    setSellerSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateSellerPage = async () => {
    const deal = sellerDialogDeal;
    if (!deal) return;

    if (sellerSections.size === 0) {
      toast({ description: "Select at least one section to share", variant: "destructive" });
      return;
    }

    setCreatingSellerId(deal.id);
    try {
      const sharesRes = await fetch("/api/shares", { credentials: "include" });
      if (sharesRes.ok) {
        const sharesData = await sharesRes.json();
        const existing = (sharesData.shares || []).find(
          (s: any) => s.isActive && s.propertyAddress === deal.propertyAddress
        );
        if (existing) {
          const existingUrl = `${window.location.origin}/s/${existing.code}`;
          setDealShareUrls((prev) => ({ ...prev, [deal.id]: existingUrl }));
          setSellerShareUrl(existingUrl);
          setCreatingSellerId(null);
          return;
        }
      }

      const underwritingData = deal.underwritingData as Record<string, any> | null;
      const offerData = deal.offerData as Record<string, any> | null;
      const presentationData = deal.presentationData as Record<string, any> | null;

      const compsData = (deal as any).compsData || null;
      const userCompsData = (deal as any).userComps || null;

      const dealSnapshot = {
        property: underwritingData?.property || { address: deal.propertyAddress },
        avmBaselines: underwritingData?.avmBaselines || {},
        underwritingOutput: underwritingData?.underwritingOutput || null,
        offerOutput: offerData?.offerOutput || null,
        offerSettings: offerData?.offerSettings || {},
        presentationOutput: presentationData?.presentationOutput || null,
        compsData,
        userComps: userCompsData,
      };

      const res = await apiRequest("POST", "/api/shares", {
        propertyAddress: deal.propertyAddress || "Unknown Property",
        sections: Array.from(sellerSections),
        dealSnapshot,
        expiresInDays: null,
      });

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.url}`;
      setDealShareUrls((prev) => ({ ...prev, [deal.id]: fullUrl }));
      setSellerShareUrl(fullUrl);
      toast({ description: "Seller page link created" });
    } catch {
      toast({ description: "Failed to create seller page", variant: "destructive" });
    } finally {
      setCreatingSellerId(null);
    }
  };

  const handleCopySellerUrl = async () => {
    if (!sellerShareUrl) return;
    await navigator.clipboard.writeText(sellerShareUrl);
    setSellerCopied(true);
    setTimeout(() => setSellerCopied(false), 2000);
    toast({ description: "Link copied to clipboard" });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const handleCompare = () => {
    if (selectedIds.size < 2) {
      toast({ description: "Select at least 2 deals to compare", variant: "destructive" });
      return;
    }
    const ids = Array.from(selectedIds).join(",");
    setLocation(`/deals/compare?ids=${ids}`);
  };

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    let result = deals;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          (d.propertyAddress || "").toLowerCase().includes(q) ||
          (d.dealName || "").toLowerCase().includes(q) ||
          (d.dealGrade || "").toLowerCase().includes(q)
      );
    }
    return sortDeals(result, sortField, sortDir);
  }, [deals, searchQuery, sortField, sortDir]);

  const stats = useMemo(() => {
    if (!deals || deals.length === 0) return null;
    const graded = deals.filter((d) => d.dealGrade);
    const withArv = deals.filter((d) => d.arv && d.arv > 0);
    const avgArv = withArv.length > 0 ? Math.round(withArv.reduce((s, d) => s + (d.arv || 0), 0) / withArv.length) : 0;
    const gradeCount: Record<string, number> = {};
    graded.forEach((d) => { gradeCount[d.dealGrade!] = (gradeCount[d.dealGrade!] || 0) + 1; });
    return { total: deals.length, avgArv, gradeCount };
  }, [deals]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/app")}
              data-testid="button-back"
              aria-label="Back to deal desk"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <FolderOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">My Deals</h1>
            {stats && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-deal-count">
                {stats.total} {statusTab}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size >= 2 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleCompare}
                data-testid="button-compare"
              >
                <GitCompareArrows className="h-4 w-4" />
                Compare ({selectedIds.size})
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setLocation("/app")}
              data-testid="button-new-deal"
            >
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {stats && statusTab === "active" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-grid">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Deals</p>
                  <p className="text-lg font-bold" data-testid="stat-total">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg ARV</p>
                  <p className="text-lg font-bold" data-testid="stat-avg-arv">{formatCurrency(stats.avgArv)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/10">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">A-Grade</p>
                  <p className="text-lg font-bold" data-testid="stat-a-grade">{stats.gradeCount["A"] || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/10">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">B-Grade</p>
                  <p className="text-lg font-bold" data-testid="stat-b-grade">{stats.gradeCount["B"] || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v as "active" | "archived"); setSelectedIds(new Set()); }}>
            <TabsList data-testid="tabs-status">
              <TabsTrigger value="active" data-testid="tab-active">Active</TabsTrigger>
              <TabsTrigger value="archived" data-testid="tab-archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by address, name, or grade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-sort">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="propertyAddress">Address</SelectItem>
              <SelectItem value="dealGrade">Grade</SelectItem>
              <SelectItem value="arv">ARV</SelectItem>
              <SelectItem value="sellerOffer">Offer Price</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            data-testid="button-sort-dir"
            aria-label="Toggle sort direction"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
            <span className="text-sm text-muted-foreground" data-testid="text-selected-count">
              {selectedIds.size} deal{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <Separator orientation="vertical" className="h-5" />
            {selectedIds.size >= 2 && (
              <Button variant="outline" size="sm" onClick={handleCompare} data-testid="button-compare-bar">
                <GitCompareArrows className="h-4 w-4" />
                Compare
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              data-testid="button-clear-selection"
            >
              Clear
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="loading-skeleton">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
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
        ) : filteredDeals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-empty-state">
                {searchQuery
                  ? "No deals match your search."
                  : statusTab === "archived"
                  ? "No archived deals yet."
                  : "No saved deals yet. Start analyzing a property to save your first deal."}
              </p>
              {!searchQuery && statusTab === "active" && (
                <Button
                  variant="default"
                  className="mt-4"
                  onClick={() => setLocation("/app")}
                  data-testid="button-start-deal"
                >
                  <Plus className="h-4 w-4" />
                  Start a New Deal
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="deals-grid">
            {filteredDeals.map((deal) => {
              const isSelected = selectedIds.has(deal.id);
              const offerData = deal.offerData as Record<string, any> | null;
              const underwritingData = deal.underwritingData as Record<string, any> | null;
              const wholesalePrice = deal.wholesalePrice || offerData?.offerOutput?.investorBuyPrice;
              const repairEst = deal.repairEstimate || underwritingData?.underwritingOutput?.repairBase;
              const confidence = deal.confidenceScore || underwritingData?.underwritingOutput?.confidenceScore;
              const margin = offerData?.offerOutput?.margin;
              const marginPct = offerData?.offerOutput?.marginPct;
              const pdfUrl = deal.presentationPdfUrl;

              return (
                <Card
                  key={deal.id}
                  className={`transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
                  data-testid={`card-deal-${deal.id}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(deal.id)}
                        data-testid={`checkbox-deal-${deal.id}`}
                        aria-label={`Select ${deal.propertyAddress}`}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold leading-tight truncate" data-testid={`text-address-${deal.id}`}>
                          {deal.propertyAddress || deal.dealName || "Untitled Deal"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1" data-testid={`text-date-${deal.id}`}>
                          <Calendar className="h-3 w-3" />
                          {formatDate(deal.updatedAt)}
                        </p>
                      </div>
                    </div>
                    {deal.dealGrade && (
                      <Badge
                        className={`${GRADE_COLORS[deal.dealGrade] || ""} text-xs font-bold no-default-hover-elevate no-default-active-elevate`}
                        data-testid={`badge-grade-${deal.id}`}
                      >
                        {deal.dealGrade}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm pb-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <span className="text-xs text-muted-foreground">ARV</span>
                        <p className="font-mono font-medium" data-testid={`text-arv-${deal.id}`}>{formatCurrency(deal.arv)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Offer</span>
                        <p className="font-mono font-medium" data-testid={`text-offer-${deal.id}`}>{formatCurrency(deal.sellerOffer)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Wholesale</span>
                        <p className="font-mono font-medium" data-testid={`text-wholesale-${deal.id}`}>{formatCurrency(wholesalePrice)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Repairs</span>
                        <p className="font-mono font-medium" data-testid={`text-repairs-${deal.id}`}>{formatCurrency(repairEst)}</p>
                      </div>
                    </div>
                    {(margin != null || confidence != null) && (
                      <div className="flex items-center gap-3 pt-1">
                        {margin != null && (
                          <Badge variant="outline" className="text-xs font-mono" data-testid={`badge-margin-${deal.id}`}>
                            Margin: {formatCurrency(margin)} {marginPct != null ? `(${marginPct.toFixed(1)}%)` : ""}
                          </Badge>
                        )}
                        {confidence != null && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-confidence-${deal.id}`}>
                            {confidence}% conf
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex items-center gap-1 flex-wrap pt-0 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/app?deal=${deal.id}`)}
                      data-testid={`button-open-${deal.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openSellerDialog(deal)}
                      data-testid={`button-seller-page-${deal.id}`}
                    >
                      <Share2 className="h-4 w-4" />
                      Seller Page
                    </Button>
                    {pdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(pdfUrl, "_blank")}
                        data-testid={`button-pdf-${deal.id}`}
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveMutation.mutate(deal.id)}
                      disabled={archiveMutation.isPending}
                      data-testid={`button-archive-${deal.id}`}
                    >
                      {statusTab === "active" ? (
                        <>
                          <Archive className="h-4 w-4" />
                          Archive
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(deal.id)}
                      disabled={deleteMutation.isPending}
                      className="text-destructive"
                      data-testid={`button-delete-${deal.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!sellerDialogDeal} onOpenChange={(open) => { if (!open) setSellerDialogDeal(null); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Create Seller Page
            </DialogTitle>
          </DialogHeader>

          {sellerShareUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your seller page is ready. Copy this link and send it to the property owner.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2.5 rounded-md truncate" data-testid="text-seller-share-url">
                  {sellerShareUrl}
                </code>
                <Button size="icon" variant="outline" onClick={handleCopySellerUrl} data-testid="button-copy-seller-url">
                  {sellerCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => window.open(sellerShareUrl, "_blank")} data-testid="button-preview-seller">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Preview
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => { setSellerShareUrl(null); setSellerCopied(false); }} data-testid="button-create-new-seller">
                  Create New
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose which sections the seller will see on their page.
              </p>
              {sellerDialogDeal && (
                <p className="text-sm font-medium truncate">
                  {sellerDialogDeal.propertyAddress || sellerDialogDeal.dealName || "Untitled Deal"}
                </p>
              )}
              <div className="space-y-1.5">
                {SHAREABLE_SECTIONS.map((section) => {
                  const available = sellerDialogDeal ? getDealAvailableSections(sellerDialogDeal).has(section.id) : false;
                  const selected = sellerSections.has(section.id);
                  const Icon = section.icon;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      disabled={!available}
                      onClick={() => toggleSellerSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                        !available
                          ? "opacity-40 cursor-not-allowed"
                          : selected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover-elevate border border-transparent"
                      }`}
                      data-testid={`toggle-seller-section-${section.id}`}
                    >
                      <div className={`flex items-center justify-center h-8 w-8 rounded-md ${
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{section.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{section.description}</div>
                      </div>
                      {selected && available && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      {!available && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">No data</Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                className="w-full"
                onClick={handleCreateSellerPage}
                disabled={creatingSellerId !== null || sellerSections.size === 0}
                data-testid="button-generate-seller-link"
              >
                {creatingSellerId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate Seller Page Link
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
