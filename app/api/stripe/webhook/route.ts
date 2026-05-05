import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook handler. In production:
 * 1. Verify webhook signature using STRIPE_WEBHOOK_SECRET
 * 2. Handle checkout.session.completed -> generate NAVOX-XXXX-XXXX-XXXX key,
 *    store in Supabase licenses table, email to customer
 * 3. Handle customer.subscription.deleted -> set license status to "cancelled"
 * 4. Handle invoice.payment_failed -> set license status to "expired"
 */

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  // TODO: Verify signature
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // let event: Stripe.Event;
  // try {
  //   event = stripe.webhooks.constructEvent(
  //     body,
  //     signature,
  //     process.env.STRIPE_WEBHOOK_SECRET!,
  //   );
  // } catch (err) {
  //   return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  // }
  //
  // switch (event.type) {
  //   case "checkout.session.completed": {
  //     const session = event.data.object as Stripe.Checkout.Session;
  //     const email = session.customer_email;
  //     const customerId = session.customer as string;
  //     const key = generateLicenseKey(); // NAVOX-XXXX-XXXX-XXXX
  //     await supabase.from("licenses").insert({
  //       key,
  //       email,
  //       stripe_customer_id: customerId,
  //       status: "active",
  //       usage_count: 0,
  //     });
  //     await sendLicenseEmail(email, key);
  //     break;
  //   }
  //   case "customer.subscription.deleted": {
  //     const sub = event.data.object as Stripe.Subscription;
  //     await supabase
  //       .from("licenses")
  //       .update({ status: "cancelled" })
  //       .eq("stripe_customer_id", sub.customer);
  //     break;
  //   }
  //   case "invoice.payment_failed": {
  //     const invoice = event.data.object as Stripe.Invoice;
  //     await supabase
  //       .from("licenses")
  //       .update({ status: "expired" })
  //       .eq("stripe_customer_id", invoice.customer);
  //     break;
  //   }
  // }

  console.log("[stripe-webhook] received event, body length:", body.length);
  return NextResponse.json({ received: true });
}
