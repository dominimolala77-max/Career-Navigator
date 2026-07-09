/**
 * Yoco Payment Backend Server
 *
 * Endpoints:
 *   POST /yoco/create-checkout  – Create a Yoco checkout session (frontend calls this)
 *   POST /yoco/webhook           – Yoco webhook handler (Yoco calls this on payment success/failure)
 *   GET  /yoco/checkout          – Demo checkout page (when Yoco API is unavailable)
 *   POST /yoco/demo-webhook      – Demo webhook (simulates payment success)
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
 *   YOCO_DEMO_MODE               – Set to "true" to use demo checkout (no live Yoco key needed)
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
const YOCO_DEMO_MODE = process.env.YOCO_DEMO_MODE === "true";

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ─── Demo Checkout Page (hosted HTML) ────────────────────────────────────────
// When Yoco API is unavailable or in demo mode, this page simulates a payment.
// It lets the user test the full payment flow without a valid Yoco key.

const DEMO_CHECKOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CareerPath SA - Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: white; border-radius: 16px; padding: 32px; max-width: 420px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .logo { font-size: 24px; font-weight: 800; color: #006B5E; text-align: center; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .amount-box { background: #E8F5F3; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .amount-label { font-size: 12px; color: #006B5E; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .amount-value { font-size: 36px; font-weight: 800; color: #0F172A; margin-top: 4px; }
    .info { font-size: 13px; color: #64748b; text-align: center; margin-bottom: 20px; line-height: 1.5; }
    .demo-badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
    .btn-group { display: flex; flex-direction: column; gap: 10px; }
    .btn-primary { background: #006B5E; color: white; border: none; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
    .btn-primary:hover { background: #005548; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: white; color: #0F172A; border: 1px solid #e2e8f0; padding: 14px; border-radius: 12px; font-size: 14px; cursor: pointer; transition: background 0.2s; text-align: center; text-decoration: none; }
    .btn-secondary:hover { background: #f8fafc; }
    .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-msg { color: #dc2626; font-size: 13px; text-align: center; margin-top: 12px; display: none; }
    @media (max-width: 480px) { .card { padding: 24px 20px; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">CareerPath SA</div>
    <div class="subtitle">Secure Payment</div>
    <div style="text-align:center;"><span class="demo-badge">🔧 TEST MODE</span></div>
    <div class="amount-box">
      <div class="amount-label">Total Due</div>
      <div class="amount-value" id="amountDisplay">R0.00</div>
    </div>
    <div class="info">
      This is a <strong>test payment page</strong>.<br />
      Click "Pay Now" to simulate a successful payment.
    </div>
    <div class="btn-group">
      <button class="btn-primary" id="payBtn" onclick="processPayment()">
        <span id="btnText">💳 Pay Now</span>
      </button>
      <a class="btn-secondary" id="cancelLink" href="#">← Cancel & return</a>
    </div>
    <div class="error-msg" id="errorMsg"></div>
  </div>

  <script>
    const params = new URLSearchParams(window.location.search);
    const amount = params.get('amount') || '0';
    const currency = params.get('currency') || 'ZAR';
    const successUrl = params.get('successUrl') || '';
    const cancelUrl = params.get('cancelUrl') || '';
    const checkoutId = params.get('checkoutId') || 'demo_' + Date.now();
    const kind = params.get('kind') || '';
    const userId = params.get('userId') || '';
    const planId = params.get('planId') || '';
    const applicationId = params.get('applicationId') || '';

    document.getElementById('amountDisplay').textContent =
      new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency }).format(Number(amount) / 100);
    document.getElementById('cancelLink').href = cancelUrl;

    async function processPayment() {
      const btn = document.getElementById('payBtn');
      const btnText = document.getElementById('btnText');
      btn.disabled = true;
      btnText.innerHTML = '<span class="spinner"></span>Processing...';

      // Simulate payment processing delay
      await new Promise(r => setTimeout(r, 2000));

      // Notify the backend that payment succeeded (demo webhook)
      try {
        await fetch('/yoco/demo-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkoutId: checkoutId,
            success: true,
            amount: parseInt(amount),
            currency: currency,
            metadata: {
              userId: userId,
              kind: kind,
              planId: planId,
              applicationId: applicationId
            }
          })
        });
      } catch(e) {
        console.warn('Demo webhook call failed (non-critical):', e);
      }

      // Redirect to success URL
      if (successUrl) {
        const sep = successUrl.includes('?') ? '&' : '?';
        window.location.href = successUrl + sep + 'session_id=' + checkoutId + '&demo=true';
      } else {
        window.location.href = cancelUrl;
      }
    }
  </script>
</body>
</html>`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function verifyWebhookSignature(req) {
  if (!YOCO_WEBHOOK_SECRET) {
    return { ok: true };
  }

  const webhookId = req.headers["webhook-id"];
  const webhookTimestamp = req.headers["webhook-timestamp"];
  const webhookSignature = req.headers["webhook-signature"];

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return { ok: false, reason: "Missing required webhook headers" };
  }

  if (!YOCO_WEBHOOK_SECRET.startsWith("whsec_")) {
    return {
      ok: false,
      reason: "YOCO_WEBHOOK_SECRET must be the Checkout webhook secret (starts with whsec_).",
    };
  }

  const ts = Number(webhookTimestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "Invalid webhook-timestamp" };
  }
  if (Math.abs(Date.now() / 1000 - ts) > 3 * 60) {
    return { ok: false, reason: "Webhook timestamp outside replay window (3 min)" };
  }

  const rawBody = Buffer.isBuffer(req.rawBody)
    ? req.rawBody.toString("utf8")
    : String(req.rawBody || "");
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const secretBytes = Buffer.from(YOCO_WEBHOOK_SECRET.split("_")[1], "base64");
  const expectedSignature = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

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

/**
 * Mark payment and business entity as paid in Supabase.
 */
