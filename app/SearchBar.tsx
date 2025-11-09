"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function SearchBar({
  initialSearch,
  groupId,
}: {
  initialSearch?: string;
  groupId?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch || "");
  const [isPending, startTransition] = useTransition();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (groupId && groupId !== "ALL") {
        params.set("groupId", groupId);
      }
      if (value.trim()) {
        params.set("search", value);
      }
      const queryString = params.toString();
      router.push(queryString ? `/?${queryString}` : "/");
    });
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search people or conversations..."
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-[#FF6B6B] focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]"
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF6B6B] border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
