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
  // User operations - updated for custom auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>; // Keep for backward compatibility

  // Applicant profile operations
  getApplicantProfile(userId: string): Promise<ApplicantProfile | undefined>;
  upsertApplicantProfile(profile: InsertApplicantProfile): Promise<ApplicantProfile>;
  updateProfileCompletion(userId: string): Promise<void>;



  // Job matching operations
  getJobMatches(userId: string): Promise<(JobMatch & { job: Job })[]>;
  createJobMatch(match: InsertJobMatch): Promise<JobMatch>;
  calculateJobMatches(userId: string): Promise<void>;
  createJobFromAirtable(jobData: any): Promise<Job>;
  clearJobMatches(userId: string): Promise<void>;

  // Application operations
  getApplications(userId: string): Promise<(Application & { job: Job })[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(userId: string, jobId: number): Promise<Application | undefined>;

  // Interview operations
  createInterviewSession(session: InsertInterviewSession): Promise<InterviewSession>;
  getInterviewSession(userId: string, interviewType?: string): Promise<InterviewSession | undefined>;
  updateInterviewSession(id: number, data: Partial<InterviewSession>): Promise<void>;
  updateInterviewCompletion(userId: string, interviewType: string): Promise<void>;
  getInterviewContext(userId: string, currentInterviewType: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations - updated for custom auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
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
      essentialInfo: false,
      generalInfo: false,
      careerInterests: false,
      experience: false,
      education: false,
      onlinePresence: false,
      achievements: false,
      resumeUpload: false
    };

    // Essential Information (required for dashboard unlock) - 30 points
    // Name, email, phone, location basics
    if (profile.name || profile.email || profile.phone || profile.location || profile.age) {
      score += 30;
      details.essentialInfo = true;
    }

    // General Information - 10 points
    if (profile.birthdate || profile.gender || profile.nationality || profile.maritalStatus) {
      score += 10;
      details.generalInfo = true;
    }

    // Career Interests - 15 points
    if (profile.careerLevel || profile.jobTypes || profile.workplaceSettings || profile.jobSearchStatus) {
      score += 15;
      details.careerInterests = true;
    }

    // Experience - 15 points
    if (profile.totalYearsOfExperience || profile.workExperiences || profile.languages || 
        profile.currentRole || profile.company || profile.yearsOfExperience) {
      score += 15;
      details.experience = true;
    }

    // Education - 10 points
    if (profile.currentEducationLevel || profile.degrees || profile.highSchools || profile.certifications || 
        profile.education || profile.university || profile.degree) {
      score += 10;
      details.education = true;
    }

    // Online Presence - 5 points
    if (profile.linkedinUrl || profile.facebookUrl || profile.githubUrl || profile.websiteUrl) {
      score += 5;
      details.onlinePresence = true;
    }

    // Achievements - 5 points
    if (profile.achievements) {
      score += 5;
      details.achievements = true;
    }

    // Resume upload - 10 points
    if (profile.resumeUrl || profile.resumeContent) {
      score += 10;
      details.resumeUpload = true;
    }

    // If AI interview is completed, set to 100%
    if (profile.aiProfileGenerated) {
      score = 100;
    }

    const completionPercentage = Math.min(score, 100);

    console.log(`Profile completion for user ${userId}:`, {
      score,
      completionPercentage,
      details,
      hasEssentialInfo: details.essentialInfo,
      hasAIProfile: !!profile.aiProfileGenerated
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
    console.log('🔧 Creating job from Airtable data:', {
      title: jobData.title,
      company: jobData.company,
      description: jobData.description?.substring(0, 100) + '...'
    });
    
    const [job] = await db
      .insert(jobs)
      .values({
        title: jobData.title, // Fixed: use correct field name
        description: jobData.description,
        company: jobData.company,
        location: jobData.location || 'Remote',
        salaryRange: jobData.salaryRange || null,
        employmentType: jobData.employmentType || 'Full-time',
        experienceLevel: jobData.experienceLevel || 'Mid-level',
        skills: jobData.skills || [],
        postedDate: new Date(),
        requirements: [],
        benefits: [],
        remote: true,
        applicationCount: 0,
        isActive: true
      })
      .returning();
    return job;
  }

  async clearJobMatches(userId: string): Promise<void> {
    await db.delete(jobMatches)
      .where(eq(jobMatches.userId, userId));
    console.log(`🗑️ Cleared all job matches for user ${userId}`);
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

  async getInterviewContext(userId: string, currentInterviewType: string): Promise<any> {
    // Get all completed interviews for this user to provide context
    const completedInterviews = await db
      .select()
      .from(interviewSessions)
      .where(and(
        eq(interviewSessions.userId, userId),
        eq(interviewSessions.isCompleted, true)
      ))
      .orderBy(interviewSessions.createdAt);

    // Build comprehensive context with full conversation history
    const context = {
      previousInterviews: completedInterviews.map(session => ({
        type: session.interviewType,
        sessionData: session.sessionData,
        completedAt: session.completedAt,
        // Extract the full conversation for context
        conversation: this.extractConversationHistory(session.sessionData)
      })),
      insights: this.extractDetailedInterviewInsights(completedInterviews, currentInterviewType),
      conversationStyle: this.extractConversationStyle(completedInterviews),
      keyThemes: this.extractKeyThemes(completedInterviews),
      previousQuestions: this.extractAllPreviousQuestions(completedInterviews)
    };

    return context;
  }

  private extractConversationHistory(sessionData: any): string {
    if (!sessionData || !sessionData.responses) return '';
    
    const responses = sessionData.responses || [];
    const questions = sessionData.questions || [];
    
    let conversation = '';
    for (let i = 0; i < Math.min(responses.length, questions.length); i++) {
      conversation += `Q: ${questions[i]?.question || 'Question not available'}\n`;
      conversation += `A: ${responses[i]?.answer || 'No response'}\n\n`;
    }
    
    return conversation;
  }

  private extractDetailedInterviewInsights(completedInterviews: any[], currentType: string): string {
    if (!completedInterviews.length) return '';

    let insights = 'PREVIOUS INTERVIEW CONTEXT:\n\n';
    
    completedInterviews.forEach(session => {
      const conversation = this.extractConversationHistory(session.sessionData);
      if (conversation) {
        insights += `${session.interviewType.toUpperCase()} INTERVIEW RESPONSES:\n${conversation}\n`;
      }
    });

    // Add specific guidance based on interview progression
    if (currentType === 'professional' && completedInterviews.some(s => s.interviewType === 'personal')) {
      insights += '\nREMEMBER: You already know this candidate personally. Reference their background, values, and motivations naturally in your professional questions. Do not repeat personal topics.\n';
    }
    
    if (currentType === 'technical' && completedInterviews.length > 0) {
      insights += '\nREMEMBER: You have a complete understanding of this candidate from previous interviews. Use this knowledge to ask technical questions that align with their experience level and demonstrated capabilities. Show continuity in your understanding.\n';
    }

    return insights;
  }

  private extractConversationStyle(completedInterviews: any[]): string {
    if (!completedInterviews.length) return '';
    
    // Extract style indicators from first interview
    const firstInterview = completedInterviews[0];
    if (!firstInterview?.sessionData?.responses) return '';
    
    const responses = firstInterview.sessionData.responses || [];
    const sampleResponseRaw = responses[0]?.answer;
    
    // Ensure sampleResponse is a string
    const sampleResponse = typeof sampleResponseRaw === 'string' ? sampleResponseRaw : '';
    
    if (!sampleResponse) return ''; // Skip if no valid response
    
    // Analyze tone and style
    let style = 'CONVERSATION STYLE: ';
    if (sampleResponse.length > 100) {
      style += 'Detailed and thoughtful responses. ';
    } else {
      style += 'Concise and direct responses. ';
    }
    
    if (sampleResponse.includes('I believe') || sampleResponse.includes('I think')) {
      style += 'Reflective and introspective. ';
    }
    
    if (sampleResponse.includes('!') || sampleResponse.includes('excited')) {
      style += 'Enthusiastic and energetic. ';
    }
    
    style += 'Maintain this exact tone and style throughout all interviews.';
    
    return style;
  }

  private extractKeyThemes(completedInterviews: any[]): string[] {
    const themes: string[] = [];
    
    completedInterviews.forEach(session => {
      if (session.sessionData?.responses) {
        const responses = session.sessionData.responses || [];
        responses.forEach((response: any) => {
          // Ensure answer is a string before calling .includes()
          const answer = typeof response?.answer === 'string' ? response.answer.toLowerCase() : '';
          
          if (!answer) return; // Skip if no valid answer
          
          // Extract key themes from responses
          if (answer.includes('team') || answer.includes('collaboration')) {
            themes.push('teamwork');
          }
          if (answer.includes('leadership') || answer.includes('lead')) {
            themes.push('leadership');
          }
          if (answer.includes('innovation') || answer.includes('creative')) {
            themes.push('innovation');
          }
          if (answer.includes('challenge') || answer.includes('problem')) {
            themes.push('problem-solving');
          }
        });
      }
    });
    
    return [...new Set(themes)]; // Remove duplicates
  }

  private extractAllPreviousQuestions(completedInterviews: any[]): string[] {
    const questions: string[] = [];
    
    completedInterviews.forEach(session => {
      if (session.sessionData?.questions) {
        const sessionQuestions = session.sessionData.questions || [];
        sessionQuestions.forEach((q: any) => {
          if (q.question) {
            questions.push(q.question);
          }
        });
      }
    });
    
    return questions;
  }
}

export const storage = new DatabaseStorage();
