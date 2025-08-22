import { Request, Response, NextFunction } from "express";
import { subscriptionService } from "./subscriptionService";

// Extend Request interface to include subscription info
declare global {
  namespace Express {
    interface Request {
      subscription?: {
        planName: string;
        features: any;
        hasFeatureAccess: (feature: string, requiredValue?: any) => boolean;
        hasReachedLimit: (feature: string, currentUsage: number) => boolean;
      };
    }
  }
}

// Middleware to check if user has access to a specific feature
export function requireFeature(featureName: string, requiredValue?: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ 
          error: "Authentication required",
          featureRequired: featureName
        });
      }

      const hasAccess = await subscriptionService.hasFeatureAccess(
        userId, 
        featureName as any, 
        requiredValue
      );

      if (!hasAccess) {
        const subscription = await subscriptionService.getUserSubscription(userId);
        const planName = subscription?.plan.name || 'free';
        
        return res.status(403).json({ 
          error: "Feature access denied",
          featureRequired: featureName,
          currentPlan: planName,
          requiredValue,
          message: `This feature requires a higher subscription plan. You are currently on the ${planName} plan.`
        });
      }

      // Add subscription info to request for use in route handlers
      const subscription = await subscriptionService.getUserSubscription(userId);
      const features = await subscriptionService.getUserFeatures(userId);
      
      req.subscription = {
        planName: subscription?.plan.name || 'free',
        features,
        hasFeatureAccess: (feature: string, value?: any) => 
          subscriptionService.hasFeatureAccess(userId, feature as any, value),
        hasReachedLimit: (feature: string, usage: number) => 
          subscriptionService.hasReachedLimit(userId, feature as any, usage)
      };

      next();
    } catch (error) {
      console.error('Subscription middleware error:', error);
      res.status(500).json({ 
        error: "Failed to check feature access",
        featureRequired: featureName 
      });
    }
  };
}

// Middleware to check if user has reached usage limit for a feature
export function checkUsageLimit(featureName: string, getCurrentUsage: (req: Request) => Promise<number>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ 
          error: "Authentication required",
          featureRequired: featureName
        });
      }

      const currentUsage = await getCurrentUsage(req);
      const hasReachedLimit = await subscriptionService.hasReachedLimit(
        userId, 
        featureName as any, 
        currentUsage
      );

      if (hasReachedLimit) {
        const subscription = await subscriptionService.getUserSubscription(userId);
        const features = await subscriptionService.getUserFeatures(userId);
        const planName = subscription?.plan.name || 'free';
        const limit = (features as any)?.[featureName]?.limit || 0;
        
        return res.status(429).json({ 
          error: "Usage limit reached",
          featureRequired: featureName,
          currentPlan: planName,
          currentUsage,
          limit: limit === -1 ? 'unlimited' : limit,
          message: `You have reached your ${featureName} limit (${currentUsage}/${limit === -1 ? 'unlimited' : limit}). Upgrade your plan to continue.`
        });
      }

      // Add subscription info to request
      const subscription = await subscriptionService.getUserSubscription(userId);
      const features = await subscriptionService.getUserFeatures(userId);
      
      req.subscription = {
        planName: subscription?.plan.name || 'free',
        features,
        hasFeatureAccess: (feature: string, value?: any) => 
          subscriptionService.hasFeatureAccess(userId, feature as any, value),
        hasReachedLimit: (feature: string, usage: number) => 
          subscriptionService.hasReachedLimit(userId, feature as any, usage)
      };

      next();
    } catch (error) {
      console.error('Usage limit middleware error:', error);
      res.status(500).json({ 
        error: "Failed to check usage limits",
        featureRequired: featureName 
      });
    }
  };
}

// Helper function to get current usage for different features
export const usageCheckers = {
  // Count existing applications for the user
  async getApplicationsUsage(req: Request): Promise<number> {
    const userId = (req as any).user?.id;
    // You would implement actual counting logic here
    // For now, return 0 as placeholder
    return 0;
  },

  // Count AI interviews taken by the user  
  async getAiInterviewsUsage(req: Request): Promise<number> {
    const userId = (req as any).user?.id;
    // You would implement actual counting logic here
    return 0;
  },

  // Count job matches for the user
  async getJobMatchesUsage(req: Request): Promise<number> {
    const userId = (req as any).user?.id;
    // You would implement actual counting logic here
    return 0;
  },

  // Count resume uploads by the user
  async getResumeUploadsUsage(req: Request): Promise<number> {
    const userId = (req as any).user?.id;
    // You would implement actual counting logic here
    return 0;
  }
};