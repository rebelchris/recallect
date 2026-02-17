"use client";

import { CONTACT_FREQUENCIES, getStaleness } from "@/lib/constants";
import type { ContactFrequency } from "@/lib/constants";

interface FrequencyIndicatorProps {
  frequency: ContactFrequency;
  lastConversationDate: string | null;
  showLabel?: boolean;
}

const STALENESS_COLORS = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
} as const;

const STALENESS_TEXT_COLORS = {
  green: "text-green-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
} as const;

export default function FrequencyIndicator({
  frequency,
  lastConversationDate,
  showLabel = false,
}: FrequencyIndicatorProps) {
  const frequencyInfo = CONTACT_FREQUENCIES[frequency];
  if (!frequencyInfo) return null;

  const now = new Date();
  const lastDate = lastConversationDate
    ? new Date(lastConversationDate)
    : null;

  const daysSince = lastDate
    ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  const staleness =
    daysSince === Infinity ? "red" : getStaleness(daysSince, frequencyInfo.days);

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-2.5 w-2.5 rounded-full ${STALENESS_COLORS[staleness]}`}
        title={`${frequencyInfo.label} — ${daysSince === Infinity ? "Never contacted" : `${daysSince}d since last contact`}`}
      />
      {showLabel && (
        <span
          className={`text-xs font-medium ${STALENESS_TEXT_COLORS[staleness]}`}
        >
          {daysSince === Infinity
            ? "Never"
            : daysSince === 0
              ? "Today"
              : `${daysSince}d ago`}
        </span>
      )}
    </div>
  );
}
