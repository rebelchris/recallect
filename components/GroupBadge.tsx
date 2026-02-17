"use client";

import type { Group } from "@/types";

interface GroupBadgeProps {
  group: Group;
  size?: "sm" | "md";
}

export default function GroupBadge({ group, size = "sm" }: GroupBadgeProps) {
  const color = group.color || "#64748b";
  
  return (
    <span
      className={`inline-flex items-center rounded-md font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      {group.name}
    </span>
  );
}
