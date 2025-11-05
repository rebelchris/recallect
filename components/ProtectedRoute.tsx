"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isMockAuthEnabled } from "@/lib/mockFlags";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (isMockAuthEnabled()) return;
  }, [status, router]);

  if (!isMockAuthEnabled() && status === "loading") return null;
  return <>{children}</>;
}


