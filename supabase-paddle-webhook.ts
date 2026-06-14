/**
 * supabase/functions/paddle-webhook/index.ts
 *
 * Paddle webhook → Supabase Edge Function
 * Updates user_subscriptions when Paddle fires subscription events.
 *
 * Deploy:
 *   supabase functions deploy paddle-webhook --no-verify-jwt
 *
 * Then set in Paddle dashboard:
 *   Webhook URL: https://<your-project-ref>.supabase.co/functions/v1/paddle-webhook
 *   Events: subscription.created, subscription.updated, subscription.cancelled, subscription.paused
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Paddle plan ID → tier mapping ───────────────────────────────────────────
// Replace these with your actual Paddle plan/price IDs from the Paddle dashboard
const PLAN_TIER_MAP: Record<string, string> = {
  "pri_pro_monthly":    "pro",
  "pri_pro_annual":     "pro",
  "pri_biz_monthly":    "business",
  "pri_biz_annual":     "business",
};

// ─── Supabase admin client (service role bypasses RLS) ───────────────────────
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ─── Webhook signature verification ──────────────────────────────────────────
async function verifyPaddleSignature(
  body: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  // Paddle v2 signature format: ts=<timestamp>;h1=<hmac>
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("="))
  );
  const timestamp = parts["ts"];
  const signature = parts["h1"];

  if (!timestamp || !signature) return false;

  const payload = `${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBytes = Uint8Array.from(
    signature.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16))
  );
  const dataBytes = new TextEncoder().encode(payload);

  return crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signatureHeader = req.headers.get("Paddle-Signature");
  const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET")!;

  // Verify signature in production
  const isValid = await verifyPaddleSignature(body, signatureHeader, webhookSecret);
  if (!isValid) {
    console.error("Invalid Paddle webhook signature");
    return new Response("Unauthorized", { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = event.event_type as string;
  const data = event.data as Record<string, unknown>;

  console.log(`Paddle event received: ${eventType}`);

  // ── Extract common fields ──
  const subscriptionId = data?.id as string;
  const customData = (data?.custom_data as Record<string, string>) || {};
  const userId = customData?.supabase_user_id;  // You pass this when creating the checkout

  if (!userId) {
    console.error("No supabase_user_id in custom_data — cannot map to user");
    return new Response("Missing user mapping", { status: 400 });
  }

  // ── Map Paddle plan ID to our tier ──
  const items = (data?.items as Array<Record<string, unknown>>) || [];
  const priceId = items[0]?.price?.id as string;
  const tier = PLAN_TIER_MAP[priceId] || "free";

  const periodEnd = data?.current_billing_period
    ? new Date((data.current_billing_period as Record<string, string>).ends_at).toISOString()
    : null;

  // ── Handle each event type ──
  switch (eventType) {
    case "subscription.created":
    case "subscription.updated": {
      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .upsert({
          user_id: userId,
          tier,
          paddle_subscription_id: subscriptionId,
          paddle_plan_id: priceId,
          status: "active",
          current_period_end: periodEnd,
        }, { onConflict: "user_id" });

      if (error) {
        console.error("Supabase upsert error:", error);
        return new Response("DB error", { status: 500 });
      }
      console.log(`User ${userId} upgraded to ${tier}`);
      break;
    }

    case "subscription.cancelled": {
      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          tier: "free",
          status: "cancelled",
          paddle_subscription_id: null,
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Supabase update error:", error);
        return new Response("DB error", { status: 500 });
      }
      console.log(`User ${userId} downgraded to free (cancelled)`);
      break;
    }

    case "subscription.paused": {
      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({ status: "paused" })
        .eq("user_id", userId);

      if (error) {
        console.error("Supabase update error:", error);
        return new Response("DB error", { status: 500 });
      }
      console.log(`User ${userId} subscription paused`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
