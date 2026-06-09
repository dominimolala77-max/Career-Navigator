import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CreditCard, FileUp, GraduationCap, LockKeyhole,
  ShieldCheck, Sparkles, AlertCircle, MapPin,
} from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { upsertProfile } from "@/lib/supabase-helpers";
import { SA_SUBJECTS } from "@/data/subjects";
import { CAREER_FIELDS, PERSONALITY_TYPES } from "@/data/careers";
import { PRICING_PLANS, formatRand, type PlanId } from "@/data/plans";
import { useToast } from "@/hooks/use-toast";
import { isRuralProvince } from "@/lib/location";

const PERSONALITY_QUESTIONS = [
  { id: "q1", question: "When solving a problem, you usually:", options: [{ value: "analytical", label: "Compare facts and data" }, { value: "creative", label: "Look for a fresh idea" }, { value: "social", label: "Ask people and collaborate" }, { value: "technical", label: "Test a practical solution" }] },
  { id: "q2", question: "In your spare time you enjoy:", options: [{ value: "analytical", label: "Reading, puzzles, or learning" }, { value: "creative", label: "Design, music, writing, or art" }, { value: "social", label: "Helping, volunteering, or team activities" }, { value: "outdoors", label: "Nature, sport, or hands-on projects" }] },
  { id: "q3", question: "The career field you prefer most is:", options: [{ value: "technical", label: "Technology, engineering, or trades" }, { value: "business", label: "Business, finance, or management" }, { value: "social", label: "Health, education, or community work" }, { value: "creative", label: "Media, design, or communication" }] },
  { id: "q4", question: "You feel most confident when you are:", options: [{ value: "analytical", label: "Solving a difficult question" }, { value: "business", label: "Planning money or leading a group" }, { value: "social", label: "Supporting someone else" }, { value: "technical", label: "Making something work" }] },
];

// Dynamic steps based on access tier
const getSteps = (isRural: boolean): string[] => {
  if (isRural) {
    // Rural users skip plan selection - they get free access
    return ["Details", "Documents", "Subjects", "Quiz", "Submit"];
  } else {
    // Urban users must select a paid plan
    return ["Plan", "Details", "Documents", "Subjects", "Quiz", "Submit"];
  }
};

const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape"];
const REQUIRED_DOCS = [
  { type: "id_front", label: "Certified ID - front" },
  { type: "id_back", label: "Certified ID - back" },
  { type: "results", label: "Matric certificate / latest report card" },
];

function detectPersonalityType(answers: Record<string, string>): string {
  const counts: Record<string, number> = {};
  Object.values(answers).forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "analytical";
}

function apsPoints(mark: number) {
  if (mark >= 80) return 7;
  if (mark >= 70) return 6;
  if (mark >= 60) return 5;
  if (mark >= 50) return 4;
  if (mark >= 40) return 3;
  if (mark >= 30) return 2;
  return mark > 0 ? 1 : 0;
}

function calcAps(subjects: Array<{ code: string; mark: number }>) {
  return subjects
    .filter((s) => s.code !== "LO")
    .reduce((sum, s) => sum + apsPoints(s.mark), 0);
}

