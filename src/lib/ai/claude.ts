import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-sonnet-4-5-20241022";
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000;

type CallClaudeOptions = {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  timeout?: number;
};

type CallClaudeResult = {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

let clientInstance: Anthropic | null = null;

function getClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is required. Add it to .env.local"
      );
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

/**
 * Call Claude API with a system prompt and user message.
 * Returns the text content and token usage.
 */
export async function callClaude(
  options: CallClaudeOptions
): Promise<CallClaudeResult> {
  const client = getClient();

  const { systemPrompt, userMessage, model, maxTokens, timeout } = options;

  try {
    const response = await client.messages.create(
      {
        model: model ?? DEFAULT_MODEL,
        max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      },
      { timeout: timeout ?? REQUEST_TIMEOUT_MS }
    );

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    return {
      content: textBlock.text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        throw new Error(
          "Claude API rate limit exceeded. Please wait a moment and try again."
        );
      }
      if (error.status === 401) {
        throw new Error(
          "Invalid ANTHROPIC_API_KEY. Check your .env.local configuration."
        );
      }
      throw new Error(`Claude API error (${error.status}): ${error.message}`);
    }

    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("timeout")
    ) {
      throw new Error(
        "Claude API request timed out. The brief may be too long — try a shorter input."
      );
    }

    throw error;
  }
}

/**
 * Call Claude and parse the response as JSON.
 * Strips markdown code fences if present.
 */
export async function callClaudeJSON<T = unknown>(
  options: CallClaudeOptions
): Promise<{ data: T; usage: CallClaudeResult["usage"] }> {
  const result = await callClaude(options);

  let jsonString = result.content.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  // Handle cases where Claude adds text before/after the fences
  const fenceMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    jsonString = fenceMatch[1].trim();
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  // If the string still doesn't look like JSON, try to extract it
  if (!jsonString.startsWith("{") && !jsonString.startsWith("[")) {
    const jsonStart = jsonString.indexOf("{");
    const jsonArrayStart = jsonString.indexOf("[");
    const start = jsonStart >= 0 && (jsonArrayStart < 0 || jsonStart < jsonArrayStart) ? jsonStart : jsonArrayStart;
    if (start >= 0) {
      jsonString = jsonString.slice(start);
    }
  }

  try {
    const data = JSON.parse(jsonString) as T;
    return { data, usage: result.usage };
  } catch {
    throw new Error(
      `Failed to parse Claude response as JSON. Raw response: ${result.content.slice(0, 200)}...`
    );
  }
}
