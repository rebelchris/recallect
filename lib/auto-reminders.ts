import { CONTACT_FREQUENCIES, type ContactFrequency } from "@/lib/constants";
import { generateStructuredOutput } from "@/lib/llm-client";

const MIN_REMINDER_DAYS = 1;
const MAX_REMINDER_DAYS = 180;
const DEFAULT_REMINDER_HOUR = 9;
const DEFAULT_MIN_CONFIDENCE = 0.72;

interface AutoReminderInput {
  content: string;
  contactName: string;
  contactFrequency?: string | null;
  interactionType?: string;
  conversationTimestamp?: string;
}

interface RuleSuggestion {
  shouldRemind: boolean;
  daysUntil: number | null;
  confidence: number;
  reason: string;
  source: "rules";
}

interface LlmSuggestion {
  shouldRemind: boolean;
  daysUntil: number | null;
  confidence: number;
  reason: string;
  source: "llm";
}

export interface AutoReminderSuggestion {
  shouldCreate: boolean;
  remindAt: string | null;
  daysUntil: number | null;
  reason: string;
  confidence: number;
  source: "rules" | "llm";
}

interface LlmReminderOutput {
  should_remind?: unknown;
  days_until?: unknown;
  confidence?: unknown;
  reason?: unknown;
}

function clampDays(value: number): number {
  return Math.min(MAX_REMINDER_DAYS, Math.max(MIN_REMINDER_DAYS, value));
}

function normalizeDays(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return clampDays(Math.round(value));
}

function normalizeConfidence(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

function getConfiguredMinConfidence(): number {
  const parsed = Number(process.env.AUTO_REMINDER_MIN_CONFIDENCE);
  if (!Number.isFinite(parsed)) return DEFAULT_MIN_CONFIDENCE;
  return Math.max(0, Math.min(1, parsed));
}

function getFrequencyDays(
  contactFrequency: string | null | undefined
): number | null {
  if (!contactFrequency) return null;
  if (contactFrequency in CONTACT_FREQUENCIES) {
    const key = contactFrequency as ContactFrequency;
    return CONTACT_FREQUENCIES[key].days;
  }
  return null;
}

function extractExplicitDays(content: string): number | null {
  if (/\btomorrow\b/.test(content)) return 1;
  if (/\bnext\s+week\b/.test(content)) return 7;
  if (/\bnext\s+month\b/.test(content)) return 30;

  const inDaysMatch = content.match(/\bin\s+(\d{1,3})\s+days?\b/);
  if (inDaysMatch) {
    return clampDays(Number(inDaysMatch[1]));
  }

  const inWeeksMatch = content.match(/\bin\s+(\d{1,2})\s+weeks?\b/);
  if (inWeeksMatch) {
    return clampDays(Number(inWeeksMatch[1]) * 7);
  }

  return null;
}

function hasFollowUpIntent(content: string): boolean {
  return /\b(follow\s?up|check\s?in|circle\s?back|remind me|ping|reach out|send|share)\b/.test(
    content
  );
}

function getRuleSuggestion(input: AutoReminderInput): RuleSuggestion {
  const normalized = input.content.toLowerCase();
  const explicitDays = extractExplicitDays(normalized);
  const intent = hasFollowUpIntent(normalized);
  const frequencyDays = getFrequencyDays(input.contactFrequency);

  if (!intent && explicitDays === null) {
    return {
      shouldRemind: false,
      daysUntil: null,
      confidence: 0,
      reason: "No explicit follow-up signal found in the conversation.",
      source: "rules",
    };
  }

  const daysUntil =
    explicitDays ??
    (frequencyDays ? clampDays(Math.max(2, Math.round(frequencyDays / 2))) : 7);
  const confidence =
    explicitDays !== null && intent
      ? 0.86
      : explicitDays !== null
        ? 0.78
        : 0.67;
  const reason =
    explicitDays !== null
      ? `Conversation includes a follow-up time cue (${daysUntil} day window).`
      : "Conversation includes follow-up intent language.";

  return {
    shouldRemind: true,
    daysUntil,
    confidence,
    reason,
    source: "rules",
  };
}

async function getLlmSuggestion(
  input: AutoReminderInput
): Promise<LlmSuggestion | null> {
  const nowIso = new Date().toISOString();
  const frequencyDays = getFrequencyDays(input.contactFrequency);

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a reminder extraction model. Return strict JSON only. No markdown. " +
        "Choose should_remind=true only if there is a credible future follow-up action. " +
        `days_until must be an integer ${MIN_REMINDER_DAYS}-${MAX_REMINDER_DAYS} or null.`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        now_iso: nowIso,
        contact_name: input.contactName,
        interaction_type: input.interactionType || "other",
        contact_frequency_days: frequencyDays,
        conversation_timestamp: input.conversationTimestamp || nowIso,
        conversation_content: input.content,
        output_schema: {
          should_remind: "boolean",
          days_until: "integer | null",
          confidence: "number 0..1",
          reason: "short string",
        },
      }),
    },
  ];

  const parsed = await generateStructuredOutput<LlmReminderOutput>(messages);
  if (!parsed) return null;

  const shouldRemind = parsed.should_remind === true;
  const daysUntil = normalizeDays(parsed.days_until);
  const confidence = normalizeConfidence(parsed.confidence, 0.6);
  const reason =
    typeof parsed.reason === "string" && parsed.reason.trim().length > 0
      ? parsed.reason.trim()
      : "Model identified follow-up intent in the conversation.";

  return {
    shouldRemind,
    daysUntil,
    confidence,
    reason,
    source: "llm",
  };
}

function buildRemindAt(timestampIso: string | undefined, daysUntil: number): string {
  const baseDate = timestampIso ? new Date(timestampIso) : new Date();
  const safeBase = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const remindAt = new Date(safeBase);
  remindAt.setDate(remindAt.getDate() + daysUntil);
  remindAt.setHours(DEFAULT_REMINDER_HOUR, 0, 0, 0);
  return remindAt.toISOString();
}

export async function suggestAutoReminder(
  input: AutoReminderInput
): Promise<AutoReminderSuggestion | null> {
  const minConfidence = getConfiguredMinConfidence();
  const ruleSuggestion = getRuleSuggestion(input);
  const llmSuggestion = await getLlmSuggestion(input);

  let selected: RuleSuggestion | LlmSuggestion | null = null;

  if (llmSuggestion) {
    if (!llmSuggestion.shouldRemind && llmSuggestion.confidence >= 0.75) {
      return null;
    }

    if (
      llmSuggestion.shouldRemind &&
      llmSuggestion.daysUntil !== null &&
      llmSuggestion.confidence >= minConfidence
    ) {
      selected = llmSuggestion;
    }
  }

  if (
    !selected &&
    ruleSuggestion.shouldRemind &&
    ruleSuggestion.daysUntil !== null &&
    ruleSuggestion.confidence >= Math.max(0.6, minConfidence - 0.1)
  ) {
    selected = ruleSuggestion;
  }

  if (!selected || selected.daysUntil === null) {
    return null;
  }

  return {
    shouldCreate: true,
    remindAt: buildRemindAt(input.conversationTimestamp, selected.daysUntil),
    daysUntil: selected.daysUntil,
    reason: selected.reason,
    confidence: selected.confidence,
    source: selected.source,
  };
}
