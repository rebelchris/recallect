import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { reminders, conversations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createReminderIfMissing } from "@/lib/reminders";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const contactId = searchParams.get("contactId");

  let where;
  if (status && contactId) {
    where = and(
      eq(reminders.status, status as "PENDING" | "SENT" | "DISMISSED"),
      eq(reminders.contactId, contactId)
    );
  } else if (status) {
    where = eq(reminders.status, status as "PENDING" | "SENT" | "DISMISSED");
  } else if (contactId) {
    where = eq(reminders.contactId, contactId);
  }

  const result = await db.query.reminders.findMany({
    where,
    with: {
      contact: true,
      conversation: true,
    },
    orderBy: [reminders.remindAt],
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { conversationId, contactId, remindAt } = body;

  if (!conversationId || !contactId || !remindAt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const { created, reminder } = await createReminderIfMissing({
    contactId,
    conversationId,
    remindAt,
  });

  return NextResponse.json(reminder, { status: created ? 201 : 200 });
}
