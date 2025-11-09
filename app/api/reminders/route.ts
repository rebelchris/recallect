import { NextRequest, NextResponse } from "next/server";
import { getServerSessionOrMock } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

// GET /api/reminders - Get all reminders for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionOrMock();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const personId = searchParams.get("personId");

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const where: any = {
      userId: user.id,
    };

    if (status) {
      where.status = status;
    }

    if (personId) {
      where.personId = personId;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        person: true,
        conversation: true,
      },
      orderBy: {
        remindAt: "asc",
      },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

// POST /api/reminders - Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionOrMock();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, personId, remindAt } = body;

    if (!conversationId || !personId || !remindAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        person: {
          userId: user.id,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: user.id,
        personId,
        conversationId,
        remindAt: new Date(remindAt),
      },
      include: {
        person: true,
        conversation: true,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    );
  }
}
