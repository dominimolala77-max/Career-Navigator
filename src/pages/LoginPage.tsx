import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, GraduationCap, LockKeyhole } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { signInWithEmailPassword, user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const isSubmitting = form.formState.isSubmitting;

  if (user) { navigate("/dashboard"); return null; }

  async function onSubmit(values: Values) {
    try {
      await signInWithEmailPassword(values);
      toast({ title: "Welcome back!" });
      navigate("/dashboard");
    } catch (e) {
      toast({ title: "Login failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#006B5E] text-white shadow-md">
            <GraduationCap className="size-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Log in to continue your career journey</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="mb-4 h-1 w-16 rounded-full bg-[#006B5E]" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input className="h-11 bg-white" placeholder="you@example.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input className="h-11 bg-white" type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-[#006B5E] hover:bg-[#005548] text-white mt-2">
                {isSubmitting ? "Logging in…" : <><LockKeyhole className="mr-2 size-4" /> Log in</>}
              </Button>
            </form>
          </Form>
          <p className="mt-5 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link href="/signup"><a className="font-semibold text-[#006B5E] hover:underline">Create one free <ArrowRight className="inline size-3" /></a></Link>
          </p>
        </div>
      </div>
    </div>
  );
}
