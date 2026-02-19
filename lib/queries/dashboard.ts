import { db } from "@/db/drizzle";
import { conversations, reminders } from "@/db/schema";
import { eq, desc, lte, and, gte } from "drizzle-orm";
import { getContacts } from "@/lib/queries/contacts";
import { getGroups } from "@/lib/queries/groups";
import {
  CONTACT_FREQUENCIES,
  IMPORTANT_DATE_LABELS,
  getStaleness,
} from "@/lib/constants";

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

export type TodayFocusSource = "reminder" | "important-date" | "stale-contact";

export interface TodayFocusItem {
  contactId: string;
  contactName: string;
  contactLastName: string | null;
  source: TodayFocusSource;
  score: number;
  priority: "high" | "medium" | "low";
  primaryReason: string;
  secondaryReason?: string;
  actionLabel: string;
}

export interface DashboardTuningOptions {
  cooldownDays?: number;
  includeLowPriority?: boolean;
}

interface FocusCandidate {
  contactId: string;
  contactName: string;
  contactLastName: string | null;
  source: TodayFocusSource;
  score: number;
  reason: string;
  actionLabel: string;
}

interface FocusAccumulator extends Omit<FocusCandidate, "reason"> {
  reasons: string[];
  primaryReason: string;
}

function dayLabel(days: number): string {
  const absDays = Math.abs(days);
  const suffix = absDays === 1 ? "day" : "days";
  return `${absDays} ${suffix}`;
}

function scoreToPriority(score: number): "high" | "medium" | "low" {
  if (score >= 85) return "high";
  if (score >= 72) return "medium";
  return "low";
}

function upsertCandidate(
  map: Map<string, FocusAccumulator>,
  candidate: FocusCandidate
) {
  const existing = map.get(candidate.contactId);
  if (!existing) {
    map.set(candidate.contactId, {
      ...candidate,
      reasons: [candidate.reason],
      primaryReason: candidate.reason,
    });
    return;
  }

  if (!existing.reasons.includes(candidate.reason)) {
    existing.reasons.push(candidate.reason);
  }

  if (candidate.score > existing.score) {
    existing.score = candidate.score;
    existing.source = candidate.source;
    existing.actionLabel = candidate.actionLabel;
    existing.primaryReason = candidate.reason;
  }
}

export async function getTodayFocus(
  limit: number = 4,
  options?: DashboardTuningOptions
): Promise<TodayFocusItem[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const msPerDay = 1000 * 60 * 60 * 24;
  const candidates = new Map<string, FocusAccumulator>();
  const cooldownDays = options?.cooldownDays ?? 0;
  const includeLowPriority = options?.includeLowPriority ?? false;

  const [staleContacts, upcomingDates, pendingReminders] = await Promise.all([
    getStaleContacts(),
    getUpcomingDates(7),
    db.query.reminders.findMany({
      where: and(eq(reminders.status, "PENDING"), lte(reminders.remindAt, horizon)),
      with: {
        contact: true,
      },
      orderBy: [reminders.remindAt],
      limit: 100,
    }),
  ]);

  for (const reminder of pendingReminders) {
    if (!reminder.contact) continue;

    const daysUntil = Math.floor(
      (new Date(reminder.remindAt).getTime() - now.getTime()) / msPerDay
    );

    const reason =
      daysUntil < 0
        ? `Reminder overdue by ${dayLabel(daysUntil)}`
        : daysUntil === 0
          ? "Reminder due today"
          : daysUntil === 1
            ? "Reminder due tomorrow"
            : `Reminder due in ${dayLabel(daysUntil)}`;

    const score = daysUntil < 0 ? 100 : daysUntil === 0 ? 96 : daysUntil <= 2 ? 90 : 82;

    upsertCandidate(candidates, {
      contactId: reminder.contactId,
      contactName: reminder.contact.name,
      contactLastName: reminder.contact.lastName,
      source: "reminder",
      score,
      reason,
      actionLabel: "Follow up",
    });
  }

  for (const date of upcomingDates) {
    const label =
      IMPORTANT_DATE_LABELS[date.label as keyof typeof IMPORTANT_DATE_LABELS] ??
      date.label;

    const reason =
      date.daysUntil === 0
        ? `${label} is today`
        : date.daysUntil === 1
          ? `${label} is tomorrow`
          : `${label} is in ${dayLabel(date.daysUntil)}`;

    const score =
      date.daysUntil === 0 ? 94 : date.daysUntil === 1 ? 88 : date.daysUntil <= 3 ? 80 : 74;

    upsertCandidate(candidates, {
      contactId: date.contactId,
      contactName: date.contactName,
      contactLastName: date.contactLastName,
      source: "important-date",
      score,
      reason,
      actionLabel: date.label === "birthday" ? "Send wishes" : "Reach out",
    });
  }

  for (const contact of staleContacts) {
    if (contact.daysSince <= cooldownDays && contact.staleness === "yellow") {
      continue;
    }

    const ratio = contact.daysSince / contact.frequencyDays;
    const overdueDays = Math.max(contact.daysSince - contact.frequencyDays, 0);
    const reason =
      overdueDays > 0
        ? `Check-in overdue by ${dayLabel(overdueDays)}`
        : "Check-in due soon";

    const score = ratio >= 2 ? 84 : ratio >= 1.4 ? 76 : 70;

    upsertCandidate(candidates, {
      contactId: contact.id,
      contactName: contact.name,
      contactLastName: contact.lastName,
      source: "stale-contact",
      score,
      reason,
      actionLabel: "Check in",
    });
  }

  const ranked = Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      contactId: item.contactId,
      contactName: item.contactName,
      contactLastName: item.contactLastName,
      source: item.source,
      score: item.score,
      priority: scoreToPriority(item.score),
      primaryReason: item.primaryReason,
      secondaryReason: item.reasons.find((reason) => reason !== item.primaryReason),
      actionLabel: item.actionLabel,
    }));

  const filtered = includeLowPriority
    ? ranked
    : ranked.filter((item) => item.priority !== "low");

  return (filtered.length > 0 ? filtered : ranked).slice(0, limit);
}

