import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CreditCard, FileUp, GraduationCap, LockKeyhole,
  ShieldCheck, Sparkles, AlertCircle, MapPin, Building2, Briefcase, X, Save,
} from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { upsertProfile, createInstitutionApplication } from "@/lib/supabase-helpers";
import { SA_SUBJECTS } from "@/data/subjects";
import { CAREER_FIELDS, matchCareers, type Career } from "@/data/careers";
import { PRICING_PLANS, formatRand, type PlanId } from "@/data/plans";
import { UNIVERSITIES, getInstitutionApplicationFee, type Institution } from "@/data/universities";
import { useToast } from "@/hooks/use-toast";
import { calcAps, apsPoints } from "@/lib/aps";
import { encryptDocumentMetadata } from "@/lib/document-storage";

const PERSONALITY_QUESTIONS = [
  { id: "q1", question: "When solving a problem, you usually:", options: [{ value: "analytical", label: "Compare facts and data" }, { value: "creative", label: "Look for a fresh idea" }, { value: "social", label: "Ask people and collaborate" }, { value: "technical", label: "Test a practical solution" }] },
  { id: "q2", question: "In your spare time you enjoy:", options: [{ value: "analytical", label: "Reading, puzzles, or learning" }, { value: "creative", label: "Design, music, writing, or art" }, { value: "social", label: "Helping, volunteering, or team activities" }, { value: "outdoors", label: "Nature, sport, or hands-on projects" }] },
  { id: "q3", question: "The career field you prefer most is:", options: [{ value: "technical", label: "Technology, engineering, or trades" }, { value: "business", label: "Business, finance, or management" }, { value: "social", label: "Health, education, or community work" }, { value: "creative", label: "Media, design, or communication" }] },
  { id: "q4", question: "You feel most confident when you are:", options: [{ value: "analytical", label: "Solving a difficult question" }, { value: "business", label: "Planning money or leading a group" }, { value: "social", label: "Supporting someone else" }, { value: "technical", label: "Making something work" }] },
];

type SelectedInstitution = {
  id: string;
  name: string;
  type: "university" | "tvet";
  fee: number;
  feeStatus: "paid" | "unpaid" | "not_required";
  programme?: string;
};

const getSteps = (isRural: boolean): string[] => {
  const base = ["Details", "Documents", "Subjects", "Quiz", "Careers", "Institutions"];
  if (isRural) return [...base, "Submit"];
  return [...base, "Plan", "Submit"];
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

function formatFeeLabel(name: string, fee: number | null): string {
  if (fee === 0 || fee === null) return `${name} – Free`;
  return `${name} – R${fee}`;
}

const ONBOARDING_STORAGE_KEY = "careerpath_onboarding";

function loadOnboardingDraft(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveOnboardingDraft(draft: Record<string, unknown>): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or unavailable – silently ignore
  }
}

