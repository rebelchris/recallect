import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { conversations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { content, timestamp, type } = body as {
    content?: string;
    timestamp?: string;
    type?: string;
  };

  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(conversations)
    .set({
      ...(content !== undefined && { content }),
      ...(timestamp !== undefined && { timestamp }),
      ...(type !== undefined && {
        type: type as typeof conversations.type.enumValues[number],
      }),
    })
    .where(eq(conversations.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(conversations).where(eq(conversations.id, id));
  return NextResponse.json({ success: true });
}
