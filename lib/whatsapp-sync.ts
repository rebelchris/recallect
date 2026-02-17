import { db } from "@/db/drizzle";
import { contacts, conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Message } from "whatsapp-web.js";

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function whatsappIdToPhone(whatsappId: string): string {
  return whatsappId.replace("@c.us", "");
}

export async function matchContact(
  whatsappId: string
): Promise<{ id: string; name: string } | null> {
  // First: exact whatsappId match
  const byWhatsappId = await db.query.contacts.findFirst({
    where: eq(contacts.whatsappId, whatsappId),
  });
  if (byWhatsappId) return { id: byWhatsappId.id, name: byWhatsappId.name };

  // Second: normalized phone match
  const phone = whatsappIdToPhone(whatsappId);
  const allContacts = await db.query.contacts.findMany({
    columns: { id: true, name: true, phone: true },
  });

  for (const contact of allContacts) {
    if (contact.phone && normalizePhone(contact.phone) === phone) {
      // Cache the whatsappId for future lookups
      await db
        .update(contacts)
        .set({ whatsappId })
        .where(eq(contacts.id, contact.id));
      return { id: contact.id, name: contact.name };
    }
  }

  return null;
}

export async function matchOrCreateContact(
  whatsappId: string,
  pushName?: string
): Promise<{ id: string; name: string }> {
  const existing = await matchContact(whatsappId);
  if (existing) return existing;

  const phone = whatsappIdToPhone(whatsappId);
  const name = pushName || phone;

  const [contact] = await db
    .insert(contacts)
    .values({ name, phone, whatsappId })
    .returning();

  return { id: contact.id, name: contact.name };
}

export async function syncMessage(msg: Message): Promise<void> {
  const chat = await msg.getChat();

  // Only sync individual chats, not groups
  if (chat.isGroup) return;

  const whatsappId = msg.fromMe ? chat.id._serialized : msg.from;

  // Dedup check
  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.whatsappMessageId, msg.id._serialized),
  });
  if (existing) return;

  const body = msg.body;
  if (!body || body.trim().length === 0) return;

  // Auto-create contact if not matched
  const waContact = await msg.getContact();
  const contact = await matchOrCreateContact(
    whatsappId,
    waContact.pushname || waContact.name || chat.name
  );

  const timestamp = new Date(msg.timestamp * 1000).toISOString();

  await db.insert(conversations).values({
    content: body,
    type: "whatsapp",
    whatsappMessageId: msg.id._serialized,
    timestamp,
    contactId: contact.id,
  });

  await db
    .update(contacts)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(contacts.id, contact.id));
}

export async function importAllChats(
  limit: number = 50
): Promise<{ chatsProcessed: number; imported: number; skipped: number }> {
  const { getWhatsAppClient } = await import("./whatsapp");
  const client = getWhatsAppClient();
  if (!client) throw new Error("WhatsApp not connected");

  const chats = await client.getChats();
  let totalImported = 0;
  let totalSkipped = 0;
  let chatsProcessed = 0;

  for (const chat of chats) {
    if (chat.isGroup) continue;

    const whatsappId = chat.id._serialized;
    const contactInfo = await client.getContactById(whatsappId);
    const contact = await matchOrCreateContact(
      whatsappId,
      contactInfo.pushname || contactInfo.name || chat.name
    );

    const messages = await chat.fetchMessages({ limit });

    for (const msg of messages) {
      if (!msg.body || msg.body.trim().length === 0) {
        totalSkipped++;
        continue;
      }

      const existing = await db.query.conversations.findFirst({
        where: eq(conversations.whatsappMessageId, msg.id._serialized),
      });
      if (existing) {
        totalSkipped++;
        continue;
      }

      const timestamp = new Date(msg.timestamp * 1000).toISOString();

      await db.insert(conversations).values({
        content: msg.body,
        type: "whatsapp",
        whatsappMessageId: msg.id._serialized,
        timestamp,
        contactId: contact.id,
      });

      totalImported++;
    }

    await db
      .update(contacts)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(contacts.id, contact.id));

    chatsProcessed++;
  }

  return { chatsProcessed, imported: totalImported, skipped: totalSkipped };
}

export async function importChatHistory(
  chatId: string,
  limit: number = 50
): Promise<{ imported: number; skipped: number }> {
  const { getWhatsAppClient } = await import("./whatsapp");
  const client = getWhatsAppClient();
  if (!client) throw new Error("WhatsApp not connected");

  const chat = await client.getChatById(chatId);
  const contactInfo = await client.getContactById(chatId);
  const contact = await matchOrCreateContact(
    chatId,
    contactInfo.pushname || contactInfo.name || chat.name
  );

  const messages = await chat.fetchMessages({ limit });
  let imported = 0;
  let skipped = 0;

  for (const msg of messages) {
    if (!msg.body || msg.body.trim().length === 0) {
      skipped++;
      continue;
    }

    const existing = await db.query.conversations.findFirst({
      where: eq(conversations.whatsappMessageId, msg.id._serialized),
    });
    if (existing) {
      skipped++;
      continue;
    }

    const timestamp = new Date(msg.timestamp * 1000).toISOString();

    await db.insert(conversations).values({
      content: msg.body,
      type: "whatsapp",
      whatsappMessageId: msg.id._serialized,
      timestamp,
      contactId: contact.id,
    });

    imported++;
  }

  await db
    .update(contacts)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(contacts.id, contact.id));

  return { imported, skipped };
}
