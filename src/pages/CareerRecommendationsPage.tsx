import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, Search, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProfile, type Profile } from "@/lib/supabase-helpers";
import { CAREERS, CAREER_FIELDS, PERSONALITY_TYPES, matchCareers, type Career } from "@/data/careers";

const DEMAND_COLORS: Record<string, string> = {
  very_high: "cp-badge-primary",
  high: "cp-badge-blue",
  medium: "cp-badge-amber",
  low: "bg-slate-100 text-slate-600 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
};

const DEMAND_LABELS: Record<string, string> = {
  very_high: "Very High Demand",
  high: "High Demand",
  medium: "Medium Demand",
  low: "Low Demand",
};

function fmt(n: number) {
  return `R${(n / 1000).toFixed(0)}k`;
}

export function CareerRecommendationsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matched, setMatched] = useState<Career[]>([]);
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("All");
  const [selected, setSelected] = useState<Career | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(p => {
      setProfile(p);
      if (p) {
        const results = matchCareers({
          apsScore: p.aps_score ?? 0,
          subjects: (p.subjects ?? []).map((s: { code: string }) => s.code),
          personalityType: p.personality_type ?? "",
          preferredFields: p.preferred_fields ?? [],
        });
        setMatched(results.length ? results : CAREERS);
      } else {
        setMatched(CAREERS);
      }
    });
  }, [user]);

  const allFields = ["All", ...CAREER_FIELDS];
  const displayed = matched.filter(c => {
    const matchField = fieldFilter === "All" || c.field === fieldFilter;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.field.toLowerCase().includes(search.toLowerCase());
    return matchField && matchSearch;
  });

  const personalityLabel = profile?.personality_type
    ? PERSONALITY_TYPES.find(p => p.id === profile.personality_type)
    : null;

  return (
    <div className="grid gap-4 sm:gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="cp-section-label mb-2">Career Matching</div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">Your Career Recommendations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Matched based on your APS score, subjects, and personality profile.
        </p>
        {profile && (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.aps_score ? <span className="cp-badge-amber">APS {profile.aps_score}</span> : null}
            {personalityLabel && <span className="cp-badge-primary">{personalityLabel.icon} {personalityLabel.label}</span>}
            {profile.preferred_fields?.slice(0, 3).map(f => (
              <span key={f} className="cp-badge-blue">{f}</span>
            ))}
          </div>
        )}
        {!profile?.onboarding_complete && (
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800 flex-1">Complete your profile to get personalised career matches.</p>
            <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white shrink-0 w-full sm:w-auto">
              <Link href="/onboarding">Complete profile</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input className="pl-9 h-10 w-full" placeholder="Search careers…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E] w-full sm:w-auto"
          value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}>
          {allFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <p className="text-sm text-slate-500">{displayed.length} career{displayed.length !== 1 ? "s" : ""} found</p>

      {/* Career Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {displayed.map(career => (
          <div key={career.id} className="cp-card-hover flex flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-[#0F172A]">{career.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{career.field}</p>
              </div>
              <span className={DEMAND_COLORS[career.jobDemand] + " shrink-0"}>{DEMAND_LABELS[career.jobDemand]}</span>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-2">{career.description}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 px-2 py-2">
                <p className="text-xs text-slate-400">Min APS</p>
                <p className="font-bold text-[#0F172A]">{career.minAps}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-2">
                <p className="text-xs text-slate-400">Study</p>
                <p className="font-bold text-[#0F172A]">{career.studyYears} yrs</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-2">
                <p className="text-xs text-slate-400">Salary</p>
                <p className="font-bold text-[#006B5E] text-xs">{fmt(career.salaryRangeZAR.min)}–{fmt(career.salaryRangeZAR.max)}</p>
              </div>
            </div>

            {career.requiredSubjects.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {career.requiredSubjects.map(s => (
                  <span key={s} className="rounded-md bg-[#E8F5F3] px-2 py-0.5 text-xs font-medium text-[#006B5E]">{s}</span>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm" onClick={() => setSelected(career)}>
                View Details
              </Button>
              <Button asChild size="sm" className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white text-xs sm:text-sm">
                <Link href={`/universities?field=${encodeURIComponent(career.field)}`}>
                  Find Universities <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40">
          <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border bg-white shadow-2xl overflow-y-auto max-h-[85vh] sm:max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-border p-4 sm:p-6 sticky top-0 bg-white">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A]">{selected.title}</h2>
                <p className="text-sm text-slate-500">{selected.field}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none shrink-0 ml-2">&times;</button>
            </div>
            <div className="p-4 sm:p-6 grid gap-4">
              <p className="text-sm text-slate-600 leading-relaxed">{selected.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
                  <p className="text-xs text-slate-400">Minimum APS</p>
                  <p className="text-lg sm:text-xl font-extrabold text-[#0F172A]">{selected.minAps}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
                  <p className="text-xs text-slate-400">Study Duration</p>
                  <p className="text-lg sm:text-xl font-extrabold text-[#0F172A]">{selected.studyYears} Years</p>
                </div>
                <div className="rounded-xl bg-[#E8F5F3] p-3 sm:p-4">
                  <p className="text-xs text-[#006B5E]">Salary Range (ZAR)</p>
                  <p className="text-base sm:text-lg font-extrabold text-[#006B5E]">{fmt(selected.salaryRangeZAR.min)} – {fmt(selected.salaryRangeZAR.max)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
                  <p className="text-xs text-slate-400">Qualification</p>
                  <p className="text-sm font-bold text-[#0F172A]">{selected.degreeLevel}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Required Subjects</p>
                <div className="flex flex-wrap gap-1">
                  {selected.requiredSubjects.length ? selected.requiredSubjects.map(s => (
                    <span key={s} className="cp-badge-primary">{s}</span>
                  )) : <span className="text-sm text-slate-400">No specific subjects required</span>}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Best for Personality Types</p>
                <div className="flex flex-wrap gap-1">
                  {selected.personalityTypes.map(p => {
                    const pt = PERSONALITY_TYPES.find(x => x.id === p);
                    return pt ? <span key={p} className="cp-badge-blue">{pt.icon} {pt.label}</span> : null;
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2">
                  <TrendingUp className="inline mr-1 size-4 text-[#006B5E]" />
                  Job Demand: <span className="text-[#006B5E]">{DEMAND_LABELS[selected.jobDemand]}</span>
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2">
                  <Users className="inline mr-1 size-4 text-blue-600" />
                  Recommended Universities
                </p>
                <p className="text-sm text-slate-500">{selected.universities.join(", ").toUpperCase()}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 text-xs sm:text-sm" onClick={() => setSelected(null)}>Close</Button>
                <Button asChild className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white text-xs sm:text-sm">
                  <Link href="/universities">Find Universities <ArrowRight className="ml-1 size-3" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}