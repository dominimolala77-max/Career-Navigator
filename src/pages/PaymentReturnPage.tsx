import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProfile, upsertProfile } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function PaymentReturnPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (!user) return;
      setLoading(true);
      const profile = await getProfile(user.id);
      if (!profile) {
        setStatus("no_profile");
        setLoading(false);
        return;
      }
      if (profile.plan_payment_status === "paid") {
        // finalize submission if not already submitted
        if (profile.profile_submission_status !== "submitted") {
          const now = new Date().toISOString();
          const ok = await upsertProfile({
            id: user.id,
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
          // already submitted
          navigate("/dashboard");
          return;
        }
      } else {
        setStatus("not_paid");
      }
      setLoading(false);
    }
    check();
  }, [user]);

  if (loading) return <div className="py-24 text-center">Checking payment status...</div>;

  return (
    <div className="py-24 text-center">
      {status === "no_profile" && <p className="text-red-600">No profile found. Please sign in and try again.</p>}
      {status === "not_paid" && (
        <div>
          <p className="font-semibold text-[#0F172A]">Payment not completed yet</p>
          <p className="text-sm text-slate-500 mt-2">If you completed the payment, wait a few seconds for the webhook to update your profile, then click Refresh.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Refresh</Button>
            <Button variant="outline" onClick={() => navigate("/onboarding")}>Back to onboarding</Button>
          </div>
        </div>
      )}
      {status === "finalize_failed" && (
        <div>
          <p className="text-red-600 font-semibold">Could not finalize submission automatically.</p>
          <p className="text-sm text-slate-500 mt-2">Contact support or try again later.</p>
          <div className="mt-4"><Button onClick={() => navigate("/onboarding")}>Back to onboarding</Button></div>
        </div>
      )}
    </div>
  );
}
