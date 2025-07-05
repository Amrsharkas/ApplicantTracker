import Airtable from 'airtable';
import { storage } from './storage';
import { aiProfileAnalysisAgent } from './openai';

// Configure Airtable
const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
const AIRTABLE_BASE_ID = 'app3tA4UpKQCT2s17'; // platouserprofiles base
const TABLE_NAME = 'Table 1'; // For user profiles
const JOB_MATCHES_TABLE = 'platojobmatches'; // For job matches

if (!AIRTABLE_BASE_ID) {
  console.warn('AIRTABLE_BASE_ID not configured. Airtable integration will be disabled.');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_API_KEY
});

const base = AIRTABLE_BASE_ID ? Airtable.base(AIRTABLE_BASE_ID) : null;

export interface AirtableUserProfile {
  name: string;
  userProfile: string;
  userId: string;
}

export interface AirtableJobEntry {
  recordId: string;
  name: string;
  userProfile: string;
  userId: string;
  jobTitle?: string;
  jobDescription?: string;
}

export interface AirtableJobMatch {
  recordId: string;
  name: string;
  userId: string;
  jobTitle: string;
  jobDescription: string;
}

export class AirtableService {
  async storeUserProfile(name: string, profileData: any, userId: string): Promise<void> {
    if (!base) {
      console.warn('Airtable not configured, skipping profile storage');
      return;
    }

    try {
      const profileString = JSON.stringify(profileData, null, 2);
      
      // Try to store with User ID field first
      try {
        await base!(TABLE_NAME).create([
          {
            fields: {
              'Name': name,
              'User profile': profileString,
              'User ID': userId
            }
          }
        ]);
        console.log(`Successfully stored profile for ${name} (ID: ${userId}) in Airtable`);
      } catch (userIdError) {
        // If User ID field doesn't exist, store without it
        console.warn('User ID field not found, storing without User ID:', userIdError.message);
        await base!(TABLE_NAME).create([
          {
            fields: {
              'Name': name,
              'User profile': profileString
            }
          }
        ]);
        console.log(`Successfully stored profile for ${name} in Airtable (without User ID field)`);
      }
    } catch (error) {
      console.error('Error storing profile in Airtable:', error);
      throw new Error('Failed to store profile in Airtable');
    }
  }

