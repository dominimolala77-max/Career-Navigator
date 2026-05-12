import { ArrowRight, BarChart3, CalendarCheck2, CheckCircle2, FileText, Target, TrendingUp } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";

const metrics = [
  { label: "Active roles", value: "24", tone: "bg-teal-500" },
  { label: "Interview rate", value: "38%", tone: "bg-amber-400" },
  { label: "Follow-ups due", value: "6", tone: "bg-rose-400" },
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
    title: "Priority roadmap",
    description: "Convert career goals into focused weekly actions with clear next moves.",
  },
  {
    icon: FileText,
    title: "Application command center",
    description: "Track companies, roles, notes, deadlines, contacts, and follow-up history.",
  },
  {
    icon: TrendingUp,
    title: "Outcome intelligence",
    description: "Spot what is working, tighten your pitch, and improve every application cycle.",
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
            Built for decisive career moves
          </div>

          <div className="grid gap-5">
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Find the role that changes your year.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Career Navigator turns scattered applications into a polished operating system for
              strategy, follow-ups, interview prep, and momentum.
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
          <div className="rounded-2xl border border-white/80 bg-white/82 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-sm text-slate-300">Pipeline value</p>
                  <p className="text-3xl font-semibold">R50,000</p>
                </div>
                <div className="grid size-11 place-items-center rounded-md bg-teal-400/15 text-teal-200">
                  <BarChart3 className="size-5" />
                </div>
              </div>

              <div className="grid gap-5 p-5">
                <div className="grid gap-3 rounded-lg bg-white/[0.06] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Dream role readiness</span>
                    <span className="font-medium text-teal-200">86%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 w-[86%] rounded-full bg-teal-300" />
                  </div>
                </div>

                <div className="grid gap-4">
                  {stages.map(([label, value]) => (
                    <div key={label} className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{label}</span>
                        <span className="text-white">{value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-gradient-to-r from-teal-300 via-amber-200 to-rose-300" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 rounded-lg bg-white text-slate-950 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-md bg-amber-100 text-amber-700">
                      <CalendarCheck2 className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Next high-leverage action</p>
                      <p className="text-sm text-slate-500">Tailor CV for product analyst role</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
