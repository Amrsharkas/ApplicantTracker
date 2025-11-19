import { db } from './db';
import * as schema from '../shared/schema';
import { eq, and, or, ilike, desc, asc, gte, lte, sql, isNotNull } from 'drizzle-orm';
import {
  AirtableUserProfile,
  InsertAirtableUserProfile,
  AirtableJobPosting,
  InsertAirtableJobPosting,
  AirtableJobApplication,
  InsertAirtableJobApplication,
  AirtableJobMatch,
  InsertAirtableJobMatch
} from '../shared/schema';

export class LocalDatabaseService {

  // User Profiles Operations
  async createUserProfile(data: InsertAirtableUserProfile): Promise<AirtableUserProfile> {
    try {
      const [profile] = await db
        .insert(schema.airtableUserProfiles)
        .values(data)
        .returning();
      return profile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<AirtableUserProfile | null> {
    try {
      const [profile] = await db
        .select()
        .from(schema.airtableUserProfiles)
        .where(eq(schema.airtableUserProfiles.userId, userId));
      return profile || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, data: Partial<InsertAirtableUserProfile>): Promise<AirtableUserProfile | null> {
    try {
      const [profile] = await db
        .update(schema.airtableUserProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableUserProfiles.userId, userId))
        .returning();
      return profile || null;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getAllUserProfiles(): Promise<AirtableUserProfile[]> {
    try {
      return await db
        .select()
        .from(schema.airtableUserProfiles)
        .orderBy(desc(schema.airtableUserProfiles.createdAt));
    } catch (error) {
      console.error('Error getting all user profiles:', error);
      throw error;
    }
  }

  async searchUserProfiles(query: string): Promise<AirtableUserProfile[]> {
    try {
      return await db
        .select()
        .from(schema.airtableUserProfiles)
        .where(
          or(
            ilike(schema.airtableUserProfiles.name, `%${query}%`),
            ilike(schema.airtableUserProfiles.email, `%${query}%`),
            ilike(schema.airtableUserProfiles.professionalSummary, `%${query}%`),
            ilike(schema.airtableUserProfiles.location, `%${query}%`)
          )
        )
        .orderBy(desc(schema.airtableUserProfiles.createdAt));
    } catch (error) {
      console.error('Error searching user profiles:', error);
      throw error;
    }
  }

  async getUserProfilesByExperienceLevel(experienceLevel: string): Promise<AirtableUserProfile[]> {
    try {
      return await db
        .select()
        .from(schema.airtableUserProfiles)
        .where(eq(schema.airtableUserProfiles.experienceLevel, experienceLevel))
        .orderBy(desc(schema.airtableUserProfiles.createdAt));
    } catch (error) {
      console.error('Error getting user profiles by experience level:', error);
      throw error;
    }
  }

  async getUserProfilesByLocation(location: string): Promise<AirtableUserProfile[]> {
    try {
      return await db
        .select()
        .from(schema.airtableUserProfiles)
        .where(ilike(schema.airtableUserProfiles.location, `%${location}%`))
        .orderBy(desc(schema.airtableUserProfiles.createdAt));
    } catch (error) {
      console.error('Error getting user profiles by location:', error);
      throw error;
    }
  }

  // Job Postings Operations
  async createJobPosting(data: InsertAirtableJobPosting): Promise<AirtableJobPosting> {
    try {
      const [job] = await db
        .insert(schema.airtableJobPostings)
        .values(data)
        .returning();
      return job;
    } catch (error) {
      console.error('Error creating job posting:', error);
      throw error;
    }
  }

  async getJobPosting(jobId: string): Promise<AirtableJobPosting | null> {
    try {
      const [job] = await db
        .select()
        .from(schema.airtableJobPostings)
        .where(eq(schema.airtableJobPostings.jobId, jobId));
      return job || null;
    } catch (error) {
      console.error('Error getting job posting:', error);
      throw error;
    }
  }

  async updateJobPosting(jobId: string, data: Partial<InsertAirtableJobPosting>): Promise<AirtableJobPosting | null> {
    try {
      const [job] = await db
        .update(schema.airtableJobPostings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableJobPostings.jobId, jobId))
        .returning();
      return job || null;
    } catch (error) {
      console.error('Error updating job posting:', error);
      throw error;
    }
  }

  async getAllJobPostings(): Promise<AirtableJobPosting[]> {
    try {
      return await db
        .select()
        .from(schema.jobs)
        .orderBy(desc(schema.jobs.createdAt));
    } catch (error) {
      console.error('Error getting all job postings:', error);
      throw error;
    }
  }

  async getRecentActiveJobPostings(limit = 6) {
    try {
      const rows = await db
        .select()
        .from(schema.jobs)
        .where(eq(schema.jobs.is_active, true))
        .orderBy(desc(schema.jobs.postedAt), desc(schema.jobs.createdAt))
        .limit(limit);

      return rows.map((job) => ({
        recordId: job.id?.toString() ?? '',
        id: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        salaryRange: job.salaryRange,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        employmentType: job.employmentType,
        workplaceType: job.workplaceType,
        seniorityLevel: job.seniorityLevel,
        industry: job.industry,
        experienceLevel: job.experienceLevel,
        skills: job.skills ?? [],
        postedAt: job.postedAt ?? job.createdAt,
        employerQuestions: job.employerQuestions ?? [],
        aiPrompt: job.aiPrompt,
        companyName: job.company ?? '',
        jobType: job.jobType,
      }));
    } catch (error) {
      console.error('Error getting recent job postings:', error);
      throw error;
    }
  }

  async getJobPostingById(jobId: number) {
    try {
      const [job] = await db
        .select()
        .from(schema.jobs)
        .where(eq(schema.jobs.id, jobId));

      if (!job) {
        return null;
      }

      return {
        recordId: job.id?.toString() ?? '',
        id: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        salaryRange: job.salaryRange,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryNegotiable: job.salaryNegotiable,
        employmentType: job.employmentType,
        workplaceType: job.workplaceType,
        seniorityLevel: job.seniorityLevel,
        industry: job.industry,
        experienceLevel: job.experienceLevel,
        skills: job.skills ?? [],
        softSkills: job.softSkills ?? [],
        technicalSkills: job.technicalSkills ?? [],
        benefits: job.benefits,
        certifications: job.certifications,
        languagesRequired: job.languagesRequired,
        interviewLanguage: job.interviewLanguage,
        postedAt: job.postedAt ?? job.createdAt,
        companyName: job.company ?? '',
        jobType: job.jobType,
        is_active: job.is_active,
        views: job.views,
      };
    } catch (error) {
      console.error('Error getting job posting by ID:', error);
      throw error;
    }
  }

  async searchJobPostings(query: string): Promise<AirtableJobPosting[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobPostings)
        .where(
          or(
            ilike(schema.airtableJobPostings.jobTitle, `%${query}%`),
            ilike(schema.airtableJobPostings.company, `%${query}%`),
            ilike(schema.airtableJobPostings.location, `%${query}%`),
            ilike(schema.airtableJobPostings.jobDescription, `%${query}%`)
          )
        )
        .orderBy(desc(schema.airtableJobPostings.datePosted));
    } catch (error) {
      console.error('Error searching job postings:', error);
      throw error;
    }
  }

  async getJobPostingsByCompany(company: string): Promise<AirtableJobPosting[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobPostings)
        .where(ilike(schema.airtableJobPostings.company, `%${company}%`))
        .orderBy(desc(schema.airtableJobPostings.datePosted));
    } catch (error) {
      console.error('Error getting job postings by company:', error);
      throw error;
    }
  }

  async getJobPostingsByLocation(location: string): Promise<AirtableJobPosting[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobPostings)
        .where(ilike(schema.airtableJobPostings.location, `%${location}%`))
        .orderBy(desc(schema.airtableJobPostings.datePosted));
    } catch (error) {
      console.error('Error getting job postings by location:', error);
      throw error;
    }
  }

  async getJobPostingsBySalaryRange(minSalary: number, maxSalary: number): Promise<AirtableJobPosting[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobPostings)
        .where(
          and(
            gte(schema.airtableJobPostings.salaryMin, minSalary),
            lte(schema.airtableJobPostings.salaryMax, maxSalary)
          )
        )
        .orderBy(desc(schema.airtableJobPostings.datePosted));
    } catch (error) {
      console.error('Error getting job postings by salary range:', error);
      throw error;
    }
  }

  async deleteJobPosting(jobId: string): Promise<boolean> {
    try {
      const [deleted] = await db
        .delete(schema.airtableJobPostings)
        .where(eq(schema.airtableJobPostings.jobId, jobId))
        .returning({ id: schema.airtableJobPostings.id });
      return !!deleted;
    } catch (error) {
      console.error('Error deleting job posting:', error);
      throw error;
    }
  }

  // Job Applications Operations
  async createJobApplication(data: InsertAirtableJobApplication): Promise<AirtableJobApplication> {
    try {
      const [application] = await db
        .insert(schema.airtableJobApplications)
        .values(data)
        .returning();
      return application;
    } catch (error) {
      console.error('Error creating job application:', error);
      throw error;
    }
  }

  async getJobApplication(id: string): Promise<AirtableJobApplication | null> {
    try {
      const [application] = await db
        .select()
        .from(schema.airtableJobApplications)
        .where(eq(schema.airtableJobApplications.id, id));
      return application || null;
    } catch (error) {
      console.error('Error getting job application:', error);
      throw error;
    }
  }

  async getJobApplicationsByUser(userId: string): Promise<AirtableJobApplication[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobApplications)
        .where(eq(schema.airtableJobApplications.applicantUserId, userId))
        .orderBy(desc(schema.airtableJobApplications.applicationDate));
    } catch (error) {
      console.error('Error getting job applications by user:', error);
      throw error;
    }
  }

  async getJobApplicationsByJob(jobId: string): Promise<AirtableJobApplication[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobApplications)
        .where(eq(schema.airtableJobApplications.jobId, jobId))
        .orderBy(desc(schema.airtableJobApplications.applicationDate));
    } catch (error) {
      console.error('Error getting job applications by job:', error);
      throw error;
    }
  }

  async getJobApplicationsByStatus(status: string): Promise<AirtableJobApplication[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobApplications)
        .where(eq(schema.airtableJobApplications.status, status))
        .orderBy(desc(schema.airtableJobApplications.applicationDate));
    } catch (error) {
      console.error('Error getting job applications by status:', error);
      throw error;
    }
  }

  async updateJobApplication(id: string, data: Partial<InsertAirtableJobApplication>): Promise<AirtableJobApplication | null> {
    try {
      const [application] = await db
        .update(schema.airtableJobApplications)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableJobApplications.id, id))
        .returning();
      return application || null;
    } catch (error) {
      console.error('Error updating job application:', error);
      throw error;
    }
  }

  async updateJobApplicationStatus(id: string, status: string): Promise<AirtableJobApplication | null> {
    try {
      const [application] = await db
        .update(schema.airtableJobApplications)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.airtableJobApplications.id, id))
        .returning();
      return application || null;
    } catch (error) {
      console.error('Error updating job application status:', error);
      throw error;
    }
  }

  async getAllJobApplications(): Promise<AirtableJobApplication[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobApplications)
        .orderBy(desc(schema.airtableJobApplications.applicationDate));
    } catch (error) {
      console.error('Error getting all job applications:', error);
      throw error;
    }
  }

  // Job Matches Operations
  async createJobMatch(data: InsertAirtableJobMatch): Promise<AirtableJobMatch> {
    try {
      const [match] = await db
        .insert(schema.airtableJobMatches)
        .values(data)
        .returning();
      return match;
    } catch (error) {
      console.error('Error creating job match:', error);
      throw error;
    }
  }

  async getJobMatch(id: string): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .select()
        .from(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.id, id));
      return match || null;
    } catch (error) {
      console.error('Error getting job match:', error);
      throw error;
    }
  }

  async getJobMatchesByUser(userId: string): Promise<AirtableJobMatch[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.userId, userId))
        .orderBy(desc(schema.airtableJobMatches.createdAt));
    } catch (error) {
      console.error('Error getting job matches by user:', error);
      throw error;
    }
  }

  async getJobMatchesByJob(jobId: string): Promise<AirtableJobMatch[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.jobId, jobId))
        .orderBy(desc(schema.airtableJobMatches.createdAt));
    } catch (error) {
      console.error('Error getting job matches by job:', error);
      throw error;
    }
  }

  async getJobMatchesByStatus(status: string): Promise<AirtableJobMatch[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.status, status))
        .orderBy(desc(schema.airtableJobMatches.createdAt));
    } catch (error) {
      console.error('Error getting job matches by status:', error);
      throw error;
    }
  }

  async updateJobMatch(id: string, data: Partial<InsertAirtableJobMatch>): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .update(schema.airtableJobMatches)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableJobMatches.id, id))
        .returning();
      return match || null;
    } catch (error) {
      console.error('Error updating job match:', error);
      throw error;
    }
  }

  async updateJobMatchStatus(id: string, status: string): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .update(schema.airtableJobMatches)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.airtableJobMatches.id, id))
        .returning();
      return match || null;
    } catch (error) {
      console.error('Error updating job match status:', error);
      throw error;
    }
  }

  async scheduleInterview(id: string, interviewDate: Date, interviewTime: string, interviewLink?: string): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .update(schema.airtableJobMatches)
        .set({
          interviewDate,
          interviewTime,
          interviewLink,
          status: 'scheduled',
          updatedAt: new Date()
        })
        .where(eq(schema.airtableJobMatches.id, id))
        .returning();
      return match || null;
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw error;
    }
  }

  async getAllJobMatches(): Promise<AirtableJobMatch[]> {
    try {
      return await db
        .select()
        .from(schema.airtableJobMatches)
        .orderBy(desc(schema.airtableJobMatches.createdAt));
    } catch (error) {
      console.error('Error getting all job matches:', error);
      throw error;
    }
  }

  async getJobMatchByToken(token: string): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .select()
        .from(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.token, token))
        .orderBy(desc(schema.airtableJobMatches.createdAt))
      return match || null;
    } catch (error) {
      console.error('Error getting job match by token:', error);
      throw error;
    }
  }

  async updateJobMatchByToken(token: string, data: Partial<InsertAirtableJobMatch>): Promise<AirtableJobMatch | null> {
    try {
      const [match] = await db
        .update(schema.airtableJobMatches)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.airtableJobMatches.token, token))
        .returning();
      return match || null;
    } catch (error) {
      console.error('Error updating job match by token:', error);
      throw error;
    }
  }

  async getUpcomingInterviews(): Promise<any[]> {
    try {
      const now = new Date();

      // Fetch interviews from the interviews table
      const interviews = await db
        .select({
          id: schema.interviews.id,
          applicationId: schema.interviews.applicationId,
          jobId: schema.interviews.jobId,
          candidateId: schema.interviews.candidateId,
          candidateName: schema.interviews.candidateName,
          scheduledDate: schema.interviews.scheduledDate,
          scheduledTime: schema.interviews.scheduledTime,
          meetingLink: schema.interviews.meetingLink,
          status: schema.interviews.status,
          jobTitle: schema.jobs.title,
          companyName: schema.jobs.company,
          userId: schema.applications.userId,
        })
        .from(schema.interviews)
        .leftJoin(schema.jobs, eq(schema.interviews.jobId, schema.jobs.id))
        .leftJoin(schema.applications, eq(schema.interviews.applicationId, schema.applications.id))
        .where(
          and(
            eq(schema.interviews.status, 'scheduled'),
            gte(schema.interviews.scheduledDate, now)
          )
        )
        .orderBy(asc(schema.interviews.scheduledDate));

      // Format the response to match the expected interface
      return interviews.map((interview: any) => ({
        recordId: interview.id?.toString() || '',
        jobTitle: interview.jobTitle || 'Unknown Position',
        companyName: interview.companyName || 'Unknown Company',
        interviewDateTime: this.combineDateTime(interview.scheduledDate, interview.scheduledTime),
        interviewLink: interview.meetingLink || '',
        userId: interview.userId || interview.candidateId || '',
      }));
    } catch (error) {
      console.error('Error getting upcoming interviews:', error);
      throw error;
    }
  }

  private combineDateTime(scheduledDate: Date | null, scheduledTime: string | null): string {
    if (!scheduledDate) return '';

    try {
      const date = new Date(scheduledDate);
      if (scheduledTime) {
        // If we have a time, combine it with the date
        return `${date.toISOString().split('T')[0]} at ${scheduledTime}`;
      }
      return date.toISOString();
    } catch (error) {
      console.error('Error combining date and time:', error);
      return '';
    }
  }

  async deleteJobMatchesByJobId(jobId: string): Promise<void> {
    try {
      await db
        .delete(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.jobId, jobId));
    } catch (error) {
      console.error('Error deleting job matches by job ID:', error);
      throw error;
    }
  }

  async deleteJobMatchesByUserId(userId: string): Promise<void> {
    try {
      await db
        .delete(schema.airtableJobMatches)
        .where(eq(schema.airtableJobMatches.userId, userId));
    } catch (error) {
      console.error('Error deleting job matches by user ID:', error);
      throw error;
    }
  }

  // Statistics and Analytics
  async getUserProfileStats(): Promise<any> {
    try {
      const totalProfiles = await db
        .select({ count: sql`count(*)` })
        .from(schema.airtableUserProfiles);

      const profilesByExperience = await db
        .select({
          experienceLevel: schema.airtableUserProfiles.experienceLevel,
          count: sql`count(*)`
        })
        .from(schema.airtableUserProfiles)
        .groupBy(schema.airtableUserProfiles.experienceLevel);

      const profilesByLocation = await db
        .select({
          location: schema.airtableUserProfiles.location,
          count: sql`count(*)`
        })
        .from(schema.airtableUserProfiles)
        .where(isNotNull(schema.airtableUserProfiles.location))
        .groupBy(schema.airtableUserProfiles.location)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      return {
        total: totalProfiles[0]?.count || 0,
        byExperience: profilesByExperience,
        byLocation: profilesByLocation
      };
    } catch (error) {
      console.error('Error getting user profile stats:', error);
      throw error;
    }
  }

  async getJobPostingStats(): Promise<any> {
    try {
      const totalPostings = await db
        .select({ count: sql`count(*)` })
        .from(schema.airtableJobPostings);

      const postingsByCompany = await db
        .select({
          company: schema.airtableJobPostings.company,
          count: sql`count(*)`
        })
        .from(schema.airtableJobPostings)
        .groupBy(schema.airtableJobPostings.company)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const postingsByLocation = await db
        .select({
          location: schema.airtableJobPostings.location,
          count: sql`count(*)`
        })
        .from(schema.airtableJobPostings)
        .where(isNotNull(schema.airtableJobPostings.location))
        .groupBy(schema.airtableJobPostings.location)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      return {
        total: totalPostings[0]?.count || 0,
        byCompany: postingsByCompany,
        byLocation: postingsByLocation
      };
    } catch (error) {
      console.error('Error getting job posting stats:', error);
      throw error;
    }
  }

  async getApplicationStats(): Promise<any> {
    try {
      const totalApplications = await db
        .select({ count: sql`count(*)` })
        .from(schema.airtableJobApplications);

      const applicationsByStatus = await db
        .select({
          status: schema.airtableJobApplications.status,
          count: sql`count(*)`
        })
        .from(schema.airtableJobApplications)
        .groupBy(schema.airtableJobApplications.status);

      return {
        total: totalApplications[0]?.count || 0,
        byStatus: applicationsByStatus
      };
    } catch (error) {
      console.error('Error getting application stats:', error);
      throw error;
    }
  }
}

export const localDatabaseService = new LocalDatabaseService();