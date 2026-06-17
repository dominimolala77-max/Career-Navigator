import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import querystring from "querystring";

dotenv.config();

// ─── Yoco SDK (fetch-based) ──────────────────────────────────
const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
const YOCO_API_URL = "https://payments.yoco.com/api/checkouts";
const YOCO_WEBHOOK_SECRET = process.env.YOCO_WEBHOOK_SECRET;

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || "http://localhost:5173/payment/return";
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || "http://localhost:5173/payment/cancel";
const PORT = process.env.PORT || 4242;

if (!STRIPE_SECRET) {
  console.warn("Warning: STRIPE_SECRET_KEY not set. Stripe payments will not function until configured.");
}

if (!YOCO_SECRET_KEY) {
  console.warn("Warning: YOCO_SECRET_KEY not set. Yoco payments will not function until configured.");
}

const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2024-08-01" }) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || null;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null;

if (!supabase) {
  console.warn("Supabase service role key or URL not provided. Webhooks will not update profiles/applications.");
}

const app = express();
app.use(cors());

// =============================================================================
// BUG FIX #5: Do NOT apply bodyParser.json() globally.
// Stripe webhook verification requires the raw request body (Buffer).
// If bodyParser.json() runs first, it consumes the stream and req.body becomes
// a parsed object — Stripe's constructEvent() then throws
// "No signatures found matching the expected signature for payload".
// We apply bodyParser per-route instead.
// =============================================================================

app.get("/", (_req, res) => res.json({ ok: true, message: "Payments server running (Stripe + PayFast + Yoco)" }));

