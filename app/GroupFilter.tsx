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
    <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 py-1">
      <button
        onClick={() => handleGroupChange("ALL")}
        className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-all ${
          selectedGroupId === "ALL"
            ? "bg-[#FF6B6B] text-white shadow-md"
            : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow"
        }`}
      >
        All
      </button>
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => handleGroupChange(group.id)}
          className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-all ${
            selectedGroupId === group.id
              ? "text-white shadow-md"
              : "bg-white text-gray-700 hover:shadow"
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
