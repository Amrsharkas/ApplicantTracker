import { storage } from './storage';
import { creditTransactions, organizations, creditPricing } from '@shared/schema';
import { db } from './db';
import { eq, and, desc } from 'drizzle-orm';
import type { InsertCreditTransaction, InsertCreditPricing } from '@shared/schema';

export type CreditTransactionType = 'cv_processing' | 'interview' | 'manual_adjustment' | 'subscription' | 'purchase';
export type CreditActionType = 'resume_processing' | 'ai_matching' | 'job_posting' | 'interview_scheduling';
export type CreditType = 'cv_processing' | 'interview';

export interface CreditBalance {
  cvProcessingCredits: number;
  interviewCredits: number;
  // Legacy fields for backward compatibility
  currentCredits: number;
  creditLimit: number;
  remainingCredits: number;
}

export interface CreditTransaction extends InsertCreditTransaction {
  id: string;
  createdAt: Date;
}

export class CreditService {
  /**
   * Get current credit balance for an organization
   */
  async getCreditBalance(organizationId: string): Promise<CreditBalance | null> {
    try {
      const org = await this.getOrganizationById(organizationId);
      if (!org) {
        return null;
      }

      return {
        cvProcessingCredits: org.cvProcessingCredits || 0,
        interviewCredits: org.interviewCredits || 0,
        // Legacy fields for backward compatibility
        currentCredits: org.currentCredits || 0,
        creditLimit: org.creditLimit || 0,
        remainingCredits: (org.currentCredits || 0)
      };
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      throw new Error('Failed to fetch credit balance');
    }
  }

  /**
   * Check if organization has sufficient credits for a specific credit type
   */
  async checkCredits(organizationId: string, requiredAmount: number, creditType: CreditType): Promise<boolean> {
    try {
      const balance = await this.getCreditBalance(organizationId);
      if (!balance) {
        return false;
      }

      const availableCredits = creditType === 'cv_processing'
        ? balance.cvProcessingCredits
        : balance.interviewCredits;

      return availableCredits >= requiredAmount;
    } catch (error) {
      console.error('Error checking credits:', error);
      return false;
    }
  }

  /**
   * Deduct credits from organization balance for a specific credit type
   */
  async deductCredits(
    organizationId: string,
    amount: number,
    creditType: CreditType,
    type: CreditTransactionType,
    description: string,
    relatedId?: string,
    actionType?: string
  ): Promise<boolean> {
    try {
      const result = await db.transaction(async (tx) => {
        // Get current organization data within transaction
        const [org] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId));

        if (!org) {
          throw new Error('Organization not found');
        }

        // Check the appropriate credit balance
        const currentBalance = creditType === 'cv_processing'
          ? (org.cvProcessingCredits || 0)
          : (org.interviewCredits || 0);

        if (currentBalance < amount) {
          throw new Error(`Insufficient ${creditType} credits`);
        }

        // Update organization credits for the specific type
        const updateData = creditType === 'cv_processing'
          ? { cvProcessingCredits: currentBalance - amount, updatedAt: new Date() }
          : { interviewCredits: currentBalance - amount, updatedAt: new Date() };

        await tx
          .update(organizations)
          .set(updateData)
          .where(eq(organizations.id, organizationId));

        // Create credit transaction record
        await tx.insert(creditTransactions).values({
          id: crypto.randomUUID(),
          organizationId,
          amount: -amount, // Negative for deduction
          type,
          actionType,
          description,
          relatedId,
          createdAt: new Date()
        });

        return currentBalance - amount;
      });

