"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import QuickAddModal from "./QuickAddModal";

export default function FloatingAddButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF5555] text-white shadow-xl transition-all hover:scale-110 hover:shadow-2xl active:scale-95"
        aria-label="Quick add conversation"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      <QuickAddModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
