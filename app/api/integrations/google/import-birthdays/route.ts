import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { importantDates } from "@/db/schema";
import { getValidGoogleAccessToken } from "@/lib/google-integration";

interface GooglePersonDate {
  year?: number;
  month?: number;
  day?: number;
}

interface GoogleBirthday {
  date?: GooglePersonDate;
  metadata?: {
    primary?: boolean;
  };
}

interface GooglePerson {
  names?: Array<{
    displayName?: string;
    givenName?: string;
    familyName?: string;
  }>;
  emailAddresses?: Array<{
    value?: string;
  }>;
  birthdays?: GoogleBirthday[];
}

interface GoogleConnectionsResponse {
  connections?: GooglePerson[];
  nextPageToken?: string;
}

function cleanLower(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function formatBirthdayDate(date: GooglePersonDate): {
  date: string;
  year: number | null;
} | null {
  if (!date.month || !date.day) {
    return null;
  }

  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  const year = date.year && date.year > 0 ? date.year : null;
  const dateValue = `${year ?? 2000}-${month}-${day}`;

  return {
    date: dateValue,
    year,
  };
}

function chooseBirthday(person: GooglePerson): GooglePersonDate | null {
  if (!person.birthdays || person.birthdays.length === 0) {
    return null;
  }

  const primary = person.birthdays.find((entry) => entry.metadata?.primary);
  if (primary?.date?.month && primary.date.day) {
    return primary.date;
  }

  const withMonthDay = person.birthdays.find(
    (entry) => entry.date?.month && entry.date.day
  );
  return withMonthDay?.date || null;
}

function toNameKey(person: GooglePerson): string | null {
  const first = person.names?.[0];
  if (!first) return null;

  const displayName = cleanLower(first.displayName);
  if (displayName) return displayName;

  const given = cleanLower(first.givenName);
  const family = cleanLower(first.familyName);
  if (given && family) return `${given} ${family}`;
  return null;
}

function parseMaxProfiles(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 2000;
  return Math.max(1, Math.min(5000, Math.floor(parsed)));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    dryRun?: boolean;
    maxProfiles?: number;
  };

  const dryRun = body.dryRun === true;
  const maxProfiles = parseMaxProfiles(body.maxProfiles);

  const accessToken = await getValidGoogleAccessToken(request.nextUrl.origin);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google integration not connected or token expired." },
      { status: 400 }
    );
  }

  const allContacts = await db.query.contacts.findMany();
  const birthdayRows = await db.query.importantDates.findMany({
    where: eq(importantDates.label, "birthday"),
  });

  const existingBirthdayByContact = new Map(
    birthdayRows.map((row) => [row.contactId, row] as const)
  );

  const emailToContact = new Map<string, (typeof allContacts)[number]>();
  const nameToContacts = new Map<string, Array<(typeof allContacts)[number]>>();

  for (const contact of allContacts) {
    const email = cleanLower(contact.email);
    if (email && !emailToContact.has(email)) {
      emailToContact.set(email, contact);
    }

    const fullName = cleanLower(
      contact.lastName ? `${contact.name} ${contact.lastName}` : contact.name
    );
    if (fullName) {
      const list = nameToContacts.get(fullName) || [];
      list.push(contact);
      nameToContacts.set(fullName, list);
    }
  }

  let pageToken: string | null = null;
  let scannedProfiles = 0;
  let withBirthday = 0;
  let matchedContacts = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let unmatched = 0;
  const unmatchedNames: string[] = [];

  while (scannedProfiles < maxProfiles) {
    const params = new URLSearchParams({
      personFields: "names,birthdays,emailAddresses",
      pageSize: "1000",
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(
      `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Google contacts." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as GoogleConnectionsResponse;
    const people = data.connections || [];

    if (people.length === 0) {
      break;
    }

    for (const person of people) {
      if (scannedProfiles >= maxProfiles) break;
      scannedProfiles += 1;

      const birthday = chooseBirthday(person);
      if (!birthday) continue;

      const formattedBirthday = formatBirthdayDate(birthday);
      if (!formattedBirthday) continue;
      withBirthday += 1;

      const emailCandidates =
        person.emailAddresses
          ?.map((entry) => cleanLower(entry.value))
          .filter((value): value is string => Boolean(value)) || [];

      let matchedContact: (typeof allContacts)[number] | undefined;

      for (const email of emailCandidates) {
        const found = emailToContact.get(email);
        if (found) {
          matchedContact = found;
          break;
        }
      }

      if (!matchedContact) {
        const nameKey = toNameKey(person);
        if (nameKey) {
          const list = nameToContacts.get(nameKey) || [];
          if (list.length === 1) {
            matchedContact = list[0];
          }
        }
      }

      if (!matchedContact) {
        unmatched += 1;
        if (unmatchedNames.length < 25) {
          unmatchedNames.push(toNameKey(person) || "(no name)");
        }
        continue;
      }

      matchedContacts += 1;
      const existingBirthday = existingBirthdayByContact.get(matchedContact.id);

      if (!existingBirthday) {
        if (!dryRun) {
          const [row] = await db
            .insert(importantDates)
            .values({
              contactId: matchedContact.id,
              label: "birthday",
              date: formattedBirthday.date,
              year: formattedBirthday.year,
              recurring: true,
            })
            .returning();
          existingBirthdayByContact.set(matchedContact.id, row);
        }
        created += 1;
        continue;
      }

      const isSame =
        existingBirthday.date === formattedBirthday.date &&
        (existingBirthday.year ?? null) === formattedBirthday.year;

      if (isSame) {
        unchanged += 1;
        continue;
      }

      if (!dryRun) {
        await db
          .update(importantDates)
          .set({
            date: formattedBirthday.date,
            year: formattedBirthday.year,
            recurring: true,
          })
          .where(and(eq(importantDates.id, existingBirthday.id)));
      }
      updated += 1;
    }

    if (!data.nextPageToken) {
      break;
    }
    pageToken = data.nextPageToken;
  }

  return NextResponse.json({
    dryRun,
    counts: {
      scannedProfiles,
      withBirthday,
      matchedContacts,
      created,
      updated,
      unchanged,
      unmatched,
    },
    unmatchedNames,
  });
}
