import { useState } from "react";
import { ArrowRight, ExternalLink, GraduationCap, Search } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/AuthProvider";
import { createApplication } from "@/lib/supabase-helpers";
import { UNIVERSITIES, PROVINCES, type Institution } from "@/data/universities";
import { useToast } from "@/hooks/use-toast";
import { InAppBrowser } from "@/components/ui/in-app-browser";

const TYPE_LABELS: Record<string, string> = {
  public_university: "Public University",
  university_of_technology: "University of Technology",
  private_institution: "Private Institution",
  tvet_college: "TVET College",
};

const TYPE_COLORS: Record<string, string> = {
  public_university: "cp-badge-primary",
  university_of_technology: "bg-blue-100 text-blue-800",
  private_institution: "cp-badge-blue",
  tvet_college: "cp-badge-amber",
};

export function UniversitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("All");
  const [type, setType] = useState("All");
  const [apsFilter, setApsFilter] = useState("");
  const [selected, setSelected] = useState<Institution | null>(null);
  const [applying, setApplying] = useState<Institution | null>(null);
  const [browserUrl, setBrowserUrl] = useState<{url: string, title: string} | null>(null);
  const [programme, setProgramme] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const displayed = UNIVERSITIES.filter(u => {
    if (province !== "All" && u.province !== province) return false;
    if (type !== "All" && u.type !== type) return false;
    if (apsFilter && u.minAps > Number(apsFilter)) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleApply() {
    if (!user || !applying) return;
    setSaving(true);
    const app = await createApplication(user.id, {
      type: applying.type === "tvet_college" ? "tvet" : "university",
      institution: applying.name,
      programme,
      status: "in_progress",
      deadline: deadline || undefined,
      documents: [
        { name: "South African ID / Passport", uploaded: false, required: true },
        { name: "Matric Certificate / Results", uploaded: false, required: true },
        { name: "Proof of Application Fee", uploaded: false, required: false },
        { name: "Motivational Letter", uploaded: false, required: false },
      ],
      notes: `Applied via CareerPath SA. Portal: ${applying.applicationUrl}`,
      priority: "high",
      province: applying.province,
    });
    setSaving(false);
    if (app) {
      toast({ title: "Application started!", description: `${applying.name} added to your tracker.` });
      setApplying(null);
      setProgramme("");
      setDeadline("");
      navigate("/applications");
    } else {
      toast({ title: "Failed to save application", variant: "destructive" });
    }
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="cp-section-label mb-2">Institution Browser</div>
        <h1 className="text-2xl font-extrabold text-[#0F172A]">South African Universities & Colleges</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse all public universities, private institutions, and TVET colleges. Filter by province and APS, then start your application in-app.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input className="pl-9 h-10" placeholder="Search institutions…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {[
          { label: "Province", value: province, setter: setProvince, options: ["All", ...PROVINCES] },
          { label: "Type", value: type, setter: setType, options: ["All", "public_university", "university_of_technology", "private_institution", "tvet_college"] },
        ].map(f => (
          <select key={f.label}
            className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
            value={f.value} onChange={e => f.setter(e.target.value)}>
            {f.options.map(o => <option key={o} value={o}>{f.label === "Type" && o !== "All" ? TYPE_LABELS[o] ?? o : o}</option>)}
          </select>
        ))}
        <Input className="h-10 w-32" placeholder="Min APS" type="number" value={apsFilter} onChange={e => setApsFilter(e.target.value)} />
      </div>

      <p className="text-sm text-slate-500">{displayed.length} institution{displayed.length !== 1 ? "s" : ""} found</p>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {displayed.map(u => (
          <div key={u.id} className="cp-card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1">
                  <span className={TYPE_COLORS[u.type]}>{TYPE_LABELS[u.type]}</span>
                </div>
                <h3 className="font-bold text-[#0F172A]">{u.name}</h3>
                <p className="text-xs text-slate-500">{u.province}</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-2">{u.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-slate-400">Min APS</p>
                <p className="font-extrabold text-[#0F172A]">{u.minAps}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-slate-400">Estimated Pass Rate</p>
                <p className="font-extrabold text-[#006B5E]">{u.passRate}%</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(u)}>View Details</Button>
              <Button size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white" onClick={() => setApplying(u)}>
                Apply Now
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
                <span className={`${TYPE_COLORS[selected.type]} mb-2 inline-block`}>{TYPE_LABELS[selected.type]}</span>
                <h2 className="text-xl font-extrabold text-[#0F172A]">{selected.name}</h2>
                <p className="text-sm text-slate-500">{selected.province}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 grid gap-4 text-sm">
              <p className="text-slate-600 leading-relaxed">{selected.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: "Min APS", v: selected.minAps },
                  { l: "Pass Rate", v: `${selected.passRate}%` },
                ].map(item => (
                  <div key={item.l} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">{item.l}</p>
                    <p className="font-bold text-[#0F172A]">{item.v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold text-[#0F172A] mb-2">Example Programmes</p>
                <div className="grid gap-2">
                  {selected.programmes.map(p => (
                    <div key={p.name} className="rounded-lg border border-border p-3">
                      <p className="font-bold text-[#0F172A]">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.faculty} · APS {p.apsRequired} · {p.duration}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Close</Button>
                <Button className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white" onClick={() => { setSelected(null); setApplying(selected); }}>
                  Apply Now <ArrowRight className="ml-1 size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <h2 className="text-lg font-extrabold text-[#0F172A]">Apply to {applying.name}</h2>
                <p className="text-sm text-slate-500">{applying.province}</p>
              </div>
              <button onClick={() => setApplying(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 grid gap-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">📌 How this works</p>
                <p>We'll track your application in-app. The final application must be submitted on the official portal below.</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#0F172A]">Programme / Qualification *</label>
                <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                  value={programme} onChange={e => setProgramme(e.target.value)}>
                  <option value="">Select programme…</option>
                  {applying.programmes.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  <option value="Other">Other (specify in notes)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#0F172A]">Application Deadline</label>
                <Input type="date" className="mt-1.5 h-11" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-1">Official Application Portal</p>
                <button type="button" onClick={() => setBrowserUrl({ url: applying.applicationUrl, title: applying.name })} className="text-sm text-[#006B5E] underline text-left break-all">
                  {applying.applicationUrl}
                </button>
                <p className="mt-1 text-xs text-slate-400">Remember to return here and save your application to track it.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setApplying(null)}>Cancel</Button>
                <Button onClick={handleApply} disabled={saving || !programme} className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white">
                  {saving ? "Saving…" : "Start Tracking"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Browser */}
      {browserUrl && (
        <InAppBrowser
          url={browserUrl.url}
          title={browserUrl.title}
          onClose={() => setBrowserUrl(null)}
        />
      )}
    </div>
  );
}
