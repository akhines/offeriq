import { z } from "zod";

export type QuestionType = "text" | "textarea" | "number" | "boolean" | "scale" | "select";

export interface QuestionConfig {
  id: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  visibilityRule?: {
    dependsOn: string;
    condition: "equals" | "notEquals" | "greaterThan" | "lessThan";
    value: string | number | boolean;
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
  category: "interview" | "underwriting";
  derivedField?: {
    formula: string;
    label: string;
  };
  aiModule?: {
    buttonLabel: string;
    promptTemplate: string;
    inputKeys: string[];
  };
}

export const questionsConfig: QuestionConfig[] = [
  {
    id: "propertyAddress",
    label: "Property Address",
    type: "text",
    placeholder: "123 Main St, City, State ZIP",
    helpText: "Enter the full property address to pull comparable sales",
    required: true,
    category: "interview",
  },
  {
    id: "timeline",
    label: "How soon do you want to sell?",
    type: "select",
    placeholder: "Select timeline",
    helpText: "Understanding urgency helps tailor the offer approach",
    category: "interview",
    options: [
      { label: "Immediately (ASAP)", value: "asap" },
      { label: "Within 30 days", value: "30days" },
      { label: "1-3 months", value: "1-3months" },
      { label: "3-6 months", value: "3-6months" },
      { label: "6+ months / Flexible", value: "flexible" },
    ],
    aiModule: {
      buttonLabel: "Analyze Timeline",
      promptTemplate: "Analyze the seller's timeline of '{timeline}'. What does this suggest about their motivation level and how should we approach the conversation?",
      inputKeys: ["timeline"],
    },
  },
  {
    id: "motivation",
    label: "Why do you want to sell?",
    type: "textarea",
    placeholder: "Describe the reason for selling...",
    helpText: "Understanding motivation helps identify the best approach",
    category: "interview",
    aiModule: {
      buttonLabel: "Analyze Motivation",
      promptTemplate: "Analyze this seller's motivation for selling: '{motivation}'. Identify key emotional drivers, potential objections, and suggest rapport-building approaches.",
      inputKeys: ["motivation"],
    },
  },
  {
    id: "conditionScore",
    label: "Condition score (0-10)",
    type: "scale",
    helpText: "0 = needs complete renovation, 10 = move-in ready",
    category: "interview",
    validation: { min: 0, max: 10 },
    defaultValue: 5,
    derivedField: {
      formula: "rehabPerSqft",
      label: "Est. rehab $/sqft",
    },
  },
  {
    id: "improvementsNeeded",
    label: "What improvements would make it a 10?",
    type: "textarea",
    placeholder: "List needed improvements...",
    helpText: "Be specific about repairs and upgrades needed",
    category: "interview",
    aiModule: {
      buttonLabel: "Generate Scope",
      promptTemplate: "Based on these needed improvements: '{improvementsNeeded}', create a preliminary rehab scope checklist with estimated priority levels (critical/important/nice-to-have).",
      inputKeys: ["improvementsNeeded"],
    },
  },
  {
    id: "outsideImprovements",
    label: "Outside improvements in last 3 years?",
    type: "textarea",
    placeholder: "Roof, windows, siding, landscaping...",
    helpText: "Roof, windows, siding, landscaping, etc.",
    category: "interview",
  },
  {
    id: "insideImprovements",
    label: "Inside improvements in last 3 years?",
    type: "textarea",
    placeholder: "Kitchen, bathrooms, flooring...",
    helpText: "Kitchen, bathrooms, flooring, HVAC, etc.",
    category: "interview",
  },
  {
    id: "hasHVAC",
    label: "Is there central HVAC?",
    type: "boolean",
    helpText: "Central heating and air conditioning system",
    category: "interview",
    defaultValue: true,
  },
  {
    id: "hvacAge",
    label: "HVAC age (years)",
    type: "number",
    placeholder: "Age in years",
    helpText: "Age of the HVAC system",
    category: "interview",
    visibilityRule: {
      dependsOn: "hasHVAC",
      condition: "equals",
      value: true,
    },
    validation: { min: 0, max: 50 },
    derivedField: {
      formula: "hvacRisk",
      label: "HVAC Risk",
    },
  },
  {
    id: "failedSystems",
    label: "Any failed systems currently?",
    type: "textarea",
    placeholder: "HVAC, plumbing, electrical, roof, waterproofing, basement...",
    helpText: "List any non-functioning or failing major systems",
    category: "interview",
    aiModule: {
      buttonLabel: "Assess Risk",
      promptTemplate: "Assess the risk level of these failed systems: '{failedSystems}'. Provide estimated repair costs ranges and urgency levels.",
      inputKeys: ["failedSystems"],
    },
  },
  {
    id: "amountOwed",
    label: "How much do you owe?",
    type: "number",
    placeholder: "$0",
    helpText: "Total mortgage balance",
    category: "interview",
    validation: { min: 0 },
  },
  {
    id: "pitiPayment",
    label: "What's your PITI payment?",
    type: "number",
    placeholder: "$0/mo",
    helpText: "Principal, Interest, Taxes, Insurance monthly payment",
    category: "interview",
    validation: { min: 0 },
  },
  {
    id: "interestRate",
    label: "What's your interest rate?",
    type: "number",
    placeholder: "0.0%",
    helpText: "Current mortgage interest rate",
    category: "interview",
    validation: { min: 0, max: 30 },
  },
  {
    id: "neededProfit",
    label: "How much profit do you need to realize?",
    type: "number",
    placeholder: "$0",
    helpText: "Minimum net proceeds needed from sale",
    category: "interview",
    validation: { min: 0 },
    aiModule: {
      buttonLabel: "Handle Objection",
      promptTemplate: "The seller needs ${neededProfit} in profit. They owe ${amountOwed}. Our projected offer is around ${sellerOffer}. Suggest objection handling approaches if there's a gap.",
      inputKeys: ["neededProfit", "amountOwed", "sellerOffer"],
    },
  },
  {
    id: "sellerARV",
    label: "What do you think it can sell for as a 10/10?",
    type: "number",
    placeholder: "$0",
    helpText: "Seller's perceived after-repair value",
    category: "interview",
    validation: { min: 0 },
  },
  {
    id: "sqft",
    label: "Property square footage",
    type: "number",
    placeholder: "0 sqft",
    helpText: "Total living area in square feet",
    category: "underwriting",
    validation: { min: 0 },
    required: true,
  },
  {
    id: "arv",
    label: "Your ARV from comps",
    type: "number",
    placeholder: "$0",
    helpText: "After-repair value based on comparable sales",
    category: "underwriting",
    validation: { min: 0 },
    required: true,
  },
  {
    id: "closingCosts",
    label: "Estimated closing/transaction costs",
    type: "number",
    placeholder: "$0",
    helpText: "Total closing costs for both transactions",
    category: "underwriting",
    validation: { min: 0 },
    defaultValue: 5000,
  },
  {
    id: "holdingBuffer",
    label: "Holding buffer",
    type: "number",
    placeholder: "1% of ARV",
    helpText: "Buffer for holding costs, typically 1% of ARV",
    category: "underwriting",
    validation: { min: 0 },
  },
  {
    id: "investorRule",
    label: "Target investor rule %",
    type: "number",
    placeholder: "70%",
    helpText: "Percentage of ARV for investor buy price (e.g., 70%)",
    category: "underwriting",
    validation: { min: 0, max: 100 },
    defaultValue: 70,
  },
  {
    id: "rehabOverride",
    label: "Rehab override",
    type: "number",
    placeholder: "Leave blank to auto-calculate",
    helpText: "Override the auto-calculated rehab estimate",
    category: "underwriting",
    validation: { min: 0 },
  },
];

export type Answers = Record<string, string | number | boolean | undefined>;

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
  };
  avgPricePerSqft: number;
  medianPrice: number;
  suggestedARV: number;
}

