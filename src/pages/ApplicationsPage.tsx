import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, CheckCircle2, Circle, CreditCard, MessageSquareText, Plus, Trash2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import { 
  getApplications, 
  createApplication, 
  updateApplication, 
  deleteApplication,
  getInstitutionApplications,
  deleteInstitutionApplication,
  markFeeAsPaid,
  type Application,
  type InstitutionApplication 
} from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";

const STATUSES: { id: Application["status"]; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "bg-slate-100 text-slate-600" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-50 text-blue-700" },
  { id: "submitted", label: "Submitted", color: "bg-amber-50 text-amber-700" },
  { id: "accepted", label: "Accepted", color: "bg-[#E8F5F3] text-[#006B5E]" },
  { id: "rejected", label: "Rejected", color: "bg-red-50 text-red-700" },
  { id: "waitlisted", label: "Waitlisted", color: "bg-purple-50 text-purple-700" },
];

const APP_TYPES = ["university", "tvet", "nsfas", "bursary"] as const;
const PRIORITIES: { id: "high" | "medium" | "low"; label: string; color: string }[] = [
  { id: "high", label: "High", color: "text-red-600" },
  { id: "medium", label: "Medium", color: "text-amber-600" },
  { id: "low", label: "Low", color: "text-slate-500" },
];

