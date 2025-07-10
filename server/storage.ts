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
  createJobFromAirtable(jobData: any): Promise<Job>;

  // Application operations
  getApplications(userId: string): Promise<(Application & { job: Job })[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(userId: string, jobId: number): Promise<Application | undefined>;

  // Interview operations
  createInterviewSession(session: InsertInterviewSession): Promise<InterviewSession>;
  getInterviewSession(userId: string, interviewType?: string): Promise<InterviewSession | undefined>;
  updateInterviewSession(id: number, data: Partial<InterviewSession>): Promise<void>;
  getInterviewHistory(userId: string): Promise<InterviewSession[]>;
  updateInterviewCompletion(userId: string, interviewType: string): Promise<void>;
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
    const maxScore = 1000; // Total required points for 100% completion
    
    // Section 1: General Information (200 points - required fields only)
    let generalScore = 0;
    if (profile.name) generalScore += 30;
    if (profile.birthdate) generalScore += 30;
    if (profile.gender) generalScore += 20;
    if (profile.nationality) generalScore += 20;
    if (profile.country) generalScore += 30;
    if (profile.city) generalScore += 30;
    if (profile.mobileNumber) generalScore += 20;
    if (profile.emailAddress) generalScore += 20;
    score += generalScore;

    // Section 2: Career Interests (150 points)
    let careerScore = 0;
    if (profile.careerLevel) careerScore += 25;
    if (profile.jobTypesOpen?.length) careerScore += 25;
    if (profile.preferredWorkplace) careerScore += 25;
    if (profile.desiredJobTitles?.length) careerScore += 25;
    if (profile.jobCategories?.length) careerScore += 25;
    if (profile.jobSearchStatus) careerScore += 25;
    score += careerScore;

    // Section 3: CV Upload (100 points)
    if (profile.resumeContent || profile.resumeUrl) {
      score += 100;
    }

    // Section 4: Work Experience (150 points)
    let workScore = 0;
    const workExperiences = profile.workExperiences as any[] || [];
    if (profile.totalYearsExperience !== null && profile.totalYearsExperience !== undefined) workScore += 50;
    if (workExperiences.length > 0) workScore += 100;
    score += workScore;

    // Section 5: Skills (100 points)
    const skills = profile.skills as any[] || [];
    if (skills.length > 0) {
      score += 100;
    }

    // Section 6: Languages (100 points)
    const languages = profile.languages as any[] || [];
    if (languages.length > 0) {
      score += 100;
    }

    // Section 7: Education (100 points)
    let educationScore = 0;
    if (profile.currentEducationLevel) educationScore += 30;
    const universityDegrees = profile.universityDegrees as any[] || [];
    if (universityDegrees.length > 0) educationScore += 70;
    score += educationScore;

    // Calculate completion percentage (based on required fields only)
    // Required sections total: 200 + 150 + 100 + 150 + 100 + 100 + 100 = 1000 points
    // Optional sections (certifications, training, online presence, achievements) do NOT count toward completion
    const requiredScore = Math.min(score, 1000);
    const completionPercentage = Math.round((requiredScore / 1000) * 100);
    
    // Optional sections (for tracking only, not included in completion percentage)
    const certifications = profile.certifications as any[] || [];
    const trainingCourses = profile.trainingCourses as any[] || [];
    let onlineScore = 0;
    if (profile.linkedinUrl) onlineScore += 30;
    if (profile.githubUrl || profile.websiteUrl || profile.facebookUrl || profile.twitterUrl || profile.instagramUrl || profile.youtubeUrl || profile.otherUrl) {
      onlineScore += 20;
    }
    const achievementsScore = profile.achievements && profile.achievements.trim() ? 10 : 0;
    
    console.log(`Profile completion for user ${userId}:`, {
      requiredScore,
      maxRequiredScore: maxScore,
      completionPercentage,
      requiredFieldsBreakdown: {
        general: generalScore,
        career: careerScore,
        cv: profile.resumeContent || profile.resumeUrl ? 100 : 0,
        work: workScore,
        skills: skills.length > 0 ? 100 : 0,
        languages: languages.length > 0 ? 100 : 0,
        education: educationScore,
      },
      optionalFieldsStatus: {
        certifications: certifications.length > 0 ? `${certifications.length} added` : 'none',
        training: trainingCourses.length > 0 ? `${trainingCourses.length} added` : 'none',
        onlinePresence: onlineScore > 0 ? 'configured' : 'none',
        achievements: achievementsScore > 0 ? 'added' : 'none'
      }
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

  async createJobFromAirtable(jobData: any): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values({
        title: jobData.jobTitle,
        description: jobData.jobDescription,
        company: jobData.companyName,
        location: jobData.location || null,
        salaryRange: jobData.salaryRange || null,
        employmentType: jobData.employmentType || 'Full-time',
        experienceLevel: jobData.experienceLevel || 'Mid-level',
        skills: jobData.skills || [],
        postedDate: new Date(),
        requirements: [],
        benefits: [],
        remote: false,
        applicationCount: 0,
        isActive: true
      })
      .returning();
    return job;
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

  async getInterviewSession(userId: string, interviewType?: string): Promise<InterviewSession | undefined> {
    let query = db
      .select()
      .from(interviewSessions);
    
    if (interviewType) {
      query = query.where(and(
        eq(interviewSessions.userId, userId),
        eq(interviewSessions.interviewType, interviewType)
      ));
    } else {
      query = query.where(eq(interviewSessions.userId, userId));
    }
    
    const [session] = await query
      .orderBy(desc(interviewSessions.createdAt))
      .limit(1);
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

  async updateInterviewCompletion(userId: string, interviewType: string): Promise<void> {
    let updateData: any = {};
    
    switch (interviewType) {
      case 'personal':
        updateData.personalInterviewCompleted = true;
        break;
      case 'professional':
        updateData.professionalInterviewCompleted = true;
        break;
      case 'technical':
        updateData.technicalInterviewCompleted = true;
        break;
      default:
        throw new Error(`Invalid interview type: ${interviewType}`);
    }

    await db
      .update(applicantProfiles)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(applicantProfiles.userId, userId));
  }
}

export const storage = new DatabaseStorage();
