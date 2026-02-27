import {
  PropertyInfo,
  SellerInfo,
  PublicInfo,
  AVMBaselines,
  UnderwritingOutput,
  AVMBlend,
  CONDITION_REHAB_MAP,
  SYSTEM_FAILURE_ADDERS,
  AVM_WEIGHTS,
} from "../../types";

function safeNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(denominator) || denominator === 0) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

export function getRehabPerSqft(conditionScore: number): number {
  if (conditionScore >= 9) return CONDITION_REHAB_MAP["9-10"];
  if (conditionScore >= 7) return CONDITION_REHAB_MAP["7-8"];
  if (conditionScore >= 5) return CONDITION_REHAB_MAP["5-6"];
  if (conditionScore >= 3) return CONDITION_REHAB_MAP["3-4"];
  return CONDITION_REHAB_MAP["0-2"];
}

export function detectSystemFailures(knownIssues: string): string[] {
  const issues = knownIssues.toLowerCase();
  const detected: string[] = [];
  
  if (issues.includes("hvac") || issues.includes("heating") || issues.includes("cooling") || issues.includes("ac ") || issues.includes("a/c")) {
    detected.push("hvac");
  }
  if (issues.includes("roof") || issues.includes("shingle") || issues.includes("leak")) {
    detected.push("roof");
  }
  if (issues.includes("plumb") || issues.includes("pipe") || issues.includes("sewer") || issues.includes("water heater")) {
    detected.push("plumbing");
  }
  if (issues.includes("electric") || issues.includes("wiring") || issues.includes("panel") || issues.includes("outlet")) {
    detected.push("electrical");
  }
  if (issues.includes("foundation") || issues.includes("crack") || issues.includes("settling") || issues.includes("structural")) {
    detected.push("foundation");
  }
  if (issues.includes("water") || issues.includes("basement") || issues.includes("flood") || issues.includes("mold")) {
    detected.push("waterproofing");
  }
  
  return detected;
}

export function calculateSystemAdders(systemFailures: string[]): { low: number; high: number } {
  let totalLow = 0;
  let totalHigh = 0;
  
  for (const failure of systemFailures) {
    const adder = SYSTEM_FAILURE_ADDERS[failure];
    if (adder) {
      totalLow += adder.low;
      totalHigh += adder.high;
    }
  }
  
  return { low: totalLow, high: totalHigh };
}

export function calculateAVMBlend(avmBaselines: AVMBaselines): { blendedValue: number; blends: AVMBlend[] } {
  const blends: AVMBlend[] = [];
  let totalWeight = 0;
  let weightedSum = 0;
  
  const zillowVal = safeNum(avmBaselines.zillowZestimate);
  if (zillowVal > 0) {
    blends.push({ source: "Zillow", value: zillowVal, weight: AVM_WEIGHTS.zillow });
    weightedSum += zillowVal * AVM_WEIGHTS.zillow;
    totalWeight += AVM_WEIGHTS.zillow;
  }
  
  const redfinVal = safeNum(avmBaselines.redfinEstimate);
  if (redfinVal > 0) {
    blends.push({ source: "Redfin", value: redfinVal, weight: AVM_WEIGHTS.redfin });
    weightedSum += redfinVal * AVM_WEIGHTS.redfin;
    totalWeight += AVM_WEIGHTS.redfin;
  }
  
  if (avmBaselines.otherAVMs) {
    const otherWeight = safeDivide(AVM_WEIGHTS.other, Math.max(1, avmBaselines.otherAVMs.length), 0);
    for (const avm of avmBaselines.otherAVMs) {
      const avmVal = safeNum(avm.value);
      if (avmVal > 0) {
        blends.push({ source: avm.name, value: avmVal, weight: otherWeight });
        weightedSum += avmVal * otherWeight;
        totalWeight += otherWeight;
      }
    }
  }
  
  if (totalWeight === 0) {
    return { blendedValue: 0, blends: [] };
  }
  
  const normalizedBlends = blends.map(b => ({
    ...b,
    weight: safeDivide(b.weight, totalWeight, 0),
  }));
  
  const blendedValue = safeDivide(weightedSum, totalWeight, 0);
  
  return {
    blendedValue: Math.max(0, Math.round(blendedValue)),
    blends: normalizedBlends,
  };
}

