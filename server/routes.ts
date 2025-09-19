import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { aiInterviewService, aiProfileAnalysisAgent, aiInterviewAgent } from "./openai";
import { airtableService } from "./airtable";
import { aiJobFilteringService } from "./aiJobFiltering";
import { employerQuestionService } from "./employerQuestions";
import { ObjectStorageService } from "./objectStorage";
import { ResumeService } from "./resumeService";
import multer from "multer";
import { z } from "zod";
import { insertApplicantProfileSchema, insertApplicationSchema, insertResumeUploadSchema, InsertApplicantProfile, openaiRequests } from "@shared/schema";
// Dynamic import for pdf-parse will be used when needed
import { db } from "./db";
import { applicantProfiles, interviewSessions, resumeUploads, jobMatches, applications, sessions, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { wrapOpenAIRequest } from "./openaiTracker";


const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const resumeService = new ResumeService();

// Centralized AI profile generation with deduplication
const profileGenerationLock = new Map<string, Promise<any>>();

interface JobSummary {
  recordId: string;
  jobTitle: string;
  jobDescription?: string;
  companyName: string;
  location?: string;
}

async function generateComprehensiveAIProfile(userId: string, updatedProfile: any, storage: any, aiInterviewService: any, airtableService: any, job?: JobSummary) {
  // Check if profile generation is already in progress for this user
  if (profileGenerationLock.has(userId)) {
    console.log(`📋 AI profile generation already in progress for user ${userId}, waiting...`);
    return await profileGenerationLock.get(userId);
  }

  // Check if AI profile already generated
  if (updatedProfile?.aiProfileGenerated) {
    console.log(`📋 AI profile already generated for user ${userId}, skipping...`);
    return updatedProfile.aiProfile;
  }

  // Create a promise for this profile generation
  const generationPromise = (async (job) => {
    try {
      console.log(`📋 Starting comprehensive AI profile generation for user ${userId}`);
      
      // Get user data for comprehensive analysis
      const user = await storage.getUser(userId);
      
      // Get all interview sessions for this user using the new method
      const allInterviewSessions = await storage.getAllInterviewSessions(userId);
      const allResponses = allInterviewSessions.flatMap((session: any) => 
        session.sessionData?.responses || []
      );

      // Get resume content from profile
      const resumeContent = updatedProfile?.resumeContent || null;

      // Use AI Agent 2 to generate comprehensive profile from ALL interviews
      const generatedProfile = await aiInterviewService.generateProfile(
        { ...user, ...updatedProfile },
        resumeContent,
        allResponses,
        `Job Descritpion: ${job?.jobDescription}`
      );

      // Update profile with AI data - mark as generated to prevent duplicates
      await storage.upsertApplicantProfile({
        userId,
        ...updatedProfile,
        aiProfile: generatedProfile,
        aiProfileGenerated: true,
        summary: generatedProfile.summary,
        skillsList: generatedProfile.skills
      });

      // Calculate job matches
      await storage.calculateJobMatches(userId);

      // Store profile in Airtable (only once)
      try {
        const userName = user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.email || `User ${userId}`;
        
        await airtableService.storeUserProfile(userName, generatedProfile, userId, user?.email);
        console.log('📋 Successfully stored comprehensive profile in Airtable for user:', userId);
      } catch (error) {
        console.error('📋 Failed to store profile in Airtable:', error);
        // Don't fail the entire request if Airtable fails
      }

      console.log(`📋 Comprehensive AI profile generation completed for user ${userId}`);
      return generatedProfile;
    } catch (error) {
      console.error(`📋 Error generating comprehensive AI profile for user ${userId}:`, error);
      throw error;
    } finally {
      // Remove the lock when done
      profileGenerationLock.delete(userId);
    }
  })(job);

  // Store the promise in the lock map
  profileGenerationLock.set(userId, generationPromise);
  
  return await generationPromise;
}

// Helper function to create CV analysis from manual data
function createManualCVAnalysisFromData(cvData: any) {
  return {
    skills: [...(cvData.technicalSkills || []), ...(cvData.softSkills || [])],
    experience: (cvData.workExperiences || []).map((exp: any) => ({
      company: exp.company,
      position: exp.position,
      duration: `${exp.startDate} - ${exp.endDate || 'Present'}`,
      responsibilities: exp.responsibilities ? exp.responsibilities.split('\n').filter((r: string) => r.trim()) : []
    })),
    education: (cvData.degrees || []).map((deg: any) => ({
      institution: deg.institution,
      degree: deg.degree,
      field: deg.field,
      year: deg.endDate
    })),
    summary: cvData.summary,
    strengths: cvData.technicalSkills || [],
    areas_for_improvement: [], // Will be determined during interviews
    career_level: determineCareerLevel(cvData.workExperiences || []),
    total_experience_years: calculateTotalExperience(cvData.workExperiences || []),
    
    // Enhanced analysis for interview context
    interview_notes: {
      red_flags: [],
      impressive_achievements: cvData.achievements ? [cvData.achievements] : [],
      skill_gaps: [],
      experience_inconsistencies: [],
      career_progression_notes: [],
      verification_points: (cvData.workExperiences || []).map((exp: any) => 
        `Verify ${exp.position} role at ${exp.company}`
      ),
      potential_interview_topics: generateInterviewTopics(cvData)
    },
    
    // Raw data for deep analysis
    raw_analysis: {
      education_analysis: generateEducationAnalysis(cvData.degrees || []),
      experience_analysis: generateExperienceAnalysis(cvData.workExperiences || []),
      skills_assessment: generateSkillsAssessment(cvData),
      overall_impression: generateOverallImpression(cvData),
      credibility_assessment: "Manual entry - requires interview verification"
    }
  };
}

function determineCareerLevel(experiences: any[]): string {
  const totalYears = calculateTotalExperience(experiences);
  if (totalYears < 2) return "entry_level";
  if (totalYears < 5) return "mid_level";
  if (totalYears < 10) return "senior_level";
  return "executive";
}

function calculateTotalExperience(experiences: any[]): number {
  if (!experiences || experiences.length === 0) return 0;
  
  // Simple calculation based on number of roles
  // In a real scenario, you'd parse dates properly
  return experiences.length * 2; // Rough estimate
}

function generateInterviewTopics(cvData: any): string[] {
  const topics = [];
  
  if (cvData.workExperiences?.length > 0) {
    cvData.workExperiences.forEach((exp: any) => {
      topics.push(`Discuss role at ${exp.company} as ${exp.position}`);
    });
  }
  
  if (cvData.certifications?.length > 0) {
    cvData.certifications.forEach((cert: any) => {
      topics.push(`How ${cert.name} certification was applied practically`);
    });
  }
  
  if (cvData.achievements) {
    topics.push("Elaborate on key achievements mentioned");
  }
  
  return topics;
}

function generateEducationAnalysis(degrees: any[]): string {
  if (!degrees || degrees.length === 0) return "No formal education information provided";
  
  return degrees.map(deg => 
    `${deg.degree} in ${deg.field || 'unspecified field'} from ${deg.institution}`
  ).join("; ");
}

function generateExperienceAnalysis(experiences: any[]): string {
  if (!experiences || experiences.length === 0) return "No work experience information provided";
  
  return experiences.map(exp => 
    `${exp.position} at ${exp.company} (${exp.startDate || 'Unknown start'} - ${exp.endDate || 'Present'})`
  ).join("; ");
}

function generateSkillsAssessment(cvData: any): string {
  const techSkills = cvData.technicalSkills?.length || 0;
  const softSkills = cvData.softSkills?.length || 0;
  
  return `${techSkills} technical skills and ${softSkills} soft skills listed. Requires validation through practical examples.`;
}

function generateOverallImpression(cvData: any): string {
  const hasExperience = (cvData.workExperiences?.length || 0) > 0;
  const hasEducation = (cvData.degrees?.length || 0) > 0;
  const hasSkills = (cvData.technicalSkills?.length || 0) + (cvData.softSkills?.length || 0) > 0;
  
  let impression = "Candidate has provided ";
  const components = [];
  
  if (hasExperience) components.push("work experience");
  if (hasEducation) components.push("educational background");
  if (hasSkills) components.push("skills information");
  
  impression += components.join(", ");
  impression += ". All information requires verification through detailed interviews.";
  
  return impression;
}

// Helper function to sanitize text content for database storage
function sanitizeTextForDatabase(text: string): string {
  if (!text) return '';
  
  // Remove null bytes and other invalid UTF-8 sequences
  return text
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
    .trim();
}

// Helper function to sanitize JSON data for database storage
function sanitizeJsonForDatabase(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'string') {
    return sanitizeTextForDatabase(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeJsonForDatabase(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeJsonForDatabase(value);
    }
    return sanitized;
  }
  
  return data;
}

// Helper function to map parsed resume data to profile schema
function mapResumeDataToProfile(parsedData: any, userId: string): any {
  const profileData: any = { userId };

  // Personal Details
  if (parsedData.personalDetails) {
    const personal = parsedData.personalDetails;
    if (personal.name) profileData.name = personal.name;
    if (personal.email) profileData.email = personal.email;
    if (personal.phone) profileData.phone = personal.phone;
    if (personal.dateOfBirth) {
      try {
        // Convert date to string format for database compatibility
        const date = new Date(personal.dateOfBirth);
        profileData.birthdate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      } catch (e) {
        console.warn("Invalid date format for birthdate:", personal.dateOfBirth);
      }
    }
    if (personal.nationality) profileData.nationality = personal.nationality;
    if (personal.gender) profileData.gender = personal.gender;
    
    // Location
    if (personal.location) {
      if (personal.location.city) profileData.city = personal.location.city;
      if (personal.location.country) profileData.country = personal.location.country;
    }
  }

  // Work Experience
  if (parsedData.workExperience && Array.isArray(parsedData.workExperience)) {
    profileData.workExperiences = parsedData.workExperience.map((exp: any) => ({
      company: exp.company || '',
      position: exp.position || '',
      startDate: exp.startDate || '',
      endDate: exp.current ? '' : (exp.endDate || ''),
      current: exp.current || false,
      location: exp.location || '',
      employmentType: exp.employmentType || 'full-time',
      responsibilities: exp.responsibilities || '',
      yearsAtPosition: exp.yearsAtPosition || 0
    }));

    // Calculate total years of experience
    if (parsedData.careerInformation?.totalYearsOfExperience) {
      profileData.totalYearsOfExperience = parseInt(parsedData.careerInformation.totalYearsOfExperience) || 0;
    }
  }

  // Education
  if (parsedData.education && Array.isArray(parsedData.education)) {
    profileData.degrees = parsedData.education.map((edu: any) => ({
      institution: edu.institution || '',
      degree: edu.degree || '',
      field: edu.fieldOfStudy || '',
      startDate: edu.startDate || '',
      endDate: edu.current ? '' : (edu.endDate || ''),
      current: edu.current || false,
      gpa: edu.gpa ? parseFloat(edu.gpa) : null,
      location: edu.location || '',
      honors: edu.honors || ''
    }));

    // Set current education level
    if (parsedData.careerInformation?.currentEducationLevel) {
      profileData.currentEducationLevel = parsedData.careerInformation.currentEducationLevel;
    }
  }

  // Skills
  if (parsedData.skills) {
    const allSkills = [];
    
    // Combine technical and soft skills into skillsList
    if (parsedData.skills.technicalSkills && Array.isArray(parsedData.skills.technicalSkills)) {
      allSkills.push(...parsedData.skills.technicalSkills.map((skill: any) => skill.skill || skill));
    }
    if (parsedData.skills.softSkills && Array.isArray(parsedData.skills.softSkills)) {
      allSkills.push(...parsedData.skills.softSkills.map((skill: any) => skill.skill || skill));
    }
    
    if (allSkills.length > 0) {
      profileData.skillsList = allSkills;
    }

    // Languages
    if (parsedData.skills.languages && Array.isArray(parsedData.skills.languages)) {
      profileData.languages = parsedData.skills.languages.map((lang: any) => ({
        language: lang.language || '',
        proficiency: lang.proficiency || 'intermediate',
        certification: lang.certification || ''
      }));
    }
  }

  // Certifications
  if (parsedData.certifications && Array.isArray(parsedData.certifications)) {
    profileData.certifications = parsedData.certifications.map((cert: any) => ({
      name: cert.name || '',
      issuer: cert.issuer || '',
      dateObtained: cert.dateObtained || '',
      expiryDate: cert.expiryDate || '',
      credentialId: cert.credentialId || ''
    }));
  }

  // Online Presence
  if (parsedData.onlinePresence) {
    const online = parsedData.onlinePresence;
    if (online.linkedinUrl) profileData.linkedinUrl = online.linkedinUrl;
    if (online.githubUrl) profileData.githubUrl = online.githubUrl;
    if (online.websiteUrl) profileData.websiteUrl = online.websiteUrl;
    if (online.portfolioUrl && !profileData.websiteUrl) profileData.websiteUrl = online.portfolioUrl;
    if (online.otherUrls && Array.isArray(online.otherUrls)) {
      profileData.otherUrls = online.otherUrls;
    }
  }

  // Career Information
  if (parsedData.careerInformation) {
    const career = parsedData.careerInformation;
    if (career.careerLevel) profileData.careerLevel = career.careerLevel;
    if (career.summary) profileData.summary = career.summary;
    if (career.jobTitles && Array.isArray(career.jobTitles)) {
      profileData.jobTitles = career.jobTitles;
    }
    if (career.industries && Array.isArray(career.industries)) {
      profileData.jobCategories = career.industries;
    }
  }

  // Achievements
  if (parsedData.achievements) {
    profileData.achievements = parsedData.achievements;
  }

  // Set completion percentage boost for resume-populated data
  profileData.completionPercentage = 40; // Base completion for having resume data

  return profileData;
}

// Helper function to calculate profile completion percentage
function calculateProfileCompletion(profileData: any): number {
  let score = 0;
  const maxScore = 100;

  // Personal details (20 points)
  if (profileData.name) score += 5;
  if (profileData.email) score += 5;
  if (profileData.phone) score += 5;
  if (profileData.city && profileData.country) score += 5;

  // Work experience (25 points)
  if (profileData.workExperiences && Array.isArray(profileData.workExperiences) && profileData.workExperiences.length > 0) {
    score += 15;
    if (profileData.totalYearsOfExperience) score += 10;
  }

  // Education (15 points)
  if (profileData.degrees && Array.isArray(profileData.degrees) && profileData.degrees.length > 0) {
    score += 15;
  }

  // Skills (15 points)
  if (profileData.skillsList && Array.isArray(profileData.skillsList) && profileData.skillsList.length > 0) {
    score += 15;
  }

  // Career information (10 points)
  if (profileData.summary) score += 5;
  if (profileData.careerLevel) score += 5;

  // Online presence (10 points)
  if (profileData.linkedinUrl || profileData.githubUrl || profileData.websiteUrl) score += 10;

  // Languages (5 points)
  if (profileData.languages && Array.isArray(profileData.languages) && profileData.languages.length > 0) {
    score += 5;
  }

  return Math.min(score, maxScore);
}

// Basic fallback extraction for when AI parsing fails
function extractBasicInfo(resumeText: string): any {
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = resumeText.match(/[\+]?[1-9][\d]{0,15}/);
  const nameLines = resumeText.split('\n').slice(0, 3);
  
  return {
    name: nameLines[0]?.trim() || null,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null
  };
}

// Helper function to generate summary of extracted fields
function getExtractedFieldsSummary(parsedData: any): any {
  const summary: any = {
    personalInfo: false,
    workExperience: false,
    education: false,
    skills: false,
    onlinePresence: false,
    certifications: false,
    languages: false
  };

  if (parsedData.personalDetails && (parsedData.personalDetails.name || parsedData.personalDetails.email || parsedData.personalDetails.phone)) {
    summary.personalInfo = true;
  }

  if (parsedData.workExperience && Array.isArray(parsedData.workExperience) && parsedData.workExperience.length > 0) {
    summary.workExperience = true;
    summary.workExperienceCount = parsedData.workExperience.length;
  }

  if (parsedData.education && Array.isArray(parsedData.education) && parsedData.education.length > 0) {
    summary.education = true;
    summary.educationCount = parsedData.education.length;
  }

  if (parsedData.skills && (parsedData.skills.technicalSkills || parsedData.skills.softSkills)) {
    summary.skills = true;
    summary.skillsCount = (parsedData.skills.technicalSkills?.length || 0) + (parsedData.skills.softSkills?.length || 0);
  }

  if (parsedData.onlinePresence && (parsedData.onlinePresence.linkedinUrl || parsedData.onlinePresence.githubUrl || parsedData.onlinePresence.websiteUrl)) {
    summary.onlinePresence = true;
  }

  if (parsedData.certifications && Array.isArray(parsedData.certifications) && parsedData.certifications.length > 0) {
    summary.certifications = true;
    summary.certificationsCount = parsedData.certifications.length;
  }

  if (parsedData.skills?.languages && Array.isArray(parsedData.skills.languages) && parsedData.skills.languages.length > 0) {
    summary.languages = true;
    summary.languagesCount = parsedData.skills.languages.length;
  }

  return summary;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  

  // Note: Auth routes are now handled in setupAuth from auth.ts

  // AI Interview initiation via Airtable token
  app.get('/api/ai-interview-initation', async (req: any, res) => {
    try {
      const token = (req.query.token || '').toString().trim();
      if (!token) {
        return res.status(400).json({ error: 'Missing token' });
      }

      const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const AIRTABLE_USERS_BASE_ID = process.env.AIRTABLE_USERS_BASE_ID;
      const AIRTABLE_USERS_TABLE_NAME = process.env.AIRTABLE_USERS_TABLE_NAME || 'Table 2';

      if (!AIRTABLE_USERS_BASE_ID) {
        console.warn('AIRTABLE_USERS_BASE_ID not configured');
        return res.status(500).json({ error: 'Airtable users base not configured' });
      }

      const headers = {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      } as any;

      // Try to fetch the record by record ID first
      let airtableRecord: any | null = null;
      const possibleTables = [AIRTABLE_USERS_TABLE_NAME, 'Users', 'Table 1'];
      let lastError: any = null;

      for (const tableName of possibleTables) {
        try {
          const byIdUrl = `https://api.airtable.com/v0/${AIRTABLE_USERS_BASE_ID}/${encodeURIComponent(tableName)}/${encodeURIComponent(token)}`;
          const byIdResp = await fetch(byIdUrl, { headers });
          if (byIdResp.ok) {
            airtableRecord = await byIdResp.json();
            break;
          }
        } catch (e) {
          lastError = e;
        }
      }

      // If not found by ID, search by Token field variations
      if (!airtableRecord) {
        const tokenFields = [ 'token'];
        for (const tableName of possibleTables) {
          for (const fieldName of tokenFields) {
            try {
              const formula = `({${fieldName}} = "${token}")`;
              const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_USERS_BASE_ID}/${encodeURIComponent(tableName)}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
              const resp = await fetch(searchUrl, { headers });
              if (resp.ok) {
                const data = await resp.json();
                if (data.records && data.records.length > 0) {
                  airtableRecord = data.records[0];
                  break;
                }
              } else {
                lastError = await resp.text();
              }
            } catch (e) {
              lastError = e;
            }
          }
          console.log("record foundxx ");
          console.log(airtableRecord);
          if (airtableRecord) break;
        }
      }

      if (!airtableRecord) {
        console.error('Airtable user record not found for token', token, lastError);
        return res.status(404).json({ error: 'Invalid or expired token' });
      }

      const fields = airtableRecord.fields || {};
      const email = fields['email'] || fields['Email'] || fields['E-mail'] || fields['userEmail'];
      const firstName = fields['first_name'];
      const lastName = fields['last_name'];
      const name = fields['name'] || fields['Name'] || `${firstName || ''} ${lastName || ''}`.trim();
      const username = (fields['username'] || fields['Username'] || undefined) + Math.random();

      if (!email) {
        return res.status(400).json({ error: 'Airtable record missing email' });
      }

      // Find or create user
      let user = await storage.getUserByEmail(email);

      if (!user) {
        // Hash a random password
        const scryptAsync = promisify(scrypt);
        const rawPassword = randomBytes(16).toString('hex');
        const salt = randomBytes(16).toString('hex');
        const buf = (await scryptAsync(rawPassword, salt, 64)) as Buffer;
        const hashedPassword = `${buf.toString('hex')}.${salt}`;

        const userId = randomBytes(16).toString('hex');
        user = await storage.createUser({
          id: userId,
          email,
          password: hashedPassword,
          firstName: firstName || (name ? name.split(' ')[0] : ''),
          lastName: lastName || (name ? name.split(' ').slice(1).join(' ') : ''),
          username,
          role: 'applicant'
        });

        // Create minimal applicant profile
        try {
          await storage.upsertApplicantProfile({
            userId: user.id,
            name: name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: email
          } as any);
        } catch (profileError) {
          console.warn('Failed to create initial applicant profile:', profileError);
        }
      }

      // Create session
      req.session.userId = user.id;

      // If Airtable record contains an OpenAI file id for the user's CV, process it to populate profile before redirect
      try {
        const openaiFileId = fields['file_id'] || fields['fileId'] || fields['openai_file_id'] || fields['openAiFileId'] || fields['openaiFileId'] || '';
        if (typeof openaiFileId === 'string' && openaiFileId.trim().length > 0) {
          console.log(`📄 Found OpenAI file_id on Airtable record: ${openaiFileId}`);

          // Extract text via OpenAI file_id
          let resumeContent = await aiProfileAnalysisAgent.extractResumeTextFromOpenAIFileId(openaiFileId.trim());
          resumeContent = sanitizeTextForDatabase(resumeContent);

          if (resumeContent && resumeContent.trim().length >= 100) {
            // Parse and map to profile
            const parsedResumeData = await aiInterviewService.parseResumeForProfile(resumeContent);
            const profileData = mapResumeDataToProfile(parsedResumeData, user.id);
            const existingProfile = await storage.getApplicantProfile(user.id);
            const mergedProfile = {
              ...existingProfile,
              ...profileData,
              resumeContent: resumeContent.substring(0, 10000),
              updatedAt: new Date(),
              completionPercentage: calculateProfileCompletion(profileData)
            };

            const updatedProfile = await storage.upsertApplicantProfile(mergedProfile);
            await storage.updateProfileCompletion(user.id);

            // Store a resume record for tracking
            try {
              const resumeRecord = await storage.createResumeUpload({
                userId: user.id,
                filename: `openai_${openaiFileId}.txt`,
                originalName: `openai_file_${openaiFileId}`,
                filePath: `/openai/${openaiFileId}`,
                fileSize: resumeContent.length,
                mimeType: 'text/plain',
                extractedText: resumeContent,
                aiAnalysis: parsedResumeData
              } as any);
              await storage.setActiveResume(user.id, (resumeRecord as any).id);
            } catch (resumeErr) {
              console.warn('Failed to create resume record from OpenAI file_id:', resumeErr);
            }

            console.log('✅ Profile auto-populated from OpenAI file before redirect');
          } else {
            console.warn('⚠️ Resume content from OpenAI file_id was empty or too short; skipping auto-population');
          }
        }
      } catch (autoPopulateError) {
        console.warn('⚠️ Auto-population from OpenAI file_id failed, continuing to redirect:', autoPopulateError);
      }

      // Update platojobmatchAIinterview table: set user_id for all records with matching token
      try {
        const MATCH_BASE_ID = process.env.AIRTABLE_MATCH_AI_INTERVIEW_BASE_ID || process.env.AIRTABLE_JOB_MATCHES_BASE_ID;
        const MATCH_TABLE = process.env.AIRTABLE_MATCH_AI_INTERVIEW_TABLE_NAME || 'Table 1';
        if (!MATCH_BASE_ID) {
          console.warn('⚠️ No Airtable base configured for platojobmatchAIinterview (set AIRTABLE_MATCH_AI_INTERVIEW_BASE_ID)');
        } else {
          const filterFormula = `({token} = "${token}")`;
          const listUrl = `https://api.airtable.com/v0/${MATCH_BASE_ID}/${encodeURIComponent(MATCH_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}&pageSize=100`;
          const listResp = await fetch(listUrl, { headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          } });
          if (listResp.ok) {
            const data = await listResp.json();
            const records = Array.isArray(data?.records) ? data.records : [];
            if (records.length > 0) {
              console.log(`🔄 Updating ${records.length} record(s) in platojobmatchAIinterview with user_id=${user.id}`);
              for (const rec of records) {
                try {
                  const updateUrl = `https://api.airtable.com/v0/${MATCH_BASE_ID}/${encodeURIComponent(MATCH_TABLE)}/${rec.id}`;
                  const updateResp = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields: { "user_id": user.id } })
                  });
                  if (!updateResp.ok) {
                    console.warn(`❌ Failed to update record ${rec.id} user_id:`, await updateResp.text());
                  }
                } catch (updateErr) {
                  console.warn(`❌ Error updating record ${rec?.id}:`, updateErr);
                }
              }
            } else {
              console.log('ℹ️ No matching records found in platojobmatchAIinterview for provided token');
            }
          } else {
            console.warn('❌ Failed to list platojobmatchAIinterview records:', listResp.status, await listResp.text());
          }
        }
      } catch (matchUpdateError) {
        console.warn('⚠️ Failed to update platojobmatchAIinterview user_id records:', matchUpdateError);
      }

      return res.json({ success: true, redirect: '/dashboard' });
    } catch (error) {
      console.error('Error in ai-interview-initation:', error);
      return res.status(500).json({ error: 'Failed to initiate interview' });
    }
  });

  // Debug endpoint for authentication issues
  app.get('/api/auth/debug', (req: any, res) => {
    const authInfo = {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      userId: req.session?.userId,
      hasUser: !!req.user,
      hostname: req.hostname,
      userAgent: req.get('User-Agent'),
      cookies: req.cookies
    };
    console.log('🔍 Auth debug info:', authInfo);
    res.json(authInfo);
  });

  app.get('/api/openai/requests', requireAuth, async (req: any, res) => {
    try {
      const requests = await db.select().from(openaiRequests).orderBy(openaiRequests.createdAt);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching OpenAI requests:", error);
      res.status(500).json({ message: "Failed to fetch OpenAI requests" });
    }
  });

  app.put('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const updateData = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        displayName: z.string().optional(),
      }).parse(req.body);

      const updatedUser = await storage.updateUser(userId, updateData);
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Profile routes
  app.get('/api/candidate/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getApplicantProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Handle both PUT and POST for profile updates
  const handleProfileUpdate = async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      console.log("Profile update request for user:", userId, "with data:", req.body);
      
      // Preprocess the data to handle empty date fields
      const processedBody = { ...req.body };
      
      // Convert empty date strings to null
      const dateFields = ['birthdate', 'dateOfBirth'];
      dateFields.forEach(field => {
        if (processedBody[field] === '' || processedBody[field] === 'Invalid Date') {
          processedBody[field] = null;
        }
      });
      
      // Handle nested date fields in personal details
      if (processedBody.personalDetails?.dateOfBirth === '' || processedBody.personalDetails?.dateOfBirth === 'Invalid Date') {
        processedBody.personalDetails.dateOfBirth = null;
      }
      
      // Convert empty arrays to null where appropriate
      const arrayFields = ['jobTypes', 'jobTitles', 'jobCategories', 'preferredWorkCountries', 'workExperiences', 'languages', 'degrees', 'highSchools', 'certifications', 'trainingCourses', 'otherUrls'];
      arrayFields.forEach(field => {
        if (Array.isArray(processedBody[field]) && processedBody[field].length === 0) {
          processedBody[field] = null;
        }
      });
      
      // Convert numeric fields to integers to prevent decimal validation errors
      const integerFields = ['totalYearsOfExperience', 'age', 'yearsOfExperience', 'completionPercentage', 'minimumSalary'];
      integerFields.forEach(field => {
        if (processedBody[field] !== undefined && processedBody[field] !== null && processedBody[field] !== '') {
          const numValue = parseFloat(processedBody[field]);
          if (!isNaN(numValue)) {
            processedBody[field] = Math.round(numValue); // Convert to integer
          }
        }
      });
      
      // Handle nested integer fields in JSONB objects
      if (processedBody.degrees && Array.isArray(processedBody.degrees)) {
        processedBody.degrees = processedBody.degrees.map((degree: any) => ({
          ...degree,
          gpa: degree.gpa && !isNaN(parseFloat(degree.gpa)) ? parseFloat(degree.gpa) : degree.gpa
        }));
      }
      
      if (processedBody.workExperiences && Array.isArray(processedBody.workExperiences)) {
        processedBody.workExperiences = processedBody.workExperiences.map((exp: any) => ({
          ...exp,
          yearsAtPosition: exp.yearsAtPosition && !isNaN(parseFloat(exp.yearsAtPosition)) ? Math.round(parseFloat(exp.yearsAtPosition)) : exp.yearsAtPosition
        }));
      }
      
      // Handle experience array specifically for "currently working here" checkbox
      if (processedBody.experience && Array.isArray(processedBody.experience)) {
        processedBody.experience = processedBody.experience.map((exp: any) => ({
          ...exp,
          // If currently working, clear the end date
          endDate: exp.current ? "" : exp.endDate,
          // Ensure numeric fields are handled properly
          yearsAtPosition: exp.yearsAtPosition && !isNaN(parseFloat(exp.yearsAtPosition)) ? Math.round(parseFloat(exp.yearsAtPosition)) : exp.yearsAtPosition
        }));
      }
      
      // For simple profile updates, validate only the fields being sent
      const profileData = {
        userId,
        ...processedBody
      };

      const profile = await storage.upsertApplicantProfile(profileData);
      await storage.updateProfileCompletion(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ 
        error: "Failed to update profile",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  app.put('/api/candidate/profile', requireAuth, handleProfileUpdate);
  app.post('/api/candidate/profile', requireAuth, handleProfileUpdate);

  // Resume upload endpoints
  const objectStorageService = new ObjectStorageService();
  const resumeService = new ResumeService();

  // Get upload URL for resume
  // Manual CV data entry endpoint (replaces resume upload)
  app.post('/api/candidate/manual-cv', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cvData = req.body;
      
      // Validate required fields
      if (!cvData.name || !cvData.email || !cvData.summary) {
        return res.status(400).json({ error: "Name, email, and summary are required" });
      }

      // Prepare comprehensive profile data with manual CV information - ensure ALL fields are saved
      const profileData = {
        userId,
        
        // Personal Details from Manual CV
        name: cvData.name,
        email: cvData.email,
        phone: cvData.phone,
        birthdate: cvData.birthdate ? new Date(cvData.birthdate) : null,
        gender: cvData.gender,
        nationality: cvData.nationality,
        maritalStatus: cvData.maritalStatus,
        dependents: cvData.dependents,
        militaryStatus: cvData.militaryStatus,
        
        // Location
        country: cvData.country,
        city: cvData.city,
        willingToRelocate: cvData.willingToRelocate,
        
        // Online Presence & Portfolio
        linkedinUrl: cvData.linkedinUrl,
        githubUrl: cvData.githubUrl,
        websiteUrl: cvData.websiteUrl,
        facebookUrl: cvData.facebookUrl,
        twitterUrl: cvData.twitterUrl,
        instagramUrl: cvData.instagramUrl,
        youtubeUrl: cvData.youtubeUrl,
        otherUrls: cvData.otherUrls,
        
        // Work Eligibility & Preferences
        preferredWorkCountries: cvData.preferredWorkCountries,
        workplaceSettings: cvData.workplaceSettings,
        
        // Education and experience as JSONB
        degrees: cvData.degrees,
        currentEducationLevel: cvData.currentEducationLevel,
        highSchools: cvData.highSchools,
        workExperiences: cvData.workExperiences,
        totalYearsOfExperience: cvData.totalYearsOfExperience,
        
        // Languages and Skills
        languages: cvData.languages,
        skillsList: [...(cvData.technicalSkills || []), ...(cvData.softSkills || [])],
        
        // Certifications and Training
        certifications: cvData.certifications,
        trainingCourses: cvData.trainingCourses,
        
        // Career preferences and job targeting
        jobTypes: cvData.jobTypes,
        jobTitles: cvData.jobTitles,
        jobCategories: cvData.jobCategories,
        careerLevel: cvData.careerLevel,
        minimumSalary: cvData.minimumSalary,
        hideSalaryFromCompanies: cvData.hideSalaryFromCompanies,
        jobSearchStatus: cvData.jobSearchStatus,
        
        // Professional summary and achievements
        summary: cvData.summary,
        achievements: cvData.achievements,
        
        // Mark manual CV as completed (equivalent to resume upload)
        resumeContent: cvData.summary, // Store summary as resume content for backward compatibility
        completionPercentage: 40, // Manual CV completion gives significant progress
        updatedAt: new Date(),
      };

      await storage.upsertApplicantProfile(profileData);

      // Create manual CV analysis for AI interviews (similar to resume analysis)
      const manualCVAnalysis = createManualCVAnalysisFromData(cvData);
      
      // Store the analysis for interview use (in the resumeContent field for compatibility)
      await storage.updateApplicantProfile(userId, {
        resumeContent: JSON.stringify(manualCVAnalysis),
      });

      res.json({ 
        message: "Manual CV information saved successfully",
        hasCV: true,
        analysis: manualCVAnalysis
      });
    } catch (error) {
      console.error("Error saving manual CV:", error);
      res.status(500).json({ error: "Failed to save CV information" });
    }
  });

  // Process uploaded resume
  app.post('/api/resume/process', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { filename, uploadURL, fileSize, mimeType } = req.body;

      if (!filename || !uploadURL) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Extract file path from upload URL
      const urlObj = new URL(uploadURL);
      const filePath = urlObj.pathname.replace(/^\/[^\/]+/, ''); // Remove bucket name from path

      // Create resume record
      const resumeData = {
        userId,
        filename: `${Date.now()}_${filename}`,
        originalName: filename,
        filePath: filePath,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream'
      };

      const resumeRecord = await storage.createResumeUpload(resumeData);

      // Extract text and analyze in background
      try {
        let extractedText = '';
        
        if (mimeType === 'application/pdf') {
          extractedText = await resumeService.extractTextFromPDF(filePath);
        }

        if (extractedText) {
          const analysis = await resumeService.analyzeResume(extractedText);
          await storage.updateResumeAnalysis(resumeRecord.id, {
            ...analysis,
            extractedText
          });
        }

        // Set as active resume
        await storage.setActiveResume(userId, resumeRecord.id);

      } catch (analysisError) {
        console.error("Error analyzing resume:", analysisError);
        // Don't fail the request if analysis fails
      }

      res.json({ 
        message: "Resume uploaded and processed successfully",
        resumeId: resumeRecord.id 
      });
    } catch (error) {
      console.error("Error processing resume:", error);
      res.status(500).json({ message: "Failed to process resume" });
    }
  });

  // Get user's resumes
  app.get('/api/resume', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const resumes = await storage.getAllResumes(userId);
      res.json(resumes);
    } catch (error) {
      console.error("Error fetching resumes:", error);
      res.status(500).json({ message: "Failed to fetch resumes" });
    }
  });

  // Get active resume
  app.get('/api/resume/active', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const activeResume = await storage.getActiveResume(userId);
      res.json(activeResume || null);
    } catch (error) {
      console.error("Error fetching active resume:", error);
      res.status(500).json({ message: "Failed to fetch active resume" });
    }
  });

  // Download resume file
  app.get('/api/resume/:id/download', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const resumeId = parseInt(req.params.id);
      
      const resumes = await storage.getAllResumes(userId);
      const resume = resumes.find(r => r.id === resumeId);
      
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      const file = await objectStorageService.getResumeFile(resume.filePath);
      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error downloading resume:", error);
      res.status(500).json({ message: "Failed to download resume" });
    }
  });

  // Resume upload route
  app.post('/api/candidate/resume', requireAuth, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let resumeContent = '';
      
      try {
        console.log(`Processing file: ${req.file.originalname}, mimetype: ${req.file.mimetype}, size: ${req.file.size}`);
        
        // Handle different file types
        if (req.file.mimetype === 'application/pdf') {
          try {
            // Use pdfjs-dist to parse PDF
            const loadingTask = pdfjs.getDocument({ data: req.file.buffer });
            const pdf = await loadingTask.promise;
            let fullText = '';
            
            // Extract text from all pages
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const page = await pdf.getPage(pageNum);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + ' ';
            }
            
            resumeContent = fullText.trim();
            console.log(`PDF parsed successfully, extracted ${resumeContent.length} characters`);
          } catch (pdfError) {
            console.error("PDF parsing error:", pdfError);
            // Continue with upload even if PDF parsing fails, but save the file
            resumeContent = `[PDF content could not be parsed - file uploaded as ${req.file.originalname}]`;
          }
        } else if (req.file.mimetype === 'text/plain' || req.file.originalname.endsWith('.txt')) {
          // Handle plain text files
          resumeContent = req.file.buffer.toString('utf-8');
          console.log(`Text file parsed successfully, ${resumeContent.length} characters`);
        } else if (req.file.mimetype === 'application/msword' || req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // For now, we'll ask users to upload PDF or text files
          return res.status(400).json({ 
            message: "Please upload your resume as a PDF or text file for better parsing accuracy" 
          });
        } else {
          return res.status(400).json({ 
            message: "Unsupported file type. Please upload a PDF or text file." 
          });
        }
      } catch (parseError) {
        console.error("Error processing resume file:", parseError);
        // Don't fail the entire upload, just continue without text extraction
        resumeContent = `[File uploaded as ${req.file.originalname} - content parsing failed]`;
      }

      // Allow upload even if text extraction fails - the file itself is still valuable
      if (!resumeContent.trim()) {
        resumeContent = `[Resume file uploaded: ${req.file.originalname}]`;
        console.log("No text content extracted, but allowing upload with filename reference");
      }

      // Parse resume content with AI (with timeout)
      let parsedData = {};
      try {
        // Add timeout to prevent hanging
        const parsePromise = aiInterviewService.parseResume(resumeContent);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI parsing timeout')), 10000)
        );
        parsedData = await Promise.race([parsePromise, timeoutPromise]);
      } catch (aiError) {
        console.warn("AI parsing failed, continuing with resume upload:", aiError);
        // Continue with upload even if AI parsing fails
      }

      // Update profile with parsed resume data
      const existingProfile = await storage.getApplicantProfile(userId);
      const resumeUrl = `/uploads/resume_${userId}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
      
      const updatedProfile = {
        userId,
        resumeContent: resumeContent.substring(0, 10000), // Limit to 10k chars to avoid DB issues
        resumeUrl,
        ...existingProfile,
        ...parsedData,
      };

      const profile = await storage.upsertApplicantProfile(updatedProfile);
      await storage.updateProfileCompletion(userId);

      res.json({ 
        message: "Resume uploaded successfully", 
        profile,
        extractedText: resumeContent.length > 0,
        aiParsed: Object.keys(parsedData).length > 0
      });
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ 
        message: "Failed to upload resume. Please try again." 
      });
    }
  });

  // Enhanced Resume Processing with Auto Profile Population
  app.post('/api/resume/process-and-populate', requireAuth, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const fileIdFromBody = (req.body?.file_id || req.body?.fileId || '').toString().trim();
      const hasOpenAIFileId = !!fileIdFromBody;
      const hasUpload = !!req.file;

      if (!hasOpenAIFileId && !hasUpload) {
        return res.status(400).json({ message: "No file uploaded or file_id provided" });
      }

      let resumeContent = '';
      
      try {
        if (hasOpenAIFileId) {
          console.log(`Processing resume via OpenAI file_id: ${fileIdFromBody}`);
          resumeContent = await aiProfileAnalysisAgent.extractResumeTextFromOpenAIFileId(fileIdFromBody);
        } else if (hasUpload && req.file) {
          console.log(`Processing file via OpenAI extraction: ${req.file.originalname}, mimetype: ${req.file.mimetype}, size: ${req.file.size}`);
          // Avoid local OCR/PDF parsing. Let OpenAI read the file directly and return plaintext.
          resumeContent = await aiProfileAnalysisAgent.extractResumeTextWithOpenAI({
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype
          });
        }
        resumeContent = sanitizeTextForDatabase(resumeContent);
      } catch (parseError) {
        console.error("OpenAI file extraction failed:", parseError);
        return res.status(500).json({ 
          message: "Failed to extract text from resume. Please try again." 
        });
      }

      if (!resumeContent.trim()) {
        return res.status(400).json({ 
          message: "No text content could be extracted from the resume. Please check the file and try again." 
        });
      }

      // Additional validation for extracted text quality
      if (resumeContent.length < 100) {
        console.warn(`⚠️ Very short resume content extracted: ${resumeContent.length} characters`);
        console.warn(`⚠️ Content preview: "${resumeContent.substring(0, 200)}"`);
        
        return res.status(400).json({ 
          message: "The extracted text from your resume is too short to process effectively. This might be an image-based PDF or the file may be corrupted. Please try uploading a text version (.txt) of your resume." 
        });
      }

      // Check if the content looks like actual resume text
      const hasResumeKeywords = /(experience|education|skills|work|job|university|degree|company|position|resume|cv)/i.test(resumeContent);
      if (!hasResumeKeywords && resumeContent.length < 500) {
        console.warn(`⚠️ Extracted content doesn't appear to be resume text`);
        console.warn(`⚠️ Content preview: "${resumeContent.substring(0, 300)}"`);
        
        return res.status(400).json({ 
          message: "The extracted content doesn't appear to be a resume. Please ensure you're uploading a resume file with text content (not just images)." 
        });
      }

      // Parse resume with enhanced AI extraction
      let parsedResumeData = {};
      try {
        console.log(`🤖 Starting enhanced AI parsing for auto-population...`);
        console.log(`🤖 Resume content length: ${resumeContent.length} characters`);
        console.log(`🤖 Resume content sample (first 200 chars): ${resumeContent.substring(0, 200)}...`);
        
        // Log the full content for debugging (you can remove this in production)
        console.log('🤖 Full resume content for AI processing:');
        console.log(resumeContent);
        
        parsedResumeData = await aiInterviewService.parseResumeForProfile(resumeContent);
        console.log(`✅ AI parsing completed, extracted sections:`, Object.keys(parsedResumeData));
        console.log(`✅ Full parsed data:`, JSON.stringify(parsedResumeData, null, 2));
        
        // Check if parsing returned empty or invalid data
        if (!parsedResumeData || Object.keys(parsedResumeData).length === 0) {
          console.warn('⚠️ AI parsing returned empty data, attempting fallback extraction...');
          // Basic fallback parsing for text content
          parsedResumeData = {
            personalDetails: extractBasicInfo(resumeContent),
            rawContent: resumeContent
          };
        }
      } catch (aiError) {
        console.error("Enhanced AI parsing failed:", aiError);
        return res.status(500).json({ 
          message: "Failed to analyze resume content. Please try again." 
        });
      }

      // Map parsed data to profile schema
      const profileData = mapResumeDataToProfile(parsedResumeData, userId);
      
      // Get existing profile to preserve any manually entered data
      const existingProfile = await storage.getApplicantProfile(userId);
      
      // Merge with existing profile, giving precedence to resume data for empty/null fields
      const mergedProfile = {
        ...existingProfile,
        ...profileData,
        // Always update these fields from resume
        resumeContent: resumeContent.substring(0, 10000),
        updatedAt: new Date(),
        // Calculate completion percentage after population
        completionPercentage: calculateProfileCompletion(profileData)
      };

      // Update profile in database
      const updatedProfile = await storage.upsertApplicantProfile(mergedProfile);
      await storage.updateProfileCompletion(userId);

      // Create resume record for tracking
      const resumeData = {
        userId,
        filename: hasUpload && req.file ? `${Date.now()}_${req.file.originalname}` : (hasOpenAIFileId ? `openai_${fileIdFromBody}.txt` : `resume_${Date.now()}.txt`),
        originalName: hasUpload && req.file ? req.file.originalname : (hasOpenAIFileId ? `openai_file_${fileIdFromBody}` : 'unknown'),
        filePath: hasUpload && req.file ? `/temp/${req.file.originalname}` : (hasOpenAIFileId ? `/openai/${fileIdFromBody}` : '/temp/unknown'),
        fileSize: hasUpload && req.file ? req.file.size : resumeContent.length,
        mimeType: hasUpload && req.file ? req.file.mimetype : 'text/plain',
        extractedText: resumeContent,
        aiAnalysis: parsedResumeData
      };

      try {
        const resumeRecord = await storage.createResumeUpload(resumeData);
        await storage.setActiveResume(userId, resumeRecord.id);
      } catch (resumeError) {
        console.warn("Failed to create resume record, but profile was updated:", resumeError);
      }

      res.json({ 
        message: "Resume processed and profile automatically populated successfully!",
        profile: updatedProfile,
        extractedFields: getExtractedFieldsSummary(parsedResumeData),
        completionPercentage: mergedProfile.completionPercentage,
        aiParsed: true
      });
    } catch (error) {
      console.error("Error in enhanced resume processing:", error);
      res.status(500).json({ 
        message: "Failed to process resume and populate profile. Please try again." 
      });
    }
  });

  // AI Coaching endpoint - Pro plan exclusive feature
  app.post("/api/coaching/career-guidance", 
    requireAuth, 
    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { question, context } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }
      
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);
      
      // Get user's complete profile and interview history for personalized coaching
      const interviewHistory = await storage.getInterviewHistory(userId);
      
      const coachingResponse = await aiInterviewService.generateCareerGuidance({
        user,
        profile,
        question,
        context,
        interviewHistory
      });
      
      res.json({ 
        guidance: coachingResponse,
        coachingType: 'career-guidance',
        personalizedFor: user.firstName || 'User'
      });
    } catch (error) {
      console.error("Error providing AI coaching:", error);
      res.status(500).json({ error: "Failed to provide career guidance" });
    }
  });

  // Mock Interview endpoint - Pro plan exclusive feature
  app.post("/api/coaching/mock-interview", 
    requireAuth, 
    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { interviewType = 'general', jobRole, companyName } = req.body;
      
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);
      
      // Generate mock interview questions tailored to the user's profile
      const mockInterview = await aiInterviewService.generateMockInterview({
        user,
        profile,
        interviewType,
        jobRole,
        companyName
      });
      
      res.json({ 
        mockInterview,
        sessionType: 'mock-interview',
        targetRole: jobRole || 'General Interview'
      });
    } catch (error) {
      console.error("Error generating mock interview:", error);
      res.status(500).json({ error: "Failed to generate mock interview" });
    }
  });

  // Create ephemeral token for Realtime API
  app.post("/api/realtime/session", requireAuth, async (req, res) => {
    try {
      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: "verse",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI Realtime API error:", response.status, errorText);
        return res.status(500).json({ 
          error: "Failed to create realtime session",
          details: `OpenAI API returned ${response.status}`
        });
      }

      const data = await response.json();
      console.log("Successfully created realtime session:", data.id);
      res.json(data);
    } catch (error) {
      console.error("Error creating realtime session:", error);
      res.status(500).json({ 
        error: "Failed to create realtime session",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Voice interview initialization route
  app.post("/api/interview/start-voice", 
    requireAuth, 
    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { interviewType, language = 'english' } = req.body;
      
      // Validate interview type
      if (!['personal', 'professional', 'technical'].includes(interviewType)) {
        return res.status(400).json({ 
          error: "Invalid interview type",
          details: "Must be personal, professional, or technical"
        });
      }

      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Get resume content and analysis from profile
      const resumeContent = profile?.resumeContent || null;
      let resumeAnalysis = null;
      
      if (userId) {
        try {
          const resumeUpload = await storage.getActiveResume(userId);
          resumeAnalysis = resumeUpload?.aiAnalysis;
        } catch (error) {
          console.log("No resume analysis found:", error);
        }
      }

      // Get context from previous interviews to maintain continuity
      const interviewContext = await storage.getInterviewContext(userId, interviewType);

      // Generate the specific interview set with context and resume analysis
      let currentSet;
      if (interviewType === 'personal') {
        currentSet = await aiInterviewService.generatePersonalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, resumeAnalysis, language);
      } else if (interviewType === 'professional') {
        currentSet = await aiInterviewService.generateProfessionalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, interviewContext, resumeAnalysis, language);
      } else if (interviewType === 'technical') {
        currentSet = await aiInterviewService.generateTechnicalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, interviewContext, resumeAnalysis, language);
      }

      if (!currentSet) {
        return res.status(500).json({
          error: "Failed to generate interview questions",
          details: `Could not create ${interviewType} interview`
        });
      }

      // Create interview session
      const session = await storage.createInterviewSession({
        userId,
        interviewType,
        sessionData: { 
          questions: currentSet.questions, 
          responses: [], 
          currentQuestionIndex: 0,
          interviewSet: currentSet,
          context: interviewContext
        },
        isCompleted: false
      });

      // Generate welcome message with language support
      const welcomeMessage = await aiInterviewService.generateWelcomeMessage({
        ...user,
        ...profile
      }, language);

      // Extract the first question text properly
      const firstQuestion = currentSet.questions && currentSet.questions.length > 0 
        ? (typeof currentSet.questions[0] === 'string' ? currentSet.questions[0] : currentSet.questions[0]?.question || '')
        : '';

      res.json({ 
        sessionId: session.id,
        interviewType,
        interviewSet: currentSet,
        questions: currentSet.questions,
        firstQuestion,
        welcomeMessage,
        userProfile: {
          ...user,
          ...profile
        }
      });
    } catch (error) {
      console.error("Error starting voice interview:", error);
      res.status(500).json({ 
        error: "Failed to start voice interview",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Interview routes
  // Start a job-specific practice interview (voice)
  app.post('/api/interview/start-job-practice-voice', 
    requireAuth,
    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { job, language = 'english' } = req.body || {};

      if (!job || !job.jobTitle) {
        return res.status(400).json({ message: 'Job details required' });
      }

      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Generate job-specific practice set
      const practiceSet = await aiInterviewService.generateJobPracticeInterview({
        ...user,
        ...profile
      }, job, language);

      // Create a session indicating voice mode
      const session = await storage.createInterviewSession({
        userId,
        interviewType: 'job-practice',
        sessionData: {
          questions: practiceSet.questions || [],
          responses: [],
          currentQuestionIndex: 0,
          interviewSet: practiceSet,
          context: { job },
          mode: 'voice'
        },
        isCompleted: false
      });

      // Prepare welcome message similar to other voice start endpoints
      const welcomeMessage = await aiInterviewService.generateWelcomeMessage({
        ...user,
        ...profile
      }, language);

      const firstQuestion = Array.isArray(practiceSet.questions) && practiceSet.questions.length > 0
        ? (typeof practiceSet.questions[0] === 'string' ? practiceSet.questions[0] : practiceSet.questions[0]?.question || '')
        : '';

      res.json({
        sessionId: session.id,
        interviewType: 'job-practice',
        interviewSet: practiceSet,
        questions: practiceSet.questions,
        firstQuestion,
        welcomeMessage,
        userProfile: { ...user, ...profile }
      });
    } catch (error) {
      console.error('Error starting job practice voice interview:', error);
      res.status(500).json({ message: 'Failed to start job practice voice interview' });
    }
  });
  // Start a job-specific practice interview (no persistence to Airtable schedules)
  app.post('/api/interview/start-job-practice', 
    requireAuth,
    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { job, language = 'english' } = req.body || {};

      if (!job || !job.jobTitle) {
        return res.status(400).json({ message: 'Job details required' });
      }

      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Generate job-specific practice set
      const practiceSet = await aiInterviewService.generateJobPracticeInterview({
        ...user,
        ...profile
      }, job, language);

      // Create a temporary interview session to reuse existing modal flow
      const session = await storage.createInterviewSession({
        userId,
        interviewType: 'job-practice',
        sessionData: {
          questions: practiceSet.questions || [],
          responses: [],
          currentQuestionIndex: 0,
          interviewSet: practiceSet,
          context: { job }
        },
        isCompleted: false
      });

      const firstQuestion = Array.isArray(practiceSet.questions) && practiceSet.questions.length > 0
        ? (typeof practiceSet.questions[0] === 'string' ? practiceSet.questions[0] : practiceSet.questions[0]?.question || '')
        : '';

      res.json({
        sessionId: session.id,
        interviewType: 'job-practice',
        interviewSet: practiceSet,
        questions: practiceSet.questions,
        firstQuestion,
        userProfile: { ...user, ...profile }
      });
    } catch (error) {
      console.error('Error starting job practice interview:', error);
      res.status(500).json({ message: 'Failed to start job practice interview' });
    }
  });
  app.post('/api/interview/welcome', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { language = 'english' } = req.body;
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Generate personalized welcome message with language support
      const welcomeMessage = await aiInterviewService.generateWelcomeMessage({
        ...user,
        ...profile
      }, language);

      res.json({ welcomeMessage });
    } catch (error) {
      console.error("Error generating welcome message:", error);
      res.status(500).json({ message: "Failed to generate welcome message" });
    }
  });

  // Check if user has uploaded resume (required for interviews)
  // CV requirement check endpoint (now checks for manual CV data instead of uploaded files)
  app.get('/api/interview/resume-check', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user profile to check for manual CV data
      const profile = await storage.getApplicantProfile(userId);
      
      // Check if user has completed manual CV data entry
      // Consider CV complete if they have essential info: name, summary, and at least one experience/education
      const hasBasicInfo = !!(profile?.name && profile?.summary);
      const hasExperience = !!(profile?.workExperiences && Array.isArray(profile.workExperiences) && profile.workExperiences.length > 0);
      const hasEducation = !!(profile?.degrees && Array.isArray(profile.degrees) && profile.degrees.length > 0);
      const hasCV = hasBasicInfo && (hasExperience || hasEducation);
      
      res.json({ 
        hasResume: hasCV, // For backward compatibility, keep the same field name
        hasCV: hasCV,
        requiresResume: true, // Always require CV for interviews
        cvComplete: hasCV,
        resume: hasCV ? {
          id: 'manual-cv',
          originalName: 'Manual CV Data',
          uploadedAt: profile?.updatedAt || profile?.createdAt
        } : null
      });
    } catch (error) {
      console.error("Error checking CV requirement:", error);
      res.status(500).json({ message: "Failed to check CV status" });
    }
  });

  // Get available interview types for a user
  app.get('/api/interview/types', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getApplicantProfile(userId);
      
      // Check if user has uploaded a resume (required for interviews)
      const activeResume = await storage.getActiveResume(userId);
      if (!activeResume) {
        return res.status(400).json({
          message: "Resume required before starting interviews",
          requiresResume: true
        });
      }

      // Check completion status for each interview type
      const personalCompleted = profile?.personalInterviewCompleted || false;
      const professionalCompleted = profile?.professionalInterviewCompleted || false;
      const technicalCompleted = profile?.technicalInterviewCompleted || false;

      const types = [
        {
          type: 'personal',
          title: 'Personal Interview',
          description: 'Understanding your background, values, and personal journey',
          completed: personalCompleted,
          locked: false, // Personal interview is always available
          questions: 5
        },
        {
          type: 'professional',
          title: 'Professional Interview',
          description: 'Exploring your career journey, achievements, and professional expertise',
          completed: professionalCompleted,
          locked: !personalCompleted, // Locked until personal interview is completed
          questions: 7
        },
        {
          type: 'technical',
          title: 'Technical Interview',
          description: 'Assessing your technical abilities and problem-solving skills',
          completed: technicalCompleted,
          locked: !personalCompleted || !professionalCompleted, // Locked until both personal and professional are completed
          questions: 11
        }
      ];

      res.json({ interviewTypes: types });
    } catch (error) {
      console.error("Error fetching interview types:", error);
      res.status(500).json({ message: "Failed to fetch interview types" });
    }
  });

  app.post('/api/interview/start/:type',
    requireAuth,


    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const interviewType = req.params.type;
      const { language = 'english' } = req.body;
      
      // Validate interview type
      if (!['personal', 'professional', 'technical'].includes(interviewType)) {
        return res.status(400).json({ message: "Invalid interview type" });
      }

      // Check if user has uploaded a resume (required for interviews)
      const activeResume = await storage.getActiveResume(userId);
      if (!activeResume) {
        return res.status(400).json({
          message: "Resume required before starting interviews",
          requiresResume: true
        });
      }

      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Enforce interview order: personal -> professional -> technical
      if (interviewType === 'professional' && !profile?.personalInterviewCompleted) {
        return res.status(400).json({
          message: "Please complete the Personal Interview first before starting the Professional Interview",
          requiresPrevious: 'personal'
        });
      }

      if (interviewType === 'technical' && (!profile?.personalInterviewCompleted || !profile?.professionalInterviewCompleted)) {
        return res.status(400).json({
          message: "Please complete both Personal and Professional Interviews first before starting the Technical Interview",
          requiresPrevious: interviewType === 'technical' ? ['personal', 'professional'] : 'personal'
        });
      }

      // Get resume content and analysis from active resume
      let resumeContent = profile?.resumeContent || null;
      let resumeContext = null;
      
      if (activeResume?.aiAnalysis) {
        resumeContext = await resumeService.generateInterviewContext(activeResume.aiAnalysis);
        resumeContent = activeResume.extractedText || resumeContent;
      }

      // Get context from previous interviews to maintain continuity
      const interviewContext = await storage.getInterviewContext(userId, interviewType);

      // Generate the specific interview set with context and resume analysis
      let currentSet;
      if (interviewType === 'personal') {
        currentSet = await aiInterviewService.generatePersonalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, activeResume?.aiAnalysis, language);
      } else if (interviewType === 'professional') {
        currentSet = await aiInterviewService.generateProfessionalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, interviewContext, activeResume?.aiAnalysis, language);
      } else if (interviewType === 'technical') {
        currentSet = await aiInterviewService.generateTechnicalInterview({
          ...user,
          ...profile
        }, resumeContent || undefined, interviewContext, activeResume?.aiAnalysis, language);
      }

      if (!currentSet) {
        throw new Error(`Interview set not found for type: ${interviewType}`);
      }

      const session = await storage.createInterviewSession({
        userId,
        interviewType,
        sessionData: { 
          questions: currentSet.questions, 
          responses: [], 
          currentQuestionIndex: 0,
          interviewSet: currentSet,
          context: interviewContext
        },
        resumeContext: resumeContext,
        isCompleted: false
      });

      // Return the first question for text interview
      const firstQuestion = currentSet.questions[0]?.question || "Let's begin this interview.";

      res.json({ 
        sessionId: session.id, 
        interviewSet: currentSet,
        questions: currentSet.questions,
        firstQuestion 
      });
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Failed to start interview" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.post('/api/interview/start', 
    requireAuth, 


    async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user has uploaded a resume (required for interviews)
      const activeResume = await storage.getActiveResume(userId);
      if (!activeResume) {
        return res.status(400).json({ 
          message: "Resume required before starting interviews",
          requiresResume: true
        });
      }

      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Get resume content from active resume
      let resumeContent = profile?.resumeContent || null;
      let resumeContext = null;
      
      if (activeResume?.aiAnalysis) {
        resumeContext = await resumeService.generateInterviewContext(activeResume.aiAnalysis);
        resumeContent = activeResume.extractedText || resumeContent;
      }

      // Use AI Agent 1 to generate personalized interview questions (legacy personal interview)
      const questions = await aiInterviewService.generateInitialQuestions({
        ...user,
        ...profile
      }, resumeContent);

      const session = await storage.createInterviewSession({
        userId,
        interviewType: 'personal',
        sessionData: { questions, responses: [], currentQuestionIndex: 0 },
        resumeContext: resumeContext,
        isCompleted: false
      });

      // Return the first question for text interview
      const firstQuestion = questions[0]?.question || "Tell me about yourself and your career journey.";

      res.json({ 
        sessionId: session.id, 
        questions,
        firstQuestion 
      });
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Failed to start interview" });
    }
  });

  app.post('/api/interview/respond', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sessionId, question, answer } = req.body;

      const session = await storage.getInterviewSession(userId);
      if (!session || session.id !== sessionId) {
        return res.status(404).json({ message: "Interview session not found" });
      }

      const sessionData = session.sessionData as any;
      sessionData.responses = sessionData.responses || [];
      sessionData.responses.push({ question, answer });

      // Check if interview is complete (7 questions answered for current interview type)
      const questions = sessionData.questions || [];
      const isComplete = sessionData.responses.length >= questions.length;

      if (isComplete) {
        const interviewType = session.interviewType || 'personal';

        const job = (sessionData?.context && sessionData.context.job) || {};

        // Special handling for job-specific practice interviews
        if (interviewType === 'job-practice') {
          try {
            // Gather context for scoring
            console.log("job fore debug", job);
            const jobTitle = job.jobTitle || job.title || 'Job Title';
            const companyName = job.companyName || job.company || 'Company';
            const jobDescription = job.jobDescription || job.description || '';
            const qaPairs = (sessionData.responses || []).map((r: any, idx: number) => `Q${idx + 1}: ${r.question}\nA${idx + 1}: ${r.answer}`).join('\n\n');
            const prompt = `You are an expert technical hiring panel and behavioral analyst. Evaluate this candidate's job-specific interview thoroughly and return a single JSON object. Use a granular 0–100 scale, allowing decimal values (e.g., 87.4) for more accurate scoring.\n\nWhen scoring, consider:\n- How well their answers match the job requirements.\n- Depth, correctness, and completeness of technical knowledge.\n- Communication style (clarity, structure, confidence, professionalism).\n- Problem-solving ability, reasoning, and creativity.\n- Soft skills that are relevant for this role (collaboration, adaptability, leadership if applicable).\n- Overall likelihood of success in the role.\n\nYour response must ONLY be a JSON object with the following keys:\n\n{\n  \"score\": 87.4, // decimal allowed between 0–100\n  \"rationale\": \"Provide a concise but insightful 2–3 sentence analysis summarizing their performance, including both technical and behavioral strengths/weaknesses.\"\n}\n\nJOB TITLE: ${jobTitle} at ${companyName}\nJOB DESCRIPTION:\n${jobDescription}\n\nINTERVIEW QA:\n${qaPairs}`;

            const completion = await wrapOpenAIRequest(
              () => aiInterviewAgent.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_completion_tokens: 250,
                response_format: { type: 'json_object' } as any
              }),
              {
                requestType: "scoreJobSpecificInterview",
                model: "gpt-4o",
                userId: userId,
              }
            );

            let score = 70;
            let rationale: string | null = null;
            const content = completion.choices?.[0]?.message?.content || '{}';
            console.log('🔎 OpenAI scoring raw content:', content);
            const tryParse = (text: string): { score?: number; rationale?: string } | null => {
              // Try direct JSON parse
              try {
                const parsed = JSON.parse(text);
                console.log('🔎 Parsed JSON (direct):', parsed);
                return parsed;
              } catch {}
              // Strip markdown code fences
              const stripped = text
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```\s*$/i, '')
                .trim();
              try {
                const parsed2 = JSON.parse(stripped);
                console.log('🔎 Parsed JSON (stripped):', parsed2);
                return parsed2;
              } catch {}
              // Extract first JSON object substring
              try {
                const start = stripped.indexOf('{');
                const end = stripped.lastIndexOf('}');
                if (start !== -1 && end !== -1 && end > start) {
                  const sub = stripped.slice(start, end + 1);
                  const parsed3 = JSON.parse(sub);
                  console.log('🔎 Parsed JSON (substring):', parsed3);
                  return parsed3;
                }
              } catch {}
              // Fallbacks
              const m = stripped.match(/\bscore\b\s*[:=]\s*(\d{1,3})/i) || stripped.match(/\b(\d{1,3})\b/);
              const s = m && m[1] ? parseInt(m[1], 10) : NaN;
              const r = (stripped.match(/"?rationale"?\s*[:=]\s*"([^"]+)"/i) || [null, null])[1];
              return { score: isNaN(s) ? undefined : s, rationale: r || undefined };
            };
            const parsedAny = tryParse(content) || {} as any;
            if (typeof parsedAny.score === 'number') {
              score = Math.max(0, Math.min(100, Math.round(parsedAny.score)));
            } else {
              console.warn('⚠️ Could not parse score, using default 70');
            }
            if (typeof parsedAny.rationale === 'string') {
              rationale = parsedAny.rationale;
            }

            // Update Airtable record: find first by Job title + Company + user_id
            const MATCH_BASE_ID = process.env.AIRTABLE_MATCH_AI_INTERVIEW_BASE_ID || process.env.AIRTABLE_JOB_MATCHES_BASE_ID;
            const MATCH_TABLE = process.env.AIRTABLE_MATCH_AI_INTERVIEW_TABLE_NAME || 'Table 1';
            const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
            if (MATCH_BASE_ID) {
              try {
                const filterFormula = `AND({Job title} = "${jobTitle}", {Company} = "${companyName}", {user_id} = "${userId}")`;
                const listUrl = `https://api.airtable.com/v0/${MATCH_BASE_ID}/${encodeURIComponent(MATCH_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}&pageSize=1`;
                console.log('🔎 Airtable query debug:', { MATCH_BASE_ID, MATCH_TABLE, filterFormula, listUrl });
                const listResp = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' } });
                if (listResp.ok) {
                  const data = await listResp.json();
                  console.log('🔎 Airtable list response count:', Array.isArray(data?.records) ? data.records.length : 'n/a');
                  const target = Array.isArray(data?.records) && data.records.length > 0 ? data.records[0] : null;
                  if (target) {
                    console.log('🔎 First record preview:', { id: target.id, fieldKeys: Object.keys(target.fields || {}) });
                    console.log('🔎 First record fields snapshot:', target.fields);
                  }
                  if (target?.id) {
                    const updateUrl = `https://api.airtable.com/v0/${MATCH_BASE_ID}/${encodeURIComponent(MATCH_TABLE)}/${target.id}`;
                    const payload = { fields: { score, Status: 'completed', 'Interview Comments': rationale || '' } };
                    console.log('🔎 Airtable update debug:', { updateUrl, payload });
                    const updResp = await fetch(updateUrl, {
                      method: 'PATCH',
                      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    const updText = await updResp.text();
                    console.log('🔎 Airtable update result:', updResp.status, updText);
                  } else {
                    console.warn('⚠️ No matching Airtable record found for job-specific interview update');
                  }
                } else {
                  const listText = await listResp.text();
                  console.warn('⚠️ Airtable list error:', listResp.status, listText);
                }
              } catch (e) {
                console.warn('⚠️ Error updating Airtable job-specific score/status:', e);
              }
            }

            // Mark session completed
            await storage.updateInterviewSession(session.id, {
              sessionData: { ...sessionData, isComplete: true },
              isCompleted: true,
              completedAt: new Date()
            });

            const updatedProfile = await storage.getApplicantProfile(userId);

            await generateComprehensiveAIProfile(userId, updatedProfile, storage, aiInterviewService, airtableService, job);

            return res.json({ isComplete: true, jobPractice: true, score });
          } catch (scoringError) {
            console.error('Error scoring job-specific interview:', scoringError);
            // Still mark session complete even if scoring fails
            await storage.updateInterviewSession(session.id, {
              sessionData: { ...sessionData, isComplete: true },
              isCompleted: true,
              completedAt: new Date()
            });
            return res.json({ isComplete: true, jobPractice: true, score: null });
          }
        }

        // Generic interview completion path
        await storage.updateInterviewCompletion(userId, interviewType);

        await storage.updateInterviewSession(session.id, {
          sessionData: { ...sessionData, isComplete: true },
          isCompleted: true,
          completedAt: new Date()
        });

        const updatedProfile = await storage.getApplicantProfile(userId);
        const allInterviewsCompleted = updatedProfile?.personalInterviewCompleted && 
                                     updatedProfile?.professionalInterviewCompleted && 
                                     updatedProfile?.technicalInterviewCompleted;

        if (allInterviewsCompleted && !updatedProfile?.aiProfileGenerated) {
          const generatedProfile = await generateComprehensiveAIProfile(userId, updatedProfile, storage, aiInterviewService, airtableService, job);

          res.json({ 
            isComplete: true,
            allInterviewsCompleted: true,
            profile: generatedProfile,
            message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed! All interviews finished - your comprehensive profile has been generated.`
          });
        } else {
          let nextInterviewType = null;
          if (interviewType === 'personal' && !updatedProfile?.professionalInterviewCompleted) {
            nextInterviewType = 'professional';
          } else if ((interviewType === 'personal' || interviewType === 'professional') && !updatedProfile?.technicalInterviewCompleted) {
            nextInterviewType = 'technical';
          }
          
          res.json({ 
            isComplete: true,
            allInterviewsCompleted: false,
            nextInterviewType,
            message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed successfully!`
          });
        }
      } else {
        // Get next question from pre-defined question set (we have exactly 5 questions)
        const currentQuestionIndex = sessionData.responses.length;
        const questions = sessionData.questions || [];
        const nextQuestion = questions[currentQuestionIndex];
        
        if (nextQuestion) {
          await storage.updateInterviewSession(session.id, {
            sessionData
          });

          res.json({ 
            isComplete: false, 
            nextQuestion: nextQuestion.question 
          });
        } else {
          res.json({ 
            isComplete: false, 
            message: "No more questions available" 
          });
        }
      }
    } catch (error) {
      console.error("Error processing interview response:", error);
      res.status(500).json({ message: "Failed to process response" });
    }
  });

  // New Job Application Endpoint with AI Skill Analysis
  app.post('/api/job-applications/submit', 
    requireAuth,


    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { job } = req.body;

      console.log('📝 Job application submission attempt:', {
        userId,
        jobTitle: job?.jobTitle,
        jobId: job?.recordId,
        hasEmployerAnswers: !!job?.notes
      });

      if (!job) {
        console.error('❌ No job data provided in request body');
        return res.status(400).json({ message: 'Job data is required' });
      }

      // Extract employer question answers from notes field if present
      const employerQuestionAnswers = job.notes || '';
      console.log('📋 Employer question answers:', employerQuestionAnswers ? 'Present' : 'None');

      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Fetch complete user profile from Airtable "platouserprofiles" table
      console.log('📋 Fetching complete user profile from Airtable...');
      const completeUserProfileString = await airtableService.getUserProfileFromInterview(userId);
      
      let userProfileData: any = {};
      let userSkills: string[] = [];
      
      if (completeUserProfileString) {
        // The profile is stored as formatted markdown text, not JSON
        // Extract skills from the markdown text using regex
        const skillsMatch = completeUserProfileString.match(/## ✅ \*\*VERIFIED SKILLS\*\*[\s\S]*?(?=##|$)/);
        if (skillsMatch) {
          const skillsSection = skillsMatch[0];
          const skillLines = skillsSection.match(/• \*\*(.*?)\*\*/g);
          if (skillLines) {
            userSkills = skillLines.map(line => 
              line.replace(/• \*\*(.*?)\*\*.*/, '$1').toLowerCase().trim()
            ).filter(Boolean);
          }
        }
        
        // If no verified skills section, try to extract from any skills mentions
        if (userSkills.length === 0) {
          const allSkillMatches = completeUserProfileString.match(/\*\*([\w\s]+)\*\*/g);
          if (allSkillMatches) {
            userSkills = allSkillMatches
              .map(match => match.replace(/\*\*/g, '').toLowerCase().trim())
              .filter(skill => 
                skill.length > 2 && 
                !skill.includes('overview') && 
                !skill.includes('profile') &&
                !skill.includes('skills') &&
                !skill.includes('insights')
              );
          }
        }
        
        userProfileData = { formattedProfile: completeUserProfileString };
        console.log('✅ Using complete user profile from Airtable interview');
      } else {
        console.warn('⚠️ No complete user profile found in Airtable');
      }

      // Extract job skills from job description text instead of job.skills array
      let jobSkills: string[] = [];
      const jobDescription = job.jobDescription || '';
      
      // Look for skills in various formats within the job description
      const skillPatterns = [
        /(?:skills?|requirements?|qualifications?|experience)[:\s]*([^.]*)/gi,
        /(?:proficiency|knowledge|expertise)\s+(?:in|with|of)[:\s]*([^.]*)/gi,
        /(?:must have|required|essential)[:\s]*([^.]*)/gi
      ];
      
      skillPatterns.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Extract individual skills from the matched text
            const skillText = match.replace(/(?:skills?|requirements?|qualifications?|experience|proficiency|knowledge|expertise|must have|required|essential)[:\s]*/gi, '');
            const extractedSkills = skillText.split(/[,;•\-\n]/)
              .map(skill => skill.trim().toLowerCase())
              .filter(skill => skill.length > 2 && skill.length < 30);
            jobSkills.push(...extractedSkills);
          });
        }
      });
      
      // Remove duplicates and common words
      jobSkills = [...new Set(jobSkills)].filter(skill => 
        !['and', 'or', 'with', 'in', 'of', 'the', 'to', 'for', 'on'].includes(skill)
      );
      
      console.log('📋 Extracted job skills from description:', jobSkills);
      
      // If no skills found in description, allow application to proceed
      if (jobSkills.length === 0) {
        console.warn("⚠️ No specific skills extracted from job description");
        jobSkills = ['general experience']; // Use generic requirement
      }
      
      if (userSkills.length === 0) {
        console.warn("⚠️ User has no skills in their AI profile");
      }
      
      console.log('📋 Job Skills:', jobSkills);
      console.log('📋 User Skills:', userSkills);

      // Perform skill comparison
      const missingSkills = jobSkills.filter(skill => !userSkills.includes(skill));
      const matchedSkills = jobSkills.length - missingSkills.length;
      const totalSkills = jobSkills.length;

      console.log(`📊 Skills Analysis: ${matchedSkills}/${totalSkills} matched, ${missingSkills.length} missing`);

      // Generate notes based on missing skills  
      const skillsNotesString = missingSkills.length > 0
        ? missingSkills.map(skill => `• Missing: ${skill}`).join('\n')
        : "No missing skills";

      // Combine employer question answers with skill analysis notes
      let combinedNotes = skillsNotesString;
      if (employerQuestionAnswers && employerQuestionAnswers.trim() !== '') {
        combinedNotes = employerQuestionAnswers + '\n\n--- Skills Analysis ---\n' + skillsNotesString;
      }

      // Prepare application data with complete profile from Airtable
      const applicationData = {
        jobTitle: job.jobTitle,
        jobId: job.recordId,
        jobDescription: job.jobDescription,
        companyName: job.companyName,
        applicantName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${userId}`,
        applicantId: userId,
        applicantEmail: user.email, // Include user email
        aiProfile: userProfileData, // Use complete profile from Airtable
        notes: combinedNotes
      };

      // Submit to Airtable
      console.log('📤 Submitting to Airtable:', {
        jobTitle: applicationData.jobTitle,
        applicantName: applicationData.applicantName,
        totalSkills,
        matchedSkills,
        missingSkillsCount: missingSkills.length
      });
      
      await airtableService.submitJobApplication(applicationData);

      console.log('✅ Application submitted successfully to Airtable');

      res.json({
        success: true,
        message: 'Application submitted successfully',
        analysis: {
          missingSkills,
          notes: combinedNotes,
          totalRequiredSkills: totalSkills,
          matchedSkills: matchedSkills
        }
      });

    } catch (error) {
      console.error('Error submitting job application:', error);
      res.status(500).json({ 
        message: 'Failed to submit application. Please try again.',
        error: error.message 
      });
    }
  });

  app.post('/api/interview/complete', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sessionId, interviewType } = req.body;

      const session = await storage.getInterviewSession(userId);
      if (!session || session.id !== sessionId) {
        return res.status(404).json({ message: "Interview session not found" });
      }

      const sessionData = session.sessionData as any;
      
      // Mark this specific interview type as completed
      await storage.updateInterviewCompletion(userId, interviewType);

      // Update the interview session as completed
      await storage.updateInterviewSession(session.id, {
        sessionData: { ...sessionData, isComplete: true },
        isCompleted: true,
        completedAt: new Date()
      });

      // Check if all 3 interviews are completed
      const updatedProfile = await storage.getApplicantProfile(userId);
      const allInterviewsCompleted = updatedProfile?.personalInterviewCompleted && 
                                   updatedProfile?.professionalInterviewCompleted && 
                                   updatedProfile?.technicalInterviewCompleted;

      if (allInterviewsCompleted && !updatedProfile?.aiProfileGenerated) {
        // Generate final comprehensive profile only after ALL 3 interviews are complete
        console.log(`🎯 All 3 interviews completed for user ${userId}. Generating final profile...`);
        const generatedProfile = await generateComprehensiveAIProfile(userId, updatedProfile, storage, aiInterviewService, airtableService);

        res.json({ 
          isComplete: true,
          allInterviewsCompleted: true,
          profile: generatedProfile,
          message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed! All interviews finished - your comprehensive profile has been generated.`
        });
      } else {
        // Individual interview complete - STORE TEMPORARILY, don't send to Airtable yet
        console.log(`📝 ${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed for user ${userId}. Storing responses temporarily...`);
        res.json({ 
          isComplete: true,
          allInterviewsCompleted: false,
          message: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} interview completed successfully! ${allInterviewsCompleted ? 'All interviews are now complete.' : 'Continue with the remaining interviews to complete your profile.'}`
        });
      }
    } catch (error) {
      console.error("Error completing interview:", error);
      res.status(500).json({ message: "Failed to complete interview" });
    }
  });

  app.post('/api/interview/complete-voice', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { conversationHistory, interviewType, job } = req.body;

      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ message: "Invalid conversation history" });
      }

      // Get user and profile data for AI Agent 2
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Get resume content if available
      let resumeContent = null;
      if (profile?.resumeUrl) {
        try {
          resumeContent = null; // TODO: Implement resume fetching
        } catch (error) {
          console.warn("Could not fetch resume content:", error);
        }
      }

      // Mark this specific interview type as completed
      if (interviewType != "job-practice") {
        await storage.updateInterviewCompletion(userId, interviewType);
      }

      // Save the interview session with completion (without generating profile yet)
      const session = await storage.createInterviewSession({
        userId,
        interviewType: interviewType || 'personal',
        sessionData: { 
          questions: conversationHistory.map(item => ({ question: item.question })),
          responses: conversationHistory,
          currentQuestionIndex: conversationHistory.length 
        },
        isCompleted: true,
        generatedProfile: null // Don't save individual profiles
      });

      // Check if all 3 interviews are completed
      const updatedProfile = await storage.getApplicantProfile(userId);
      const allInterviewsCompleted = updatedProfile?.personalInterviewCompleted && 
                                   updatedProfile?.professionalInterviewCompleted && 
                                   updatedProfile?.technicalInterviewCompleted;

      if (allInterviewsCompleted && !updatedProfile?.aiProfileGenerated) {
        // Generate final comprehensive profile only after ALL 3 interviews are complete
        console.log(`🎯 All 3 voice interviews completed for user ${userId}. Generating final profile...`);
        const generatedProfile = await generateComprehensiveAIProfile(userId, updatedProfile, storage, aiInterviewService, airtableService, job);

        // Update profile completion percentage
        await storage.updateProfileCompletion(userId);

        res.json({ 
          isComplete: true,
          allInterviewsCompleted: true,
          profile: generatedProfile,
          message: "All interviews completed! Your comprehensive AI profile has been generated successfully."
        });
      } else {
        // Individual voice interview complete - STORE TEMPORARILY, don't send to Airtable yet
        console.log(`📝 ${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} voice interview completed for user ${userId}. Storing responses temporarily...`);
        
        // Determine next interview type
        let nextInterviewType = null;
        if (interviewType === 'personal' && !updatedProfile?.professionalInterviewCompleted) {
          nextInterviewType = 'professional';
        } else if ((interviewType === 'personal' || interviewType === 'professional') && !updatedProfile?.technicalInterviewCompleted) {
          nextInterviewType = 'technical';
        }
        
        res.json({ 
          isComplete: true,
          allInterviewsCompleted: false,
          nextInterviewType,
          message: "Interview section completed successfully!"
        });
      }
    } catch (error) {
      console.error("Error completing voice interview:", error);
      res.status(500).json({ message: "Failed to complete voice interview" });
    }
  });

  app.get('/api/interview/session', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const session = await storage.getInterviewSession(userId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching interview session:", error);
      res.status(500).json({ message: "Failed to fetch interview session" });
    }
  });

  // End all active interview sessions for the logged-in user
  app.get('/api/interview/end-all-sessions', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getAllInterviewSessions(userId);
      let endedCount = 0;

      for (const s of sessions) {
        if (!s.isCompleted) {
          const sessionData = (s.sessionData as any) || {};
          const updatedSessionData = { ...sessionData, isComplete: true };
          await storage.updateInterviewSession(s.id, {
            sessionData: updatedSessionData,
            isCompleted: true,
            completedAt: new Date()
          } as any);
          endedCount++;
        }
      }

      console.log(`🛑 Ended ${endedCount} active interview session(s) for user ${userId}`);
      res.json({ success: true, endedCount });
    } catch (error) {
      console.error('Error ending all interview sessions:', error);
      res.status(500).json({ message: 'Failed to end all interview sessions' });
    }
  });



  app.post('/api/interview/voice-submit', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { responses, conversationHistory } = req.body;

      // Get user and profile data
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);

      // Get resume content if available
      let resumeContent = null;
      if (profile?.resumeUrl) {
        try {
          // If resume exists, we'd fetch it here - for now we'll use null
          resumeContent = null; // TODO: Implement resume fetching from URL
        } catch (error) {
          console.warn("Could not fetch resume content:", error);
        }
      }

      // Create interview session
      const session = await storage.createInterviewSession({
        userId,
        sessionData: { 
          questions: responses.map((r: any) => ({ question: r.question })), 
          responses, 
          currentQuestionIndex: responses.length 
        },
        isCompleted: true,
        generatedProfile: null // Don't generate individual profiles
      });

      // Don't generate individual profiles - wait for all interviews to complete

      // Update profile completion percentage
      await storage.updateProfileCompletion(userId);

      res.json({ 
        isComplete: true, 
        profile: null, // Individual profiles are no longer generated
        sessionId: session.id,
        message: "Voice interview completed successfully!" 
      });
    } catch (error) {
      console.error("Error processing voice interview:", error);
      res.status(500).json({ message: "Failed to process voice interview" });
    }
  });



  // Job matches routes
  app.get('/api/job-matches', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check current job matches in Airtable
      const airtableMatches = await airtableService.getJobMatchesFromAirtable();
      const userAirtableMatches = airtableMatches.filter(match => match.userId === userId);
      
      console.log(`📋 Airtable matches for user ${userId}: ${userAirtableMatches.length}`);
      
      // If no matches in Airtable, clear database matches for this user
      if (userAirtableMatches.length === 0) {
        // Get current database matches and remove them
        const currentMatches = await storage.getJobMatches(userId);
        if (currentMatches.length > 0) {
          console.log(`🗑️ Clearing ${currentMatches.length} obsolete job matches for user ${userId}`);
          // Clear job matches from database since they're no longer in Airtable
          await storage.clearJobMatches(userId);
        }
        res.json([]);
        return;
      }
      
      // If matches exist in Airtable, ensure they're synced to database
      for (const airtableMatch of userAirtableMatches) {
        await airtableService.processJobMatch(airtableMatch);
      }
      
      // Return current database matches
      const matches = await storage.getJobMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ message: "Failed to fetch job matches" });
    }
  });

  // Upcoming interviews endpoint
  app.get('/api/upcoming-interviews', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const email = user?.email || '';
      if (email) {
        const applications = await airtableService.getApplicationsForEmail(email);
        return res.json(applications);
      }
      const interviews = await airtableService.getUpcomingInterviews(userId);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching upcoming interviews:", error);
      res.status(500).json({ message: "Failed to fetch upcoming interviews" });
    }
  });

  app.post('/api/job-matches/refresh', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.calculateJobMatches(userId);
      const matches = await storage.getJobMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error refreshing job matches:", error);
      res.status(500).json({ message: "Failed to refresh job matches" });
    }
  });

  // Application routes - Real Airtable applications
  app.get('/api/applications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user's applications from Airtable
      const airtableApplications = await airtableService.getUserApplications(userId);
      
      // Use status directly from Airtable instead of calculating it
      const processedApplications = airtableApplications.map((app) => {
        // Normalize status to lowercase and handle variations
        let status = 'pending'; // Default status
        if (app.status) {
          const normalizedStatus = app.status.toLowerCase().trim();
          // Map Airtable status values to our expected values
          if (['accepted', 'approved', 'hired'].includes(normalizedStatus)) {
            status = 'accepted';
          } else if (['pending', 'under review', 'reviewing'].includes(normalizedStatus)) {
            status = 'pending';
          } else if (['denied', 'rejected', 'declined'].includes(normalizedStatus)) {
            status = 'denied';
          } else if (['closed', 'cancelled', 'expired', 'withdrawn'].includes(normalizedStatus)) {
            status = 'closed';
          } else {
            status = normalizedStatus; // Use as-is if it's already a valid status
          }
        }
        
        return {
          recordId: app.recordId,
          jobTitle: app.jobTitle,
          jobId: app.jobId,
          companyName: app.companyName,
          appliedAt: app.createdTime,
          status,
          notes: app.notes,
          jobDescription: app.jobDescription
        };
      });
      
      console.log(`📋 Returning ${processedApplications.length} processed applications for user ${userId}`);
      res.json(processedApplications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Withdraw job application
  app.post('/api/applications/:recordId/withdraw', requireAuth, async (req: any, res) => {
    try {
      const { recordId } = req.params;
      const userId = req.user.id;
      
      console.log(`📝 Withdraw request for application ${recordId} by user ${userId}`);
      
      if (!recordId) {
        return res.status(400).json({ message: 'Record ID is required' });
      }

      // Verify the application belongs to the current user by fetching their applications
      const userApplications = await airtableService.getUserApplications(userId);
      const applicationExists = userApplications.find(app => app.recordId === recordId);
      
      if (!applicationExists) {
        return res.status(404).json({ message: 'Application not found or does not belong to you' });
      }

      // Check if application can be withdrawn/removed
      // Allow withdrawal for pending applications or removal for closed applications
      const status = applicationExists.status?.toLowerCase() || '';
      const canWithdraw = ['pending', 'under review', 'reviewing'].includes(status);
      const canRemove = ['closed', 'cancelled', 'expired', 'withdrawn'].includes(status);
      
      if (!canWithdraw && !canRemove) {
        return res.status(400).json({ 
          message: 'Only pending applications can be withdrawn and closed applications can be removed' 
        });
      }

      // Withdraw the application in Airtable
      await airtableService.withdrawJobApplication(recordId);
      
      console.log(`✅ Successfully withdrew application ${recordId} for user ${userId}`);
      res.json({ 
        message: 'Application withdrawn successfully',
        recordId,
        status: 'withdrawn'
      });
    } catch (error) {
      console.error('Error withdrawing application:', error);
      res.status(500).json({ message: 'Failed to withdraw application' });
    }
  });

  app.post('/api/applications', 
    requireAuth, 


    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        userId
      });

      // Check if already applied
      const existing = await storage.getApplication(userId, applicationData.jobId);
      if (existing) {
        return res.status(400).json({ message: "Already applied to this job" });
      }

      // Get user's AI profile from their applicant profile
      const userProfile = await storage.getApplicantProfile(userId);
      if (!userProfile || !userProfile.aiProfile) {
        return res.status(400).json({ 
          message: "AI profile not found. Please complete your interviews first." 
        });
      }

      // Get user's basic info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create application
      const application = await storage.createApplication(applicationData);

      // Prepare complete application package for company
      const applicationPackage = {
        application,
        candidate: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          profileImage: user.profileImageUrl
        },
        aiProfile: userProfile.aiProfile,
        resumeUrl: userProfile.resumeUrl,
        resumeContent: userProfile.resumeContent,
        submittedAt: new Date().toISOString()
      };

      // Log the application submission for companies to retrieve
      console.log('📧 NEW JOB APPLICATION SUBMITTED');
      console.log('='.repeat(50));
      console.log(`📋 Job: ${applicationData.jobTitle} at ${applicationData.companyName}`);
      console.log(`👤 Candidate: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`🤖 AI Profile: ${userProfile.aiProfile ? 'Available' : 'Not Available'}`);
      console.log(`📄 Resume: ${userProfile.resumeUrl ? 'Available' : 'Not Available'}`);
      console.log(`⏰ Submitted: ${applicationPackage.submittedAt}`);
      console.log('='.repeat(50));

      // TODO: In production, send email to company or store in company portal
      // For now, we log the complete application data for companies to access
      console.log('📋 COMPLETE APPLICATION PACKAGE FOR COMPANY:');
      console.log(JSON.stringify(applicationPackage, null, 2));
      
      res.json({
        ...application,
        message: "Application submitted successfully with AI profile and CV"
      });
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Job postings routes
  app.get('/api/job-postings', requireAuth, async (req: any, res) => {
    try {
      const jobPostings = await airtableService.getAllJobPostings();
      res.json(jobPostings);
    } catch (error) {
      console.error("Error fetching job postings:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });

  // AI-powered job filtering endpoint
  app.post('/api/job-postings/filter', requireAuth, async (req: any, res) => {
    try {
      console.log('🤖 Processing AI-powered job filtering request');
      const { filters } = req.body;
      
      // Get all job postings
      const allJobPostings = await airtableService.getAllJobPostings();
      console.log(`📋 Filtering ${allJobPostings.length} job postings with AI`);
      
      // Apply AI-powered filtering
      const filterResult = await aiJobFilteringService.intelligentJobFiltering(allJobPostings, filters);
      
      console.log(`✅ AI filtering complete: ${filterResult.jobs.length} jobs selected, message: "${filterResult.filterMessage}"`);
      
      res.json({
        jobs: filterResult.jobs,
        filterMessage: filterResult.filterMessage,
        hasExpandedSearch: filterResult.hasExpandedSearch,
        totalOriginal: allJobPostings.length,
        totalFiltered: filterResult.jobs.length
      });
    } catch (error) {
      console.error('Error in AI job filtering:', error);
      res.status(500).json({ message: 'Failed to filter job postings' });
    }
  });

  // Job-specific AI interview invitations for the logged-in user
  app.get('/api/job-specific-ai-interviews', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const statusFilter = (req.query.status || '').toString().toLowerCase();

      const MATCH_BASE_ID = process.env.AIRTABLE_MATCH_AI_INTERVIEW_BASE_ID || process.env.AIRTABLE_JOB_MATCHES_BASE_ID;
      const MATCH_TABLE = process.env.AIRTABLE_MATCH_AI_INTERVIEW_TABLE_NAME || 'Table 1';

      if (!MATCH_BASE_ID) {
        console.warn('⚠️ No Airtable base configured for platojobmatchAIinterview (set AIRTABLE_MATCH_AI_INTERVIEW_BASE_ID)');
        return res.json([]);
      }

      let filterFormula = `({user_id} = "${userId}")`;
      if (statusFilter === 'pending' || statusFilter === 'completed') {
        filterFormula = `AND({user_id} = "${userId}", {Status} = "${statusFilter}")`;
      }
      const url = `https://api.airtable.com/v0/${MATCH_BASE_ID}/${encodeURIComponent(MATCH_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}&pageSize=100`;

      // Use the same API key approach as elsewhere in this file
      const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!resp.ok) {
        console.error('❌ Failed to fetch job-specific AI interviews from Airtable:', resp.status, await resp.text());
        return res.json([]);
      }

      const data = await resp.json();
      const records: any[] = Array.isArray(data?.records) ? data.records : [];
      console.log("records", records);
      const results = records.map((record: any) => {
        const fields = record.fields || {};
        const fieldKeys = Object.keys(fields);

        // Try to find title/description/company across naming variations
        const titleField = fieldKeys.find(k => k.toLowerCase().includes('job') && k.toLowerCase().includes('title'))
          || fieldKeys.find(k => k.toLowerCase().includes('title'));
        const descField = fieldKeys.find(k => k.toLowerCase().includes('description'))
          || fieldKeys.find(k => k.toLowerCase().includes('desc'));
        const companyField = fieldKeys.find(k => k.toLowerCase().includes('company'))
          || fieldKeys.find(k => k.toLowerCase().includes('employer'));
        const statusField = fieldKeys.find(k => k.toLowerCase() === 'status');
        const scoreField = fieldKeys.find(k => k.toLowerCase() === 'score');
        const commentsField = fieldKeys.find(k => k.toLowerCase().includes('interview comments')) || fieldKeys.find(k => k.toLowerCase().includes('comments'));
        const aiPromptField = fieldKeys.find(k => k.toLowerCase().includes('ai prompt')) || fieldKeys.find(k => k.toLowerCase().includes('ai prompt'));

        return {
          recordId: record.id,
          jobTitle: titleField ? fields[titleField] : (fields['Job title'] || fields['Job Title'] || 'Untitled Position'),
          jobDescription: descField ? fields[descField] : (fields['Job description'] || fields['Job Description'] || ''),
          companyName: companyField ? fields[companyField] : (fields['Company name'] || fields['Company Name'] || fields['Company'] || 'Unknown Company'),
          status: statusField ? fields[statusField] : (fields['Status'] || ''),
          score: typeof (scoreField ? fields[scoreField] : fields['score']) === 'number' ? (scoreField ? fields[scoreField] : fields['score']) : undefined,
          interviewComments: commentsField ? fields[commentsField] : (fields['Interview Comments'] || ''),
          aiPrompt: aiPromptField ? fields[aiPromptField] : (fields['AI Prompt'] || ''),
        };
      });

      return res.json(results);
    } catch (error) {
      console.error('Error fetching job-specific AI interviews:', error);
      return res.status(500).json({ message: 'Failed to fetch job-specific AI interviews' });
    }
  });

  // Cache for parsed employer questions (5-minute expiration)
  const employerQuestionsCache = new Map<string, {
    questions: any[];
    rawText: string;
    parsedAt: number;
  }>();

  // Real-time employer questions endpoint - fetches directly from Airtable
  app.post('/api/employer-questions/realtime', requireAuth, async (req: any, res) => {
    try {
      const { jobId } = req.body;
      
      console.log('📋 Fetching real-time employer questions for job:', jobId);
      
      if (!jobId) {
        return res.status(400).json({ message: 'Job ID is required' });
      }

      // Fetch the latest employer questions directly from Airtable
      const latestEmployerQuestions = await airtableService.getLatestEmployerQuestions(jobId);
      
      console.log('📋 Latest employer questions from Airtable:', latestEmployerQuestions ? 'Present' : 'None');
      
      if (!latestEmployerQuestions || latestEmployerQuestions.trim() === '') {
        console.log('❌ No employer questions found for this job');
        return res.json({ questions: [], rawText: '', lastUpdated: new Date().toISOString() });
      }

      // Check cache first (5-minute expiration)
      const cacheKey = `${jobId}_${Buffer.from(latestEmployerQuestions).toString('base64').slice(0, 20)}`;
      const cached = employerQuestionsCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.parsedAt) < 300000) { // 5 minutes = 300000ms
        console.log('✅ Using cached parsed questions');
        return res.json({
          questions: cached.questions,
          rawText: cached.rawText,
          lastUpdated: new Date(cached.parsedAt).toISOString(),
          fromCache: true
        });
      }

      // Parse the questions using OpenAI
      const questions = await employerQuestionService.parseEmployerQuestions(latestEmployerQuestions);
      
      console.log('✅ Parsed questions result:', questions);
      
      // Cache the result
      employerQuestionsCache.set(cacheKey, {
        questions,
        rawText: latestEmployerQuestions,
        parsedAt: now
      });

      // Clean old cache entries (keep only last 100 entries)
      if (employerQuestionsCache.size > 100) {
        const oldestKeys = Array.from(employerQuestionsCache.keys()).slice(0, 50);
        oldestKeys.forEach(key => employerQuestionsCache.delete(key));
      }
      
      res.json({ 
        questions,
        rawText: latestEmployerQuestions,
        lastUpdated: new Date().toISOString(),
        fromCache: false
      });
    } catch (error) {
      console.error("Error fetching real-time employer questions:", error);
      res.status(500).json({ message: "Failed to fetch employer questions" });
    }
  });

  // Smart Job Application with Skill Matching
  app.post('/api/applications/analyze-and-submit', requireAuth, multer({ storage: multer.memoryStorage() }).single('cv'), async (req: any, res) => {
    try {
      console.log('🎯 Smart job application analysis request received');
      console.log('📋 Request body:', req.body);
      console.log('📄 File uploaded:', req.file ? 'Yes' : 'No');
      
      const userId = req.user.id;
      const { jobId, jobTitle, companyName, jobDescription, requirements, skills, experienceLevel } = req.body;

      // CV upload is optional - proceed without it
      const cvContent = req.file ? 
        `CV file uploaded: ${req.file.originalname} (${req.file.size} bytes)` : 
        'No CV uploaded - using AI profile data';

      // Get user data and AI profile
      const user = await storage.getUser(userId);
      const userProfile = await storage.getApplicantProfile(userId);
      
      if (!user || !userProfile || !userProfile.aiProfile) {
        console.error('❌ User profile or AI profile not found');
        return res.status(400).json({ 
          success: false,
          qualified: false,
          message: "Failed to analyze application. Please try again." 
        });
      }

      console.log('🧠 AI Profile found:', !!userProfile.aiProfile);
      
      // Parse job required skills and user AI profile skills
      const jobRequiredSkills = skills ? 
        skills.split(',').map((s: string) => s.trim().toLowerCase()) : [];
      
      const userAISkills = userProfile.aiProfile?.verifiedSkills || 
        userProfile.aiProfile?.skills || 
        [];
      const userSkillsLower = userAISkills.map((s: string) => s.toLowerCase());

      console.log('🔍 Job required skills:', jobRequiredSkills);
      console.log('👤 User AI skills:', userSkillsLower);

      // Find missing skills
      const missingSkills = jobRequiredSkills.filter(
        jobSkill => !userSkillsLower.includes(jobSkill)
      );

      console.log('❌ Missing skills:', missingSkills);
      console.log('📊 Missing count:', missingSkills.length);

      // Determine if qualified (missing 3 or fewer skills)
      const qualified = missingSkills.length <= 3;
      
      console.log('✅ Qualified for application:', qualified);

      if (qualified) {
        // User is qualified - submit application to Airtable
        try {
          await airtableService.storeJobApplication({
            name: `${user.firstName} ${user.lastName}`,
            userId: userId,
            email: user.email || '',
            jobTitle: jobTitle,
            companyName: companyName,
            applicationDate: new Date().toISOString(),
            resume: cvContent,
            userProfile: JSON.stringify(userProfile.aiProfile),
            score: 100 - (missingSkills.length * 10), // Score based on skill match
            analysisDetails: `Skills Match Analysis: Missing ${missingSkills.length} out of ${jobRequiredSkills.length} required skills. Missing: ${missingSkills.join(', ')}`
          });

          console.log('✅ Application stored in Airtable successfully');
        } catch (airtableError) {
          console.error('❌ Failed to store in Airtable:', airtableError);
          return res.status(500).json({ 
            success: false,
            qualified: false,
            message: "Failed to analyze application. Please try again." 
          });
        }

        // Create local application record
        try {
          const applicationData = {
            userId,
            jobId: parseInt(jobId) || 1,
            jobTitle,
            companyName,
            appliedAt: new Date(),
            status: 'pending'
          };

          await storage.createApplication(applicationData);
          console.log('✅ Application stored locally');
        } catch (dbError) {
          console.error('❌ Failed to store locally:', dbError);
          // Continue even if local storage fails
        }

        // Return success response
        return res.json({
          success: true,
          qualified: true,
          submitted: true,
          message: `Application submitted successfully! You match ${jobRequiredSkills.length - missingSkills.length} out of ${jobRequiredSkills.length} required skills.`,
          skillsMatch: {
            total: jobRequiredSkills.length,
            matched: jobRequiredSkills.length - missingSkills.length,
            missing: missingSkills
          }
        });

      } else {
        // User is not qualified - do not submit
        console.log('❌ User not qualified - too many missing skills');
        
        return res.json({
          success: true,
          qualified: false,
          submitted: false,
          message: "Application Not Submitted\n\nUnfortunately, you don't meet enough of the job requirements to apply at this time. We encourage you to keep growing your skills and try again soon.",
          skillsMatch: {
            total: jobRequiredSkills.length,
            matched: jobRequiredSkills.length - missingSkills.length,
            missing: missingSkills
          }
        });
      }

    } catch (error) {
      console.error("❌ Error in smart job application analysis:", error);
      console.error("🔍 Error details:", {
        message: error.message,
        stack: error.stack,
        userId: req.user?.claims?.sub,
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body || {})
      });
      
      return res.status(500).json({ 
        success: false,
        qualified: false,
        message: "Failed to analyze application. Please try again."
      });
    }
  });

  // AI Job Application Analysis Route
  app.post('/api/job-application/analyze', 
    requireAuth, 

    async (req: any, res) => {
    try {
      let userId = req.user?.claims?.sub;
      const { jobId, jobTitle, jobDescription, companyName, requirements, employmentType } = req.body;

      console.log('📊 Job Analysis Request:', { userId, jobTitle, companyName });

      // Get user profile and interview data
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);
      const interviewHistory = await storage.getInterviewHistory(userId);

      console.log('👤 User data:', { hasUser: !!user, hasProfile: !!profile, hasAiProfile: !!profile?.aiProfile });

      if (!profile?.aiProfile) {
        console.log('❌ No AI profile found for user');
        return res.status(400).json({ 
          message: "Complete your interview process first to get personalized job analysis" 
        });
      }

      // Get completed interviews for context
      const completedInterviews = interviewHistory.filter(session => session.isCompleted);
      let allInterviewResponses: any[] = [];
      
      completedInterviews.forEach(session => {
        const sessionData = session.sessionData as any;
        if (sessionData.responses) {
          allInterviewResponses = allInterviewResponses.concat(sessionData.responses);
        }
      });

      // Use AI to analyze comprehensive job match
      const analysisPrompt = `
You are a professional career counselor conducting a comprehensive job fit analysis. Analyze the job against the user's complete profile and all three interview responses.

USER COMPLETE PROFILE:
- Name: ${user?.firstName} ${user?.lastName}
- Email: ${user?.email}
- Profile Data: ${JSON.stringify(profile)}
- AI Generated Profile: ${JSON.stringify(profile.aiProfile)}
- Complete Interview History: ${JSON.stringify(allInterviewResponses)}

JOB DETAILS:
- Title: ${jobTitle}
- Company: ${companyName}
- Description: ${jobDescription}
- Requirements: ${JSON.stringify(requirements)}
- Employment Type: ${employmentType}

ANALYSIS REQUIREMENTS:
1. Extract ALL specific requirements from the job description (technical skills, tools, experience years, education, location, certifications, etc.)
2. Compare each requirement against user's complete profile and all three interview responses
3. Identify what the user is missing - be specific (e.g., "Python experience", "3+ years in sales", "willingness to relocate")
4. If user has 70%+ of requirements, it's a good match
5. If user has less than 70% of requirements, list only what's missing

EVALUATION CRITERIA:
- Technical skills and tools mentioned in job vs user's skills
- Experience level requirements vs user's actual experience
- Location requirements vs user's location/preferences
- Education requirements vs user's background
- Certifications mentioned vs user's certifications
- Soft skills required vs user's demonstrated abilities

Response format (JSON):
{
  "matchScore": number (0-100),
  "isGoodMatch": boolean,
  "missingRequirements": ["Missing item 1", "Missing item 2", "Missing item 3"] or null
}

IMPORTANT: Only include items in missingRequirements that the user clearly lacks. Be specific and factual.`;

      console.log('🤖 Sending comprehensive job analysis request to OpenAI...');
      const response = await wrapOpenAIRequest(
        () => aiInterviewAgent.openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            { role: "system", content: "You are a professional career counselor who analyzes job matches comprehensively using all available user data. Be direct, honest, and constructive." },
            { role: "user", content: analysisPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        {
          requestType: "analyzeJobApplication",
          model: "gpt-4o",
          userId: userId,
        }
      );

      console.log('✅ OpenAI analysis response received');
      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Ensure proper format
      const formattedAnalysis = {
        matchScore: Math.min(Math.max(analysis.matchScore || 0, 0), 100),
        isGoodMatch: analysis.isGoodMatch || false,
        missingRequirements: analysis.missingRequirements || null
      };

      console.log('📊 Analysis complete:', { matchScore: formattedAnalysis.matchScore, isGoodMatch: formattedAnalysis.isGoodMatch, missingRequirements: formattedAnalysis.missingRequirements });
      res.json(formattedAnalysis);
    } catch (error) {
      console.error("❌ Error analyzing job application:", error);
      console.error("Error details:", error.message);
      res.status(500).json({ message: "Failed to analyze job match. Please try again." });
    }
  });

  // Test endpoint to manually trigger job postings fetch
  app.get('/api/test-job-postings', async (req, res) => {
    try {
      console.log('🧪 Manual test of job postings fetch');
      const jobPostings = await airtableService.getAllJobPostings();
      res.json({ 
        count: jobPostings.length, 
        data: jobPostings,
        message: `Found ${jobPostings.length} job postings`
      });
    } catch (error) {
      console.error("Error in test fetch:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Airtable job monitoring routes
  app.post('/api/admin/process-airtable-jobs', async (req, res) => {
    try {
      const newJobEntries = await airtableService.checkForNewJobEntries();
      
      if (newJobEntries.length === 0) {
        return res.json({ message: "No new job entries found", processed: 0 });
      }

      let processed = 0;
      for (const jobEntry of newJobEntries) {
        try {
          await airtableService.processJobEntry(jobEntry);
          processed++;
          console.log(`✅ Processed job entry for user ${jobEntry.userId}: ${jobEntry.jobTitle}`);
        } catch (error) {
          console.error(`❌ Failed to process job entry for user ${jobEntry.userId}:`, error);
        }
      }

      res.json({ 
        message: `Processed ${processed} out of ${newJobEntries.length} job entries`,
        processed,
        total: newJobEntries.length
      });
    } catch (error) {
      console.error("Error processing Airtable job entries:", error);
      res.status(500).json({ message: "Failed to process Airtable job entries" });
    }
  });

  // ADMIN ONLY: Complete data wipe for production launch
  // ⚠️ SECURITY CRITICAL: This endpoint requires admin auth + secret header
  app.post('/api/admin/wipe-all-user-data', requireAuth, async (req: any, res) => {
    // Multiple security layers for this destructive operation
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Require special admin wipe secret for additional protection
    const adminWipeSecret = process.env.ADMIN_WIPE_SECRET;
    if (!adminWipeSecret) {
      return res.status(500).json({ error: 'Admin wipe not configured' });
    }
    
    if (req.headers['x-admin-wipe-secret'] !== adminWipeSecret) {
      return res.status(403).json({ error: 'Invalid admin wipe authorization' });
    }
    
    // Require explicit confirmation
    if (req.body.confirm !== 'WIPE_ALL_USER_DATA') {
      return res.status(400).json({ 
        error: 'Missing confirmation',
        required: 'Send { "confirm": "WIPE_ALL_USER_DATA" } in request body'
      });
    }
    try {
      console.log('🗑️ Starting comprehensive user data wipe...');
      const objectStorage = new ObjectStorageService();
      
      const summary = {
        resumeFilesDeleted: 0,
        databaseRecordsDeleted: {
          sessions: 0,
          users: 0,
          profiles: 0,
          interviews: 0,
          resumes: 0,
          applications: 0,
          matches: 0
        },
        airtableRecordsDeleted: 0,
        errors: []
      };

      // Step 1: Delete all resume files from object storage
      try {
        console.log('🗑️ Step 1: Deleting resume files from object storage...');
        const resumeFiles = await db.select().from(resumeUploads);
        
        for (const resume of resumeFiles) {
          try {
            await objectStorage.deleteResumeFile(resume.filePath);
            summary.resumeFilesDeleted++;
          } catch (error) {
            console.error(`❌ Failed to delete resume file ${resume.filePath}:`, error);
            summary.errors.push(`Failed to delete resume file: ${resume.filePath}`);
          }
        }
        
        // Also try bulk delete method
        try {
          await objectStorage.deleteAllResumeFiles();
        } catch (bulkError) {
          console.warn('Bulk delete failed, individual deletes may have worked:', bulkError);
        }
        
        console.log(`✅ Deleted ${summary.resumeFilesDeleted} resume files`);
      } catch (error) {
        console.error('❌ Error during resume file deletion:', error);
        summary.errors.push(`Resume file deletion error: ${error.message}`);
      }

      // Step 2: Clear database tables in proper order (child -> parent)
      try {
        console.log('🗑️ Step 2: Clearing database tables...');
        
        // Delete job matches (references users and jobs)
        const jobMatchesCount = await db.delete(jobMatches).execute();
        summary.databaseRecordsDeleted.matches = jobMatchesCount.rowCount || 0;
        console.log(`✅ Deleted ${summary.databaseRecordsDeleted.matches} job matches`);
        
        // Delete applications (references users and jobs)
        const applicationsCount = await db.delete(applications).execute();
        summary.databaseRecordsDeleted.applications = applicationsCount.rowCount || 0;
        console.log(`✅ Deleted ${summary.databaseRecordsDeleted.applications} applications`);
        
        // Delete interview sessions (references users)
        const interviewsCount = await db.delete(interviewSessions).execute();
        summary.databaseRecordsDeleted.interviews = interviewsCount.rowCount || 0;
        console.log(`✅ Deleted ${summary.databaseRecordsDeleted.interviews} interview sessions`);
        
        // Delete resume uploads (references users)
        const resumesCount = await db.delete(resumeUploads).execute();
        summary.databaseRecordsDeleted.resumes = resumesCount.rowCount || 0;
        console.log(`✅ Deleted ${summary.databaseRecordsDeleted.resumes} resume uploads`);
        
        // Delete applicant profiles (references users)
        const profilesCount = await db.delete(applicantProfiles).execute();
        summary.databaseRecordsDeleted.profiles = profilesCount.rowCount || 0;
        console.log(`✅ Deleted ${summary.databaseRecordsDeleted.profiles} applicant profiles`);
        
        // Delete sessions
        const sessionsCount = await db.delete(sessions).execute();
        summary.databaseRecordsDeleted.sessions = sessionsCount.rowCount || 0;
        console.log(`✅ Deleted ${summary.databaseRecordsDeleted.sessions} sessions`);
        
        // Delete users (parent table)
        const usersCount = await db.delete(users).execute();
        summary.databaseRecordsDeleted.users = usersCount.rowCount || 0;
        console.log(`✅ Deleted ${summary.databaseRecordsDeleted.users} users`);
        
      } catch (error) {
        console.error('❌ Error during database deletion:', error);
        summary.errors.push(`Database deletion error: ${error.message}`);
      }

      // Step 3: Clear Airtable user data
      try {
        console.log('🗑️ Step 3: Clearing Airtable user data...');
        
        // Clear user profiles from Airtable
        try {
          const deletedProfiles = await airtableService.deleteAllUserProfiles();
          summary.airtableRecordsDeleted += deletedProfiles;
          console.log(`✅ Deleted ${deletedProfiles} user profiles from Airtable`);
        } catch (airtableError) {
          console.error('❌ Failed to clear Airtable profiles:', airtableError);
          summary.errors.push(`Airtable profiles deletion error: ${airtableError.message}`);
        }
        
        // Clear job matches from Airtable
        try {
          const deletedMatches = await airtableService.deleteAllJobMatches();
          summary.airtableRecordsDeleted += deletedMatches;
          console.log(`✅ Deleted ${deletedMatches} job matches from Airtable`);
        } catch (airtableError) {
          console.error('❌ Failed to clear Airtable matches:', airtableError);
          summary.errors.push(`Airtable matches deletion error: ${airtableError.message}`);
        }
        
      } catch (error) {
        console.error('❌ Error during Airtable deletion:', error);
        summary.errors.push(`Airtable deletion error: ${error.message}`);
      }

      const totalRecords = Object.values(summary.databaseRecordsDeleted).reduce((a, b) => a + b, 0);
      
      console.log('🎉 Data wipe completed!');
      console.log('📊 Summary:', {
        totalDatabaseRecords: totalRecords,
        resumeFiles: summary.resumeFilesDeleted,
        airtableRecords: summary.airtableRecordsDeleted,
        errors: summary.errors.length
      });
      
      res.json({
        success: true,
        message: 'User data wipe completed successfully',
        summary: {
          ...summary,
          totalDatabaseRecords: totalRecords
        }
      });
      
    } catch (error) {
      console.error('🚨 Critical error during data wipe:', error);
      res.status(500).json({
        success: false,
        message: 'Data wipe failed',
        error: error.message
      });
    }
  });

  // Debug endpoint to check Airtable connection
  app.get('/api/debug-airtable', async (req, res) => {
    try {
      console.log("🔍 Debug: Checking Airtable connection...");
      const allJobEntries = await airtableService.getRecordsWithJobData();
      
      res.json({
        success: true,
        totalEntries: allJobEntries.length,
        entries: allJobEntries.map(entry => ({
          userId: entry.userId,
          jobTitle: entry.jobTitle,
          hasJobDescription: !!entry.jobDescription
        }))
      });
    } catch (error) {
      console.error("Airtable debug error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Debug endpoint specifically for job matches base
  app.get('/api/debug-job-matches', async (req, res) => {
    try {
      console.log("🧪 Debug: Checking job matches base directly...");
      const Airtable = await import('airtable');
      const airtable = new Airtable.default({
        endpointUrl: 'https://api.airtable.com',
        apiKey: process.env.AIRTABLE_API_KEY
      });
      const jobMatchesBase = airtable.base(process.env.AIRTABLE_JOB_MATCHES_BASE_ID!);
      
      const records = await jobMatchesBase('Table 1').select({
        maxRecords: 10
      }).all();
      
      console.log('🧪 Raw records found:', records.length);
      const recordDetails = records.map(record => ({
        id: record.id,
        fields: record.fields,
        fieldNames: Object.keys(record.fields)
      }));
      
      console.log('🧪 Record details:', JSON.stringify(recordDetails, null, 2));
      
      res.json({
        success: true,
        baseId: process.env.AIRTABLE_JOB_MATCHES_BASE_ID,
        count: records.length,
        records: recordDetails
      });
    } catch (error) {
      console.error('Job matches debug error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Clear tracking for testing
  app.post('/api/debug/clear-tracking', requireAuth, async (req, res) => {
    try {
      airtableService.clearProcessedTracking();
      res.json({ message: 'Tracking cleared successfully' });
    } catch (error) {
      console.error('Error clearing tracking:', error);
      res.status(500).json({ message: 'Failed to clear tracking' });
    }
  });

  // Set up automatic Airtable monitoring (only in production or when explicitly enabled)
  const enableAutoMonitoring = process.env.NODE_ENV === 'production' || process.env.ENABLE_AIRTABLE_MONITORING === 'true';
  
  if (enableAutoMonitoring) {
    setInterval(async () => {
      try {
        console.log("⏰ Running Airtable monitoring check...");
        
        // Monitor platojobmatches table for job matches (creates job matches)
        const newJobMatches = await airtableService.checkForNewJobMatches();
        
        if (newJobMatches.length > 0) {
          console.log(`🎯 Found ${newJobMatches.length} new job matches in job matches table`);
          
          for (const jobMatch of newJobMatches) {
            try {
              await airtableService.processJobMatch(jobMatch);
              console.log(`✅ Auto-created job match for user ${jobMatch.userId}: ${jobMatch.jobTitle}`);
            } catch (error) {
              console.error(`❌ Failed to create job match for user ${jobMatch.userId}:`, error);
            }
          }
        } else {
          console.log("🔍 No new job matches found in current monitoring cycle");
        }
      } catch (error) {
        console.error("❌ Airtable monitoring error:", error);
      }
    }, 60000); // Check every 60 seconds (1 minute)

    console.log("🚀 Airtable job monitoring system started - checking every 60 seconds");
  } else {
    console.log("ℹ️ Airtable auto-monitoring disabled in development. Use /api/admin/process-airtable-jobs to manually process.");
  }

  // Generate brutally honest profile for Airtable after all interviews completed
  app.post('/api/profile/generate-honest-assessment', 
    requireAuth, 

    async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user data and profile
      const user = await storage.getUser(userId);
      const profile = await storage.getApplicantProfile(userId);
      
      if (!user || !profile) {
        return res.status(404).json({ message: "User or profile not found" });
      }

      // Check if all three interviews are completed
      if (!profile.personalInterviewCompleted || !profile.professionalInterviewCompleted || !profile.technicalInterviewCompleted) {
        return res.status(400).json({ 
          message: "All three interviews must be completed before generating honest assessment",
          completedInterviews: {
            personal: profile.personalInterviewCompleted,
            professional: profile.professionalInterviewCompleted,
            technical: profile.technicalInterviewCompleted
          }
        });
      }

      // Get all completed interview responses
      const completedInterviews = await db
        .select()
        .from(interviewSessions)
        .where(and(
          eq(interviewSessions.userId, userId),
          eq(interviewSessions.isCompleted, true)
        ))
        .orderBy(interviewSessions.createdAt);

      // Get resume analysis
      const resumeUpload = await storage.getActiveResume(userId);
      const resumeAnalysis = resumeUpload?.aiAnalysis;

      if (!resumeAnalysis) {
        return res.status(400).json({ 
          message: "Resume analysis not found. Please upload and analyze a resume first."
        });
      }

      // Compile all interview responses
      const allInterviewResponses = completedInterviews.map(session => ({
        type: session.interviewType,
        responses: session.sessionData?.responses || [],
        questions: session.sessionData?.questions || [],
        completedAt: session.completedAt
      }));

      // Generate brutally honest profile using AI
      const honestProfile = await aiInterviewService.generateBrutallyHonestProfile(
        { ...user, ...profile },
        allInterviewResponses,
        resumeAnalysis
      );

      // Store the honest profile for Airtable integration
      await storage.updateApplicantProfile(userId, {
        honestProfileGenerated: true,
        honestProfile: honestProfile as any,
        profileGeneratedAt: new Date()
      });

      res.json({
        message: "Brutally honest profile generated successfully",
        profile: honestProfile,
        readyForAirtable: true
      });

    } catch (error) {
      console.error("Error generating honest profile:", error);
      res.status(500).json({ 
        message: "Failed to generate honest profile",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // =============================================
  // PREMIUM FEATURE ROUTES - PROFILE VIEWS & VISIBILITY
  // =============================================

  // Track profile views - Premium & Pro exclusive
  app.post("/api/profile/track-view", 
    requireAuth, 

    async (req: any, res) => {
    try {
      const viewerId = req.user.id;
      const { profileId, viewType = 'employer_view' } = req.body;
      
      if (!profileId) {
        return res.status(400).json({ error: "Profile ID is required" });
      }
      
      // Log the profile view (in production, store in database)
      console.log(`👀 Profile View Tracked: ${viewerId} viewed profile ${profileId} (${viewType})`);
      
      // TODO: Implement actual view tracking in database
      // await storage.trackProfileView(viewerId, profileId, viewType);
      
      res.json({ 
        message: "Profile view tracked successfully",
        viewType,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error tracking profile view:", error);
      res.status(500).json({ error: "Failed to track profile view" });
    }
  });

  // Get who viewed your profile - Premium & Pro exclusive
  app.get("/api/profile/viewers", 
    requireAuth, 

    async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // TODO: Implement actual viewer retrieval from database
      // For now, return mock data to demonstrate the feature
      const viewers = [
        {
          id: 'viewer_1',
          name: 'TechCorp HR',
          company: 'TechCorp Solutions',
          viewedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          viewType: 'employer_view'
        },
        {
          id: 'viewer_2', 
          name: 'Innovation Labs',
          company: 'Innovation Labs Inc',
          viewedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          viewType: 'recruiter_view'
        }
      ];
      
      res.json({ 
        viewers,
        totalViews: viewers.length,
        recentViews: viewers.filter(v => 
          new Date(v.viewedAt).getTime() > Date.now() - 604800000 // Last 7 days
        ).length
      });
    } catch (error) {
      console.error("Error fetching profile viewers:", error);
      res.status(500).json({ error: "Failed to fetch profile viewers" });
    }
  });

  // Apply visibility boost - Premium & Pro exclusive
  app.post("/api/profile/visibility-boost", 
    requireAuth, 
    async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { boostDuration = 24 } = req.body; // hours
      
      // TODO: Implement actual visibility boost in database
      console.log(`🚀 Visibility Boost Applied: User ${userId} boosted for ${boostDuration} hours`);
      
      res.json({ 
        message: "Visibility boost applied successfully",
        boostActive: true,
        boostExpiresAt: new Date(Date.now() + (boostDuration * 60 * 60 * 1000)).toISOString(),
        boostDuration: `${boostDuration} hours`
      });
    } catch (error) {
      console.error("Error applying visibility boost:", error);
      res.status(500).json({ error: "Failed to apply visibility boost" });
    }
  });

  // =============================================
  // COMPREHENSIVE PROFILE ROUTES
  // =============================================

  // Reset comprehensive profile data (clear pre-filled data) - Profile Rebuild Feature
  app.post("/api/comprehensive-profile/reset", 
    requireAuth, 
    async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      
      // Clear ALL profile data for a complete reset
      await db
        .update(applicantProfiles)
        .set({
          // Reset personal details
          name: null,
          email: null,
          phone: null,
          birthdate: null,
          gender: null,
          nationality: null,
          maritalStatus: null,
          dependents: null,
          militaryStatus: null,
          country: null,
          city: null,
          address: null,
          zipCode: null,
          // Reset work eligibility
          willingToRelocate: null,
          workAuthorization: null,
          visaStatus: null,
          visaExpiryDate: null,
          sponsorshipRequired: null,
          preferredLocations: null,
          workArrangement: null,
          availabilityDate: null,
          noticePeriod: null,
          travelWillingness: null,
          // Reset experience and education
          skillsList: null,
          languages: null,
          workExperiences: null,
          degrees: null,
          certifications: null,
          achievements: null,
          totalYearsOfExperience: null,
          // Reset career info
          summary: null,
          careerLevel: null,
          targetRoles: null,
          targetIndustries: null,
          targetCompanies: null,
          // Reset online presence
          linkedinUrl: null,
          githubUrl: null,
          websiteUrl: null,
          facebookUrl: null,
          twitterUrl: null,
          instagramUrl: null,
          youtubeUrl: null,
          otherUrls: null,
          // Reset salary expectations
          salaryExpectations: null,
          benefits: null,
          careerGoals: null,
          workStyle: null,
          motivations: null,
          dealBreakers: null,
          // Reset resume content
          resumeContent: null,
          // Reset completion percentage to 0 for fresh start
          completionPercentage: 0,
          updatedAt: new Date()
        })
        .where(eq(applicantProfiles.userId, userId));
      
      console.log(`Reset comprehensive profile data for user ${userId}`);
      res.json({ success: true, message: "Profile data reset successfully" });
    } catch (error) {
      console.error("Error resetting comprehensive profile:", error);
      res.status(500).json({ message: "Failed to reset profile" });
    }
  });

  // Get comprehensive profile data
  app.get("/api/comprehensive-profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const profile = await storage.getApplicantProfile(userId);
      
      if (!profile) {
        // Return empty profile structure if no profile exists
        return res.json({
          personalDetails: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            dateOfBirth: "",
            nationality: "",
            address: {},
            emergencyContact: {}
          },
          governmentId: {
            idType: "",
            idNumber: "",
            expiryDate: "",
            issuingAuthority: "",
            verified: false
          },
          linksPortfolio: {
            linkedinUrl: "",
            githubUrl: "",
            portfolioUrl: "",
            personalWebsite: "",
            behanceUrl: "",
            dribbbleUrl: "",
            otherLinks: []
          },
          workEligibility: {},
          languages: [{ language: "", proficiency: "conversational", certification: "" }],
          skills: {
            technicalSkills: [],
            softSkills: [],
            industryKnowledge: [],
            tools: []
          },
          education: [],
          experience: [],
          certifications: [],
          awards: [],
          jobTarget: {
            targetRoles: [],
            targetIndustries: [],
            targetCompanies: [],
            salaryExpectations: {
              currency: "EGP",
              period: "monthly",
              negotiable: true
            },
            benefits: {}
          }
        });
      }

      // Map database profile to frontend comprehensive profile format
      const comprehensiveProfile = {
        personalDetails: {
          firstName: profile.name?.split(' ')[0] || "",
          lastName: profile.name?.split(' ').slice(1).join(' ') || "",
          email: profile.email || "",
          phone: profile.phone || "",
          dateOfBirth: profile.birthdate ? new Date(profile.birthdate).toISOString().split('T')[0] : "",
          gender: profile.gender || "",
          nationality: profile.nationality || "",
          address: {
            street: "",
            city: profile.city || "",
            state: "",
            country: profile.country || "",
            postalCode: ""
          },
          emergencyContact: {
            name: "",
            relationship: "",
            phone: ""
          }
        },
        governmentId: {
          idType: "",
          idNumber: "",
          expiryDate: "",
          issuingAuthority: "",
          verified: false
        },
        linksPortfolio: {
          linkedinUrl: profile.linkedinUrl || "",
          githubUrl: profile.githubUrl || "",
          portfolioUrl: "",
          personalWebsite: profile.websiteUrl || "",
          behanceUrl: "",
          dribbbleUrl: "",
          otherLinks: (profile.otherUrls || []).map(url => ({ platform: "Other", url }))
        },
        workEligibility: {
          workAuthorization: "",
          visaStatus: "",
          visaExpiryDate: "",
          sponsorshipRequired: false,
          willingToRelocate: profile.willingToRelocate || false,
          preferredLocations: profile.preferredWorkCountries || [],
          workArrangement: profile.workplaceSettings || "",
          availabilityDate: "",
          noticePeriod: "",
          travelWillingness: ""
        },
        languages: profile.languages || [{ language: "", proficiency: "conversational", certification: "" }],
        skills: {
          technicalSkills: (profile.skillsList || []).map(skill => ({ skill, level: "intermediate", yearsOfExperience: 0 })),
          softSkills: [{ skill: "", level: "intermediate" }],
          industryKnowledge: [],
          tools: []
        },
        education: profile.degrees || [{ institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", current: false }],
        experience: profile.workExperiences || [{ company: "", position: "", startDate: "", endDate: "", current: false, responsibilities: "" }],
        certifications: profile.certifications || [],
        awards: [],
        jobTarget: {
          targetRoles: profile.jobTitles || [],
          targetIndustries: profile.jobCategories || [],
          targetCompanies: [],
          careerLevel: profile.careerLevel || "",
          salaryExpectations: {
            minSalary: profile.minimumSalary || 0,
            maxSalary: 0,
            currency: "EGP",
            period: "monthly",
            negotiable: true
          },
          benefits: {
            healthInsurance: false,
            retirementPlan: false,
            paidTimeOff: false,
            flexibleSchedule: false,
            remoteWork: false,
            professionalDevelopment: false,
            stockOptions: false,
            other: []
          },
          careerGoals: "",
          workStyle: "",
          motivations: "",
          dealBreakers: ""
        }
      };

      // Calculate completion percentage using the same logic as save endpoint
      const completionPercentage = calculateCompletionPercentage(comprehensiveProfile);
      
      res.json({
        ...comprehensiveProfile,
        completionPercentage
      });
    } catch (error) {
      console.error("Error fetching comprehensive profile:", error);
      res.status(500).json({ message: "Failed to fetch comprehensive profile" });
    }
  });

  // Autosave comprehensive profile data
  app.post("/api/comprehensive-profile/autosave", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const profileData = req.body;
      
      // Map frontend comprehensive profile to database format (COMPLETE FIELD MAPPING for auto-save)
      const dbProfileData: Partial<InsertApplicantProfile> = {
        userId,
        
        // Personal Details Section - Enhanced
        name: profileData.personalDetails ? `${profileData.personalDetails.firstName || ''} ${profileData.personalDetails.lastName || ''}`.trim() : undefined,
        email: profileData.personalDetails?.email,
        phone: profileData.personalDetails?.phone,
        birthdate: profileData.personalDetails?.dateOfBirth || undefined,
        gender: profileData.personalDetails?.gender,
        nationality: profileData.personalDetails?.nationality,
        maritalStatus: profileData.personalDetails?.maritalStatus,
        dependents: profileData.personalDetails?.dependents,
        militaryStatus: profileData.personalDetails?.militaryStatus,
        
        // Location & Address - Complete mapping
        country: profileData.personalDetails?.address?.country,
        city: profileData.personalDetails?.address?.city,
        address: profileData.personalDetails?.address?.street,
        zipCode: profileData.personalDetails?.address?.postalCode,
        
        // Emergency Contact - Complete mapping
        emergencyContactName: profileData.personalDetails?.emergencyContact?.name,
        emergencyContactRelationship: profileData.personalDetails?.emergencyContact?.relationship,
        emergencyContactPhone: profileData.personalDetails?.emergencyContact?.phone,
        
        // Government ID - Complete mapping  
        idType: profileData.governmentId?.idType,
        idNumber: profileData.governmentId?.idNumber,
        idExpiryDate: profileData.governmentId?.expiryDate,
        idIssuingAuthority: profileData.governmentId?.issuingAuthority,
        idVerified: profileData.governmentId?.verified,
        
        // Online Presence & Portfolio - ALL social media fields
        linkedinUrl: profileData.linksPortfolio?.linkedinUrl,
        githubUrl: profileData.linksPortfolio?.githubUrl,
        websiteUrl: profileData.linksPortfolio?.personalWebsite,
        facebookUrl: profileData.linksPortfolio?.facebookUrl,
        twitterUrl: profileData.linksPortfolio?.twitterUrl,
        instagramUrl: profileData.linksPortfolio?.instagramUrl,
        youtubeUrl: profileData.linksPortfolio?.youtubeUrl,
        otherUrls: profileData.linksPortfolio?.otherLinks?.map((link: any) => link.url),
        
        // Work Eligibility & Preferences - Complete mapping
        willingToRelocate: profileData.workEligibility?.willingToRelocate,
        preferredWorkCountries: profileData.workEligibility?.preferredLocations,
        workplaceSettings: profileData.workEligibility?.workArrangement,
        workAuthorization: profileData.workEligibility?.workAuthorization,
        visaStatus: profileData.workEligibility?.visaStatus,
        visaExpiryDate: profileData.workEligibility?.visaExpiryDate,
        sponsorshipRequired: profileData.workEligibility?.sponsorshipRequired,
        availabilityDate: profileData.workEligibility?.availabilityDate,
        noticePeriod: profileData.workEligibility?.noticePeriod,
        travelWillingness: profileData.workEligibility?.travelWillingness,
        
        // Languages
        languages: profileData.languages,
        
        // Skills - Enhanced to include both technical and soft skills with years of experience
        skillsList: [
          ...(profileData.skills?.technicalSkills?.map((skill: any) => skill.skill) || []),
          ...(profileData.skills?.softSkills?.map((skill: any) => skill.skill) || [])
        ],
        // Store complete skills data with years of experience in a JSON field
        skillsData: {
          technicalSkills: profileData.skills?.technicalSkills || [],
          softSkills: profileData.skills?.softSkills || [],
          industryKnowledge: profileData.skills?.industryKnowledge || [],
          tools: profileData.skills?.tools || []
        },
        
        // Education - Enhanced with level detection
        degrees: profileData.education,
        currentEducationLevel: profileData.education?.[0]?.degree,
        highSchools: profileData.education?.filter((edu: any) => 
          edu.degree?.toLowerCase().includes('high school')),
        
        // Experience - Enhanced with years calculation
        workExperiences: profileData.experience,
        totalYearsOfExperience: profileData.experience?.reduce((total: number, exp: any) => {
          if (exp.startDate && exp.endDate) {
            const start = new Date(exp.startDate);
            const end = new Date(exp.endDate);
            const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
            return total + Math.max(0, years);
          }
          return total;
        }, 0),
        
        // Certifications & Training
        certifications: profileData.certifications,
        trainingCourses: profileData.trainingCourses,
        
        // Awards & Achievements
        achievements: profileData.awards?.map((award: any) => award.title || award.name).join(', '),
        
        // Career Preferences & Job Target - Complete mapping
        jobTitles: profileData.jobTarget?.targetRoles,
        jobCategories: profileData.jobTarget?.targetIndustries,
        careerLevel: profileData.jobTarget?.careerLevel,
        minimumSalary: profileData.jobTarget?.salaryExpectations?.minSalary,
        hideSalaryFromCompanies: profileData.jobTarget?.salaryExpectations?.negotiable === false,
        jobTypes: profileData.jobTarget?.jobTypes,
        jobSearchStatus: profileData.jobTarget?.jobSearchStatus,
        
        updatedAt: new Date()
      };

      // Remove undefined values
      Object.keys(dbProfileData).forEach(key => {
        if (dbProfileData[key as keyof typeof dbProfileData] === undefined) {
          delete dbProfileData[key as keyof typeof dbProfileData];
        }
      });

      if (Object.keys(dbProfileData).length > 1) { // Only userId and updatedAt
        await storage.upsertApplicantProfile(dbProfileData);
      }
      
      res.json({ success: true, message: "Profile auto-saved successfully" });
    } catch (error) {
      console.error("Error auto-saving comprehensive profile:", error);
      res.status(500).json({ message: "Failed to auto-save comprehensive profile" });
    }
  });

  // Test endpoint to verify profile field mapping (development only)
  app.get("/api/debug/profile-fields/:userId", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const profile = await storage.getApplicantProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      // Return all profile fields to verify what's actually saved in the database
      const fieldReport = {
        userId: profile.userId,
        fieldsPopulated: Object.keys(profile).reduce((acc, key) => {
          const value = profile[key as keyof typeof profile];
          acc[key] = {
            hasValue: value !== null && value !== undefined && value !== '',
            type: typeof value,
            isArray: Array.isArray(value),
            arrayLength: Array.isArray(value) ? value.length : undefined,
            value: value // Show actual value for debugging
          };
          return acc;
        }, {} as Record<string, any>),
        totalFieldsWithData: Object.values(profile).filter(v => v !== null && v !== undefined && v !== '').length,
        completionPercentage: profile.completionPercentage
      };
      
      res.json(fieldReport);
    } catch (error) {
      console.error("Error fetching profile fields:", error);
      res.status(500).json({ message: "Failed to fetch profile fields" });
    }
  });

  // Save comprehensive profile (allows incremental saving)
  app.post("/api/comprehensive-profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const profileData = req.body;
      
      // Allow incremental saving - no strict validation required
      // The completion percentage calculation will handle determining what's complete
      console.log('📋 Saving comprehensive profile incrementally for user:', userId);

      // Map frontend comprehensive profile to database format (handle partial data)
      const dbProfileData: InsertApplicantProfile = {
        userId,
        
        // Personal Details Section
        name: profileData.personalDetails?.firstName && profileData.personalDetails?.lastName 
          ? `${profileData.personalDetails.firstName} ${profileData.personalDetails.lastName}`.trim() 
          : null,
        email: profileData.personalDetails?.email || null,
        phone: profileData.personalDetails?.phone || null,
        birthdate: profileData.personalDetails?.dateOfBirth || null,
        gender: profileData.personalDetails?.gender || null,
        nationality: profileData.personalDetails?.nationality || null,
        
        // Location
        country: profileData.personalDetails?.address?.country || null,
        city: profileData.personalDetails?.address?.city || null,
        
        // Additional personal fields
        maritalStatus: profileData.personalDetails?.maritalStatus || null,
        dependents: profileData.personalDetails?.dependents || null,
        militaryStatus: profileData.personalDetails?.militaryStatus || null,
        
        // Online Presence & Portfolio
        linkedinUrl: profileData.linksPortfolio?.linkedinUrl || null,
        githubUrl: profileData.linksPortfolio?.githubUrl || null,
        websiteUrl: profileData.linksPortfolio?.personalWebsite || null,
        facebookUrl: profileData.linksPortfolio?.facebookUrl || null,
        twitterUrl: profileData.linksPortfolio?.twitterUrl || null,
        instagramUrl: profileData.linksPortfolio?.instagramUrl || null,
        youtubeUrl: profileData.linksPortfolio?.youtubeUrl || null,
        otherUrls: profileData.linksPortfolio?.otherLinks?.map((link: any) => link.url) || null,
        
        // Work Eligibility & Preferences
        willingToRelocate: profileData.workEligibility?.willingToRelocate || null,
        preferredWorkCountries: profileData.workEligibility?.preferredLocations || null,
        workplaceSettings: profileData.workEligibility?.workArrangement || null,
        
        // Languages
        languages: profileData.languages || null,
        
        // Skills
        skillsList: [
          ...(profileData.skills?.technicalSkills?.map((skill: any) => skill.skill) || []),
          ...(profileData.skills?.softSkills?.map((skill: any) => skill.skill) || [])
        ],
        
        // Education
        degrees: profileData.education || null,
        currentEducationLevel: profileData.education?.[0]?.degree || null,
        highSchools: profileData.education?.filter((edu: any) => edu.degree?.toLowerCase().includes('high school')) || null,
        
        // Work Experience  
        workExperiences: profileData.experience || null,
        totalYearsOfExperience: Math.ceil(profileData.experience?.reduce((total: number, exp: any) => {
          if (exp.startDate && exp.endDate) {
            const start = new Date(exp.startDate);
            const end = new Date(exp.endDate);
            const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
            return total + Math.max(0, years);
          }
          return total;
        }, 0) || null),
        
        // Certifications & Training
        certifications: profileData.certifications || null,
        trainingCourses: profileData.trainingCourses || null,
        
        // Awards & Achievements
        achievements: profileData.awards?.map((award: any) => award.title || award.name).join(', ') || null,
        
        // Career Preferences & Job Target
        jobTitles: profileData.jobTarget?.targetRoles || null,
        jobCategories: profileData.jobTarget?.targetIndustries || null,
        careerLevel: profileData.jobTarget?.careerLevel || null,
        minimumSalary: profileData.jobTarget?.salaryExpectations?.minSalary || null,
        hideSalaryFromCompanies: profileData.jobTarget?.salaryExpectations?.negotiable === false || null,
        jobTypes: profileData.jobTarget?.jobTypes || null,
        jobSearchStatus: profileData.jobTarget?.jobSearchStatus || null,
        
        // Calculate completion percentage based on filled sections
        completionPercentage: calculateCompletionPercentage(profileData),
        
        updatedAt: new Date()
      };

      // Save to local database first
      await storage.upsertApplicantProfile(dbProfileData);
      
      // Save comprehensive profile to Airtable for AI analysis and job matching
      try {
        console.log('📋 Saving comprehensive profile to Airtable for user:', userId);
        
        // Format the comprehensive profile data for Airtable
        const comprehensiveProfileString = JSON.stringify({
          personalDetails: profileData.personalDetails,
          governmentId: profileData.governmentId,
          linksPortfolio: profileData.linksPortfolio,
          workEligibility: profileData.workEligibility,
          languages: profileData.languages,
          skills: profileData.skills,
          education: profileData.education,
          experience: profileData.experience,
          certifications: profileData.certifications,
          awards: profileData.awards,
          jobTarget: profileData.jobTarget,
          completionPercentage: dbProfileData.completionPercentage,
          profileType: 'comprehensive',
          lastUpdated: new Date().toISOString()
        }, null, 2);
        
        // Use the existing airtableService to store the profile (handle partial data)
        const profileName = dbProfileData.name || profileData.personalDetails?.firstName || `User ${userId}`;
        await airtableService.storeUserProfile(
          profileName,
          {
            type: 'comprehensive',
            data: profileData,
            summary: `Comprehensive profile for ${profileName} (${dbProfileData.completionPercentage}% complete)`,
            completionPercentage: dbProfileData.completionPercentage,
            skills: dbProfileData.skillsList || [],
            education: profileData.education || [],
            experience: profileData.experience || [],
            targetRoles: profileData.jobTarget?.targetRoles || []
          },
          userId,
          dbProfileData.email || undefined
        );
        
        console.log('📋 Successfully saved comprehensive profile to Airtable for user:', userId);
      } catch (airtableError) {
        console.error('📋 Error saving comprehensive profile to Airtable:', airtableError);
        // Continue execution even if Airtable fails - don't block the user
      }
      
      console.log(`📋 Profile saved successfully for user ${userId} with ${dbProfileData.completionPercentage}% completion`);
      
      res.json({ 
        success: true, 
        message: "Profile progress saved successfully!",
        completionPercentage: dbProfileData.completionPercentage
      });
    } catch (error) {
      console.error("Error saving comprehensive profile:", error);
      res.status(500).json({ 
        message: "Failed to save comprehensive profile",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Helper function to calculate completion percentage based on realistic job-seeking requirements
  function calculateCompletionPercentage(profileData: any): number {
    // If no profile data provided, return 0
    if (!profileData) {
      console.log('📊 No profile data provided, returning 0%');
      return 0;
    }
    
    console.log('📊 Calculating completion for profile data:', JSON.stringify(profileData, null, 2));
    let totalPercentage = 0;
    
    // Helper function to check if a value is meaningful (not empty, null, undefined, or just whitespace)
    const hasValue = (val: any): boolean => {
      if (val === null || val === undefined || val === '') return false;
      if (typeof val === 'string') return val.trim() !== '';
      if (typeof val === 'number') return val > 0;
      if (typeof val === 'boolean') return true; // boolean values are always meaningful
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object') return Object.keys(val).length > 0;
      return false;
    };
    
    // 1. Personal Details - 20% (Required - Core for job applications)
    let personalScore = 0;
    if (hasValue(profileData.personalDetails?.firstName)) personalScore += 25; // 5%
    if (hasValue(profileData.personalDetails?.lastName)) personalScore += 25; // 5%
    if (hasValue(profileData.personalDetails?.email)) personalScore += 25; // 5%
    if (hasValue(profileData.personalDetails?.phone)) personalScore += 25; // 5%
    // Optional personal details for bonus points
    if (hasValue(profileData.personalDetails?.dateOfBirth)) personalScore += 0; // 0% - not essential
    if (hasValue(profileData.personalDetails?.nationality)) personalScore += 0; // 0% - not essential
    totalPercentage += (personalScore / 100) * 20;
    
    // 2. Government ID - 2% (Truly Optional - reduced weight)
    let govIdScore = 0;
    if (hasValue(profileData.governmentId?.idType)) govIdScore += 50; // 1%
    if (hasValue(profileData.governmentId?.idNumber)) govIdScore += 50; // 1%
    totalPercentage += (govIdScore / 100) * 2;
    
    // 3. Links & Portfolio - 5% (Optional but valuable)
    let linksScore = 0;
    const linkCount = [
      profileData.linksPortfolio?.linkedinUrl,
      profileData.linksPortfolio?.githubUrl,
      profileData.linksPortfolio?.portfolioUrl,
      profileData.linksPortfolio?.personalWebsite
    ].filter(link => hasValue(link)).length;
    
    if (linkCount > 0) linksScore = Math.min(100, linkCount * 25); // 25% per link, max 100%
    totalPercentage += (linksScore / 100) * 5;
    
    // 4. Work Eligibility - 8% (Important for job matching)
    let eligibilityScore = 0;
    if (hasValue(profileData.workEligibility?.workAuthorization)) eligibilityScore += 50; // 4%
    if (hasValue(profileData.workEligibility?.workArrangement)) eligibilityScore += 50; // 4%
    // Boolean values count if explicitly set
    if (profileData.workEligibility?.willingToRelocate !== undefined) eligibilityScore += 0; // 0% - bonus only
    totalPercentage += (eligibilityScore / 100) * 8;
    
    // 5. Languages - 10% (Required for international job market)
    let languageScore = 0;
    const validLanguages = profileData.languages?.filter((lang: any) => hasValue(lang.language)) || [];
    if (validLanguages.length > 0) {
      languageScore = 100; // Full score for having at least one language
    }
    totalPercentage += (languageScore / 100) * 10;
    
    // 6. Skills - 15% (Critical for job matching)
    let skillsScore = 0;
    const validTechSkills = profileData.skills?.technicalSkills?.filter((skill: any) => hasValue(skill.skill)) || [];
    const validSoftSkills = profileData.skills?.softSkills?.filter((skill: any) => hasValue(skill.skill)) || [];
    
    if (validTechSkills.length > 0) skillsScore += 70; // 10.5% for technical skills (increased)
    if (validSoftSkills.length > 0) skillsScore += 30; // 4.5% for soft skills  
    // Bonus for multiple technical skills
    if (validTechSkills.length >= 2) skillsScore = Math.min(skillsScore + 0, 100); // Already at max
    totalPercentage += (skillsScore / 100) * 15;
    
    // 7. Education - 12% (Essential for most jobs)
    let educationScore = 0;
    const validEducation = profileData.education?.filter((edu: any) => hasValue(edu.institution)) || [];
    if (validEducation.length > 0) {
      educationScore += 70; // 8.4% for having education
      if (hasValue(validEducation[0].degree)) educationScore += 30; // 3.6% for degree info
    }
    totalPercentage += (educationScore / 100) * 12;
    
    // 8. Experience - 18% (Most important for job applications)
    let experienceScore = 0;
    const validExperience = profileData.experience?.filter((exp: any) => hasValue(exp.company)) || [];
    if (validExperience.length > 0) {
      experienceScore += 60; // 10.8% for having experience
      if (hasValue(validExperience[0].position)) experienceScore += 25; // 4.5% for position
      if (hasValue(validExperience[0].responsibilities)) experienceScore += 15; // 2.7% for responsibilities
    }
    totalPercentage += (experienceScore / 100) * 18;
    
    // 9. Certifications - 5% (Optional but valuable)
    let certScore = 0;
    const validCertifications = profileData.certifications?.filter((cert: any) => hasValue(cert.name)) || [];
    if (validCertifications.length > 0) {
      certScore = 100; // Full score for having any certifications
    }
    totalPercentage += (certScore / 100) * 5;
    
    // 10. Awards - 2% (Nice to have, reduced weight)
    let awardScore = 0;
    const validAwards = profileData.awards?.filter((award: any) => hasValue(award.title)) || [];
    if (validAwards.length > 0) {
      awardScore = 100; // Full score for having any awards
    }
    totalPercentage += (awardScore / 100) * 2;
    
    // 11. Job Target - 8% (Important for job matching)
    let jobTargetScore = 0;
    const validTargetRoles = profileData.jobTarget?.targetRoles?.filter((role: string) => hasValue(role)) || [];
    if (validTargetRoles.length > 0) jobTargetScore += 62.5; // 5% for target roles (increased)
    if (hasValue(profileData.jobTarget?.careerLevel)) jobTargetScore += 37.5; // 3% for career level (increased)
    if (hasValue(profileData.jobTarget?.salaryExpectations?.minSalary)) jobTargetScore = Math.min(100, jobTargetScore + 0); // Full score if other fields filled
    // Career goals and work style are bonus
    totalPercentage += (jobTargetScore / 100) * 8;
    
    const finalPercentage = Math.min(Math.round(totalPercentage), 100);
    console.log('📊 Final completion percentage calculated:', finalPercentage + '%');
    console.log('📊 Breakdown - Personal:', Math.round((personalScore / 100) * 20) + '%, Gov ID:', Math.round((govIdScore / 100) * 2) + '%, Links:', Math.round((linksScore / 100) * 5) + '%, Eligibility:', Math.round((eligibilityScore / 100) * 8) + '%, Languages:', Math.round((languageScore / 100) * 10) + '%, Skills:', Math.round((skillsScore / 100) * 15) + '%, Education:', Math.round((educationScore / 100) * 12) + '%, Experience:', Math.round((experienceScore / 100) * 18) + '%, Certs:', Math.round((certScore / 100) * 5) + '%, Awards:', Math.round((awardScore / 100) * 2) + '%, Job Target:', Math.round((jobTargetScore / 100) * 8) + '%');
    return finalPercentage; // Cap at 100%
  }

  // Certificate file upload routes
  app.post("/api/certificates/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating certificate upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  app.put("/api/certificates/file", requireAuth, async (req, res) => {
    try {
      const { certificateURL, certificateIndex } = req.body;
      const userId = (req.user as any)?.id;
      
      if (!certificateURL || certificateIndex === undefined) {
        return res.status(400).json({ message: "Certificate URL and index are required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(certificateURL);
      
      // Get current profile
      const profile = await storage.getApplicantProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      // Update the certificate file path
      const certifications = profile.certifications as any[] || [];
      if (certifications[certificateIndex]) {
        certifications[certificateIndex].certificateFile = objectPath;
        
        // Update profile with new certificate file path
        await storage.upsertApplicantProfile({
          userId,
          certifications: certifications,
          updatedAt: new Date()
        });
        
        res.json({ 
          success: true, 
          objectPath,
          message: "Certificate file uploaded successfully" 
        });
      } else {
        res.status(400).json({ message: "Invalid certificate index" });
      }
    } catch (error) {
      console.error("Error updating certificate file:", error);
      res.status(500).json({ message: "Failed to update certificate file" });
    }
  });

  // Admin endpoint to update job applications with user emails
  app.post('/api/admin/update-applications-emails', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Basic admin check (you can enhance this with proper role checking)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`📧 Email update requested by user ${userId}`);
      
      // Run the email update process
      await airtableService.updateJobApplicationsWithEmails();
      
      res.json({ 
        message: 'Job applications email update completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating applications with emails:', error);
      res.status(500).json({ message: 'Failed to update applications with emails' });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
