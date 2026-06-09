import { ArrowRight, BarChart3, BookOpen, CalendarCheck2, CheckCircle2, Compass, FileText, GraduationCap, Sparkles, Target, TrendingUp } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";

const metrics = [
  { label: "Study paths", value: "25+", tone: "bg-teal-500" },
  { label: "Universities", value: "26", tone: "bg-amber-400" },
  { label: "Bursaries", value: "15+", tone: "bg-rose-400" },
];

const stages = [
  ["Applied", 72],
  ["Screening", 48],
  ["Interview", 34],
  ["Offer", 18],
];

const features = [
  {
    icon: Target,
    title: "Profile-first roadmap",
    description: "Turn learner details, subjects, interests, and funding needs into clear next steps.",
  },
  {
    icon: FileText,
    title: "Managed submission center",
    description: "Track university, NSFAS, bursary, and opportunity requests from one place.",
  },
  {
    icon: TrendingUp,
    title: "Outcome intelligence",
    description: "Use profile data to improve university recommendations and application readiness.",
  },
];

const onboardingSteps = [
  {
    icon: GraduationCap,
    title: "Complete your SA learner profile",
    description: "Add APS, matric subjects, results, interests, location and goals.",
  },
  {
    icon: Compass,
    title: "Explore matched pathways",
    description: "Receive tailored career, university and TVET recommendations for South Africa.",
  },
  {
    icon: CalendarCheck2,
    title: "Organise applications & funding",
    description: "Prepare NSFAS, bursaries, learnerships and closing dates in one place.",
  },
  {
    icon: Sparkles,
    title: "Stay ready with reminders",
    description: "Get alerts for deadlines, interviews and next steps as your journey evolves.",
  },
];

const recommendationTopics = [
  {
    icon: BookOpen,
    title: "Study field discovery",
    description: "Find careers and qualifications that match your APS, interests and strengths.",
  },
  {
    icon: GraduationCap,
    title: "University & TVET guidance",
    description: "Compare admission requirements, pass rates and local options.",
  },
  {
    icon: Target,
    title: "Funding & bursaries",
    description: "Match open opportunities to your profile and application timeline.",
  },
  {
    icon: FileText,
    title: "APS & subject guide",
    description: "Calculate your APS and explore the right subject combinations for your goals.",
  },
];

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="grid gap-10">
      <section className="grid min-h-[calc(100vh-132px)] items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="grid gap-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-teal-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-teal-900 shadow-sm">
            <CheckCircle2 className="size-4 text-teal-600" />
            Built for South African learners and applicants
          </div>

          <div className="grid gap-5">
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Find the study path that changes your year.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Career Navigator helps learners complete their profile, answer personality quizzes,
              choose suitable courses, and get matched to universities while submissions are managed for them.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {user ? (
              <Button asChild size="lg" className="h-12 rounded-md px-6 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
                <Link href="/dashboard">
                  Go to dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-12 rounded-md px-6 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
                  <Link href="/signup">
                    Create account
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-md border-slate-300 bg-white/70 px-6">
                  <Link href="/login">Log in</Link>
                </Button>
              </>
            )}
          </div>

          <div className="grid max-w-2xl grid-cols-3 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-white/80 bg-white/72 p-4 shadow-sm backdrop-blur">
                <div className={`mb-3 h-1.5 w-10 rounded-full ${metric.tone}`} />
                <p className="text-2xl font-semibold text-slate-950">{metric.value}</p>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-600 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.14)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_22%),radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]">
              <div className="absolute inset-x-0 top-8 mx-auto h-36 w-36 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute bottom-10 left-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute bottom-16 right-10 h-28 w-28 rounded-full bg-cyan-200/20 blur-3xl" />
              <div className="absolute inset-x-0 bottom-0 h-[36%] bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.65))]" />

              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                  Smart study guidance
                </div>
                <h2 className="max-w-sm text-4xl font-semibold leading-tight sm:text-5xl">
                  See the path ahead with confidence
                </h2>
                <p className="max-w-[24rem] text-sm leading-6 text-white/80">
                  A guided way to move from profile completion to university, NSFAS, and bursary submissions.
                </p>
                <div className="grid w-full grid-cols-3 gap-3 pt-6">
                  <div className="rounded-3xl border border-white/15 bg-white/10 p-3 text-left">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/70">APS</p>
                    <p className="mt-2 text-lg font-semibold">34+</p>
                  </div>
                  <div className="rounded-3xl border border-white/15 bg-white/10 p-3 text-left">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/70">Bursaries</p>
                    <p className="mt-2 text-lg font-semibold">24 open</p>
                  </div>
                  <div className="rounded-3xl border border-white/15 bg-white/10 p-3 text-left">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/70">Applications</p>
                    <p className="mt-2 text-lg font-semibold">12 tracked</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-white/80 bg-white/82 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-500">CareerPath SA onboarding</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Start your guided South African career journey
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Build a complete profile, discover study pathways, match bursaries, and track every managed submission in one place.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-950/5 p-5 text-slate-700">
            {onboardingSteps.map((step) => (
              <div key={step.title} className="grid gap-3 rounded-3xl bg-white/90 p-4 shadow-sm">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-500/10 text-teal-600">
                  <step.icon className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-950/5 p-6 sm:grid-cols-2">
          {recommendationTopics.map((topic) => (
            <div key={topic.title} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-500/10 text-teal-600">
                <topic.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">{topic.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{topic.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-md px-6 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
            <Link href={user ? "/dashboard" : "/signup"}>
              Start your pathway
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {!user ? (
            <Button asChild size="lg" variant="outline" className="h-12 rounded-md border-slate-300 bg-white/70 px-6">
              <Link href="/login">Already have an account</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 pb-10 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-lg border border-white/80 bg-white/76 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl">
            <div className="mb-5 grid size-11 place-items-center rounded-md bg-slate-950 text-white">
              <feature.icon className="size-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-950">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
