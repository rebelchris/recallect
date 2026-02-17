import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { conversations, contacts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
  const { contactId, content, timestamp, type } = body as {
    contactId: string;
    content: string;
    timestamp?: string;
    type?: string;
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

  return NextResponse.json(convo);
}
