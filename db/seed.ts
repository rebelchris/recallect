import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "recallect.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

function seed() {
  console.log("Seeding database...");

  // Create groups
  const familyArr = db
    .insert(schema.groups)
    .values({ name: "Family", color: "#FF6B6B" })
    .returning()
    .all();
  const family = familyArr[0];

  const friendsArr = db
    .insert(schema.groups)
    .values({ name: "Friends", color: "#4ECDC4" })
    .returning()
    .all();
  const friends = friendsArr[0];

  const workArr = db
    .insert(schema.groups)
    .values({ name: "Work", color: "#45B7D1" })
    .returning()
    .all();
  const work = workArr[0];

  db
    .insert(schema.groups)
    .values({ name: "Community", color: "#96CEB4" })
    .run();

  console.log("Groups created");

  // Create contacts
  const aliceArr = db
    .insert(schema.contacts)
    .values({
      name: "Alice",
      lastName: "Johnson",
      email: "alice@example.com",
      phone: "+1 (555) 123-4567",
      company: "TechCorp",
      jobTitle: "Software Engineer",
      contactFrequency: "monthly",
      notes: "Met at React conf. Loves hiking and board games.",
      socialLinks: {
        twitter: "alice_dev",
        linkedin: "https://linkedin.com/in/alicejohnson",
      },
    })
    .returning()
    .all();
  const alice = aliceArr[0];

  const bobArr = db
    .insert(schema.contacts)
    .values({
      name: "Bob",
      lastName: "Smith",
      email: "bob.smith@example.com",
      phone: "+1 (555) 987-6543",
      company: "DesignStudio",
      jobTitle: "Product Designer",
      contactFrequency: "biweekly",
      socialLinks: { instagram: "bobdesigns" },
    })
    .returning()
    .all();
  const bob = bobArr[0];

  const carolArr = db
    .insert(schema.contacts)
    .values({
      name: "Carol",
      lastName: "Williams",
      nickname: "CW",
      email: "carol@example.com",
      contactFrequency: "weekly",
      notes: "College roommate. Always up for spontaneous adventures.",
    })
    .returning()
    .all();
  const carol = carolArr[0];

  const davidArr = db
    .insert(schema.contacts)
    .values({
      name: "David",
      lastName: "Brown",
      company: "StartupXYZ",
      jobTitle: "CTO",
      contactFrequency: "quarterly",
    })
    .returning()
    .all();
  const david = davidArr[0];

  const emmaArr = db
    .insert(schema.contacts)
    .values({
      name: "Emma",
      lastName: "Davis",
      email: "emma.d@example.com",
      phone: "+1 (555) 555-0100",
      contactFrequency: "monthly",
    })
    .returning()
    .all();
  const emma = emmaArr[0];

  console.log("Contacts created");

  // Assign contacts to groups
  db.insert(schema.contactsToGroups)
    .values([
      { contactId: alice.id, groupId: work.id },
      { contactId: alice.id, groupId: friends.id },
      { contactId: bob.id, groupId: friends.id },
      { contactId: carol.id, groupId: friends.id },
      { contactId: david.id, groupId: work.id },
      { contactId: emma.id, groupId: family.id },
    ])
    .run();

  console.log("Group assignments created");

  // Create important dates
  db.insert(schema.importantDates)
    .values([
      {
        contactId: alice.id,
        label: "birthday",
        date: "1992-03-15",
        year: 1992,
        recurring: true,
      },
      {
        contactId: bob.id,
        label: "birthday",
        date: "1990-07-22",
        year: 1990,
        recurring: true,
      },
      {
        contactId: emma.id,
        label: "birthday",
        date: "1988-12-01",
        year: 1988,
        recurring: true,
      },
      {
        contactId: carol.id,
        label: "anniversary",
        date: "2020-06-10",
        year: 2020,
        recurring: true,
      },
    ])
    .run();

  console.log("Important dates created");

  // Create conversations
  const now = new Date();

  const convo1Arr = db
    .insert(schema.conversations)
    .values({
      contactId: alice.id,
      content:
        "Caught up over coffee about her new project at TechCorp. She's excited about the AI features they're building.",
      type: "coffee",
      timestamp: new Date(
        now.getTime() - 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .returning()
    .all();
  const convo1 = convo1Arr[0];

  db.insert(schema.conversations)
    .values({
      contactId: alice.id,
      content:
        "Quick text to say happy birthday. She appreciated it and said we should grab dinner soon.",
      type: "text",
      timestamp: new Date(
        now.getTime() - 15 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .run();

  db.insert(schema.conversations)
    .values({
      contactId: bob.id,
      content:
        "Had a long call about his design portfolio. Gave him feedback on a few case studies.",
      type: "call",
      timestamp: new Date(
        now.getTime() - 20 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .run();

  db.insert(schema.conversations)
    .values({
      contactId: carol.id,
      content:
        "Dinner at the new Italian place downtown. She told me about her trip to Japan.",
      type: "dinner",
      timestamp: new Date(
        now.getTime() - 10 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .run();

  db.insert(schema.conversations)
    .values({
      contactId: david.id,
      content:
        "Met at a networking event. Discussed potential partnership opportunities.",
      type: "meeting",
      timestamp: new Date(
        now.getTime() - 45 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .run();

  db.insert(schema.conversations)
    .values({
      contactId: emma.id,
      content: "Family video call for mom's birthday planning.",
      type: "call",
      timestamp: new Date(
        now.getTime() - 5 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .run();

  console.log("Conversations created");

  // Create a reminder
  db.insert(schema.reminders)
    .values({
      contactId: alice.id,
      conversationId: convo1.id,
      remindAt: new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      status: "PENDING",
    })
    .run();

  console.log("Reminders created");
  console.log("Seed completed successfully!");

  sqlite.close();
}

seed();
