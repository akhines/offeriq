import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const ETHICAL_GUARDRAIL = `You are an ethical real estate negotiation advisor. 
IMPORTANT GUIDELINES:
- Provide ethical, non-manipulative negotiation guidance
- Treat all psychological profiling (DISC, motivations, etc.) as HYPOTHESES, not diagnoses
- Suggest confirming questions rather than assumptions
- Avoid coercion, deception, or high-pressure tactics
- Focus on building rapport, clarity, and win-win outcomes
- Be transparent and honest in all suggested approaches
- Respect the seller's autonomy and decision-making`;

export async function callLLM(prompt: string): Promise<string> {
  const hasApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY && 
                    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!hasApiKey) {
    return getStubResponse(prompt);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ETHICAL_GUARDRAIL },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 2048,
    });

    return response.choices[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error("LLM call failed:", error);
    return getStubResponse(prompt);
  }
}

export async function callLLMWithJSON<T>(prompt: string, fallback: T): Promise<T> {
  const hasApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY && 
                    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!hasApiKey) {
    return fallback;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ETHICAL_GUARDRAIL + "\n\nYou must respond with valid JSON only. No markdown formatting." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || "{}";
    return JSON.parse(content) as T;
  } catch (error) {
    console.error("LLM JSON call failed:", error);
    return fallback;
  }
}

function getStubResponse(prompt: string): string {
  if (prompt.includes("motivation") || prompt.includes("Why")) {
    return `**Motivation Analysis (Stub Response)**

Based on the seller's stated reasons, here are some observations:

1. **Primary Driver**: The seller appears motivated by their stated circumstances
2. **Emotional State**: Consider empathetic listening during your conversation
3. **Urgency Level**: Assess whether timeline pressures exist

*Note: This is a placeholder response. Configure AI integration for real-time analysis.*

**Suggested Approach:**
- Listen actively to understand their full situation
- Ask open-ended questions about their goals
- Confirm understanding before presenting solutions`;
  }

  if (prompt.includes("improvements") || prompt.includes("rehab")) {
    return `**Rehab Scope Analysis (Stub Response)**

Preliminary scope checklist based on stated improvements:

**Critical Items:**
- [ ] Major system repairs (if any failed systems noted)
- [ ] Safety-related repairs

**Important Items:**
- [ ] Kitchen updates if dated
- [ ] Bathroom refreshes
- [ ] Flooring replacement

**Nice-to-Have:**
- [ ] Cosmetic updates
- [ ] Landscaping improvements

*Note: This is a placeholder. Configure AI for detailed analysis.*`;
  }

  if (prompt.includes("risk") || prompt.includes("failed systems")) {
    return `**Risk Assessment (Stub Response)**

Based on the reported failed systems:

**Assessment:**
- Evaluate each system individually with a qualified inspector
- Factor repair costs into your underwriting calculations
- Consider timeline impacts for repairs

**Recommendations:**
- Get contractor quotes before finalizing offers
- Build in contingency buffer for unexpected issues

*Note: This is a placeholder response.*`;
  }

  if (prompt.includes("objection") || prompt.includes("profit")) {
    return `**Objection Handling (Stub Response)**

When there's a gap between seller expectations and your offer:

**Approach:**
1. Acknowledge their perspective with empathy
2. Explain the calculation methodology transparently
3. Show how the numbers were derived
4. Discuss alternatives that might work for both parties

**Key Points:**
- Focus on their net proceeds after all costs
- Compare to traditional sale after agent fees and repairs
- Highlight certainty and timeline benefits

*Note: Configure AI for personalized objection strategies.*`;
  }

  return `**AI Analysis (Stub Response)**

This is a placeholder response because AI integration is not fully configured.

To enable real AI analysis:
1. Ensure the AI integration is properly set up
2. The system will automatically provide detailed, personalized insights

*The application will function with basic calculations until AI is configured.*`;
}
