import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnderwritingSection } from "@/components/underwriting-section";
import { OfferCalcSection } from "@/components/offer-calc-section";
import { OfferPresentationSection } from "@/components/offer-presentation-section";
import { calculateUnderwriting } from "@/lib/engines/underwriting";
import { calculateOfferOutput } from "@/lib/engines/offer-calculation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import {
  FileText,
  Calculator,
  Presentation,
  Save,
  FolderOpen,
  Plus,
  LogOut,
  LogIn,
} from "lucide-react";
import type {
  PropertyInfo,
  SellerInfo,
  PublicInfo,
  AVMBaselines,
  OfferSettings,
  PresentationInput,
  UnderwritingOutput,
  OfferOutput,
  PresentationOutput,
  DealState,
  UserCompsState,
} from "@/types";
import { DEFAULT_OFFER_SETTINGS } from "@/types";

const USER_COMPS_STORAGE_KEY = "offeriq-user-comps";

function getDefaultUserComps(): UserCompsState {
  return {
    comps: [],
    confidenceScore: 50,
    suggestedARV: 0,
  };
}

const STORAGE_KEY = "offeriq-state";

function getDefaultState(): DealState {
  return {
    property: { address: "" },
    seller: {},
    publicInfo: {},
    avmBaselines: {},
    offerSettings: DEFAULT_OFFER_SETTINGS,
    presentationInput: { callNotes: [], keySellerConstraints: [] },
  };
}

function getDealIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("deal");
}

