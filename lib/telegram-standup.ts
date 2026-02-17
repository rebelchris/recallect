import TelegramBot from "node-telegram-bot-api";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { reminders, telegramSubscribers } from "@/db/schema";
import { IMPORTANT_DATE_LABELS } from "@/lib/constants";
import { getStaleContacts } from "@/lib/queries/dashboard";

const ONE_MINUTE_MS = 60_000;
const DEFAULT_STANDUP_TIME = "08:00";

let standupInterval: NodeJS.Timeout | null = null;
let standupTickInProgress = false;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseStandupTime(value: string | undefined): { hour: number; minute: number } {
  const raw = value?.trim() || DEFAULT_STANDUP_TIME;
  const [hourRaw, minuteRaw] = raw.split(":");

  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  ) {
    return { hour, minute };
  }

  return { hour: 8, minute: 0 };
}

function hasReachedStandupTime(now: Date): boolean {
  const { hour, minute } = parseStandupTime(process.env.TELEGRAM_STANDUP_TIME);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour > hour) return true;
  if (currentHour < hour) return false;
  return currentMinute >= minute;
}

function wasSentToday(lastStandupAt: string | null, now: Date): boolean {
  if (!lastStandupAt) return false;
  const last = new Date(lastStandupAt);
  if (Number.isNaN(last.getTime())) return false;
  return toLocalDateKey(last) === toLocalDateKey(now);
}

function fullName(name: string, lastName: string | null): string {
  return lastName ? `${name} ${lastName}` : name;
}

function humanizeDays(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? "" : "s"}`;
  }

  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  if (days >= 14) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  return `${days} day${days === 1 ? "" : "s"}`;
}

function headerFor(date: Date): string {
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);

  return `Daily standup (${label})`;
}

async function getTodayImportantDates(now: Date) {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const today = toLocalDateKey(now);

  const allDates = await db.query.importantDates.findMany({
    with: {
      contact: true,
    },
  });

  return allDates.filter((entry) => {
    const parts = entry.date.split("-");
    if (parts.length !== 3) return false;

    const dateMonth = Number(parts[1]);
    const dateDay = Number(parts[2]);
    if (!Number.isInteger(dateMonth) || !Number.isInteger(dateDay)) return false;

    if (entry.recurring) {
      return dateMonth === month && dateDay === day;
    }

    return entry.date === today;
  });
}

async function getDueReminders(now: Date) {
  return db.query.reminders.findMany({
    where: and(eq(reminders.status, "PENDING"), lte(reminders.remindAt, now.toISOString())),
    with: {
      contact: true,
    },
    orderBy: [reminders.remindAt],
    limit: 5,
  });
}

export async function buildDailyStandupMessage(now: Date = new Date()): Promise<string> {
  const [todayDates, staleContacts, dueReminders] = await Promise.all([
    getTodayImportantDates(now),
    getStaleContacts(),
    getDueReminders(now),
  ]);

  const overdueContacts = staleContacts
    .filter((contact) => contact.daysSince >= contact.frequencyDays)
    .slice(0, 5);

  const lines: string[] = [headerFor(now), ""];

  if (todayDates.length > 0) {
    lines.push("Today:");
    for (const entry of todayDates.slice(0, 5)) {
      const name = fullName(entry.contact.name, entry.contact.lastName);
      if (entry.label === "birthday") {
        lines.push(`- Today is ${name}'s birthday`);
      } else {
        const label = IMPORTANT_DATE_LABELS[entry.label] || entry.label;
        lines.push(`- ${name}: ${label}`);
      }
    }
    lines.push("");
  }

  if (overdueContacts.length > 0) {
    lines.push("You should reach out to:");
    for (const contact of overdueContacts) {
      const name = fullName(contact.name, contact.lastName);
      lines.push(
        `- ${name}: it's been ${humanizeDays(contact.daysSince)} since you last chatted`
      );
    }
    lines.push("");
  }

  if (dueReminders.length > 0) {
    lines.push("Missed reminders:");
    for (const reminder of dueReminders) {
      const name = fullName(reminder.contact?.name || "Unknown", reminder.contact?.lastName || null);
      const when = new Date(reminder.remindAt).toLocaleDateString();
      lines.push(`- ${name} (${when})`);
    }
    lines.push("");
  }

  if (todayDates.length === 0 && overdueContacts.length === 0 && dueReminders.length === 0) {
    lines.push("You're all caught up. No birthdays, overdue check-ins, or missed reminders today.");
  }

  return lines.join("\n").trim();
}

export async function registerStandupSubscriber(chatId: number | string): Promise<void> {
  const now = new Date().toISOString();
  const chatIdValue = String(chatId);

  await db
    .insert(telegramSubscribers)
    .values({
      chatId: chatIdValue,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: telegramSubscribers.chatId,
      set: {
        updatedAt: now,
      },
    });
}

export async function sendStandupNow(
  bot: TelegramBot,
  chatId: number | string
): Promise<void> {
  await registerStandupSubscriber(chatId);
  const message = await buildDailyStandupMessage(new Date());
  await bot.sendMessage(String(chatId), message);
}

async function runStandupTick(bot: TelegramBot): Promise<void> {
  if (standupTickInProgress) {
    return;
  }

  standupTickInProgress = true;

  try {
    const now = new Date();
    if (!hasReachedStandupTime(now)) {
      return;
    }

    const subscribers = await db.query.telegramSubscribers.findMany();
    if (subscribers.length === 0) {
      return;
    }

    let message: string | null = null;

    for (const subscriber of subscribers) {
      if (wasSentToday(subscriber.lastStandupAt, now)) {
        continue;
      }

      if (!message) {
        message = await buildDailyStandupMessage(now);
      }

      try {
        await bot.sendMessage(subscriber.chatId, message);

        await db
          .update(telegramSubscribers)
          .set({
            lastStandupAt: now.toISOString(),
            updatedAt: now.toISOString(),
          })
          .where(eq(telegramSubscribers.chatId, subscriber.chatId));
      } catch (err) {
        console.error(`Failed to send standup to chat ${subscriber.chatId}:`, err);
      }
    }
  } finally {
    standupTickInProgress = false;
  }
}

export function startStandupScheduler(bot: TelegramBot): void {
  if (standupInterval) {
    return;
  }

  void runStandupTick(bot);

  standupInterval = setInterval(() => {
    void runStandupTick(bot);
  }, ONE_MINUTE_MS);
}

export function stopStandupScheduler(): void {
  if (!standupInterval) {
    return;
  }

  clearInterval(standupInterval);
  standupInterval = null;
}
