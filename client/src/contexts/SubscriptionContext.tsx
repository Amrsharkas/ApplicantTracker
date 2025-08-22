import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface SubscriptionFeatures {
  aiInterviews: { enabled: boolean; limit: number };
  jobMatches: { enabled: boolean; limit: number };
  jobApplications: { enabled: boolean; limit: number };
  resumeUploads: { enabled: boolean; limit: number };
  profileAnalysis: { enabled: boolean; depth: string };
  prioritySupport: boolean;
  voiceInterviews: boolean;
  advancedMatching: boolean;
  analyticsAccess: boolean;
  exportData: boolean;
  customBranding: boolean;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  description: string;
  price: number;
  interval: string;
  features: SubscriptionFeatures;
}

interface UserSubscription {
  subscription: {
    id: number;
    userId: string;
    planId: number;
    status: string;
    plan: SubscriptionPlan;
  } | null;
  features: SubscriptionFeatures | null;
  planName: string;
}

interface SubscriptionContextValue {
  subscription: UserSubscription | null;
  features: SubscriptionFeatures | null;
  planName: string;
  isLoading: boolean;
  hasFeatureAccess: (feature: string, requiredValue?: any) => boolean;
  hasReachedLimit: (feature: string, currentUsage: number) => boolean;
  getFeatureLimit: (feature: string) => number;
  isSubscribed: boolean;
  isPremium: boolean;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  // Fetch current subscription
  const { 
    data, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['/api/subscription/current'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/current');
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, return free plan
          return {
            subscription: null,
            features: null,
            planName: 'free'
          };
        }
        throw new Error('Failed to fetch current subscription');
      }
      return await response.json() as UserSubscription;
    },
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setSubscription(data);
    }
  }, [data]);

  // Helper functions
  const hasFeatureAccess = (feature: string, requiredValue?: any): boolean => {
    if (!subscription?.features) return false;
    
    const featureConfig = (subscription.features as any)[feature];
    if (!featureConfig) return false;

    if (typeof featureConfig === 'boolean') {
      return featureConfig;
    }

    if (typeof featureConfig === 'object' && 'enabled' in featureConfig) {
      return featureConfig.enabled;
    }

    if (requiredValue && typeof featureConfig === 'object' && 'depth' in featureConfig) {
      return featureConfig.depth === requiredValue;
    }

    return false;
  };

  const hasReachedLimit = (feature: string, currentUsage: number): boolean => {
    if (!subscription?.features) return true;
    
    const featureConfig = (subscription.features as any)[feature];
    if (!featureConfig || !featureConfig.enabled) return true;

    const limit = featureConfig.limit;
    if (limit === -1) return false; // Unlimited
    
    return currentUsage >= limit;
  };

  const getFeatureLimit = (feature: string): number => {
    if (!subscription?.features) return 0;
    
    const featureConfig = (subscription.features as any)[feature];
    if (!featureConfig || !featureConfig.enabled) return 0;

    return featureConfig.limit || 0;
  };

  const isSubscribed = subscription?.planName !== 'free';
  const isPremium = subscription?.planName === 'premium' || subscription?.planName === 'enterprise';

  const refresh = () => {
    refetch();
  };

  const contextValue: SubscriptionContextValue = {
    subscription,
    features: subscription?.features || null,
    planName: subscription?.planName || 'free',
    isLoading,
    hasFeatureAccess,
    hasReachedLimit,
    getFeatureLimit,
    isSubscribed,
    isPremium,
    refresh,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Higher-order component for subscription-gated features
export function withSubscriptionGate<T extends {}>(
  Component: React.ComponentType<T>,
  requiredFeature: string,
  fallbackMessage?: string
) {
  return function SubscriptionGatedComponent(props: T) {
    const { hasFeatureAccess } = useSubscription();
    
    if (!hasFeatureAccess(requiredFeature)) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
          <p className="text-gray-600 mb-4">
            {fallbackMessage || `This feature requires a subscription to access.`}
          </p>
          <button 
            onClick={() => {
              // You can trigger subscription modal here
              console.log('Open subscription modal');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}

// Hook for subscription-aware API calls
export function useSubscriptionAwareQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  requiredFeature?: string,
  options?: any
) {
  const { hasFeatureAccess } = useSubscription();
  
  return useQuery({
    queryKey,
    queryFn,
    enabled: !requiredFeature || hasFeatureAccess(requiredFeature),
    ...options,
  });
}