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
  
  return null;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {isLoading ? (
        <Route>
          {() => <div className="flex items-center justify-center min-h-screen">Loading...</div>}
        </Route>
      ) : isAuthenticated ? (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/portal" component={Dashboard} />
          <Route path="/" component={RedirectToDashboard} />
        </>
      ) : (
        <>
          <Route path="/dashboard">
            {() => { 
              window.location.href = '/login'; 
              return <div>Redirecting to login...</div>; 
            }}
          </Route>
          <Route path="/portal">
            {() => { 
              window.location.href = '/login'; 
              return <div>Redirecting to login...</div>; 
            }}
          </Route>
          <Route path="/" component={Landing} />
        </>
      )}
      
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
