import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl, hasGoogleOauthConfig } from "@/lib/google-integration";

const GOOGLE_STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  if (!hasGoogleOauthConfig()) {
    return NextResponse.redirect(new URL("/reminders?google=config-missing", request.url));
  }

  const state = crypto.randomUUID();
  const origin = request.nextUrl.origin;
  const authUrl = buildGoogleAuthUrl(origin, state);
  const response = NextResponse.redirect(authUrl);

  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return response;
}
