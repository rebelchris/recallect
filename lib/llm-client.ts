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
  chatPath: string;
  timeoutMs: number;
  temperature: number;
  extraHeaders: Record<string, string>;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
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

function toStringContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const parts = content
      .map((part) => {
        if (!part || typeof part !== "object") return "";
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      })
      .filter(Boolean);

    return parts.length > 0 ? parts.join("\n") : null;
  }

  return null;
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

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
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

  const defaultPath =
    provider === "ollama" ? "/api/chat" : "/chat/completions";
  const chatPath = process.env.REMINDER_LLM_CHAT_PATH?.trim() || defaultPath;
  const apiKey = process.env.REMINDER_LLM_API_KEY?.trim();
  const timeoutMs = Number(process.env.REMINDER_LLM_TIMEOUT_MS || "12000");
  const temperature = Number(process.env.REMINDER_LLM_TEMPERATURE || "0.2");
  const extraHeaders = parseExtraHeaders(process.env.REMINDER_LLM_HEADERS_JSON);

  return {
    provider,
    model,
    baseUrl,
    apiKey: apiKey || undefined,
    chatPath,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 12000,
    temperature: Number.isFinite(temperature) ? temperature : 0.2,
    extraHeaders,
  };
}

function joinUrl(baseUrl: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

async function runOpenAiCompatible<T>(
  config: LlmConfig,
  messages: ChatMessage[]
): Promise<T | null> {
  const url = joinUrl(config.baseUrl, config.chatPath);
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...config.extraHeaders,
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const basePayload = {
    model: config.model,
    messages,
    temperature: config.temperature,
  };

  const payloads: Array<Record<string, unknown>> = [
    {
      ...basePayload,
      response_format: { type: "json_object" },
    },
    basePayload,
  ];

  for (const payload of payloads) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
        config.timeoutMs
      );

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const raw = toStringContent(data.choices?.[0]?.message?.content);
      if (!raw) continue;

      const parsed = parseStructuredJson<T>(raw);
      if (parsed) return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

async function runOllama<T>(
  config: LlmConfig,
  messages: ChatMessage[]
): Promise<T | null> {
  const url = joinUrl(config.baseUrl, config.chatPath);
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...config.extraHeaders,
  };

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        format: "json",
        options: {
          temperature: config.temperature,
        },
      }),
    },
    config.timeoutMs
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    message?: { content?: unknown };
  };
  const raw = toStringContent(data.message?.content);
  if (!raw) return null;

  return parseStructuredJson<T>(raw);
}

export async function generateStructuredOutput<T>(
  messages: ChatMessage[]
): Promise<T | null> {
  const config = getLlmConfig();
  if (!config) return null;

  try {
    if (config.provider === "ollama") {
      return await runOllama<T>(config, messages);
    }

    return await runOpenAiCompatible<T>(config, messages);
  } catch {
    return null;
  }
}
