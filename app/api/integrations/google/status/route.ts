import { NextResponse } from "next/server";
import { getGoogleIntegration, hasGoogleOauthConfig } from "@/lib/google-integration";

export async function GET() {
  const integration = await getGoogleIntegration();

  return NextResponse.json({
    configured: hasGoogleOauthConfig(),
    connected: Boolean(integration),
    accountEmail: integration?.accountEmail || null,
    expiresAt: integration?.expiresAt || null,
    updatedAt: integration?.updatedAt || null,
  });
}
