import {
  UnderwritingOutput,
  OfferSettings,
  OfferOutput,
  OfferLadderItem,
} from "@/types";

function safeNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

export function calculateWholesalePrice(
  underwriting: UnderwritingOutput,
  settings: OfferSettings
): number {
  const arv = safeNum(underwriting.arv);
  const repairHigh = safeNum(underwriting.repairHigh);
  const profitPct = safeNum(settings.profitPct);
  const closingCostPct = safeNum(settings.closingCostPct);
  
  const closingMultiplier = 1 - (closingCostPct / 100);
  const profitDeduction = arv * (profitPct / 100);
  
  const wholesalePrice = (arv * closingMultiplier) - profitDeduction - repairHigh;
  
  return Math.round(Math.max(0, wholesalePrice));
}

export function calculateInvestorBuyPrice(
  underwriting: UnderwritingOutput,
  settings: OfferSettings
): number {
  const { strategy } = settings;
  
  if (strategy === "wholesale") {
    return calculateWholesalePrice(underwriting, settings);
  }
  
  const asIsBase = safeNum(underwriting.asIsBase);
  const targetRulePct = safeNum(settings.targetRulePct);
  const closingCosts = safeNum(settings.closingCosts);
  const holdingBuffer = safeNum(settings.holdingBuffer);
  const riskBuffer = safeNum(settings.riskBuffer);
  const marketCoolingFactorPct = safeNum(settings.marketCoolingFactorPct);
  const desiredProfit = safeNum(settings.desiredProfit);
  
  const coolingAdjustment = asIsBase * (marketCoolingFactorPct / 100);
  const adjustedBase = asIsBase - coolingAdjustment;
  
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
  const safeBuyPrice = safeNum(investorBuyPrice);
  if (settings.strategy === "wholesale") {
    return Math.round(Math.max(0, safeBuyPrice - safeNum(settings.assignmentFee)));
  }
  return Math.round(Math.max(0, safeBuyPrice));
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
  underwriting: UnderwritingOutput,
  investorBuyPrice: number,
  sellerOffer: number,
  settings: OfferSettings
): string[] {
  const sensitivity: string[] = [];
  
  if (settings.strategy === "wholesale") {
    const { arv } = underwriting;
    
    sensitivity.push(`+$10k repairs = -$10k offer (new offer: $${(sellerOffer - 10000).toLocaleString()})`);
    
    const profitImpact = Math.round(arv * 0.01);
    sensitivity.push(`+1% profit = -$${profitImpact.toLocaleString()} offer (new offer: $${(sellerOffer - profitImpact).toLocaleString()})`);
    
    const closingImpact = Math.round(arv * 0.01);
    sensitivity.push(`+1% closing costs = -$${closingImpact.toLocaleString()} offer (new offer: $${(sellerOffer - closingImpact).toLocaleString()})`);
    
    sensitivity.push(`+$5k assignment fee = -$5k offer (new offer: $${(sellerOffer - 5000).toLocaleString()})`);
  } else {
    sensitivity.push(`+$10k repairs = -$10k offer (new offer: $${(sellerOffer - 10000).toLocaleString()})`);
    
    const coolingImpact = Math.round(investorBuyPrice * 0.02);
    sensitivity.push(`+2% cooling factor = -$${coolingImpact.toLocaleString()} (new offer: $${(sellerOffer - coolingImpact).toLocaleString()})`);
    
    sensitivity.push(`+$5k risk buffer = -$5k offer (new offer: $${(sellerOffer - 5000).toLocaleString()})`);
  }
  
  return sensitivity;
}

export function calculateDealGrade(
  underwriting: UnderwritingOutput,
  investorBuyPrice: number,
  sellerOffer: number,
  settings: OfferSettings
): "A" | "B" | "C" | "D" {
  const confidenceScore = safeNum(underwriting.confidenceScore);
  const arv = safeNum(underwriting.arv);
  const safeSellerOffer = safeNum(sellerOffer);
  
  const margin = arv - safeSellerOffer;
  const marginPct = arv > 0 ? (margin / arv) * 100 : 0;
  
  let grade = 0;
  
  if (confidenceScore >= 80) grade += 2;
  else if (confidenceScore >= 60) grade += 1;
  
  if (marginPct >= 40) grade += 2;
  else if (marginPct >= 30) grade += 1;
  
  if (settings.strategy !== "wholesale" && settings.riskBuffer >= 10000) grade += 1;
  
  if (margin >= 50000) grade += 1;
  
  if (grade >= 4) return "A";
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
  const sensitivity = generateSensitivity(underwriting, investorBuyPrice, sellerOffer, settings);
  const dealGrade = calculateDealGrade(underwriting, investorBuyPrice, sellerOffer, settings);
  
  const arv = safeNum(underwriting.arv);
  const margin = arv - sellerOffer;
  const marginPct = arv > 0 ? (margin / arv) * 100 : 0;
  
  return {
    investorBuyPrice,
    sellerOffer,
    offerLadder,
    sensitivity,
    dealGrade,
    margin: Number.isFinite(margin) ? margin : 0,
    marginPct: Number.isFinite(marginPct) ? Math.round(marginPct * 100) / 100 : 0,
  };
}
