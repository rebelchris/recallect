import { NextResponse } from "next/server";
import { getServerSessionOrMock } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { isMockAuthEnabled } from "@/lib/mockFlags";

export async function GET() {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isMockAuthEnabled()) {
    return NextResponse.json([
      { id: "p1", name: "Alice", userId: "u1" },
      { id: "p2", name: "Bob", userId: "u1" },
    ]);
  }

  const people = await prisma.person.findMany({
    where: { user: { email: session.user.email } },
    include: { group: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(people);
}

export async function POST(req: Request) {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, photoUrl, groupId } = body as { name: string; photoUrl?: string; groupId?: string };
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  if (isMockAuthEnabled()) {
    return NextResponse.json({ id: "mock-person", name, photoUrl, groupId, userId: "u1" });
  }

  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: {},
    create: { email: session.user.email, name: session.user.name ?? null },
  });

  const person = await prisma.person.create({
    data: { name, photoUrl, groupId, userId: user.id },
  });
  return NextResponse.json(person);
}


