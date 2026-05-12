import { Route, Router, Switch } from "wouter";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { AppLayout } from "@/features/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SignupPage } from "@/pages/SignupPage";

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function App() {
  return (
    <Router base={getBasePath()}>
      <AuthProvider>
        <AppLayout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/signup" component={SignupPage} />
            <Route path="/dashboard">
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            </Route>
            <Route>
              <NotFoundPage />
            </Route>
          </Switch>
        </AppLayout>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
