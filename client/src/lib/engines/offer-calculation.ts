import {
  UnderwritingOutput,
  OfferSettings,
  OfferOutput,
  OfferLadderItem,
} from "@/types";

export function calculateInvestorBuyPrice(
  underwriting: UnderwritingOutput,
  settings: OfferSettings
): number {
  const { asIsBase } = underwriting;
  const { strategy, targetRulePct, closingCosts, holdingBuffer, riskBuffer, marketCoolingFactorPct, desiredProfit } = settings;
  
  const coolingAdjustment = asIsBase * (marketCoolingFactorPct / 100);
  const adjustedBase = asIsBase - coolingAdjustment;
  
  if (strategy === "wholesale") {
    const investorBuyPrice = (adjustedBase * (targetRulePct / 100)) - closingCosts - holdingBuffer - riskBuffer;
    return Math.round(Math.max(0, investorBuyPrice));
  }
  
  if (strategy === "flip") {
    const investorBuyPrice = (adjustedBase * (targetRulePct / 100)) - closingCosts - holdingBuffer - riskBuffer - desiredProfit;
    return Math.round(Math.max(0, investorBuyPrice));
  }
  
  if (strategy === "rental") {
    const rentalBuffer = desiredProfit * 0.5;
    const investorBuyPrice = (adjustedBase * (targetRulePct / 100)) - closingCosts - rentalBuffer;
    return Math.round(Math.max(0, investorBuyPrice));
  }
  
  return Math.round(Math.max(0, adjustedBase * (targetRulePct / 100)));
}

export function calculateSellerOffer(
  investorBuyPrice: number,
  settings: OfferSettings
): number {
  if (settings.strategy === "wholesale") {
    return Math.round(Math.max(0, investorBuyPrice - settings.assignmentFee));
  }
  return investorBuyPrice;
}

export function generateOfferLadder(
  sellerOffer: number,
  _strategy: OfferSettings["strategy"]
): OfferLadderItem[] {
  const fastYesAdjustment = 0.08;
  const stretchAdjustment = 0.08;
  
  return [
    {
      name: "Fast Yes",
      price: Math.round(sellerOffer * (1 + fastYesAdjustment)),
      useWhen: "Seller needs quick close, highly motivated, or multiple decision makers to get alignment",
    },
    {
      name: "Fair",
      price: sellerOffer,
      useWhen: "Standard offer - use as baseline for most negotiations",
    },
    {
      name: "Stretch",
      price: Math.round(sellerOffer * (1 - stretchAdjustment)),
      useWhen: "Seller has flexibility on timeline, property needs significant work, or testing price sensitivity",
    },
  ];
}

export function generateSensitivity(
  investorBuyPrice: number,
  sellerOffer: number,
  settings: OfferSettings
): string[] {
  const sensitivity: string[] = [];
  
  sensitivity.push(`+$10k repairs = -$10k offer (new offer: $${(sellerOffer - 10000).toLocaleString()})`);
  
  if (settings.strategy === "wholesale") {
    const newOffer = sellerOffer - 5000;
    sensitivity.push(`+$5k assignment fee = -$5k offer (new offer: $${newOffer.toLocaleString()})`);
  }
  
  const coolingImpact = Math.round(investorBuyPrice * 0.02);
  sensitivity.push(`+2% cooling factor = -$${coolingImpact.toLocaleString()} (new offer: $${(sellerOffer - coolingImpact).toLocaleString()})`);
  
  sensitivity.push(`+$5k risk buffer = -$5k offer (new offer: $${(sellerOffer - 5000).toLocaleString()})`);
  
  sensitivity.push(`+$2k holding buffer = -$2k offer (new offer: $${(sellerOffer - 2000).toLocaleString()})`);
  
  return sensitivity;
}

export function calculateDealGrade(
  underwriting: UnderwritingOutput,
  investorBuyPrice: number,
  sellerOffer: number,
  settings: OfferSettings
): "A" | "B" | "C" | "D" {
  const { confidenceScore, asIsBase } = underwriting;
  
  const margin = asIsBase - sellerOffer;
  const marginPct = asIsBase > 0 ? (margin / asIsBase) * 100 : 0;
  
  let grade = 0;
  
  if (confidenceScore >= 80) grade += 2;
  else if (confidenceScore >= 60) grade += 1;
  
  if (marginPct >= 30) grade += 2;
  else if (marginPct >= 20) grade += 1;
  
  if (settings.riskBuffer >= 10000) grade += 1;
  
  if (margin >= 50000) grade += 1;
  
  if (grade >= 5) return "A";
  if (grade >= 3) return "B";
  if (grade >= 2) return "C";
  return "D";
}

export function calculateOfferOutput(
  underwriting: UnderwritingOutput,
  settings: OfferSettings
): OfferOutput {
  const investorBuyPrice = calculateInvestorBuyPrice(underwriting, settings);
  const sellerOffer = calculateSellerOffer(investorBuyPrice, settings);
  const offerLadder = generateOfferLadder(sellerOffer, settings.strategy);
  const sensitivity = generateSensitivity(investorBuyPrice, sellerOffer, settings);
  const dealGrade = calculateDealGrade(underwriting, investorBuyPrice, sellerOffer, settings);
  
  const margin = underwriting.asIsBase - sellerOffer;
  const marginPct = underwriting.asIsBase > 0 ? (margin / underwriting.asIsBase) * 100 : 0;
  
  return {
    investorBuyPrice,
    sellerOffer,
    offerLadder,
    sensitivity,
    dealGrade,
    margin,
    marginPct,
  };
}
