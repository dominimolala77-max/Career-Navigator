import express from "express";
import Stripe from "stripe";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || "http://localhost:5174/payment/success";
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || "http://localhost:5174/payment/cancel";
const PORT = process.env.PORT || 4242;

if (!STRIPE_SECRET) {
  console.warn("Warning: STRIPE_SECRET_KEY not set. The payments server will not function until configured.");
}

const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2024-08-01" }) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || null;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null;

if (!supabase) {
  console.warn("Supabase service role key or URL not provided. Webhook will not update profiles.");
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (_req, res) => res.json({ ok: true, message: "Stripe payments server running" }));

app.post("/stripe/create-session", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured on server" });
  try {
    const { itemName, amount, currency = "zar", userId, email, reference, kind, planId } = req.body;
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
      success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: CANCEL_URL,
      metadata: { userId: userId || "", reference: reference || "", kind: kind || "", planId: planId || "" },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("create-session error", err);
    return res.status(500).json({ error: String(err) });
  }
});

// Basic webhook endpoint template (optional): verify events using STRIPE_WEBHOOK_SECRET
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

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("Checkout session completed", session.id, session.metadata);
      const metadata = session.metadata || {};
      const userId = metadata.userId || metadata.user_id || null;
      const planId = metadata.planId || metadata.plan_id || null;
      try {
        if (supabase && userId && planId) {
          const { error } = await supabase
            .from("profiles")
            .update({ selected_plan: planId, plan_payment_status: "paid", plan_paid_at: new Date().toISOString() })
            .eq("id", userId);
          if (error) console.error("Supabase update error:", error);
          else console.log(`Profile ${userId} updated: plan ${planId} marked paid.`);
        } else {
          console.warn("Supabase not configured or metadata missing: cannot persist plan purchase.");
        }
      } catch (err) {
        console.error("Error updating Supabase profile:", err);
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Stripe payments server listening on port ${PORT}`);
});
