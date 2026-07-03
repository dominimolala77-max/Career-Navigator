import express from "express";
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

const APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || "http://localhost:5173";
const SUCCESS_URL = process.env.PAYMENT_SUCCESS_URL || `${APP_URL.replace(/\/$/, "")}/payment/return`;
const CANCEL_URL = process.env.PAYMENT_CANCEL_URL || `${APP_URL.replace(/\/$/, "")}/payment/cancel`;
const PORT = process.env.PORT || 4242;

if (!YOCO_SECRET_KEY) {
  console.warn("Warning: YOCO_SECRET_KEY not set. Yoco payments will not function until configured.");
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || null;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null;

if (!supabase) {
  console.warn("Supabase service role key or URL not provided. Webhooks will not update profiles/applications.");
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyYocoCheckoutSignature(req) {
  if (!YOCO_WEBHOOK_SECRET) return { ok: true };

  const webhookSignature = req.headers["webhook-signature"];
  const webhookId = req.headers["webhook-id"];
  const webhookTimestamp = req.headers["webhook-timestamp"];

  if (webhookSignature && webhookId && webhookTimestamp) {
    if (!YOCO_WEBHOOK_SECRET.startsWith("whsec_")) {
      return {
        ok: false,
        reason: "YOCO_WEBHOOK_SECRET must be the Checkout webhook secret that starts with whsec_.",
      };
    }

    const timestampSeconds = Number(webhookTimestamp);
    if (!Number.isFinite(timestampSeconds)) {
      return { ok: false, reason: "invalid webhook-timestamp header" };
    }

    const maxSkewSeconds = 3 * 60;
    const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
    if (ageSeconds > maxSkewSeconds) {
      return { ok: false, reason: "webhook timestamp outside the 3 minute replay window" };
    }

    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : String(req.rawBody || "");
    const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
    const secretBytes = Buffer.from(YOCO_WEBHOOK_SECRET.split("_")[1], "base64");
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    const signatures = String(webhookSignature)
      .split(" ")
      .map((entry) => entry.split(","))
      .filter(([version, signature]) => version === "v1" && signature)
      .map(([, signature]) => signature);

    if (signatures.some((signature) => timingSafeEqualString(expectedSignature, signature))) {
      return { ok: true };
    }

    return { ok: false, reason: "invalid webhook-signature header" };
  }

  // Compatibility with older/local test payloads that used a raw hex HMAC header.
  const legacySignature = req.headers["x-yoco-signature"];
  if (legacySignature) {
    const computed = crypto
      .createHmac("sha256", YOCO_WEBHOOK_SECRET)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest("hex");

    if (timingSafeEqualString(computed, legacySignature)) {
      return { ok: true };
    }

    return { ok: false, reason: "invalid x-yoco-signature header" };
  }

  return { ok: false, reason: "missing Yoco webhook signature headers" };
}
const app = express();
app.use(cors());

// =============================================================================
// BUG FIX #5: Do NOT apply bodyParser.json() globally.
// Some webhook signature verifications require the raw request body (Buffer).
// If express.json() runs first, it consumes the stream and req.body becomes
// a parsed object, which can break signature verification for some payment webhooks.
// We apply body parsing per-route instead.
// =============================================================================

app.get("/", (_req, res) => res.json({ ok: true, message: "Payments server running (PayFast + Yoco)" }));

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

    // Yoco does not accept payments under R2 (200 cents)
    if (amountInCents < 200) {
      return res.status(400).json({ error: "Amount must be at least R2.00 (Yoco minimum)" });
    }

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

    // Persist a pending payment record in Supabase so webhooks can reconcile later.
    try {
      if (supabase) {
        function looksLikeUuid(v) {
          return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
        }

        const insert = {
          checkout_id: data.id || null,
          amount: amountInCents,
          currency: String(currency).toUpperCase(),
          status: "pending",
          // Only set user_id when it looks like a UUID (Supabase auth user id)
          user_id: looksLikeUuid(userId) ? userId : null,
          reference: reference || (looksLikeUuid(userId) ? "" : String(userId || "")),
          kind: kind || null,
          plan_id: planId || null,
          application_id: applicationId || null,
          created_at: new Date().toISOString(),
        };
        const { error: insertErr } = await supabase.from("payments").insert(insert);
        if (insertErr) console.error("Supabase insert payments error:", insertErr);
        else console.log(`Inserted pending payment for checkout ${data.id}`);
      }
    } catch (err) {
      console.error("Error inserting pending payment row:", err);
    }

    return res.json({ url: data.redirectUrl, id: data.id });
  } catch (err) {
    console.error("Yoco create-checkout error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

// =============================================================================
// YOCO: Webhook
// =============================================================================
app.post("/yoco/webhook", express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}), async (req, res) => {
  const verification = verifyYocoCheckoutSignature(req);
  if (!verification.ok) {
    console.warn("Yoco webhook: signature verification failed:", verification.reason);
    return res.status(403).json({ error: "invalid webhook signature" });
  }

  // Yoco requires a fast 2xx ACK. Supabase writes continue asynchronously below.
  res.status(200).json({ received: true });

  // All processing below is fire-and-forget; never write to res again.
  (async () => {
    try {
      const event = req.body;
      console.log("Yoco webhook received:", event.type, event.id);

      const successfulPaymentEvents = new Set(["payment.succeeded", "checkout.completed", "payment.completed"]);
      if (!successfulPaymentEvents.has(event.type)) {
        console.log(`Yoco webhook: ignoring event type ${event.type}`);
        return;
      }

      const data = event.payload || event.data || {};
      const metadata = data.metadata || {};
      const userId = metadata.userId || metadata.user_id || null;
      const kind = metadata.kind || null;
      const planId = metadata.planId || metadata.plan_id || null;
      const applicationId = metadata.applicationId || metadata.application_id || null;

      // Attempt to locate the matching payments row. Support several possible keys
      const checkoutIdCandidates = [data.checkoutId, data.id, metadata.checkoutId, metadata.checkout_id, metadata.reference, data.reference].filter(Boolean);

      let paymentRow = null;
      try {
        if (supabase && checkoutIdCandidates.length > 0) {
          const { data: rows, error: selErr } = await supabase
            .from("payments")
            .select("id,checkout_id,status")
            .in("checkout_id", checkoutIdCandidates)
            .limit(1);
          if (selErr) console.error("Supabase payments select error:", selErr);
          else if (rows && rows.length) paymentRow = rows[0];
        }
      } catch (err) {
        console.error("Error querying payments row:", err);
      }

      // Idempotency: if the payment row already marked succeeded, skip updates
      if (paymentRow && paymentRow.status === "succeeded") {
        console.log("Payment already marked succeeded for checkout", paymentRow.checkout_id);
        return;
      }

      // Update the payments row if found, otherwise log and continue
      if (supabase && paymentRow) {
        try {
          const updatePayload = {
            status: "succeeded",
            amount: data.amount || data.amountInCents || undefined,
            currency: data.currency || undefined,
            updated_at: new Date().toISOString(),
            raw_event: JSON.stringify(event),
          };

          // Try to pick masked card info if present
          const card = data.card || data.payment_method || data.source || {};
          if (card && (card.last4 || card.maskedPan || card.masked_pan || card.pan)) {
            updatePayload.card_mask = card.last4 || card.maskedPan || card.masked_pan || card.pan;
          }

          const { error: updErr } = await supabase.from("payments").update(updatePayload).eq("id", paymentRow.id);
          if (updErr) console.error("Supabase payments update error:", updErr);
          else console.log(`Payments row ${paymentRow.id} updated to succeeded`);
        } catch (err) {
          console.error("Error updating payments row:", err);
        }
      } else {
        console.warn("Yoco webhook: no payments row found to update for candidates:", checkoutIdCandidates);
      }
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
  console.log(`  PayFast: ${process.env.VITE_PAYFAST_MERCHANT_ID ? "configured" : "NOT configured"}`);
  console.log(`  Yoco: ${YOCO_SECRET_KEY ? "configured" : "NOT configured"}`);
  console.log(`  Supabase: ${supabase ? "configured with service role" : "NOT configured"}`);
  console.log(`  Success URL: ${SUCCESS_URL}`);
  console.log(`  Cancel URL: ${CANCEL_URL}`);
});

