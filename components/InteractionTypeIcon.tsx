"use client";

import {
  Phone,
  MessageSquare,
  Mail,
  Coffee,
  UtensilsCrossed,
  Users,
  Briefcase,
  MessageCircle,
} from "lucide-react";
import type { InteractionType } from "@/lib/constants";
import { INTERACTION_TYPES } from "@/lib/constants";

const ICON_MAP = {
  Phone,
  MessageSquare,
  Mail,
  Coffee,
  UtensilsCrossed,
  Users,
  Briefcase,
  MessageCircle,
} as const;

interface InteractionTypeIconProps {
  type: InteractionType;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export default function InteractionTypeIcon({
  type,
  size = 14,
  className = "",
  showLabel = false,
}: InteractionTypeIconProps) {
  const info = INTERACTION_TYPES[type] || INTERACTION_TYPES.other;
  const IconComponent = ICON_MAP[info.icon as keyof typeof ICON_MAP];

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <IconComponent size={size} />
      {showLabel && (
        <span className="text-xs font-medium">{info.label}</span>
      )}
    </span>
  );
}
