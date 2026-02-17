import { db } from "@/db/drizzle";
import {
  contacts,
  conversations,
  contactsToGroups,
  groups,
  importantDates,
} from "@/db/schema";
import { eq, desc, like, or, sql } from "drizzle-orm";

export async function getContacts(options?: {
  groupId?: string;
  search?: string;
}) {
  let result = await db.query.contacts.findMany({
    with: {
      conversations: {
        orderBy: [desc(conversations.timestamp)],
        limit: 1,
      },
      contactsToGroups: {
        with: { group: true },
      },
      importantDates: true,
    },
    orderBy: [desc(contacts.updatedAt)],
  });

  // Filter by search
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.lastName?.toLowerCase().includes(searchLower) ||
        c.nickname?.toLowerCase().includes(searchLower) ||
        c.company?.toLowerCase().includes(searchLower)
    );
  }

  // Filter by group
  if (options?.groupId && options.groupId !== "ALL") {
    result = result.filter((c) =>
      c.contactsToGroups.some((ctg) => ctg.groupId === options.groupId)
    );
  }

  // Map to add groups array and conversation count
  return result.map((c) => ({
    ...c,
    groups: c.contactsToGroups.map((ctg) => ctg.group),
    lastConversationDate: c.conversations[0]?.timestamp ?? null,
    _count: { conversations: 0 }, // Will be filled below
  }));
}

export async function getContact(id: string) {
  const result = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: {
      contactsToGroups: {
        with: { group: true },
      },
      importantDates: true,
    },
  });

  if (!result) return null;

  return {
    ...result,
    groups: result.contactsToGroups.map((ctg) => ctg.group),
  };
}

export async function searchContacts(query: string) {
  const searchLower = `%${query.toLowerCase()}%`;

  const results = await db
    .select()
    .from(contacts)
    .where(
      or(
        like(contacts.name, searchLower),
        like(contacts.lastName, searchLower),
        like(contacts.nickname, searchLower),
        like(contacts.company, searchLower)
      )
    )
    .orderBy(contacts.name);

  return results;
}
