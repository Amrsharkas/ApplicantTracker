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
    depth: "basic" | "detailed" | "comprehensive";
  };
  // Advanced features
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
          name: "free",
          displayName: "Free Plan",
          description: "Perfect for getting started with AI interviews",
          price: 0,
          interval: "month",
          stripePriceId: null,
          features: JSON.stringify({
            aiInterviews: { enabled: true, limit: 1 },
            jobMatches: { enabled: true, limit: 5 },
            jobApplications: { enabled: true, limit: 3 },
            resumeUploads: { enabled: true, limit: 1 },
            profileAnalysis: { enabled: true, depth: "basic" },
            prioritySupport: false,
            voiceInterviews: false,
            advancedMatching: false,
            analyticsAccess: false,
            exportData: false,
            customBranding: false,
          } as PlanFeatures),
          sortOrder: 1,
        },
        {
          name: "basic",
          displayName: "Basic Plan",
          description: "Essential features for active job seekers",
          price: 1999, // $19.99/month
          interval: "month",
          stripePriceId: process.env.STRIPE_BASIC_PRICE_ID || null,
          features: JSON.stringify({
            aiInterviews: { enabled: true, limit: 5 },
            jobMatches: { enabled: true, limit: 25 },
            jobApplications: { enabled: true, limit: 15 },
            resumeUploads: { enabled: true, limit: 3 },
            profileAnalysis: { enabled: true, depth: "detailed" },
            prioritySupport: false,
            voiceInterviews: true,
            advancedMatching: true,
            analyticsAccess: false,
            exportData: false,
            customBranding: false,
          } as PlanFeatures),
          sortOrder: 2,
        },
        {
          name: "premium",
          displayName: "Premium Plan",
          description: "Advanced features for serious professionals",
          price: 4999, // $49.99/month
          interval: "month",
          stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || null,
          features: JSON.stringify({
            aiInterviews: { enabled: true, limit: -1 },
            jobMatches: { enabled: true, limit: -1 },
            jobApplications: { enabled: true, limit: -1 },
            resumeUploads: { enabled: true, limit: 10 },
            profileAnalysis: { enabled: true, depth: "comprehensive" },
            prioritySupport: true,
            voiceInterviews: true,
            advancedMatching: true,
            analyticsAccess: true,
            exportData: true,
            customBranding: false,
          } as PlanFeatures),
          sortOrder: 3,
        },
        {
          name: "enterprise",
          displayName: "Enterprise Plan",
          description: "Full-featured solution for organizations",
          price: 9999, // $99.99/month
          interval: "month",
          stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
          features: JSON.stringify({
            aiInterviews: { enabled: true, limit: -1 },
            jobMatches: { enabled: true, limit: -1 },
            jobApplications: { enabled: true, limit: -1 },
            resumeUploads: { enabled: true, limit: -1 },
            profileAnalysis: { enabled: true, depth: "comprehensive" },
            prioritySupport: true,
            voiceInterviews: true,
            advancedMatching: true,
            analyticsAccess: true,
            exportData: true,
            customBranding: true,
          } as PlanFeatures),
          sortOrder: 4,
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
      // Return free plan if no subscription found
      const freePlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, "free"))
        .limit(1);

      if (freePlan.length > 0) {
        return {
          id: 0,
          userId,
          planId: freePlan[0].id,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePaymentIntentId: null,
          status: "active",
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          plan: freePlan[0],
        };
      }
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