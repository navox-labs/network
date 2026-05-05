import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/license/validate
 *
 * Validates a license key. In production this will check against a
 * Supabase `licenses` table with columns: key, email, stripe_customer_id,
 * status, usage_count, created_at, expires_at.
 *
 * For now: accepts any key matching NAVOX-XXXX-XXXX-XXXX format.
 */

const PATTERN = /^NAVOX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export async function POST(req: NextRequest) {
  let body: { key?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { valid: false, status: "expired" },
      { status: 400 },
    );
  }

  const { key } = body;
  if (!key || typeof key !== "string") {
    return NextResponse.json(
      { valid: false, status: "expired" },
      { status: 400 },
    );
  }

  const normalized = key.toUpperCase().trim();
  if (!PATTERN.test(normalized)) {
    return NextResponse.json({ valid: false, status: "expired" });
  }

  // TODO: Replace with Supabase lookup
  // const { data, error } = await supabase
  //   .from("licenses")
  //   .select("status, expires_at")
  //   .eq("key", normalized)
  //   .single();
  //
  // if (error || !data) {
  //   return NextResponse.json({ valid: false, status: "expired" });
  // }
  //
  // const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
  // return NextResponse.json({
  //   valid: data.status === "active" && !isExpired,
  //   status: isExpired ? "expired" : data.status,
  //   expiresAt: data.expires_at,
  // });

  return NextResponse.json({
    valid: true,
    status: "active",
    expiresAt: null,
  });
}
