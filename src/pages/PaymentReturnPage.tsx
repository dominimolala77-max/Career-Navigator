import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProfile, upsertProfile, getInstitutionApplications } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
import Spinner from "@/components/ui/spinner";

export default function PaymentReturnPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [paymentKind, setPaymentKind] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(searchString);
    const kind = params.get("kind") || "plan";
    const sessionId = params.get("session_id") || "";
    setPaymentKind(kind);
    const currentUser = user;

    async function check() {
      setLoading(true);

      if (kind === "plan") {
        const profile = await getProfile(currentUser.id);
        if (!profile) {
          setStatus("no_profile");
          setLoading(false);
          return;
        }
        if (profile.plan_payment_status === "paid") {
          if (profile.profile_submission_status !== "submitted") {
            const now = new Date().toISOString();
            const ok = await upsertProfile({
              id: currentUser.id,
              profile_submission_status: "submitted",
              profile_submitted_at: now,
              onboarding_complete: true,
              onboarding_step: 6,
            } as any);
            if (ok) {
              toast({ title: "Payment confirmed", description: "Profile submitted for processing." });
              navigate("/dashboard");
              return;
            }
            setStatus("finalize_failed");
          } else {
            navigate("/dashboard");
            return;
          }
        } else {
          setStatus("not_paid");
        }
      } else if (kind === "application_fee") {
        const apps = await getInstitutionApplications(currentUser.id);
        const paidApps = apps.filter(a => a.fee_payment_status === "paid");
        if (paidApps.length > 0) {
          toast({ title: "Fee payment confirmed", description: `${paidApps.length} institution fee(s) marked paid.` });
          navigate("/applications");
          return;
        }
        setStatus("fee_not_yet_updated");
      } else {
        setStatus("unknown_kind");
      }
      setLoading(false);
    }
    check();
  }, [user, searchString, navigate, toast]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <Spinner size={40} />
        <p className="text-sm text-slate-500">Verifying payment...</p>
      </div>
    </div>
  );

  return (
    <div className="py-24 text-center">
      {status === "no_profile" && (
        <div className="mx-auto max-w-sm">
          <XCircle className="mx-auto mb-4 size-12 text-red-500" />
          <p className="text-lg font-bold text-[#0F172A]">No profile found</p>
          <p className="text-sm text-slate-500 mt-2">Please sign in and complete your onboarding first.</p>
          <div className="mt-6">
            <Button onClick={() => navigate("/onboarding")}>Go to Onboarding</Button>
          </div>
        </div>
      )}

      {status === "not_paid" && (
        <div className="mx-auto max-w-sm">
          <CreditCard className="mx-auto mb-4 size-12 text-amber-500" />
          <p className="text-lg font-bold text-[#0F172A]">Payment pending</p>
          <p className="text-sm text-slate-500 mt-2">
            Your plan payment hasn't been confirmed yet. If you completed the payment, wait a moment then refresh.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Refresh</Button>
            <Button variant="outline" onClick={() => navigate("/onboarding")}>Back to onboarding</Button>
          </div>
        </div>
      )}

      {status === "finalize_failed" && (
        <div className="mx-auto max-w-sm">
          <XCircle className="mx-auto mb-4 size-12 text-red-500" />
          <p className="text-lg font-bold text-[#0F172A]">Submission failed</p>
          <p className="text-sm text-slate-500 mt-2">Payment confirmed but profile submission failed. Contact support.</p>
          <div className="mt-6"><Button onClick={() => navigate("/onboarding")}>Back to onboarding</Button></div>
        </div>
      )}

      {status === "fee_not_yet_updated" && (
        <div className="mx-auto max-w-sm">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-[#006B5E]" />
          <p className="text-lg font-bold text-[#0F172A]">Payment submitted</p>
          <p className="text-sm text-slate-500 mt-2">
            Your institution fee payment was submitted. It may take a moment for the system to confirm.
            Check your applications page to see the updated status.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button onClick={() => navigate("/applications")}>View Applications</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        </div>
      )}

      {status === "unknown_kind" && (
        <div className="mx-auto max-w-sm">
          <p className="text-lg font-bold text-[#0F172A]">Payment received</p>
          <p className="text-sm text-slate-500 mt-2">Your payment was processed. Return to your dashboard.</p>
          <div className="mt-6"><Button onClick={() => navigate("/dashboard")}>Dashboard</Button></div>
        </div>
      )}
    </div>
  );
}