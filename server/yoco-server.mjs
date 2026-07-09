/**
 * Yoco Payment Backend Server
 *
 * Endpoints:
 *   POST /yoco/create-checkout  – Create a Yoco checkout session (frontend calls this)
 *   POST /yoco/webhook           – Yoco webhook handler (Yoco calls this on payment success/failure)
 *   GET  /health                 – Health check
 *
 * Environment variables (see .env):
 *   PORT                         – Server port (default 4242)
 *   YOCO_SECRET_KEY              – Yoco Checkout secret key (starts with yoco_live_ or yoco_test_)
 *   YOCO_WEBHOOK_SECRET          – Yoco webhook signing secret (starts with whsec_)
 *   SUPABASE_URL                 – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    – Supabase service role key (for admin DB writes)
 *   PAYMENT_SUCCESS_URL          – Redirect URL after successful payment
 *   PAYMENT_CANCEL_URL           – Redirect URL if user cancels payment
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

dotenv.config();

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "4242", 10);
const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
const YOCO_WEBHOOK_SECRET = process.env.YOCO_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUCCESS_URL =
  process.env.PAYMENT_SUCCESS_URL || "http://localhost:5173/payment/return";
const CANCEL_URL =
  process.env.PAYMENT_CANCEL_URL || "http://localhost:5173/payment/cancel";
const YOCO_API_URL = "https://payments.yoco.com/api/checkouts";

// Suppress startup warnings for missing config — they are printed at startup.
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify the Yoco webhook signature using the latest Checkout webhook spec.
 *
 * Headers (set by Yoco):
 *   webhook-id         – Unique webhook event ID
 *   webhook-timestamp   – UNIX timestamp (seconds)
 *   webhook-signature   – Space-separated list of "v1,<base64-hmac>"
 *
 * The signed content is: `${webhookId}.${webhookTimestamp}.${rawBody}`
 * The HMAC is SHA-256 with the secret decoded from base64 (everything after "whsec_").
 */
function verifyWebhookSignature(req) {
  if (!YOCO_WEBHOOK_SECRET) {
    return { ok: true }; // No secret configured – accept all (dev mode)
  }

  const webhookId = req.headers["webhook-id"];
  const webhookTimestamp = req.headers["webhook-timestamp"];
  const webhookSignature = req.headers["webhook-signature"];

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return { ok: false, reason: "Missing required webhook headers" };
  }

  // Validate the webhook secret format
  if (!YOCO_WEBHOOK_SECRET.startsWith("whsec_")) {
    return {
      ok: false,
      reason:
        "YOCO_WEBHOOK_SECRET must be the Checkout webhook secret (starts with whsec_).",
    };
  }

  // Reject timestamps older than 3 minutes (replay protection)
  const ts = Number(webhookTimestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "Invalid webhook-timestamp" };
  }
  if (Math.abs(Date.now() / 1000 - ts) > 3 * 60) {
    return { ok: false, reason: "Webhook timestamp outside replay window (3 min)" };
  }

  // Reconstruct the expected signature
  const rawBody = Buffer.isBuffer(req.rawBody)
    ? req.rawBody.toString("utf8")
    : String(req.rawBody || "");
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  // The secret after "whsec_" is base64-encoded
  const secretBytes = Buffer.from(YOCO_WEBHOOK_SECRET.split("_")[1], "base64");
  const expectedSignature = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  // Parse the signature header: "v1,<sig1> v1,<sig2> ..."
  const signatures = String(webhookSignature)
    .split(" ")
    .map((entry) => entry.split(","))
    .filter(([version]) => version === "v1")
    .map(([, sig]) => sig)
    .filter(Boolean);

  const matched = signatures.some((sig) => timingSafeEqual(expectedSignature, sig));
  if (!matched) {
    return { ok: false, reason: "Invalid webhook-signature – HMAC mismatch" };
  }

  return { ok: true };
}

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "yoco-payments",
    yoco: !!YOCO_SECRET_KEY ? "configured" : "NOT configured",
    supabase: !!supabase ? "configured" : "NOT configured",
    webhook_secret: !!YOCO_WEBHOOK_SECRET ? "configured" : "NOT configured",
    timestamp: new Date().toISOString(),
  });
});

// ─── Create Yoco Checkout Session ───────────────────────────────────────────

