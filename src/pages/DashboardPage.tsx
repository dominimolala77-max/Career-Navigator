import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Sparkles,
  Target,
} from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";

const stats = [
  { label: "Tracked roles", value: "24", detail: "+6 this week", icon: BriefcaseBusiness },
  { label: "Interviews", value: "8", detail: "3 scheduled", icon: MessageSquareText },
  { label: "Follow-ups", value: "6", detail: "Due in 48h", icon: Clock3 },
  { label: "Readiness", value: "86%", detail: "+12% this month", icon: Target },
];

const applications = [
  { company: "Northstar Analytics", role: "Product Analyst", stage: "Interview", score: 92, due: "Today" },
  { company: "Atlas Cloud", role: "Customer Success Lead", stage: "Follow-up", score: 78, due: "Tomorrow" },
  { company: "Finwise", role: "Operations Associate", stage: "Applied", score: 66, due: "Fri" },
];

const tasks = [
  "Rewrite summary for analytics roles",
  "Send thank-you note to Northstar",
  "Practice behavioral answers",
  "Shortlist five remote-first companies",
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-white/70 px-3 py-1 text-sm font-medium text-teal-900">
            <Sparkles className="size-4 text-teal-600" />
            Momentum dashboard
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your career cockpit</h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as <span className="font-medium">{user?.email}</span>
          </p>
        </div>
        <Button asChild className="shadow-[0_16px_38px_rgba(15,23,42,0.16)]">
          <Link href="/">
            Back to home
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/80 bg-white/78 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{stat.value}</p>
              </div>
              <div className="grid size-11 place-items-center rounded-md bg-slate-950 text-white">
                <stat.icon className="size-5" />
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-teal-700">{stat.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="rounded-lg border border-white/80 bg-white/82 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Priority pipeline</h2>
              <p className="text-sm text-slate-500">Roles ranked by fit, urgency, and next action.</p>
            </div>
            <Button variant="outline" size="icon" className="bg-white">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
          <div className="grid">
            {applications.map((item) => (
              <div key={item.company} className="grid gap-4 border-b border-slate-100 px-6 py-5 last:border-b-0 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.6fr] lg:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{item.company}</p>
                  <p className="text-sm text-slate-500">{item.role}</p>
                </div>
                <div className="w-fit rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                  {item.stage}
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Fit score</span>
                    <span>{item.score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-amber-300" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarDays className="size-4 text-rose-500" />
                  {item.due}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-lg border border-slate-900 bg-slate-950 p-6 text-white shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Next best move</p>
                <h2 className="mt-2 text-2xl font-semibold">Win the interview loop</h2>
              </div>
              <div className="grid size-11 place-items-center rounded-md bg-teal-400/15 text-teal-200">
                <Mail className="size-5" />
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-300">
              Prepare two story-led answers, send one concise follow-up, and update the Northstar
              notes before the day closes.
            </p>
            <Button className="mt-6 w-full bg-white text-slate-950 hover:bg-slate-100">
              Start prep session
            </Button>
          </div>

          <div className="rounded-lg border border-white/80 bg-white/82 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-950">Today</h2>
            <div className="mt-4 grid gap-3">
              {tasks.map((task) => (
                <div key={task} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700">
                  <CheckCircle2 className="size-4 text-teal-600" />
                  {task}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/80 bg-white/82 p-6 text-sm text-slate-600 shadow-sm backdrop-blur">
            <p className="font-medium text-slate-950">Account profile</p>
            <p className="mt-2 break-all font-mono text-xs">{user?.id}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
