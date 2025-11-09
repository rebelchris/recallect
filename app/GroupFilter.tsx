"use client";

import { useRouter } from "next/navigation";
import type { Group } from "@/types";

export default function GroupFilter({
  groups,
  selectedGroupId,
}: {
  groups: Group[];
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
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      <button
        onClick={() => handleGroupChange("ALL")}
        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selectedGroupId === "ALL"
            ? "bg-[#FF6B6B] text-white"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        All
      </button>
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => handleGroupChange(group.id)}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedGroupId === group.id
              ? "text-white"
              : "bg-white text-gray-700"
          }`}
          style={
            selectedGroupId === group.id
              ? { backgroundColor: group.color || "#FF6B6B" }
              : {
                  // @ts-ignore
                  "--group-color": group.color || "#FF6B6B",
                }
          }
          onMouseEnter={(e) => {
            if (selectedGroupId !== group.id) {
              e.currentTarget.style.backgroundColor = `${group.color || "#FF6B6B"}15`;
            }
          }}
          onMouseLeave={(e) => {
            if (selectedGroupId !== group.id) {
              e.currentTarget.style.backgroundColor = "white";
            }
          }}
        >
          {group.name}
        </button>
      ))}
    </div>
  );
}
