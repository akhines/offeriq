import {
  SellerInfo,
  PresentationInput,
  PresentationOutput,
  OfferOutput,
  UnderwritingOutput,
} from "../../types";

export function extractSellerConstraints(seller: SellerInfo): string[] {
  const constraints: string[] = [];
  
  if (seller.timelineToSell) {
    constraints.push(`Timeline: ${seller.timelineToSell}`);
  }
  if (seller.reasonForSelling) {
    constraints.push(`Reason for selling: ${seller.reasonForSelling}`);
  }
  if (seller.neededProfit !== undefined && seller.neededProfit > 0) {
    constraints.push(`Needs to walk away with: $${seller.neededProfit.toLocaleString()}`);
  }
  if (seller.owed !== undefined && seller.owed > 0) {
    constraints.push(`Amount owed: $${seller.owed.toLocaleString()}`);
  }
  if (seller.objectionsHeard) {
    constraints.push(`Known objections: ${seller.objectionsHeard}`);
  }
  if (seller.decisionMakers) {
    constraints.push(`Decision makers: ${seller.decisionMakers}`);
  }
  
  return constraints;
}

export function buildPresentationPrompt(
  seller: SellerInfo,
  presentationInput: PresentationInput,
  underwriting: UnderwritingOutput,
  offer: OfferOutput
): string {
  const constraints = extractSellerConstraints(seller);
  const notesText = presentationInput.callNotes
    .map(n => `[${n.date}] ${n.text}`)
    .join("\n\n");
  
  const ladderText = offer.offerLadder
    .map(l => `- ${l.name}: $${l.price.toLocaleString()} (${l.useWhen})`)
    .join("\n");

  return `You are an ethical real estate advisor helping prepare an offer presentation plan.

## ETHICAL GUARDRAILS (MANDATORY)
- NO deception, coercion, threats, pressure tactics, or manipulation
- Treat all DISC and Tony Robbins 6 Human Needs assessments as HYPOTHESES, not diagnoses
- Provide confirming questions the user can ask to validate hypotheses
- Focus on clarity, rapport, options, and alignment with seller's genuine interests
- Respect the seller's autonomy and right to make informed decisions

## PROPERTY & UNDERWRITING CONTEXT
- As-Is Value Range: $${underwriting.asIsLow.toLocaleString()} - $${underwriting.asIsHigh.toLocaleString()} (base: $${underwriting.asIsBase.toLocaleString()})
- Estimated Repairs: $${underwriting.repairLow.toLocaleString()} - $${underwriting.repairHigh.toLocaleString()}
- Confidence Score: ${underwriting.confidenceScore}%
- Key Drivers: ${underwriting.drivers.join("; ")}

## OFFER DETAILS
${ladderText}
- Deal Grade: ${offer.dealGrade}
- Margin: $${offer.margin.toLocaleString()} (${offer.marginPct.toFixed(1)}%)

## SELLER CONSTRAINTS
${constraints.length > 0 ? constraints.join("\n") : "No specific constraints provided"}

## CALL NOTES / TRANSCRIPTS
${notesText || presentationInput.transcriptPaste || "No notes provided"}

## COMMUNICATION PREFERENCES
- Preferred method: ${presentationInput.preferredCommunication || "Not specified"}
- Tone preference: ${presentationInput.tonePreference || "Professional"}
${presentationInput.priorOffers ? `- Prior offers made: ${presentationInput.priorOffers}` : ""}

---

Generate a structured offer presentation plan with these sections:

1. SELLER SUMMARY (2-3 sentences about the seller's situation)

2. MOTIVATION HYPOTHESES (3-5 bullets with confidence levels: high/medium/low)
   - What is driving them to sell?
   - What are their deepest concerns?

3. COMMUNICATION CUES (DISC-style hypotheses - NOT diagnoses)
   - Observed communication patterns
   - Suggested approach adjustments
   - Questions to confirm these hypotheses

4. SIX NEEDS MAPPING (Tony Robbins framework - as hypotheses)
   - Which of the 6 human needs seem most relevant?
   - How might the offer address these needs?
   - Certainty, Variety, Significance, Love/Connection, Growth, Contribution

5. RECOMMENDED OFFER TIER
   - Which ladder tier to present first and why
   - One offer vs. two options vs. three options approach

6. TALK TRACK - SOFT APPROACH
   - Conversational script focusing on rapport and understanding

7. TALK TRACK - DIRECT APPROACH
   - More assertive script while remaining ethical

8. OBJECTION HANDLING (anticipated objections and responses)

9. NEXT ACTIONS (checklist format)

10. FOLLOW-UP CADENCE (timing and method suggestions)

Respond in JSON format matching PresentationOutput type.`;
}

export function generateStubPresentation(
  seller: SellerInfo,
  offer: OfferOutput
): PresentationOutput {
  const timeline = seller.timelineToSell || "unknown timeline";
  const reason = seller.reasonForSelling || "undisclosed reasons";
  
  return {
    sellerSummary: `Seller is looking to sell within ${timeline} due to ${reason}. They appear motivated but pricing expectations may need alignment with current market conditions.`,
    motivationHypotheses: [
      { hypothesis: "Timeline pressure may be driving urgency", confidence: "medium" },
      { hypothesis: "Financial considerations appear to be a factor", confidence: "medium" },
      { hypothesis: "Emotional attachment to property may affect negotiations", confidence: "low" },
    ],
    communicationCues: [
      "Hypothesis: Seller may prefer direct, factual communication (confirm by observing response to numbers)",
      "Hypothesis: Building rapport before discussing price may be beneficial",
      "Confirming question: 'What matters most to you in this transaction - speed, price, or certainty?'",
    ],
    sixNeedsMapping: [
      { need: "Certainty", hypothesis: "Seller likely values knowing the deal will close as promised" },
      { need: "Significance", hypothesis: "May want to feel they made a good decision with their property" },
      { need: "Connection", hypothesis: "Trust and rapport with buyer may influence decision" },
    ],
    recommendedOfferTier: offer.offerLadder[1]?.price > offer.offerLadder[2]?.price ? "fair" : "fast_yes",
    offerPackagingPlan: "Present two options: the 'Fair' offer as the primary recommendation with 'Fast Yes' as an alternative if speed is paramount. Hold 'Stretch' in reserve for negotiation.",
    talkTrackSoft: `"I appreciate you taking the time to discuss your property. Based on our analysis and the current condition, I'd like to present an offer that I believe works for both of us. The property has great potential, and I'm committed to making this process as smooth as possible for you..."`,
    talkTrackDirect: `"Based on the repairs needed and current market conditions, here's what the numbers show us. The property as-is is valued around $${offer.sellerOffer.toLocaleString()}. This accounts for [specific factors]. I can close within [timeline] with cash, which eliminates financing contingencies and gives you certainty..."`,
    objectionHandling: [
      "Price too low: 'I understand. Let me walk through the repair estimates and market data that informed this number...'",
      "Need more time: 'Absolutely. This offer remains valid for [X days]. Would it help to schedule a follow-up call?'",
      "Other offers: 'I appreciate you sharing that. What aspects of those offers are most appealing to you?'",
    ],
    nextActions: [
      "Confirm seller received and reviewed offer",
      "Schedule follow-up call within 48 hours",
      "Prepare repair documentation if requested",
      "Draft purchase agreement for quick execution",
    ],
    followUpCadence: "Day 1: Send offer. Day 2: Courtesy text/email. Day 4: Phone call. Day 7: Second call with adjusted terms if needed. Day 14: Final follow-up before moving on.",
  };
}
