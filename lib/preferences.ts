export interface DashboardPreferences {
  focusLimit: number;
  segmentLimit: number;
  cooldownDays: number;
  includeLowPriority: boolean;
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  focusLimit: 4,
  segmentLimit: 2,
  cooldownDays: 2,
  includeLowPriority: false,
};

const LIMITS = {
  focusLimit: { min: 2, max: 8 },
  segmentLimit: { min: 1, max: 5 },
  cooldownDays: { min: 0, max: 14 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
}

export function sanitizeDashboardPreferences(
  raw: Partial<DashboardPreferences> | null | undefined
): DashboardPreferences {
  const source = raw ?? {};

  const focusValue =
    typeof source.focusLimit === "number"
      ? source.focusLimit
      : Number(source.focusLimit);
  const segmentValue =
    typeof source.segmentLimit === "number"
      ? source.segmentLimit
      : Number(source.segmentLimit);
  const cooldownValue =
    typeof source.cooldownDays === "number"
      ? source.cooldownDays
      : Number(source.cooldownDays);

  return {
    focusLimit: Number.isFinite(focusValue)
      ? clamp(
          Math.round(focusValue),
          LIMITS.focusLimit.min,
          LIMITS.focusLimit.max
        )
      : DEFAULT_DASHBOARD_PREFERENCES.focusLimit,
    segmentLimit: Number.isFinite(segmentValue)
      ? clamp(
          Math.round(segmentValue),
          LIMITS.segmentLimit.min,
          LIMITS.segmentLimit.max
        )
      : DEFAULT_DASHBOARD_PREFERENCES.segmentLimit,
    cooldownDays: Number.isFinite(cooldownValue)
      ? clamp(
          Math.round(cooldownValue),
          LIMITS.cooldownDays.min,
          LIMITS.cooldownDays.max
        )
      : DEFAULT_DASHBOARD_PREFERENCES.cooldownDays,
    includeLowPriority: parseBoolean(
      source.includeLowPriority,
      DEFAULT_DASHBOARD_PREFERENCES.includeLowPriority
    ),
  };
}

export function parseDashboardPreferences(
  rawCookieValue: string | undefined
): DashboardPreferences {
  if (!rawCookieValue) return DEFAULT_DASHBOARD_PREFERENCES;

  try {
    const parsed = JSON.parse(rawCookieValue) as Partial<DashboardPreferences>;
    return sanitizeDashboardPreferences(parsed);
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES;
  }
}

export function serializeDashboardPreferences(
  preferences: DashboardPreferences
): string {
  return JSON.stringify(preferences);
}