export const compsRequestSchema = z.object({
  address: z.string().min(5, "Please enter a valid address"),
  propertyType: z.string().optional(),
});

export type CompsRequest = z.infer<typeof compsRequestSchema>;

export interface DerivedOutputs {
  rehabPerSqft: number;
  rehabEstimate: number;
  investorBuyPrice: number;
  sellerOffer: number;
  equityAtOffer: number;
  holdingBufferAmount: number;
  riskFlags: RiskFlag[];
  expectationGap: number;
}

export interface RiskFlag {
  type: "hvac" | "systems" | "expectation" | "equity";
  severity: "low" | "medium" | "high";
  message: string;
}

export const conditionToRehabPerSqft: Record<number, number> = {
  0: 75,
  1: 65,
  2: 55,
  3: 48,
  4: 40,
  5: 32,
  6: 25,
  7: 18,
  8: 12,
  9: 6,
  10: 0,
};

export const aiQuestionRequestSchema = z.object({
  questionId: z.string(),
  answers: z.record(z.union([z.string(), z.number(), z.boolean(), z.undefined()])),
  derived: z.object({
    rehabPerSqft: z.number(),
    rehabEstimate: z.number(),
    investorBuyPrice: z.number(),
    sellerOffer: z.number(),
    equityAtOffer: z.number(),
    holdingBufferAmount: z.number(),
    riskFlags: z.array(z.object({
      type: z.enum(["hvac", "systems", "expectation", "equity"]),
      severity: z.enum(["low", "medium", "high"]),
      message: z.string(),
    })),
    expectationGap: z.number(),
  }),
});

