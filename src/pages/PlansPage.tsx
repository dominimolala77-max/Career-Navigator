import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS, formatRand } from "@/data/plans";
import { isPaymentConfigured, startPayfastCheckout, isYocoConfigured, startYocoCheckout } from "@/lib/payments";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";

export function PlansPage() {
  const { user, accessTier } = useAuth();
  const { toast } = useToast();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  async function handlePurchase(plan: (typeof PRICING_PLANS)[number]) {
    const reference = `plan_${plan.id}_${Date.now()}`;
    if (!user) {
      toast({ title: "Please sign in", description: "You must be signed in to purchase a plan." });
      return;
    }

    const commonRequest = {
      kind: "plan" as const,
      itemName: plan.name,
      amount: plan.price,
      userId: user.id,
      email: (user as any).email || undefined,
      name: (user as any).full_name || (user as any).email || "CareerPath User",
      reference,
      planId: plan.id,
    };

    // BUG FIX #4: Yoco is the primary SA payment gateway — try it first.
    // Previously Stripe was always attempted first, meaning Yoco was only
    // reached as a fallback after a Stripe network failure, causing a slow UX
    // and misleading error toasts on every payment attempt.
    if (isYocoConfigured()) {
      try {
        setProcessingPlanId(plan.id);
        await startYocoCheckout(commonRequest);
        setProcessingPlanId(null);
        return;
      } catch (e) {
        setProcessingPlanId(null);
        console.warn("Yoco checkout failed, trying Stripe:", e);
      }
    }

    // Fallback to Stripe
    const paymentsServer = import.meta.env.VITE_PAYMENTS_SERVER_URL;
    if (paymentsServer) {
      try {
        const payments = await import("@/lib/payments");
        await payments.startStripeCheckout(commonRequest);
        return;
      } catch (e) {
        console.warn("Stripe checkout also failed:", e);
        toast({ title: "Payment failed to start", description: String(e), variant: "destructive" });
        return;
      }
    }

    // Last resort: PayFast (redirect-based, no server required)
    if (isPaymentConfigured()) {
      try {
        startPayfastCheckout(commonRequest);
      } catch (e) {
        toast({ title: "Payment failed to start", description: String(e), variant: "destructive" });
      }
      return;
    }

    // Dev fallback: simulate purchase locally
    localStorage.setItem(`purchased_plan:${user.id}`, plan.id);
    toast({ title: "Purchase simulated", description: "Payment gateway not configured — plan saved locally." });
    window.location.href = "/onboarding";
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="cp-section-label mb-2">Plans comparison</div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">Choose your CareerPath SA plan</h1>
        <p className="mt-1 text-sm text-slate-500">
          {accessTier === "free"
            ? "You qualify for free rural access. Plans below are for urban users only."
            : "Urban users must select a paid plan before final submission. NSFAS counts as 1 application on Basic and Standard."}
        </p>
      </div>

      {accessTier === "free" && (
        <div className="rounded-2xl border border-[#006B5E]/30 bg-[#E8F5F3] p-4 sm:p-5 flex gap-3">
          <MapPin className="size-5 shrink-0 text-[#006B5E] mt-0.5" />
          <div className="min-w-0">
            <p className="font-bold text-[#006B5E]">Free Rural Access Active</p>
            <p className="text-sm text-[#006B5E]/80 mt-1">
              Your GPS location qualifies you for unlimited free supported applications. No plan purchase needed.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <div key={plan.id} className="cp-card-hover flex flex-col p-4 sm:p-5 cp-clickable">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">{plan.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
              </div>
              {plan.id === "priority_unlimited" && <span className="cp-badge-blue shrink-0">Priority</span>}
            </div>
            <p className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#006B5E]">{formatRand(plan.price)}</p>
            <p className="text-xs font-semibold uppercase text-slate-400">one-time payment</p>
            <div className="mt-5 grid gap-3 text-sm">
              {[
                `Applications: ${plan.applicationLimit === "unlimited" ? "Unlimited" : plan.applicationLimit}`,
                plan.processing,
                plan.support,
                plan.access,
              ].map((item) => (
                <p key={item} className="flex gap-2 text-slate-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#006B5E]" />
                  {item}
                </p>
              ))}
            </div>
            <Button disabled={processingPlanId === plan.id} onClick={() => handlePurchase(plan)} className="mt-6 bg-[#006B5E] text-white hover:bg-[#005548] w-full text-sm">
              {processingPlanId === plan.id ? "Processing..." : "Select plan"}
            </Button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <p className="flex items-center gap-2 font-bold text-blue-900 text-sm"><CreditCard className="size-4" /> Application fee payments</p>
          <p className="mt-2 text-sm text-blue-800">Institution fees are tracked separately from your CareerPath SA plan. You can mark each university fee as Paid or Unpaid from the applications tracker.</p>
        </div>
        <div className="rounded-2xl border border-[#006B5E]/20 bg-[#E8F5F3] p-4 sm:p-5">
          <p className="flex items-center gap-2 font-bold text-[#0F172A] text-sm"><ShieldCheck className="size-4 text-[#006B5E]" /> POPIA and security</p>
          <p className="mt-2 text-sm text-slate-700">Personal data should be processed only for managed applications, support, status updates, legal compliance, and user-authorised service delivery.</p>
        </div>
      </div>
    </div>
  );
}
