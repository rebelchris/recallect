import { completeSimple, type Context, type Message, type Model } from "@mariozechner/pi-ai";

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

type LlmProvider = "openai-compatible" | "ollama";

interface LlmConfig {
  provider: LlmProvider;
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  temperature: number;
  maxTokens: number;
  extraHeaders: Record<string, string>;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function toPiOpenAiBaseUrl(provider: LlmProvider, baseUrl: string): string {
  if (provider !== "ollama") return baseUrl;
  if (/\/v1$/i.test(baseUrl)) return baseUrl;
  return `${baseUrl}/v1`;
}

function parseProvider(value: string | undefined): LlmProvider {
  return value === "ollama" ? "ollama" : "openai-compatible";
}

function parseExtraHeaders(value: string | undefined): Record<string, string> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const headers: Record<string, string> = {};
    for (const [key, headerValue] of Object.entries(parsed)) {
      if (typeof headerValue === "string") {
        headers[key] = headerValue;
      }
    }
    return headers;
  } catch {
    return {};
  }
}

function parseStructuredJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start < 0 || end <= start) return null;

    const slice = value.slice(start, end + 1);
    try {
      return JSON.parse(slice) as T;
    } catch {
      return null;
    }
  }
}

function getLlmConfig(): LlmConfig | null {
  const model = process.env.REMINDER_LLM_MODEL?.trim();
  if (!model) return null;

  const provider = parseProvider(process.env.REMINDER_LLM_PROVIDER);
  const defaultBaseUrl =
    provider === "ollama"
      ? "http://127.0.0.1:11434"
      : "https://api.openai.com/v1";
  const baseUrl = normalizeBaseUrl(
    process.env.REMINDER_LLM_BASE_URL?.trim() || defaultBaseUrl
  );

  const apiKey = process.env.REMINDER_LLM_API_KEY?.trim();
  const timeoutMs = Number(process.env.REMINDER_LLM_TIMEOUT_MS || "12000");
  const temperature = Number(process.env.REMINDER_LLM_TEMPERATURE || "0.2");
  const maxTokens = Number(process.env.REMINDER_LLM_MAX_TOKENS || "512");
  const extraHeaders = parseExtraHeaders(process.env.REMINDER_LLM_HEADERS_JSON);

  return {
    provider,
    model,
    baseUrl,
    apiKey: apiKey || undefined,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 12000,
    temperature: Number.isFinite(temperature) ? temperature : 0.2,
    maxTokens: Number.isFinite(maxTokens) ? maxTokens : 512,
    extraHeaders,
  };
}

function toPiContext(messages: ChatMessage[]): Context {
  const now = Date.now();
  const systemPrompt = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();

  const piMessages: Message[] = [];

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const timestamp = now + i;

    if (message.role === "system") continue;

    if (message.role === "assistant") {
      piMessages.push({
        role: "assistant",
        content: [{ type: "text", text: message.content }],
        api: "openai-completions",
        provider: "openai",
        model: "context",
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        },
        stopReason: "stop",
        timestamp,
      });
      continue;
    }

    piMessages.push({
      role: "user",
      content: message.content,
      timestamp,
    });
  }

  // Guard against invalid empty context.
  if (piMessages.length === 0) {
    piMessages.push({
      role: "user",
      content: "{}",
      timestamp: now,
    });
  }

  return {
    ...(systemPrompt && { systemPrompt }),
    messages: piMessages,
  };
}

function buildPiModel(config: LlmConfig): Model<"openai-completions"> {
  return {
    id: config.model,
    name: config.model,
    api: "openai-completions",
    provider: config.provider,
    baseUrl: toPiOpenAiBaseUrl(config.provider, config.baseUrl),
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: config.maxTokens,
    headers:
      Object.keys(config.extraHeaders).length > 0 ? config.extraHeaders : undefined,
  };
}

async function runWithPiAi<T>(
  config: LlmConfig,
  messages: ChatMessage[]
): Promise<T | null> {
  const model = buildPiModel(config);
  const context = toPiContext(messages);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await completeSimple(model, context, {
      apiKey: config.apiKey,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      headers: config.extraHeaders,
      signal: controller.signal,
    });

    const raw = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!raw) return null;
    return parseStructuredJson<T>(raw);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateStructuredOutput<T>(
  messages: ChatMessage[]
): Promise<T | null> {
  const config = getLlmConfig();
  if (!config) return null;

  try {
    return await runWithPiAi<T>(config, messages);
  } catch {
    return null;
  }
}
