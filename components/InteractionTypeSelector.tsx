"use client";

import { INTERACTION_TYPES, type InteractionType } from "@/lib/constants";
import InteractionTypeIcon from "./InteractionTypeIcon";

interface InteractionTypeSelectorProps {
  value: InteractionType;
  onChange: (type: InteractionType) => void;
}

export default function InteractionTypeSelector({
  value,
  onChange,
}: InteractionTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(INTERACTION_TYPES) as InteractionType[]).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            value === type
              ? "border-2 border-primary bg-accent text-primary"
              : "border border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <InteractionTypeIcon type={type} size={14} />
          {INTERACTION_TYPES[type].label}
        </button>
      ))}
    </div>
  );
}
