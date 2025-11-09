"use client";

import FloatingAddButton from "./FloatingAddButton";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingAddButton />
    </>
  );
}


