import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const contacts = sqliteTable("contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  lastName: text("last_name"),
  nickname: text("nickname"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  contactFrequency: text("contact_frequency", {
    enum: ["weekly", "biweekly", "monthly", "quarterly", "yearly"],
  }),
  socialLinks: text("social_links", { mode: "json" }).$type<{
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    github?: string;
    website?: string;
  }>(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  whatsappId: text("whatsapp_id"),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const contactsRelations = relations(contacts, ({ many }) => ({
  conversations: many(conversations),
  reminders: many(reminders),
  importantDates: many(importantDates),
  contactsToGroups: many(contactsToGroups),
}));

export const groups = sqliteTable("groups", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  color: text("color"),
  icon: text("icon"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const groupsRelations = relations(groups, ({ many }) => ({
  contactsToGroups: many(contactsToGroups),
}));

export const contactsToGroups = sqliteTable("contacts_to_groups", {
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
});

export const contactsToGroupsRelations = relations(
  contactsToGroups,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [contactsToGroups.contactId],
      references: [contacts.id],
    }),
    group: one(groups, {
      fields: [contactsToGroups.groupId],
      references: [groups.id],
    }),
  })
);

export const conversations = sqliteTable("conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  content: text("content").notNull(),
  type: text("type", {
    enum: [
      "call",
      "text",
      "email",
      "coffee",
      "dinner",
      "hangout",
      "meeting",
      "whatsapp",
      "other",
    ],
  })
    .notNull()
    .default("other"),
  whatsappMessageId: text("whatsapp_message_id"),
  timestamp: text("timestamp")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    contact: one(contacts, {
      fields: [conversations.contactId],
      references: [contacts.id],
    }),
    reminders: many(reminders),
  })
);

export const reminders = sqliteTable("reminders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  remindAt: text("remind_at").notNull(),
  status: text("status", {
    enum: ["PENDING", "SENT", "DISMISSED"],
  })
    .notNull()
    .default("PENDING"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const remindersRelations = relations(reminders, ({ one }) => ({
  contact: one(contacts, {
    fields: [reminders.contactId],
    references: [contacts.id],
  }),
  conversation: one(conversations, {
    fields: [reminders.conversationId],
    references: [conversations.id],
  }),
}));

export const importantDates = sqliteTable("important_dates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  label: text("label", {
    enum: ["birthday", "anniversary", "custom"],
  }).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  year: integer("year"),
  recurring: integer("recurring", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const importantDatesRelations = relations(importantDates, ({ one }) => ({
  contact: one(contacts, {
    fields: [importantDates.contactId],
    references: [contacts.id],
  }),
}));
