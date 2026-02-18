import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { conversations, contacts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { suggestAutoReminder } from "@/lib/auto-reminders";
import { createReminderIfMissing } from "@/lib/reminders";
import { resolvePendingRemindersFromConversation } from "@/lib/reminder-resolution";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");

  const result = await db.query.conversations.findMany({
    where: contactId ? eq(conversations.contactId, contactId) : undefined,
    with: {
      contact: true,
      reminders: true,
    },
    orderBy: [desc(conversations.timestamp)],
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { contactId, content, timestamp, type, skipAutoReminder } = body as {
    contactId: string;
    content: string;
    timestamp?: string;
    type?: string;
    skipAutoReminder?: boolean;
  };

  if (!contactId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const [convo] = await db
    .insert(conversations)
    .values({
      contactId,
      content,
      type: (type as typeof conversations.type.enumValues[number]) || "other",
      timestamp: timestamp || new Date().toISOString(),
    })
    .returning();

  // Update contact's updatedAt
  await db
    .update(contacts)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(contacts.id, contactId));

  let autoReminder: {
    created: boolean;
    remindAt: string;
    reason: string;
    confidence: number;
    source: "rules" | "llm";
  } | null = null;
  let autoResolvedReminders: {
    count: number;
    ids: string[];
    source: "llm" | "rules";
  } | null = null;

  try {
    const resolved = await resolvePendingRemindersFromConversation({
      contactId,
      conversation: {
        id: convo.id,
        content,
        timestamp: convo.timestamp,
        type: (type as string) || "other",
      },
    });

    if (resolved) {
      autoResolvedReminders = {
        count: resolved.resolvedIds.length,
        ids: resolved.resolvedIds,
        source: resolved.source,
      };
    }
  } catch (error) {
    console.error("Auto reminder resolution failed:", error);
  }

  if (!skipAutoReminder) {
    try {
      const contactName = contact.lastName
        ? `${contact.name} ${contact.lastName}`
        : contact.name;
      const suggestion = await suggestAutoReminder({
        content,
        contactName,
        contactFrequency: contact.contactFrequency,
        interactionType: type,
        conversationTimestamp: convo.timestamp,
      });

      if (suggestion?.shouldCreate && suggestion.remindAt) {
        const createdReminder = await createReminderIfMissing({
          contactId,
          conversationId: convo.id,
          remindAt: suggestion.remindAt,
        });

        autoReminder = {
          created: createdReminder.created,
          remindAt: createdReminder.reminder.remindAt,
          reason: suggestion.reason,
          confidence: suggestion.confidence,
          source: suggestion.source,
        };
      }
    } catch (error) {
      console.error("Auto reminder generation failed:", error);
    }
  }

  return NextResponse.json({
    ...convo,
    autoReminder,
    autoResolvedReminders,
  });
}
