import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// Global logout state
let globalLoggingOut = false;

export function useAuth() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
    enabled: !globalLoggingOut && !isLoggingOut,
    staleTime: 0, // Always refetch when invalidated
    queryFn: async () => {
      try {
        console.log("🔍 Auth check: Fetching user data");
        const response = await fetch("/api/user", {
          credentials: "include",
          cache: "no-cache", // Prevent caching issues
        });
        if (response.status === 401) {
          console.log("🔍 Auth check: User not authenticated (401)");
          return null; // Not authenticated, but not an error
        }
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        const userData = await response.json();
        console.log("🔍 Auth check: User authenticated", userData);
        return userData;
      } catch (error) {
        console.error("Auth check error:", error);
        return null;
      }
    },
  });

  // Sync with global logout state
  useEffect(() => {
    setIsLoggingOut(globalLoggingOut);
  }, []);

  return {
    user: (globalLoggingOut || isLoggingOut) ? null : (user ?? null),
    isLoading: (globalLoggingOut || isLoggingOut) ? false : isLoading,
    isAuthenticated: (globalLoggingOut || isLoggingOut) ? false : !!user,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data) => {
      console.log("🎉 Login successful:", data.user);
      // Clear all queries first
      queryClient.clear();
      // Set the user data directly in the cache
      queryClient.setQueryData(["/api/user"], data.user);
      // Force an immediate refetch
      queryClient.refetchQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userData: { 
      email: string; 
      password: string; 
      firstName: string; 
      lastName: string;
      username?: string;
    }) => {
      return await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(userData),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data) => {
      console.log("🎉 Registration successful:", data.user);
      // Clear all queries first
      queryClient.clear();
      // Set the user data directly in the cache
      queryClient.setQueryData(["/api/user"], data.user);
      // Force an immediate refetch
      queryClient.refetchQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Account Created!",
        description: "Welcome to Plato! Your account has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
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