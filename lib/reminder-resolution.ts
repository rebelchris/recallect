import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { reminders } from "@/db/schema";
import { generateStructuredOutput } from "@/lib/llm-client";

const DEFAULT_MIN_CONFIDENCE = 0.72;
const MAX_CANDIDATES = 8;

interface ConversationLike {
  id: string;
  content: string;
  timestamp: string;
  type: string;
}

interface LlmResolutionRow {
  reminder_id?: unknown;
  resolved?: unknown;
  confidence?: unknown;
}

interface LlmResolutionResult {
  items?: unknown;
}

export interface ReminderResolutionResult {
  resolvedIds: string[];
  source: "llm" | "rules";
}

function getMinConfidence(): number {
  const parsed = Number(process.env.AUTO_REMINDER_RESOLUTION_MIN_CONFIDENCE);
  if (!Number.isFinite(parsed)) return DEFAULT_MIN_CONFIDENCE;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function hasCompletionSignal(content: string): boolean {
  return /\b(done|sent|shared|emailed|called|texted|messaged|reached out|followed up|checked in|spoke|talked|met|scheduled|booked|confirmed)\b/.test(
    content
  );
}

function hasNegationSignal(content: string): boolean {
  return /\b(not yet|haven't|have not|didn't|did not|need to|todo|to-do|later|tomorrow)\b/.test(
    content
  );
}

async function resolveWithLlm(
  conversation: ConversationLike,
  candidates: Array<{
    id: string;
    remindAt: string;
    conversationSummary: string;
  }>
): Promise<string[]> {
  const minConfidence = getMinConfidence();
  const nowIso = new Date().toISOString();

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a strict classifier for reminder resolution. Return JSON only. " +
        "For each reminder, set resolved=true only when the new conversation clearly indicates the task has been completed.",
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        now_iso: nowIso,
        new_conversation: {
          id: conversation.id,
          timestamp: conversation.timestamp,
          type: conversation.type,
          content: conversation.content,
        },
        reminders: candidates.map((candidate) => ({
          reminder_id: candidate.id,
          remind_at: candidate.remindAt,
          reminder_context: candidate.conversationSummary,
        })),
        output_schema: {
          items: [
            {
              reminder_id: "string",
              resolved: "boolean",
              confidence: "number 0..1",
            },
          ],
        },
      }),
    },
  ];

  const parsed = await generateStructuredOutput<LlmResolutionResult>(messages);
  if (!parsed || !Array.isArray(parsed.items)) {
    return [];
  }

  const candidateIds = new Set(candidates.map((item) => item.id));
  const resolvedIds: string[] = [];

  for (const rawItem of parsed.items as LlmResolutionRow[]) {
    if (!rawItem || typeof rawItem !== "object") continue;
    if (typeof rawItem.reminder_id !== "string") continue;
    if (!candidateIds.has(rawItem.reminder_id)) continue;
    if (rawItem.resolved !== true) continue;
    if (normalizeConfidence(rawItem.confidence) < minConfidence) continue;
    resolvedIds.push(rawItem.reminder_id);
  }

  return resolvedIds;
}

function resolveWithRules(
  conversation: ConversationLike,
  candidates: Array<{
    id: string;
    remindAt: string;
  }>
): string[] {
  const content = conversation.content.toLowerCase();
  if (!hasCompletionSignal(content) || hasNegationSignal(content)) {
    return [];
  }

  const dueCandidates = candidates
    .filter(
      (candidate) =>
        new Date(candidate.remindAt).getTime() <=
        new Date(conversation.timestamp).getTime()
    )
    .sort(
      (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
    );

  // Conservative fallback: resolve at most the oldest due reminder.
  return dueCandidates[0] ? [dueCandidates[0].id] : [];
}

export async function resolvePendingRemindersFromConversation(input: {
  contactId: string;
  conversation: ConversationLike;
}): Promise<ReminderResolutionResult | null> {
  const candidates = await db.query.reminders.findMany({
    where: and(
      eq(reminders.contactId, input.contactId),
      eq(reminders.status, "PENDING"),
      lte(reminders.remindAt, new Date().toISOString())
    ),
    with: {
      conversation: true,
    },
    orderBy: [reminders.remindAt],
    limit: MAX_CANDIDATES,
  });

  if (candidates.length === 0) {
    return null;
  }

  const normalizedCandidates = candidates.map((candidate) => ({
    id: candidate.id,
    remindAt: candidate.remindAt,
    conversationSummary: candidate.conversation?.content || "",
  }));

  let resolvedIds = await resolveWithLlm(input.conversation, normalizedCandidates);
  let source: "llm" | "rules" = "llm";

  if (resolvedIds.length === 0) {
    resolvedIds = resolveWithRules(input.conversation, normalizedCandidates);
    source = "rules";
  }

  if (resolvedIds.length === 0) {
    return null;
  }

  for (const reminderId of resolvedIds) {
    await db
      .update(reminders)
      .set({
        status: "DISMISSED",
      })
      .where(eq(reminders.id, reminderId));
  }

  return {
    resolvedIds,
    source,
  };
}
