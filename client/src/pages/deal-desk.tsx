import { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnderwritingSection } from "@/components/underwriting-section";
import { OfferCalcSection } from "@/components/offer-calc-section";
import { OfferPresentationSection } from "@/components/offer-presentation-section";
import { calculateUnderwriting } from "@/lib/engines/underwriting";
import { calculateOfferOutput } from "@/lib/engines/offer-calculation";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Calculator,
  Presentation,
  Download,
  Copy,
  RotateCcw,
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
} from "@/types";
import { DEFAULT_OFFER_SETTINGS } from "@/types";

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

export default function OfferIQ() {
  const { toast } = useToast();
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const underwritingOutput = useMemo(() => {
    return calculateUnderwriting(
      state.property,
      state.seller,
      state.publicInfo,
      state.avmBaselines,
      manualAsIsEstimate,
      manualARV,
      manualRepairs
    );
  }, [state.property, state.seller, state.publicInfo, state.avmBaselines, manualAsIsEstimate, manualARV, manualRepairs]);

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
      setState(getDefaultState());
      setManualAsIsEstimate(0);
      setManualARV(0);
      setManualRepairs(0);
      setPresentationOutput(null);
      localStorage.removeItem(STORAGE_KEY);
      toast({ description: "All data has been reset" });
    }
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
              variant="outline"
              size="sm"
              onClick={handleCopyDealSummary}
              data-testid="button-copy-summary"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              data-testid="button-export-json"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <ThemeToggle />
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
              onPresentationInputChange={handlePresentationInputChange}
              onPresentationOutputChange={setPresentationOutput}
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
