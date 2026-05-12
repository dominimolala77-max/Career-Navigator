import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Find your next role faster.
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Career Navigator helps you plan your path, track applications, and stay focused.
        </p>
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/signup">Create account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>Turn goals into a simple roadmap.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Break down targets into weekly actions you can actually execute.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Track</CardTitle>
            <CardDescription>Keep your applications organized.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Never lose context across interviews, follow-ups, and notes.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Improve</CardTitle>
            <CardDescription>Learn from outcomes.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Identify patterns and iterate quickly without burning out.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