function clearOnboardingDraft(): void {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

const onboardingDraft = loadOnboardingDraft();

export function OnboardingPage() {
  const { user, accessTier, locationData } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<number>(() => (onboardingDraft?.step as number) ?? 0);
  const [saving, setSaving] = useState(false);

  const isRural = accessTier === "free";
  const STEPS = useMemo(() => getSteps(isRural), [isRural]);
  const progressPercent = ((step + 1) / STEPS.length) * 100;

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(() => (onboardingDraft?.selectedPlan as PlanId) ?? "standard");
  const [planPaid, setPlanPaid] = useState(() => Boolean(onboardingDraft?.planPaid));
  const [fullName, setFullName] = useState(() => (onboardingDraft?.fullName as string) ?? "");
  const [idNumber, setIdNumber] = useState(() => (onboardingDraft?.idNumber as string) ?? "");
  const [email, setEmail] = useState(() => (onboardingDraft?.email as string) ?? (user?.email ?? ""));
  const [phone, setPhone] = useState(() => (onboardingDraft?.phone as string) ?? "");
  const [province, setProvince] = useState(() => (onboardingDraft?.province as string) ?? (locationData?.province ?? ""));
  const [documents, setDocuments] = useState<Record<string, string>>(() => (onboardingDraft?.documents as Record<string, string>) ?? {});
  const [subjects, setSubjects] = useState<Array<{ name: string; code: string; mark: number }>>(() => {
    const saved = onboardingDraft?.subjects as Array<{ name: string; code: string; mark: number }> | undefined;
    return saved && saved.length > 0 ? saved : SA_SUBJECTS.slice(0, 7).map((s) => ({ name: s.name, code: s.code, mark: 0 }));
  });
  const [answers, setAnswers] = useState<Record<string, string>>(() => (onboardingDraft?.answers as Record<string, string>) ?? {});
  const [preferredFields, setPreferredFields] = useState<string[]>(() => (onboardingDraft?.preferredFields as string[]) ?? []);
  const [fundingType, setFundingType] = useState(() => (onboardingDraft?.fundingType as string) ?? "nsfas");
  const [selectedInstitutions, setSelectedInstitutions] = useState<SelectedInstitution[]>(() => (onboardingDraft?.selectedInstitutions as SelectedInstitution[]) ?? []);
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);

  // Auto-save onboarding draft whenever form state changes
  useEffect(() => {
    saveOnboardingDraft({
      step,
      fullName,
      idNumber,
      email,
      phone,
      province,
      documents,
      subjects,
      answers,
      preferredFields,
      fundingType,
      selectedInstitutions,
      selectedPlan,
      planPaid,
    });
  }, [step, fullName, idNumber, email, phone, province, documents, subjects, answers, preferredFields, fundingType, selectedInstitutions, selectedPlan, planPaid]);

  useEffect(() => {
    if (locationData?.province && !province) {
      setProvince(locationData.province === "Lesotho" ? "Free State" : locationData.province);
    }
  }, [locationData, province]);

  const apsScore = useMemo(() => calcAps(subjects), [subjects]);
  const personalityType = useMemo(() => detectPersonalityType(answers), [answers]);
  const selectedPlanData = PRICING_PLANS.find((p) => p.id === selectedPlan)!;
  const docsReady = REQUIRED_DOCS.every((doc) => documents[doc.type]);

  const matchedCareers = useMemo(() => matchCareers({
    apsScore,
    subjects: subjects.map((s) => s.code),
    personalityType,
    preferredFields,
  }), [apsScore, subjects, personalityType, preferredFields]);

  const recommendedInstitutions = useMemo(() => {
    return UNIVERSITIES
      .filter((u) => {
        if (apsScore > 0 && u.minAps > apsScore + 5) return false;
        if (preferredFields.length) {
          const fieldMatch = u.programmes.some((p) =>
            preferredFields.some((f) => p.faculty.toLowerCase().includes(f.toLowerCase().split(" ")[0]))
          );
          if (!fieldMatch && u.type !== "tvet_college") return false;
        }
        return true;
      })
      .slice(0, 12);
  }, [apsScore, preferredFields]);

  function updateMark(code: string, mark: number) {
    setSubjects((prev) => prev.map((s) => s.code === code ? { ...s, mark: Math.max(0, Math.min(100, mark)) } : s));
  }

  function addSubject(subjectCode: string) {
    const found = SA_SUBJECTS.find((s) => s.code === subjectCode);
    if (found && !subjects.some((s) => s.code === found.code)) {
      setSubjects((prev) => [...prev, { name: found.name, code: found.code, mark: 0 }]);
    }
  }

  function removeSubject(subjectCode: string) {
    if (subjects.length <= 6) {
      toast({ title: "Minimum 6 subjects required", variant: "destructive" });
      return;
    }
    setSubjects((prev) => prev.filter((s) => s.code !== subjectCode));
  }

  function toggleField(field: string) {
    setPreferredFields((prev) => prev.includes(field) ? prev.filter((x) => x !== field) : prev.length < 5 ? [...prev, field] : prev);
  }

  function toggleInstitution(inst: Institution) {
    const fee = getInstitutionApplicationFee(inst) ?? 0;
    const type = inst.type === "tvet_college" ? "tvet" : "university";
    const exists = selectedInstitutions.find((s) => s.id === inst.id);
    if (exists) {
      setSelectedInstitutions((prev) => prev.filter((s) => s.id !== inst.id));
    } else {
      setSelectedInstitutions((prev) => [...prev, {
        id: inst.id,
        name: inst.name,
        type,
        fee,
        feeStatus: fee === 0 ? "not_required" : "unpaid",
      }]);
    }
  }

  async function handlePayInstitutionFee(instId: string) {
    const inst = selectedInstitutions.find((s) => s.id === instId);
    if (!inst || !user || inst.fee <= 0) return;
    setPayingFeeId(instId);

    try {
      const reference = `fee_${instId}_${user.id}_${Date.now()}`;
      const paymentsServer = import.meta.env.VITE_PAYMENTS_SERVER_URL;

      if (paymentsServer) {
        const { isYocoConfigured, startYocoCheckout } = await import("@/lib/payments");
        if (isYocoConfigured()) {
          try {
            await startYocoCheckout({
              kind: "application_fee",
              itemName: `${inst.name} application fee`,
              amount: inst.fee,
              userId: user.id,
              email: email || undefined,
              name: fullName || email || "CareerPath User",
              reference,
            });
            return;
          } catch (yocoErr) {
            console.warn("Yoco fee checkout failed, trying Stripe:", yocoErr);
          }
        }

        try {
          const payments = await import("@/lib/payments");
          await payments.startStripeCheckout({
            kind: "application_fee",
            itemName: `${inst.name} application fee`,
            amount: inst.fee,
            userId: user.id,
            email: email || undefined,
            name: fullName || email || "CareerPath User",
            reference,
          });
          return;
        } catch (stripeErr) {
          console.warn("Stripe fee checkout failed:", stripeErr);
        }
      }

      setSelectedInstitutions((prev) =>
        prev.map((s) => s.id === instId ? { ...s, feeStatus: "paid" } : s)
      );
      toast({ title: "Fee marked as paid", description: `${inst.name} – R${inst.fee}` });
    } catch (err) {
      toast({ title: "Payment failed", description: String(err), variant: "destructive" });
    } finally {
      setPayingFeeId(null);
    }
  }

  async function handlePayPlan() {
    if (!user || isRural) return;
    setSaving(true);
    try {
      const reference = `onboard_plan_${user.id}_${Date.now()}`;
      const paymentsServer = import.meta.env.VITE_PAYMENTS_SERVER_URL;

      if (paymentsServer) {
        const { isYocoConfigured, startYocoCheckout } = await import("@/lib/payments");
        if (isYocoConfigured()) {
          try {
            await startYocoCheckout({
              kind: "plan",
              itemName: selectedPlanData.name,
              amount: selectedPlanData.price,
              userId: user.id,
              email: email || undefined,
              name: fullName || email || "CareerPath User",
              reference,
              planId: selectedPlan,
            });
            return;
          } catch (yocoErr) {
            console.warn("Yoco plan checkout failed, trying Stripe:", yocoErr);
          }
        }

        try {
          const payments = await import("@/lib/payments");
          await payments.startStripeCheckout({
            kind: "plan",
            itemName: selectedPlanData.name,
            amount: selectedPlanData.price,
            userId: user.id,
            email: email || undefined,
            name: fullName || email || "CareerPath User",
            reference,
            planId: selectedPlan,
          });
          return;
        } catch (stripeErr) {
          console.warn("Stripe plan checkout failed:", stripeErr);
        }
      }

      if (import.meta.env.VITE_PAYFAST_MERCHANT_ID && import.meta.env.VITE_PAYFAST_MERCHANT_KEY) {
        const payments = await import("@/lib/payments");
        payments.startPayfastCheckout({
          kind: "plan",
          itemName: selectedPlanData.name,
          amount: selectedPlanData.price,
          userId: user.id,
          email: email || undefined,
          name: fullName || email || "CareerPath User",
          reference,
          planId: selectedPlan,
        } as Parameters<typeof payments.startPayfastCheckout>[0]);
        return;
      }
      setPlanPaid(true);
      toast({ title: "Plan payment simulated", description: "No payment gateway configured." });
    } catch (err) {
      toast({ title: "Payment failed to start", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function canContinue() {
    const currentStep = STEPS[step];
    if (currentStep === "Details") return fullName && idNumber && email && phone && province;
    if (currentStep === "Documents") return docsReady;
    if (currentStep === "Subjects") return subjects.filter((s) => s.mark > 0).length >= 6 && apsScore > 0;
    if (currentStep === "Quiz") return Object.keys(answers).length === PERSONALITY_QUESTIONS.length && preferredFields.length > 0;
    if (currentStep === "Careers") return preferredFields.length > 0;
    if (currentStep === "Institutions") return selectedInstitutions.length > 0;
    if (currentStep === "Plan") return Boolean(selectedPlan) && planPaid;
    return true;
  }

  async function handleSaveDraft() {
    if (!user) return;
    setSaving(true);
    const now = new Date().toISOString();

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
      access_tier: isRural ? "free" as const : "paid" as const,
      location_requested_at: locationData ? new Date(locationData.timestamp).toISOString() : now,
      subjects: subjects.map((s) => ({ ...s, aps_points: apsPoints(s.mark) })),
      aps_score: apsScore,
      certified_documents: REQUIRED_DOCS.map((doc) => ({
        type: doc.type,
        name: documents[doc.type],
        uploaded: Boolean(documents[doc.type]),
        uploaded_at: now,
        encrypted: documents[doc.type]?.startsWith("enc_v1:") ?? false,
      })),
      personality_answers: answers,
      personality_type: personalityType,
      preferred_fields: preferredFields,
      funding_type: fundingType,
      selected_plan: isRural ? "free" as const : selectedPlan,
      plan_payment_status: isRural ? "free" as const : (planPaid ? "paid" as const : "unpaid" as const),
      plan_paid_at: planPaid ? now : undefined,
      selected_universities: [...new Set(selectedInstitutions.filter((i) => i.type === "university").map((i) => ({ name: i.name, code: i.id })))],
      selected_tvet_colleges: [...new Set(selectedInstitutions.filter((i) => i.type === "tvet").map((i) => ({ name: i.name, code: i.id })))],
      profile_submission_status: "draft" as const,
      onboarding_complete: false,
      onboarding_step: step,
    };

    const saved = await upsertProfile(draft);

    setSaving(false);

    if (!saved) {
      toast({ title: "Could not save profile draft", variant: "destructive" });
      return;
    }

    toast({
      title: "Profile saved as draft!",
      description: "You can continue filling it out later.",
    });
  }

  async function handleSubmit() {
    if (!user) return;
    setSaving(true);
    const now = new Date().toISOString();

    const unpaidFees = selectedInstitutions
      .filter((i) => i.feeStatus === "unpaid" && i.fee > 0)
      .map((i) => ({ institution: i.name, amount: i.fee, status: "unpaid" }));

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
      access_tier: isRural ? "free" as const : "paid" as const,
      location_requested_at: locationData ? new Date(locationData.timestamp).toISOString() : now,
      subjects: subjects.map((s) => ({ ...s, aps_points: apsPoints(s.mark) })),
      aps_score: apsScore,
      certified_documents: REQUIRED_DOCS.map((doc) => ({
        type: doc.type,
        name: documents[doc.type],
        uploaded: Boolean(documents[doc.type]),
        uploaded_at: now,
        encrypted: documents[doc.type]?.startsWith("enc_v1:") ?? false,
      })),
      personality_answers: answers,
      personality_type: personalityType,
      preferred_fields: preferredFields,
      funding_type: fundingType,
      selected_plan: isRural ? "free" as const : selectedPlan,
      plan_payment_status: isRural ? "free" as const : (planPaid ? "paid" as const : "unpaid" as const),
      plan_paid_at: planPaid ? now : undefined,
      selected_universities: [...new Set(selectedInstitutions.filter((i) => i.type === "university").map((i) => ({ name: i.name, code: i.id })))],
      selected_tvet_colleges: [...new Set(selectedInstitutions.filter((i) => i.type === "tvet").map((i) => ({ name: i.name, code: i.id })))],
      unpaid_fees_summary: unpaidFees,
      profile_submission_status: "submitted" as const,
      profile_submitted_at: now,
      onboarding_complete: isRural || planPaid,
      onboarding_step: STEPS.length,
    };

    const saved = await upsertProfile(draft);

    if (saved && selectedInstitutions.length > 0) {
      await Promise.all(
        selectedInstitutions.map((inst) =>
          createInstitutionApplication(user.id, {
            institution_type: inst.type,
            institution_name: inst.name,
            application_fee: inst.fee,
            fee_payment_status: inst.feeStatus,
            fee_paid_at: inst.feeStatus === "paid" ? now : undefined,
            notes: `Selected during onboarding. ${inst.feeStatus === "unpaid" ? "UNPAID — flagged for admin." : "Fee settled."}`,
          })
        )
      );
    }

    setSaving(false);

    if (!saved) {
      toast({ title: "Could not save profile", variant: "destructive" });
      return;
    }

    clearOnboardingDraft();

    if (isRural) {
      toast({
        title: "Profile submitted!",
        description: unpaidFees.length
          ? `Submitted with ${unpaidFees.length} unpaid institution fee(s) — admin team notified.`
          : "Your profile is being processed by our team.",
      });
      navigate("/dashboard");
      return;
    }

    if (!planPaid) {
      toast({
        title: "Plan payment required",
        description: "Urban users must pay for a plan before final submission.",
        variant: "destructive",
      });
      setStep(STEPS.indexOf("Plan"));
      return;
    }

    toast({
      title: "Profile submitted for processing!",
      description: unpaidFees.length
        ? `Submitted with ${unpaidFees.length} unpaid fee(s) clearly marked for admin.`
        : "Our team will handle your applications.",
    });
    navigate("/dashboard");
  }

  async function handleDocumentUpload(docType: string, file: File | undefined) {
    if (!file || !user) return;
    try {
      const encrypted = await encryptDocumentMetadata(user.id, file.name, file.type);
      setDocuments((prev) => ({ ...prev, [docType]: encrypted }));
      toast({ title: "Document uploaded securely", description: "Encrypted under POPIA compliance." });
    } catch {
      setDocuments((prev) => ({ ...prev, [docType]: file.name }));
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[linear-gradient(180deg,#f8fbff_0%,#edf7f4_100%)] px-3 sm:px-4 py-4 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 sm:mb-6 rounded-2xl border border-white/80 bg-white/90 p-3 sm:p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="cp-section-label">Step-by-step onboarding</div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-extrabold text-[#0F172A]">Set up your CareerPath SA profile</h1>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-blue-700 shrink-0">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <Progress value={progressPercent} className="h-1.5 sm:h-2 mb-3" />
          {/* Mobile horizontal scroll for step indicators */}
          <div className="overflow-x-auto hide-scrollbar -mx-1 px-1">
            <div className="flex gap-1 sm:gap-0" style={{ minWidth: Math.max(STEPS.length * 70, 320) + "px" }}>
              {STEPS.map((name, i) => (
                <div key={name} className="flex-1 text-center min-w-0 px-0.5">
                  <div className={cn(
                    "mx-auto mb-1 grid size-5 sm:size-6 place-items-center rounded-full text-[8px] sm:text-[10px] font-bold",
                    i < step ? "bg-[#006B5E] text-white" : i === step ? "bg-[#006B5E] text-white ring-2 ring-[#006B5E]/30" : "bg-slate-200 text-slate-500"
                  )}>
                    {i < step ? <Check className="size-2.5 sm:size-3" /> : i + 1}
                  </div>
                  <p className={cn("truncate text-[7px] sm:text-[9px] lg:text-[10px] font-semibold", i === step ? "text-[#006B5E]" : "text-slate-400")}>{name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Access tier banner */}
        {step === 0 && (
          <div className={cn("mb-4 rounded-xl border p-3 sm:p-4 flex gap-3", isRural ? "border-[#006B5E]/30 bg-[#E8F5F3]" : "border-blue-200 bg-blue-50")}>
            <MapPin className={cn("size-4 sm:size-5 shrink-0 mt-0.5", isRural ? "text-[#006B5E]" : "text-blue-600")} />
            <div className="min-w-0">
              <p className={cn("font-semibold text-xs sm:text-sm", isRural ? "text-[#006B5E]" : "text-blue-900")}>
                GPS detected: {locationData?.province ?? "Unknown"} — {isRural ? "Free Rural Access" : "Paid Urban Plan Required"}
              </p>
              <p className={cn("text-xs mt-0.5", isRural ? "text-[#006B5E]/70" : "text-blue-800")}>
                {isRural
                  ? "Limpopo, Eastern Cape, or Lesotho — you qualify for full free support."
                  : "Urban/suburban area — select and pay for a plan before final submission."}
              </p>
            </div>
          </div>
        )}

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl border border-white/80 bg-white p-4 sm:p-5 lg:p-7 shadow-sm"
        >
          {STEPS[step] === "Details" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box shrink-0"><GraduationCap className="size-4 sm:size-5" /></div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Your details</h2>
                  <p className="text-sm text-slate-500">Full name, SA ID, email, phone, and province for application forms.</p>
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="sm:col-span-2 lg:col-span-1"><Label>Full Name *</Label><Input className="mt-1.5 h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div className="sm:col-span-2 lg:col-span-1"><Label>SA ID Number *</Label><Input className="mt-1.5 h-11" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={13} /></div>
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
                <div className="cp-icon-box shrink-0"><FileUp className="size-4 sm:size-5" /></div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Upload certified documents</h2>
                  <p className="text-sm text-slate-500">ID (front & back) and Matric certificate or latest report card.</p>
                </div>
              </div>
              <div className="grid gap-3">
                {REQUIRED_DOCS.map((doc) => (
                  <label key={doc.type} className="flex cursor-pointer items-center gap-3 sm:gap-4 rounded-xl border border-border p-3 sm:p-4 hover:bg-slate-50">
                    <div className={cn("grid size-9 sm:size-10 shrink-0 place-items-center rounded-lg", documents[doc.type] ? "bg-[#E8F5F3] text-[#006B5E]" : "bg-slate-100 text-slate-400")}>
                      {documents[doc.type] ? <Check className="size-4 sm:size-5" /> : <FileUp className="size-4 sm:size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">{doc.label}</p>
                      <p className="truncate text-xs text-slate-500">{documents[doc.type] ? "Uploaded & encrypted" : "PDF, PNG, or JPG"}</p>
                    </div>
                    <input className="hidden" type="file" accept=".pdf,image/*" onChange={(e) => void handleDocumentUpload(doc.type, e.target.files?.[0])} />
                  </label>
                ))}
              </div>
              <div className="flex gap-2 rounded-xl border border-[#006B5E]/20 bg-[#E8F5F3] p-3 sm:p-4 text-xs sm:text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#006B5E]" />
                <p>Documents are encrypted at upload. POPIA notice: data used only for application processing, support, audit, and legal compliance.</p>
              </div>
            </div>
          )}

          {STEPS[step] === "Subjects" && (
            <div className="grid gap-5">
              <div className="flex items-start sm:items-center justify-between gap-4 rounded-xl border border-[#006B5E]/20 bg-[#E8F5F3] p-3 sm:p-4">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Subjects and percentages</h2>
                  <p className="text-sm text-slate-500">APS calculated in real-time. Life Orientation excluded.</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] sm:text-xs font-bold uppercase text-[#006B5E]">APS Score</p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-[#006B5E]">{apsScore}</p>
                </div>
              </div>
              <div className="grid gap-3">
                {subjects.map((subject) => (
                  <div key={subject.code} className="grid grid-cols-[1fr,72px,36px,32px] sm:grid-cols-[1fr,88px,48px,36px] items-center gap-2 sm:gap-3 rounded-lg border border-border p-2 sm:p-3">
                    <p className="truncate text-xs sm:text-sm font-semibold text-[#0F172A]">{subject.name}</p>
                    <Input type="number" min={0} max={100} className="h-9 sm:h-10 text-center text-xs sm:text-sm" value={subject.mark || ""} placeholder="%" onChange={(e) => updateMark(subject.code, Number(e.target.value))} />
                    <span className="text-center text-[10px] sm:text-xs font-bold text-[#006B5E]">{subject.code !== "LO" && subject.mark > 0 ? apsPoints(subject.mark) : "—"}</span>
                    <button
                      type="button"
                      onClick={() => removeSubject(subject.code)}
                      className="flex size-7 sm:size-9 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove subject"
                    >
                      <X className="size-3 sm:size-4" />
                    </button>
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
                <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Personality & interests quiz</h2>
                <p className="text-sm text-slate-500">Short multiple-choice questions to improve AI career recommendations.</p>
              </div>
              {PERSONALITY_QUESTIONS.map((q, index) => (
                <div key={q.id} className="grid gap-2">
                  <p className="text-sm font-bold text-[#0F172A]">{index + 1}. {q.question}</p>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    {q.options.map((option) => (
                      <button key={option.label} type="button" onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: option.value }))}
                        className={cn("rounded-lg border px-3 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-all tap-target", answers[q.id] === option.value ? "border-[#006B5E] bg-[#E8F5F3] font-semibold text-[#006B5E]" : "border-border hover:border-blue-200")}>
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
                    <button key={field} type="button" onClick={() => toggleField(field)} className={cn("rounded-full border px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold tap-target", preferredFields.includes(field) ? "border-[#006B5E] bg-[#006B5E] text-white" : "border-border text-slate-600")}>{field}</button>
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

          {STEPS[step] === "Careers" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box shrink-0"><Briefcase className="size-4 sm:size-5" /></div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">AI career recommendations</h2>
                  <p className="text-sm text-slate-500">Based on your APS ({apsScore}), personality, and preferred fields.</p>
                </div>
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {matchedCareers.slice(0, 6).map((career: Career) => (
                  <div key={career.id} className="rounded-xl border border-border bg-slate-50 p-3 sm:p-4">
                    <p className="font-bold text-[#0F172A] text-sm">{career.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{career.field}</p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{career.description}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4 text-xs sm:text-sm text-blue-800">
                <Sparkles className="inline size-3 sm:size-4 mr-1" />
                Universities and TVET colleges are recommended in the next step based on these career matches.
              </div>
            </div>
          )}

          {STEPS[step] === "Institutions" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box shrink-0"><Building2 className="size-4 sm:size-5" /></div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Select universities & TVET colleges</h2>
                  <p className="text-sm text-slate-500">Choose institutions. Application fees shown clearly — pay directly in-app.</p>
                </div>
              </div>
              <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                {recommendedInstitutions.map((inst) => {
                  const fee = getInstitutionApplicationFee(inst);
                  const selected = selectedInstitutions.find((s) => s.id === inst.id);
                  const feeLabel = formatFeeLabel(inst.name, fee);
                  return (
                    <div key={inst.id} className={cn("rounded-xl border p-3 sm:p-4 transition-all", selected ? "border-[#006B5E] bg-[#E8F5F3]/50" : "border-border")}>
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => toggleInstitution(inst)} className="text-left flex-1 min-w-0">
                          <p className="font-bold text-[#0F172A] text-sm">{inst.name}</p>
                          <p className="text-xs sm:text-sm font-semibold text-[#006B5E] mt-1">{feeLabel}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{inst.province} · Min APS {inst.minAps}</p>
                        </button>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            className={selected ? "bg-[#006B5E] text-white text-xs" : "text-xs"}
                            onClick={() => toggleInstitution(inst)}
                          >
                            {selected ? <><Check className="size-3 mr-1" /> Selected</> : "Select"}
                          </Button>
                          {selected && fee !== null && fee > 0 && (
                            <div className="text-right">
                              <p className={cn("text-xs font-bold", selected.feeStatus === "paid" ? "text-[#006B5E]" : "text-red-600")}>
                                {selected.feeStatus === "paid" ? "✓ Paid" : "⚠ Unpaid"}
                              </p>
                              {selected.feeStatus !== "paid" && (
                                <Button
                                  size="sm"
                                  className="mt-1 h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                  disabled={payingFeeId === inst.id}
                                  onClick={() => void handlePayInstitutionFee(inst.id)}
                                >
                                  <CreditCard className="size-3 mr-1" />
                                  Pay R{fee}
                                </Button>
                              )}
                            </div>
                          )}
                          {selected && (fee === 0 || fee === null) && (
                            <span className="text-xs font-bold text-[#006B5E]">Free</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedInstitutions.length > 0 && (
                <div className="rounded-xl border border-border bg-slate-50 p-3 sm:p-4">
                  <p className="text-sm font-bold text-[#0F172A]">{selectedInstitutions.length} institution(s) selected</p>
                  <p className="text-xs text-slate-500 mt-1">
                    You can submit your profile even if some fees are unpaid — unpaid fees will be flagged for the admin team.
                  </p>
                </div>
              )}
            </div>
          )}

          {STEPS[step] === "Plan" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box shrink-0"><CreditCard className="size-4 sm:size-5" /></div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Choose your paid plan</h2>
                  <p className="text-sm text-slate-500">Urban users must select and pay before final submission.</p>
                </div>
              </div>
              <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
                {PRICING_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => { setSelectedPlan(plan.id); setPlanPaid(false); }}
                    className={cn("rounded-xl border p-3 sm:p-4 text-left transition-all", selectedPlan === plan.id ? "border-[#006B5E] bg-[#E8F5F3] shadow-sm" : "border-border hover:border-blue-200")}
                  >
                    <h3 className="font-extrabold text-[#0F172A] text-sm">{plan.name}</h3>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#006B5E]">{formatRand(plan.price)}</p>
                    <p className="mt-1 text-xs text-slate-500">{plan.tagline}</p>
                    <div className="mt-3 grid gap-1 text-xs text-slate-700">
                      {plan.benefits.map((b) => <span key={b}>- {b}</span>)}
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0F172A] text-sm">Payment due: {formatRand(selectedPlanData.price)}</p>
                    <p className="text-sm text-slate-600">Secure in-app payment via Stripe or PayFast.</p>
                  </div>
                  <Button onClick={() => void handlePayPlan()} disabled={saving || planPaid} className="h-11 bg-[#006B5E] text-white hover:bg-[#005548] w-full sm:w-auto text-sm">
                    {planPaid ? <><Check className="mr-2 size-4" /> Paid</> : saving ? "Processing…" : "Pay plan now"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {STEPS[step] === "Submit" && (
            <div className="grid gap-5">
              <div className="flex items-start gap-3">
                <div className="cp-icon-box shrink-0"><Sparkles className="size-4 sm:size-5" /></div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Submit profile for processing</h2>
                  <p className="text-sm text-slate-500">Our admin team takes over university, TVET, NSFAS, and bursary applications.</p>
                </div>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3 sm:p-4"><p className="text-xs text-slate-500">APS Score</p><p className="text-xl sm:text-2xl font-bold text-[#006B5E]">{apsScore}</p></div>
                <div className="rounded-xl bg-slate-50 p-3 sm:p-4"><p className="text-xs text-slate-500">Access</p><p className="text-sm font-bold text-[#0F172A]">{isRural ? "Free Rural" : selectedPlanData.name}</p></div>
                <div className="rounded-xl bg-slate-50 p-3 sm:p-4"><p className="text-xs text-slate-500">Institutions</p><p className="text-sm font-bold text-[#0F172A]">{selectedInstitutions.length}</p></div>
                <div className="rounded-xl bg-slate-50 p-3 sm:p-4"><p className="text-xs text-slate-500">Unpaid fees</p><p className="text-sm font-bold text-red-600">{selectedInstitutions.filter((i) => i.feeStatus === "unpaid" && i.fee > 0).length}</p></div>
              </div>
              {selectedInstitutions.length > 0 && (
                <div className="rounded-xl border border-border p-3 sm:p-4">
                  <p className="text-sm font-bold text-[#0F172A] mb-2">Selected institutions & fee status</p>
                  <div className="grid gap-2">
                    {selectedInstitutions.map((inst) => (
                      <div key={inst.id} className="flex justify-between text-sm gap-2">
                        <span className="truncate">{formatFeeLabel(inst.name, inst.fee)}</span>
                        <span className={cn("font-semibold shrink-0", inst.feeStatus === "paid" || inst.feeStatus === "not_required" ? "text-[#006B5E]" : "text-red-600")}>
                          {inst.feeStatus === "paid" ? "Paid" : inst.feeStatus === "not_required" ? "Free" : "Unpaid"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4 text-xs sm:text-sm text-amber-800">
                <p className="font-bold">Professional disclaimer</p>
                <p className="mt-1">CareerPath SA provides application support and recommendations. Admission, funding, and bursary outcomes remain subject to each institution or provider.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4 text-xs sm:text-sm text-blue-800">
                <p className="flex items-center gap-2 font-bold"><LockKeyhole className="size-4" /> Security and POPIA</p>
                <p className="mt-1">Personal information is encrypted and processed only for legitimate application services, status updates, support, and regulatory compliance.</p>
              </div>
            </div>
          )}

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border pt-4 sm:pt-5">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="gap-2 h-11 text-xs sm:text-sm">
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleSaveDraft()}
                disabled={saving || !fullName}
                className="gap-2 h-11 border-green-200 text-green-700 hover:bg-green-50 text-xs sm:text-sm"
              >
                <Save className="size-4" /> {saving ? "Saving…" : "Save Draft"}
              </Button>
            </div>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue()} className="gap-2 h-11 bg-[#006B5E] text-white hover:bg-[#005548] text-xs sm:text-sm">
                Next <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                onClick={() => void handleSubmit()}
                disabled={saving || (!isRural && !planPaid)}
                className="gap-2 h-11 bg-[#006B5E] text-white hover:bg-[#005548] text-xs sm:text-sm"
              >
                {saving ? "Submitting…" : <><Check className="size-4" /> Submit for Processing</>}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}