export interface PropertyInfo {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  propertyType?: "single_family" | "multi_family" | "condo" | "townhouse" | "land" | "commercial" | "other";
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  occupancy?: "vacant" | "tenant" | "owner" | "unknown";
  conditionScore?: number;
  improvementsNeeded?: string;
  knownIssues?: string;
  hvacCentral?: boolean;
  hvacAgeYears?: number;
  roofAgeYears?: number;
  notes?: string;
}

export interface SellerInfo {
  timelineToSell?: string;
  reasonForSelling?: string;
  owed?: number;
  pitiMonthly?: number;
  interestRatePct?: number;
  neededProfit?: number;
  sellerThinksAs10Value?: number;
  decisionMakers?: string;
  objectionsHeard?: string;
}

export interface PublicInfo {
  lastSaleDate?: string;
  lastSalePrice?: number;
  taxAssessedValue?: number;
  neighborhoodName?: string;
}

export interface AVMBaselines {
  zillowZestimate?: number;
  zillowDate?: string;
  redfinEstimate?: number;
  redfinDate?: string;
  otherAVMs?: Array<{ name: string; value: number; date?: string }>;
}

export interface AVMBlend {
  source: string;
  value: number;
  weight: number;
}

export interface UnderwritingOutput {
  asIsLow: number;
  asIsBase: number;
  asIsHigh: number;
  repairLow: number;
  repairBase: number;
  repairHigh: number;
  confidenceScore: number;
  drivers: string[];
  missingData: string[];
  avmBlendUsed: AVMBlend[];
  marketabilityDiscount: number;
}

export interface OfferSettings {
  strategy: "wholesale" | "flip" | "rental";
  targetRulePct: number;
  closingCosts: number;
  holdingBuffer: number;
  holdingBufferType: "pct" | "dollar";
  riskBuffer: number;
  assignmentFee: number;
  desiredProfit: number;
  marketCoolingFactorPct: number;
  liquidityScore?: number;
}

export interface OfferLadderItem {
  name: string;
  price: number;
  useWhen: string;
}

export interface OfferOutput {
  investorBuyPrice: number;
  sellerOffer: number;
  offerLadder: OfferLadderItem[];
  sensitivity: string[];
  dealGrade: "A" | "B" | "C" | "D";
  margin: number;
  marginPct: number;
}

export interface CallNote {
  id: string;
  date: string;
  text: string;
}

export interface PresentationInput {
  callNotes: CallNote[];
  transcriptPaste?: string;
  keySellerConstraints: string[];
  preferredCommunication?: "call" | "text" | "email";
  tonePreference?: "professional" | "casual";
  priorOffers?: string;
}

export interface PresentationOutput {
  sellerSummary: string;
  motivationHypotheses: Array<{ hypothesis: string; confidence: "high" | "medium" | "low" }>;
  communicationCues: string[];
  sixNeedsMapping: Array<{ need: string; hypothesis: string }>;
  recommendedOfferTier: "fast_yes" | "fair" | "stretch";
  offerPackagingPlan: string;
  talkTrackSoft: string;
  talkTrackDirect: string;
  objectionHandling: string[];
  nextActions: string[];
  followUpCadence: string;
}

export interface DealState {
  property: PropertyInfo;
  seller: SellerInfo;
  publicInfo: PublicInfo;
  avmBaselines: AVMBaselines;
  offerSettings: OfferSettings;
  presentationInput: PresentationInput;
  underwritingOutput?: UnderwritingOutput;
  offerOutput?: OfferOutput;
  presentationOutput?: PresentationOutput;
}

export const DEFAULT_OFFER_SETTINGS: OfferSettings = {
  strategy: "wholesale",
  targetRulePct: 70,
  closingCosts: 5000,
  holdingBuffer: 3000,
  holdingBufferType: "dollar",
  riskBuffer: 5000,
  assignmentFee: 15000,
  desiredProfit: 20000,
  marketCoolingFactorPct: 0,
};

export const CONDITION_REHAB_MAP: Record<string, number> = {
  "9-10": 8,
  "7-8": 15,
  "5-6": 28,
  "3-4": 45,
  "0-2": 70,
};

export const SYSTEM_FAILURE_ADDERS: Record<string, { low: number; high: number }> = {
  hvac: { low: 4000, high: 8000 },
  roof: { low: 5000, high: 15000 },
  plumbing: { low: 3000, high: 10000 },
  electrical: { low: 2000, high: 8000 },
  foundation: { low: 8000, high: 25000 },
  waterproofing: { low: 3000, high: 12000 },
};

export const AVM_WEIGHTS = {
  zillow: 0.45,
  redfin: 0.35,
  other: 0.20,
};
