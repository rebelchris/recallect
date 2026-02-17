import { db } from "@/db/drizzle";
import {
  contacts,
  conversations,
  importantDates,
  contactsToGroups,
} from "@/db/schema";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import { CONTACT_FREQUENCIES, getStaleness } from "@/lib/constants";

export interface StaleContact {
  id: string;
  name: string;
  lastName: string | null;
  photoUrl: string | null;
  contactFrequency: string;
  lastConversationDate: string | null;
  daysSince: number;
  frequencyDays: number;
  staleness: "green" | "yellow" | "red";
}

export async function getStaleContacts(): Promise<StaleContact[]> {
  const allContacts = await db.query.contacts.findMany({
    where: (contacts, { isNotNull }) =>
      isNotNull(contacts.contactFrequency),
    with: {
      conversations: {
        orderBy: [desc(conversations.timestamp)],
        limit: 1,
      },
    },
  });

  const now = new Date();
  const staleContacts: StaleContact[] = [];

  for (const contact of allContacts) {
    const freq = contact.contactFrequency as keyof typeof CONTACT_FREQUENCIES;
    if (!freq || !CONTACT_FREQUENCIES[freq]) continue;

    const frequencyDays = CONTACT_FREQUENCIES[freq].days;
    const lastConvo = contact.conversations[0];
    const lastDate = lastConvo ? new Date(lastConvo.timestamp) : new Date(contact.createdAt);
    const daysSince = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const staleness = getStaleness(daysSince, frequencyDays);

    // Only include contacts approaching or past their frequency
    if (daysSince >= frequencyDays * 0.8) {
      staleContacts.push({
        id: contact.id,
        name: contact.name,
        lastName: contact.lastName,
        photoUrl: contact.photoUrl,
        contactFrequency: freq,
        lastConversationDate: lastConvo?.timestamp ?? null,
        daysSince,
        frequencyDays,
        staleness,
      });
    }
  }

  // Sort by most overdue first (highest ratio)
  staleContacts.sort(
    (a, b) => b.daysSince / b.frequencyDays - a.daysSince / a.frequencyDays
  );

  return staleContacts;
}

export interface UpcomingDate {
  id: string;
  contactId: string;
  contactName: string;
  contactLastName: string | null;
  label: string;
  date: string;
  year: number | null;
  daysUntil: number;
}

export async function getUpcomingDates(
  withinDays: number = 30
): Promise<UpcomingDate[]> {
  const allDates = await db.query.importantDates.findMany({
    with: {
      contact: true,
    },
  });

  const now = new Date();
  const upcoming: UpcomingDate[] = [];

  for (const d of allDates) {
    if (!d.recurring && d.year) {
      // Non-recurring: only show if the actual date is in the future
      const fullDate = new Date(`${d.date}T00:00:00`);
      const diff = Math.floor(
        (fullDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff >= 0 && diff <= withinDays) {
        upcoming.push({
          id: d.id,
          contactId: d.contactId,
          contactName: d.contact.name,
          contactLastName: d.contact.lastName,
          label: d.label,
          date: d.date,
          year: d.year,
          daysUntil: diff,
        });
      }
    } else {
      // Recurring: calculate next occurrence this year or next
      const [, month, day] = d.date.split("-").map(Number);
      const thisYear = now.getFullYear();

      let nextOccurrence = new Date(thisYear, month - 1, day);
      if (nextOccurrence < now) {
        nextOccurrence = new Date(thisYear + 1, month - 1, day);
      }

      const diff = Math.floor(
        (nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diff >= 0 && diff <= withinDays) {
        upcoming.push({
          id: d.id,
          contactId: d.contactId,
          contactName: d.contact.name,
          contactLastName: d.contact.lastName,
          label: d.label,
          date: d.date,
          year: d.year,
          daysUntil: diff,
        });
      }
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming;
}

export async function getRecentInteractions(limit: number = 10) {
  return db.query.conversations.findMany({
    with: {
      contact: true,
    },
    orderBy: [desc(conversations.timestamp)],
    limit,
  });
}
