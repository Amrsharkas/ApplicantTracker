import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap } from 'lucide-react';
import { useSubscriptionFeatures } from '@/hooks/useSubscriptionFeatures';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

const FEATURE_METADATA = {
  aiInterviews: {
    title: 'AI Interviews',
    description: 'Advanced AI-powered interview sessions',
    icon: <Zap className="w-4 h-4" />,
    requiredPlan: 'Standard'
  },
  voiceInterviews: {
    title: 'Voice Interviews', 
    description: 'Real-time voice-based interviews',
    icon: <Crown className="w-4 h-4" />,
    requiredPlan: 'Premium'
  },
  profileViews: {
    title: 'Profile Views',
    description: 'See who viewed your profile',
    icon: <Crown className="w-4 h-4" />,
    requiredPlan: 'Premium'
  },
  visibilityBoost: {
    title: 'Visibility Boost',
    description: 'Enhanced visibility in employer searches',
    icon: <Crown className="w-4 h-4" />,
    requiredPlan: 'Premium'
  },
  profileRebuilds: {
    title: 'Profile Rebuilds',
    description: 'Unlimited profile rebuilds',
    icon: <Zap className="w-4 h-4" />,
    requiredPlan: 'Pro'
  },
  aiCoaching: {
    title: 'AI Coaching',
    description: 'Personalized career guidance',
    icon: <Zap className="w-4 h-4" />,
    requiredPlan: 'Pro'
  },
  mockInterviews: {
    title: 'Mock Interviews',
    description: 'Practice interviews with AI',
    icon: <Zap className="w-4 h-4" />,
    requiredPlan: 'Pro'
  }
};

export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { hasFeature, requiresUpgrade, planDisplayName } = useSubscriptionFeatures();
  
  const hasAccess = hasFeature(feature as any);
  const metadata = FEATURE_METADATA[feature as keyof typeof FEATURE_METADATA];

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-500" />
            <CardTitle className="text-lg">{metadata?.title || 'Premium Feature'}</CardTitle>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            {metadata?.icon}
            {metadata?.requiredPlan}
          </Badge>
        </div>
        <CardDescription>
          {metadata?.description || 'This feature requires a higher subscription plan.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Your current plan: <strong>{planDisplayName || 'No subscription'}</strong></p>
          <p>Required plan: <strong>{metadata?.requiredPlan || 'Premium'}</strong> or higher</p>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button className="w-full" onClick={() => {
          // TODO: Open subscription modal or navigate to upgrade page
          console.log('Open upgrade modal');
        }}>
          Upgrade to {metadata?.requiredPlan}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Usage limit component for features with monthly limits
interface UsageLimitDisplayProps {
  featureName: string;
  currentUsage: number;
  showUpgradePrompt?: boolean;
}

export function UsageLimitDisplay({ 
  featureName, 
  currentUsage, 
  showUpgradePrompt = true 
}: UsageLimitDisplayProps) {
  const { getFeatureLimit, getFeatureDescription, requiresUpgrade } = useSubscriptionFeatures();
  
  const limit = getFeatureLimit(featureName as any);
  const description = getFeatureDescription(featureName as any);
  const isUnlimited = limit === -1;
  const isAtLimit = !isUnlimited && currentUsage >= limit;
  
  const getProgressColor = () => {
    if (isUnlimited) return 'bg-green-500';
    const percentage = (currentUsage / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{featureName}</span>
        <span className="text-gray-600 dark:text-gray-400">
          {isUnlimited ? 'Unlimited' : `${currentUsage}/${limit}`}
        </span>
      </div>
      
      {!isUnlimited && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
          />
        </div>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      
      {isAtLimit && showUpgradePrompt && (
        <Button size="sm" variant="outline" className="w-full mt-2">
          Upgrade for More
        </Button>
      )}
    </div>
  );
}