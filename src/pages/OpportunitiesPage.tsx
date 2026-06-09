import { useState } from "react";
import { Briefcase, MapPin, Clock, DollarSign, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import { createApplication } from "@/lib/supabase-helpers";
import { OPPORTUNITIES, OPPORTUNITY_TYPES, type Opportunity } from "@/data/opportunities";
import { useToast } from "@/hooks/use-toast";

const TYPE_COLORS: Record<string, string> = {
  learnership: "cp-badge-primary",
  internship: "cp-badge-blue",
  apprenticeship: "cp-badge-amber",
  graduate_programme: "cp-badge-purple",
};

const STATUS_COLORS: Record<string, string> = {
  open: "cp-badge-primary",
  closed: "bg-red-50 text-red-700 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
  opening_soon: "cp-badge-amber",
};

export function OpportunitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [fieldFilter, setFieldFilter] = useState("All");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [applying, setApplying] = useState<Opportunity | null>(null);
  const [deadline, setDeadline] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [saving, setSaving] = useState(false);

  const allFields = ["All", ...Array.from(new Set(OPPORTUNITIES.map(o => o.field)))];
  const allProvinces = ["All", ...Array.from(new Set(OPPORTUNITIES.flatMap(o => o.provinces)))].filter((v, i, a) => a.indexOf(v) === i);

  const displayed = OPPORTUNITIES.filter(o => {
    if (typeFilter !== "All" && o.type !== typeFilter) return false;
    if (fieldFilter !== "All" && o.field !== fieldFilter) return false;
    if (provinceFilter !== "All" && !o.provinces.includes(provinceFilter) && !o.provinces.includes("All provinces")) return false;
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) && !o.company.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleApply() {
    if (!user || !applying) return;
    setSaving(true);
    const app = await createApplication(user.id, {
      type: applying.type === "graduate_programme" ? "internship" : applying.type as "learnership" | "internship",
      institution: applying.company,
      programme: applying.title,
      status: "todo",
      deadline: deadline || applying.deadline || undefined,
      amount: applying.stipend,
      province: applying.provinces[0],
      documents: applying.applicationDocuments.map(d => ({ name: d, uploaded: false, required: true })),
      notes: coverLetter || `Requested managed submission for ${applying.title}.`,
      priority: "medium",
    });
    setSaving(false);
    if (app) {
      toast({ title: "Submission request saved", description: `${applying.title} at ${applying.company} added to your tracker.` });
      setApplying(null);
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="cp-section-label mb-2">Work Opportunities</div>
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Learnerships, Internships & Graduate Programmes</h1>
        <p className="mt-1 text-sm text-slate-500">Find opportunities matched to your field of study, province, and qualification level, then request managed submissions.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input className="pl-9 h-10" placeholder="Search opportunities…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="All">All Types</option>
          {OPPORTUNITY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
          value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}>
          {allFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
          value={provinceFilter} onChange={e => setProvinceFilter(e.target.value)}>
          {allProvinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <p className="text-sm text-slate-500">{displayed.length} opportunit{displayed.length !== 1 ? "ies" : "y"} found</p>

      {/* List */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displayed.map(opp => (
          <div key={opp.id} className="cp-card flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className={TYPE_COLORS[opp.type]}>{OPPORTUNITY_TYPES.find(t => t.id === opp.type)?.label ?? opp.type}</span>
                  <span className={STATUS_COLORS[opp.status]}>{opp.status === "open" ? "Open" : opp.status === "closed" ? "Closed" : "Opening Soon"}</span>
                </div>
                <h3 className="font-bold text-[#0F172A]">{opp.title}</h3>
                <p className="text-sm text-slate-500">{opp.company}</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">{opp.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="size-3.5 shrink-0" />
                {opp.duration}
              </div>
              <div className="flex items-center gap-1.5 text-[#006B5E] font-semibold">
                <DollarSign className="size-3.5 shrink-0" />
                {opp.stipend}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="size-3.5 shrink-0" />
                {opp.provinces.slice(0, 2).join(", ")}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Briefcase className="size-3.5 shrink-0" />
                {opp.minQualification}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelected(opp)}>Details</Button>
              <Button size="sm" className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white" disabled={opp.status === "closed"} onClick={() => setApplying(opp)}>
                {opp.status === "closed" ? "Closed" : "Request"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <div className="flex flex-wrap gap-1 mb-1">
                  <span className={TYPE_COLORS[selected.type]}>{OPPORTUNITY_TYPES.find(t => t.id === selected.type)?.label}</span>
                  <span className={STATUS_COLORS[selected.status]}>{selected.status}</span>
                </div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">{selected.title}</h2>
                <p className="text-sm text-slate-500">{selected.company}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
            </div>
            <div className="p-6 grid gap-4 text-sm">
              <p className="text-slate-600 leading-relaxed">{selected.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: "Duration", v: selected.duration },
                  { l: "Monthly Stipend", v: selected.stipend },
                  { l: "Min Qualification", v: selected.minQualification },
                  { l: "Deadline", v: selected.deadline },
                ].map(item => (
                  <div key={item.l} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">{item.l}</p>
                    <p className="font-bold text-[#0F172A]">{item.v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold text-[#0F172A] mb-2">Provinces</p>
                <div className="flex flex-wrap gap-1">
                  {selected.provinces.map(p => <span key={p} className="cp-badge-blue">{p}</span>)}
                </div>
              </div>
              <div>
                <p className="font-semibold text-[#0F172A] mb-2">Eligibility</p>
                <ul className="space-y-1 text-slate-600">
                  {selected.eligibility.map(e => <li key={e} className="flex items-start gap-2"><span className="text-[#006B5E] mt-0.5">✓</span>{e}</li>)}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[#0F172A] mb-2">Required Documents</p>
                <ul className="space-y-1 text-slate-600">
                  {selected.applicationDocuments.map(d => <li key={d} className="flex items-start gap-2"><div className="size-3 mt-1 rounded-sm border border-slate-300 shrink-0" />{d}</li>)}
                </ul>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Close</Button>
                <Button onClick={() => { setSelected(null); setApplying(selected); }} disabled={selected.status === "closed"}
                  className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white">Request</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <h2 className="text-lg font-extrabold text-[#0F172A]">{applying.title}</h2>
                <p className="text-sm text-slate-500">{applying.company} · {applying.stipend}</p>
              </div>
              <button onClick={() => setApplying(null)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
            </div>
            <div className="p-6 grid gap-4">
              <div>
                <Label>Application Deadline</Label>
                <Input type="date" className="mt-1.5 h-11" value={deadline} onChange={e => setDeadline(e.target.value)} />
                <p className="mt-1 text-xs text-slate-400">Listed: {applying.deadline}</p>
              </div>
              <div>
                <Label>Cover Letter / Motivation (optional)</Label>
                <textarea
                  className="mt-1.5 w-full rounded-lg border border-border bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E] resize-none"
                  rows={4} placeholder="Briefly explain why you're a good fit for this opportunity…"
                  value={coverLetter} onChange={e => setCoverLetter(e.target.value)} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Documents to Prepare</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {applying.applicationDocuments.map(d => (
                    <li key={d} className="flex items-center gap-2"><div className="size-3 rounded-sm border border-slate-300" />{d}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleApply} disabled={saving} className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white">
                  {saving ? "Saving..." : "Save Request"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
