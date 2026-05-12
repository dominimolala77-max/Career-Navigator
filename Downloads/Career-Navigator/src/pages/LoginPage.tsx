import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
      <Card className="max-w-md">
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
    <div className="grid place-items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Use the email & password you signed up with.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input autoComplete="email" placeholder="you@example.com" {...field} />
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
                      <Input autoComplete="current-password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    Logging in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>

              <Button type="button" variant="outline" onClick={() => navigate("/signup")}>
                Create an account
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
