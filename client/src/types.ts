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
  arv: number;
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
  profitPct: number;
  closingCostPct: number;
  assignmentFee: number;
  targetRulePct: number;
  closingCosts: number;
  holdingBuffer: number;
  holdingBufferType: "pct" | "dollar";
  riskBuffer: number;
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

export interface CompLink {
  id: string;
  url: string;
  label?: string;
}

export interface PresentationInput {
  callNotes: CallNote[];
  transcriptPaste?: string;
  keySellerConstraints: string[];
  preferredCommunication?: "call" | "text" | "email";
  tonePreference?: "professional" | "casual";
  priorOffers?: string;
  compLinks?: CompLink[];
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

export interface SellerComp {
  url: string;
  source: "zillow" | "redfin" | "realtor" | "other";
  address: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  imageUrl: string;
  notes: string;
  soldDate: string;
}

export interface SellerBenefit {
  title: string;
  description: string;
}

export interface SellerPresentationSettings {
  customOfferPrice: number;
  useCustomOfferPrice: boolean;
  benefits: SellerBenefit[];
  sellerComps: SellerComp[];
  personalMessage: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  closingTimeline: string;
  earnestMoneyDeposit: string;
  additionalTerms: string;
}

export const DEFAULT_SELLER_BENEFITS: SellerBenefit[] = [
  {
    title: "Buy As-Is",
    description: "No repairs, cleaning, or renovations needed. We purchase your property in its current condition so you can skip the hassle and expense of fixing it up.",
  },
  {
    title: "No Hidden Fees",
    description: "Zero commissions, no closing costs on your end, and no surprise charges. The offer you accept is the amount you walk away with.",
  },
  {
    title: "We Help You Move",
    description: "We coordinate and cover moving assistance to make your transition as smooth as possible. Just pack your personal items and we handle the rest.",
  },
];

export const DEFAULT_SELLER_PRESENTATION: SellerPresentationSettings = {
  customOfferPrice: 0,
  useCustomOfferPrice: false,
  benefits: DEFAULT_SELLER_BENEFITS.map(b => ({ ...b })),
  sellerComps: [],
  personalMessage: "",
  companyName: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  closingTimeline: "14-21 days",
  earnestMoneyDeposit: "",
  additionalTerms: "",
};

export interface DealState {
  property: PropertyInfo;
  seller: SellerInfo;
  publicInfo: PublicInfo;
  avmBaselines: AVMBaselines;
  offerSettings: OfferSettings;
  presentationInput: PresentationInput;
  sellerPresentation: SellerPresentationSettings;
  underwritingOutput?: UnderwritingOutput;
  offerOutput?: OfferOutput;
  presentationOutput?: PresentationOutput;
}

export const DEFAULT_OFFER_SETTINGS: OfferSettings = {
  strategy: "wholesale",
  profitPct: 20,
  closingCostPct: 8,
  assignmentFee: 15000,
  targetRulePct: 70,
  closingCosts: 5000,
  holdingBuffer: 3000,
  holdingBufferType: "dollar",
  riskBuffer: 5000,
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

export interface ComparableSale {
  address: string;
  price: number;
  sqft: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  soldDate: string;
  distanceMiles: number;
  daysOnMarket?: number;
  propertyType?: string;
  latitude?: number;
  longitude?: number;
  correlation?: number;
  photoUrl?: string;
}

export interface CompsData {
  comps: ComparableSale[];
  subjectProperty?: {
    address: string;
    estimatedValue?: number;
    sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    yearBuilt?: number;
    lotSize?: number;
    latitude?: number;
    longitude?: number;
  };
  avgPricePerSqft: number;
  medianPrice: number;
  suggestedARV: number;
}

export interface UserComp {
  id: string;
  address: string;
  price: number;
  sqft: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
  soldDate?: string;
  distanceMiles?: number;
  sourceUrl?: string;
  notes?: string;
}

export interface UserCompsState {
  comps: UserComp[];
  confidenceScore: number;
  suggestedARV: number;
}
