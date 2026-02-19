import { NextRequest, NextResponse } from "next/server";
import {
  parseDashboardPreferences,
  sanitizeDashboardPreferences,
  serializeDashboardPreferences,
} from "@/lib/preferences";

const COOKIE_NAME = "recallect_prefs";

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  const preferences = parseDashboardPreferences(cookieValue);
  return NextResponse.json(preferences);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  const current = parseDashboardPreferences(cookieValue);

  const nextPreferences = sanitizeDashboardPreferences({
    ...current,
    ...body,
  });

  const response = NextResponse.json(nextPreferences);
  response.cookies.set(COOKIE_NAME, serializeDashboardPreferences(nextPreferences), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
