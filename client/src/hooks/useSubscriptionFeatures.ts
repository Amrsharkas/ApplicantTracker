import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

interface SubscriptionFeatures {
  planName: string;
  planDisplayName: string;
  price: number;
  features: {
    aiInterviews: { enabled: boolean; limit: number; description: string };
    jobMatches: { enabled: boolean; limit: number; description: string };
    jobApplications: { enabled: boolean; limit: number; description: string };
    voiceInterviews: { enabled: boolean; description: string };
    advancedMatching: { enabled: boolean; description: string };
    profileAnalysis: { enabled: boolean; depth: string; description: string };
    profileViews: { enabled: boolean; description: string };
    visibilityBoost: { enabled: boolean; description: string };
    profileRebuilds: { enabled: boolean; limit: number; description: string };
    aiCoaching: { enabled: boolean; description: string };
    mockInterviews: { enabled: boolean; description: string };
    prioritySupport: { enabled: boolean; description: string };
  };
}

export function useSubscriptionFeatures() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/subscription/feature-test'],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const features = data as SubscriptionFeatures | undefined;

  // Helper functions to check specific feature access
  const hasFeature = (featureName: keyof SubscriptionFeatures['features']) => {
    if (!features) return false;
    const feature = features.features[featureName];
    return typeof feature === 'object' && 'enabled' in feature ? feature.enabled : Boolean(feature);
  };

  const getFeatureLimit = (featureName: keyof SubscriptionFeatures['features']) => {
    if (!features) return 0;
    const feature = features.features[featureName];
    return typeof feature === 'object' && 'limit' in feature ? feature.limit : -1;
  };

  const getFeatureDescription = (featureName: keyof SubscriptionFeatures['features']) => {
    if (!features) return 'Not available';
    const feature = features.features[featureName];
    return typeof feature === 'object' && 'description' in feature ? feature.description : 'Not available';
  };

  const requiresUpgrade = (featureName: keyof SubscriptionFeatures['features']) => {
    return !hasFeature(featureName);
  };

  const isPlan = (planName: 'standard' | 'premium' | 'pro') => {
    return features?.planName === planName;
  };

  return {
    features,
    isLoading,
    error,
    planName: features?.planName,
    planDisplayName: features?.planDisplayName,
    price: features?.price,
    
    // Feature checkers
    hasFeature,
    getFeatureLimit,
    getFeatureDescription,
    requiresUpgrade,
    isPlan,
    
    // Specific feature access
    canUseAiInterviews: hasFeature('aiInterviews'),
    canUseVoiceInterviews: hasFeature('voiceInterviews'),
    canApplyToJobs: hasFeature('jobApplications'),
    canViewProfileAnalytics: hasFeature('profileViews'),
    canUseVisibilityBoost: hasFeature('visibilityBoost'),
    canRebuildProfile: hasFeature('profileRebuilds'),
    canUseAiCoaching: hasFeature('aiCoaching'),
    canUseMockInterviews: hasFeature('mockInterviews'),
    hasAdvancedMatching: hasFeature('advancedMatching'),
    hasPrioritySupport: hasFeature('prioritySupport'),
    
    // Usage limits
    jobApplicationsLimit: getFeatureLimit('jobApplications'),
    aiInterviewsLimit: getFeatureLimit('aiInterviews'),
    profileRebuildsLimit: getFeatureLimit('profileRebuilds'),
  };
}