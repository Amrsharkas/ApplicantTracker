import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  console.log('useAuth - User data:', user);
  console.log('useAuth - Is loading:', isLoading);
  console.log('useAuth - Error:', error);
  console.log('useAuth - Is authenticated:', !!user);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
