import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { integrations } from "@/db/schema";

const GOOGLE_PROVIDER = "google";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/contacts.readonly",
].join(" ");

interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

interface GoogleUserInfoResponse {
  email?: string;
}

function mustEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function getGoogleRedirectUri(origin: string): string {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
    `${origin}/api/integrations/google/callback`
  );
}

function getGoogleOauthConfig(origin: string) {
  return {
    clientId: mustEnv("GOOGLE_CLIENT_ID"),
    clientSecret: mustEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: getGoogleRedirectUri(origin),
  };
}

export function hasGoogleOauthConfig(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildGoogleAuthUrl(origin: string, state: string): string {
  const { clientId, redirectUri } = getGoogleOauthConfig(origin);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForTokens(
  code: string,
  origin: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleOauthConfig(origin);
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Google auth code");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  origin: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOauthConfig(origin);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google access token");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfoResponse> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return {};
  }

  return (await response.json()) as GoogleUserInfoResponse;
}

export async function getGoogleIntegration() {
  return db.query.integrations.findFirst({
    where: eq(integrations.provider, GOOGLE_PROVIDER),
  });
}

function expiresAtFromNow(seconds: number | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function saveGoogleIntegration(input: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
  accountEmail?: string;
}) {
  const existing = await getGoogleIntegration();
  const now = new Date().toISOString();
  const refreshToken = input.refreshToken || existing?.refreshToken || null;
  const scope = input.scope || existing?.scope || null;
  const tokenType = input.tokenType || existing?.tokenType || null;
  const expiresAt = expiresAtFromNow(input.expiresIn);

  if (existing) {
    await db
      .update(integrations)
      .set({
        accessToken: input.accessToken,
        refreshToken,
        expiresAt,
        scope,
        tokenType,
        accountEmail: input.accountEmail || existing.accountEmail || null,
        updatedAt: now,
      })
      .where(eq(integrations.provider, GOOGLE_PROVIDER));
  } else {
    await db.insert(integrations).values({
      provider: GOOGLE_PROVIDER,
      accountEmail: input.accountEmail || null,
      accessToken: input.accessToken,
      refreshToken,
      expiresAt,
      scope,
      tokenType,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function getValidGoogleAccessToken(origin: string): Promise<string | null> {
  const integration = await getGoogleIntegration();
  if (!integration) return null;

  const expiresAt = integration.expiresAt ? new Date(integration.expiresAt) : null;
  const stillValid =
    expiresAt && !Number.isNaN(expiresAt.getTime())
      ? expiresAt.getTime() > Date.now() + 60_000
      : true;

  if (stillValid) {
    return integration.accessToken;
  }

  if (!integration.refreshToken) {
    return null;
  }

  const refreshed = await refreshGoogleAccessToken(integration.refreshToken, origin);
  await saveGoogleIntegration({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresIn: refreshed.expires_in,
    scope: refreshed.scope,
    tokenType: refreshed.token_type,
    accountEmail: integration.accountEmail || undefined,
  });

  return refreshed.access_token;
}

export async function revokeGoogleIntegration(): Promise<void> {
  const integration = await getGoogleIntegration();
  if (!integration) return;

  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: integration.refreshToken || integration.accessToken,
      client_id: mustEnv("GOOGLE_CLIENT_ID"),
      client_secret: mustEnv("GOOGLE_CLIENT_SECRET"),
    }).toString(),
  }).catch(() => undefined);

  await db
    .delete(integrations)
    .where(and(eq(integrations.provider, GOOGLE_PROVIDER)));
}
