import {
  users,
  applicantProfiles,
  jobs,
  jobMatches,
  applications,
  interviewSessions,
  type User,
  type UpsertUser,
  type InsertApplicantProfile,
  type ApplicantProfile,
  type InsertJob,
  type Job,
  type InsertJobMatch,
  type JobMatch,
  type InsertApplication,
  type Application,
  type InsertInterviewSession,
  type InterviewSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Applicant profile operations
  getApplicantProfile(userId: string): Promise<ApplicantProfile | undefined>;
  upsertApplicantProfile(profile: InsertApplicantProfile): Promise<ApplicantProfile>;
  updateProfileCompletion(userId: string): Promise<void>;



  // Job matching operations
  getJobMatches(userId: string): Promise<(JobMatch & { job: Job })[]>;
  createJobMatch(match: InsertJobMatch): Promise<JobMatch>;
  calculateJobMatches(userId: string): Promise<void>;

  // Application operations
  getApplications(userId: string): Promise<(Application & { job: Job })[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(userId: string, jobId: number): Promise<Application | undefined>;

  // Interview operations
  createInterviewSession(session: InsertInterviewSession): Promise<InterviewSession>;
  getInterviewSession(userId: string): Promise<InterviewSession | undefined>;
  updateInterviewSession(id: number, data: Partial<InterviewSession>): Promise<void>;
  getInterviewHistory(userId: string): Promise<InterviewSession[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Applicant profile operations
  async getApplicantProfile(userId: string): Promise<ApplicantProfile | undefined> {
    const [profile] = await db
      .select()
      .from(applicantProfiles)
      .where(eq(applicantProfiles.userId, userId));
    return profile;
  }

  async upsertApplicantProfile(profileData: InsertApplicantProfile): Promise<ApplicantProfile> {
    const existing = await this.getApplicantProfile(profileData.userId);
    
    if (existing) {
      const [profile] = await db
        .update(applicantProfiles)
        .set({ ...profileData, updatedAt: new Date() })
        .where(eq(applicantProfiles.userId, profileData.userId))
        .returning();
      return profile;
    } else {
      const [profile] = await db
        .insert(applicantProfiles)
        .values(profileData)
        .returning();
      return profile;
    }
  }

  async updateProfileCompletion(userId: string): Promise<void> {
    const profile = await this.getApplicantProfile(userId);
    if (!profile) return;

    let score = 0;
    const details = {
      basicInfo: false,
      workExperience: false,
      educationDetails: false,
      skillsAndSummary: false,
      resumeUpload: false
    };
    
    // Basic information (20 points)
    if (profile.age && profile.education && profile.location) {
      score += 20;
      details.basicInfo = true;
    }
    
    // Work experience (30 points)
    if (profile.currentRole && profile.company && profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined) {
      score += 30;
      details.workExperience = true;
    }
    
    // Education details (20 points)
    if (profile.degree && profile.university) {
      score += 20;
      details.educationDetails = true;
    }
    
    // Skills and summary (15 points)
    if (profile.skillsList?.length || profile.summary) {
      score += 15;
      details.skillsAndSummary = true;
    }
    
    // Resume upload (15 points)
    if (profile.resumeContent || profile.resumeUrl) {
      score += 15;
      details.resumeUpload = true;
    }

    const completionPercentage = Math.min(score, 100);
    
    console.log(`Profile completion for user ${userId}:`, {
      score,
      completionPercentage,
      details,
      hasSkills: !!profile.skillsList?.length,
      hasSummary: !!profile.summary,
      hasResume: !!(profile.resumeContent || profile.resumeUrl)
    });

    await db
      .update(applicantProfiles)
      .set({ completionPercentage, updatedAt: new Date() })
      .where(eq(applicantProfiles.userId, userId));
  }





  // Job matching operations
  async getJobMatches(userId: string): Promise<(JobMatch & { job: Job })[]> {
    const matches = await db
      .select()
      .from(jobMatches)
      .leftJoin(jobs, eq(jobMatches.jobId, jobs.id))
      .where(eq(jobMatches.userId, userId))
      .orderBy(desc(jobMatches.matchScore));

    return matches.map(({ job_matches, jobs: job }) => ({
      ...job_matches,
      job: job!,
    }));
  }

  async createJobMatch(matchData: InsertJobMatch): Promise<JobMatch> {
    const [match] = await db.insert(jobMatches).values(matchData).returning();
    return match;
  }

  async calculateJobMatches(userId: string): Promise<void> {
    // Job matching is now handled by Airtable - this method is kept for compatibility
    // but doesn't perform any calculations since jobs come pre-matched from Airtable
    console.log(`Job matching for user ${userId} is handled by Airtable system`);
  }



  // Application operations
  async getApplications(userId: string): Promise<(Application & { job: Job })[]> {
    const apps = await db
      .select()
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.appliedAt));

    return apps.map(({ applications: app, jobs: job }) => ({
      ...app,
      job: job!,
    }));
  }

  async createApplication(applicationData: InsertApplication): Promise<Application> {
    const [application] = await db
      .insert(applications)
      .values(applicationData)
      .returning();
    return application;
  }

  async getApplication(userId: string, jobId: number): Promise<Application | undefined> {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.userId, userId), eq(applications.jobId, jobId)));
    return app;
  }

  // Interview operations
  async createInterviewSession(sessionData: InsertInterviewSession): Promise<InterviewSession> {
    const [session] = await db
      .insert(interviewSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getInterviewSession(userId: string): Promise<InterviewSession | undefined> {
    const [session] = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.userId, userId))
      .orderBy(desc(interviewSessions.createdAt));
    return session;
  }

  async updateInterviewSession(id: number, data: Partial<InterviewSession>): Promise<void> {
    await db
      .update(interviewSessions)
      .set(data)
      .where(eq(interviewSessions.id, id));
  }

  async getInterviewHistory(userId: string): Promise<InterviewSession[]> {
    const sessions = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.userId, userId))
      .orderBy(desc(interviewSessions.createdAt));
    
    return sessions;
  }
}

export const storage = new DatabaseStorage();
