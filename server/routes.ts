import type { Express } from "express";
import { createServer, type Server } from "http";
import { callLLM, callLLMWithJSON } from "./lib/llm";
import { aiQuestionRequestSchema, aiNegotiationRequestSchema, compsRequestSchema, questionsConfig, createPresentationSchema, type NegotiationPlan, type CompsData, type ComparableSale, savedDeals, insertSavedDealSchema, savedPresentations, userPreferences, users, sharedOffers } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";

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

  app.post("/api/ai/presentation", async (req, res) => {
    try {
      const { seller, presentationInput, underwriting, offer } = req.body;
      
      if (!underwriting || !offer) {
        return res.status(400).json({ error: "Underwriting and offer data required" });
      }

      const constraints: string[] = [];
      if (seller?.timelineToSell) constraints.push(`Timeline: ${seller.timelineToSell}`);
      if (seller?.reasonForSelling) constraints.push(`Reason: ${seller.reasonForSelling}`);
      if (seller?.neededProfit) constraints.push(`Needed profit: $${seller.neededProfit}`);
      if (seller?.objectionsHeard) constraints.push(`Objections: ${seller.objectionsHeard}`);

      const notesText = (presentationInput?.callNotes || [])
        .map((n: any) => `[${n.date}] ${n.text}`)
        .join("\n\n");

      const ladderText = (offer.offerLadder || [])
        .map((l: any) => `- ${l.name}: $${l.price?.toLocaleString()} (${l.useWhen})`)
        .join("\n");

      const prompt = `You are an ethical real estate advisor helping prepare an offer presentation plan.

## ETHICAL GUARDRAILS (MANDATORY)
- NO deception, coercion, threats, pressure tactics, or manipulation
- Treat all DISC and Tony Robbins 6 Human Needs assessments as HYPOTHESES, not diagnoses
- Provide confirming questions to validate hypotheses
- Focus on clarity, rapport, options, and alignment with seller's genuine interests

## UNDERWRITING CONTEXT
- As-Is Value Range: $${underwriting.asIsLow?.toLocaleString()} - $${underwriting.asIsHigh?.toLocaleString()} (base: $${underwriting.asIsBase?.toLocaleString()})
- Repairs: $${underwriting.repairLow?.toLocaleString()} - $${underwriting.repairHigh?.toLocaleString()}
- Confidence: ${underwriting.confidenceScore}%

## OFFER DETAILS
${ladderText}
- Deal Grade: ${offer.dealGrade}
- Margin: $${offer.margin?.toLocaleString()} (${offer.marginPct?.toFixed(1)}%)

## SELLER CONSTRAINTS
${constraints.length > 0 ? constraints.join("\n") : "None provided"}

## CALL NOTES
${notesText || presentationInput?.transcriptPaste || "No notes provided"}

## PREFERENCES
- Communication: ${presentationInput?.preferredCommunication || "Not specified"}
- Tone: ${presentationInput?.tonePreference || "Professional"}

Generate a JSON response with this structure:
{
  "sellerSummary": "2-3 sentence summary",
  "motivationHypotheses": [{"hypothesis": "...", "confidence": "high|medium|low"}],
  "communicationCues": ["DISC-style cue 1", "cue 2"],
  "sixNeedsMapping": [{"need": "Certainty|Variety|Significance|Connection|Growth|Contribution", "hypothesis": "..."}],
  "recommendedOfferTier": "fast_yes|fair|stretch",
  "offerPackagingPlan": "How to present the offers",
  "talkTrackSoft": "Soft approach script",
  "talkTrackDirect": "Direct approach script",
  "objectionHandling": ["Objection: Response", ...],
  "nextActions": ["Action 1", ...],
  "followUpCadence": "Timing suggestions"
}`;

      const defaultPlan = {
        sellerSummary: `Seller is looking to sell with ${seller?.timelineToSell || 'flexible timeline'}. Their situation suggests they may value certainty and a smooth process.`,
        motivationHypotheses: [
          { hypothesis: "Financial considerations may be driving the sale", confidence: "medium" },
          { hypothesis: "Timeline suggests moderate urgency", confidence: "low" },
        ],
        communicationCues: [
          "Hypothesis: Seller may prefer clear, factual communication",
          "Confirming question: 'What matters most - speed, price, or certainty?'",
        ],
        sixNeedsMapping: [
          { need: "Certainty", hypothesis: "Likely values knowing the deal will close" },
          { need: "Significance", hypothesis: "May want validation of their property's value" },
        ],
        recommendedOfferTier: "fair",
        offerPackagingPlan: "Present Fair offer as primary with Fast Yes as alternative for speed priority",
        talkTrackSoft: "I appreciate you discussing your property. Based on our analysis, I'd like to present an offer that works for both of us...",
        talkTrackDirect: "Based on current market conditions and needed repairs, here's what the numbers show. I can offer $" + (offer.sellerOffer?.toLocaleString() || '0') + " cash with a quick close...",
        objectionHandling: [
          "Price concern: 'Let me walk through the repair estimates and market data...'",
          "Need time: 'Absolutely. This offer is valid for X days. What questions can I answer?'",
        ],
        nextActions: [
          "Confirm offer receipt",
          "Schedule follow-up within 48 hours",
          "Prepare documentation if requested",
        ],
        followUpCadence: "Day 1: Send offer. Day 2: Courtesy check-in. Day 4: Phone call. Day 7: Follow-up with adjusted terms if needed.",
      };

      const plan = await callLLMWithJSON(prompt, defaultPlan);
      res.json({ plan });
    } catch (error) {
      console.error("Presentation AI error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate presentation plan" 
      });
    }
  });

  app.post("/api/property/valuation", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address || typeof address !== "string") {
        return res.status(400).json({ error: "Address is required" });
      }

      const apiKey = process.env.RENTCAST_API_KEY;

      if (!apiKey) {
        return res.status(503).json({ 
          error: "Property valuation API not configured. Please add a RentCast API key.",
          needsApiKey: true
        });
      }

      const encodedAddress = encodeURIComponent(address);
      
      // Call both AVM and Property Records endpoints in parallel
      const valuationUrl = `https://api.rentcast.io/v1/avm/value?address=${encodedAddress}`;
      const propertyRecordsUrl = `https://api.rentcast.io/v1/properties?address=${encodedAddress}`;
      
      const [avmResponse, recordsResponse] = await Promise.all([
        fetch(valuationUrl, {
          headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
        }),
        fetch(propertyRecordsUrl, {
          headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
        }).catch(() => null) // Don't fail if property records unavailable
      ]);

      if (!avmResponse.ok) {
        const errorText = await avmResponse.text();
        console.error("RentCast AVM API error:", avmResponse.status, errorText);
        
        if (avmResponse.status === 401) {
          return res.status(401).json({ error: "Invalid API key" });
        }
        if (avmResponse.status === 404) {
          return res.status(404).json({ error: "Property not found at this address" });
        }
        return res.status(avmResponse.status).json({ error: "Failed to fetch property valuation" });
      }

      const avmData = await avmResponse.json();
      
      // Try to get property details from the records endpoint
      let recordsData: any = null;
      if (recordsResponse && recordsResponse.ok) {
        recordsData = await recordsResponse.json();
        console.log("RentCast Property Records response:", JSON.stringify(recordsData, null, 2));
      }
      
      // Property records may return an array or single object
      const propertyRecord = Array.isArray(recordsData) ? recordsData[0] : recordsData;
      
      // Generate Redfin link using their keyword search URL format
      // This opens Redfin's search with the address as a keyword search
      const redfinLink = `https://www.redfin.com/search?keyword=${encodeURIComponent(address)}`;
      
      const propertyData = {
        address: avmData.subjectProperty?.formattedAddress || avmData.formattedAddress || address,
        estimatedValue: avmData.price || avmData.priceRangeLow || 0,
        priceRangeLow: avmData.priceRangeLow || 0,
        priceRangeHigh: avmData.priceRangeHigh || 0,
        // Get property details from records endpoint (preferred) or AVM response
        sqft: propertyRecord?.squareFootage || avmData.squareFootage || 0,
        bedrooms: propertyRecord?.bedrooms || avmData.bedrooms || 0,
        bathrooms: propertyRecord?.bathrooms || avmData.bathrooms || 0,
        yearBuilt: propertyRecord?.yearBuilt || avmData.yearBuilt || 0,
        propertyType: propertyRecord?.propertyType || avmData.propertyType || "Single Family",
        lotSize: propertyRecord?.lotSize || avmData.lotSize || 0,
        pricePerSqft: (propertyRecord?.squareFootage || avmData.squareFootage) 
          ? Math.round((avmData.price || 0) / (propertyRecord?.squareFootage || avmData.squareFootage)) 
          : 0,
        zillowLink: `https://www.zillow.com/homes/${encodeURIComponent(address.replace(/,/g, '').replace(/\s+/g, '-'))}_rb/`,
        redfinLink: redfinLink
      };

      res.json(propertyData);
    } catch (error) {
      console.error("Property valuation API error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch property valuation" 
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

      const { address, propertyType } = parseResult.data;
      const apiKey = process.env.RENTCAST_API_KEY;

      if (!apiKey) {
        return res.status(503).json({ 
          error: "Comparable sales API not configured. Please add a RentCast API key.",
          needsApiKey: true
        });
      }

      const encodedAddress = encodeURIComponent(address);
      // Use AVM endpoint which includes comparables in response
      const compsUrl = `https://api.rentcast.io/v1/avm/value?address=${encodedAddress}&compCount=15`;
      
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
        propertyType: comp.propertyType,
        latitude: comp.latitude || undefined,
        longitude: comp.longitude || undefined,
        correlation: comp.correlation || undefined,
      }));

      // Filter by property type if specified
      let filteredComps = comps.filter(c => c.price > 0 && c.sqft > 0);
      
      if (propertyType) {
        const normalizedType = propertyType.toLowerCase().replace(/_/g, " ");
        filteredComps = filteredComps.filter(c => {
          if (!c.propertyType) return false;
          const compType = c.propertyType.toLowerCase().replace(/_/g, " ");
          // Match property types flexibly
          if (normalizedType.includes("single") && compType.includes("single")) return true;
          if (normalizedType.includes("multi") && compType.includes("multi")) return true;
          if (normalizedType.includes("condo") && compType.includes("condo")) return true;
          if (normalizedType.includes("townhouse") && (compType.includes("town") || compType.includes("row"))) return true;
          if (normalizedType.includes("land") && compType.includes("land")) return true;
          if (normalizedType.includes("commercial") && compType.includes("commercial")) return true;
          return compType.includes(normalizedType) || normalizedType.includes(compType);
        });
        
        // If no matches after filtering, fall back to all valid comps with a note
        if (filteredComps.length === 0) {
          console.log(`No ${propertyType} comps found, using all property types`);
          filteredComps = comps.filter(c => c.price > 0 && c.sqft > 0);
        }
      }
      
      const validComps = filteredComps;
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

      // Use AVM's suggestedARV (the price field) if available, otherwise calculate from comps
      const avmSuggestedARV = data.price || suggestedARV;

      const compsData: CompsData = {
        comps: validComps,
        subjectProperty: data.subjectProperty ? {
          address: data.subjectProperty.formattedAddress || address,
          estimatedValue: data.price,
          sqft: data.subjectProperty.squareFootage,
          bedrooms: data.subjectProperty.bedrooms,
          bathrooms: data.subjectProperty.bathrooms,
          yearBuilt: data.subjectProperty.yearBuilt,
          lotSize: data.subjectProperty.lotSize,
          latitude: data.subjectProperty.latitude || data.latitude,
          longitude: data.subjectProperty.longitude || data.longitude,
        } : undefined,
        avgPricePerSqft,
        medianPrice,
        suggestedARV: avmSuggestedARV
      };

      res.json(compsData);
    } catch (error) {
      console.error("Comps API error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch comparable sales" 
      });
    }
  });

  // Register object storage routes
  registerObjectStorageRoutes(app);

  // Save presentation PDF endpoint
  app.post("/api/presentations/save", async (req, res) => {
    try {
      const parseResult = createPresentationSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.toString() });
      }

      const { propertyAddress, presentationData, pdfBase64 } = parseResult.data;

      // Validate PDF size (max 5MB base64 = ~3.75MB file)
      const MAX_PDF_SIZE = 5 * 1024 * 1024;
      if (pdfBase64.length > MAX_PDF_SIZE) {
        return res.status(400).json({ error: "PDF too large (max 5MB)" });
      }

      // Validate base64 format
      if (!/^[A-Za-z0-9+/=]+$/.test(pdfBase64)) {
        return res.status(400).json({ error: "Invalid PDF format" });
      }

      const id = randomUUID();
      const objectStorageService = new ObjectStorageService();

      // Get presigned URL for upload
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const pdfPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      // Upload PDF to object storage
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: pdfBuffer,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload PDF to storage');
      }

      const userId = (req as any).user?.claims?.sub || null;

      const [presentation] = await db.insert(savedPresentations).values({
        id,
        userId,
        propertyAddress,
        pdfPath,
        presentationData,
      }).returning();

      res.json({
        id: presentation.id,
        pdfUrl: `/api/presentations/${presentation.id}/pdf`,
        shareUrl: `/share/${presentation.id}`,
      });
    } catch (error) {
      console.error("Save presentation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to save presentation" 
      });
    }
  });

  app.get("/api/presentations/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params;
      const [presentation] = await db.select().from(savedPresentations).where(eq(savedPresentations.id, id));

      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(presentation.pdfPath);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="OfferIQ-${presentation.propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      });

      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Get presentation PDF error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get presentation PDF" 
      });
    }
  });

  app.get("/api/presentations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [presentation] = await db.select().from(savedPresentations).where(eq(savedPresentations.id, id));

      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }

      res.json({
        id: presentation.id,
        propertyAddress: presentation.propertyAddress,
        createdAt: presentation.createdAt?.toISOString(),
        pdfUrl: `/api/presentations/${id}/pdf`,
        shareUrl: `/share/${id}`,
      });
    } catch (error) {
      console.error("Get presentation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get presentation" 
      });
    }
  });

  // === SAVED DEALS CRUD (auth protected) ===

  app.get("/api/deals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.query.status as string | undefined;

      const conditions = [eq(savedDeals.userId, userId)];
      if (status === "active" || status === "archived") {
        conditions.push(eq(savedDeals.dealStatus, status));
      }

      const deals = await db.select().from(savedDeals)
        .where(and(...conditions))
        .orderBy(desc(savedDeals.updatedAt));
      res.json(deals);
    } catch (error) {
      console.error("List deals error:", error);
      res.status(500).json({ error: "Failed to list deals" });
    }
  });

  app.get("/api/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const [deal] = await db.select().from(savedDeals)
        .where(eq(savedDeals.id, id));

      if (!deal) return res.status(404).json({ error: "Deal not found" });
      if (deal.userId !== userId) return res.status(403).json({ error: "Access denied" });

      res.json(deal);
    } catch (error) {
      console.error("Get deal error:", error);
      res.status(500).json({ error: "Failed to get deal" });
    }
  });

  app.post("/api/deals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parseResult = insertSavedDealSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.toString() });
      }

      const [deal] = await db.insert(savedDeals).values({
        ...parseResult.data,
        userId,
      }).returning();

      res.json(deal);
    } catch (error) {
      console.error("Create deal error:", error);
      res.status(500).json({ error: "Failed to save deal" });
    }
  });

  app.patch("/api/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const [existing] = await db.select().from(savedDeals).where(eq(savedDeals.id, id));
      if (!existing) return res.status(404).json({ error: "Deal not found" });
      if (existing.userId !== userId) return res.status(403).json({ error: "Access denied" });

      const parseResult = insertSavedDealSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.toString() });
      }

      const [deal] = await db.update(savedDeals)
        .set({ ...parseResult.data, updatedAt: new Date() })
        .where(eq(savedDeals.id, id))
        .returning();

      res.json(deal);
    } catch (error) {
      console.error("Update deal error:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  app.patch("/api/deals/:id/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const [existing] = await db.select().from(savedDeals).where(eq(savedDeals.id, id));
      if (!existing) return res.status(404).json({ error: "Deal not found" });
      if (existing.userId !== userId) return res.status(403).json({ error: "Access denied" });

      const newStatus = existing.dealStatus === "archived" ? "active" : "archived";
      const [deal] = await db.update(savedDeals)
        .set({
          dealStatus: newStatus,
          archivedAt: newStatus === "archived" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(savedDeals.id, id))
        .returning();

      res.json(deal);
    } catch (error) {
      console.error("Archive deal error:", error);
      res.status(500).json({ error: "Failed to archive deal" });
    }
  });

  app.delete("/api/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const [existing] = await db.select().from(savedDeals).where(eq(savedDeals.id, id));
      if (!existing) return res.status(404).json({ error: "Deal not found" });
      if (existing.userId !== userId) return res.status(403).json({ error: "Access denied" });

      await db.delete(savedDeals).where(eq(savedDeals.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete deal error:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  // === USER PREFERENCES (auto-save working state) ===

  app.get("/api/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      res.json(prefs || { workingDealState: null, workingUserComps: null, settings: null });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.put("/api/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workingDealState, workingUserComps, settings } = req.body;

      const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));

      if (existing) {
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (workingDealState !== undefined) updateData.workingDealState = workingDealState;
        if (workingUserComps !== undefined) updateData.workingUserComps = workingUserComps;
        if (settings !== undefined) updateData.settings = settings;

        const [prefs] = await db.update(userPreferences)
          .set(updateData)
          .where(eq(userPreferences.userId, userId))
          .returning();
        res.json(prefs);
      } else {
        const [prefs] = await db.insert(userPreferences).values({
          userId,
          workingDealState: workingDealState || null,
          workingUserComps: workingUserComps || null,
          settings: settings || null,
        }).returning();
        res.json(prefs);
      }
    } catch (error) {
      console.error("Save preferences error:", error);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  app.post("/api/logo/upload-url", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Logo upload URL error:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.post("/api/logo/save", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { objectPath } = req.body;

      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }

      const objectStorageService = new ObjectStorageService();
      try {
        await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
          owner: userId,
          visibility: "public",
        });
      } catch (e) {
        console.warn("Could not set logo ACL to public:", e);
      }

      const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      const currentSettings = (existing?.settings as Record<string, any>) || {};
      const newSettings = { ...currentSettings, companyLogoPath: objectPath };

      if (existing) {
        await db.update(userPreferences)
          .set({ settings: newSettings, updatedAt: new Date() })
          .where(eq(userPreferences.userId, userId));
      } else {
        await db.insert(userPreferences).values({
          userId,
          settings: newSettings,
        });
      }

      res.json({ logoUrl: objectPath, success: true });
    } catch (error) {
      console.error("Save logo error:", error);
      res.status(500).json({ error: "Failed to save logo" });
    }
  });

  app.delete("/api/logo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      if (existing) {
        const currentSettings = (existing.settings as Record<string, any>) || {};
        const { companyLogoPath, ...rest } = currentSettings;
        await db.update(userPreferences)
          .set({ settings: rest, updatedAt: new Date() })
          .where(eq(userPreferences.userId, userId));
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete logo error:", error);
      res.status(500).json({ error: "Failed to delete logo" });
    }
  });

  app.get("/api/presentations", async (req, res) => {
    try {
      const rows = await db.select().from(savedPresentations).orderBy(desc(savedPresentations.createdAt));
      const presentations = rows.map(p => ({
        id: p.id,
        propertyAddress: p.propertyAddress,
        createdAt: p.createdAt?.toISOString(),
        pdfUrl: `/api/presentations/${p.id}/pdf`,
        shareUrl: `/share/${p.id}`,
      }));

      res.json(presentations);
    } catch (error) {
      console.error("List presentations error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to list presentations" 
      });
    }
  });

  // === STRIPE SUBSCRIPTION ROUTES ===

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      console.error("Get publishable key error:", error);
      res.status(500).json({ error: "Failed to get Stripe key" });
    }
  });

  app.get("/api/stripe/products", async (_req, res) => {
    try {
      const rows = await stripeService.listProductsWithPrices();
      const productsMap = new Map<string, any>();
      for (const row of rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          const metadata = typeof row.product_metadata === 'string' 
            ? JSON.parse(row.product_metadata) 
            : row.product_metadata || {};
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            metadata,
            prices: [],
          });
        }
        if (row.price_id) {
          const recurring = typeof row.recurring === 'string' 
            ? JSON.parse(row.recurring) 
            : row.recurring;
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unitAmount: row.unit_amount,
            currency: row.currency,
            recurring,
          });
        }
      }
      res.json({ products: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("List products error:", error);
      res.status(500).json({ error: "Failed to list products" });
    }
  });

  app.get("/api/stripe/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!user.stripeSubscriptionId) {
        return res.json({ subscription: null, tier: user.subscriptionTier || "free" });
      }

      const subscription = await stripeService.getSubscription(user.stripeSubscriptionId);
      res.json({ subscription, tier: user.subscriptionTier || "free" });
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  app.post("/api/stripe/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId } = req.body;

      if (!priceId) return res.status(400).json({ error: "priceId is required" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ error: "User not found" });

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || "", userId);
        await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
        customerId = customer.id;
      }

      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${req.protocol}://${req.get('host')}/checkout/success`,
        `${req.protocol}://${req.get('host')}/pricing`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Create checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${req.protocol}://${req.get('host')}/account`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Create portal session error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  app.post("/api/stripe/sync-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.stripeCustomerId) {
        return res.json({ tier: "free", subscription: null });
      }

      const subscription = await stripeService.getSubscriptionByCustomerId(user.stripeCustomerId);
      
      if (subscription) {
        const subAny = subscription as any;
        const productResult = await db.execute(
          sql`SELECT p.metadata FROM stripe.products p 
              JOIN stripe.prices pr ON pr.product = p.id 
              JOIN stripe.subscriptions s ON s.id = ${subAny.id}
              WHERE pr.id = (
                SELECT price FROM stripe.subscription_items WHERE subscription = ${subAny.id} LIMIT 1
              )
              LIMIT 1`
        );
        
        let tier = "basic";
        if (productResult.rows.length > 0) {
          const metadata = typeof (productResult.rows[0] as any).metadata === 'string' 
            ? JSON.parse((productResult.rows[0] as any).metadata) 
            : (productResult.rows[0] as any).metadata || {};
          tier = metadata.tier || "basic";
        }

        await db.update(users).set({
          stripeSubscriptionId: subAny.id,
          subscriptionTier: tier,
        }).where(eq(users.id, userId));

        res.json({ tier, subscription });
      } else {
        await db.update(users).set({
          stripeSubscriptionId: null,
          subscriptionTier: "free",
        }).where(eq(users.id, userId));
        res.json({ tier: "free", subscription: null });
      }
    } catch (error) {
      console.error("Sync subscription error:", error);
      res.status(500).json({ error: "Failed to sync subscription" });
    }
  });

  // === Shared Offer Links ===

  function generateShortCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  app.post("/api/shares", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyAddress, sections, dealSnapshot, expiresInDays } = req.body;

      if (!propertyAddress || !sections || !Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ error: "Property address and at least one section are required" });
      }

      if (!dealSnapshot) {
        return res.status(400).json({ error: "Deal data is required to create a share link" });
      }

      const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      const userSettings = (prefs?.settings as Record<string, any>) || {};
      const companyLogoPath = userSettings.companyLogoPath || null;
      const companyName = userSettings.companyName || null;

      const enrichedSnapshot = {
        ...dealSnapshot,
        companyLogoPath,
        companyName,
      };

      let code = generateShortCode();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await db.select().from(sharedOffers).where(eq(sharedOffers.code, code));
        if (existing.length === 0) break;
        code = generateShortCode();
        attempts++;
      }

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const [shared] = await db.insert(sharedOffers).values({
        code,
        userId,
        propertyAddress,
        sections,
        dealSnapshot: enrichedSnapshot,
        isActive: true,
        expiresAt,
      }).returning();

      res.json({
        id: shared.id,
        code: shared.code,
        url: `/s/${shared.code}`,
        expiresAt: shared.expiresAt,
      });
    } catch (error) {
      console.error("Create share error:", error);
      res.status(500).json({ error: "Failed to create share link" });
    }
  });

  app.get("/api/shares", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shares = await db.select().from(sharedOffers)
        .where(eq(sharedOffers.userId, userId))
        .orderBy(desc(sharedOffers.createdAt));
      res.json({ shares });
    } catch (error) {
      console.error("List shares error:", error);
      res.status(500).json({ error: "Failed to list shares" });
    }
  });

  app.patch("/api/shares/:code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.params;
      const { isActive } = req.body;

      const [updated] = await db.update(sharedOffers)
        .set({ isActive: isActive ?? false })
        .where(and(eq(sharedOffers.code, code), eq(sharedOffers.userId, userId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Share link not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update share error:", error);
      res.status(500).json({ error: "Failed to update share link" });
    }
  });

  app.get("/api/s/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const [shared] = await db.select().from(sharedOffers)
        .where(eq(sharedOffers.code, code));

      if (!shared) {
        return res.status(404).json({ error: "Share link not found" });
      }

      if (!shared.isActive) {
        return res.status(410).json({ error: "This share link has been deactivated" });
      }

      if (shared.expiresAt && new Date(shared.expiresAt) < new Date()) {
        return res.status(410).json({ error: "This share link has expired" });
      }

      res.json({
        propertyAddress: shared.propertyAddress,
        sections: shared.sections,
        dealSnapshot: shared.dealSnapshot,
        createdAt: shared.createdAt,
      });
    } catch (error) {
      console.error("Fetch share error:", error);
      res.status(500).json({ error: "Failed to fetch share" });
    }
  });

  app.post("/api/parse-listing-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }

      const ALLOWED_DOMAINS = ["zillow.com", "redfin.com", "realtor.com"];
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }
      const hostname = parsedUrl.hostname.replace(/^www\./, "");
      if (!ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d))) {
        return res.json({ source: "other", address: "", imageUrl: "" });
      }

      let source: "zillow" | "redfin" | "realtor" | "other" = "other";
      let address = "";
      let imageUrl = "";
      let price = 0;
      let beds = 0;
      let baths = 0;
      let sqft = 0;
      let soldDate = "";

      if (url.includes("zillow.com")) {
        source = "zillow";
        const match = url.match(/\/(?:homedetails|homes|b)\/([^/]+)/);
        if (match) {
          address = match[1]
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .replace(/\s\d{5,}$/, "")
            .replace(/\s\d+Zpid$/, "");
        }
      } else if (url.includes("redfin.com")) {
        source = "redfin";
        const match = url.match(/\/(?:home|stingless)\/(\d+)/) || url.match(/\/([\w-]+?)(?:\/home\/\d+)?$/);
        const addrMatch = url.match(/\/(?:[A-Z]{2})\/([\w-]+?)\//i) || url.match(/\/([^/]+?)\/home\/\d+$/);
        if (addrMatch) {
          address = addrMatch[1]
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
      } else if (url.includes("realtor.com")) {
        source = "realtor";
        const match = url.match(/\/realestateandhomes-detail\/([^/]+)/);
        if (match) {
          address = match[1]
            .replace(/_/g, " ")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, {
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
        });
        clearTimeout(timeout);

        const finalHostname = new URL(response.url).hostname.replace(/^www\./, "");
        if (!ALLOWED_DOMAINS.some(d => finalHostname === d || finalHostname.endsWith("." + d))) {
          return res.json({ source, address, imageUrl, price: 0, beds: 0, baths: 0, sqft: 0, soldDate: "" });
        }

        if (response.ok) {
          const html = await response.text();

          const ogImage = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)
            || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i);
          if (ogImage) {
            imageUrl = ogImage[1];
          }

          if (!address) {
            const ogTitle = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i)
              || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:title["']/i);
            if (ogTitle) {
              address = ogTitle[1].split("|")[0].split("-")[0].trim();
            }
          }

          const ldJsonMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
          if (ldJsonMatches) {
            for (const block of ldJsonMatches) {
              try {
                const jsonContent = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
                const ld = JSON.parse(jsonContent);
                const items = Array.isArray(ld) ? ld : ld["@graph"] ? ld["@graph"] : [ld];
                for (const item of items) {
                  const t = item["@type"];
                  if (t === "SingleFamilyResidence" || t === "House" || t === "Apartment"
                    || t === "Product" || t === "RealEstateListing" || t === "Residence"
                    || (typeof t === "string" && t.includes("Residence"))) {
                    if (!address && item.address) {
                      const a = typeof item.address === "string" ? item.address : item.address.streetAddress;
                      if (a) address = a;
                    }
                    if (!sqft && item.floorSize) {
                      const fs = typeof item.floorSize === "object" ? item.floorSize.value : item.floorSize;
                      const parsed = parseInt(String(fs).replace(/[^0-9]/g, ""), 10);
                      if (parsed > 0) sqft = parsed;
                    }
                    if (!beds && item.numberOfRooms) {
                      const parsed = parseInt(String(item.numberOfRooms), 10);
                      if (parsed > 0) beds = parsed;
                    }
                    if (!beds && item.numberOfBedrooms) {
                      const parsed = parseInt(String(item.numberOfBedrooms), 10);
                      if (parsed > 0) beds = parsed;
                    }
                    if (!baths && item.numberOfBathroomsTotal) {
                      const parsed = parseFloat(String(item.numberOfBathroomsTotal));
                      if (parsed > 0) baths = parsed;
                    }
                    if (!soldDate) {
                      const dateFields = [item.datePosted, item.dateSold, item.lastSoldDate, item.closeDate, item.datePublished, item.dateModified];
                      for (const df of dateFields) {
                        if (df && typeof df === "string") {
                          const d = new Date(df);
                          if (!isNaN(d.getTime())) {
                            soldDate = d.toISOString().split("T")[0];
                            break;
                          }
                        }
                      }
                    }
                  }
                  if (item["@type"] === "Offer" || item.offers) {
                    const offer = item["@type"] === "Offer" ? item : (Array.isArray(item.offers) ? item.offers[0] : item.offers);
                    if (offer && offer.price && !price) {
                      const p = parseInt(String(offer.price).replace(/[^0-9]/g, ""), 10);
                      if (p > 0) price = p;
                    }
                  }
                  if (item.offers && !price) {
                    const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                    if (offer && offer.price) {
                      const p = parseInt(String(offer.price).replace(/[^0-9]/g, ""), 10);
                      if (p > 0) price = p;
                    }
                  }
                }
              } catch {}
            }
          }

          if (!price) {
            const pricePatterns = [
              /<span[^>]*data-testid=["'](?:price|home-details-price)["'][^>]*>\s*\$?([\d,]+)/i,
              /<span[^>]*class=["'][^"']*(?:price|Price|listing-price)[^"']*["'][^>]*>\s*\$?([\d,]+)/i,
              /<meta\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']\s+content=["']([^"']+)["']/i,
              /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i,
            ];
            for (const pat of pricePatterns) {
              const m = html.match(pat);
              if (m) {
                const p = parseInt(m[1].replace(/[^0-9]/g, ""), 10);
                if (p > 1000) { price = p; break; }
              }
            }
          }

          if (!beds || !baths || !sqft) {
            const descMatch = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i)
              || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:description["']/i)
              || html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
            if (descMatch) {
              const desc = descMatch[1];
              if (!beds) {
                const bedMatch = desc.match(/(\d+)\s*(?:bd|bed|bedroom)/i);
                if (bedMatch) beds = parseInt(bedMatch[1], 10);
              }
              if (!baths) {
                const bathMatch = desc.match(/([\d.]+)\s*(?:ba|bath|bathroom)/i);
                if (bathMatch) baths = parseFloat(bathMatch[1]);
              }
              if (!sqft) {
                const sqftMatch = desc.match(/([\d,]+)\s*(?:sq\s*ft|sqft|square\s*f)/i);
                if (sqftMatch) sqft = parseInt(sqftMatch[1].replace(/,/g, ""), 10);
              }
            }
          }

          if (!beds || !baths || !sqft) {
            const factPatterns = [
              { field: "beds" as const, patterns: [/(\d+)\s*(?:beds?|bedrooms?|bd)\b/gi] },
              { field: "baths" as const, patterns: [/([\d.]+)\s*(?:baths?|bathrooms?|ba)\b/gi] },
              { field: "sqft" as const, patterns: [/([\d,]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/gi] },
            ];
            for (const { field, patterns } of factPatterns) {
              if ((field === "beds" && beds) || (field === "baths" && baths) || (field === "sqft" && sqft)) continue;
              for (const pat of patterns) {
                const m = pat.exec(html);
                if (m) {
                  const val = field === "baths" ? parseFloat(m[1]) : parseInt(m[1].replace(/,/g, ""), 10);
                  if (val > 0) {
                    if (field === "beds") beds = val;
                    else if (field === "baths") baths = val;
                    else if (field === "sqft") sqft = val;
                  }
                  break;
                }
              }
            }
          }

          if (!price) {
            const titleDesc = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "") +
              " " + (html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] || "");
            const priceM = titleDesc.match(/\$([\d,]+(?:\.\d+)?)/);
            if (priceM) {
              const p = parseInt(priceM[1].replace(/[^0-9]/g, ""), 10);
              if (p > 1000) price = p;
            }
          }

          if (!soldDate) {
            const soldPatterns = [
              /sold\s+(?:on\s+)?(\w+\s+\d{1,2},?\s+\d{4})/i,
              /(?:sold|closed|sale)\s*(?:date|price)?[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
              /(?:sold|closed)\s*(?:date|price)?[:\s]+(\d{4}-\d{2}-\d{2})/i,
            ];
            for (const pat of soldPatterns) {
              const m = html.match(pat);
              if (m) {
                const d = new Date(m[1]);
                if (!isNaN(d.getTime())) {
                  soldDate = d.toISOString().split("T")[0];
                  break;
                }
              }
            }
          }
        }
      } catch {}

      res.json({ source, address, imageUrl, price, beds, baths, sqft, soldDate });
    } catch (error) {
      console.error("Parse listing URL error:", error);
      res.status(500).json({ error: "Failed to parse listing URL" });
    }
  });

  return httpServer;
}
