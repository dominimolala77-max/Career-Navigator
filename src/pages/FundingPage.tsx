import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Shield, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProfile, getNsfasApplication, upsertNsfasApplication, createApplication, getApplications, updateApplication, type Profile } from "@/lib/supabase-helpers";
import { BURSARIES, type Bursary } from "@/data/bursaries";
import { useToast } from "@/hooks/use-toast";

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
  const [tab, setTab] = useState<"nsfas" | "bursaries">("nsfas");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nsfasData, setNsfasData] = useState<Record<string, unknown>>({});
  const [savingNsfas, setSavingNsfas] = useState(false);
  const [bursaryFilter, setBursaryFilter] = useState("All");
  const [applyingBursary, setApplyingBursary] = useState<Bursary | null>(null);
  const [bursaryDeadline, setBursaryDeadline] = useState("");
  const [savingBursary, setSavingBursary] = useState(false);

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
    const existingApplications = await getApplications(user.id);
    const existingNsfas = existingApplications.find(app => app.type === "nsfas");
    const trackerData = {
      type: "nsfas" as const,
      institution: "NSFAS",
      programme: (merged["intended_qualification"] as string) || "Student funding",
      status: "todo" as const,
      amount: "Full cost of study if approved",
      documents: NSFAS_DOCS.map(doc => ({
        name: doc.label,
        uploaded: Boolean(merged[doc.key]),
        required: true,
      })),
      notes: "Saved for managed NSFAS submission by CareerPath SA.",
      priority: "high" as const,
      province: (merged["province"] as string) || profile?.province,
      form_data: merged,
    };
    if (existingNsfas) {
      await updateApplication(existingNsfas.id, trackerData);
    } else {
      await createApplication(user.id, trackerData);
    }
    setSavingNsfas(false);
    toast({ title: "NSFAS details saved", description: "Your NSFAS submission request is now in the tracker." });
  }

  async function handleBursaryApply() {
    if (!user || !applyingBursary) return;
    setSavingBursary(true);
    const app = await createApplication(user.id, {
      type: "bursary",
      institution: applyingBursary.provider,
      programme: applyingBursary.name,
      status: "todo",
      deadline: bursaryDeadline || undefined,
      amount: applyingBursary.amount,
      documents: applyingBursary.documents.map(d => ({ name: d, uploaded: false, required: true })),
      notes: `Requested managed bursary submission for ${applyingBursary.name}. Official portal: ${applyingBursary.applicationUrl}`,
      priority: "medium",
    });
    setSavingBursary(false);
    if (app) {
      toast({ title: "Bursary request saved", description: `${applyingBursary.name} was added for managed submission.` });
      setApplyingBursary(null);
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  const filteredBursaries = BURSARIES.filter(b =>
    bursaryFilter === "All" || b.fields.some(f => f.toLowerCase().includes(bursaryFilter.toLowerCase()))
  );

  return (
    <div className="grid gap-4 sm:gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="cp-section-label mb-2">Funding Centre</div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">NSFAS & Bursaries</h1>
        <p className="mt-1 text-sm text-slate-500">Prepare NSFAS and bursary details in one place. Your data is pre-filled from your profile so we can manage submissions for you.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto hide-scrollbar">
        {(["nsfas", "bursaries"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors capitalize whitespace-nowrap ${tab === t ? "border-[#006B5E] text-[#006B5E]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "nsfas" ? "NSFAS Details" : "Bursaries"}
          </button>
        ))}
      </div>

      {/* NSFAS Tab */}
      {tab === "nsfas" && (
        <div className="grid gap-4 sm:gap-6">
          {/* Eligibility Check */}
          <div className={`rounded-2xl border p-4 sm:p-5 ${isEligible === true ? "border-[#006B5E]/20 bg-[#E8F5F3]" : isEligible === false ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              {isEligible === true ? <CheckCircle2 className="size-5 text-[#006B5E] mt-0.5" /> :
               isEligible === false ? <AlertCircle className="size-5 text-red-500 mt-0.5" /> :
               <AlertCircle className="size-5 text-amber-500 mt-0.5" />}
              <div className="min-w-0">
                <p className="font-semibold text-[#0F172A] text-sm">
                  {isEligible === true ? "You may qualify for NSFAS!" :
                   isEligible === false ? "You may not qualify for NSFAS" :
                   "NSFAS Eligibility Unknown"}
                </p>
                <p className="text-sm mt-0.5 text-slate-600">
                  {isEligible === true ? `SA citizen ✓ · Household income R${income?.toLocaleString()} (below R350,000 threshold) ✓` :
                   isEligible === false ? `${!isSACitizen ? "Not an SA citizen · " : ""}${income && income > 350000 ? `Household income R${income.toLocaleString()} exceeds R350,000 threshold` : ""}` :
                   "Complete your profile to check NSFAS eligibility."}
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <Shield className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Important:</strong> Complete and save these NSFAS details so CareerPath SA can prepare your managed submission.
            </p>
          </div>

          {/* NSFAS Form */}
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border px-4 sm:px-6 py-4">
              <h2 className="font-bold text-[#0F172A] text-sm sm:text-base">NSFAS Submission Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">Fill in and save so we can prepare the NSFAS submission.</p>
            </div>
            <div className="p-4 sm:p-6 grid gap-6">
              {/* Personal Details */}
              <div>
                <p className="font-semibold text-[#0F172A] mb-3 text-sm">Personal Details</p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                <p className="font-semibold text-[#0F172A] mb-3 text-sm">Address</p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                <p className="font-semibold text-[#0F172A] mb-3 text-sm">Academic Details</p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                <p className="font-semibold text-[#0F172A] mb-3 text-sm">Financial Information</p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                <p className="font-semibold text-[#0F172A] mb-3 text-sm">
                  <FileText className="inline mr-1 size-4 text-[#006B5E]" />
                  Documents Checklist
                </p>
                <div className="grid gap-2">
                  {NSFAS_DOCS.map(doc => (
                    <label key={doc.key} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" className="size-4 accent-[#006B5E] shrink-0"
                        checked={(nsfasData[doc.key] as boolean) ?? false}
                        onChange={e => setNsfasData(prev => ({ ...prev, [doc.key]: e.target.checked }))} />
                      <span className="text-sm text-slate-700">{doc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                <Button onClick={() => saveNsfas(nsfasData)} disabled={savingNsfas} className="bg-[#006B5E] hover:bg-[#005548] text-white">
                  {savingNsfas ? "Saving..." : "Save for Submission"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bursaries Tab */}
      {tab === "bursaries" && (
        <div className="grid gap-4 sm:gap-5">
          <div className="flex gap-3 flex-col sm:flex-row">
            <select className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E] w-full sm:w-auto"
              value={bursaryFilter} onChange={e => setBursaryFilter(e.target.value)}>
              <option value="All">All Fields</option>
              {["Engineering", "Finance", "IT", "Health", "Agriculture", "Mining", "Education"].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {filteredBursaries.map(b => (
              <div key={b.id} className={`cp-card-hover p-4 sm:p-5 flex flex-col gap-3 ${b.status === 'closed' ? 'cp-non-clickable' : 'cp-clickable'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-[#0F172A]">{b.name}</h3>
                    <p className="text-xs text-slate-500">{b.provider}</p>
                  </div>
                  <span className={STATUS_COLORS[b.status] + " shrink-0"}>{STATUS_LABELS[b.status]}</span>
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
                  className={b.status === "closed" ? "w-full" : "w-full bg-[#006B5E] hover:bg-[#005548] text-white text-xs sm:text-sm"}>
                  {b.status === "closed" ? "Applications Closed" : "Request Submission"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bursary Apply Modal */}
      {applyingBursary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-border p-4 sm:p-6 sticky top-0 bg-white">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">{applyingBursary.name}</h2>
                <p className="text-sm text-slate-500">{applyingBursary.provider}</p>
              </div>
              <button onClick={() => setApplyingBursary(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none shrink-0 ml-2">&times;</button>
            </div>
            <div className="p-4 sm:p-6 grid gap-4">
              <div>
                <Label>Application Deadline</Label>
                <Input type="date" className="mt-1.5 h-11" value={bursaryDeadline} onChange={e => setBursaryDeadline(e.target.value)} />
                <p className="mt-1 text-xs text-slate-400">Listed deadline: {applyingBursary.deadline}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Documents Required</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {applyingBursary.documents.map(d => (
                    <li key={d} className="flex items-center gap-2"><div className="size-3 rounded-sm border border-slate-300 shrink-0" />{d}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4 text-xs sm:text-sm text-amber-800">
                <p className="font-semibold mb-1">Managed submission</p>
                <p>Save this request so your completed profile and documents can be reviewed for a managed bursary submission.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 text-xs sm:text-sm" onClick={() => setApplyingBursary(null)}>Cancel</Button>
                <Button onClick={handleBursaryApply} disabled={savingBursary} className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white gap-2 text-xs sm:text-sm">
                  {savingBursary ? "Saving..." : "Save Request"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Security & POPIA Notice */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <Shield className="size-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-blue-900 mb-2 text-sm">Data Security & POPIA Compliance</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Your financial information (income, bank details) is encrypted and protected</li>
              <li>✓ Sensitive documents (ID, payslips, bank statements) are used only for funding applications</li>
              <li>✓ Information is processed in accordance with POPIA (Protection of Personal Information Act)</li>
              <li>✓ You have the right to request access to, correct, or delete your information</li>
              <li>✓ CareerPath SA does not share personal data with unauthorized third parties</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}