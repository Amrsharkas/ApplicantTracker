import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

function RedirectToDashboard() {
  const [, setLocation] = useLocation();
  
  React.useEffect(() => {
    setLocation('/dashboard');
  }, [setLocation]);
  
  return <div>Redirecting to dashboard...</div>;
}

function RedirectToHome() {
  const [, setLocation] = useLocation();
  
  React.useEffect(() => {
    setLocation('/');
  }, [setLocation]);
  
  return <div>Redirecting to home...</div>;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Switch>
      {/* Public routes accessible to all */}
      <Route path="/login">
        {() => isAuthenticated ? <RedirectToDashboard /> : <Login />}
      </Route>
      <Route path="/signup">
        {() => isAuthenticated ? <RedirectToDashboard /> : <Signup />}
      </Route>
      
      {/* Protected routes - require authentication */}
      <Route path="/dashboard">
        {() => isAuthenticated ? <Dashboard /> : <RedirectToHome />}
      </Route>
      
      {/* Root route */}
      <Route path="/">
        {() => isAuthenticated ? <RedirectToDashboard /> : <Landing />}
      </Route>
      
      {/* 404 fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
