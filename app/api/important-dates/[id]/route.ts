import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { importantDates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { label, date, year, recurring } = body;

  const existing = await db.query.importantDates.findFirst({
    where: eq(importantDates.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(importantDates)
    .set({
      ...(label !== undefined && {
        label: label as "birthday" | "anniversary" | "custom",
      }),
      ...(date !== undefined && { date }),
      ...(year !== undefined && { year: year ?? null }),
      ...(recurring !== undefined && { recurring }),
    })
    .where(eq(importantDates.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await db.query.importantDates.findFirst({
    where: eq(importantDates.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(importantDates).where(eq(importantDates.id, id));
  return NextResponse.json({ success: true });
}
