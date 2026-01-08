import type { Answers, DerivedOutputs, RiskFlag } from "@shared/schema";
import { conditionToRehabPerSqft } from "@shared/schema";

export function calculateDerivedOutputs(
  answers: Answers,
  assignmentFee: number
): DerivedOutputs {
  const conditionScore = typeof answers.conditionScore === "number" ? answers.conditionScore : 5;
  const sqft = typeof answers.sqft === "number" ? answers.sqft : 0;
  const arv = typeof answers.arv === "number" ? answers.arv : 0;
  const closingCosts = typeof answers.closingCosts === "number" ? answers.closingCosts : 5000;
  const holdingBuffer = typeof answers.holdingBuffer === "number" ? answers.holdingBuffer : arv * 0.01;
  const investorRule = typeof answers.investorRule === "number" ? answers.investorRule : 70;
  const rehabOverride = typeof answers.rehabOverride === "number" ? answers.rehabOverride : undefined;
  const amountOwed = typeof answers.amountOwed === "number" ? answers.amountOwed : 0;
  const sellerARV = typeof answers.sellerARV === "number" ? answers.sellerARV : 0;
  const hvacAge = typeof answers.hvacAge === "number" ? answers.hvacAge : 0;
  const hasHVAC = answers.hasHVAC === true;
  const failedSystems = typeof answers.failedSystems === "string" ? answers.failedSystems : "";

  const rehabPerSqft = conditionToRehabPerSqft[Math.round(conditionScore)] ?? 32;
  const rehabEstimate = rehabOverride !== undefined ? rehabOverride : sqft * rehabPerSqft;
  const holdingBufferAmount = holdingBuffer > 0 ? holdingBuffer : arv * 0.01;

  const investorBuyPrice = arv * (investorRule / 100) - rehabEstimate - closingCosts - holdingBufferAmount;
  const sellerOffer = investorBuyPrice - assignmentFee;
  const equityAtOffer = sellerOffer - amountOwed;
  const expectationGap = sellerARV - arv;

  const riskFlags: RiskFlag[] = [];

  if (hasHVAC && hvacAge >= 15) {
    riskFlags.push({
      type: "hvac",
      severity: hvacAge >= 20 ? "high" : "medium",
      message: `HVAC is ${hvacAge} years old - replacement likely needed`,
    });
  }

  if (failedSystems.trim().length > 0) {
    const systemCount = failedSystems.split(/[,\n]/).filter((s) => s.trim().length > 0).length;
    riskFlags.push({
      type: "systems",
      severity: systemCount >= 3 ? "high" : systemCount >= 2 ? "medium" : "low",
      message: `${systemCount} failed system(s) reported`,
    });
  }

  if (expectationGap > 0 && sellerARV > 0) {
    const gapPercent = (expectationGap / arv) * 100;
    riskFlags.push({
      type: "expectation",
      severity: gapPercent >= 20 ? "high" : gapPercent >= 10 ? "medium" : "low",
      message: `Seller expects $${expectationGap.toLocaleString()} more than your ARV`,
    });
  }

  if (equityAtOffer < 0) {
    riskFlags.push({
      type: "equity",
      severity: "high",
      message: `Negative equity at offer: seller would need to bring $${Math.abs(equityAtOffer).toLocaleString()} to close`,
    });
  }

  return {
    rehabPerSqft,
    rehabEstimate,
    investorBuyPrice,
    sellerOffer,
    equityAtOffer,
    holdingBufferAmount,
    riskFlags,
    expectationGap,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
