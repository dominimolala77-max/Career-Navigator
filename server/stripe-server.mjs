import express from "express";
import Stripe from "stripe";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import querystring from "querystring";

dotenv.config();

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || "http://localhost:5173/payment/success";
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || "http://localhost:5173/payment/cancel";
const PORT = process.env.PORT || 4242;

if (!STRIPE_SECRET) {
  console.warn("Warning: STRIPE_SECRET_KEY not set. The payments server will not function until configured.");
}

const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2024-08-01" }) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || null;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null;

if (!supabase) {
  console.warn("Supabase service role key or URL not provided. Webhook will not update profiles/applications.");
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (_req, res) => res.json({ ok: true, message: "Payments server running (Stripe + PayFast)" }));

// =============================================================================
// STRIPE: Create Checkout Session
// =============================================================================
app.post("/stripe/create-session", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured on server" });
  try {
    const { itemName, amount, currency = "zar", userId, email, reference, kind, planId, applicationId } = req.body;
    if (!itemName || !amount) return res.status(400).json({ error: "Missing itemName or amount" });

    const unitAmount = Math.round(Number(amount) * 100); // smallest currency unit

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
// STRIPE: Webhook (handles checkout.session.completed and others)
// =============================================================================
app.post("/stripe/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
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
          // Update the institution_application fee status
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
          // Fallback: mark all unpaid fees for this user as paid (legacy support)
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
// PAYFAST: Serve the cancel page (redirect-based)
// =============================================================================
app.get("/payfast/notify", (req, res) => {
  // Health check / info endpoint
  res.json({ ok: true, message: "PayFast ITN endpoint. POST with payment notification data." });
});

// =============================================================================
// PAYFAST: ITN (Instant Transaction Notification) handler
// PayFast sends a POST to this URL with payment data.
// This server must verify the payment against PayFast's server
// and then update Supabase accordingly.
// =============================================================================
app.post("/payfast/notify", bodyParser.urlencoded({ extended: true }), async (req, res) => {
  // PayFast expects a 200 OK with "OK" in the body to confirm receipt
  try {
    const paymentData = req.body;
    console.log("PayFast ITN received:", paymentData.m_payment_id, paymentData.pf_payment_id, paymentData.payment_status);

    // Verify the payment with PayFast (server-to-server validation)
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

    // Extract metadata from custom fields
    const userId = paymentData.custom_str1 || null;
    const kind = paymentData.custom_str2 || "plan"; // "plan" or "application_fee"
    const mPaymentId = paymentData.m_payment_id || "";
    const reference = mPaymentId;

    // Parse reference for applicationId if it's a fee payment
    // References are formatted as: fee_{applicationId}_{userId}_{timestamp}
    let applicationId = null;
    if (kind === "application_fee" && reference.startsWith("fee_")) {
      const parts = reference.split("_");
      // fee_{appId}_{userId}_{timestamp}
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

/**
 * Verify a PayFast ITN callback by echoing data back to PayFast's server.
 * https://developers.payfast.co.za/documentation/#itn
 */
async function verifyPayFastITN(paymentData) {
  const pfMode = process.env.VITE_PAYFAST_MODE === "production" ? "production" : "sandbox";
  const pfHost = pfMode === "production"
    ? "www.payfast.co.za"
    : "sandbox.payfast.co.za";

  // Build the verification string (same as received, sorted by key)
  const sortedKeys = Object.keys(paymentData).sort();
  const verifyData = {};
  for (const key of sortedKeys) {
    verifyData[key] = paymentData[key];
  }

  // Add the passphrase if configured
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
// Start Server
// =============================================================================
app.listen(PORT, () => {
  console.log(`Payments server listening on port ${PORT}`);
  console.log(`  Stripe: ${stripe ? "configured" : "NOT configured"}`);
  console.log(`  PayFast mode: ${process.env.VITE_PAYFAST_MODE || "sandbox (default)"}`);
  console.log(`  Supabase: ${supabase ? "configured with service role" : "NOT configured"}`);
  console.log(`  Success URL: ${SUCCESS_URL}`);
  console.log(`  Cancel URL: ${CANCEL_URL}`);
});