async function markPaymentSucceeded(event, checkoutId) {
  try {
    const data = event.payload || event.data || {};
    const metadata = data.metadata || {};
    const userId = metadata.userId || metadata.user_id || null;
    const kind = metadata.kind || null;
    const planId = metadata.planId || metadata.plan_id || null;
    const applicationId = metadata.applicationId || metadata.application_id || null;

    if (!supabase) {
      console.warn("[Yoco] Supabase not configured — cannot update records");
      return;
    }

    // Update the payments row
    const { data: rows } = await supabase
      .from("payments")
      .select("id, status")
      .eq("checkout_id", checkoutId)
      .limit(1);

    const paymentRow = rows && rows.length > 0 ? rows[0] : null;

    if (paymentRow && paymentRow.status !== "succeeded") {
      await supabase
        .from("payments")
        .update({
          status: "succeeded",
          updated_at: new Date().toISOString(),
          raw_event: JSON.stringify(event),
        })
        .eq("id", paymentRow.id);
      console.log(`[Yoco] Payment row ${paymentRow.id} updated to succeeded`);
    } else if (!paymentRow) {
      // Insert a new payment record if none exists
      await supabase.from("payments").insert({
        checkout_id: checkoutId,
        status: "succeeded",
        user_id: userId,
        kind: kind,
        plan_id: planId,
        application_id: applicationId,
        amount: data.amount || data.amountInCents || undefined,
        currency: data.currency || "ZAR",
        raw_event: JSON.stringify(event),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log(`[Yoco] New payment record inserted for checkout ${checkoutId}`);
    }

    // Update the business entity
    if (kind === "plan" && userId && planId) {
      await supabase
        .from("profiles")
        .update({
          selected_plan: planId,
          plan_payment_status: "paid",
          plan_paid_at: new Date().toISOString(),
        })
        .eq("id", userId);
      console.log(`[Yoco] Profile ${userId} — plan ${planId} marked paid`);
    } else if (kind === "application_fee" && applicationId) {
      await supabase
        .from("applications")
        .update({
          fee_payment_status: "paid",
          fee_paid_at: new Date().toISOString(),
        })
        .eq("id", applicationId);
      console.log(`[Yoco] Application ${applicationId} fee marked paid`);
    } else if (kind === "application_fee" && userId && !applicationId) {
      await supabase
        .from("applications")
        .update({
          fee_payment_status: "paid",
          fee_paid_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("fee_payment_status", "unpaid");
      console.log(`[Yoco] All unpaid fees for user ${userId} marked paid`);
    }
  } catch (err) {
    console.error("[Yoco] Error processing payment success:", err);
  }
}

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "yoco-payments",
    yoco: !!YOCO_SECRET_KEY ? "configured" : "NOT configured",
    yoco_demo: YOCO_DEMO_MODE || !YOCO_SECRET_KEY,
    supabase: !!supabase ? "configured" : "NOT configured",
    webhook_secret: !!YOCO_WEBHOOK_SECRET ? "configured" : "NOT configured",
    timestamp: new Date().toISOString(),
  });
});

