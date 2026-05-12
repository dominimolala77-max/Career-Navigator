import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm">
            Signed in as <span className="font-medium">{user?.email}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Your next steps</CardTitle>
            <CardDescription>Placeholder area ready for real features.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This is where we can add job tracking, resume tailoring, interview prep, etc.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Account status.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            User id: <span className="font-mono text-xs">{user?.id}</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

