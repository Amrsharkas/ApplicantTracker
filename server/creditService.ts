import { creditTransactions, organizations, creditPricing } from '@shared/schema';
import { db } from './db';
import { eq, desc } from 'drizzle-orm';
import type { InsertCreditTransaction, InsertCreditPricing } from '@shared/schema';

export type CreditTransactionType = 'resume_processing' | 'interview_scheduling' | 'manual_adjustment';
export type CreditActionType = 'resume_processing' | 'ai_matching' | 'job_posting' | 'interview_scheduling';

export interface CreditBalance {
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
        currentCredits: org.currentCredits || 0,
        creditLimit: org.creditLimit || 100,
        remainingCredits: (org.currentCredits || 0)
      };
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      throw new Error('Failed to fetch credit balance');
    }
  }

  /**
   * Check if organization has sufficient credits
   */
  async checkCredits(organizationId: string, requiredAmount: number): Promise<boolean> {
    try {
      const balance = await this.getCreditBalance(organizationId);
      if (!balance) {
        return false;
      }
      return balance.remainingCredits >= requiredAmount;
    } catch (error) {
      console.error('Error checking credits:', error);
      return false;
    }
  }

  /**
   * Deduct credits from organization balance
   */
  async deductCredits(
    organizationId: string,
    amount: number,
    type: CreditTransactionType,
    description: string,
    relatedId?: string
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

        if ((org.currentCredits || 0) < amount) {
          throw new Error('Insufficient credits');
        }

        // Update organization credits
        const newCreditBalance = (org.currentCredits || 0) - amount;
        await tx
          .update(organizations)
          .set({
            currentCredits: newCreditBalance,
            updatedAt: new Date()
          })
          .where(eq(organizations.id, organizationId));

        // Create credit transaction record
        await tx.insert(creditTransactions).values({
          id: crypto.randomUUID(),
          organizationId,
          amount: -amount, // Negative for deduction
          type,
          description,
          relatedId,
          createdAt: new Date()
        });

        return newCreditBalance;
      });

      console.log(`💳 Successfully deducted ${amount} credits from organization ${organizationId}. New balance: ${result}`);
      return true;
    } catch (error) {
      console.error('❌ Error deducting credits:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to deduct credits');
    }
  }

  /**
   * Add credits to organization balance (admin function)
   */
  async addCredits(
    organizationId: string,
    amount: number,
    description: string = 'Manual credit addition'
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

        // Update organization credits
        const newCreditBalance = (org.currentCredits || 0) + amount;
        await tx
          .update(organizations)
          .set({
            currentCredits: newCreditBalance,
            updatedAt: new Date()
          })
          .where(eq(organizations.id, organizationId));

        // Create credit transaction record
        await tx.insert(creditTransactions).values({
          id: crypto.randomUUID(),
          organizationId,
          amount: amount, // Positive for addition
          type: 'manual_adjustment',
          description,
          createdAt: new Date()
        });

        return newCreditBalance;
      });

      console.log(`✅ Successfully added ${amount} credits to organization ${organizationId}. New balance: ${result}`);
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
    resumeProcessingCount: number;
    interviewSchedulingCount: number;
    manualAdjustments: number;
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
          } else {
            acc.totalAdded += transaction.amount;
          }

          switch (transaction.type) {
            case 'resume_processing':
              acc.resumeProcessingCount += 1;
              break;
            case 'interview_scheduling':
              acc.interviewSchedulingCount += 1;
              break;
            case 'manual_adjustment':
              acc.manualAdjustments += 1;
              break;
          }

          return acc;
        },
        {
          totalDeducted: 0,
          totalAdded: 0,
          resumeProcessingCount: 0,
          interviewSchedulingCount: 0,
          manualAdjustments: 0
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
