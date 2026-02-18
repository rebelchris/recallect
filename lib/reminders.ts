import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { reminders } from "@/db/schema";

interface CreateReminderInput {
  contactId: string;
  conversationId: string;
  remindAt: string;
}

type ReminderWithRelations = NonNullable<
  Awaited<ReturnType<typeof db.query.reminders.findFirst>>
>;

export async function createReminderIfMissing(
  input: CreateReminderInput
): Promise<{ created: boolean; reminder: ReminderWithRelations }> {
  const existing = await db.query.reminders.findFirst({
    where: and(
      eq(reminders.conversationId, input.conversationId),
      eq(reminders.status, "PENDING")
    ),
    with: {
      contact: true,
      conversation: true,
    },
  });

  if (existing) {
    return { created: false, reminder: existing };
  }

  const [createdReminder] = await db
    .insert(reminders)
    .values({
      contactId: input.contactId,
      conversationId: input.conversationId,
      remindAt: new Date(input.remindAt).toISOString(),
    })
    .returning();

  const reminder = await db.query.reminders.findFirst({
    where: eq(reminders.id, createdReminder.id),
    with: {
      contact: true,
      conversation: true,
    },
  });

  if (!reminder) {
    throw new Error("Failed to fetch created reminder");
  }

  return { created: true, reminder };
}
