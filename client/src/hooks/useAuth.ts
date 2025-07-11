import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      if (res.status === 401) {
        return null; // User is not authenticated
      }
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    },
  });

  // console.log("useAuth - User data:", user);
  // console.log("useAuth - Is loading:", isLoading);
  // console.log("useAuth - Error:", error);
  // console.log("useAuth - Is authenticated:", !!user);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
