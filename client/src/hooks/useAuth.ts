import { useState, useEffect } from "react";
import { onAuthStateChange, FirebaseUser, handleRedirectResult } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  // Listen to Firebase auth state changes and handle redirects
  useEffect(() => {
    // Handle redirect result on app load
    handleRedirectResult().then((result) => {
      if (result) {
        console.log("Redirect sign-in successful:", result.user.email);
      }
    }).catch((error) => {
      console.error("Redirect sign-in error:", error);
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      console.log("Firebase auth state changed:", user?.email || "signed out");
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
