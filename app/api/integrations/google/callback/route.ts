import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleCodeForTokens,
  fetchGoogleUserInfo,
  saveGoogleIntegration,
} from "@/lib/google-integration";

const GOOGLE_STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;

  const redirectUrl = new URL("/reminders", request.url);

  if (oauthError) {
    redirectUrl.searchParams.set("google", "denied");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    redirectUrl.searchParams.set("google", "invalid-state");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const origin = request.nextUrl.origin;
    const token = await exchangeGoogleCodeForTokens(code, origin);

    if (!token.access_token) {
      throw new Error("Google token missing access token");
    }

    const profile = await fetchGoogleUserInfo(token.access_token);

    await saveGoogleIntegration({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      scope: token.scope,
      tokenType: token.token_type,
      accountEmail: profile.email,
    });

    redirectUrl.searchParams.set("google", "connected");
  } catch {
    redirectUrl.searchParams.set("google", "connect-failed");
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