export default function OfferIQ() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();

  const [currentDealId, setCurrentDealId] = useState<string | null>(getDealIdFromUrl);
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const dealId = params.get("deal");
    if (dealId !== currentDealId) {
      setCurrentDealId(dealId);
    }
  }, [searchString]);

  const [state, setState] = useState<DealState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return { ...getDefaultState(), ...JSON.parse(saved) };
        } catch {
          return getDefaultState();
        }
      }
    }
    return getDefaultState();
  });

  const [manualAsIsEstimate, setManualAsIsEstimate] = useState(0);
  const [manualARV, setManualARV] = useState(0);
  const [manualRepairs, setManualRepairs] = useState(0);
  const [presentationOutput, setPresentationOutput] = useState<PresentationOutput | null>(null);
  const [presentationPdfUrl, setPresentationPdfUrl] = useState<string | null>(null);

  const [userComps, setUserComps] = useState<UserCompsState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(USER_COMPS_STORAGE_KEY);
      if (saved) {
        try {
          return { ...getDefaultUserComps(), ...JSON.parse(saved) };
        } catch {
          return getDefaultUserComps();
        }
      }
    }
    return getDefaultUserComps();
  });

  const { data: loadedDeal, isLoading: isDealLoading } = useQuery({
    queryKey: ["/api/deals", currentDealId],
    queryFn: async () => {
      if (!currentDealId) return null;
      const res = await fetch(`/api/deals/${currentDealId}`, { credentials: "include" });
      if (res.status === 401) {
        redirectToLogin(toast as any);
        return null;
      }
      if (!res.ok) throw new Error("Failed to load deal");
      return res.json();
    },
    enabled: !!currentDealId,
  });

  useEffect(() => {
    if (loadedDeal && currentDealId) {
      const interviewAnswers = (loadedDeal.interviewAnswers || {}) as Record<string, any>;
      const underwritingData = (loadedDeal.underwritingData || {}) as Record<string, any>;
      const offerData = (loadedDeal.offerData || {}) as Record<string, any>;
      const savedUserComps = loadedDeal.userComps as UserCompsState | null;
      const savedPresentationData = loadedDeal.presentationData as PresentationOutput | null;

      setState({
        property: {
          address: loadedDeal.propertyAddress || "",
          ...(underwritingData.property || {}),
        },
        seller: interviewAnswers,
        publicInfo: underwritingData.publicInfo || {},
        avmBaselines: underwritingData.avmBaselines || {},
        offerSettings: offerData.offerSettings || DEFAULT_OFFER_SETTINGS,
        presentationInput: underwritingData.presentationInput || { callNotes: [], keySellerConstraints: [] },
      });

      if (underwritingData.manualAsIsEstimate !== undefined) setManualAsIsEstimate(underwritingData.manualAsIsEstimate);
      if (underwritingData.manualARV !== undefined) setManualARV(underwritingData.manualARV);
      if (underwritingData.manualRepairs !== undefined) setManualRepairs(underwritingData.manualRepairs);
      if (savedUserComps) setUserComps(savedUserComps);
      if (savedPresentationData) setPresentationOutput(savedPresentationData);
      if (loadedDeal.presentationPdfUrl) setPresentationPdfUrl(loadedDeal.presentationPdfUrl);
    }
  }, [loadedDeal, currentDealId]);

  const saveDealMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        propertyAddress: state.property.address || "Untitled Deal",
        dealName: state.property.address || "Untitled Deal",
        interviewAnswers: state.seller,
        underwritingData: {
          property: state.property,
          underwritingOutput,
          manualAsIsEstimate,
          manualARV,
          manualRepairs,
          avmBaselines: state.avmBaselines,
          publicInfo: state.publicInfo,
          presentationInput: state.presentationInput,
        },
        offerData: {
          offerOutput,
          offerSettings: state.offerSettings,
        },
        compsData: null,
        userComps,
        presentationData: presentationOutput,
        dealGrade: offerOutput?.dealGrade || null,
        sellerOffer: offerOutput?.sellerOffer || null,
        arv: underwritingOutput?.arv || null,
        wholesalePrice: offerOutput?.investorBuyPrice || null,
        repairEstimate: underwritingOutput?.repairBase || null,
        confidenceScore: underwritingOutput?.confidenceScore || null,
        presentationPdfUrl: presentationPdfUrl,
      };

      if (currentDealId) {
        const res = await apiRequest("PATCH", `/api/deals/${currentDealId}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/deals", payload);
        return res.json();
      }
    },
    onSuccess: (data) => {
      if (!currentDealId && data.id) {
        setCurrentDealId(data.id);
        window.history.replaceState(null, "", `/?deal=${data.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ description: "Deal saved successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        redirectToLogin(toast as any);
        return;
      }
      toast({ description: "Failed to save deal", variant: "destructive" });
    },
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(USER_COMPS_STORAGE_KEY, JSON.stringify(userComps));
  }, [userComps]);

  const handleUserCompsChange = useCallback((newUserComps: UserCompsState) => {
    setUserComps(newUserComps);
  }, []);

  const underwritingOutput = useMemo(() => {
    return calculateUnderwriting(
      state.property,
      state.seller,
      state.publicInfo,
      state.avmBaselines,
      manualAsIsEstimate,
      manualARV,
      manualRepairs,
      userComps
    );
  }, [state.property, state.seller, state.publicInfo, state.avmBaselines, manualAsIsEstimate, manualARV, manualRepairs, userComps]);

  const offerOutput = useMemo(() => {
    if (!underwritingOutput) return null;
    return calculateOfferOutput(underwritingOutput, state.offerSettings);
  }, [underwritingOutput, state.offerSettings]);

  const handlePropertyChange = useCallback((property: PropertyInfo) => {
    setState((s) => ({ ...s, property }));
  }, []);

  const handleSellerChange = useCallback((seller: SellerInfo) => {
    setState((s) => ({ ...s, seller }));
  }, []);

  const handlePublicInfoChange = useCallback((publicInfo: PublicInfo) => {
    setState((s) => ({ ...s, publicInfo }));
  }, []);

  const handleAVMChange = useCallback((avmBaselines: AVMBaselines) => {
    setState((s) => ({ ...s, avmBaselines }));
  }, []);

  const handleOfferSettingsChange = useCallback((offerSettings: OfferSettings) => {
    setState((s) => ({ ...s, offerSettings }));
  }, []);

  const handlePresentationInputChange = useCallback((presentationInput: PresentationInput) => {
    setState((s) => ({ ...s, presentationInput }));
  }, []);

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      doReset();
    }
  };

  const doReset = () => {
    setState(getDefaultState());
    setManualAsIsEstimate(0);
    setManualARV(0);
    setManualRepairs(0);
    setPresentationOutput(null);
    setPresentationPdfUrl(null);
    setUserComps(getDefaultUserComps());
    setCurrentDealId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_COMPS_STORAGE_KEY);
    window.history.replaceState(null, "", "/");
  };

  const handleNewDeal = () => {
    const hasData = state.property.address || Object.keys(state.seller).length > 0;
    if (hasData) {
      handleReset();
    } else {
      doReset();
      toast({ description: "Ready for a new deal" });
    }
  };

  const handleSaveDeal = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    saveDealMutation.mutate();
  };

  const handleCopyDealSummary = async () => {
    const summary = generateDealSummary();
    await navigator.clipboard.writeText(summary);
    toast({ description: "Deal summary copied to clipboard" });
  };

  const handleExportJSON = () => {
    const exportData = {
      ...state,
      underwritingOutput,
      offerOutput,
      presentationOutput,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deal-${state.property.address?.replace(/[^a-z0-9]/gi, "-") || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: "Deal exported as JSON" });
  };

  const generateDealSummary = () => {
    const lines = [
      "=== DEAL DESK SUMMARY ===",
      "",
      "PROPERTY",
      `Address: ${state.property.address || "Not specified"}`,
      `Type: ${state.property.propertyType || "Not specified"}`,
      `Beds/Baths: ${state.property.beds || "?"} / ${state.property.baths || "?"}`,
      `Sqft: ${state.property.sqft?.toLocaleString() || "Unknown"}`,
      `Condition: ${state.property.conditionScore ?? "?"}/10`,
      "",
      "SELLER",
      `Timeline: ${state.seller.timelineToSell || "Not specified"}`,
      `Reason: ${state.seller.reasonForSelling || "Not specified"}`,
      `Amount Owed: $${state.seller.owed?.toLocaleString() || "Unknown"}`,
      `Needed Profit: $${state.seller.neededProfit?.toLocaleString() || "Unknown"}`,
    ];

    if (underwritingOutput) {
      lines.push(
        "",
        "UNDERWRITING",
        `As-Is Value: $${underwritingOutput.asIsLow.toLocaleString()} - $${underwritingOutput.asIsHigh.toLocaleString()} (base: $${underwritingOutput.asIsBase.toLocaleString()})`,
        `Repairs: $${underwritingOutput.repairLow.toLocaleString()} - $${underwritingOutput.repairHigh.toLocaleString()}`,
        `Confidence: ${underwritingOutput.confidenceScore}%`,
        `Drivers: ${underwritingOutput.drivers.join("; ")}`
      );
    }

    if (offerOutput) {
      lines.push(
        "",
        "OFFER",
        `Strategy: ${state.offerSettings.strategy}`,
        `Investor Buy Price: $${offerOutput.investorBuyPrice.toLocaleString()}`,
        `Seller Offer: $${offerOutput.sellerOffer.toLocaleString()}`,
        `Deal Grade: ${offerOutput.dealGrade}`,
        `Margin: $${offerOutput.margin.toLocaleString()} (${offerOutput.marginPct.toFixed(1)}%)`,
        "",
        "OFFER LADDER",
        ...offerOutput.offerLadder.map((t) => `  ${t.name}: $${t.price.toLocaleString()}`)
      );
    }

    if (presentationOutput) {
      lines.push(
        "",
        "PRESENTATION PLAN",
        `Summary: ${presentationOutput.sellerSummary}`,
        `Recommended Tier: ${presentationOutput.recommendedOfferTier}`,
        "",
        "Next Actions:",
        ...presentationOutput.nextActions.map((a) => `  - ${a}`)
      );
    }

    return lines.join("\n");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">OfferIQ</h1>
            <Badge variant="secondary" className="text-xs">
              3-Engine Underwriter
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewDeal}
              data-testid="button-new-deal"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Deal</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveDeal}
              disabled={saveDealMutation.isPending}
              data-testid="button-save-deal"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">
                {saveDealMutation.isPending ? "Saving..." : "Save Deal"}
              </span>
            </Button>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/deals")}
                data-testid="link-my-deals"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">My Deals</span>
              </Button>
            )}
            <ThemeToggle />
            {authLoading ? null : isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8" data-testid="img-user-avatar">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                  <AvatarFallback data-testid="text-user-initials">
                    {(user.firstName?.[0] || "").toUpperCase()}
                    {(user.lastName?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline" data-testid="text-user-name">
                  {user.firstName}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  data-testid="button-logout"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { window.location.href = "/api/login"; }}
                data-testid="button-sign-in"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="underwriting" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="underwriting" className="gap-2" data-testid="tab-underwriting">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Underwriting</span>
            </TabsTrigger>
            <TabsTrigger value="offer" className="gap-2" data-testid="tab-offer">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Offer Calc</span>
            </TabsTrigger>
            <TabsTrigger value="presentation" className="gap-2" data-testid="tab-presentation">
              <Presentation className="h-4 w-4" />
              <span className="hidden sm:inline">Presentation</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="underwriting" className="mt-6">
            <UnderwritingSection
              property={state.property}
              seller={state.seller}
              publicInfo={state.publicInfo}
              avmBaselines={state.avmBaselines}
              underwritingOutput={underwritingOutput}
              onPropertyChange={handlePropertyChange}
              onSellerChange={handleSellerChange}
              onPublicInfoChange={handlePublicInfoChange}
              onAVMChange={handleAVMChange}
              manualAsIsEstimate={manualAsIsEstimate}
              onManualEstimateChange={setManualAsIsEstimate}
              manualARV={manualARV}
              onManualARVChange={setManualARV}
              manualRepairs={manualRepairs}
              onManualRepairsChange={setManualRepairs}
              userComps={userComps}
              onUserCompsChange={handleUserCompsChange}
            />
          </TabsContent>

          <TabsContent value="offer" className="mt-6">
            <OfferCalcSection
              settings={state.offerSettings}
              offerOutput={offerOutput}
              underwritingOutput={underwritingOutput}
              onSettingsChange={handleOfferSettingsChange}
            />
          </TabsContent>

          <TabsContent value="presentation" className="mt-6">
            <OfferPresentationSection
              seller={state.seller}
              presentationInput={state.presentationInput}
              presentationOutput={presentationOutput}
              offerOutput={offerOutput}
              underwritingOutput={underwritingOutput}
              propertyAddress={state.property.address}
              onPresentationInputChange={handlePresentationInputChange}
              onPresentationOutputChange={setPresentationOutput}
              onPdfUrlChange={setPresentationPdfUrl}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between text-sm text-muted-foreground">
          <span>OfferIQ - 3-Engine Real Estate Underwriter</span>
          <span>Data auto-saves locally</span>
        </div>
      </footer>
    </div>
  );
}
