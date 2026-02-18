import { NextResponse } from "next/server";
import { revokeGoogleIntegration } from "@/lib/google-integration";

export async function POST() {
  try {
    await revokeGoogleIntegration();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect Google integration" },
      { status: 500 }
    );
  }
}
