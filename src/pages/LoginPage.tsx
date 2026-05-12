import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { signInWithEmailPassword, user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: Values) {
    try {
      await signInWithEmailPassword(values);
      toast({ title: "Welcome back" });
      navigate("/dashboard");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ title: "Login failed", description: message, variant: "destructive" });
    }
  }

  if (user) {
    return (
      <Card className="max-w-md border-white/80 bg-white/82 shadow-xl">
        <CardHeader>
          <CardTitle>You are already signed in</CardTitle>
          <CardDescription>Open your dashboard to continue.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Home
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-180px)] place-items-center">
      <Card className="w-full max-w-md overflow-hidden border-white/80 bg-white/86 shadow-[0_28px_70px_rgba(15,23,42,0.14)] backdrop-blur">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-amber-300 to-rose-400" />
        <CardHeader className="space-y-4 p-7">
          <div className="grid size-12 place-items-center rounded-md bg-slate-950 text-white">
            <LockKeyhole className="size-5" />
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription className="mt-2">
              Log in to continue managing your career pipeline.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-7 pt-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input className="h-11 bg-white" autoComplete="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input className="h-11 bg-white" autoComplete="current-password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting} className="h-11 w-full shadow-[0_16px_38px_rgba(15,23,42,0.16)]">
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Log in
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>

              <Button type="button" variant="outline" className="h-11 bg-white" onClick={() => navigate("/signup")}>
                Create an account
              </Button>

              <div className="mt-2 flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-xs font-medium text-teal-900">
                <ShieldCheck className="size-4 text-teal-600" />
                Protected by Supabase authentication
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
