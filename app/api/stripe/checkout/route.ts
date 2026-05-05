import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for the $39/mo Navox license.
 * Returns { url } that the client redirects to.
 *
 * Requires STRIPE_SECRET_KEY and STRIPE_PRICE_ID env vars.
 */

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!stripeKey || !priceId) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 501 },
    );
  }

  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine — email is optional
  }

  // TODO: Uncomment when stripe package is installed
  // const stripe = new Stripe(stripeKey);
  // const session = await stripe.checkout.sessions.create({
  //   mode: "subscription",
  //   line_items: [{ price: priceId, quantity: 1 }],
  //   customer_email: body.email || undefined,
  //   success_url: `${req.nextUrl.origin}/network?license=success`,
  //   cancel_url: `${req.nextUrl.origin}/network?license=cancelled`,
  //   metadata: { source: "navox-network" },
  // });
  // return NextResponse.json({ url: session.url });

  return NextResponse.json(
    { error: "Stripe not configured" },
    { status: 501 },
  );
}
