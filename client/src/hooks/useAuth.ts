import { useState, useEffect } from "react";
import { onAuthStateChange, FirebaseUser } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setFirebaseUser(user);
      setIsFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user profile from our backend when Firebase user exists
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!firebaseUser,
    retry: false,
  });

  const isLoading = isFirebaseLoading || (firebaseUser && isProfileLoading);
  const isAuthenticated = !!firebaseUser;

  return {
    user: userProfile,
    firebaseUser,
    isLoading,
    isAuthenticated,
  };
}
