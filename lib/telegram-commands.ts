import TelegramBot from "node-telegram-bot-api";
import { db } from "@/db/drizzle";
import { contacts, conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  registerStandupSubscriber,
  sendStandupNow,
} from "./telegram-standup";

type ConversationType = typeof conversations.type.enumValues[number];

const COMMANDS: Record<string, ConversationType> = {
  talked: "other",
  called: "call",
  texted: "text",
  emailed: "email",
  coffee: "coffee",
  met: "hangout",
};

interface MatchedContact {
  id: string;
  name: string;
  lastName: string | null;
  nickname: string | null;
}

/**
 * Try progressively shorter prefixes of the words against contacts.
 * Returns the matched contact and the remaining text as content.
 */
async function findContactByPrefix(words: string[]): Promise<{
  contact: MatchedContact | null;
  content: string;
  ambiguous?: MatchedContact[];
}> {
  const allContacts = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      lastName: contacts.lastName,
      nickname: contacts.nickname,
    })
    .from(contacts);

  // Try progressively shorter prefixes (most words first)
  for (let len = Math.min(words.length, 4); len >= 1; len--) {
    const nameQuery = words.slice(0, len).join(" ").toLowerCase();
    const matches = allContacts.filter((c) => {
      const fullName = `${c.name}${c.lastName ? ` ${c.lastName}` : ""}`.toLowerCase();
      const firstName = c.name.toLowerCase();
      const nick = c.nickname?.toLowerCase();

      return (
        fullName === nameQuery ||
        firstName === nameQuery ||
        nick === nameQuery
      );
    });

    if (matches.length === 1) {
      return {
        contact: matches[0],
        content: words.slice(len).join(" "),
      };
    }

    if (matches.length > 1) {
      return {
        contact: null,
        content: words.slice(len).join(" "),
        ambiguous: matches,
      };
    }
  }

  return { contact: null, content: words.join(" ") };
}

function formatContactName(c: MatchedContact): string {
  return c.lastName ? `${c.name} ${c.lastName}` : c.name;
}

// Store pending disambiguations per chat
const pendingSelections = new Map<
  number,
  { contacts: MatchedContact[]; content: string; type: ConversationType }
>();

function trackSubscriber(msg: TelegramBot.Message): void {
  if (msg.chat.type !== "private") return;

  void registerStandupSubscriber(msg.chat.id).catch((err) => {
    console.error("Telegram subscriber registration error:", err);
  });
}

export function registerCommands(bot: TelegramBot) {
  // Register each command
  for (const [command, type] of Object.entries(COMMANDS)) {
    bot.onText(new RegExp(`^\\/${command}(?:@\\w+)?\\s+(.+)`, "s"), async (msg, match) => {
      if (!match?.[1]) {
        bot.sendMessage(msg.chat.id, `Usage: /${command} [name] [what happened]`);
        return;
      }
      await handleLogCommand(bot, msg.chat.id, match[1].trim(), type);
    });

    // Handle command with no arguments
    bot.onText(new RegExp(`^\\/${command}(?:@\\w+)?$`), (msg) => {
      bot.sendMessage(msg.chat.id, `Usage: /${command} [name] [what happened]`);
    });
  }

  // Handle numbered selection for disambiguation
  bot.on("message", async (msg) => {
    trackSubscriber(msg);

    if (!msg.text || msg.text.startsWith("/")) return;

    const pending = pendingSelections.get(msg.chat.id);
    if (!pending) return;

    const num = parseInt(msg.text.trim(), 10);
    if (isNaN(num) || num < 1 || num > pending.contacts.length) {
      bot.sendMessage(msg.chat.id, `Please pick a number between 1 and ${pending.contacts.length}, or send a new command.`);
      return;
    }

    const selected = pending.contacts[num - 1];
    pendingSelections.delete(msg.chat.id);

    await logConversation(bot, msg.chat.id, selected, pending.content, pending.type);
  });

  // /help command
  bot.onText(/^\/help(?:@\w+)?$/, (msg) => {
    trackSubscriber(msg);

    const lines = [
      "Available commands:",
      "",
      ...Object.keys(COMMANDS).map((cmd) => `/${cmd} [name] [content]`),
      "/standup",
      "",
      "Example: /talked Bob Smith had a rough day",
    ];
    bot.sendMessage(msg.chat.id, lines.join("\n"));
  });

  // /start command
  bot.onText(/^\/start(?:@\w+)?$/, (msg) => {
    trackSubscriber(msg);

    bot.sendMessage(
      msg.chat.id,
      "Recallect Bot ready! Use /help to see available commands. Daily standups are enabled after your first message."
    );
  });

  // /standup command
  bot.onText(/^\/standup(?:@\w+)?$/, async (msg) => {
    try {
      trackSubscriber(msg);
      await sendStandupNow(bot, msg.chat.id);
    } catch (err) {
      console.error("Telegram standup error:", err);
      bot.sendMessage(msg.chat.id, "Failed to generate standup. Please try again.");
    }
  });
}

async function handleLogCommand(
  bot: TelegramBot,
  chatId: number,
  text: string,
  type: ConversationType
) {
  const words = text.split(/\s+/);

  if (words.length === 0) {
    bot.sendMessage(chatId, "Please provide a contact name and what happened.");
    return;
  }

  const result = await findContactByPrefix(words);

  if (result.ambiguous) {
    const list = result.ambiguous
      .map((c, i) => `${i + 1}. ${formatContactName(c)}`)
      .join("\n");

    pendingSelections.set(chatId, {
      contacts: result.ambiguous,
      content: result.content,
      type,
    });

    bot.sendMessage(chatId, `Multiple contacts found:\n${list}\n\nReply with a number to select.`);
    return;
  }

  if (!result.contact) {
    bot.sendMessage(chatId, "Contact not found. Check the name and try again.");
    return;
  }

  const content = result.content || "(no details)";
  await logConversation(bot, chatId, result.contact, content, type);
}

async function logConversation(
  bot: TelegramBot,
  chatId: number,
  contact: MatchedContact,
  content: string,
  type: ConversationType
) {
  try {
    await db.insert(conversations).values({
      contactId: contact.id,
      content,
      type,
      timestamp: new Date().toISOString(),
    });

    await db
      .update(contacts)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(contacts.id, contact.id));

    const typeLabel = Object.entries(COMMANDS).find(([, v]) => v === type)?.[0] || type;
    bot.sendMessage(
      chatId,
      `Logged ${typeLabel} with ${formatContactName(contact)}: ${content}`
    );
  } catch (err) {
    console.error("Telegram log error:", err);
    bot.sendMessage(chatId, "Failed to log conversation. Please try again.");
  }
}
