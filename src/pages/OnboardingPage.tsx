import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { upsertProfile } from "@/lib/supabase-helpers";
import { SA_SUBJECTS } from "@/data/subjects";
import { CAREER_FIELDS, PERSONALITY_TYPES } from "@/data/careers";
import { useToast } from "@/hooks/use-toast";

const EDUCATION_LEVELS = [
  { id: "high_school", label: "Currently in High School" },
  { id: "matric_passed", label: "Matric / Grade 12 Passed" },
  { id: "undergraduate", label: "Already in University/College" },
  { id: "working_adult", label: "Working Adult / Career Change" },
];

const FUNDING_OPTIONS = [
  { id: "nsfas", label: "NSFAS (Government Funding)" },
  { id: "bursary", label: "Looking for a Bursary" },
  { id: "self", label: "Self / Family Funded" },
  { id: "unknown", label: "Not Sure Yet" },
];

const PERSONALITY_QUESTIONS = [
  { id: "q1", question: "When solving a problem, you prefer to:", options: [{ value: "analytical", label: "Research facts and data carefully" }, { value: "creative", label: "Think of new, creative solutions" }, { value: "social", label: "Discuss with others and collaborate" }, { value: "technical", label: "Build or test a practical solution" }] },
  { id: "q2", question: "In your free time you enjoy:", options: [{ value: "analytical", label: "Reading, puzzles, or learning new things" }, { value: "creative", label: "Drawing, music, writing, or designing" }, { value: "social", label: "Volunteering, helping friends, or sports" }, { value: "outdoors", label: "Hiking, gardening, or outdoor activities" }] },
  { id: "q3", question: "Your ideal job would involve:", options: [{ value: "technical", label: "Working with tools, machines, or computers" }, { value: "business", label: "Running a team or making business decisions" }, { value: "social", label: "Helping or teaching people every day" }, { value: "analytical", label: "Research, analysis, or solving complex problems" }] },
  { id: "q4", question: "Which subjects did you enjoy most?", options: [{ value: "analytical", label: "Mathematics or Sciences" }, { value: "creative", label: "Arts, Drama, or Design" }, { value: "social", label: "History, English, or Languages" }, { value: "business", label: "Business Studies or Economics" }] },
  { id: "q5", question: "What motivates you most in life?", options: [{ value: "social", label: "Making a difference in people's lives" }, { value: "business", label: "Building wealth and financial success" }, { value: "analytical", label: "Discovering how things work" }, { value: "creative", label: "Expressing myself and being original" }] },
];

function detectPersonalityType(answers: Record<string, string>): string {
  const counts: Record<string, number> = {};
  Object.values(answers).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "analytical";
}

function calcAps(subjects: Array<{ mark: number; isLifeOrientation?: boolean }>): number {
  const scored = subjects.filter(s => !s.isLifeOrientation && s.mark > 0);
  return scored.reduce((sum, s) => {
    const m = s.mark;
    let pts = 0;
    if (m >= 80) pts = 7;
    else if (m >= 70) pts = 6;
    else if (m >= 60) pts = 5;
    else if (m >= 50) pts = 4;
    else if (m >= 40) pts = 3;
    else if (m >= 30) pts = 2;
    else pts = 1;
    return sum + pts;
  }, 0);
}

const STEPS = ["Your Profile", "Subjects & Results", "Personality", "Career Goals"];

const PROVINCES = ["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"];

