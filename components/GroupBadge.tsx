"use client";

import type { Group } from "@/types";

interface GroupBadgeProps {
  group: Group;
  size?: "sm" | "md";
}

export default function GroupBadge({ group, size = "sm" }: GroupBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      style={{
        backgroundColor: group.color ? `${group.color}20` : "#FF6B6B20",
        color: group.color || "#FF6B6B",
      }}
    >
      {group.name}
    </span>
  );
}
