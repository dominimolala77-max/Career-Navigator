import { Link } from "wouter";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid place-items-center min-h-[60vh] text-center gap-4">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          The page you’re looking for doesn’t exist.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}

