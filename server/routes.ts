import type { Express } from "express";
import { createServer, type Server } from "http";
import { callLLM, callLLMWithJSON } from "./lib/llm";
import { aiQuestionRequestSchema, aiNegotiationRequestSchema, compsRequestSchema, questionsConfig, type NegotiationPlan, type CompsData, type ComparableSale } from "@shared/schema";
import { fromError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/ai/question", async (req, res) => {
    try {
      const parseResult = aiQuestionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.toString() });
      }

      const { questionId, answers, derived } = parseResult.data;
      
      const question = questionsConfig.find((q) => q.id === questionId);
      if (!question || !question.aiModule) {
        return res.status(404).json({ error: "Question or AI module not found" });
      }

      let prompt = question.aiModule.promptTemplate;
      
      for (const key of question.aiModule.inputKeys) {
        const value = key === "sellerOffer" 
          ? derived.sellerOffer.toString()
          : String(answers[key] ?? "Not provided");
        prompt = prompt.replace(`{${key}}`, value);
      }

      prompt = `Context: Real estate deal underwriting interview.
Question being analyzed: "${question.label}"

${prompt}

Provide a concise, actionable analysis (2-3 paragraphs max). Focus on practical insights the acquisitions rep can use immediately.`;

      const analysis = await callLLM(prompt);

      res.json({ analysis });
    } catch (error) {
      console.error("Question AI error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate AI analysis" 
      });
    }
  });

  app.post("/api/ai/negotiation", async (req, res) => {
    try {
      const parseResult = aiNegotiationRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.toString() });
      }

      const { answers, derived, assignmentFee } = parseResult.data;

      const prompt = `Generate a comprehensive negotiation plan for a real estate acquisition based on the following seller interview data.

SELLER INTERVIEW DATA:
- Timeline to sell: ${answers.timeline || "Not specified"}
- Motivation for selling: ${answers.motivation || "Not specified"}
- Property condition score: ${answers.conditionScore || "Not specified"}/10
- Improvements needed: ${answers.improvementsNeeded || "Not specified"}
- Outside improvements (3yr): ${answers.outsideImprovements || "Not specified"}
- Inside improvements (3yr): ${answers.insideImprovements || "Not specified"}
- Has central HVAC: ${answers.hasHVAC ? "Yes" : "No"}
${answers.hasHVAC ? `- HVAC age: ${answers.hvacAge || "Unknown"} years` : ""}
- Failed systems: ${answers.failedSystems || "None reported"}
- Amount owed: $${answers.amountOwed || 0}
- Monthly PITI: $${answers.pitiPayment || 0}
- Interest rate: ${answers.interestRate || 0}%
- Profit needed: $${answers.neededProfit || 0}
- Seller's ARV estimate: $${answers.sellerARV || 0}

UNDERWRITING CALCULATIONS:
- Your ARV: $${answers.arv || 0}
- Square footage: ${answers.sqft || 0} sqft
- Rehab estimate: $${derived.rehabEstimate} ($${derived.rehabPerSqft}/sqft)
- Investor buy price: $${derived.investorBuyPrice}
- Assignment fee: $${assignmentFee}
- Seller offer: $${derived.sellerOffer}
- Equity at offer: $${derived.equityAtOffer}
- Expectation gap: $${derived.expectationGap} (seller expects ${derived.expectationGap > 0 ? "more" : "less"} than your ARV)

RISK FLAGS:
${derived.riskFlags.length > 0 ? derived.riskFlags.map(f => `- [${f.severity.toUpperCase()}] ${f.message}`).join("\n") : "- No significant risks identified"}

Generate a JSON response with the following structure:
{
  "sellerSummary": "A 2-3 sentence summary of the seller's situation and key characteristics",
  "motivationHypotheses": [
    { "hypothesis": "Specific motivation hypothesis based on data", "confidence": "low|medium|high" }
  ],
  "discCues": [
    { 
      "style": "D|I|S|C", 
      "confidence": "low|medium|high",
      "communicationTips": ["Specific tip 1", "Specific tip 2", "Specific tip 3"]
    }
  ],
  "sixNeedsMapping": [
    { "need": "Certainty|Variety|Significance|Connection|Growth|Contribution", "relevance": "low|medium|high", "approach": "How to address this need" }
  ],
  "followUpQuestions": ["Question 1", "Question 2", ... (8-12 questions)],
  "offerFraming": {
    "softApproach": "A conversational script for presenting the offer gently",
    "directApproach": "A more direct script for presenting the offer"
  },
  "objectionHandling": [
    { "objection": "Expected objection about price/timeline/trust", "response": "How to address it ethically" }
  ],
  "nextSteps": ["Action item 1", "Action item 2", ... (4-6 steps)]
}

IMPORTANT: 
- All DISC and motivation assessments are HYPOTHESES, not diagnoses
- Include suggestions for confirming questions
- Focus on building rapport and transparency
- Avoid manipulative or high-pressure tactics`;

      const defaultPlan: NegotiationPlan = {
        sellerSummary: "The seller's situation requires further clarification through direct conversation. Use the interview data collected to understand their priorities and constraints better.",
        motivationHypotheses: [
          { hypothesis: "Financial pressure may be a factor based on the selling timeline", confidence: "medium" },
          { hypothesis: "Property condition suggests deferred maintenance, possibly due to circumstances", confidence: "low" },
        ],
        discCues: [
          {
            style: "S",
            confidence: "low",
            communicationTips: [
              "Take time to build rapport before discussing numbers",
              "Provide reassurance about the process",
              "Follow up consistently as promised",
            ],
          },
        ],
        sixNeedsMapping: [
          { need: "Certainty", relevance: "high", approach: "Emphasize the reliability of a cash offer with guaranteed closing" },
          { need: "Significance", relevance: "medium", approach: "Acknowledge the value of their property and their care for it" },
          { need: "Connection", relevance: "medium", approach: "Build genuine rapport and show you understand their situation" },
        ],
        followUpQuestions: [
          "What would an ideal outcome look like for you in this sale?",
          "Are there any specific concerns about the selling process we should address?",
          "What's driving your timeline preference?",
          "Have you considered what you'll do after the sale?",
          "Is there anything about the property you'd want a new owner to know?",
          "What has your experience been with the property over the years?",
          "Are there any family members or advisors involved in this decision?",
          "What questions do you have about how our process works?",
        ],
        offerFraming: {
          softApproach: "Based on everything we've discussed, and considering the current market and the work the property needs, I've put together some numbers. Before I share them, I want to make sure I understand your situation fully. Does [offer amount] work for your needs? If not, let's talk about what would.",
          directApproach: "I've analyzed the property and the market carefully. Based on comparable sales, the repairs needed, and our buying criteria, I can offer [offer amount]. This is a cash offer with no contingencies, and we can close on your timeline. What are your thoughts?",
        },
        objectionHandling: [
          {
            objection: "That's less than I was hoping for",
            response: "I understand. Let me walk you through how we arrived at this number, and let's see if there are ways we can bridge the gap. What number were you thinking would work?",
          },
          {
            objection: "I need to think about it",
            response: "Absolutely, this is a big decision. Take all the time you need. Is there any specific information I can provide that would help you make your decision? I'm happy to answer any questions.",
          },
          {
            objection: "How do I know I can trust you?",
            response: "That's a fair question. I can share references from other sellers we've worked with, and I'm happy to explain our process in detail so you know exactly what to expect at each step.",
          },
        ],
        nextSteps: [
          "Schedule a follow-up call to address any remaining questions",
          "Provide written offer with clear terms and timeline",
          "Share references or testimonials if requested",
          "Confirm their preferred communication method and frequency",
          "Set clear expectations for next steps in the process",
        ],
      };

      const plan = await callLLMWithJSON<NegotiationPlan>(prompt, defaultPlan);

      res.json({ plan });
    } catch (error) {
      console.error("Negotiation AI error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate negotiation plan" 
      });
    }
  });

  app.post("/api/comps", async (req, res) => {
    try {
      const parseResult = compsRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.toString() });
      }

      const { address } = parseResult.data;
      const apiKey = process.env.RENTCAST_API_KEY;

      if (!apiKey) {
        return res.status(503).json({ 
          error: "Comparable sales API not configured. Please add a RentCast API key.",
          needsApiKey: true
        });
      }

      const encodedAddress = encodeURIComponent(address);
      const compsUrl = `https://api.rentcast.io/v1/sales/comparables?address=${encodedAddress}&limit=10&radius=1&daysOld=180`;
      
      const response = await fetch(compsUrl, {
        headers: {
          "X-Api-Key": apiKey,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("RentCast API error:", response.status, errorText);
        
        if (response.status === 401) {
          return res.status(401).json({ error: "Invalid API key" });
        }
        if (response.status === 404) {
          return res.status(404).json({ error: "No comparable sales found for this address" });
        }
        return res.status(response.status).json({ error: "Failed to fetch comparable sales" });
      }

      const data = await response.json();
      
      const comps: ComparableSale[] = (data.comparables || []).map((comp: any) => ({
        address: comp.formattedAddress || comp.address || "Unknown",
        price: comp.price || comp.lastSalePrice || 0,
        sqft: comp.squareFootage || 0,
        pricePerSqft: comp.squareFootage ? Math.round((comp.price || comp.lastSalePrice || 0) / comp.squareFootage) : 0,
        bedrooms: comp.bedrooms || 0,
        bathrooms: comp.bathrooms || 0,
        yearBuilt: comp.yearBuilt || 0,
        soldDate: comp.lastSaleDate || comp.saleDate || "Unknown",
        distanceMiles: comp.distance || 0,
        daysOnMarket: comp.daysOnMarket,
        propertyType: comp.propertyType
      }));

      const validComps = comps.filter(c => c.price > 0 && c.sqft > 0);
      const prices = validComps.map(c => c.price);
      const pricesPerSqft = validComps.map(c => c.pricePerSqft);
      
      const avgPricePerSqft = pricesPerSqft.length > 0 
        ? Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length) 
        : 0;
      
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const medianPrice = sortedPrices.length > 0
        ? sortedPrices[Math.floor(sortedPrices.length / 2)]
        : 0;
      
      const suggestedARV = validComps.length >= 3
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : medianPrice;

      const compsData: CompsData = {
        comps: validComps,
        subjectProperty: data.property ? {
          address: data.property.formattedAddress || address,
          estimatedValue: data.property.estimatedValue,
          sqft: data.property.squareFootage,
          bedrooms: data.property.bedrooms,
          bathrooms: data.property.bathrooms,
          yearBuilt: data.property.yearBuilt,
          lotSize: data.property.lotSize
        } : undefined,
        avgPricePerSqft,
        medianPrice,
        suggestedARV
      };

      res.json(compsData);
    } catch (error) {
      console.error("Comps API error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch comparable sales" 
      });
    }
  });

  return httpServer;
}
