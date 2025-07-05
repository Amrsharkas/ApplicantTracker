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

  // Job operations
  getAllJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  searchJobs(query: string, location?: string, experienceLevel?: string): Promise<Job[]>;
  createJobFromAirtable(jobData: {
    title: string;
    company: string;
    description: string;
    location?: string;
    experienceLevel?: string;
    skills?: string[];
    jobType?: string;
  }): Promise<Job>;

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

  // Job operations
  async getAllJobs(): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.isActive, true))
      .orderBy(desc(jobs.postedAt));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async searchJobs(query: string, location?: string, experienceLevel?: string): Promise<Job[]> {
    let conditions = [eq(jobs.isActive, true)];

    if (query) {
      conditions.push(
        sql`(${jobs.title} ILIKE ${`%${query}%`} OR ${jobs.description} ILIKE ${`%${query}%`} OR ${jobs.company} ILIKE ${`%${query}%`})`
      );
    }

    if (location) {
      conditions.push(sql`${jobs.location} ILIKE ${`%${location}%`}`);
    }

    if (experienceLevel) {
      conditions.push(eq(jobs.experienceLevel, experienceLevel));
    }

    return await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.postedAt));
  }

  async createJobFromAirtable(jobData: {
    title: string;
    company: string;
    description: string;
    location?: string;
    experienceLevel?: string;
    skills?: string[];
    jobType?: string;
  }): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values({
        title: jobData.title,
        company: jobData.company,
        description: jobData.description,
        location: jobData.location || 'Remote',
        experienceLevel: jobData.experienceLevel || 'mid',
        skills: jobData.skills || [],
        jobType: jobData.jobType || 'remote',
        isActive: true,
        postedAt: new Date()
      })
      .returning();
    
    return job;
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
    const profile = await this.getApplicantProfile(userId);
    if (!profile || !profile.aiProfile) return;

    const allJobs = await this.getAllJobs();
    const existingMatches = await db
      .select()
      .from(jobMatches)
      .where(eq(jobMatches.userId, userId));

    const existingJobIds = existingMatches.map(m => m.jobId);

    for (const job of allJobs) {
      if (existingJobIds.includes(job.id)) continue;

      const matchScore = this.calculateMatchScore(profile, job);
      const matchReasons = this.generateMatchReasons(profile, job, matchScore);

      if (matchScore >= 60) { // Only create matches with score >= 60
        await this.createJobMatch({
          userId,
          jobId: job.id,
          matchScore,
          matchReasons,
        });
      }
    }
  }

  private calculateMatchScore(profile: ApplicantProfile, job: Job): number {
    let score = 0;
    const maxScore = 100;

    // Skills matching (40% weight)
    if (profile.skillsList && job.skills) {
      const profileSkills = profile.skillsList.map(s => s.toLowerCase());
      const jobSkills = job.skills.map(s => s.toLowerCase());
      const matchingSkills = profileSkills.filter(skill => 
        jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
      );
      const skillScore = (matchingSkills.length / Math.max(jobSkills.length, 1)) * 40;
      score += Math.min(skillScore, 40);
    }

    // Experience level matching (30% weight)
    if (profile.yearsOfExperience && job.experienceLevel) {
      const expScore = this.calculateExperienceMatch(profile.yearsOfExperience, job.experienceLevel);
      score += expScore * 30;
    }

    // Location matching (20% weight)
    if (profile.location && job.location) {
      if (job.location.toLowerCase().includes('remote') || 
          profile.location.toLowerCase().includes(job.location.toLowerCase()) ||
          job.location.toLowerCase().includes(profile.location.toLowerCase())) {
        score += 20;
      }
    }

    // Title/role matching (10% weight)
    if (profile.currentRole && job.title) {
      const roleWords = profile.currentRole.toLowerCase().split(' ');
      const titleWords = job.title.toLowerCase().split(' ');
      const matchingWords = roleWords.filter(word => 
        titleWords.some(titleWord => titleWord.includes(word) || word.includes(titleWord))
      );
      if (matchingWords.length > 0) {
        score += (matchingWords.length / Math.max(titleWords.length, 1)) * 10;
      }
    }

    return Math.min(Math.round(score), maxScore);
  }

  private calculateExperienceMatch(userExp: number, jobLevel: string): number {
    const level = jobLevel.toLowerCase();
    if (level.includes('entry') || level.includes('junior')) {
      return userExp <= 2 ? 1 : Math.max(0, 1 - (userExp - 2) * 0.2);
    } else if (level.includes('mid') || level.includes('intermediate')) {
      return userExp >= 2 && userExp <= 5 ? 1 : Math.max(0, 1 - Math.abs(userExp - 3.5) * 0.2);
    } else if (level.includes('senior') || level.includes('lead')) {
      return userExp >= 5 ? 1 : Math.max(0, userExp * 0.2);
    }
    return 0.5; // Default for unknown levels
  }

  private generateMatchReasons(profile: ApplicantProfile, job: Job, score: number): string[] {
    const reasons: string[] = [];

    if (profile.skillsList && job.skills) {
      const matchingSkills = profile.skillsList.filter(skill => 
        job.skills!.some(jobSkill => jobSkill.toLowerCase().includes(skill.toLowerCase()))
      );
      if (matchingSkills.length > 0) {
        reasons.push(`Matching skills: ${matchingSkills.slice(0, 3).join(', ')}`);
      }
    }

    if (profile.yearsOfExperience && job.experienceLevel) {
      reasons.push(`Experience level aligns with ${job.experienceLevel} requirement`);
    }

    if (job.location?.toLowerCase().includes('remote')) {
      reasons.push('Remote work opportunity');
    }

    if (score >= 90) {
      reasons.push('Excellent overall fit');
    } else if (score >= 80) {
      reasons.push('Strong profile match');
    }

    return reasons;
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
