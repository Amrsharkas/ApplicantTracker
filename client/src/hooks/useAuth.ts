import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
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