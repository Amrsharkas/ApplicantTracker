import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Zap, Users, BarChart, Headphones } from 'lucide-react';

interface FeatureTest {
  planName: string;
  planDisplayName: string;
  price: number;
  features: {
    aiInterviews: {
      enabled: boolean;
      limit: number;
      description: string;
    };
    jobMatches: {
      enabled: boolean;
      limit: number;
      description: string;
    };
    jobApplications: {
      enabled: boolean;
      limit: number;
      description: string;
    };
    voiceInterviews: {
      enabled: boolean;
      description: string;
    };
    advancedMatching: {
      enabled: boolean;
      description: string;
    };
    profileAnalysis: {
      enabled: boolean;
      depth: string;
      description: string;
    };
    prioritySupport: {
      enabled: boolean;
      description: string;
    };
    analyticsAccess: {
      enabled: boolean;
      description: string;
    };
  };
  accessTests: {
    canStartAiInterview: boolean;
    canUseVoiceInterviews: boolean;
    canAccessAnalytics: boolean;
    canUseAdvancedMatching: boolean;
  };
}

export default function SubscriptionDemo() {
  const { user, isLoading } = useAuth();
  const [featureTest, setFeatureTest] = useState<FeatureTest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testFeatures = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/subscription/feature-test', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to test features: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFeatureTest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test features');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isLoading) {
      testFeatures();
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Please log in to test subscription features.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Subscription Feature Demonstration</h1>
        <p className="text-muted-foreground">
          This page demonstrates how different subscription plans provide different access levels to platform features.
        </p>
      </div>

      <div className="mb-6">
        <Button onClick={testFeatures} disabled={loading}>
          {loading ? 'Testing Features...' : 'Refresh Feature Test'}
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {featureTest && (
        <div className="space-y-6">
          {/* Current Plan Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Current Plan: {featureTest.planDisplayName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant={featureTest.planName === 'free' ? 'outline' : 'default'}>
                  {featureTest.planName.toUpperCase()}
                </Badge>
                <span className="text-2xl font-bold">
                  {featureTest.price === 0 ? 'Free' : `$${featureTest.price}/month`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Feature Access Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* AI Interviews */}
            <Card className={featureTest.features.aiInterviews.enabled ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {featureTest.features.aiInterviews.enabled ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <XCircle className="h-4 w-4 text-red-600" />
                  }
                  AI Interviews
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {featureTest.features.aiInterviews.description}
                </p>
                <Badge variant={featureTest.accessTests.canStartAiInterview ? 'default' : 'destructive'} className="mt-2">
                  {featureTest.accessTests.canStartAiInterview ? 'Available' : 'Restricted'}
                </Badge>
              </CardContent>
            </Card>

            {/* Job Applications */}
            <Card className={featureTest.features.jobApplications.enabled ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {featureTest.features.jobApplications.enabled ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <XCircle className="h-4 w-4 text-red-600" />
                  }
                  Job Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {featureTest.features.jobApplications.description}
                </p>
                <Badge variant="outline" className="mt-2">
                  {featureTest.planName === 'free' ? '2/month' : 
                   featureTest.planName === 'standard' ? '5/month' :
                   featureTest.planName === 'intermediate' ? '10/month' : 'Unlimited'
                  }
                </Badge>
              </CardContent>
            </Card>

            {/* Voice Interviews */}
            <Card className={featureTest.features.voiceInterviews?.enabled ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {featureTest.features.voiceInterviews?.enabled ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <XCircle className="h-4 w-4 text-red-600" />
                  }
                  <Headphones className="h-4 w-4" />
                  Voice Interviews
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {featureTest.features.voiceInterviews?.description || 
                   (featureTest.features.voiceInterviews?.enabled ? 'Available' : 'Premium only')}
                </p>
                <Badge variant={featureTest.accessTests.canUseVoiceInterviews ? 'default' : 'destructive'} className="mt-2">
                  {featureTest.accessTests.canUseVoiceInterviews ? 'Available' : 'Premium Only'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* New EGP Plan Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Profile Views */}
            <Card className={featureTest.features.profileViews?.enabled ? 'border-blue-200' : 'border-gray-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {featureTest.features.profileViews?.enabled ? 
                    <CheckCircle className="h-4 w-4 text-blue-600" /> : 
                    <XCircle className="h-4 w-4 text-gray-400" />
                  }
                  Profile Views
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {featureTest.features.profileViews?.enabled ? '"Who viewed your profile" tracking' : 'Not available'}
                </p>
              </CardContent>
            </Card>

            {/* Visibility Boost */}
            <Card className={featureTest.features.visibilityBoost?.enabled ? 'border-blue-200' : 'border-gray-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {featureTest.features.visibilityBoost?.enabled ? 
                    <CheckCircle className="h-4 w-4 text-blue-600" /> : 
                    <XCircle className="h-4 w-4 text-gray-400" />
                  }
                  Visibility Boost
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {featureTest.features.visibilityBoost?.enabled ? 'Enhanced visibility in employer searches' : 'Standard visibility only'}
                </p>
              </CardContent>
            </Card>

            {/* AI Coaching */}
            <Card className={featureTest.features.aiCoaching?.enabled ? 'border-purple-200' : 'border-gray-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {featureTest.features.aiCoaching?.enabled ? 
                    <CheckCircle className="h-4 w-4 text-purple-600" /> : 
                    <XCircle className="h-4 w-4 text-gray-400" />
                  }
                  AI Coaching
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {featureTest.features.aiCoaching?.enabled ? 'Career guidance & skill gap analysis' : 'Premium feature only'}
                </p>
              </CardContent>
            </Card>

            {/* VIP Access */}
            <Card className={featureTest.features.vipAccess?.enabled ? 'border-gold-200' : 'border-gray-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {featureTest.features.vipAccess?.enabled ? 
                    <CheckCircle className="h-4 w-4 text-yellow-600" /> : 
                    <XCircle className="h-4 w-4 text-gray-400" />
                  }
                  VIP Access
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {featureTest.features.vipAccess?.enabled ? 'Job fairs & partner opportunities' : 'Premium feature only'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Limits Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Limits & Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Job Applications</h4>
                  <p className="text-sm text-muted-foreground">
                    {featureTest.features.jobApplications.description}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Job Matches</h4>
                  <p className="text-sm text-muted-foreground">
                    {featureTest.features.jobMatches.description}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Profile Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    {featureTest.features.profileAnalysis.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade CTA for Free Users */}
          {featureTest.planName === 'free' && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle>Unlock All Features</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Upgrade your plan to access voice interviews, advanced matching, analytics, and unlimited usage.
                </p>
                <Button>Upgrade Now</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}