import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";

// GET /api/reminders - Get all reminders for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
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
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
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

    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        person: {
          userId: session.user.id,
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
        userId: session.user.id,
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
