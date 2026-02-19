import { CONTACT_FREQUENCIES, type ContactFrequency } from "@/lib/constants";

export interface RelationshipHealth {
  score: number;
  status: "strong" | "steady" | "at-risk";
  freshness: number;
  consistency: number;
  followThrough: number;
  pendingReminderCount: number;
  overdueReminderCount: number;
  daysSinceLastInteraction: number;
}

interface ReminderLike {
  remindAt: string;
}

interface RelationshipHealthInput {
  contactFrequency?: ContactFrequency | null;
  lastConversationAt?: string | null;
  pendingReminders?: ReminderLike[];
  now?: Date;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysSince(timestamp: string | null | undefined, now: Date): number {
  if (!timestamp) return -1;

  const diff = startOfDay(now) - startOfDay(new Date(timestamp));
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

function freshnessScore(days: number, frequencyDays: number): number {
  const ratio = days / frequencyDays;

  if (ratio <= 0.8) return 100;
  if (ratio <= 1) return 90;
  if (ratio <= 1.5) return 70;
  if (ratio <= 2) return 50;
  if (ratio <= 3) return 30;
  return 15;
}

function consistencyScore(
  days: number,
  contactFrequency?: ContactFrequency | null
): number {
  if (!contactFrequency) {
    if (days <= 14) return 85;
    if (days <= 30) return 70;
    if (days <= 60) return 50;
    return 30;
  }

  const frequencyDays = CONTACT_FREQUENCIES[contactFrequency].days;
  const ratio = days / frequencyDays;

  if (ratio <= 1) return 95;
  if (ratio <= 1.5) return 75;
  if (ratio <= 2) return 55;
  if (ratio <= 3) return 35;
  return 20;
}

function followThroughScore(
  pendingCount: number,
  overdueCount: number
): number {
  if (pendingCount === 0 && overdueCount === 0) return 100;

  const score = 100 - pendingCount * 8 - overdueCount * 18;
  return clamp(score, 10, 100);
}

function statusFromScore(score: number): RelationshipHealth["status"] {
  if (score >= 80) return "strong";
  if (score >= 60) return "steady";
  return "at-risk";
}

export function calculateRelationshipHealth(
  input: RelationshipHealthInput
): RelationshipHealth {
  const now = input.now ?? new Date();
  const frequencyDays = input.contactFrequency
    ? CONTACT_FREQUENCIES[input.contactFrequency].days
    : 30;
  const rawDays = daysSince(input.lastConversationAt, now);
  const days = rawDays >= 0 ? rawDays : frequencyDays * 2;
  const reminders = input.pendingReminders ?? [];
  const pendingCount = reminders.length;
  const overdueCount = reminders.filter(
    (reminder) => new Date(reminder.remindAt).getTime() < now.getTime()
  ).length;

  const freshness = freshnessScore(days, frequencyDays);
  const consistency = consistencyScore(days, input.contactFrequency);
  const followThrough = followThroughScore(pendingCount, overdueCount);

  const score = Math.round(
    freshness * 0.45 + consistency * 0.3 + followThrough * 0.25
  );

  return {
    score,
    status: statusFromScore(score),
    freshness,
    consistency,
    followThrough,
    pendingReminderCount: pendingCount,
    overdueReminderCount: overdueCount,
    daysSinceLastInteraction: days,
  };
}
