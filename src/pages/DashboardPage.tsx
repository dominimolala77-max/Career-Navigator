import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Briefcase, CalendarDays, GraduationCap, Search, Sparkles, Target, Wallet } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProfile, getApplications, type Profile, type Application } from "@/lib/supabase-helpers";
import { matchCareers, CAREERS, type Career } from "@/data/careers";

const QUICK_ACTIONS = [
  { href: "/careers", icon: Search, label: "Career Match", desc: "Find careers that suit you", color: "bg-[#E8F5F3] text-[#006B5E]" },
  { href: "/universities", icon: GraduationCap, label: "Universities", desc: "Browse SA universities", color: "bg-blue-50 text-blue-700" },
  { href: "/funding", icon: Wallet, label: "NSFAS & Bursaries", desc: "Apply for funding", color: "bg-amber-50 text-amber-700" },
  { href: "/opportunities", icon: Briefcase, label: "Opportunities", desc: "Learnerships & internships", color: "bg-purple-50 text-purple-700" },
  { href: "/applications", icon: BookOpen, label: "My Applications", desc: "Track your applications", color: "bg-rose-50 text-rose-700" },
];

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-50 text-blue-700",
  submitted: "bg-amber-50 text-amber-700",
  accepted: "bg-[#E8F5F3] text-[#006B5E]",
  rejected: "bg-red-50 text-red-700",
  waitlisted: "bg-purple-50 text-purple-700",
};

export function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [matchedCareers, setMatchedCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getProfile(user.id), getApplications(user.id)]).then(([p, apps]) => {
      setProfile(p);
      setApplications(apps);
      
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
  const upcoming = applications.filter(a => a.deadline && new Date(a.deadline) >= new Date()).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()).slice(0, 3);
  const recentApps = applications.slice(0, 4);

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

  return (
    <div className="grid gap-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="cp-section-label mb-2">Dashboard</div>
            <h1 className="text-2xl font-extrabold text-[#0F172A]">Welcome back, {firstName}! 👋</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {profile?.aps_score ? <span className="cp-badge-amber">APS: {profile.aps_score}</span> : null}
              {profile?.education_level && <span className="cp-badge-blue capitalize">{profile.education_level.replace("_", " ")}</span>}
            </div>
          </div>
          {!profile?.onboarding_complete && (
            <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white">
              <Link href="/onboarding">Complete profile <ArrowRight className="ml-1 size-3" /></Link>
            </Button>
          )}
        </div>

        {/* Profile completion */}
        {!profile?.onboarding_complete && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              <Sparkles className="inline mr-1 size-4" /> Your profile is incomplete
            </p>
            <p className="text-xs text-amber-700 mt-0.5">Complete your onboarding to unlock personalised career recommendations, university matches, and funding eligibility.</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Applications", value: applications.length, icon: BookOpen, color: "text-[#006B5E]" },
          { label: "APS Score", value: profile?.aps_score ?? "—", icon: Target, color: "text-amber-600" },
          { label: "Upcoming Deadlines", value: upcoming.length, icon: CalendarDays, color: "text-red-600" },
          { label: "Profile Score", value: profile?.onboarding_complete ? "100%" : "40%", icon: Sparkles, color: "text-blue-600" },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <stat.icon className={`size-5 ${stat.color}`} />
            <p className="mt-2 text-2xl font-extrabold text-[#0F172A]">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 font-bold text-[#0F172A]">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} href={action.href}>
              <a className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${action.color}`}>
                  <action.icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                </div>
              </a>
            </Link>
          ))}
        </div>
      </div>

      {/* Recommended Careers */}
      {profile?.onboarding_complete && matchedCareers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#0F172A]">Recommended Careers for You</h2>
            <Button asChild variant="ghost" size="sm" className="text-[#006B5E]">
              <Link href="/careers">View all matches</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {matchedCareers.map(career => (
              <Link key={career.id} href="/careers">
                <a className="cp-card flex flex-col p-4 hover:border-[#006B5E]/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold text-[#0F172A] line-clamp-1">{career.title}</p>
                    <Sparkles className="size-3 text-[#006B5E] shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">{career.field}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] bg-[#E8F5F3] text-[#006B5E] px-2 py-0.5 rounded-full font-bold">MATCH</span>
                    <ArrowRight className="size-3 text-slate-400" />
                  </div>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-bold text-[#0F172A]">Upcoming Deadlines</h2>
            <Button asChild variant="ghost" size="sm" className="text-[#006B5E]">
              <Link href="/applications">View all</Link>
            </Button>
          </div>
          <div className="p-5">
            {upcoming.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarDays className="mx-auto mb-2 size-8 text-slate-200" />
                <p className="text-sm text-slate-400">No upcoming deadlines</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/applications">Add application</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {upcoming.map(app => {
                  const daysLeft = Math.ceil((new Date(app.deadline!).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={app.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{app.institution}</p>
                        <p className="text-xs text-slate-500">{app.type} · {app.programme ?? "General"}</p>
                      </div>
                      <span className={`cp-badge-${daysLeft <= 3 ? "red" : daysLeft <= 7 ? "amber" : "primary"}`}>
                        {daysLeft}d left
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-bold text-[#0F172A]">Recent Applications</h2>
            <Button asChild variant="ghost" size="sm" className="text-[#006B5E]">
              <Link href="/applications">View all</Link>
            </Button>
          </div>
          <div className="p-5">
            {recentApps.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto mb-2 size-8 text-slate-200" />
                <p className="text-sm text-slate-400">No applications yet</p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white">
                    <Link href="/universities">Apply to university</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/funding">Apply for funding</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {recentApps.map(app => (
                  <div key={app.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{app.institution}</p>
                      <p className="text-xs text-slate-500 capitalize">{app.type}</p>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${STATUS_COLORS[app.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {app.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
