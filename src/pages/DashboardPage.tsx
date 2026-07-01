import { useEffect, useMemo, useState } from "react";
import Spinner from "@/components/ui/spinner";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  MapPin,
  MessageSquareText,
  Sparkles,
  Target,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getProfile,
  getApplications,
  getInstitutionApplications,
  type Profile,
  type Application,
  type InstitutionApplication,
} from "@/lib/supabase-helpers";
import { matchCareers, type Career } from "@/data/careers";
import { PRICING_PLANS, formatRand } from "@/data/plans";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700" },
  submitted: { label: "Submitted", color: "bg-amber-50 text-amber-700" },
  accepted: { label: "Accepted", color: "bg-[#E8F5F3] text-[#006B5E]" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700" },
  waitlisted: { label: "Under Review", color: "bg-purple-50 text-purple-700" },
};

const TYPE_LABELS: Record<string, string> = {
  university: "University",
  tvet: "TVET",
  nsfas: "NSFAS",
  bursary: "Bursary",
};

export function DashboardPage() {
  const { user, accessTier } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [institutionApps, setInstitutionApps] = useState<InstitutionApplication[]>([]);
  const [matchedCareers, setMatchedCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getProfile(user.id),
      getApplications(user.id),
      getInstitutionApplications(user.id),
    ]).then(([p, apps, instApps]) => {
      setProfile(p);
      setApplications(apps);
      setInstitutionApps(instApps);

      if (p) {
        const matches = matchCareers({
          apsScore: p.aps_score ?? 0,
          subjects: (p.subjects ?? []).map((s: { code: string }) => s.code),
          personalityType: p.personality_type ?? "",
          preferredFields: p.preferred_fields ?? [],
        });
        setMatchedCareers(matches.slice(0, 3));
      }

      setLoading(false);
    });
  }, [user]);

  const recentUpdates = useMemo(() => {
    const fromApps = applications.flatMap((a) =>
      (a.status_updates ?? []).map((u) => ({
        ...u,
        source: a.institution,
        type: a.type,
      }))
    );
    return fromApps
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 5);
  }, [applications]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const isRural = accessTier === "free" || profile?.access_tier === "free";
  const plan = profile?.selected_plan === "free"
    ? null
    : PRICING_PLANS.find((p) => p.id === profile?.selected_plan);

  const unpaidInstitutionFees = institutionApps.filter((a) => a.fee_payment_status === "unpaid");
  const paidInstitutionFees = institutionApps.filter((a) => a.fee_payment_status === "paid");
  const totalFeeAmount = institutionApps.reduce((sum, a) => sum + (a.application_fee || 0), 0);
  const paidAmount = paidInstitutionFees.reduce((sum, a) => sum + (a.application_fee || 0), 0);
  const unpaidAmount = unpaidInstitutionFees.reduce((sum, a) => sum + (a.application_fee || 0), 0);

  const allTrackedApps = [
    ...institutionApps.map((i) => ({
      id: i.id,
      name: i.institution_name,
      type: i.institution_type,
      status: "in_progress" as const,
      fee: i.application_fee,
      feeStatus: i.fee_payment_status,
    })),
    ...applications.map((a) => ({
      id: a.id,
      name: a.institution,
      type: a.type,
      status: a.status,
      fee: a.application_fee,
      feeStatus: a.fee_payment_status,
    })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Spinner size={40} />
          <p className="text-sm text-slate-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      {/* Recent status updates — top priority */}
      {recentUpdates.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquareText className="size-4 sm:size-5 text-blue-600" />
            <h2 className="font-extrabold text-blue-900 text-sm sm:text-base">Recent Status Updates</h2>
          </div>
          <div className="grid gap-2">
            {recentUpdates.map((update, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-white/70 px-3 sm:px-4 py-2.5 sm:py-3">
                <CheckCircle2 className="size-4 shrink-0 text-blue-600 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#0F172A]">{update.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {update.source} · {TYPE_LABELS[update.type] ?? update.type} · {new Date(update.at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Welcome + APS + Access */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
          <div>
            <div className="cp-section-label mb-2">Your Dashboard</div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">Welcome, {firstName}!</h1>
            <p className="mt-1 text-sm text-slate-500 break-all">{user?.email}</p>
            {profile?.profile_submission_status && (
              <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 capitalize">
                Profile: {profile.profile_submission_status.replace("_", " ")}
              </span>
            )}
          </div>

          <div className="rounded-xl border-2 border-[#006B5E] bg-[#E8F5F3] p-4 sm:p-5 text-center">
            <p className="text-xs font-bold uppercase text-[#006B5E] tracking-wider">APS Score</p>
            <p className="mt-1 text-4xl sm:text-5xl font-extrabold text-[#006B5E]">{profile?.aps_score ?? "—"}</p>
            <p className="text-xs text-slate-600 mt-1">{profile?.aps_score ? "out of 42 points" : "Complete onboarding"}</p>
          </div>

          <div className={`rounded-xl border-2 p-4 sm:p-5 ${isRural ? "border-[#006B5E]/30 bg-[#E8F5F3]" : "border-blue-200 bg-blue-50"}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Access & Plan</p>
            <p className={`mt-2 text-base sm:text-lg font-extrabold ${isRural ? "text-[#006B5E]" : "text-blue-700"}`}>
              {isRural ? "Free Rural Access" : "Paid Urban Plan"}
            </p>
            {plan && <p className="text-sm text-slate-600 mt-1">{plan.name} · {formatRand(plan.price)}</p>}
            {profile?.province_detected && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                <MapPin className="size-3" /> GPS: {profile.province_detected}
              </p>
            )}
          </div>
        </div>

        {!profile?.onboarding_complete && (
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800 flex-1">Complete onboarding to unlock full recommendations and submissions.</p>
            <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white shrink-0 h-10 w-full sm:w-auto">
              <Link href="/onboarding">Continue setup <ArrowRight className="ml-1 size-3" /></Link>
            </Button>
          </div>
        )}
      </div>

      {/* Institution fees */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="cp-section-label mb-1">Application Fees</div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Selected Universities & TVET Colleges</h2>
          </div>
          <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white h-10 w-full sm:w-auto">
            <Link href="/universities">Add more <ArrowRight className="ml-1 size-3" /></Link>
          </Button>
        </div>

        {institutionApps.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 sm:p-8 text-center">
            <GraduationCap className="mx-auto mb-2 size-8 text-slate-300" />
            <p className="font-semibold text-[#0F172A]">No institutions selected yet</p>
            <Button asChild className="mt-4 bg-[#006B5E] hover:bg-[#005548] text-white h-11">
              <Link href="/universities">Browse Institutions</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-lg border border-border bg-slate-50 p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Total</p>
                <p className="mt-1 text-base sm:text-xl font-extrabold truncate">R{totalFeeAmount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-[#006B5E]/20 bg-[#E8F5F3] p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs font-bold text-[#006B5E] uppercase">Paid</p>
                <p className="mt-1 text-base sm:text-xl font-extrabold text-[#006B5E] truncate">R{paidAmount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs font-bold text-red-700 uppercase">Unpaid</p>
                <p className="mt-1 text-base sm:text-xl font-extrabold text-red-700 truncate">R{unpaidAmount.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid gap-2">
              {institutionApps.map((app) => (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border bg-slate-50 p-3 sm:p-4 gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-[#0F172A] truncate">{app.institution_name}</p>
                    <p className="text-xs text-slate-500">
                      {app.institution_type === "university" ? "University" : "TVET College"}
                      {app.programme ? ` · ${truncateText(app.programme, 30)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">
                      {app.application_fee === 0 ? "Free" : `R${app.application_fee.toLocaleString()}`}
                    </p>
                    <p className={cn(
                      "text-xs font-semibold",
                      app.fee_payment_status === "paid" ? "text-[#006B5E]" : app.fee_payment_status === "not_required" ? "text-slate-500" : "text-red-600"
                    )}>
                      {app.fee_payment_status === "paid" ? "✓ Paid" : app.fee_payment_status === "not_required" ? "Free" : "⚠ Unpaid"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {unpaidInstitutionFees.length > 0 && (
              <Button asChild className="mt-4 w-full h-11 bg-amber-600 hover:bg-amber-700 text-white text-sm">
                <Link href="/applications">
                  <CreditCard className="size-4 mr-2" />
                  Pay {unpaidInstitutionFees.length} Unpaid Fee{unpaidInstitutionFees.length === 1 ? "" : "s"} (R{unpaidAmount.toLocaleString()})
                </Link>
              </Button>
            )}
          </>
        )}
      </div>

      {/* All application statuses */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4">
          <div className="cp-section-label mb-1">Application Tracker</div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Current Status of All Applications</h2>
          <p className="text-sm text-slate-500">Track your university, NSFAS, and bursary applications</p>
        </div>

        {allTrackedApps.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 sm:p-8 text-center">
            <BookOpen className="mx-auto mb-2 size-8 text-slate-300" />
            <p className="font-semibold text-[#0F172A]">No applications tracked yet</p>
            <p className="text-sm text-slate-500 mt-1">Submit your profile or select institutions to start.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {allTrackedApps.map((app) => {
              const statusInfo = STATUS_LABELS[app.status] ?? STATUS_LABELS.todo;
              return (
                <div key={app.id} className="flex items-center justify-between rounded-lg border border-border px-3 sm:px-4 py-2.5 sm:py-3 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">{app.name}</p>
                    <p className="text-xs text-slate-500">{TYPE_LABELS[app.type] ?? app.type}</p>
                  </div>
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <Button asChild variant="outline" className="mt-4 w-full h-11 text-sm">
          <Link href="/applications">View full submissions tracker <ArrowRight className="ml-2 size-4" /></Link>
        </Button>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-base sm:text-lg text-[#0F172A]">Quick Actions</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
          { href: "/careers", icon: Target, label: "Career Match", desc: "AI career recommendations" },
          { href: "/universities", icon: GraduationCap, label: "Universities", desc: "Browse & select institutions" },
          { href: "/funding", icon: CreditCard, label: "Funding", desc: "NSFAS & bursaries" },
          { href: "/applications", icon: BookOpen, label: "Submissions", desc: "Track all applications" },
          { href: "/profile", icon: Sparkles, label: "Profile", desc: "Edit your details" },
          ...(!isRural ? [{ href: "/plans", icon: CreditCard, label: "Plans", desc: "Manage your paid plan" }] : []),
          ].map((action) => (
            <Link key={action.href} href={action.href} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3 sm:p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E8F5F3] text-[#006B5E]">
                <action.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A]">{action.label}</p>
                <p className="text-xs text-slate-500 truncate">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Career matches */}
      {profile?.onboarding_complete && matchedCareers.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold text-base sm:text-lg text-[#0F172A]">Recommended Careers</h2>
            <Button asChild variant="ghost" size="sm" className="text-[#006B5E]">
              <Link href="/careers">View all</Link>
            </Button>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {matchedCareers.map((career) => (
              <Link key={career.id} href="/careers" className="rounded-xl border border-border p-3 sm:p-4 hover:border-[#006B5E]/50 transition-colors block">
                <p className="text-sm font-bold text-[#0F172A]">{career.title}</p>
                <p className="text-xs text-slate-500 mt-1">{career.field}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimers */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-6">
        <div className="flex gap-3">
          <AlertCircle className="size-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="min-w-0">
            <p className="font-bold text-blue-900 text-sm sm:text-base">Important Information</p>
            <ul className="mt-2 space-y-1.5 text-sm text-blue-800 list-disc list-inside">
              <li>CareerPath SA provides application support. Outcomes remain subject to each institution.</li>
              <li>Your data is encrypted and protected under POPIA compliance.</li>
              <li>
                {isRural
                  ? "You have FREE rural access with unlimited supported applications."
                  : "You have a paid plan. Institution fees are tracked separately."}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function truncateText(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}