export function OnboardingPage() {
  const { user, accessTier, locationData } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("standard");
  const [planPaid, setPlanPaid] = useState(false);
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState(locationData?.province ?? "");
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Array<{ name: string; code: string; mark: number }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [preferredFields, setPreferredFields] = useState<string[]>([]);
  const [fundingType, setFundingType] = useState("nsfas");

  // Determine if user is rural based on province
  const isRural = province ? isRuralProvince(province) : accessTier === "free";
  const STEPS = useMemo(() => getSteps(isRural), [isRural]);

  useEffect(() => {
    setSubjects(SA_SUBJECTS.slice(0, 7).map((s) => ({ name: s.name, code: s.code, mark: 0 })));
  }, []);

  const apsScore = useMemo(() => calcAps(subjects), [subjects]);
  const personalityType = useMemo(() => detectPersonalityType(answers), [answers]);
  const selectedPlanData = PRICING_PLANS.find((p) => p.id === selectedPlan)!;
  const docsReady = REQUIRED_DOCS.every((doc) => documents[doc.type]);

  function updateMark(code: string, mark: number) {
    setSubjects((prev) => prev.map((s) => s.code === code ? { ...s, mark: Math.max(0, Math.min(100, mark)) } : s));
  }

  function addSubject(subjectCode: string) {
    const found = SA_SUBJECTS.find((s) => s.code === subjectCode);
    if (found && !subjects.some((s) => s.code === found.code)) {
      setSubjects((prev) => [...prev, { name: found.name, code: found.code, mark: 0 }]);
    }
  }

  function toggleField(field: string) {
    setPreferredFields((prev) => prev.includes(field) ? prev.filter((x) => x !== field) : prev.length < 5 ? [...prev, field] : prev);
  }

  function canContinue() {
    const currentStep = STEPS[step];
    
    if (currentStep === "Plan") return Boolean(selectedPlan);
    if (currentStep === "Details") return fullName && idNumber && email && phone && province;
    if (currentStep === "Documents") return docsReady;
    if (currentStep === "Subjects") return subjects.filter((s) => s.mark > 0).length >= 6 && apsScore > 0;
    if (currentStep === "Quiz") return Object.keys(answers).length === PERSONALITY_QUESTIONS.length && preferredFields.length > 0;
    return true;
  }

  async function handleSubmit() {
    if (!user) return;
    setSaving(true);
    const now = new Date().toISOString();

    // Save a draft of the profile before payment
    const draft = {
      id: user.id,
      full_name: fullName,
      id_number: idNumber,
      email,
      phone,
      province,
      latitude: locationData?.latitude,
      longitude: locationData?.longitude,
      province_detected: locationData?.province,
      access_tier: isRural ? "free" : "paid",
      location_requested_at: locationData?.timestamp,
      subjects: subjects.map((s) => ({ ...s, aps_points: apsPoints(s.mark) })),
      aps_score: apsScore,
      certified_documents: REQUIRED_DOCS.map((doc) => ({
        type: doc.type,
        name: documents[doc.type],
        uploaded: Boolean(documents[doc.type]),
        uploaded_at: now,
      })),
      personality_answers: answers,
      personality_type: personalityType,
      preferred_fields: preferredFields,
      funding_type: fundingType,
      selected_plan: isRural ? "free" : selectedPlan,
      // For rural users: no payment needed. For urban users: unpaid until payment
      plan_payment_status: isRural ? "free" : "unpaid",
      onboarding_complete: isRural, // Rural users complete immediately, urban users need payment
      onboarding_step: step,
    };

    const saved = await upsertProfile(draft as any);
    setSaving(false);
    if (!saved) {
      toast({ title: "Could not save profile draft", variant: "destructive" });
      return;
    }

    // If profile already paid (unlikely), finalize immediately
    // Otherwise, start payment flow for the selected plan
    try {
      if (!selectedPlan) throw new Error("No plan selected");
      const reference = `onboard_${user.id}_${Date.now()}`;
      // prefer Stripe server when configured
      if (import.meta.env.VITE_PAYMENTS_SERVER_URL) {
        const payments = await import("@/lib/payments");
        await payments.startStripeCheckout({
          kind: "plan",
          itemName: PRICING_PLANS.find(p => p.id === selectedPlan)?.name || "Plan",
          amount: PRICING_PLANS.find(p => p.id === selectedPlan)?.price || 0,
          userId: user.id,
          email: email || undefined,
          name: fullName || email || "CareerPath User",
          reference,
          planId: selectedPlan,
        });
        // user will be redirected to Stripe Checkout; webhook will mark profile paid
        return;
      }

      // fallback to PayFast if configured
      if (import.meta.env.VITE_PAYFAST_MERCHANT_ID && import.meta.env.VITE_PAYFAST_MERCHANT_KEY) {
        const payments = await import("@/lib/payments");
        payments.startPayfastCheckout({
          kind: "plan",
          itemName: PRICING_PLANS.find(p => p.id === selectedPlan)?.name || "Plan",
          amount: PRICING_PLANS.find(p => p.id === selectedPlan)?.price || 0,
          userId: user.id,
          email: email || undefined,
          name: fullName || email || "CareerPath User",
          reference,
          planId: selectedPlan as any,
        } as any);
        return;
      }

      // no payment gateway configured: simulate and finalize
      const now2 = new Date().toISOString();
      const finalize = await upsertProfile({
        id: user.id,
        selected_plan: selectedPlan,
        plan_payment_status: "paid",
        plan_paid_at: now2,
        profile_submission_status: "submitted",
        profile_submitted_at: now2,
        onboarding_complete: true,
        onboarding_step: STEPS.length,
      } as any);
      if (finalize) {
        toast({ title: "Profile submitted for processing (simulated)", description: "No payment gateway configured; submission completed." });
        navigate("/dashboard");
      } else {
        toast({ title: "Could not finalize submission", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Payment failed to start", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[linear-gradient(180deg,#f8fbff_0%,#edf7f4_100%)] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="cp-section-label">Premium onboarding</div>
              <h1 className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">Submit your profile for managed applications</h1>
            </div>
            <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 sm:inline-flex">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {STEPS.map((name, i) => (
              <div key={name} className="min-w-0">
                <div className={cn("h-2 rounded-full transition-all", i <= step ? "bg-[#006B5E]" : "bg-slate-200")} />
                <p className={cn("mt-1 truncate text-[10px] font-semibold", i === step ? "text-[#006B5E]" : "text-slate-400")}>{name}</p>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm sm:p-7"
        >
          {STEPS[step] === "Plan" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box"><CreditCard className="size-5" /></div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F172A]">Choose your plan</h2>
                  <p className="text-sm text-slate-500">Select a CareerPath plan. You'll be charged after submitting your profile.</p>
                </div>
              </div>

              {/* Location-based messaging */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
                <MapPin className="size-5 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Location-based pricing</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Your location ({locationData?.province}) qualifies you for a {isRural ? "FREE" : "PAID"} plan.
                    {isRural && " Rural users get unlimited applications at no cost!"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {PRICING_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => { setSelectedPlan(plan.id); setPlanPaid(false); }}
                    className={cn("rounded-xl border p-4 text-left transition-all", selectedPlan === plan.id ? "border-[#006B5E] bg-[#E8F5F3] shadow-sm" : "border-border hover:border-blue-200")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-[#0F172A]">{plan.name}</h3>
                      {plan.id === "priority_unlimited" && <span className="cp-badge-blue">Best value</span>}
                    </div>
                    <p className="mt-2 text-3xl font-extrabold text-[#006B5E]">{formatRand(plan.price)}</p>
                    <p className="mt-1 text-xs text-slate-500">{plan.tagline}</p>
                    <div className="mt-3 grid gap-1 text-xs text-slate-700">
                      {plan.benefits.map((benefit) => <span key={benefit}>- {benefit}</span>)}
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0F172A]">Payment due today: {formatRand(selectedPlanData.price)}</p>
                    <p className="text-sm text-slate-600">Secure in-app payment simulation for the selected plan.</p>
                  </div>
                  <Button onClick={() => setPlanPaid(true)} className="bg-[#006B5E] text-white hover:bg-[#005548]">
                    {planPaid ? <><Check className="mr-2 size-4" /> Paid</> : "Pay plan"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {STEPS[step] === "Details" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box"><GraduationCap className="size-5" /></div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F172A]">Basic details</h2>
                  <p className="text-sm text-slate-500">These details are used by the admin team for application forms.</p>
                </div>
              </div>

              {/* Access tier messaging */}
              <div className={cn("rounded-xl border p-4 flex gap-3", isRural ? "border-[#006B5E]/30 bg-[#E8F5F3]" : "border-blue-200 bg-blue-50")}>
                <MapPin className={cn("size-5 shrink-0 mt-0.5", isRural ? "text-[#006B5E]" : "text-blue-600")} />
                <div>
                  <p className={cn("font-semibold", isRural ? "text-[#006B5E]" : "text-blue-900")}>
                    {isRural ? "✓ Free Rural Access" : "Urban Area - Paid Plan"}
                  </p>
                  <p className={cn("text-sm mt-1", isRural ? "text-[#006B5E]/70" : "text-blue-800")}>
                    {isRural 
                      ? "You qualify for free supported applications!" 
                      : "Your plan is active and covers supported applications."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Full Name *</Label><Input className="mt-1.5 h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div><Label>ID Number *</Label><Input className="mt-1.5 h-11" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} /></div>
                <div><Label>Email *</Label><Input className="mt-1.5 h-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Phone Number *</Label><Input className="mt-1.5 h-11" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div className="sm:col-span-2">
                  <Label>Province *</Label>
                  <select className="mt-1.5 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]" value={province} onChange={(e) => setProvince(e.target.value)}>
                    <option value="">Select province</option>
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {STEPS[step] === "Documents" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box"><FileUp className="size-5" /></div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F172A]">Upload certified documents</h2>
                  <p className="text-sm text-slate-500">Upload ID front and back plus your matric certificate or latest report card.</p>
                </div>
              </div>
              <div className="grid gap-3">
                {REQUIRED_DOCS.map((doc) => (
                  <label key={doc.type} className="flex cursor-pointer items-center gap-4 rounded-xl border border-border p-4 hover:bg-slate-50">
                    <div className={cn("grid size-10 place-items-center rounded-lg", documents[doc.type] ? "bg-[#E8F5F3] text-[#006B5E]" : "bg-slate-100 text-slate-400")}>
                      {documents[doc.type] ? <Check className="size-5" /> : <FileUp className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">{doc.label}</p>
                      <p className="truncate text-xs text-slate-500">{documents[doc.type] || "PDF, PNG, or JPG"}</p>
                    </div>
                    <input className="hidden" type="file" accept=".pdf,image/*" onChange={(e) => setDocuments((prev) => ({ ...prev, [doc.type]: e.target.files?.[0]?.name ?? "" }))} />
                  </label>
                ))}
              </div>
              <div className="flex gap-2 rounded-xl border border-[#006B5E]/20 bg-[#E8F5F3] p-4 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#006B5E]" />
                <p>POPIA notice: your documents and ID data must only be used for application processing, support, audit, and legal compliance.</p>
              </div>
            </div>
          )}

          {STEPS[step] === "Subjects" && (
            <div className="grid gap-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#006B5E]/20 bg-[#E8F5F3] p-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F172A]">Subjects and percentages</h2>
                  <p className="text-sm text-slate-500">APS is calculated automatically. Life Orientation is excluded.</p>
                </div>
                <p className="text-4xl font-extrabold text-[#006B5E]">{apsScore}</p>
              </div>
              <div className="grid gap-3">
                {subjects.map((subject) => (
                  <div key={subject.code} className="grid grid-cols-[1fr,88px] items-center gap-3 rounded-lg border border-border p-3">
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{subject.name}</p>
                    <Input type="number" min={0} max={100} className="h-10 text-center" value={subject.mark || ""} placeholder="%" onChange={(e) => updateMark(subject.code, Number(e.target.value))} />
                  </div>
                ))}
              </div>
              <select className="h-11 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]" onChange={(e) => { if (e.target.value) addSubject(e.target.value); e.currentTarget.value = ""; }}>
                <option value="">Add another subject</option>
                {SA_SUBJECTS.filter((s) => !subjects.some((x) => x.code === s.code)).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
          )}

          {STEPS[step] === "Quiz" && (
            <div className="grid gap-6">
              <div>
                <h2 className="text-lg font-extrabold text-[#0F172A]">Personality and study interests</h2>
                <p className="text-sm text-slate-500">These answers improve AI recommendations for careers, fields, universities, and TVET colleges.</p>
              </div>
              {PERSONALITY_QUESTIONS.map((q, index) => (
                <div key={q.id} className="grid gap-2">
                  <p className="text-sm font-bold text-[#0F172A]">{index + 1}. {q.question}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((option) => (
                      <button key={option.label} type="button" onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: option.value }))}
                        className={cn("rounded-lg border px-3 py-2.5 text-left text-sm transition-all", answers[q.id] === option.value ? "border-[#006B5E] bg-[#E8F5F3] font-semibold text-[#006B5E]" : "border-border hover:border-blue-200")}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <Label>Preferred field of study *</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CAREER_FIELDS.map((field) => (
                    <button key={field} type="button" onClick={() => toggleField(field)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", preferredFields.includes(field) ? "border-[#006B5E] bg-[#006B5E] text-white" : "border-border text-slate-600")}>{field}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Funding preference</Label>
                <select className="mt-1.5 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]" value={fundingType} onChange={(e) => setFundingType(e.target.value)}>
                  <option value="nsfas">NSFAS</option>
                  <option value="bursary">Bursaries</option>
                  <option value="self">Self / family funded</option>
                  <option value="unknown">Not sure yet</option>
                </select>
              </div>
            </div>
          )}

          {STEPS[step] === "Submit" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box"><Sparkles className="size-5" /></div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F172A]">Submit profile for processing</h2>
                  <p className="text-sm text-slate-500">After submission, the admin team takes over to complete your profile and handle university, NSFAS, bursary, and learnership applications.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Plan</p><p className="font-bold text-[#0F172A]">{isRural ? "Free Rural Access" : selectedPlanData.name}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">APS</p><p className="font-bold text-[#0F172A]">{apsScore}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Location</p><p className="font-bold text-[#0F172A]">{province}</p></div>
              </div>

              {/* Location-based access info */}
              <div className={cn("rounded-xl border p-4 flex gap-3", isRural ? "border-[#006B5E]/30 bg-[#E8F5F3]" : "border-blue-200 bg-blue-50")}>
                <MapPin className={cn("size-5 shrink-0 mt-0.5", isRural ? "text-[#006B5E]" : "text-blue-600")} />
                <div>
                  <p className={cn("font-semibold", isRural ? "text-[#006B5E]" : "text-blue-900")}>
                    {isRural ? "✓ You qualify for FREE supported applications" : "You have a PAID plan with priority support"}
                  </p>
                  <p className={cn("text-sm mt-1", isRural ? "text-[#006B5E]/70" : "text-blue-800")}>
                    {isRural 
                      ? "Unlimited applications at no additional cost. Your profile is ready to go!"
                      : "Your plan covers supported applications plus priority admin support."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-bold">Professional disclaimer</p>
                <p className="mt-1">CareerPath SA provides application support and recommendations. Admission, funding, bursary, and learnership outcomes remain subject to each institution or provider.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="flex items-center gap-2 font-bold"><LockKeyhole className="size-4" /> Security and POPIA</p>
                <p className="mt-1">Keep your login private. Personal information should be processed only for legitimate application services, status updates, support, and regulatory compliance.</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue()} className="gap-2 bg-[#006B5E] text-white hover:bg-[#005548]">
                Next <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving || (isRural && !planPaid && STEPS[step] === "Submit")} className="gap-2 bg-[#006B5E] text-white hover:bg-[#005548]">
                {saving ? "Submitting..." : <><Check className="size-4" /> {isRural ? "Complete Setup & Start" : "Submit for Processing"}</>}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
