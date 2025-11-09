"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import QuickAddModal from "./QuickAddModal";

interface FloatingAddButtonProps {
  personId?: string;
}

export default function FloatingAddButton({ personId }: FloatingAddButtonProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();
  const [detectedPersonId, setDetectedPersonId] = useState<string | undefined>(personId);

  // Detect if we're on a person page and extract the person ID
  useEffect(() => {
    if (personId) {
      setDetectedPersonId(personId);
      return;
    }

    // Match pattern: /person/[id] or /person/[id]/...
    const personPageMatch = pathname.match(/^\/person\/([^\/]+)/);
    if (personPageMatch) {
      setDetectedPersonId(personPageMatch[1]);
    } else {
      setDetectedPersonId(undefined);
    }
  }, [pathname, personId]);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF5555] text-white shadow-xl transition-all hover:scale-110 hover:shadow-2xl active:scale-95"
        aria-label="Quick add conversation"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      <QuickAddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedPersonId={detectedPersonId}
      />
    </>
  );
}
