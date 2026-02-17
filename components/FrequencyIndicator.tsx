"use client";

import { CONTACT_FREQUENCIES, getStaleness } from "@/lib/constants";
import type { ContactFrequency } from "@/lib/constants";

interface FrequencyIndicatorProps {
  frequency: ContactFrequency;
  lastConversationDate: string | null;
  showLabel?: boolean;
}

export default function FrequencyIndicator({
  frequency,
  lastConversationDate,
  showLabel = false,
}: FrequencyIndicatorProps) {
  const frequencyInfo = CONTACT_FREQUENCIES[frequency];
  if (!frequencyInfo) return null;

  const now = new Date();
  const lastDate = lastConversationDate ? new Date(lastConversationDate) : null;
  const daysSince = lastDate
    ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  const staleness = daysSince === Infinity 
    ? "red" 
    : getStaleness(daysSince, frequencyInfo.days);

  const colors = {
    green: { dot: "bg-success", text: "text-success" },
    yellow: { dot: "bg-warning", text: "text-warning" },
    red: { dot: "bg-danger", text: "text-danger" },
  };

  const { dot, text } = colors[staleness];

  return (
    <div 
      className="flex items-center gap-1.5"
      title={`${frequencyInfo.label} — ${
        daysSince === Infinity ? "Never contacted" : `${daysSince}d since last contact`
      }`}
    >
      <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {showLabel && (
        <span className={`text-xs font-medium ${text}`}>
          {daysSince === Infinity
            ? "Never"
            : daysSince === 0
              ? "Today"
              : `${daysSince}d`}
        </span>
      )}
    </div>
  );
}
