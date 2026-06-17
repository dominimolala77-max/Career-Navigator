import { Route, Router, Switch } from "wouter";

import { Toaster } from "@/components/ui/toaster";
import { LocationGate } from "@/components/LocationGate";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { AppLayout } from "@/features/layout/AppLayout";

import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import PaymentReturnPage from "@/pages/PaymentReturnPage";
import PaymentCancelPage from "@/pages/PaymentCancelPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CareerRecommendationsPage } from "@/pages/CareerRecommendationsPage";
import { UniversitiesPage } from "@/pages/UniversitiesPage";
import { FundingPage } from "@/pages/FundingPage";
import { OpportunitiesPage } from "@/pages/OpportunitiesPage";
import { ApplicationsPage } from "@/pages/ApplicationsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { PlansPage } from "@/pages/PlansPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function App() {
  return (
    <Router base={getBasePath()}>
      <AuthProvider>
        <LocationGate>
        <AppLayout>
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/signup" component={SignupPage} />
            <Route path="/onboarding">
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            </Route>
            <Route path="/payment/success">
              <RequireAuth>
                <PaymentReturnPage />
              </RequireAuth>
            </Route>
            <Route path="/payment/cancel">
              <RequireAuth>
                <PaymentCancelPage />
              </RequireAuth>
            </Route>
            <Route path="/dashboard">
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            </Route>
            <Route path="/careers">
              <RequireAuth>
                <CareerRecommendationsPage />
              </RequireAuth>
            </Route>
            <Route path="/universities">
              <RequireAuth>
                <UniversitiesPage />
              </RequireAuth>
            </Route>
            <Route path="/funding">
              <RequireAuth>
                <FundingPage />
              </RequireAuth>
            </Route>
            <Route path="/opportunities">
              <RequireAuth>
                <OpportunitiesPage />
              </RequireAuth>
            </Route>
            <Route path="/applications">
              <RequireAuth>
                <ApplicationsPage />
              </RequireAuth>
            </Route>
            <Route path="/plans">
              <RequireAuth>
                <PlansPage />
              </RequireAuth>
            </Route>
            <Route path="/profile">
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            </Route>
            <Route>
              <NotFoundPage />
            </Route>
          </Switch>
        </AppLayout>
        </LocationGate>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
