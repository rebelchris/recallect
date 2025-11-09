"server-only";

import {auth} from "@/lib/auth";
import { headers } from "next/headers";
import { isMockAuthEnabled } from "@/lib/mockFlags";


export async function getServerSessionOrMock() {
  if (isMockAuthEnabled()) {
    const email = process.env.MOCK_EMAIL || "mock@example.com";
    const name = process.env.MOCK_NAME || "Mock User";
    return { user: { email, name, image: null } };
  }

    const session = await auth.api.getSession({
        headers: await headers() // you need to pass the headers object.
    });
  return session;
}


