import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, Save, User } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProfile, updateProfile, type Profile } from "@/lib/supabase-helpers";
import { CAREER_FIELDS, PERSONALITY_TYPES } from "@/data/careers";
import { useToast } from "@/hooks/use-toast";

const SA_PROVINCES = ["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"];

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "preferences">("personal");

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [race, setRace] = useState("");
  const [province, setProvince] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [grade, setGrade] = useState("");
  const [saCitizen, setSaCitizen] = useState<boolean | null>(null);
  const [householdIncome, setHouseholdIncome] = useState("");
  const [fundingType, setFundingType] = useState("");
  const [preferredFields, setPreferredFields] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(p => {
      if (p) {
        setProfile(p);
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
        setRace(p.race ?? "");
        setProvince(p.province ?? "");
        setAddress(p.address ?? "");
        setCity(p.city ?? "");
        setPostalCode(p.postal_code ?? "");
        setEducationLevel(p.education_level ?? "");
        setGrade(p.grade ?? "");
        setSaCitizen(p.sa_citizen ?? null);
        setHouseholdIncome(p.household_income ?? "");
        setFundingType(p.funding_type ?? "");
        setPreferredFields(p.preferred_fields ?? []);
      }
      setLoading(false);
    });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const ok = await updateProfile(user.id, {
      full_name: fullName, phone, race,
      province, address, city, postal_code: postalCode,
      education_level: educationLevel, grade,
      sa_citizen: saCitizen ?? undefined,
      household_income: householdIncome,
      funding_type: fundingType,
      preferred_fields: preferredFields,
    });
    setSaving(false);
    if (ok) toast({ title: "Profile updated!" });
    else toast({ title: "Failed to save", variant: "destructive" });
  }

  function toggleField(f: string) {
    setPreferredFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : prev.length < 5 ? [...prev, f] : prev);
  }

  const personalityLabel = profile?.personality_type ? PERSONALITY_TYPES.find(p => p.id === profile.personality_type) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-10 animate-spin rounded-full border-4 border-[#006B5E] border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: "personal" as const, label: "Personal Details" },
    { id: "academic" as const, label: "Academic" },
    { id: "preferences" as const, label: "Preferences" },
  ];

  return (
    <div className="grid gap-6 max-w-2xl">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-[#E8F5F3] text-[#006B5E]">
            <User className="size-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A]">{fullName || "Your Profile"}</h1>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile?.aps_score ? <span className="cp-badge-amber">APS {profile.aps_score}</span> : null}
              {personalityLabel && <span className="cp-badge-blue">{personalityLabel.icon} {personalityLabel.label}</span>}
              {profile?.onboarding_complete
                ? <span className="cp-badge-primary"><GraduationCap className="size-3" /> Profile Complete</span>
                : <span className="cp-badge-amber">Profile Incomplete</span>}
            </div>
          </div>
        </div>

        {!profile?.onboarding_complete && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800 flex-1">Your onboarding is not complete. Finish it for personalised recommendations.</p>
            <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white shrink-0">
              <Link href="/onboarding">Complete <ArrowRight className="ml-1 size-3" /></Link>
            </Button>
          </div>
        )}
      </div>

      {/* APS Card */}
      {profile?.aps_score && profile.aps_score > 0 && (
        <div className="rounded-2xl border border-[#006B5E]/20 bg-[#E8F5F3] p-5">
          <h2 className="font-bold text-[#0F172A] mb-3">Your APS Score</h2>
          <div className="flex items-center gap-4">
            <p className="text-5xl font-extrabold text-[#006B5E]">{profile.aps_score}</p>
            <div>
              <p className="text-sm text-slate-600">out of 42 points</p>
              <p className="text-xs text-slate-500 mt-1">
                {profile.aps_score >= 40 ? "Excellent — qualifies for Medicine, Law, Engineering" :
                 profile.aps_score >= 35 ? "Strong — qualifies for most degree programmes" :
                 profile.aps_score >= 28 ? "Good — qualifies for many degrees and diplomas" :
                 profile.aps_score >= 22 ? "Moderate — qualifies for diplomas and some degrees" :
                 "You may benefit from foundation programmes or TVET"}
              </p>
            </div>
          </div>
          {profile.subjects && Array.isArray(profile.subjects) && profile.subjects.length > 0 && (
            <div className="mt-4 grid gap-1">
              {(profile.subjects as Array<{ name: string; mark: number }>).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{s.name}</span>
                  <span className="font-semibold text-[#0F172A]">{s.mark}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.id ? "border-[#006B5E] text-[#006B5E]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {/* Personal Tab */}
        {activeTab === "personal" && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input className="mt-1.5 h-11" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1.5 h-11" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Population Group / Ethnicity</Label>
              <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                value={race} onChange={e => setRace(e.target.value)}>
                <option value="">Select…</option>
                <option value="Black African">Black African</option>
                <option value="Colored">Colored</option>
                <option value="Indian/Asian">Indian/Asian</option>
                <option value="White">White</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label>Province</Label>
              <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                value={province} onChange={e => setProvince(e.target.value)}>
                <option value="">Select province</option>
                {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Street Address</Label>
              <Input className="mt-1.5 h-11" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>City</Label>
                <Input className="mt-1.5 h-11" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input className="mt-1.5 h-11" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Academic Tab */}
        {activeTab === "academic" && (
          <div className="grid gap-4">
            <div>
              <Label>Education Level</Label>
              <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                value={educationLevel} onChange={e => setEducationLevel(e.target.value)}>
                <option value="">Select…</option>
                <option value="high_school">Currently in High School</option>
                <option value="matric_passed">Matric / Grade 12 Passed</option>
                <option value="undergraduate">Already in University/College</option>
                <option value="working_adult">Working Adult / Career Change</option>
              </select>
            </div>
            <div>
              <Label>Current Grade / Year</Label>
              <Input className="mt-1.5 h-11" value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. Grade 12, 2nd year" />
            </div>
            <div>
              <Label>SA Citizen or Permanent Resident?</Label>
              <div className="mt-2 flex gap-3">
                {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(opt => (
                  <button key={String(opt.v)} type="button" onClick={() => setSaCitizen(opt.v)}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${saCitizen === opt.v ? "border-[#006B5E] bg-[#E8F5F3] text-[#006B5E]" : "border-border hover:border-slate-300"}`}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Household Income (ZAR/year)</Label>
              <Input type="number" className="mt-1.5 h-11" value={householdIncome} onChange={e => setHouseholdIncome(e.target.value)} placeholder="e.g. 150000" />
              <p className="mt-1 text-xs text-slate-400">Used to check NSFAS eligibility (threshold: R350,000)</p>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <div className="grid gap-5">
            <div>
              <Label>Funding Preference</Label>
              <select className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]"
                value={fundingType} onChange={e => setFundingType(e.target.value)}>
                <option value="">Select…</option>
                <option value="nsfas">NSFAS</option>
                <option value="bursary">Bursary</option>
                <option value="self">Self / Family Funded</option>
                <option value="unknown">Not Sure</option>
              </select>
            </div>
            <div>
              <Label>Fields of Interest (select up to 5)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CAREER_FIELDS.map(f => (
                  <button key={f} type="button" onClick={() => toggleField(f)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${preferredFields.includes(f) ? "border-[#006B5E] bg-[#006B5E] text-white" : "border-border hover:border-slate-300"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {personalityLabel && (
              <div className="rounded-xl border border-[#006B5E]/20 bg-[#E8F5F3] p-4">
                <p className="font-semibold text-[#006B5E]">Personality Type: {personalityLabel.icon} {personalityLabel.label}</p>
                <p className="text-sm text-slate-600 mt-0.5">{personalityLabel.description}</p>
                <p className="text-xs text-slate-400 mt-2">Retake personality quiz by <Link href="/onboarding"><a className="underline">redoing onboarding</a></Link></p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
          <Button onClick={handleSave} disabled={saving} className="bg-[#006B5E] hover:bg-[#005548] text-white gap-2">
            <Save className="size-4" /> {saving ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-800 mb-1">Account Actions</p>
        <p className="text-sm text-red-700 mb-4">Sign out of your account. Deleting your account will remove all data in accordance with POPIA.</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" onClick={() => signOut()}>Sign Out</Button>
        </div>
      </div>
    </div>
  );
}
