import { Briefcase, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OpportunitiesPage() {
  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="cp-section-label mb-2">Coming Soon</div>
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Learnerships & Internships</h1>
        <p className="mt-1 text-sm text-slate-500">
          We are currently focused on helping you with university applications, NSFAS, and bursaries.
          Learnerships and internships will be available as a secondary feature soon.
        </p>
      </div>

      <div className="rounded-2xl border border-[#006B5E]/20 bg-[#E8F5F3] p-8 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-[#006B5E] text-white">
          <Briefcase className="size-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#0F172A]">Learnerships & Internships — Coming Soon</h2>
        <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto">
          We're building a powerful learnership and internship matching feature that will help you find work experience opportunities matched to your field of study.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Sparkles className="size-4 text-[#006B5E]" />
            <span className="text-sm font-medium text-[#0F172A]">In development</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Clock className="size-4 text-amber-600" />
            <span className="text-sm font-medium text-[#0F172A]">Expected Q3 2025</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex gap-3">
          <Sparkles className="size-5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">What's available right now</p>
            <ul className="mt-2 space-y-1 text-sm text-blue-800">
              <li>✅ University & TVET college applications — managed submissions</li>
              <li>✅ NSFAS funding eligibility check and application prep</li>
              <li>✅ Bursaries matched to your chosen institutions and field</li>
              <li>✅ Career matching based on APS, subjects, and personality</li>
            </ul>
            <div className="mt-4">
              <Button asChild className="bg-[#006B5E] hover:bg-[#005548] text-white">
                <a href="/dashboard">Go to Dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}