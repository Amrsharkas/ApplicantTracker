import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

// Global logout state
let globalLoggingOut = false;

export function useAuth() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
    enabled: !globalLoggingOut && !isLoggingOut,
  });

  // Sync with global logout state
  useEffect(() => {
    setIsLoggingOut(globalLoggingOut);
  }, []);

  return {
    user: (globalLoggingOut || isLoggingOut) ? null : (user ?? null),
    isLoading: (globalLoggingOut || isLoggingOut) ? false : isLoading,
    isAuthenticated: (globalLoggingOut || isLoggingOut) ? false : !!user,
    isEmailVerified: user?.isVerified ?? false,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      const data = await res.json();

      // Check if verification is required
      if (res.status === 403 && data.requiresVerification) {
        // Store email for resend verification form
        if (data.email && typeof window !== 'undefined') {
          localStorage.setItem('pending_verification_email', data.email);
        }

        // Show custom error and redirect to verification page
        toast({
          title: "Email Verification Required",
          description: data.message,
          variant: "destructive",
        });

        // Redirect to verification pending page after a short delay
        setTimeout(() => {
          setLocation('/verification-pending');
        }, 1000);

        throw new Error(data.message);
      }

      // Handle other error responses
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Login failed');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Login successful!",
        description: "Welcome back to Plato Applicant Tracker.",
      });
    },
    onError: (error: Error) => {
      // Don't show duplicate toast for verification errors (handled above)
      if (!error.message.includes("Email verification required")) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      username?: string;
    }) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
        credentials: "include",
      });

      const data = await res.json();

      // Handle error responses
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Registration failed');
      }

      return data;
    },
    onSuccess: (response: { message: string; user: any; requiresVerification?: boolean }) => {
      // User is now authenticated but may need verification
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      toast({
        title: "Registration successful!",
        description: response.message,
      });

      // Store email for resend verification form
      if (response.user?.email && typeof window !== 'undefined') {
        localStorage.setItem('pending_verification_email', response.user.email);
      }

      // Redirect to verification pending page using React Router
      setTimeout(() => {
        setLocation('/verification-pending');
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSetPassword() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (password: string) => {
      return await apiRequest("/api/set-password", {
        method: "POST",
        body: JSON.stringify({ password }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Password Set Successfully!",
        description: "Your password has been set. You can now use it to login in the future.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Set Password",
        description: error.message || "Failed to set password",
        variant: "destructive",
      });
    },
  });
}

export function useResendVerification() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const data = await res.json();

      // Handle error responses
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to resend verification');
      }

      return data;
    },
    onSuccess: (response: { message: string }) => {
      toast({
        title: "Verification email sent!",
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend verification",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      // Set global logout state to prevent any component rendering
      globalLoggingOut = true;

      // Clear all queries and immediately redirect
      queryClient.clear();
      queryClient.cancelQueries();

      // Immediate redirect with no delay
      window.location.replace("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    },
  });
}