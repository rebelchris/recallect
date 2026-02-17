"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import QuickAddModal from "./QuickAddModal";

interface FloatingAddButtonProps {
  personId?: string;
}

export default function FloatingAddButton({ personId }: FloatingAddButtonProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();

  const detectedPersonId = useMemo(() => {
    if (personId) return personId;
    const personPageMatch = pathname.match(/^\/person\/([^\/]+)/);
    return personPageMatch ? personPageMatch[1] : undefined;
  }, [pathname, personId]);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:scale-105 active:scale-95"
        aria-label="Add conversation"
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      <QuickAddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedPersonId={detectedPersonId}
      />
    </>
  );
}