export function ApplicationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [institutionApps, setInstitutionApps] = useState<InstitutionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);

  // New managed submission request form state
  const [form, setForm] = useState({
    type: "university" as Application["type"],
    institution: "",
    programme: "",
    status: "todo" as Application["status"],
    deadline: "",
    priority: "medium" as "high" | "medium" | "low",
    notes: "",
    amount: "",
    application_fee: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getApplications(user.id),
      getInstitutionApplications(user.id)
    ]).then(([apps, instApps]) => { 
      setApplications(apps);
      setInstitutionApps(instApps);
      setLoading(false); 
    });
  }, [user]);

  async function handleAdd() {
    if (!user || !form.institution || !form.type) return;
    setSaving(true);
    const app = await createApplication(user.id, {
      ...form,
      deadline: form.deadline || undefined,
      amount: form.amount || undefined,
      application_fee: form.type === "nsfas" ? 0 : Number(form.application_fee || 0),
      fee_payment_status: form.type === "nsfas" || Number(form.application_fee || 0) === 0 ? "not_required" : "unpaid",
      documents: [],
      status_updates: [{ message: "Submission request received by CareerPath SA.", at: new Date().toISOString(), by: "system" }],
    });
    setSaving(false);
    if (app) {
      setApplications(prev => [app, ...prev]);
      setShowAdd(false);
      setForm({ type: "university", institution: "", programme: "", status: "todo", deadline: "", priority: "medium", notes: "", amount: "", application_fee: "" });
      toast({ title: "Submission request added!" });
    }
  }

  async function handleStatusChange(id: string, status: Application["status"]) {
    const app = applications.find(a => a.id === id);
    const update = { message: `Status updated to ${status.replace("_", " ")}.`, at: new Date().toISOString(), by: "CareerPath SA" };
    const status_updates = [...(app?.status_updates ?? []), update];
    const ok = await updateApplication(id, { status, status_updates });
    if (ok) setApplications(prev => prev.map(a => a.id === id ? { ...a, status, status_updates } : a));
  }

  async function handlePayFee(app: Application) {
    const ok = await updateApplication(app.id, {
      fee_payment_status: "paid",
      fee_paid_at: new Date().toISOString(),
      status_updates: [...(app.status_updates ?? []), { message: `Application fee paid: R${app.application_fee ?? 0}.`, at: new Date().toISOString(), by: "system" }],
    });
    if (ok) {
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, fee_payment_status: "paid", fee_paid_at: new Date().toISOString() } : a));
      setSelected(prev => prev?.id === app.id ? { ...prev, fee_payment_status: "paid", fee_paid_at: new Date().toISOString() } : prev);
      toast({ title: "Application fee marked paid" });
    }
  }

  async function handlePayInstitutionFee(appId: string) {
    const inst = institutionApps.find((a) => a.id === appId);
    if (!inst || !user) return;
    setPayingFeeId(appId);

    try {
      const reference = `fee_${appId}_${Date.now()}`;
      const paymentsServer = import.meta.env.VITE_PAYMENTS_SERVER_URL;

      if (paymentsServer) {
        // Try Stripe first
        try {
          const payments = await import("@/lib/payments");
          await payments.startStripeCheckout({
            kind: "application_fee",
            itemName: `${inst.institution_name} application fee`,
            amount: inst.application_fee,
            userId: user.id,
            email: user.email,
            name: user.email ?? "CareerPath User",
            reference,
            applicationId: appId,
          });
          return;
        } catch (stripeErr) {
          console.warn("Stripe fee checkout failed, trying Yoco:", stripeErr);
        }

        // Fallback to Yoco if Stripe fails
        const { isYocoConfigured, startYocoCheckout } = await import("@/lib/payments");
        if (isYocoConfigured()) {
          await startYocoCheckout({
            kind: "application_fee",
            itemName: `${inst.institution_name} application fee`,
            amount: inst.application_fee,
            userId: user.id,
            email: user.email,
            name: user.email ?? "CareerPath User",
            reference,
            applicationId: appId,
          });
          return;
        }
      }

      const ok = await markFeeAsPaid(appId);
      if (ok) {
        setInstitutionApps(prev => prev.map(a => a.id === appId ? { ...a, fee_payment_status: "paid", fee_paid_at: new Date().toISOString() } : a));
        toast({ title: "Institution fee marked paid!" });
      } else {
        toast({ title: "Failed to mark fee as paid", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Payment failed", description: String(err), variant: "destructive" });
    } finally {
      setPayingFeeId(null);
    }
  }

  async function handleDeleteInstitution(id: string) {
    if (!confirm("Remove this institution selection?")) return;
    const ok = await deleteInstitutionApplication(id);
    if (ok) {
      setInstitutionApps(prev => prev.filter(a => a.id !== id));
      toast({ title: "Institution removed" });
    }
  }

  async function handleToggleDoc(appId: string, docIndex: number, uploaded: boolean) {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    const docs = [...(app.documents ?? [])];
    docs[docIndex] = { ...docs[docIndex], uploaded };
    const ok = await updateApplication(appId, { documents: docs });
    if (ok) setApplications(prev => prev.map(a => a.id === appId ? { ...a, documents: docs } : a));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this submission request?")) return;
    const ok = await deleteApplication(id);
    if (ok) {
      setApplications(prev => prev.filter(a => a.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: "Submission request deleted" });
    }
  }

  const displayed = applications.filter(a => {
    if (filterType !== "All" && a.type !== filterType) return false;
    if (filterStatus !== "All" && a.status !== filterStatus) return false;
    return true;
  });

  const kanbanCols: Application["status"][] = ["todo", "in_progress", "submitted", "accepted"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-[#006B5E] border-t-transparent" />
          <p className="text-sm text-slate-500">Loading submission requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm flex-1 w-full">
          <div className="cp-section-label mb-2">Managed Submission Tracker</div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">My Submission Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Track the university, TVET, NSFAS, and bursary applications that are being prepared or submitted for you.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-[#006B5E] hover:bg-[#005548] text-white gap-2 shrink-0 w-full sm:w-auto text-sm">
          <Plus className="size-4" /> Add Request
        </Button>
      </div>

      {/* Professional Disclaimer */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex gap-3">
          <AlertCircle className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-amber-900 mb-1 text-sm">Important: CareerPath Services Disclaimer</p>
            <p className="text-xs sm:text-sm text-amber-800">
              CareerPath SA provides application support, guidance, and submission management services. While we strive for accuracy, actual admission outcomes, fees, deadlines, and requirements remain subject to each institution.
            </p>
          </div>
        </div>
      </div>

      {/* Institution Applications Section */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="cp-section-label mb-1">Selected Institutions</div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Universities & TVET Colleges</h2>
            <p className="text-sm text-slate-500 mt-1">Manage application fees for your selected institutions</p>
          </div>
        </div>

        {institutionApps.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-6 sm:p-8 text-center">
            <p className="text-slate-600 font-semibold">No institutions selected yet</p>
            <p className="text-sm text-slate-500 mt-1">Browse and select universities or TVET colleges to manage their application fees</p>
            <Button asChild className="mt-4 bg-[#006B5E] hover:bg-[#005548] text-white text-sm">
              <Link href="/universities">Browse Institutions</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {institutionApps.map((app) => (
              <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border p-3 sm:p-4 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#0F172A] truncate">{app.institution_name}</p>
                  <p className="text-sm text-slate-500">
                    {app.institution_type === "university" ? "🎓 University" : "🏫 TVET College"}
                    {app.programme ? ` • ${app.programme}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-[#0F172A] text-sm">R{app.application_fee.toLocaleString()}</p>
                    <p className={`text-xs font-semibold ${
                      app.fee_payment_status === "paid" 
                        ? "text-[#006B5E]" 
                        : app.fee_payment_status === "not_required"
                          ? "text-slate-500"
                          : "text-red-600"
                    }`}>
                      {app.fee_payment_status === "paid" ? "✓ Paid" : app.fee_payment_status === "not_required" ? "Free" : "Unpaid"}
                    </p>
                  </div>
                  {app.fee_payment_status === "unpaid" && (
                    <Button 
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                      onClick={() => handlePayInstitutionFee(app.id)}
                      disabled={payingFeeId === app.id}
                    >
                      {payingFeeId === app.id ? "Processing..." : "Pay"}
                    </Button>
                  )}
                  {app.fee_payment_status === "paid" && (
                    <CheckCircle2 className="size-5 text-[#006B5E] shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fee Summary Box */}
      {institutionApps.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span className="font-semibold">
              {institutionApps.filter(a => a.fee_payment_status === "unpaid").length} unpaid application fee(s): 
              R{institutionApps.filter(a => a.fee_payment_status === "unpaid").reduce((sum, a) => sum + a.application_fee, 0).toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E] w-full sm:w-auto"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="All">All Types</option>
          {APP_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E] w-full sm:w-auto"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <div className="flex gap-3 text-sm text-slate-500 items-center ml-auto">
          <span>{displayed.length} requests</span>
          <span className="cp-badge-primary">{applications.filter(a => a.status === "accepted").length} accepted</span>
        </div>
      </div>

      {/* Kanban Board - Horizontal scroll on mobile */}
      {displayed.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 sm:p-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 size-10 text-slate-200" />
          <p className="font-semibold text-[#0F172A]">No submission requests yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your first request or choose a university/funding option.</p>
          <Button onClick={() => setShowAdd(true)} className="mt-4 bg-[#006B5E] hover:bg-[#005548] text-white gap-2">
            <Plus className="size-4" /> Add Request
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile: List view */}
          <div className="sm:hidden grid gap-3">
            {displayed.map(app => {
              const statusDef = STATUSES.find(s => s.id === app.status)!;
              const daysLeft = app.deadline ? Math.ceil((new Date(app.deadline).getTime() - Date.now()) / 86400000) : null;
              const priority = PRIORITIES.find(p => p.id === app.priority);
              return (
                <div key={app.id} className="cp-card-hover p-4 cp-clickable" onClick={() => setSelected(app)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#0F172A] text-sm">{app.institution}</p>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{app.type}{app.programme ? ` · ${app.programme}` : ""}</p>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 shrink-0 ${statusDef.color}`}>{statusDef.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {priority && <span className={priority.color}>{priority.label}</span>}
                    {daysLeft !== null && (
                      <span className={`font-medium ${daysLeft <= 3 ? "text-red-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-400"}`}>
                        {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today!" : "Overdue"}
                      </span>
                    )}
                    {typeof app.application_fee === "number" && (
                      <span className={app.fee_payment_status === "paid" ? "text-[#006B5E]" : app.fee_payment_status === "not_required" ? "text-slate-500" : "text-red-600"}>
                        {app.fee_payment_status === "not_required" ? "R0" : app.fee_payment_status === "paid" ? "Paid" : `R${app.application_fee}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop: Kanban columns */}
          <div className="hidden sm:grid gap-4 grid-cols-2 xl:grid-cols-4">
            {kanbanCols.map(col => {
              const colApps = displayed.filter(a => a.status === col);
              const colDef = STATUSES.find(s => s.id === col)!;
              return (
                <div key={col} className="rounded-2xl border border-border bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colDef.color}`}>{colDef.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{colApps.length}</span>
                  </div>
                  <div className="grid gap-2 max-h-[500px] overflow-y-auto">
                    {colApps.map(app => {
                      const daysLeft = app.deadline ? Math.ceil((new Date(app.deadline).getTime() - Date.now()) / 86400000) : null;
                      const priority = PRIORITIES.find(p => p.id === app.priority);
                      return (
                        <div key={app.id} className="cp-card-hover p-4 cp-clickable"
                          onClick={() => setSelected(app)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0F172A] line-clamp-1">{app.institution}</p>
                              <p className="text-xs text-slate-500 capitalize mt-0.5">{app.type}{app.programme ? ` · ${app.programme}` : ""}</p>
                            </div>
                            {priority && <span className={`text-xs font-semibold ${priority.color} shrink-0`}>{priority.label}</span>}
                          </div>
                          {daysLeft !== null && (
                            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${daysLeft <= 3 ? "text-red-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-400"}`}>
                              <CalendarDays className="size-3" />
                              {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today!" : "Overdue"}
                            </div>
                          )}
                          {app.documents && app.documents.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                              <CheckCircle2 className="size-3" />
                              {app.documents.filter(d => d.uploaded).length}/{app.documents.length} docs
                            </div>
                          )}
                          {typeof app.application_fee === "number" && (
                            <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-xs">
                              <span className="font-semibold text-slate-600">Fee R{app.application_fee}</span>
                              <span className={app.fee_payment_status === "paid" ? "font-bold text-[#006B5E]" : app.fee_payment_status === "not_required" ? "font-bold text-slate-500" : "font-bold text-red-600"}>
                                {app.fee_payment_status === "not_required" ? "R0" : app.fee_payment_status === "paid" ? "Paid" : "Unpaid"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Other statuses (rejected / waitlisted) */}
      {displayed.some(a => ["rejected", "waitlisted"].includes(a.status)) && (
        <div>
          <h2 className="font-bold text-[#0F172A] mb-3 text-sm">Other Submission Requests</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {displayed.filter(a => ["rejected", "waitlisted"].includes(a.status)).map(app => {
              const statusDef = STATUSES.find(s => s.id === app.status)!;
              return (
                <div key={app.id} className="cp-card-hover p-4 cp-clickable" onClick={() => setSelected(app)}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-[#0F172A] text-sm">{app.institution}</p>
                      <p className="text-xs text-slate-500 capitalize">{app.type}</p>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 shrink-0 ${statusDef.color}`}>{statusDef.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border p-4 sm:p-6 sticky top-0 bg-white">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Add Submission Request</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 sm:p-6 grid gap-4">
              <div>
                <Label>Type *</Label>
                <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                  value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Application["type"] }))}>
                  {APP_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Institution / Provider *</Label>
                <Input className="mt-1.5 h-11" placeholder="e.g. University of Cape Town" value={form.institution}
                  onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
              </div>
              <div>
                <Label>Programme / Position</Label>
                <Input className="mt-1.5 h-11" placeholder="e.g. BSc Computer Science" value={form.programme}
                  onChange={e => setForm(f => ({ ...f, programme: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                    value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Application["status"] }))}>
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                    value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as "high" | "medium" | "low" }))}>
                    {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" className="mt-1.5 h-11" value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div>
                <Label>Application Fee</Label>
                <Input type="number" className="mt-1.5 h-11" placeholder="0 for NSFAS or no fee" value={form.application_fee}
                  onChange={e => setForm(f => ({ ...f, application_fee: e.target.value }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <textarea className="mt-1.5 w-full rounded-lg border border-border bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E] resize-none"
                  rows={3} placeholder="Additional notes…" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 text-xs sm:text-sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={saving || !form.institution} className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white text-xs sm:text-sm">
                  {saving ? "Saving..." : "Add Request"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex items-start justify-between border-b border-border p-4 sm:p-6 sticky top-0 bg-white">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">{selected.institution}</h2>
                <p className="text-sm text-slate-500 capitalize">{selected.type}{selected.programme ? ` · ${selected.programme}` : ""}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none shrink-0 ml-2">&times;</button>
            </div>
            <div className="p-4 sm:p-6 grid gap-5">
              {/* Status Update */}
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Update Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map(s => (
                    <button key={s.id} onClick={() => { handleStatusChange(selected.id, s.id); setSelected(prev => prev ? { ...prev, status: s.id } : null); }}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${selected.status === s.id ? `${s.color} border-current` : "border-border hover:border-slate-300"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { l: "Priority", v: selected.priority ?? "medium" },
                  { l: "Deadline", v: selected.deadline ?? "Not set" },
                  { l: "Amount", v: selected.amount ?? "—" },
                  { l: "Application Fee", v: `R${selected.application_fee ?? 0}` },
                  { l: "Fee Status", v: selected.fee_payment_status === "not_required" ? "R0 / Not required" : selected.fee_payment_status ?? "unpaid" },
                  { l: "Ref #", v: selected.reference_number ?? "—" },
                ].map(i => (
                  <div key={i.l} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">{i.l}</p>
                    <p className="font-bold text-[#0F172A] capitalize text-xs">{i.v}</p>
                  </div>
                ))}
              </div>

              {selected.fee_payment_status === "unpaid" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-blue-900 text-sm">Application fee unpaid</p>
                      <p className="text-sm text-blue-800">Pay R{selected.application_fee ?? 0} inside the app to clear this item.</p>
                    </div>
                    <Button onClick={() => handlePayFee(selected)} className="bg-[#006B5E] text-white hover:bg-[#005548] shrink-0 text-xs sm:text-sm">
                      <CreditCard className="mr-2 size-4" /> Pay
                    </Button>
                  </div>
                </div>
              )}

              {/* Documents */}
              {selected.documents && selected.documents.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] mb-2">
                    <CheckCircle2 className="inline mr-1 size-4 text-[#006B5E]" />
                    Documents ({selected.documents.filter(d => d.uploaded).length}/{selected.documents.length} ready)
                  </p>
                  <div className="grid gap-2">
                    {selected.documents.map((doc, idx) => (
                      <label key={doc.name} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" className="size-4 accent-[#006B5E] shrink-0" checked={doc.uploaded}
                          onChange={e => handleToggleDoc(selected.id, idx, e.target.checked)} />
                        <span className="text-sm text-slate-700 flex-1">{doc.name}</span>
                        {doc.required && <span className="text-xs text-red-500 shrink-0">Required</span>}
                        {doc.uploaded ? <CheckCircle2 className="size-4 text-[#006B5E] shrink-0" /> : <Circle className="size-4 text-slate-300 shrink-0" />}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] mb-1">Notes</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selected.notes}</p>
                </div>
              )}

              {selected.status_updates && selected.status_updates.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] mb-2">
                    <MessageSquareText className="inline mr-1 size-4 text-blue-600" />
                    Recent Updates
                  </p>
                  <div className="grid gap-2">
                    {selected.status_updates.slice(-4).reverse().map((update, idx) => (
                      <div key={`${update.at}-${idx}`} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-sm text-slate-700">{update.message}</p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(update.at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-xs sm:text-sm" onClick={() => handleDelete(selected.id)}>
                  <Trash2 className="size-4 mr-1" /> Delete
                </Button>
                <Button className="flex-1 bg-[#006B5E] hover:bg-[#005548] text-white text-xs sm:text-sm" onClick={() => setSelected(null)}>Done</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}