import { NextRequest, NextResponse } from "next/server";
import { getServerSessionOrMock } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { isMockAuthEnabled } from "@/lib/mockFlags";

export async function GET(request: NextRequest) {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const personId = searchParams.get("personId");

  if (isMockAuthEnabled()) {
    return NextResponse.json([
      {
        id: "mock-convo",
        content: "Mock conversation",
        timestamp: new Date().toISOString(),
        personId: personId || "mock-person",
      },
    ]);
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      person: {
        user: { email: session.user.email },
      },
      ...(personId && { personId }),
    },
    include: {
      person: true,
      reminders: true,
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { personId, content, timestamp } = body as {
    personId: string;
    content: string;
    timestamp?: string;
  };
  if (!personId || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (isMockAuthEnabled()) {
    return NextResponse.json({ id: "mock-convo", personId, content, timestamp: timestamp || new Date().toISOString() });
  }

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const convo = await prisma.conversation.create({
    data: {
      personId,
      content,
      timestamp: timestamp ? new Date(timestamp) : undefined,
    },
  });
  return NextResponse.json(convo);
}


