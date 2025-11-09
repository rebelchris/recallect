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
    return NextResponse.json({
      id,
      content: "Mock conversation",
      timestamp: new Date().toISOString(),
      personId: "mock-person",
    });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      person: {
        user: { email: session.user.email },
      },
    },
    include: {
      person: true,
      reminders: true,
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
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
  const { content, timestamp } = body as {
    content?: string;
    timestamp?: string;
  };

  if (isMockAuthEnabled()) {
    return NextResponse.json({ id, content, timestamp });
  }

  // Verify the conversation belongs to the current user
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      id,
      person: {
        user: { email: session.user.email },
      },
    },
  });

  if (!existingConversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
      ...(timestamp !== undefined && { timestamp: new Date(timestamp) }),
    },
    include: {
      person: true,
      reminders: true,
    },
  });

  return NextResponse.json(conversation);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (isMockAuthEnabled()) {
    return NextResponse.json({ success: true });
  }

  // Verify the conversation belongs to the current user
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      id,
      person: {
        user: { email: session.user.email },
      },
    },
  });

  if (!existingConversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.conversation.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
