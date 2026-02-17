import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { importantDates, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");

  const result = await db.query.importantDates.findMany({
    where: contactId ? eq(importantDates.contactId, contactId) : undefined,
    with: {
      contact: true,
    },
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { contactId, label, date, year, recurring } = body;

  if (!contactId || !label || !date) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    return NextResponse.json(
      { error: "Contact not found" },
      { status: 404 }
    );
  }

  const [importantDate] = await db
    .insert(importantDates)
    .values({
      contactId,
      label: label as "birthday" | "anniversary" | "custom",
      date,
      year: year ?? null,
      recurring: recurring ?? true,
    })
    .returning();

  return NextResponse.json(importantDate, { status: 201 });
}