export function OnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [race, setRace] = useState("");
  const [fullName, setFullName] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [province, setProvince] = useState("");
  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 state
  const [subjects, setSubjects] = useState<Array<{ name: string; code: string; mark: number }>>([]);
  const [apsScore, setApsScore] = useState(0);

  // Step 3 state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [personalityType, setPersonalityType] = useState("");

  // Step 4 state
  const [preferredFields, setPreferredFields] = useState<string[]>([]);
  const [fundingType, setFundingType] = useState("");
  const [saCitizen, setSaCitizen] = useState<boolean | null>(null);
  const [householdIncome, setHouseholdIncome] = useState("");

  useEffect(() => {
    const topSubjects = SA_SUBJECTS.slice(0, 6).map(s => ({ name: s.name, code: s.code, mark: 0 }));
    setSubjects(topSubjects);
  }, []);

  useEffect(() => {
    const nsscSubjects = subjects.map((s, i) => ({ ...s, isLifeOrientation: s.code === "LO", mark: s.mark, index: i }));
    setApsScore(calcAps(nsscSubjects));
  }, [subjects]);

  function updateMark(code: string, mark: number) {
    setSubjects(prev => prev.map(s => s.code === code ? { ...s, mark } : s));
  }

  function addSubject(subjectCode: string) {
    const found = SA_SUBJECTS.find(s => s.code === subjectCode);
    if (found && !subjects.find(s => s.code === subjectCode)) {
      setSubjects(prev => [...prev, { name: found.name, code: found.code, mark: 0 }]);
    }
  }

  function removeSubject(code: string) {
    setSubjects(prev => prev.filter(s => s.code !== code));
  }

  function toggleField(f: string) {
    setPreferredFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : prev.length < 5 ? [...prev, f] : prev);
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    const pt = detectPersonalityType(answers);
    setPersonalityType(pt);
    const ok = await upsertProfile({
      id: user.id,
      full_name: fullName,
      race,
      province,
      grade,
      education_level: educationLevel,
      phone,
      subjects: subjects.map(s => ({ ...s, aps_points: 0 })),
      aps_score: apsScore,
      personality_answers: answers,
      personality_type: pt,
      preferred_fields: preferredFields,
      funding_type: fundingType,
      sa_citizen: saCitizen ?? undefined,
      household_income: householdIncome,
      onboarding_complete: true,
      onboarding_step: 4,
    });
    setSaving(false);
    if (ok) {
      toast({ title: "Profile complete! Welcome to CareerPath SA 🎉" });
      navigate("/dashboard");
    } else {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className={cn("grid size-8 place-items-center rounded-full border-2 text-sm font-bold transition-all",
                  i < step ? "border-[#006B5E] bg-[#006B5E] text-white" :
                  i === step ? "border-[#006B5E] bg-white text-[#006B5E]" :
                  "border-slate-200 bg-white text-slate-400")}>
                  {i < step ? <Check className="size-4" /> : i + 1}
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", i === step ? "text-[#006B5E]" : "text-slate-400")}>{s}</span>
              </div>
            ))}
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-[#006B5E] transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500 text-right">Step {step + 1} of {STEPS.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          {/* Step 1 — Profile */}
          {step === 0 && (
            <div className="grid gap-5">
              <div>
                <div className="cp-icon-box mb-3 size-12 rounded-xl"><GraduationCap className="size-6" /></div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">Tell us about yourself</h2>
                <p className="mt-1 text-sm text-slate-500">Provide your basic details to help us personalise your experience.</p>
              </div>

              <div>
                <Label>Full Name *</Label>
                <Input className="mt-1.5 h-11" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>

              <div>
                <Label>Population Group / Ethnicity</Label>
                <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                  value={race} onChange={e => setRace(e.target.value)}>
                  <option value="">Select (optional)</option>
                  <option value="Black African">Black African</option>
                  <option value="Colored">Colored</option>
                  <option value="Indian/Asian">Indian/Asian</option>
                  <option value="White">White</option>
                  <option value="Other">Other</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">Used for bursary and equity opportunity matching.</p>
              </div>

              <div>
                <Label>Education Level *</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {EDUCATION_LEVELS.map(l => (
                    <button key={l.id} type="button" onClick={() => setEducationLevel(l.id)}
                      className={cn("rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                        educationLevel === l.id ? "border-[#006B5E] bg-[#E8F5F3] text-[#006B5E]" : "border-border hover:border-slate-300")}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Province</Label>
                <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                  value={province} onChange={e => setProvince(e.target.value)}>
                  <option value="">Select province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Current Grade / Year</Label>
                  <Input className="mt-1.5 h-11" placeholder="e.g. Grade 12, 1st year" value={grade} onChange={e => setGrade(e.target.value)} />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input className="mt-1.5 h-11" placeholder="+27 81 234 5678" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Subjects & Marks */}
          {step === 1 && (
            <div className="grid gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">Your Subjects & Results</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your marks (0–100%) for each subject. Your APS will be calculated automatically.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#006B5E]/20 bg-[#E8F5F3] px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Calculated APS Score</p>
                  <p className="text-xs text-slate-500">Based on your marks (excl. Life Orientation)</p>
                </div>
                <p className="text-4xl font-extrabold text-[#006B5E]">{apsScore}</p>
              </div>

              <div className="grid gap-3">
                {subjects.map(s => (
                  <div key={s.code} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{s.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={100}
                        className="h-9 w-20 text-center"
                        placeholder="%"
                        value={s.mark || ""}
                        onChange={e => updateMark(s.code, Number(e.target.value))}
                      />
                      <button type="button" onClick={() => removeSubject(s.code)}
                        className="text-slate-300 hover:text-red-500 text-lg leading-none">×</button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Label>Add another subject</Label>
                <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                  onChange={e => { if (e.target.value) addSubject(e.target.value); e.target.value = ""; }}>
                  <option value="">+ Select subject to add…</option>
                  {SA_SUBJECTS.filter(s => !subjects.find(x => x.code === s.code)).map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3 — Personality */}
          {step === 2 && (
            <div className="grid gap-6">
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">Discover your personality type</h2>
                <p className="mt-1 text-sm text-slate-500">Answer these 5 questions to help us match you to the right careers.</p>
              </div>
              {PERSONALITY_QUESTIONS.map((q, qi) => (
                <div key={q.id} className="grid gap-2">
                  <p className="text-sm font-semibold text-[#0F172A]">{qi + 1}. {q.question}</p>
                  <div className="grid gap-2">
                    {q.options.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                        className={cn("rounded-lg border px-4 py-2.5 text-left text-sm transition-all",
                          answers[q.id] === opt.value ? "border-[#006B5E] bg-[#E8F5F3] text-[#006B5E] font-semibold" : "border-border hover:border-slate-300")}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(answers).length === PERSONALITY_QUESTIONS.length && (
                <div className="rounded-xl border border-[#006B5E]/20 bg-[#E8F5F3] px-5 py-4">
                  <p className="text-sm font-semibold text-[#006B5E]">
                    Your type: <span className="capitalize">{PERSONALITY_TYPES.find(p => p.id === detectPersonalityType(answers))?.label ?? ""}
                    {" "}{PERSONALITY_TYPES.find(p => p.id === detectPersonalityType(answers))?.icon}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{PERSONALITY_TYPES.find(p => p.id === detectPersonalityType(answers))?.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Goals */}
          {step === 3 && (
            <div className="grid gap-5">
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">Your Career Goals</h2>
                <p className="mt-1 text-sm text-slate-500">Choose up to 5 fields you're interested in and your funding preference.</p>
              </div>

              <div>
                <Label>Fields of interest (select up to 5) *</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CAREER_FIELDS.map(f => (
                    <button key={f} type="button" onClick={() => toggleField(f)}
                      className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        preferredFields.includes(f) ? "border-[#006B5E] bg-[#006B5E] text-white" : "border-border hover:border-slate-300")}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>How do you plan to fund your studies? *</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {FUNDING_OPTIONS.map(f => (
                    <button key={f.id} type="button" onClick={() => setFundingType(f.id)}
                      className={cn("rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                        fundingType === f.id ? "border-[#006B5E] bg-[#E8F5F3] text-[#006B5E]" : "border-border hover:border-slate-300")}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Are you a South African citizen or permanent resident?</Label>
                <div className="mt-2 flex gap-3">
                  {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(opt => (
                    <button key={String(opt.v)} type="button" onClick={() => setSaCitizen(opt.v)}
                      className={cn("flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                        saCitizen === opt.v ? "border-[#006B5E] bg-[#E8F5F3] text-[#006B5E]" : "border-border hover:border-slate-300")}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              {fundingType === "nsfas" && (
                <div>
                  <Label>Approximate combined household income (ZAR/year)</Label>
                  <Input className="mt-1.5 h-11" placeholder="e.g. 150000" value={householdIncome} onChange={e => setHouseholdIncome(e.target.value)} />
                  <p className="mt-1 text-xs text-slate-400">NSFAS threshold: household income below R350,000/year</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-2">
              <ArrowLeft className="size-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} className="bg-[#006B5E] hover:bg-[#005548] text-white gap-2">
                Next <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving} className="bg-[#006B5E] hover:bg-[#005548] text-white gap-2">
                {saving ? "Saving…" : <><Check className="size-4" /> Complete Profile</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
