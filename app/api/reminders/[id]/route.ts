import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { reminders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { remindAt, status } = body;

  const existing = await db.query.reminders.findFirst({
    where: eq(reminders.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(reminders)
    .set({
      ...(remindAt && { remindAt: new Date(remindAt).toISOString() }),
      ...(status && {
        status: status as "PENDING" | "SENT" | "DISMISSED",
      }),
    })
    .where(eq(reminders.id, id))
    .returning();

  const result = await db.query.reminders.findFirst({
    where: eq(reminders.id, updated.id),
    with: {
      contact: true,
      conversation: true,
    },
  });

  return NextResponse.json(result);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await db.query.reminders.findFirst({
    where: eq(reminders.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(reminders).where(eq(reminders.id, id));
  return NextResponse.json({ success: true });
}
