import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import { subscriptionPlans, userSubscriptions, type SubscriptionPlan, type UserSubscription } from "@shared/schema";

// Define feature structures for subscription plans
export interface PlanFeatures {
  // Core features
  aiInterviews: {
    enabled: boolean;
    limit: number; // -1 for unlimited
  };
  jobMatches: {
    enabled: boolean;
    limit: number; // -1 for unlimited
  };
  jobApplications: {
    enabled: boolean;
    limit: number; // -1 for unlimited
  };
  resumeUploads: {
    enabled: boolean;
    limit: number; // -1 for unlimited
  };
  profileAnalysis: {
    enabled: boolean;
    depth: "basic" | "detailed" | "comprehensive" | "enterprise";
  };
  // New features for EGP plans
  profileRebuilds: {
    enabled: boolean;
    limit: number; // per month
  };
  profileViews: boolean; // "Who viewed your profile"
  visibilityBoost: boolean; // Enhanced visibility in searches
  priorityNotifications: boolean; // Employer shortlist alerts
  aiCoaching: boolean; // Career guidance and skill analysis
  mockInterviews: boolean; // AI interview prep sessions
  vipAccess: boolean; // Job fairs & partner opportunities
  // Existing advanced features
  prioritySupport: boolean;
  voiceInterviews: boolean;
  advancedMatching: boolean;
  analyticsAccess: boolean;
  exportData: boolean;
  customBranding: boolean;
}

export class SubscriptionService {
  // Initialize default subscription plans
  async initializeDefaultPlans(): Promise<void> {
    const existingPlans = await db.select().from(subscriptionPlans);
    
    if (existingPlans.length === 0) {
      const defaultPlans = [
        {
          name: "standard",
          displayName: "Standard Plan",
          description: "For job seekers who want to start applying.",
          price: 64900, // 649 EGP/month (in cents for Stripe compatibility)
          interval: "month",
          stripePriceId: process.env.STRIPE_STANDARD_PRICE_ID || null,
          features: JSON.stringify({
            aiInterviews: { enabled: true, limit: -1 }, // Standard AI Interviews
            jobMatches: { enabled: true, limit: -1 },
            jobApplications: { enabled: true, limit: 5 }, // Apply to 5 jobs per month
            resumeUploads: { enabled: true, limit: -1 },
            profileAnalysis: { enabled: true, depth: "basic" }, // Basic Profile Analysis
            // DISABLED features for Standard plan
            profileRebuilds: { enabled: false, limit: 0 },
            profileViews: false,
            visibilityBoost: false,
            priorityNotifications: false,
            aiCoaching: false,
            mockInterviews: false,
            vipAccess: false,
            prioritySupport: true, // Customer Support (Standard Response Time)
            voiceInterviews: false,
            advancedMatching: false,
            analyticsAccess: false,
            exportData: false,
            customBranding: false,
          } as PlanFeatures),
          sortOrder: 1,
        },
        {
          name: "premium",
          displayName: "Premium Plan",
          description: "For more active job seekers aiming for faster results.",
          price: 94900, // 949 EGP/month
          interval: "month",
          stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || null,
          features: JSON.stringify({
            aiInterviews: { enabled: true, limit: -1 },
            jobMatches: { enabled: true, limit: -1 },
            jobApplications: { enabled: true, limit: 10 }, // Apply to 10 jobs per month
            resumeUploads: { enabled: true, limit: -1 },
            profileAnalysis: { enabled: true, depth: "comprehensive" }, // Comprehensive Profile Analysis
            profileRebuilds: { enabled: false, limit: 0 },
            profileViews: true, // See Who Viewed Your Profile
            visibilityBoost: true, // Advanced Visibility (shown more prominently to employers)
            priorityNotifications: false,
            aiCoaching: false,
            mockInterviews: false,
            vipAccess: false,
            prioritySupport: true, // Customer Support (Priority Response)
            voiceInterviews: false,
            advancedMatching: false,
            analyticsAccess: false,
            exportData: false,
            customBranding: false,
          } as PlanFeatures),
          sortOrder: 2,
        },
        {
          name: "pro",
          displayName: "Pro Plan",
          description: "The ultimate plan for professionals serious about landing a job.",
          price: 129900, // 1299 EGP/month
          interval: "month",
          stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
          features: JSON.stringify({
            aiInterviews: { enabled: true, limit: -1 },
            jobMatches: { enabled: true, limit: -1 },
            jobApplications: { enabled: true, limit: -1 }, // Unlimited Job Applications
            resumeUploads: { enabled: true, limit: -1 },
            profileAnalysis: { enabled: true, depth: "comprehensive" }, // Comprehensive Profile Analysis
            profileRebuilds: { enabled: true, limit: -1 }, // Unlimited Profile Rebuilds
            profileViews: true, // See Who Viewed Your Profile
            visibilityBoost: true, // Higher Visibility Boost (top candidate highlight for employers)
            priorityNotifications: false,
            aiCoaching: true, // AI Coaching & Recommendations (feedback on weaknesses + interview prep)
            mockInterviews: false,
            vipAccess: false,
            prioritySupport: true, // Customer Support (Top Priority & Dedicated Assistance)
            voiceInterviews: false,
            advancedMatching: false,
            analyticsAccess: false,
            exportData: false,
            customBranding: false,
          } as PlanFeatures),
          sortOrder: 3,
        },
      ];

      await db.insert(subscriptionPlans).values(defaultPlans);
      console.log("✅ Default subscription plans initialized");
    }
  }