// ─── Demo Checkout Page ─────────────────────────────────────────────────────

app.get("/yoco/checkout", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(DEMO_CHECKOUT_HTML);
});

// ─── Create Yoco Checkout Session ───────────────────────────────────────────

app.post("/yoco/create-checkout", express.json(), async (req, res) => {
  try {
    const { itemName, amount, currency = "ZAR", userId, email, reference, kind, planId, applicationId } = req.body;

    if (!itemName) {
      return res.status(400).json({ error: "Missing required field: itemName" });
    }
    if (amount == null || isNaN(Number(amount))) {
      return res.status(400).json({ error: "Missing or invalid required field: amount" });
    }

    const amountInCents = Math.round(Number(amount) * 100);

    if (amountInCents < 200) {
      return res.status(400).json({ error: "Amount must be at least R2.00 (200 cents)" });
    }

    const queryParams = new URLSearchParams({
      kind: kind || "",
      ref: reference || "",
    }).toString();
    const successUrl = `${SUCCESS_URL}?${queryParams}`;
    const cancelUrl = `${CANCEL_URL}?${queryParams}`;

    // ── DEMO MODE ───────────────────────────────────────────────────────
    // If YOCO_DEMO_MODE=true or the Yoco key is not configured or invalid,
    // serve the demo checkout page instead of calling Yoco's API.
    if (YOCO_DEMO_MODE || !YOCO_SECRET_KEY) {
      const demoCheckoutId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Record a pending payment
      try {
        if (supabase) {
          const isUuid = (v) =>
            typeof v === "string" &&
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

          await supabase.from("payments").insert({
            checkout_id: demoCheckoutId,
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
          console.log(`[Yoco] Demo pending payment recorded: ${demoCheckoutId}`);
        }
      } catch (dbErr) {
        console.error("[Yoco] Demo DB insert error:", dbErr);
      }

      // Build the demo checkout URL
      const demoUrl = new URL(`/yoco/checkout`, `http://localhost:${PORT}`);
      demoUrl.searchParams.set("amount", String(amountInCents));
      demoUrl.searchParams.set("currency", String(currency).toUpperCase());
      demoUrl.searchParams.set("successUrl", successUrl);
      demoUrl.searchParams.set("cancelUrl", cancelUrl);
      demoUrl.searchParams.set("checkoutId", demoCheckoutId);
      demoUrl.searchParams.set("kind", kind || "");
      demoUrl.searchParams.set("userId", userId || "");
      demoUrl.searchParams.set("planId", planId || "");
      demoUrl.searchParams.set("applicationId", applicationId || "");

      return res.json({
        url: demoUrl.toString(),
        id: demoCheckoutId,
        demo: true,
      });
    }

    // ── LIVE YOCO API ───────────────────────────────────────────────────
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
      // If Yoco returns 403 (invalid key), fall back to demo mode automatically
      if (response.status === 403) {
        console.warn("[Yoco] Yoco API key rejected (403). Falling back to demo mode.");
        const demoCheckoutId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        try {
          if (supabase) {
            const isUuid = (v) =>
              typeof v === "string" &&
              /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

            await supabase.from("payments").insert({
              checkout_id: demoCheckoutId,
              amount: amountInCents,
              currency: String(currency).toUpperCase(),
              status: "pending",
              user_id: isUuid(userId) ? userId : null,
              kind: kind || null,
              plan_id: planId || null,
              application_id: applicationId || null,
              created_at: new Date().toISOString(),
            });
          }
        } catch (_ignore) {}

        const demoUrl = new URL(`/yoco/checkout`, `http://localhost:${PORT}`);
        demoUrl.searchParams.set("amount", String(amountInCents));
        demoUrl.searchParams.set("currency", String(currency).toUpperCase());
        demoUrl.searchParams.set("successUrl", successUrl);
        demoUrl.searchParams.set("cancelUrl", cancelUrl);
        demoUrl.searchParams.set("checkoutId", demoCheckoutId);
        demoUrl.searchParams.set("kind", kind || "");
        demoUrl.searchParams.set("userId", userId || "");
        demoUrl.searchParams.set("planId", planId || "");
        demoUrl.searchParams.set("applicationId", applicationId || "");

        return res.json({
          url: demoUrl.toString(),
          id: demoCheckoutId,
          demo: true,
        });
      }

      return res.status(502).json({
        error: data.message || "Yoco checkout creation failed",
        details: data,
      });
    }

    // Persist pending payment record
    try {
      if (supabase) {
        const isUuid = (v) =>
          typeof v === "string" &&
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

        await supabase.from("payments").insert({
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
        console.log(`[Yoco] Pending payment recorded for checkout ${data.id}`);
      }
    } catch (dbErr) {
      console.error("[Yoco] DB error on payment insert:", dbErr);
    }

    return res.json({
      url: data.redirectUrl,
      id: data.id,
    });
  } catch (err) {
    console.error("[Yoco] create-checkout unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Demo Payment Webhook (called by demo checkout page after payment) ──────

app.post("/yoco/demo-webhook", express.json(), async (req, res) => {
  try {
    const { checkoutId, success } = req.body;
    if (!checkoutId) {
      return res.status(400).json({ error: "Missing checkoutId" });
    }

    if (success) {
      // Simulate a successful webhook event
      const mockEvent = {
        type: "checkout.completed",
        id: checkoutId,
        payload: {
          checkoutId,
          metadata: req.body.metadata || {},
          amount: req.body.amount,
          currency: req.body.currency || "ZAR",
        },
      };

      await markPaymentSucceeded(mockEvent, checkoutId);
      return res.json({ received: true });
    }

    // Mark as failed
    if (supabase) {
      await supabase
        .from("payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("checkout_id", checkoutId);
    }
    return res.json({ received: true });
  } catch (err) {
    console.error("[Yoco] demo-webhook error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// ─── Yoco Webhook Handler ────────────────────────────────────────────────────

app.post(
  "/yoco/webhook",
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
  async (req, res) => {
    const verification = verifyWebhookSignature(req);
    if (!verification.ok) {
      console.warn("[Yoco] Webhook signature verification failed:", verification.reason);
      return res.status(403).json({ error: verification.reason });
    }

    res.status(200).json({ received: true });

    processWebhookEvent(req.body).catch((err) => {
      console.error("[Yoco] Async webhook processing error:", err);
    });
  }
);

async function processWebhookEvent(event) {
  try {
    console.log("[Yoco] Webhook received:", event.type, event.id);

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
    const checkoutId = data.checkoutId || data.id || event.id;
    if (checkoutId) {
      await markPaymentSucceeded(event, checkoutId);
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
  const demoActive = YOCO_DEMO_MODE || !YOCO_SECRET_KEY;
  console.log(`╔══════════════════════════════════════════════════╗`);
  console.log(`║         Yoco Payments Server                     ║`);
  console.log(`║──────────────────────────────────────────────────║`);
  console.log(`║  Port:         ${String(PORT).padEnd(32)}║`);
  console.log(`║  Yoco Key:     ${YOCO_SECRET_KEY ? "✅ configured".padEnd(32) : "❌ NOT configured".padEnd(32)}║`);
  console.log(`║  Demo Mode:    ${(demoActive ? "✅ ACTIVE".padEnd(32) : "  disabled".padEnd(32))}║`);
  console.log(`║  Webhook:      ${YOCO_WEBHOOK_SECRET ? "✅ configured".padEnd(32) : "❌ NOT configured".padEnd(32)}║`);
  console.log(`║  Supabase:     ${supabase ? "✅ configured".padEnd(32) : "❌ NOT configured".padEnd(32)}║`);
  console.log(`║  Success URL:  ${SUCCESS_URL.padEnd(32)}║`);
  console.log(`║  Cancel URL:   ${CANCEL_URL.padEnd(32)}║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health                  Health check`);
  console.log(`  POST /yoco/create-checkout    Create Yoco checkout session`);
  console.log(`  GET  /yoco/checkout           Demo checkout page (${demoActive ? "active" : "requires Yoco key"})`);
  console.log(`  POST /yoco/demo-webhook       Demo webhook (simulates payment success)`);
  console.log(`  POST /yoco/webhook            Yoco webhook handler`);
  console.log(`\nReady.`);
});