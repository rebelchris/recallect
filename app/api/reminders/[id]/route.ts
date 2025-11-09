import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";

// PATCH /api/reminders/[id] - Update a reminder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { remindAt, status } = body;

    // Verify the reminder belongs to the user
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (remindAt) {
      updateData.remindAt = new Date(remindAt);
    }
    if (status) {
      updateData.status = status;
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
      include: {
        person: true,
        conversation: true,
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 500 }
    );
  }
}

// DELETE /api/reminders/[id] - Delete a reminder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the reminder belongs to the user
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    await prisma.reminder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
