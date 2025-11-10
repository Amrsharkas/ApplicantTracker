import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { PasswordSetupModal } from "@/components/PasswordSetupModal";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import AIInterviewInitiation from "@/pages/AIInterviewInitiation";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import VerificationSentPage from "@/pages/VerificationSentPage";
import EmailVerificationPendingPage from "@/pages/EmailVerificationPendingPage";
import ResendVerificationPage from "@/pages/ResendVerificationPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import JobDetailsPage from "@/pages/JobDetailsPage";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user, isEmailVerified } = useAuth();
  const { t } = useLanguage();

  // Only show loading state if we're actually loading (not during logout)
  // Add timeout to prevent infinite loading - after 10 seconds, show the landing page
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setShowTimeoutMessage(true);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    } else {
      setShowTimeoutMessage(false);
    }
  }, [isLoading]);

  if (isLoading && isAuthenticated !== false && !showTimeoutMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("app.loadingAccount")}</p>
        </div>
      </div>
    );
  }

  // If loading timed out or authentication failed, redirect to landing
  if (showTimeoutMessage || (isLoading && !user)) {
    return <Landing />;
  }

  return (
    <Switch>
      {/* Email verification routes - accessible without authentication */}
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/verify-email/:token" component={VerifyEmailPage} />
      <Route path="/verification-pending" component={EmailVerificationPendingPage} />
      <Route path="/verification-sent" component={VerificationSentPage} />
      <Route path="/resend-verification" component={ResendVerificationPage} />

      {/* Password reset routes - accessible without authentication */}
      <Route path="/reset-password/:token" component={ResetPasswordPage} />

      {/* Public job details page - accessible without authentication */}
      <Route path="/jobs/:id" component={JobDetailsPage} />

      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Landing />}
      </Route>

      <Route path="/dashboard">
        {isAuthenticated ? (
          isEmailVerified ? (
            <Dashboard />
          ) : (
            <Redirect to="/verification-pending" />
          )
        ) : (
          <Redirect to="/" />
        )}
      </Route>

      <Route path="/ai-interview-initation">
        <AIInterviewInitiation />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithPasswordSetup() {
  const { isAuthenticated, user } = useAuth();
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);

  // Check if user needs password setup
  useEffect(() => {
    if (isAuthenticated && (user as any)?.passwordNeedsSetup) {
      setShowPasswordSetup(true);
    } else {
      setShowPasswordSetup(false);
    }
  }, [isAuthenticated, user]);

  const handlePasswordSetupSuccess = () => {
    setShowPasswordSetup(false);
    // Force a refetch to update the user data
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };

  const handleClose = () => {
    // Only allow closing if user no longer needs password setup
    if (!(user as any)?.passwordNeedsSetup) {
      setShowPasswordSetup(false);
    }
  };

  return (
    <>
      <Router />
      <PasswordSetupModal
        isOpen={showPasswordSetup}
        onClose={handleClose}
        onSuccess={handlePasswordSetupSuccess}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <AppWithPasswordSetup />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