      console.log(`Successfully deducted ${amount} ${creditType} credits from organization ${organizationId}. New balance: ${result}`);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to deduct credits');
    }
  }

  /**
   * Add credits to organization balance for a specific credit type
   */
  async addCredits(
    organizationId: string,
    amount: number,
    creditType: CreditType,
    description: string = 'Manual credit addition',
    type: CreditTransactionType = 'manual_adjustment',
    actionType?: string
  ): Promise<boolean> {
    try {
      const result = await db.transaction(async (tx) => {
        // Get current organization data within transaction
        const [org] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId));

        if (!org) {
          throw new Error('Organization not found');
        }

        // Update organization credits for the specific type
        const currentBalance = creditType === 'cv_processing'
          ? (org.cvProcessingCredits || 0)
          : (org.interviewCredits || 0);

        const newCreditBalance = currentBalance + amount;
        const updateData = creditType === 'cv_processing'
          ? { cvProcessingCredits: newCreditBalance, updatedAt: new Date() }
          : { interviewCredits: newCreditBalance, updatedAt: new Date() };

        await tx
          .update(organizations)
          .set(updateData)
          .where(eq(organizations.id, organizationId));

        // Create credit transaction record
        await tx.insert(creditTransactions).values({
          id: crypto.randomUUID(),
          organizationId,
          amount: amount, // Positive for addition
          type,
          actionType,
          description,
          createdAt: new Date()
        });

        return newCreditBalance;
      });

      console.log(`Successfully added ${amount} ${creditType} credits to organization ${organizationId}. New balance: ${result}`);
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add credits');
    }
  }

  /**
   * Get credit transaction history for an organization
   */
  async getCreditHistory(organizationId: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      const transactions = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.organizationId, organizationId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit);

      return transactions;
    } catch (error) {
      console.error('Error fetching credit history:', error);
      throw new Error('Failed to fetch credit history');
    }
  }

  /**
   * Get credit usage statistics for an organization
   */
  async getCreditUsage(organizationId: string): Promise<{
    totalDeducted: number;
    totalAdded: number;
    cvProcessingCount: number;
    interviewCount: number;
    manualAdjustments: number;
    cvProcessingDeducted: number;
    interviewDeducted: number;
  }> {
    try {
      const transactions = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.organizationId, organizationId));

      const stats = transactions.reduce(
        (acc, transaction) => {
          if (transaction.amount < 0) {
            acc.totalDeducted += Math.abs(transaction.amount);

            // Track deductions by type
            if (transaction.type === 'cv_processing') {
              acc.cvProcessingDeducted += Math.abs(transaction.amount);
              acc.cvProcessingCount += 1;
            } else if (transaction.type === 'interview') {
              acc.interviewDeducted += Math.abs(transaction.amount);
              acc.interviewCount += 1;
            }
          } else {
            acc.totalAdded += transaction.amount;
          }

          if (transaction.type === 'manual_adjustment') {
            acc.manualAdjustments += 1;
          }

          return acc;
        },
        {
          totalDeducted: 0,
          totalAdded: 0,
          cvProcessingCount: 0,
          interviewCount: 0,
          manualAdjustments: 0,
          cvProcessingDeducted: 0,
          interviewDeducted: 0
        }
      );

      return stats;
    } catch (error) {
      console.error('Error calculating credit usage:', error);
      throw new Error('Failed to calculate credit usage');
    }
  }

  /**
   * Get the cost for a specific action type from pricing table
   */
  async getActionCost(actionType: CreditActionType): Promise<number> {
    try {
      const [pricing] = await db
        .select()
        .from(creditPricing)
        .where(eq(creditPricing.actionType, actionType));

      if (!pricing || !pricing.isActive) {
        console.warn(`No active pricing found for action type: ${actionType}, using default of 1`);
        return 1; // Default fallback
      }

      return pricing.cost;
    } catch (error) {
      console.error('Error fetching action cost:', error);
      return 1; // Default fallback
    }
  }

  /**
   * Get all pricing configurations
   */
  async getAllPricing(): Promise<any[]> {
    try {
      const pricing = await db
        .select()
        .from(creditPricing)
        .orderBy(creditPricing.actionType);

      return pricing;
    } catch (error) {
      console.error('Error fetching pricing:', error);
      throw new Error('Failed to fetch pricing');
    }
  }

  /**
   * Create or update pricing for an action type
   */
  async upsertPricing(
    actionType: CreditActionType,
    cost: number,
    description?: string,
    isActive: boolean = true
  ): Promise<boolean> {
    try {
      // Check if pricing already exists
      const [existing] = await db
        .select()
        .from(creditPricing)
        .where(eq(creditPricing.actionType, actionType));

      if (existing) {
        // Update existing pricing
        await db
          .update(creditPricing)
          .set({
            cost,
            description: description || existing.description,
            isActive,
            updatedAt: new Date()
          })
          .where(eq(creditPricing.actionType, actionType));

        console.log(`Updated pricing for ${actionType} to ${cost} credits`);
      } else {
        // Insert new pricing
        await db.insert(creditPricing).values({
          id: crypto.randomUUID(),
          actionType,
          cost,
          description,
          isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`Created pricing for ${actionType}: ${cost} credits`);
      }

      return true;
    } catch (error) {
      console.error('Error upserting pricing:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to upsert pricing');
    }
  }

  /**
   * Initialize default pricing if none exists
   */
  async initializeDefaultPricing(): Promise<void> {
    try {
      const defaults: Array<{ actionType: CreditActionType; cost: number; description: string }> = [
        {
          actionType: 'resume_processing',
          cost: 1,
          description: 'Cost per resume processed and parsed'
        },
        {
          actionType: 'ai_matching',
          cost: 2,
          description: 'Cost per AI candidate matching operation'
        },
        {
          actionType: 'job_posting',
          cost: 5,
          description: 'Cost per job posting creation'
        },
        {
          actionType: 'interview_scheduling',
          cost: 1,
          description: 'Cost per interview scheduled'
        }
      ];

      for (const pricing of defaults) {
        // Only insert if doesn't exist
        const [existing] = await db
          .select()
          .from(creditPricing)
          .where(eq(creditPricing.actionType, pricing.actionType));

        if (!existing) {
          await this.upsertPricing(
            pricing.actionType,
            pricing.cost,
            pricing.description
          );
        }
      }

      console.log('Default pricing initialized');
    } catch (error) {
      console.error('Error initializing default pricing:', error);
    }
  }

  /**
   * Helper method to get organization by ID
   */
  private async getOrganizationById(organizationId: string) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    return org;
  }
}

export const creditService = new CreditService();