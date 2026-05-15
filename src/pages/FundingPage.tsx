import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, FileText, Shield, Wallet } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProfile, getNsfasApplication, upsertNsfasApplication, createApplication, type Profile } from "@/lib/supabase-helpers";
import { BURSARIES, type Bursary } from "@/data/bursaries";
import { useToast } from "@/hooks/use-toast";
import { InAppBrowser } from "@/components/ui/in-app-browser";

const SA_PROVINCES = ["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"];

const NSFAS_DOCS = [
  { key: "docs_id", label: "South African ID document (certified copy)" },
  { key: "docs_matric", label: "Matric certificate / school results" },
  { key: "docs_income_parents", label: "Parents'/guardians' proof of income (3 months payslips)" },
  { key: "docs_sassa", label: "SASSA letter (if applicable)" },
  { key: "docs_bank_statement", label: "Bank statement (3 months)" },
  { key: "docs_acceptance_letter", label: "Acceptance / provisional offer letter from institution" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "cp-badge-primary",
  closed: "bg-red-50 text-red-700 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
  opening_soon: "cp-badge-amber",
};
const STATUS_LABELS: Record<string, string> = { open: "Open", closed: "Closed", opening_soon: "Opening Soon" };

export function FundingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"nsfas" | "bursaries">("nsfas");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nsfasData, setNsfasData] = useState<Record<string, unknown>>({});
  const [savingNsfas, setSavingNsfas] = useState(false);
  const [bursaryFilter, setBursaryFilter] = useState("All");
  const [applyingBursary, setApplyingBursary] = useState<Bursary | null>(null);
  const [bursaryDeadline, setBursaryDeadline] = useState("");
  const [savingBursary, setSavingBursary] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<{url: string, title: string} | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(setProfile);
    getNsfasApplication(user.id).then(d => { if (d) setNsfasData(d as Record<string, unknown>); });
  }, [user]);

  // NSFAS Eligibility
  const isSACitizen = profile?.sa_citizen;
  const income = profile?.household_income ? Number(profile.household_income) : null;
  const isEligible = isSACitizen && income !== null && income <= 350000;

  async function saveNsfas(updates: Record<string, unknown>) {
    if (!user) return;
    setSavingNsfas(true);
    const merged = { ...nsfasData, ...updates };
    setNsfasData(merged);
    await upsertNsfasApplication(user.id, merged);
    setSavingNsfas(false);
    toast({ title: "NSFAS application saved" });
  }

  async function handleBursaryApply(openBrowser: boolean = false) {
    if (!user || !applyingBursary) return;
    setSavingBursary(true);
    const app = await createApplication(user.id, {
      type: "bursary",
      institution: applyingBursary.provider,
      programme: applyingBursary.name,
      status: "in_progress",
      deadline: bursaryDeadline || undefined,
      amount: applyingBursary.amount,
      documents: applyingBursary.documents.map(d => ({ name: d, uploaded: false, required: true })),
      notes: `Bursary: ${applyingBursary.name}`,
      priority: "medium",
    });
    setSavingBursary(false);
    if (app) {
      toast({ title: "Bursary application started!" });
      if (openBrowser) {
        setBrowserUrl({ url: applyingBursary.applicationUrl, title: applyingBursary.name });
        setApplyingBursary(null);
      } else {
        setApplyingBursary(null);
        navigate("/applications");
      }
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  const filteredBursaries = BURSARIES.filter(b =>
    bursaryFilter === "All" || b.fields.some(f => f.toLowerCase().includes(bursaryFilter.toLowerCase()))
  );

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="cp-section-label mb-2">Funding Centre</div>
        <h1 className="text-2xl font-extrabold text-[#0F172A]">NSFAS & Bursaries</h1>
        <p className="mt-1 text-sm text-slate-500">Apply for NSFAS and track bursaries all in one place. Your data is pre-filled from your profile.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(["nsfas", "bursaries"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors capitalize ${tab === t ? "border-[#006B5E] text-[#006B5E]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "nsfas" ? "NSFAS Application" : "Bursaries"}
          </button>
        ))}
      </div>

      {/* NSFAS Tab */}
      {tab === "nsfas" && (
        <div className="grid gap-6">
          {/* Eligibility Check */}
          <div className={`rounded-2xl border p-5 ${isEligible === true ? "border-[#006B5E]/20 bg-[#E8F5F3]" : isEligible === false ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              {isEligible === true ? <CheckCircle2 className="size-5 text-[#006B5E] mt-0.5" /> :
               isEligible === false ? <AlertCircle className="size-5 text-red-500 mt-0.5" /> :
               <AlertCircle className="size-5 text-amber-500 mt-0.5" />}
              <div>
                <p className="font-semibold text-[#0F172A]">
                  {isEligible === true ? "You may qualify for NSFAS!" :
                   isEligible === false ? "You may not qualify for NSFAS" :
                   "NSFAS Eligibility Unknown"}
                </p>
                <p className="text-sm mt-0.5 text-slate-600">
                  {isEligible === true ? `SA citizen ✓ · Household income R${income?.toLocaleString()} (below R350,000 threshold) ✓` :
                   isEligible === false ? `${!isSACitizen ? "Not an SA citizen · " : ""}${income && income > 350000 ? `Household income R${income.toLocaleString()} exceeds R350,000 threshold` : ""}` :
                   "Complete your profile to check NSFAS eligibility. Go to Profile → update citizenship and household income."}
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <Shield className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Important:</strong> CareerPath SA helps you prepare your NSFAS application. Your final application MUST be submitted on the official NSFAS website at <strong>nsfas.org.za</strong>. This in-app form stores your information securely and helps you stay organised.
            </p>
          </div>

          {/* NSFAS Form */}
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-bold text-[#0F172A]">NSFAS Application Form</h2>
              <p className="text-xs text-slate-500 mt-0.5">Fill in and save — then submit on nsfas.org.za</p>
            </div>
            <div className="p-6 grid gap-6">
              {/* Personal Details */}
              <div>
                <p className="font-semibold text-[#0F172A] mb-3">Personal Details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "full_name", label: "Full Name", placeholder: profile?.full_name ?? "" },
                    { key: "id_number", label: "SA ID Number", placeholder: "13-digit ID number" },
                    { key: "phone", label: "Phone Number", placeholder: "+27 81 234 5678" },
                    { key: "email", label: "Email Address", placeholder: user?.email ?? "" },
                  ].map(f => (
                    <div key={f.key}>
                      <Label>{f.label}</Label>
                      <Input className="mt-1.5 h-10" placeholder={f.placeholder}
                        value={(nsfasData[f.key] as string) ?? ""}
                        onChange={e => setNsfasData(prev => ({ ...prev, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="font-semibold text-[#0F172A] mb-3">Address</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Street Address</Label>
                    <Input className="mt-1.5 h-10" placeholder="123 Main Street"
                      value={(nsfasData["address"] as string) ?? ""}
                      onChange={e => setNsfasData(prev => ({ ...prev, address: e.target.value }))} />
                  </div>
                  <div>
                    <Label>City / Town</Label>
                    <Input className="mt-1.5 h-10" placeholder="City"
                      value={(nsfasData["city"] as string) ?? ""}
                      onChange={e => setNsfasData(prev => ({ ...prev, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Province</Label>
                    <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                      value={(nsfasData["province"] as string) ?? ""}
                      onChange={e => setNsfasData(prev => ({ ...prev, province: e.target.value }))}>
                      <option value="">Select province</option>
                      {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Academic */}
              <div>
                <p className="font-semibold text-[#0F172A] mb-3">Academic Details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Intended Institution</Label>
                    <Input className="mt-1.5 h-10" placeholder="University / TVET name"
                      value={(nsfasData["intended_institution"] as string) ?? ""}
                      onChange={e => setNsfasData(prev => ({ ...prev, intended_institution: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Intended Qualification</Label>
                    <Input className="mt-1.5 h-10" placeholder="e.g. BSc Computer Science"
                      value={(nsfasData["intended_qualification"] as string) ?? ""}
                      onChange={e => setNsfasData(prev => ({ ...prev, intended_qualification: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div>
                <p className="font-semibold text-[#0F172A] mb-3">Financial Information</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Combined Household Income (ZAR/year)</Label>
                    <Input type="number" className="mt-1.5 h-10" placeholder="e.g. 150000"
                      value={(nsfasData["household_income"] as string) ?? ""}
                      onChange={e => setNsfasData(prev => ({ ...prev, household_income: e.target.value }))} />
                    <p className="text-xs text-slate-400 mt-0.5">Must be below R350,000 to qualify</p>
                  </div>
                  <div>
                    <Label>SASSA Grant Amount (if applicable)</Label>
                    <Input type="number" className="mt-1.5 h-10" placeholder="0"
                      value={(nsfasData["sassa_amount"] as string) ?? ""}
                      onChange={e => setNsfasData(prev => ({ ...prev, sassa_amount: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Documents Checklist */}
              <div>
                <p className="font-semibold text-[#0F172A] mb-3">
                  <FileText className="inline mr-1 size-4 text-[#006B5E]" />
                  Documents Checklist
                </p>
                <div className="grid gap-2">
                  {NSFAS_DOCS.map(doc => (
                    <label key={doc.key} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" className="size-4 accent-[#006B5E]"
                        checked={(nsfasData[doc.key] as boolean) ?? false}
                        onChange={e => setNsfasData(prev => ({ ...prev, [doc.key]: e.target.checked }))} />
                      <span className="text-sm text-slate-700">{doc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                <Button onClick={() => saveNsfas(nsfasData)} disabled={savingNsfas} className="bg-[#006B5E] hover:bg-[#005548] text-white">
                  {savingNsfas ? "Saving…" : "Save Application"}
                </Button>
                <Button onClick={() => setBrowserUrl({ url: "https://my.nsfas.org.za/", title: "NSFAS Application Portal" })} variant="outline" className="gap-2">
                  Submit on NSFAS.org.za <ExternalLink className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bursaries Tab */}
      {tab === "bursaries" && (
        <div className="grid gap-5">
          <div className="flex gap-3 flex-wrap">
            <select className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
              value={bursaryFilter} onChange={e => setBursaryFilter(e.target.value)}>
              <option value="All">All Fields</option>
              {["Engineering", "Finance", "IT", "Health", "Agriculture", "Mining", "Education"].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {filteredBursaries.map(b => (
              <div key={b.id} className="cp-card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#0F172A]">{b.name}</h3>
                    <p className="text-xs text-slate-500">{b.provider}</p>
                  </div>
                  <span className={STATUS_COLORS[b.status]}>{STATUS_LABELS[b.status]}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{b.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-400">Amount</p>
                    <p className="font-bold text-[#006B5E] text-xs">{b.amount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-slate-400">Deadline</p>
                    <p className="font-bold text-[#0F172A]">{b.deadline}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {b.fields.slice(0, 3).map(f => <span key={f} className="cp-badge-blue text-xs">{f.substring(0, 30)}</span>)}
                </div>
                <Button size="sm" onClick={() => setApplyingBursary(b)} disabled={b.status === "closed"}
                  className={b.status === "closed" ? "w-full" : "w-full bg-[#006B5E] hover:bg-[#005548] text-white"}>
                  {b.status === "closed" ? "Applications Closed" : "Apply Now"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bursary Apply Modal */}
      {applyingBursary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <h2 className="text-lg font-extrabold text-[#0F172A]">{applyingBursary.name}</h2>
                <p className="text-sm text-slate-500">{applyingBursary.provider}</p>
              </div>
              <button onClick={() => setApplyingBursary(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 grid gap-4">
              <div>
                <Label>Application Deadline</Label>
                <Input type="date" className="mt-1.5 h-11" value={bursaryDeadline} onChange={e => setBursaryDeadline(e.target.value)} />
                <p className="mt-1 text-xs text-slate-400">Listed deadline: {applyingBursary.deadline}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Documents Required</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {applyingBursary.documents.map(d => (
                    <li key={d} className="flex items-center gap-2"><div className="size-3 rounded-sm border border-slate-300" />{d}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">📌 How to apply</p>
                <p>Click <strong>"Apply Now"</strong> to open the official bursary portal inside the app. We will also automatically add this to your application tracker.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setApplyingBursary(null)}>Cancel</Button>
                <Button onClick={() => handleBursaryApply(true)} disabled={savingBursary} className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white gap-2">
                  {savingBursary ? "Saving…" : "Apply Now"} <ExternalLink className="size-3" />
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
