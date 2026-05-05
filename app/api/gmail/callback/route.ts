/**
 * GET /api/gmail/callback
 *
 * Handles the OAuth 2.0 callback from Google.
 * Exchanges the authorization code for tokens, then redirects the user
 * back to the app with tokens in a query parameter.
 *
 * Privacy:
 * - Tokens are NEVER stored server-side
 * - Tokens are passed to the client via query parameter for IndexedDB storage
 * - The client-side code reads and stores them locally, then clears the URL
 */

import { NextRequest, NextResponse } from "next/server";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope: string;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/network?gmail_error=auth_denied", req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/network/api/gmail/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/network?gmail_error=not_configured", req.url)
    );
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/network?gmail_error=token_exchange_failed", req.url)
    );
  }

  const tokens: GoogleTokenResponse = await tokenRes.json();

  // Pass tokens to client via query parameter
  // Client will store in IndexedDB and clear the URL immediately
  const tokenPayload = new URLSearchParams({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || "",
    expires_in: String(tokens.expires_in || 3600),
  });

  return NextResponse.redirect(
    new URL(
      `/network?gmail_tokens=${encodeURIComponent(tokenPayload.toString())}`,
      req.url
    )
  );
}
