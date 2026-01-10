import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
});

export interface LLMResponse {
  text: string;
  success: boolean;
  error?: string;
}

export async function callLLM(prompt: string): Promise<LLMResponse> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log("No OpenAI API key configured, returning stub response");
    return {
      text: "",
      success: false,
      error: "API_KEY_MISSING",
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert real estate advisor. Provide structured, ethical guidance for offer presentations. Always respond in valid JSON format when requested.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const text = response.choices[0]?.message?.content || "";
    return {
      text,
      success: true,
    };
  } catch (error) {
    console.error("LLM call failed:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function parseJSONResponse<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    const cleanText = text.trim();
    if (cleanText.startsWith("{") || cleanText.startsWith("[")) {
      return JSON.parse(cleanText);
    }
    
    return null;
  } catch {
    return null;
  }
}
