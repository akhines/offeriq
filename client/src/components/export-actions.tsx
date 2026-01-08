import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, RotateCcw } from "lucide-react";
import type { Answers, DerivedOutputs, NegotiationPlan } from "@shared/schema";
import { formatCurrency } from "@/lib/underwriting";

interface ExportActionsProps {
  answers: Answers;
  derived: DerivedOutputs;
  assignmentFee: number;
  negotiationPlan: NegotiationPlan | null;
  onReset: () => void;
}

export function ExportActions({
  answers,
  derived,
  assignmentFee,
  negotiationPlan,
  onReset,
}: ExportActionsProps) {
  const { toast } = useToast();

  const generateSummaryText = (): string => {
    const lines: string[] = [
      "=== DEAL UNDERWRITING SUMMARY ===",
      "",
      "--- PROPERTY DETAILS ---",
      `Square Footage: ${answers.sqft || "N/A"} sqft`,
      `ARV (After Repair Value): ${formatCurrency(typeof answers.arv === "number" ? answers.arv : 0)}`,
      `Condition Score: ${answers.conditionScore || "N/A"}/10`,
      "",
      "--- SELLER SITUATION ---",
      `Timeline: ${answers.timeline || "N/A"}`,
      `Motivation: ${answers.motivation || "N/A"}`,
      `Amount Owed: ${formatCurrency(typeof answers.amountOwed === "number" ? answers.amountOwed : 0)}`,
      `PITI Payment: ${formatCurrency(typeof answers.pitiPayment === "number" ? answers.pitiPayment : 0)}/mo`,
      `Interest Rate: ${answers.interestRate || "N/A"}%`,
      `Needed Profit: ${formatCurrency(typeof answers.neededProfit === "number" ? answers.neededProfit : 0)}`,
      `Seller's ARV Expectation: ${formatCurrency(typeof answers.sellerARV === "number" ? answers.sellerARV : 0)}`,
      "",
      "--- PROPERTY CONDITION ---",
      `Central HVAC: ${answers.hasHVAC ? "Yes" : "No"}`,
      answers.hasHVAC ? `HVAC Age: ${answers.hvacAge || "N/A"} years` : "",
      `Failed Systems: ${answers.failedSystems || "None reported"}`,
      `Improvements Needed: ${answers.improvementsNeeded || "N/A"}`,
      `Outside Improvements (3yr): ${answers.outsideImprovements || "N/A"}`,
      `Inside Improvements (3yr): ${answers.insideImprovements || "N/A"}`,
      "",
      "--- UNDERWRITING CALCULATIONS ---",
      `Rehab Estimate: ${formatCurrency(derived.rehabEstimate)} (at $${derived.rehabPerSqft}/sqft)`,
      `Holding Buffer: ${formatCurrency(derived.holdingBufferAmount)}`,
      `Closing Costs: ${formatCurrency(typeof answers.closingCosts === "number" ? answers.closingCosts : 5000)}`,
      `Investor Rule: ${answers.investorRule || 70}%`,
      "",
      "--- OFFER DETAILS ---",
      `Investor Buy Price: ${formatCurrency(derived.investorBuyPrice)}`,
      `Assignment Fee: ${formatCurrency(assignmentFee)}`,
      `SELLER OFFER: ${formatCurrency(derived.sellerOffer)}`,
      `Equity at Offer: ${formatCurrency(derived.equityAtOffer)}`,
      "",
      "--- RISK FLAGS ---",
      derived.riskFlags.length > 0
        ? derived.riskFlags.map((f) => `[${f.severity.toUpperCase()}] ${f.message}`).join("\n")
        : "No significant risks identified",
    ].filter(Boolean);

    if (negotiationPlan) {
      lines.push(
        "",
        "=== AI NEGOTIATION PLAN ===",
        "",
        "--- SELLER SUMMARY ---",
        negotiationPlan.sellerSummary,
        "",
        "--- MOTIVATION HYPOTHESES ---",
        ...negotiationPlan.motivationHypotheses.map(
          (h) => `[${h.confidence}] ${h.hypothesis}`
        ),
        "",
        "--- DISC COMMUNICATION STYLE ---",
        ...negotiationPlan.discCues.map(
          (c) =>
            `${c.style} Style (${c.confidence} confidence):\n${c.communicationTips.map((t) => `  - ${t}`).join("\n")}`
        ),
        "",
        "--- TONY ROBBINS 6 NEEDS ---",
        ...negotiationPlan.sixNeedsMapping.map(
          (n) => `${n.need} [${n.relevance}]: ${n.approach}`
        ),
        "",
        "--- FOLLOW-UP QUESTIONS ---",
        ...negotiationPlan.followUpQuestions.map((q, i) => `${i + 1}. ${q}`),
        "",
        "--- OFFER FRAMING ---",
        "Soft Approach:",
        negotiationPlan.offerFraming.softApproach,
        "",
        "Direct Approach:",
        negotiationPlan.offerFraming.directApproach,
        "",
        "--- OBJECTION HANDLING ---",
        ...negotiationPlan.objectionHandling.map(
          (o) => `Q: "${o.objection}"\nA: ${o.response}`
        ),
        "",
        "--- NEXT STEPS ---",
        ...negotiationPlan.nextSteps.map((s, i) => `${i + 1}. ${s}`)
      );
    }

    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      const summary = generateSummaryText();
      await navigator.clipboard.writeText(summary);
      toast({
        title: "Copied to clipboard",
        description: "Deal summary has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      answers,
      derived,
      assignmentFee,
      negotiationPlan,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deal-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: "Deal data has been downloaded as JSON.",
    });
  };

  const handleReset = () => {
    onReset();
    toast({
      title: "Deal reset",
      description: "All fields have been cleared.",
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
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
        variant="ghost"
        size="sm"
        onClick={handleReset}
        data-testid="button-reset-deal"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>
    </div>
  );
}