  // Get all active subscription plans
  async getActivePlans(): Promise<SubscriptionPlan[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);
  }

  // Get user's current subscription with plan details
  async getUserSubscription(userId: string): Promise<(UserSubscription & { plan: SubscriptionPlan }) | null> {
    const result = await db
      .select()
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active")
        )
      )
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    if (result.length === 0) {
      // No subscription found - user needs to subscribe
      return null;
    }

    return {
      ...result[0].user_subscriptions,
      plan: result[0].subscription_plans,
    };
  }

  // Get user's plan features
  async getUserFeatures(userId: string): Promise<PlanFeatures | null> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return null;

    return subscription.plan.features as PlanFeatures;
  }

  // Check if user has access to a specific feature
  async hasFeatureAccess(
    userId: string,
    feature: keyof PlanFeatures,
    requiredValue?: any
  ): Promise<boolean> {
    const features = await this.getUserFeatures(userId);
    if (!features) return false;

    const featureValue = features[feature];
    
    if (typeof featureValue === "boolean") {
      return featureValue;
    }

    if (typeof featureValue === "object" && featureValue !== null) {
      if ("enabled" in featureValue) {
        return featureValue.enabled;
      }
    }

    if (requiredValue !== undefined) {
      return featureValue === requiredValue;
    }

    return !!featureValue;
  }

  // Check if user has reached limit for a feature
  async hasReachedLimit(
    userId: string,
    feature: keyof PlanFeatures,
    currentUsage: number
  ): Promise<boolean> {
    const features = await this.getUserFeatures(userId);
    if (!features) return true;

    const featureConfig = features[feature];
    
    if (typeof featureConfig === "object" && featureConfig !== null && "limit" in featureConfig) {
      const limit = (featureConfig as any).limit;
      if (limit === -1) return false; // Unlimited
      return currentUsage >= limit;
    }

    return false;
  }

  // Create or update user subscription
  async createUserSubscription(
    userId: string,
    planId: number,
    stripeData: {
      customerId: string;
      subscriptionId: string;
      paymentIntentId?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
    }
  ): Promise<UserSubscription> {
    const subscriptionData = {
      userId,
      planId,
      stripeCustomerId: stripeData.customerId,
      stripeSubscriptionId: stripeData.subscriptionId,
      stripePaymentIntentId: stripeData.paymentIntentId || null,
      status: "active",
      currentPeriodStart: stripeData.currentPeriodStart || null,
      currentPeriodEnd: stripeData.currentPeriodEnd || null,
      cancelAtPeriodEnd: false,
    };

    // Cancel existing active subscriptions
    await db
      .update(userSubscriptions)
      .set({ status: "canceled" })
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active")
        )
      );

    const [newSubscription] = await db
      .insert(userSubscriptions)
      .values(subscriptionData)
      .returning();

    return newSubscription;
  }

  // Update subscription status (from Stripe webhooks)
  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string,
    currentPeriodStart?: Date,
    currentPeriodEnd?: Date
  ): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({
        status,
        currentPeriodStart: currentPeriodStart || null,
        currentPeriodEnd: currentPeriodEnd || null,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
  }

  // Cancel subscription
  async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({
        cancelAtPeriodEnd,
        status: cancelAtPeriodEnd ? "active" : "canceled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active")
        )
      );
  }
}

export const subscriptionService = new SubscriptionService();