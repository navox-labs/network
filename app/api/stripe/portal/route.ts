import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so users can manage
 * their subscription (cancel, update payment method, view invoices).
 *
 * Requires STRIPE_SECRET_KEY env var and a customer ID.
 */

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 501 },
    );
  }

  let body: { customerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Missing request body" },
      { status: 400 },
    );
  }

  if (!body.customerId) {
    return NextResponse.json(
      { error: "Missing customerId" },
      { status: 400 },
    );
  }

  // TODO: Uncomment when stripe package is installed
  // const stripe = new Stripe(stripeKey);
  // const session = await stripe.billingPortal.sessions.create({
  //   customer: body.customerId,
  //   return_url: `${req.nextUrl.origin}/network`,
  // });
  // return NextResponse.json({ url: session.url });

  return NextResponse.json(
    { error: "Stripe not configured" },
    { status: 501 },
  );
}
