"use client";

import { useRouter } from "next/navigation";
import type { Group } from "@/types";

interface GroupWithCount extends Group {
  contactCount?: number;
}

export default function GroupFilter({
  groups,
  selectedGroupId,
}: {
  groups: GroupWithCount[];
  selectedGroupId: string;
}) {
  const router = useRouter();

  const handleGroupChange = (groupId: string) => {
    if (groupId === "ALL") {
      router.push("/");
    } else {
      router.push(`/?groupId=${groupId}`);
    }
  };

  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
      <button
        onClick={() => handleGroupChange("ALL")}
        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selectedGroupId === "ALL"
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        All
      </button>
      {groups.map((group) => {
        const isSelected = selectedGroupId === group.id;
        return (
          <button
            key={group.id}
            onClick={() => handleGroupChange(group.id)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={{
              backgroundColor: isSelected 
                ? (group.color || "#64748b")
                : "var(--muted)",
            }}
          >
            {group.name}
            {group.contactCount !== undefined && group.contactCount > 0 && (
              <span className={`ml-1.5 ${isSelected ? "opacity-80" : "opacity-50"}`}>
                {group.contactCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