type SegmentKey = "family" | "friends" | "work";

interface SegmentConfig {
  key: SegmentKey;
  label: string;
  aliases: string[];
  defaultActionLabel: string;
  fallbackReason: string;
}

const SEGMENT_CONFIGS: SegmentConfig[] = [
  {
    key: "family",
    label: "Family",
    aliases: ["family", "fam"],
    defaultActionLabel: "Call today",
    fallbackReason: "Keep family ties warm",
  },
  {
    key: "friends",
    label: "Friends",
    aliases: ["friend", "friends"],
    defaultActionLabel: "Check in",
    fallbackReason: "Keep friendships active",
  },
  {
    key: "work",
    label: "Work",
    aliases: ["work", "career", "business", "client"],
    defaultActionLabel: "Send follow-up",
    fallbackReason: "Maintain work momentum",
  },
];

export interface SegmentQueueItem {
  contactId: string;
  contactName: string;
  contactLastName: string | null;
  reason: string;
  actionLabel: string;
  priority: "high" | "medium" | "low";
  urgencyScore: number;
  healthScore: number;
}

export interface SegmentQueue {
  key: SegmentKey;
  label: string;
  groupId: string | null;
  groupName: string | null;
  items: SegmentQueueItem[];
}

function urgencyToPriority(score: number): "high" | "medium" | "low" {
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export async function getSegmentQueues(
  limitPerSegment: number = 3,
  options?: DashboardTuningOptions
): Promise<SegmentQueue[]> {
  const now = new Date();
  const allGroups = await getGroups();
  const allContacts = await getContacts();
  const cooldownDays = options?.cooldownDays ?? 0;
  const includeLowPriority = options?.includeLowPriority ?? false;

  const queues: SegmentQueue[] = [];

  for (const config of SEGMENT_CONFIGS) {
    const matchedGroup = allGroups.find((group) => {
      const groupName = normalize(group.name);
      return config.aliases.some((alias) => groupName.includes(alias));
    });

    if (!matchedGroup) continue;

    const segmentContacts = allContacts.filter((contact) =>
      contact.groups?.some((group) => group.id === matchedGroup.id)
    );

    if (segmentContacts.length === 0) continue;

    const items: SegmentQueueItem[] = segmentContacts
      .map((contact) => {
        const healthScore = contact.relationshipHealth?.score ?? 50;
        const remindersForContact =
          (
            (contact as unknown as {
              reminders?: Array<{ remindAt: string }>;
            }).reminders ?? []
          );
        const pendingCount = remindersForContact.length;
        const overdueCount = remindersForContact.filter(
          (reminder) => new Date(reminder.remindAt).getTime() < now.getTime()
        ).length;
        const daysSinceLast = contact.relationshipHealth?.daysSinceLastInteraction ?? 90;
        const noHistory = !contact.lastConversationDate;

        if (daysSinceLast <= cooldownDays && overdueCount === 0 && pendingCount === 0) {
          return null;
        }

        const urgencyScore =
          Math.round(
            (100 - healthScore) +
            overdueCount * 18 +
            pendingCount * 7 +
            (daysSinceLast >= 45 ? 8 : 0) +
            (noHistory ? 10 : 0)
          );

        let reason = config.fallbackReason;
        if (overdueCount > 0) {
          reason = `${overdueCount} overdue reminder${overdueCount === 1 ? "" : "s"}`;
        } else if (pendingCount > 0) {
          reason = `${pendingCount} open reminder${pendingCount === 1 ? "" : "s"}`;
        } else if (noHistory) {
          reason = "No interactions logged yet";
        } else {
          reason = `Last interaction ${daysSinceLast}d ago`;
        }

        let actionLabel = config.defaultActionLabel;
        if (overdueCount > 0) actionLabel = "Close loop";
        if (config.key === "work" && pendingCount > 0) actionLabel = "Send follow-up";

        return {
          contactId: contact.id,
          contactName: contact.name,
          contactLastName: contact.lastName ?? null,
          reason,
          actionLabel,
          priority: urgencyToPriority(urgencyScore),
          urgencyScore,
          healthScore,
        };
      })
      .filter((item): item is SegmentQueueItem => item !== null)
      .filter((item) => includeLowPriority || item.priority !== "low")
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, limitPerSegment);

    if (items.length === 0) continue;

    queues.push({
      key: config.key,
      label: config.label,
      groupId: matchedGroup.id,
      groupName: matchedGroup.name,
      items,
    });
  }

  return queues;
}

