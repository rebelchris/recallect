"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";

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
      <Search 
        size={16} 
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" 
      />
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search..."
        className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground/60 transition-colors focus:border-foreground/20 focus:outline-none"
      />
      {isPending && (
        <Loader2 
          size={14} 
          className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" 
        />
      )}
    </div>
  );
}