app.post("/yoco/create-checkout", express.json(), async (req, res) => {
  try {
    // ── Validate input ──────────────────────────────────────────────────
    const { itemName, amount, currency = "ZAR", userId, email, reference, kind, planId, applicationId } = req.body;

    if (!itemName) {
      return res.status(400).json({ error: "Missing required field: itemName" });
    }
    if (amount == null || isNaN(Number(amount))) {
      return res.status(400).json({ error: "Missing or invalid required field: amount" });
    }

    if (!YOCO_SECRET_KEY) {
      return res.status(500).json({ error: "Yoco secret key not configured on server" });
    }

    // Yoco expects amounts in cents
    const amountInCents = Math.round(Number(amount) * 100);

    // Yoco minimum is R2 (200 cents)
    if (amountInCents < 200) {
      return res.status(400).json({ error: "Amount must be at least R2.00 (200 cents)" });
    }

    // ── Build redirect URLs with metadata ───────────────────────────────
    const queryParams = new URLSearchParams({
      kind: kind || "",
      ref: reference || "",
    }).toString();
    const successUrl = `${SUCCESS_URL}?${queryParams}`;
    const cancelUrl = `${CANCEL_URL}?${queryParams}`;

    // ── Call Yoco API ───────────────────────────────────────────────────
    const response = await fetch(YOCO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${YOCO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: String(currency).toUpperCase(),
        successUrl,
        cancelUrl,
        failureUrl: cancelUrl,
        metadata: {
          userId: userId || "",
          reference: reference || "",
          kind: kind || "",
          planId: planId || "",
          applicationId: applicationId || "",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Yoco] create-checkout error:", JSON.stringify(data));
      return res.status(502).json({
        error: data.message || "Yoco checkout creation failed",
        details: data,
      });
    }

    // ── Persist pending payment record in Supabase ──────────────────────
    try {
      if (supabase) {
        const isUuid = (v) =>
          typeof v === "string" &&
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
            v
          );

        const { error: insertErr } = await supabase.from("payments").insert({
          checkout_id: data.id || null,
          amount: amountInCents,
          currency: String(currency).toUpperCase(),
          status: "pending",
          user_id: isUuid(userId) ? userId : null,
          reference: reference || (isUuid(userId) ? "" : String(userId || "")),
          kind: kind || null,
          plan_id: planId || null,
          application_id: applicationId || null,
          created_at: new Date().toISOString(),
        });

        if (insertErr) {
          console.error("[Yoco] Failed to insert pending payment:", insertErr.message);
        } else {
          console.log(`[Yoco] Pending payment recorded for checkout ${data.id}`);
        }
      }
    } catch (dbErr) {
      console.error("[Yoco] DB error on payment insert:", dbErr);
    }

    // ── Return checkout URL to frontend ─────────────────────────────────
    return res.json({
      url: data.redirectUrl,
      id: data.id,
    });
  } catch (err) {
    console.error("[Yoco] create-checkout unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Yoco Webhook Handler ────────────────────────────────────────────────────
//
// IMPORTANT: This route captures the raw body BEFORE Express JSON parsing so
// that signature verification works correctly. We use express.json() with a
// verify callback that preserves the raw Buffer.

app.post(
  "/yoco/webhook",
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf; // Preserve raw buffer for HMAC verification
    },
  }),
  async (req, res) => {
    // ── Verify webhook signature ────────────────────────────────────────
    const verification = verifyWebhookSignature(req);
    if (!verification.ok) {
      console.warn("[Yoco] Webhook signature verification failed:", verification.reason);
      return res.status(403).json({ error: verification.reason });
    }

    // ── Acknowledge receipt immediately (Yoco expects fast 2xx) ─────────
    // All subsequent processing is fire-and-forget.
    res.status(200).json({ received: true });

    // ── Async processing (never write to res again) ─────────────────────
    processWebhookEvent(req.body).catch((err) => {
      console.error("[Yoco] Async webhook processing error:", err);
    });
  }
);

/**
 * Process a verified webhook event asynchronously.
 * Updates the payments table and the relevant business entity (profile or application).
 */
async function processWebhookEvent(event) {
  try {
    console.log("[Yoco] Webhook received:", event.type, event.id);

    // Only process successful payment events
    const successEvents = new Set([
      "payment.succeeded",
      "checkout.completed",
      "payment.completed",
    ]);
    if (!successEvents.has(event.type)) {
      console.log(`[Yoco] Ignoring event type: ${event.type}`);
      return;
    }

    const data = event.payload || event.data || {};
    const metadata = data.metadata || {};
    const userId = metadata.userId || metadata.user_id || null;
    const kind = metadata.kind || null;
    const planId = metadata.planId || metadata.plan_id || null;
    const applicationId = metadata.applicationId || metadata.application_id || null;

    // ── Find the matching payment row in Supabase ──────────────────────
    const checkoutCandidates = [
      data.checkoutId,
      data.id,
      metadata.checkoutId,
      metadata.checkout_id,
      metadata.reference,
      data.reference,
    ].filter(Boolean);

    let paymentRow = null;
    try {
      if (supabase && checkoutCandidates.length > 0) {
        const { data: rows, error } = await supabase
          .from("payments")
          .select("id, checkout_id, status")
          .in("checkout_id", checkoutCandidates)
          .limit(1);

        if (error) {
          console.error("[Yoco] DB select error:", error.message);
        } else if (rows && rows.length > 0) {
          paymentRow = rows[0];
        }
      }
    } catch (err) {
      console.error("[Yoco] Error querying payments:", err);
    }

    // Idempotency: skip if already marked succeeded
    if (paymentRow && paymentRow.status === "succeeded") {
      console.log(`[Yoco] Payment ${paymentRow.checkout_id} already succeeded — skipping`);
      return;
    }

    // ── Update the payments row ─────────────────────────────────────────
    if (supabase && paymentRow) {
      try {
        const updatePayload = {
          status: "succeeded",
          amount: data.amount || data.amountInCents || undefined,
          currency: data.currency || undefined,
          updated_at: new Date().toISOString(),
          raw_event: JSON.stringify(event),
        };

        // Capture masked card info if present
        const card = data.card || data.payment_method || data.source || {};
        const cardMask =
          card.last4 || card.maskedPan || card.masked_pan || card.pan || null;
        if (cardMask) {
          updatePayload.card_mask = cardMask;
        }

        const { error: updErr } = await supabase
          .from("payments")
          .update(updatePayload)
          .eq("id", paymentRow.id);

        if (updErr) {
          console.error("[Yoco] DB update error:", updErr.message);
        } else {
          console.log(`[Yoco] Payment row ${paymentRow.id} updated to succeeded`);
        }
      } catch (err) {
        console.error("[Yoco] Error updating payment row:", err);
      }
    } else if (paymentRow === null) {
      console.warn("[Yoco] No matching payment row found for candidates:", checkoutCandidates);
    }

    if (!supabase) {
      console.warn("[Yoco] Supabase not configured — cannot update records");
      return;
    }

    // ── Update the business entity based on payment kind ────────────────
    if (kind === "plan" && userId && planId) {
      const { error } = await supabase
        .from("profiles")
        .update({
          selected_plan: planId,
          plan_payment_status: "paid",
          plan_paid_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("[Yoco] Failed to update profile:", error.message);
      } else {
        console.log(`[Yoco] Profile ${userId} — plan ${planId} marked paid`);
      }
    } else if (kind === "application_fee" && applicationId) {
      // Mark a specific application fee as paid
      const { error } = await supabase
        .from("applications")
        .update({
          fee_payment_status: "paid",
          fee_paid_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (error) {
        console.error("[Yoco] Failed to update application fee:", error.message);
      } else {
        console.log(`[Yoco] Application ${applicationId} fee marked paid`);
      }
    } else if (kind === "application_fee" && userId && !applicationId) {
      // Bulk: mark all unpaid application fees for this user as paid
      const { error } = await supabase
        .from("applications")
        .update({
          fee_payment_status: "paid",
          fee_paid_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("fee_payment_status", "unpaid");

      if (error) {
        console.error("[Yoco] Failed to bulk-update application fees:", error.message);
      } else {
        console.log(`[Yoco] All unpaid application fees for user ${userId} marked paid`);
      }
    } else {
      console.warn("[Yoco] Unhandled payment kind or missing identifiers:", {
        kind,
        userId,
        planId,
        applicationId,
      });
    }
  } catch (err) {
    console.error("[Yoco] processWebhookEvent error:", err);
  }
}

// ─── 404 Fallback ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error("[Yoco] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════════════╗`);
  console.log(`║         Yoco Payments Server                     ║`);
  console.log(`║──────────────────────────────────────────────────║`);
  console.log(`║  Port:         ${String(PORT).padEnd(32)}║`);
  console.log(`║  Yoco Key:     ${YOCO_SECRET_KEY ? "✅ configured".padEnd(32) : "❌ NOT configured".padEnd(32)}║`);
  console.log(`║  Webhook:      ${YOCO_WEBHOOK_SECRET ? "✅ configured".padEnd(32) : "❌ NOT configured".padEnd(32)}║`);
  console.log(`║  Supabase:     ${supabase ? "✅ configured".padEnd(32) : "❌ NOT configured".padEnd(32)}║`);
  console.log(`║  Success URL:  ${SUCCESS_URL.padEnd(32)}║`);
  console.log(`║  Cancel URL:   ${CANCEL_URL.padEnd(32)}║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health                  Health check`);
  console.log(`  POST /yoco/create-checkout    Create Yoco checkout session`);
  console.log(`  POST /yoco/webhook            Yoco webhook handler`);
  console.log(`\nReady.`);
});