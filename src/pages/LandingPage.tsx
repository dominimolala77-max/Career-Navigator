import { ArrowRight, BookOpen, Briefcase, CheckCircle2, GraduationCap, Search, Shield, Star, Users, Wallet } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";

const FEATURES = [
  { icon: Search, title: "Smart Career Matching", description: "Answer a few questions about yourself and get personalised career recommendations based on your APS, subjects, and personality.", color: "bg-[#E8F5F3] text-[#006B5E]" },
  { icon: GraduationCap, title: "University & TVET Guide", description: "Browse all 26 South African public universities and TVET colleges. Filter by province, APS, and field of study.", color: "bg-blue-50 text-blue-700" },
  { icon: Wallet, title: "NSFAS & Bursaries", description: "Check NSFAS eligibility, gather required details, and discover bursaries matched to your profile.", color: "bg-amber-50 text-amber-700" },
  { icon: Briefcase, title: "Learnerships & Internships", description: "Find learnerships, internships, apprenticeships, and graduate programmes matched to your profile.", color: "bg-purple-50 text-purple-700" },
  { icon: BookOpen, title: "Managed Applications", description: "Track every university, NSFAS, bursary, and opportunity submission we manage for you.", color: "bg-rose-50 text-rose-700" },
  { icon: Shield, title: "Secure & Compliant", description: "Your data is protected under the POPI Act and securely stored.", color: "bg-slate-50 text-slate-700" },
];

const MANAGED_FEATURES = [
  { icon: Search, title: "Smart Career Matching", description: "Answer a few questions about yourself and get personalised recommendations based on your APS, subjects, and personality.", color: "bg-[#E8F5F3] text-[#006B5E]" },
  { icon: GraduationCap, title: "University & TVET Guide", description: "Browse South African universities and TVET colleges, then see the options that fit your course goals and profile.", color: "bg-blue-50 text-blue-700" },
  { icon: Wallet, title: "NSFAS & Bursaries", description: "Check NSFAS eligibility, gather required details, and discover bursaries matched to your profile.", color: "bg-amber-50 text-amber-700" },
  { icon: Briefcase, title: "Learnerships & Internships", description: "Find learnerships, internships, apprenticeships, and graduate programmes matched to your profile.", color: "bg-purple-50 text-purple-700" },
  { icon: BookOpen, title: "Managed Applications", description: "Complete your profile, choose your options, and track the university, NSFAS, and bursary applications we submit for you.", color: "bg-rose-50 text-rose-700" },
  { icon: Shield, title: "Secure & Compliant", description: "Your data is protected under the POPI Act and securely stored.", color: "bg-slate-50 text-slate-700" },
];

const STEPS = [
  { number: "01", title: "Create your account", description: "Sign up in seconds using your email." },
  { number: "02", title: "Build your profile", description: "Add your country, subjects, APS score, personality, and career goals." },
  { number: "03", title: "Get recommendations", description: "Receive personalised career paths, universities, and funding matches." },
  { number: "04", title: "We submit for you", description: "Track managed submissions, statuses, and deadlines without applying by yourself." },
];

const MANAGED_STEPS = [
  { number: "01", title: "Create your account", description: "Sign up in seconds using your email." },
  { number: "02", title: "Build your profile", description: "Add your personal details, subjects, APS score, personality quiz, and career goals." },
  { number: "03", title: "Get recommendations", description: "Receive personalised course, university, and funding matches based on your profile." },
  { number: "04", title: "We submit for you", description: "Select your preferred options, track statuses, and let our team handle university and NSFAS submissions." },
];

const STATS = [
  { value: "26", label: "SA Universities" },
  { value: "15+", label: "Open Bursaries" },
  { value: "25+", label: "Career Paths" },
  { value: "12+", label: "Opportunities" },
];

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#006B5E]/20 bg-[#E8F5F3] px-4 py-1.5 text-sm font-semibold text-[#006B5E]">
                <Star className="size-4" />
                For anyone studying in South Africa
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
                Your Career Journey<br />
                <span className="text-[#006B5E]">Starts Here</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-slate-600">
                CareerPath SA helps students complete profiles, answer personality quizzes, choose study paths, and get matched to universities while our team manages university and NSFAS submissions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {user ? (
                  <Button asChild size="lg" className="bg-[#006B5E] hover:bg-[#005548] text-white h-12 px-7">
                    <Link href="/dashboard">Go to Dashboard <ArrowRight className="ml-2 size-4" /></Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="bg-[#006B5E] hover:bg-[#005548] text-white h-12 px-7">
                      <Link href="/signup">Choose a Plan <ArrowRight className="ml-2 size-4" /></Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 px-7 border-slate-300">
                      <Link href="/login">Log In</Link>
                    </Button>
                  </>
                )}
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Paid managed service from R249 once your account is created. Secure under POPIA.
              </p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-white p-6 shadow-sm text-center">
                  <p className="text-4xl font-extrabold text-[#006B5E]">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{stat.label}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-2xl border border-[#006B5E]/20 bg-[#E8F5F3] p-5">
                <div className="flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#006B5E] text-white">
                    <Users className="size-6" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0F172A]">Helping students everywhere</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Whether you're from SA or anywhere else in the world — get career guidance matched to the South African education system.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="cp-section-label">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#0F172A] sm:text-4xl">
              From confusion to clarity in 4 steps
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {MANAGED_STEPS.map((step) => (
              <div key={step.number} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <p className="text-4xl font-extrabold text-[#006B5E]/20">{step.number}</p>
                <h3 className="mt-3 font-bold text-[#0F172A]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="cp-section-label">Everything you need</p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#0F172A] sm:text-4xl">
              One app for your entire career journey
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MANAGED_FEATURES.map((f) => (
              <div key={f.title} className="cp-card-hover p-6">
                <div className={`cp-icon-box size-12 rounded-xl ${f.color}`}>
                  <f.icon className="size-6" />
                </div>
                <h3 className="mt-4 font-bold text-[#0F172A]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPIA / Disclaimer */}
      <section className="border-t border-border bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-4">
              <Shield className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">Important Disclaimer</p>
                <p className="mt-1 text-sm text-amber-700">
                  CareerPath SA uses your profile, subjects, APS, and quiz answers to recommend suitable study options. Our team can prepare and submit university, NSFAS, and selected funding applications on your behalf once your information and documents are complete.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="size-4 text-[#006B5E]" />
              POPIA compliant — your data is safe
            </div>
            {!user && (
              <Button asChild className="bg-[#006B5E] hover:bg-[#005548] text-white">
                <Link href="/signup">Start your journey <ArrowRight className="ml-2 size-4" /></Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