export function calculateConfidenceScore(
  property: PropertyInfo,
  avmBaselines: AVMBaselines,
  publicInfo: PublicInfo
): { score: number; missingData: string[] } {
  const missingData: string[] = [];
  let score = 50;
  
  if (property.sqft && property.sqft > 0) {
    score += 10;
  } else {
    missingData.push("Square footage");
  }
  
  if (property.beds !== undefined) {
    score += 5;
  } else {
    missingData.push("Bedrooms");
  }
  
  if (property.baths !== undefined) {
    score += 5;
  } else {
    missingData.push("Bathrooms");
  }
  
  if (property.yearBuilt) {
    score += 5;
  } else {
    missingData.push("Year built");
  }
  
  if (property.conditionScore !== undefined) {
    score += 8;
  } else {
    missingData.push("Condition score");
  }
  
  const hasAVM = avmBaselines.zillowZestimate || avmBaselines.redfinEstimate || 
    (avmBaselines.otherAVMs && avmBaselines.otherAVMs.length > 0);
  if (hasAVM) {
    score += 12;
  } else {
    missingData.push("AVM estimates (Zillow/Redfin)");
  }
  
  if (publicInfo.taxAssessedValue) {
    score += 5;
  }
  
  if (publicInfo.lastSalePrice) {
    score += 5;
  }
  
  if (property.knownIssues && property.knownIssues.trim().length > 10) {
    score += 3;
  }
  
  return {
    score: Math.min(100, Math.max(0, score)),
    missingData,
  };
}

export function calculateUnderwriting(
  property: PropertyInfo,
  seller: SellerInfo,
  publicInfo: PublicInfo,
  avmBaselines: AVMBaselines,
  manualAsIsEstimate?: number
): UnderwritingOutput {
  const { blendedValue, blends } = calculateAVMBlend(avmBaselines);
  const { score: confidenceScore, missingData } = calculateConfidenceScore(property, avmBaselines, publicInfo);
  
  const safeManualAsIs = safeNum(manualAsIsEstimate);
  const baselineValue = blendedValue > 0 ? blendedValue : Math.max(0, safeManualAsIs);
  
  const conditionScore = clamp(safeNum(property.conditionScore, 5), 0, 10);
  const rehabPerSqft = getRehabPerSqft(conditionScore);
  const sqft = Math.max(1, safeNum(property.sqft, 1500));
  const repairBase = sqft * rehabPerSqft;
  
  const systemFailures = property.knownIssues ? detectSystemFailures(property.knownIssues) : [];
  const systemAdders = calculateSystemAdders(systemFailures);
  
  const repairLow = Math.round(repairBase * 0.8 + systemAdders.low);
  const repairHigh = Math.round(repairBase * 1.2 + systemAdders.high);
  
  let marketabilityDiscountPct = 0;
  if (conditionScore <= 3) marketabilityDiscountPct = 0.08;
  else if (conditionScore <= 5) marketabilityDiscountPct = 0.05;
  else if (conditionScore <= 7) marketabilityDiscountPct = 0.02;
  
  if (systemFailures.length >= 2) marketabilityDiscountPct += 0.03;
  
  const marketabilityDiscount = Math.round(baselineValue * marketabilityDiscountPct);
  
  const asIsBase = Math.max(0, Math.round(baselineValue - repairBase - marketabilityDiscount));
  
  const spreadFactor = confidenceScore >= 80 ? 0.05 : confidenceScore >= 60 ? 0.10 : 0.15;
  const asIsLow = Math.max(0, Math.round(asIsBase * (1 - spreadFactor)));
  const asIsHigh = Math.round(asIsBase * (1 + spreadFactor));
  
  const drivers: string[] = [];
  if (blendedValue > 0) {
    drivers.push(`AVM blend baseline: $${blendedValue.toLocaleString()}`);
  }
  if (conditionScore <= 5) {
    drivers.push(`Condition score (${conditionScore}/10) indicates significant repairs needed`);
  }
  if (systemFailures.length > 0) {
    drivers.push(`System issues detected: ${systemFailures.join(", ")}`);
  }
  if (marketabilityDiscount > 0) {
    drivers.push(`Marketability discount applied: $${marketabilityDiscount.toLocaleString()}`);
  }
  if (property.sqft) {
    drivers.push(`Property size: ${property.sqft.toLocaleString()} sqft`);
  }
  
  return {
    asIsLow,
    asIsBase,
    asIsHigh,
    repairLow,
    repairBase: Math.round(repairBase),
    repairHigh,
    confidenceScore,
    drivers: drivers.slice(0, 5),
    missingData,
    avmBlendUsed: blends,
    marketabilityDiscount,
  };
}
