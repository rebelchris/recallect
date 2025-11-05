"use client";

import {createAuthClient} from "better-auth/react";

export const { signIn, useSession } = createAuthClient()

export default function LoginPage() {
  const { data: session } = useSession()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#FAFAFA] p-6 text-[#2D3748]">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
        {session ? <div>Signed in as {session.user?.email}</div> : <button onClick={() => signIn.social({
            provider: "google",
        })}>
          Sign in with Google
        </button>}
      </div>
    </main>
  );
}


