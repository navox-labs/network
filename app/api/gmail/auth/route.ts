/**
 * GET /api/gmail/auth
 *
 * Initiates the Gmail OAuth 2.0 consent flow.
 * Redirects the user to Google's consent screen requesting gmail.metadata scope.
 *
 * Privacy: This endpoint only redirects — no tokens or user data are stored server-side.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/network/api/gmail/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "Gmail integration not configured" },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.metadata",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
