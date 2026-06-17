import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { XCircle } from "lucide-react";

export default function PaymentCancelPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const kind = params.get("kind") || "unknown";

  return (
    <div className="flex items-center justify-center py-24">
      <div className="mx-auto max-w-sm text-center">
        <XCircle className="mx-auto mb-4 size-16 text-red-400" />
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Payment cancelled</h1>
        <p className="mt-2 text-sm text-slate-500">
          {kind === "plan"
            ? "Your plan payment was cancelled. No charges have been made."
            : kind === "application_fee"
              ? "The application fee payment was cancelled. No charges have been made."
              : "The payment process was cancelled. No charges have been made."}
        </p>
        <p className="mt-1 text-xs text-slate-400">If you experienced any issues, please contact support.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            onClick={() => navigate(kind === "plan" ? "/onboarding" : "/applications")}
            className="bg-[#006B5E] text-white hover:bg-[#005548]"
          >
            {kind === "plan" ? "Back to Onboarding" : "Back to Applications"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}