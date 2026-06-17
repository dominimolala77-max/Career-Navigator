export type PaymentKind = "plan" | "application_fee";

export interface PaymentRequest {
  kind: PaymentKind;
  itemName: string;
  amount: number;
  userId: string;
  email?: string;
  name?: string;
  reference: string;
  planId?: string;
  applicationId?: string;
}

const PAYFAST_URLS = {
  sandbox: "https://sandbox.payfast.co.za/eng/process",
  production: "https://www.payfast.co.za/eng/process",
};

function appOrigin() {
  return window.location.origin;
}

function payfastMode() {
  return import.meta.env.VITE_PAYFAST_MODE === "production" ? "production" : "sandbox";
}

export function isPaymentConfigured() {
  return Boolean(import.meta.env.VITE_PAYFAST_MERCHANT_ID && import.meta.env.VITE_PAYFAST_MERCHANT_KEY);
}

export function getPaymentSetupMessage() {
  return "Payment gateway is not configured. Add VITE_PAYFAST_MERCHANT_ID and VITE_PAYFAST_MERCHANT_KEY to enable live checkout.";
}

export function startPayfastCheckout(request: PaymentRequest) {
  if (!isPaymentConfigured()) {
    throw new Error(getPaymentSetupMessage());
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = PAYFAST_URLS[payfastMode()];

  const fields: Record<string, string> = {
    merchant_id: import.meta.env.VITE_PAYFAST_MERCHANT_ID,
    merchant_key: import.meta.env.VITE_PAYFAST_MERCHANT_KEY,
    return_url: `${appOrigin()}/payment/return?kind=${request.kind}&ref=${encodeURIComponent(request.reference)}`,
    cancel_url: `${appOrigin()}/payment/cancel?kind=${request.kind}&ref=${encodeURIComponent(request.reference)}`,
    notify_url: import.meta.env.VITE_PAYFAST_NOTIFY_URL || `${appOrigin()}/api/payfast/notify`,
    name_first: request.name?.split(" ")[0] || "CareerPath",
    name_last: request.name?.split(" ").slice(1).join(" ") || "SA",
    email_address: request.email || "",
    m_payment_id: request.reference,
    amount: request.amount.toFixed(2),
    item_name: request.itemName.slice(0, 100),
    custom_str1: request.userId,
    custom_str2: request.kind,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

// Stripe checkout integration (requires a small server to create sessions)
export function isStripeConfigured() {
  return Boolean(import.meta.env.VITE_PAYMENTS_SERVER_URL);
}

export async function startStripeCheckout(request: PaymentRequest) {
  const server = import.meta.env.VITE_PAYMENTS_SERVER_URL || "";
  if (!server) throw new Error("Payments server URL not configured (VITE_PAYMENTS_SERVER_URL)");

  const resp = await fetch(`${server.replace(/\/$/, "")}/stripe/create-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: request.kind,
      itemName: request.itemName,
      amount: request.amount,
      userId: request.userId,
      email: request.email,
      reference: request.reference,
      planId: request.planId,
      applicationId: request.applicationId,
      currency: request.amount ? "zar" : undefined,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Failed to create Stripe session");
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error("No checkout url returned from payments server");
  }
}
