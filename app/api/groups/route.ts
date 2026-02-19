import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGroups } from "@/lib/queries/groups";

export async function GET() {
  const result = await getGroups();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, color, icon } = body;

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const [group] = await db
    .insert(groups)
    .values({
      name,
      color: color || null,
      icon: icon || null,
    })
    .returning();

  return NextResponse.json(group);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, name, color, icon } = body;

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const [updated] = await db
    .update(groups)
    .set({
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color: color || null }),
      ...(icon !== undefined && { icon: icon || null }),
    })
    .where(eq(groups.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await db.delete(groups).where(eq(groups.id, id));
  return NextResponse.json({ success: true });
}
