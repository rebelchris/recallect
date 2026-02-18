import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { conversations } from "@/db/schema";
import { suggestAutoReminder } from "@/lib/auto-reminders";
import { createReminderIfMissing } from "@/lib/reminders";

interface BackfillRequestBody {
  dryRun?: boolean;
  limit?: number;
  contactId?: string;
  fromTimestamp?: string;
  toTimestamp?: string;
}

function asIso(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 200;
  return Math.max(1, Math.min(2000, Math.floor(parsed)));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as BackfillRequestBody;
  const dryRun = body.dryRun !== false;
  const limit = parseLimit(body.limit);
  const contactId = body.contactId?.trim();
  const fromIso = asIso(body.fromTimestamp);
  const toIso = asIso(body.toTimestamp);

  if (body.fromTimestamp && !fromIso) {
    return NextResponse.json(
      { error: "Invalid fromTimestamp. Use ISO date/time." },
      { status: 400 }
    );
  }

  if (body.toTimestamp && !toIso) {
    return NextResponse.json(
      { error: "Invalid toTimestamp. Use ISO date/time." },
      { status: 400 }
    );
  }

  const filters = [
    contactId ? eq(conversations.contactId, contactId) : undefined,
    fromIso ? gte(conversations.timestamp, fromIso) : undefined,
    toIso ? lte(conversations.timestamp, toIso) : undefined,
  ].filter(Boolean);

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const items = await db.query.conversations.findMany({
    where: whereClause,
    with: {
      contact: true,
      reminders: {
        limit: 1,
      },
    },
    orderBy: [desc(conversations.timestamp)],
    limit,
  });

  let scanned = 0;
  let created = 0;
  let wouldCreate = 0;
  let skippedWithExisting = 0;
  let skippedNoSuggestion = 0;
  let errors = 0;

  const preview: Array<{
    conversationId: string;
    contactId: string;
    contactName: string;
    remindAt: string;
    source: "rules" | "llm";
    confidence: number;
    reason: string;
  }> = [];

  for (const conversation of items) {
    scanned += 1;

    if (!conversation.contact) {
      errors += 1;
      continue;
    }

    if (conversation.reminders.length > 0) {
      skippedWithExisting += 1;
      continue;
    }

    try {
      const contactName = conversation.contact.lastName
        ? `${conversation.contact.name} ${conversation.contact.lastName}`
        : conversation.contact.name;

      const suggestion = await suggestAutoReminder({
        content: conversation.content,
        contactName,
        contactFrequency: conversation.contact.contactFrequency,
        interactionType: conversation.type,
        conversationTimestamp: conversation.timestamp,
      });

      if (!suggestion?.shouldCreate || !suggestion.remindAt) {
        skippedNoSuggestion += 1;
        continue;
      }

      if (dryRun) {
        wouldCreate += 1;
        if (preview.length < 50) {
          preview.push({
            conversationId: conversation.id,
            contactId: conversation.contactId,
            contactName,
            remindAt: suggestion.remindAt,
            source: suggestion.source,
            confidence: suggestion.confidence,
            reason: suggestion.reason,
          });
        }
        continue;
      }

      const inserted = await createReminderIfMissing({
        contactId: conversation.contactId,
        conversationId: conversation.id,
        remindAt: suggestion.remindAt,
      });

      if (inserted.created) {
        created += 1;
      } else {
        skippedWithExisting += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return NextResponse.json({
    dryRun,
    filters: {
      limit,
      contactId: contactId || null,
      fromTimestamp: fromIso,
      toTimestamp: toIso,
    },
    counts: {
      scanned,
      created,
      wouldCreate,
      skippedWithExisting,
      skippedNoSuggestion,
      errors,
    },
    preview,
  });
}