  async getAllUserProfiles(): Promise<AirtableUserProfile[]> {
    if (!base) {
      console.warn('Airtable not configured, returning empty array');
      return [];
    }

    try {
      const records = await base!(TABLE_NAME).select({
        maxRecords: 100,
        view: 'Grid view'
      }).all();

      return records.map((record: any) => ({
        name: record.fields['Name'] || 'Unknown',
        userProfile: record.fields['User profile'] || 'No profile data',
        userId: record.fields['User ID'] || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching user profiles from Airtable:', error);
      throw new Error('Failed to fetch profiles from Airtable');
    }
  }

  async getRecordsWithJobData(): Promise<AirtableJobEntry[]> {
    if (!base) {
      console.warn('Airtable not configured, returning empty array');
      return [];
    }

    try {
      const records = await base!(TABLE_NAME).select({
        maxRecords: 100,
        view: 'Grid view'
      }).all();

      return records
        .filter((record: any) => 
          record.fields['Job title'] && 
          record.fields['Job description'] && 
          record.fields['User ID']
        )
        .map((record: any) => ({
          recordId: record.id,
          name: record.fields['Name'] || 'Unknown',
          userProfile: record.fields['User profile'] || 'No profile data',
          userId: record.fields['User ID'],
          jobTitle: record.fields['Job title'],
          jobDescription: record.fields['Job description']
        }));
    } catch (error) {
      console.error('Error fetching job entries from Airtable:', error);
      throw new Error('Failed to fetch job entries from Airtable');
    }
  }

  // New method to get job matches from the platojobmatches table
  async getJobMatchesFromAirtable(): Promise<AirtableJobMatch[]> {
    if (!base) {
      console.warn('Airtable not configured, returning empty array');
      return [];
    }

    try {
      // First try the dedicated job matches table
      try {
        const records = await base!(JOB_MATCHES_TABLE).select({
          maxRecords: 100,
          view: 'Grid view'
        }).all();

        console.log(`📋 Found ${records.length} records in job matches table`);
        return records
          .filter((record: any) => 
            record.fields['Job title'] && 
            record.fields['Job description'] && 
            record.fields['User ID']
          )
          .map((record: any) => ({
            recordId: record.id,
            name: record.fields['Name'] || 'Unknown',
            userId: record.fields['User ID'],
            jobTitle: record.fields['Job title'],
            jobDescription: record.fields['Job description']
          }));
      } catch (tableError) {
        // If dedicated table doesn't exist, check the main table for job match entries
        console.log('📋 Job matches table not found, checking main table for new job match entries...');
        
        const records = await base!(TABLE_NAME).select({
          maxRecords: 100,
          view: 'Grid view'
        }).all();

        console.log(`📋 Found ${records.length} total records in main table`);
        
        // Look for records with job data that are NOT already processed as applications
        // These would be new job matches from employers
        const jobMatchRecords = records
          .filter((record: any) => {
            const hasJobData = record.fields['Job title'] && record.fields['Job description'] && record.fields['User ID'];
            const hasUserProfile = record.fields['User profile']; // Has interview data
            
            // If it has both job data AND user profile, it might be either an application or a job match
            // For now, treat entries with job data as potential job matches
            return hasJobData;
          })
          .map((record: any) => ({
            recordId: record.id,
            name: record.fields['Name'] || 'Unknown',
            userId: record.fields['User ID'],
            jobTitle: record.fields['Job title'],
            jobDescription: record.fields['Job description']
          }));

        console.log(`📋 Found ${jobMatchRecords.length} potential job match records`);
        return jobMatchRecords;
      }
    } catch (error) {
      console.error('Error fetching job matches from Airtable:', error);
      console.log('Unable to access any Airtable tables - returning empty array');
      return []; // Return empty array instead of throwing to prevent monitoring crashes
    }
  }

  // Track processed records to avoid duplicates
  private processedRecords = new Set<string>();
  private processedJobMatches = new Set<string>();

  async checkForNewJobEntries(): Promise<AirtableJobEntry[]> {
    const allJobEntries = await this.getRecordsWithJobData();
    console.log(`📋 Found ${allJobEntries.length} total entries with job data in Airtable`);
    
    if (allJobEntries.length > 0) {
      console.log('Job entries:', allJobEntries.map(e => ({ userId: e.userId, jobTitle: e.jobTitle })));
    }
    
    // Filter out already processed records
    const newEntries = allJobEntries.filter(entry => !this.processedRecords.has(entry.recordId));
    console.log(`🔍 New unprocessed entries: ${newEntries.length} (already processed: ${this.processedRecords.size})`);
    
    // Mark new entries as processed
    newEntries.forEach(entry => this.processedRecords.add(entry.recordId));
    
    return newEntries;
  }

  // Check for new job matches from the platojobmatches table
  async checkForNewJobMatches(): Promise<AirtableJobMatch[]> {
    try {
      const allJobMatches = await this.getJobMatchesFromAirtable();
      console.log(`📋 Found ${allJobMatches.length} total job matches in Airtable`);
      
      if (allJobMatches.length > 0) {
        console.log('Job matches:', allJobMatches.map(m => ({ userId: m.userId, jobTitle: m.jobTitle })));
      }
      
      // Filter out already processed matches
      const newMatches = allJobMatches.filter(match => !this.processedJobMatches.has(match.recordId));
      console.log(`🔍 New unprocessed job matches: ${newMatches.length} (already processed: ${this.processedJobMatches.size})`);
      
      // Mark new matches as processed
      newMatches.forEach(match => this.processedJobMatches.add(match.recordId));
      
      return newMatches;
    } catch (error) {
      console.error('Error in checkForNewJobMatches:', error);
      return []; // Return empty array to prevent crashes
    }
  }

  async processJobMatch(jobMatch: AirtableJobMatch): Promise<void> {
    try {
      console.log(`Processing job match for user ${jobMatch.userId}: ${jobMatch.jobTitle}`);
      
      // Extract company name from job title if possible, or use a default
      const company = this.extractCompany(jobMatch.jobTitle!) || 'Company from Airtable';
      
      // Create the job in the database
      const job = await storage.createJobFromAirtable({
        title: jobMatch.jobTitle!,
        company: company,
        description: jobMatch.jobDescription!,
        location: 'Remote', // Default location
        experienceLevel: 'mid', // Default level
        skills: this.extractSkills(jobMatch.jobDescription!),
        jobType: 'full-time' // Default type
      });

      console.log(`✅ Created job: ${job.title} at ${job.company} (ID: ${job.id})`);

      // Check if user already has a match for this job
      const existingMatch = await storage.getJobMatches(jobMatch.userId);
      const hasMatch = existingMatch.some(match => match.job.title === job.title && match.job.company === job.company);
      
      if (hasMatch) {
        console.log(`User ${jobMatch.userId} already has match for job ${job.id}`);
        return;
      }

      // Simply create job match - no scoring needed, employer has already matched
      await storage.createJobMatch({
        userId: jobMatch.userId,
        jobId: job.id,
        matchScore: 100, // Perfect match since employer selected this candidate
        matchReasons: ['Employer has selected you for this position']
      });

      console.log(`✅ Created job match for user ${jobMatch.userId}: ${jobMatch.jobTitle}`);
      
    } catch (error) {
      console.error(`Error processing job match for user ${jobMatch.userId}:`, error);
      throw error;
    }
  }

  async processJobEntry(jobEntry: AirtableJobEntry): Promise<void> {
    try {
      console.log(`Processing job entry for user ${jobEntry.userId}: ${jobEntry.jobTitle}`);
      
      // Extract company name from job title if possible, or use a default
      const company = this.extractCompany(jobEntry.jobTitle!) || 'Company from Airtable';
      
      // Create the job in the database
      const job = await storage.createJobFromAirtable({
        title: jobEntry.jobTitle!,
        company: company,
        description: jobEntry.jobDescription!,
        location: 'Remote', // Default location
        experienceLevel: 'mid', // Default level
        skills: this.extractSkills(jobEntry.jobDescription!),
        jobType: 'remote'
      });

      console.log(`Created job ${job.id}: ${job.title} at ${job.company}`);

      // Check if user already has an application for this job
      const existingApplication = await storage.getApplication(jobEntry.userId, job.id);
      if (existingApplication) {
        console.log(`User ${jobEntry.userId} already has application for job ${job.id}`);
        return;
      }

      // Since job title and description are populated in Airtable, user is pre-approved
      // Create application record with "approved" status
      await storage.createApplication({
        userId: jobEntry.userId,
        jobId: job.id,
        status: 'approved',
        coverLetter: 'Pre-approved through Airtable matching system',
        notes: `Automatically approved for ${job.title} at ${job.company}`
      });

      console.log(`✅ Created approved application for user ${jobEntry.userId} for job: ${job.title}`);
      
    } catch (error) {
      console.error(`Error processing job entry for user ${jobEntry.userId}:`, error);
      throw error;
    }
  }

  private extractCompany(jobTitle: string): string | null {
    // Try to extract company name from job title patterns like "Software Engineer at Google"
    const patterns = [
      /at\s+([^,\n]+)/i,
      /@\s+([^,\n]+)/i,
      /-\s+([^,\n]+)$/i
    ];
    
    for (const pattern of patterns) {
      const match = jobTitle.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private extractSkills(jobDescription: string): string[] {
    // Extract skills from job description using common patterns
    const skillPatterns = [
      /(?:skills?|technologies?|experience with|proficient in|knowledge of)[\s:]+([^.]+)/gi,
      /(?:javascript|python|react|node\.?js|typescript|sql|aws|docker|kubernetes|git|api|html|css)/gi
    ];
    
    const skills = new Set<string>();
    
    for (const pattern of skillPatterns) {
      const matches = Array.from(jobDescription.matchAll(pattern));
      for (const match of matches) {
        if (match[1]) {
          // Split by common delimiters and clean up
          match[1].split(/[,;&|]/).forEach((skill: string) => {
            const cleanSkill = skill.trim().replace(/^(and|or)\s+/i, '');
            if (cleanSkill.length > 2 && cleanSkill.length < 30) {
              skills.add(cleanSkill);
            }
          });
        } else {
          // Direct skill match
          skills.add(match[0]);
        }
      }
    }
    
    return Array.from(skills).slice(0, 10); // Limit to top 10 skills
  }

  private async generateJobMatch(userProfile: any, job: any, aiProfileData: string): Promise<{score: number, reasons: string[]}> {
    try {
      // Parse the AI profile data
      let parsedProfile;
      try {
        parsedProfile = JSON.parse(aiProfileData);
      } catch {
        // If parsing fails, create a basic profile structure
        parsedProfile = { summary: aiProfileData };
      }

      // Use AI to generate match score and reasons
      const prompt = `
        Analyze this job match between a candidate and a job opportunity. Provide a match score (0-100) and 3-5 specific reasons.

        CANDIDATE PROFILE:
        ${JSON.stringify(parsedProfile, null, 2)}
        
        ADDITIONAL PROFILE DATA:
        - Current Role: ${userProfile.currentRole || 'Not specified'}
        - Experience: ${userProfile.yearsOfExperience || 0} years
        - Skills: ${userProfile.skillsList?.join(', ') || 'Not specified'}
        - Summary: ${userProfile.summary || 'Not provided'}

        JOB OPPORTUNITY:
        - Title: ${job.title}
        - Company: ${job.company}
        - Description: ${job.description}
        - Required Skills: ${job.skills?.join(', ') || 'Not specified'}
        - Experience Level: ${job.experienceLevel || 'Not specified'}

        Please respond with JSON in this format:
        {
          "score": 85,
          "reasons": [
            "Strong technical skills match in React and JavaScript",
            "Previous experience in similar industry",
            "Career goals align with company growth opportunities"
          ]
        }
      `;

      // Create a mock response using the prompt directly for job matching
      const mockResponses = [{
        question: prompt,
        answer: JSON.stringify(parsedProfile)
      }];

      const response = await aiProfileAnalysisAgent.generateComprehensiveProfile(
        mockResponses, 
        '', 
        parsedProfile
      );
      
      try {
        const result = JSON.parse(response.summary);
        return {
          score: Math.min(100, Math.max(0, result.score || 75)),
          reasons: result.reasons || ['AI-generated match based on profile analysis']
        };
      } catch {
        // Fallback to basic matching
        return this.calculateBasicMatch(userProfile, job);
      }
      
    } catch (error) {
      console.error('Error generating AI match:', error);
      return this.calculateBasicMatch(userProfile, job);
    }
  }

  private calculateBasicMatch(userProfile: any, job: any): {score: number, reasons: string[]} {
    let score = 60; // Base score
    const reasons: string[] = [];

    // Skills matching
    const userSkills = userProfile.skillsList || [];
    const jobSkills = job.skills || [];
    const matchingSkills = userSkills.filter((skill: string) => 
      jobSkills.some((jobSkill: string) => 
        skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    if (matchingSkills.length > 0) {
      score += Math.min(20, matchingSkills.length * 5);
      reasons.push(`Matching skills: ${matchingSkills.slice(0, 3).join(', ')}`);
    }

    // Experience level matching
    const userExp = userProfile.yearsOfExperience || 0;
    if (job.experienceLevel === 'entry' && userExp <= 2) {
      score += 10;
      reasons.push('Experience level matches entry requirements');
    } else if (job.experienceLevel === 'mid' && userExp >= 2 && userExp <= 7) {
      score += 15;
      reasons.push('Experience level matches mid-level requirements');
    } else if (job.experienceLevel === 'senior' && userExp >= 5) {
      score += 15;
      reasons.push('Experience level matches senior requirements');
    }

    // Add default reason if none found
    if (reasons.length === 0) {
      reasons.push('Profile shows potential for this role');
    }

    reasons.push('Personalized job match from Airtable');

    return { score: Math.min(100, score), reasons };
  }
}

export const airtableService = new AirtableService();