export interface WeeklyReviewContact {
  contactId: string;
  contactName: string;
  contactLastName: string | null;
  healthScore: number;
  priority: "high" | "medium" | "low";
  reason: string;
  daysSinceLastInteraction: number;
  interactionCount?: number;
  lastInteractionPreview?: string;
}

export interface WeeklyReviewStep {
  contactId: string;
  contactName: string;
  contactLastName: string | null;
  actionLabel: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface WeeklyReviewSummary {
  windowDays: number;
  windowStartIso: string;
  windowEndIso: string;
  interactions: number;
  uniqueContacts: number;
  atRiskContacts: number;
  openLoops: number;
  closedLoops: number;
}

export interface WeeklyReview {
  summary: WeeklyReviewSummary;
  attendedContacts: WeeklyReviewContact[];
  ignoredContacts: WeeklyReviewContact[];
  nextSteps: WeeklyReviewStep[];
}

function defaultActionForGroups(
  groups: Array<{ name?: string | null }> | undefined
): string {
  if (!groups || groups.length === 0) return "Check in";

  const groupNames = groups
    .map((group) => normalize(group.name ?? ""))
    .filter(Boolean);

  for (const config of SEGMENT_CONFIGS) {
    if (
      groupNames.some((name) =>
        config.aliases.some((alias) => name.includes(alias))
      )
    ) {
      return config.defaultActionLabel;
    }
  }

  return "Check in";
}

function resolvePriority(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export async function getWeeklyReview(windowDays: number = 7): Promise<WeeklyReview> {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - windowDays * 24 * 60 * 60 * 1000
  );
  const windowStartIso = windowStart.toISOString();

  const [contacts, weeklyConversations, allReminders] = await Promise.all([
    getContacts(),
    db.query.conversations.findMany({
      where: gte(conversations.timestamp, windowStartIso),
      with: {
        contact: true,
      },
      orderBy: [desc(conversations.timestamp)],
    }),
    db.query.reminders.findMany(),
  ]);

  const interactionCount = new Map<string, number>();
  const interactionPreview = new Map<string, string>();

  for (const conversation of weeklyConversations) {
    interactionCount.set(
      conversation.contactId,
      (interactionCount.get(conversation.contactId) ?? 0) + 1
    );

    if (!interactionPreview.has(conversation.contactId)) {
      interactionPreview.set(conversation.contactId, conversation.content);
    }
  }

  const attendedContacts: WeeklyReviewContact[] = contacts
    .filter((contact) => (interactionCount.get(contact.id) ?? 0) > 0)
    .map((contact) => ({
      contactId: contact.id,
      contactName: contact.name,
      contactLastName: contact.lastName ?? null,
      healthScore: contact.relationshipHealth?.score ?? 50,
      priority: resolvePriority(100 - (contact.relationshipHealth?.score ?? 50)),
      reason: `${interactionCount.get(contact.id)} interaction${
        interactionCount.get(contact.id) === 1 ? "" : "s"
      } this week`,
      daysSinceLastInteraction:
        contact.relationshipHealth?.daysSinceLastInteraction ?? 999,
      interactionCount: interactionCount.get(contact.id) ?? 0,
      lastInteractionPreview: interactionPreview.get(contact.id),
    }))
    .sort((a, b) => {
      const byCount = (b.interactionCount ?? 0) - (a.interactionCount ?? 0);
      if (byCount !== 0) return byCount;
      return a.daysSinceLastInteraction - b.daysSinceLastInteraction;
    });

  const ignoredContacts: WeeklyReviewContact[] = contacts
    .filter((contact) => (interactionCount.get(contact.id) ?? 0) === 0)
    .map((contact) => {
      const health = contact.relationshipHealth;
      const healthScore = health?.score ?? 50;
      const overdue = health?.overdueReminderCount ?? 0;
      const pending = health?.pendingReminderCount ?? 0;
      const daysSince = health?.daysSinceLastInteraction ?? 999;
      const noHistory = !contact.lastConversationDate;

      const urgencyScore =
        (100 - healthScore) +
        overdue * 20 +
        pending * 7 +
        (daysSince >= 45 ? 10 : 0) +
        (noHistory ? 12 : 0);

      let reason = "No activity this week";
      if (overdue > 0) {
        reason = `${overdue} overdue reminder${overdue === 1 ? "" : "s"}`;
      } else if (pending > 0) {
        reason = `${pending} open reminder${pending === 1 ? "" : "s"}`;
      } else if (noHistory) {
        reason = "No interactions logged yet";
      } else if (daysSince < 999) {
        reason = `Last interaction ${daysSince}d ago`;
      }

      return {
        contactId: contact.id,
        contactName: contact.name,
        contactLastName: contact.lastName ?? null,
        healthScore,
        priority: resolvePriority(urgencyScore),
        reason,
        daysSinceLastInteraction: daysSince,
      };
    })
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const byPriority =
        priorityWeight[b.priority] - priorityWeight[a.priority];
      if (byPriority !== 0) return byPriority;
      return a.healthScore - b.healthScore;
    });

  const nextSteps: WeeklyReviewStep[] = ignoredContacts.slice(0, 5).map((contact) => {
    const fullContact = contacts.find((item) => item.id === contact.contactId);
    const actionLabel = defaultActionForGroups(fullContact?.groups);

    return {
      contactId: contact.contactId,
      contactName: contact.contactName,
      contactLastName: contact.contactLastName,
      actionLabel,
      reason: contact.reason,
      priority: contact.priority,
    };
  });

  const openLoops = allReminders.filter(
    (reminder) =>
      reminder.status === "PENDING" &&
      new Date(reminder.remindAt).getTime() < now.getTime()
  ).length;
  const closedLoops = allReminders.filter(
    (reminder) =>
      reminder.status === "DISMISSED" &&
      new Date(reminder.remindAt).getTime() >= windowStart.getTime() &&
      new Date(reminder.remindAt).getTime() <= now.getTime()
  ).length;
  const atRiskContacts = contacts.filter(
    (contact) => (contact.relationshipHealth?.status ?? "at-risk") === "at-risk"
  ).length;
  const uniqueContacts = new Set(weeklyConversations.map((c) => c.contactId)).size;

  return {
    summary: {
      windowDays,
      windowStartIso,
      windowEndIso: now.toISOString(),
      interactions: weeklyConversations.length,
      uniqueContacts,
      atRiskContacts,
      openLoops,
      closedLoops,
    },
    attendedContacts: attendedContacts.slice(0, 8),
    ignoredContacts: ignoredContacts.slice(0, 8),
    nextSteps,
  };
}
