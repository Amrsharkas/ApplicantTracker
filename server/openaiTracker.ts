import { db } from "./db";
import { openaiRequests, InsertOpenAIRequest } from "../shared/schema";

// OpenAI pricing per 1K tokens (as of 2024)
const PRICING = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "gpt-5": { input: 1.25, output: 10.00 },
  "gpt-5-mini": { input: 0.25, output: 2.00 },
  "gpt-5-nano": { input: 0.05, output: 0.40 },
};

interface SaveOpenAIRequestOptions {
  requestType: string;
  model: string;
  requestData?: any;
  responseData?: any;
  userId?: string;
  organizationId?: string;
  metadata?: any;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function saveOpenAIRequest(
  response: OpenAIResponse,
  options: SaveOpenAIRequestOptions
): Promise<void> {
  try {
    const usage = response.usage;
    const pricing = PRICING[options.model as keyof typeof PRICING] || PRICING["gpt-4o"];

    const inputCost = (usage?.prompt_tokens || 0) * pricing.input / 1000;
    const outputCost = (usage?.completion_tokens || 0) * pricing.output / 1000;
    const totalCost = inputCost + outputCost;

    const request: InsertOpenAIRequest = {
      requestType: options.requestType,
      model: options.model,
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
      cost: totalCost,
      requestData: options.requestData || null,
      responseData: options.responseData || null,
      status: "success",
      userId: options.userId || null,
      organizationId: options.organizationId || null,
      metadata: {
        response,
        options
      },
    };

    await db.insert(openaiRequests).values(request);
  } catch (error) {
    console.error("Failed to save OpenAI request to database:", error);
    // Don't throw error to avoid breaking the main functionality
  }
}

export async function saveOpenAIError(
  error: any,
  options: SaveOpenAIRequestOptions
): Promise<void> {
  try {
    const request: InsertOpenAIRequest = {
      requestType: options.requestType,
      model: options.model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0,
      requestData: options.requestData || null,
      responseData: null,
      status: "error",
      errorMessage: error?.message || "Unknown error",
      userId: options.userId || null,
      organizationId: options.organizationId || null,
      metadata: options.metadata || null,
    };

    await db.insert(openaiRequests).values(request);
  } catch (dbError) {
    console.error("Failed to save OpenAI error to database:", dbError);
  }
}

export async function wrapOpenAIRequest<T>(
  openaiCall: () => Promise<T>,
  options: SaveOpenAIRequestOptions
): Promise<T> {
  try {
    const response = await openaiCall();
    await saveOpenAIRequest(response as any, options);
    return response;
  } catch (error) {
    await saveOpenAIError(error, options);
    throw error;
  }
}
