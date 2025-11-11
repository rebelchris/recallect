"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

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
      <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
        <Search size={18} className="text-muted-foreground" />
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search people or conversations..."
        className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm shadow-sm placeholder-muted-foreground transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:shadow"
      />
      {isPending && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