export type AiQuestionRequest = z.infer<typeof aiQuestionRequestSchema>;

export const aiNegotiationRequestSchema = z.object({
  answers: z.record(z.union([z.string(), z.number(), z.boolean(), z.undefined()])),
  derived: z.object({
    rehabPerSqft: z.number(),
    rehabEstimate: z.number(),
    investorBuyPrice: z.number(),
    sellerOffer: z.number(),
    equityAtOffer: z.number(),
    holdingBufferAmount: z.number(),
    riskFlags: z.array(z.object({
      type: z.enum(["hvac", "systems", "expectation", "equity"]),
      severity: z.enum(["low", "medium", "high"]),
      message: z.string(),
    })),
    expectationGap: z.number(),
  }),
  assignmentFee: z.number(),
});

export type AiNegotiationRequest = z.infer<typeof aiNegotiationRequestSchema>;

export interface NegotiationPlan {
  sellerSummary: string;
  motivationHypotheses: Array<{
    hypothesis: string;
    confidence: "low" | "medium" | "high";
  }>;
  discCues: Array<{
    style: "D" | "I" | "S" | "C";
    confidence: "low" | "medium" | "high";
    communicationTips: string[];
  }>;
  sixNeedsMapping: Array<{
    need: "Certainty" | "Variety" | "Significance" | "Connection" | "Growth" | "Contribution";
    relevance: "low" | "medium" | "high";
    approach: string;
  }>;
  followUpQuestions: string[];
  offerFraming: {
    softApproach: string;
    directApproach: string;
  };
  objectionHandling: Array<{
    objection: string;
    response: string;
  }>;
  nextSteps: string[];
}

export * from "./models/chat";

export { users, insertUserSchema } from "./models/users";
export type { InsertUser, User } from "./models/users";

// Saved Presentations schema
export const savedPresentationSchema = z.object({
  id: z.string(),
  propertyAddress: z.string(),
  createdAt: z.string(),
  pdfPath: z.string(),
  presentationData: z.any(),
});

export type SavedPresentation = z.infer<typeof savedPresentationSchema>;

export const createPresentationSchema = z.object({
  propertyAddress: z.string(),
  presentationData: z.any(),
  pdfBase64: z.string(),
});
