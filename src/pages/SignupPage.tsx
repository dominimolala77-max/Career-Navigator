import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

type Values = z.infer<typeof schema>;

export function SignupPage() {
  const { signUpWithEmailPassword, user, accessTier } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", confirm: "" } });
  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (user && accessTier) {
      navigate("/onboarding");
    }
  }, [user, accessTier, navigate]);

  async function onSubmit(values: Values) {
    try {
      const data = await signUpWithEmailPassword({ email: values.email, password: values.password });
      if (!data?.session) {
        toast({
          title: "Check your email",
          description: "We sent a confirmation link. After verifying, log in and enable location to continue.",
        });
      } else {
        toast({
          title: "Account created!",
          description: "Please turn on device location to set up your profile.",
        });
      }
    } catch (e) {
      toast({ title: "Sign up failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#006B5E] text-white shadow-md">
            <GraduationCap className="size-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Location-based access: free for Limpopo, Eastern Cape & Lesotho — paid plans for urban areas
          </p>
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
                    <Input className="h-11 bg-white" type="password" placeholder="Min. 8 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input className="h-11 bg-white" type="password" placeholder="Repeat password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-[#006B5E] hover:bg-[#005548] text-white mt-2">
                {isSubmitting ? "Creating account…" : <>Create Account <ArrowRight className="ml-2 size-4" /></>}
              </Button>
            </form>
          </Form>
          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#006B5E] hover:underline">Log in</Link>
          </p>
          <p className="mt-4 text-center text-xs text-slate-400">
            By signing up you agree to our terms. Your data is protected under POPIA.
          </p>
        </div>
      </div>
    </div>
  );
}
