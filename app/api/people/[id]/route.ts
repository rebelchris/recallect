import { NextResponse } from "next/server";
import { getServerSessionOrMock } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { isMockAuthEnabled } from "@/lib/mockFlags";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (isMockAuthEnabled()) {
    return NextResponse.json({ id, name: "Mock Person", userId: "u1" });
  }

  const person = await prisma.person.findFirst({
    where: {
      id,
      user: { email: session.user.email },
    },
    include: { group: true },
  });

  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(person);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, photoUrl, groupId } = body as {
    name?: string;
    photoUrl?: string;
    groupId?: string | null;
  };

  if (isMockAuthEnabled()) {
    return NextResponse.json({ id, name, photoUrl, groupId, userId: "u1" });
  }

  // Verify the person belongs to the current user
  const existingPerson = await prisma.person.findFirst({
    where: {
      id,
      user: { email: session.user.email },
    },
  });

  if (!existingPerson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const person = await prisma.person.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(photoUrl !== undefined && { photoUrl }),
      ...(groupId !== undefined && { groupId }),
    },
    include: { group: true },
  });

  return NextResponse.json(person);
}
