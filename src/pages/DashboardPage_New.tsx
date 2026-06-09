import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  MapPin,
  MessageSquareText,
  Sparkles,
  Target,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getProfile,
  getApplications,
  getInstitutionApplications,
  type Profile,
  type Application,
  type InstitutionApplication,
} from "@/lib/supabase-helpers";
import { matchCareers, CAREERS, type Career } from "@/data/careers";
import { PRICING_PLANS } from "@/data/plans";
import { isRuralProvince } from "@/lib/location";

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

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const plan = PRICING_PLANS.find((p) => p.id === profile?.selected_plan);
  const unpaidInstitutionFees = institutionApps.filter((a) => a.fee_payment_status === "unpaid");
  const paidInstitutionFees = institutionApps.filter((a) => a.fee_payment_status === "paid");

  const statusCounts = {
    universities: institutionApps.filter((a) => a.institution_type === "university").length,
    tvet: institutionApps.filter((a) => a.institution_type === "tvet").length,
    nsfas: applications.filter((a) => a.type === "nsfas").length,
    bursaries: applications.filter((a) => a.type === "bursary").length,
    learnerships: applications.filter((a) => a.type === "learnership").length,
  };

  const totalFeeAmount = institutionApps.reduce((sum, a) => sum + (a.application_fee || 0), 0);
  const paidAmount = paidInstitutionFees.reduce((sum, a) => sum + (a.application_fee || 0), 0);
  const unpaidAmount = unpaidInstitutionFees.reduce((sum, a) => sum + (a.application_fee || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-[#006B5E] border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const isRural = isRuralProvince(profile?.province_detected);
  const accessTypeLabel = isRural ? "Free Rural Access" : "Paid Urban Plan";
  const accessTypeColor = isRural ? "text-[#006B5E]" : "text-blue-600";
  const accessTypeBg = isRural ? "bg-[#E8F5F3]" : "bg-blue-50";

  return (
    <div className="grid gap-6">
      {/* 1. Welcome Header with APS & Access Info */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Welcome */}
          <div>
            <div className="cp-section-label mb-2">Dashboard</div>
            <h1 className="text-2xl font-extrabold text-[#0F172A]">Welcome, {firstName}! 👋</h1>
            <p className="mt-2 text-sm text-slate-500">{user?.email}</p>
          </div>

          {/* APS Score - Prominent */}
          {profile?.aps_score ? (
            <div className="rounded-xl border-2 border-[#006B5E] bg-[#E8F5F3] p-4 md:col-span-1 lg:col-span-1">
              <p className="text-xs font-bold uppercase text-[#006B5E] tracking-wider">Your APS Score</p>
              <p className="mt-2 text-4xl font-extrabold text-[#006B5E]">{profile.aps_score}</p>
              <p className="text-xs text-slate-600 mt-1">out of 42 points</p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-700 tracking-wider">APS Score</p>
              <p className="text-3xl font-extrabold text-amber-700 mt-2">—</p>
              <p className="text-xs text-amber-600 mt-1">Complete onboarding to calculate</p>
            </div>
          )}

          {/* Access Tier & Plan Info */}
          <div className={`rounded-xl border-2 p-4 ${accessTypeBg}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Access & Plan</p>
            <div className="mt-2 space-y-1">
              <p className={`text-sm font-extrabold ${accessTypeColor}`}>{accessTypeLabel}</p>
              {plan && (
                <p className="text-xs text-slate-600">
                  Plan: <span className="font-semibold">{plan.name}</span>
                </p>
              )}
              {profile?.province_detected && (
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <MapPin className="size-3" /> {profile.province_detected}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Completion Notice */}
        {!profile?.onboarding_complete && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800 flex-1">
              Your profile setup is incomplete. Complete your onboarding for recommendations.
            </p>
            <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white shrink-0">
              <Link href="/onboarding">Complete <ArrowRight className="ml-1 size-3" /></Link>
            </Button>
          </div>
        )}
      </div>

      {/* 2. University & TVET Selections with Fee Status */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="cp-section-label mb-1">Selected Institutions</div>
            <h2 className="text-lg font-extrabold text-[#0F172A]">
              Universities & TVET Colleges
            </h2>
          </div>
          <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white">
            <Link href="/universities">Browse <ArrowRight className="ml-1 size-3" /></Link>
          </Button>
        </div>

        {institutionApps.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-8 text-center">
            <GraduationCap className="mx-auto mb-2 size-8 text-slate-300" />
            <p className="font-semibold text-[#0F172A]">No institutions selected yet</p>
            <p className="text-sm text-slate-500 mt-1">Browse and select universities or TVET colleges to get started.</p>
            <Button asChild className="mt-4 bg-[#006B5E] hover:bg-[#005548] text-white">
              <Link href="/universities">Select Institutions</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Fee Summary */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500 uppercase">Total Fees</p>
                <p className="mt-1 text-xl font-extrabold text-[#0F172A]">R{totalFeeAmount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-[#006B5E]/20 bg-[#E8F5F3] p-3">
                <p className="text-xs font-bold text-[#006B5E] uppercase">Paid</p>
                <p className="mt-1 text-xl font-extrabold text-[#006B5E]">R{paidAmount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-bold text-red-700 uppercase">Unpaid</p>
                <p className="mt-1 text-xl font-extrabold text-red-700">R{unpaidAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Institution List */}
            <div className="grid gap-2">
              {institutionApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-[#0F172A]">{app.institution_name}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {app.institution_type === "university" ? "🎓 University" : "🏫 TVET College"}{" "}
                      {app.programme ? `• ${app.programme}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0F172A]">R{app.application_fee.toLocaleString()}</p>
                      <p
                        className={`text-xs font-semibold ${
                          app.fee_payment_status === "paid"
                            ? "text-[#006B5E]"
                            : app.fee_payment_status === "not_required"
                              ? "text-slate-500"
                              : "text-red-600"
                        }`}
                      >
                        {app.fee_payment_status === "paid"
                          ? "✓ Paid"
                          : app.fee_payment_status === "not_required"
                            ? "Free"
                            : "⚠ Unpaid"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pay Fees Button */}
            {unpaidInstitutionFees.length > 0 && (
              <div className="mt-4">
                <Button
                  asChild
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
                >
                  <Link href="/applications">
                    <CreditCard className="size-4" />
                    Pay {unpaidInstitutionFees.length} Unpaid Fee{unpaidInstitutionFees.length === 1 ? "" : "s"}{" "}
                    (R{unpaidAmount.toLocaleString()})
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Application Status Overview */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <div className="cp-section-label mb-1">Live Status Tracking</div>
          <h2 className="text-lg font-extrabold text-[#0F172A]">All Applications</h2>
          <p className="text-sm text-slate-500">
            Current status of university, NSFAS, bursary, and learnership applications
          </p>
        </div>

        {institutionApps.length === 0 && applications.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-8 text-center">
            <BookOpen className="mx-auto mb-2 size-8 text-slate-300" />
            <p className="font-semibold text-[#0F172A]">No applications yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Select institutions and submit your profile to start applications.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Universities", count: statusCounts.universities, icon: "🎓", color: "text-blue-600" },
              {
                label: "TVET Colleges",
                count: statusCounts.tvet,
                icon: "🏫",
                color: "text-purple-600",
              },
              { label: "NSFAS", count: statusCounts.nsfas, icon: "💰", color: "text-amber-600" },
              { label: "Bursaries", count: statusCounts.bursaries, icon: "📚", color: "text-green-600" },
              {
                label: "Learnerships",
                count: statusCounts.learnerships,
                icon: "⚙️",
                color: "text-slate-600",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-slate-50 p-4 text-center">
                <p className="text-2xl mb-1">{item.icon}</p>
                <p className="text-2xl font-extrabold text-[#0F172A]">{item.count}</p>
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Quick Actions */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-[#0F172A]">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/careers", icon: "🎯", label: "Career Match", desc: "Find your ideal careers" },
            { href: "/universities", icon: "🎓", label: "Universities", desc: "Browse institutions" },
            { href: "/funding", icon: "💳", label: "Funding", desc: "NSFAS & bursaries" },
            { href: "/opportunities", icon: "💼", label: "Opportunities", desc: "Learnerships & internships" },
            { href: "/applications", icon: "📋", label: "Submissions", desc: "Track applications" },
            { href: "/profile", icon: "👤", label: "Profile", desc: "Edit your details" },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <a className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="text-2xl">{action.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                </div>
              </a>
            </Link>
          ))}
        </div>
      </div>

      {/* 5. Recommended Careers */}
      {profile?.onboarding_complete && matchedCareers.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="cp-section-label mb-1">AI-Powered Matches</div>
              <h2 className="text-lg font-extrabold text-[#0F172A]">Careers for You</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-[#006B5E]">
              <Link href="/careers">View all</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {matchedCareers.map((career) => (
              <Link key={career.id} href="/careers">
                <a className="cp-card flex flex-col p-4 hover:border-[#006B5E]/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold text-[#0F172A] line-clamp-1">{career.title}</p>
                    <Sparkles className="size-3 text-[#006B5E] shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">
                    {career.field}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] bg-[#E8F5F3] text-[#006B5E] px-2 py-0.5 rounded-full font-bold">
                      MATCH
                    </span>
                    <ArrowRight className="size-3 text-slate-400" />
                  </div>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 6. Important Notices & Disclaimers */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex gap-3">
          <AlertCircle className="size-5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <p className="font-bold text-blue-900">Important Information</p>
            <ul className="mt-2 space-y-2 text-sm text-blue-800 list-disc list-inside">
              <li>
                CareerPath SA provides application support and recommendations. Outcomes remain subject to each
                institution.
              </li>
              <li>Keep your login credentials secure. Your data is encrypted under POPIA compliance.</li>
              <li>
                {isRural
                  ? "You have FREE access as a rural user. Enjoy unlimited supported applications!"
                  : "You have a PAID plan. Thank you for supporting our service!"}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