// =============================================================================
// STRIPE: Create Checkout Session
// =============================================================================
app.post("/stripe/create-session", express.json(), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured on server" });
  try {
    const { itemName, amount, currency = "zar", userId, email, reference, kind, planId, applicationId } = req.body;
    if (!itemName || !amount) return res.status(400).json({ error: "Missing itemName or amount" });

    const unitAmount = Math.round(Number(amount) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: String(currency).toLowerCase(),
            product_data: { name: String(itemName) },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}&kind=${kind || ""}&ref=${encodeURIComponent(reference || "")}`,
      cancel_url: `${CANCEL_URL}?kind=${kind || ""}&ref=${encodeURIComponent(reference || "")}`,
      metadata: {
        userId: userId || "",
        reference: reference || "",
        kind: kind || "",
        planId: planId || "",
        applicationId: applicationId || "",
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("create-session error", err);
    return res.status(500).json({ error: String(err) });
  }
});

// =============================================================================
// STRIPE: Webhook — must use raw body for signature verification
// =============================================================================
app.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(200).send("webhook not configured");
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("Checkout session completed", session.id, session.metadata);
      const metadata = session.metadata || {};
      const userId = metadata.userId || metadata.user_id || null;
      const planId = metadata.planId || metadata.plan_id || null;
      const kind = metadata.kind || null;
      const applicationId = metadata.applicationId || metadata.application_id || null;

      if (!supabase) {
        console.warn("Supabase not configured: cannot persist payment result.");
        break;
      }

      try {
        if (kind === "plan" && userId && planId) {
          const { error } = await supabase
            .from("profiles")
            .update({
              selected_plan: planId,
              plan_payment_status: "paid",
              plan_paid_at: new Date().toISOString(),
            })
            .eq("id", userId);
          if (error) console.error("Supabase update error:", error);
          else console.log(`Profile ${userId} updated: plan ${planId} marked paid.`);
        } else if (kind === "application_fee" && applicationId) {
          const { error } = await supabase
            .from("institution_applications")
            .update({
              fee_payment_status: "paid",
              fee_paid_at: new Date().toISOString(),
            })
            .eq("id", applicationId);
          if (error) console.error("Supabase institution_applications update error:", error);
          else console.log(`Application ${applicationId} fee marked paid via Stripe webhook.`);
        } else if (kind === "application_fee" && userId) {
          const { error } = await supabase
            .from("institution_applications")
            .update({
              fee_payment_status: "paid",
              fee_paid_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("fee_payment_status", "unpaid");
          if (error) console.error("Supabase institution_applications bulk update error:", error);
          else console.log(`All unpaid application fees for user ${userId} marked paid.`);
        } else {
          console.warn("Unhandled metadata: kind=", kind, "userId=", userId, "planId=", planId, "applicationId=", applicationId);
        }
      } catch (err) {
        console.error("Error updating Supabase:", err);
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// =============================================================================
// PAYFAST: Health check endpoint
// =============================================================================
app.get("/payfast/notify", (_req, res) => {
  res.json({ ok: true, message: "PayFast ITN endpoint. POST with payment notification data." });
});

// =============================================================================
// PAYFAST: ITN (Instant Transaction Notification) handler
// =============================================================================
app.post("/payfast/notify", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const paymentData = req.body;
    console.log("PayFast ITN received:", paymentData.m_payment_id, paymentData.pf_payment_id, paymentData.payment_status);

    const isValid = await verifyPayFastITN(paymentData);

    if (!isValid) {
      console.error("PayFast ITN verification failed for m_payment_id:", paymentData.m_payment_id);
      return res.status(200).send("INVALID");
    }

    if (paymentData.payment_status !== "COMPLETE") {
      console.log(`PayFast payment ${paymentData.m_payment_id} status: ${paymentData.payment_status} — not completing`);
      return res.status(200).send("OK");
    }

    if (!supabase) {
      console.warn("Supabase not configured: cannot persist PayFast payment.");
      return res.status(200).send("OK");
    }

    const userId = paymentData.custom_str1 || null;
    const kind = paymentData.custom_str2 || "plan";
    const mPaymentId = paymentData.m_payment_id || "";
    const reference = mPaymentId;

    let applicationId = null;
    if (kind === "application_fee" && reference.startsWith("fee_")) {
      const parts = reference.split("_");
      if (parts.length >= 3) {
        applicationId = parts[1];
      }
    }

    try {
      if (kind === "plan" && userId) {
        const planId = paymentData.custom_str3 || "standard";
        const { error } = await supabase
          .from("profiles")
          .update({
            selected_plan: planId,
            plan_payment_status: "paid",
            plan_paid_at: new Date().toISOString(),
          })
          .eq("id", userId);
        if (error) console.error("PayFast ITN Supabase update error:", error);
        else console.log(`PayFast: Profile ${userId} updated, plan ${planId} paid.`);
      } else if (kind === "application_fee" && applicationId) {
        const { error } = await supabase
          .from("institution_applications")
          .update({
            fee_payment_status: "paid",
            fee_paid_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
        if (error) console.error("PayFast ITN institution_applications update error:", error);
        else console.log(`PayFast: Application ${applicationId} fee marked paid.`);
      } else {
        console.warn("PayFast ITN: Unhandled kind or missing identifiers:", { kind, userId, applicationId });
      }
    } catch (err) {
      console.error("PayFast ITN Supabase error:", err);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("PayFast ITN handler error:", err);
    return res.status(200).send("OK");
  }
});

async function verifyPayFastITN(paymentData) {
  const pfMode = process.env.VITE_PAYFAST_MODE === "production" ? "production" : "sandbox";
  const pfHost = pfMode === "production"
    ? "www.payfast.co.za"
    : "sandbox.payfast.co.za";

  const sortedKeys = Object.keys(paymentData).sort();
  const verifyData = {};
  for (const key of sortedKeys) {
    verifyData[key] = paymentData[key];
  }

  const passphrase = process.env.PAYFAST_PASSPHRASE || "";
  if (passphrase) {
    verifyData["passphrase"] = passphrase;
  }

  const paramString = querystring.stringify(verifyData);

  try {
    const https = (await import("https")).default;
    const options = {
      hostname: pfHost,
      path: "/eng/process/query",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(paramString),
      },
    };

    return new Promise((resolve) => {
      const reqHttps = https.request(options, (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => {
          const valid = data === "VALID";
          if (!valid) {
            console.warn("PayFast ITN verification returned:", data.trim());
          }
          resolve(valid);
        });
      });

      reqHttps.on("error", (err) => {
        console.error("PayFast ITN verification request error:", err);
        resolve(false);
      });

      reqHttps.write(paramString);
      reqHttps.end();
    });
  } catch (err) {
    console.error("PayFast ITN verify error:", err);
    return false;
  }
}

// =============================================================================
// YOCO: Create Checkout Session
// =============================================================================
app.post("/yoco/create-checkout", express.json(), async (req, res) => {
  if (!YOCO_SECRET_KEY) {
    return res.status(500).json({ error: "Yoco secret key not configured (YOCO_SECRET_KEY)" });
  }
  try {
    const { itemName, amount, currency = "ZAR", userId, email, reference, kind, planId, applicationId } = req.body;
    if (!itemName || !amount) return res.status(400).json({ error: "Missing itemName or amount" });

    const amountInCents = Math.round(Number(amount) * 100);

    const queryParams = `kind=${encodeURIComponent(kind || "")}&ref=${encodeURIComponent(reference || "")}`;
    const successUrl = `${SUCCESS_URL}?${queryParams}`;
    const cancelUrl = `${CANCEL_URL}?${queryParams}`;

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
      console.error("Yoco create-checkout error:", data);
      return res.status(502).json({ error: data.message || "Yoco checkout creation failed" });
    }

    return res.json({ url: data.redirectUrl, id: data.id });
  } catch (err) {
    console.error("Yoco create-checkout error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

// =============================================================================
// YOCO: Webhook
// BUG FIX #6: The original code sent res.status(200).json({ received: true }) BEFORE
// verifying the signature, then returned early inside the async block without sending
// another response — but the early `return` after the warning still caused
// "Cannot set headers after they are sent" crashes because the code path below the
// early return continued in some Node versions. Restructured so 200 is sent first
// (Yoco requires fast ACK) and all subsequent logic is purely async with no further
// response writes.
// =============================================================================
app.post("/yoco/webhook", express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}), async (req, res) => {
  // Yoco requires a fast 200 ACK — send it immediately
  res.status(200).json({ received: true });

  // All processing below is fire-and-forget; never write to res again
  (async () => {
    try {
      if (YOCO_WEBHOOK_SECRET) {
        const signature = req.headers["x-yoco-signature"];
        if (!signature) {
          console.warn("Yoco webhook: missing x-yoco-signature header");
          return;
        }

        const computed = crypto
          .createHmac("sha256", YOCO_WEBHOOK_SECRET)
          .update(req.rawBody || JSON.stringify(req.body))
          .digest("hex");

        if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))) {
          console.warn("Yoco webhook: invalid signature");
          return;
        }
      }

      const event = req.body;
      console.log("Yoco webhook received:", event.type, event.id);

      if (event.type !== "checkout.completed" && event.type !== "payment.completed") {
        console.log(`Yoco webhook: ignoring event type ${event.type}`);
        return;
      }

      const data = event.data || {};
      const metadata = data.metadata || {};
      const userId = metadata.userId || null;
      const kind = metadata.kind || null;
      const planId = metadata.planId || null;
      const applicationId = metadata.applicationId || null;

      if (!supabase) {
        console.warn("Yoco webhook: Supabase not configured, cannot persist payment.");
        return;
      }

      if (kind === "plan" && userId && planId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            selected_plan: planId,
            plan_payment_status: "paid",
            plan_paid_at: new Date().toISOString(),
          })
          .eq("id", userId);
        if (error) console.error("Yoco webhook Supabase update error:", error);
        else console.log(`Yoco: Profile ${userId} updated, plan ${planId} paid.`);
      } else if (kind === "application_fee" && applicationId) {
        const { error } = await supabase
          .from("institution_applications")
          .update({
            fee_payment_status: "paid",
            fee_paid_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
        if (error) console.error("Yoco webhook institution_applications update error:", error);
        else console.log(`Yoco: Application ${applicationId} fee marked paid.`);
      } else if (kind === "application_fee" && userId) {
        const { error } = await supabase
          .from("institution_applications")
          .update({
            fee_payment_status: "paid",
            fee_paid_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("fee_payment_status", "unpaid");
        if (error) console.error("Yoco webhook bulk update error:", error);
        else console.log(`Yoco: All unpaid application fees for user ${userId} marked paid.`);
      } else {
        console.warn("Yoco webhook: Unhandled kind or missing identifiers:", { kind, userId, planId, applicationId });
      }
    } catch (err) {
      console.error("Yoco webhook handler error:", err);
    }
  })();
});

// =============================================================================
// Start Server
// =============================================================================
app.listen(PORT, () => {
  console.log(`Payments server listening on port ${PORT}`);
  console.log(`  Stripe: ${stripe ? "configured" : "NOT configured"}`);
  console.log(`  PayFast: ${process.env.VITE_PAYFAST_MERCHANT_ID ? "configured" : "NOT configured"}`);
  console.log(`  Yoco: ${YOCO_SECRET_KEY ? "configured" : "NOT configured"}`);
  console.log(`  Supabase: ${supabase ? "configured with service role" : "NOT configured"}`);
  console.log(`  Success URL: ${SUCCESS_URL}`);
  console.log(`  Cancel URL: ${CANCEL_URL}`);
});
