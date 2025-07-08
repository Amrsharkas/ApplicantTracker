import Airtable from 'airtable';
import { storage } from './storage';
import { aiProfileAnalysisAgent } from './openai';

// Configure Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
const AIRTABLE_BASE_ID = 'app3tA4UpKQCT2s17'; // platouserprofiles base
const AIRTABLE_JOB_MATCHES_BASE_ID = process.env.AIRTABLE_JOB_MATCHES_BASE_ID; // platojobmatches base
const AIRTABLE_JOB_POSTINGS_BASE_ID = 'appCjIvd73lvp0oLf'; // platojobpostings base
const TABLE_NAME = 'Table 1'; // For user profiles
const JOB_MATCHES_TABLE = 'Table 1'; // For job matches in the dedicated base

if (!AIRTABLE_BASE_ID) {
  console.warn('AIRTABLE_BASE_ID not configured. Airtable integration will be disabled.');
}

if (!AIRTABLE_JOB_MATCHES_BASE_ID) {
  console.warn('AIRTABLE_JOB_MATCHES_BASE_ID not configured. Will fallback to main base for job matches.');
} else {
  console.log('✅ Job matches base configured:', AIRTABLE_JOB_MATCHES_BASE_ID);
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_API_KEY
});

const base = AIRTABLE_BASE_ID ? Airtable.base(AIRTABLE_BASE_ID) : null;
const jobMatchesBase = AIRTABLE_JOB_MATCHES_BASE_ID ? Airtable.base(AIRTABLE_JOB_MATCHES_BASE_ID) : null;
const jobPostingsBase = AIRTABLE_JOB_POSTINGS_BASE_ID ? Airtable.base(AIRTABLE_JOB_POSTINGS_BASE_ID) : null;

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
  companyName: string;
}

export interface AirtableJobPosting {
  recordId: string;
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  location?: string;
  salaryRange?: string;
  employmentType?: string;
  experienceLevel?: string;
  skills?: string[];
  postedDate?: string;
}

export class AirtableService {
  private formatProfileForDisplay(profileData: any): string {
    const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
    
    let formatted = '';
    
    // Header with name if available
    formatted += '# 📋 **PROFESSIONAL PROFILE**\n\n';
    
    // Summary Section
    if (profile.summary) {
      formatted += '## 🎯 **EXECUTIVE SUMMARY**\n';
      formatted += `${profile.summary}\n\n`;
    }
    
    // Experience Section
    if (profile.experience && profile.experience.length > 0) {
      formatted += '## 💼 **PROFESSIONAL EXPERIENCE**\n';
      profile.experience.forEach((exp: any, index: number) => {
        formatted += `### ${exp.role}\n`;
        formatted += `**Company:** ${exp.company}\n`;
        formatted += `**Duration:** ${exp.duration}\n`;
        formatted += `**Description:** ${exp.description}\n\n`;
      });
    }
    
    // Skills Section
    if (profile.skills && profile.skills.length > 0) {
      formatted += '## 🛠️ **CORE SKILLS & COMPETENCIES**\n';
      const skillsPerRow = 3;
      for (let i = 0; i < profile.skills.length; i += skillsPerRow) {
        const skillsRow = profile.skills.slice(i, i + skillsPerRow);
        formatted += skillsRow.map((skill: string) => `• **${skill}**`).join(' | ') + '\n';
      }
      formatted += '\n';
    }
    
    // Strengths Section
    if (profile.strengths && profile.strengths.length > 0) {
      formatted += '## 💪 **KEY STRENGTHS**\n';
      profile.strengths.forEach((strength: string) => {
        formatted += `✓ **${strength}**\n`;
      });
      formatted += '\n';
    }
    
    // Work Style Section
    if (profile.workStyle) {
      formatted += '## 🎨 **WORK STYLE & APPROACH**\n';
      formatted += `${profile.workStyle}\n\n`;
    }
    
    // Career Goals Section
    if (profile.careerGoals) {
      formatted += '## 🚀 **CAREER ASPIRATIONS**\n';
      formatted += `${profile.careerGoals}\n\n`;
    }
    
    // Personality Section
    if (profile.personality) {
      formatted += '## 🧠 **PERSONALITY & BEHAVIORAL INSIGHTS**\n';
      formatted += `${profile.personality}\n\n`;
    }
    
    // Footer
    formatted += '---\n';
    formatted += '*Profile generated through AI-powered interview analysis*';
    
    return formatted;
  }

  async storeUserProfile(name: string, profileData: any, userId: string, email?: string): Promise<void> {
    if (!base) {
      console.warn('Airtable not configured, skipping profile storage');
      return;
    }

    try {
      const profileString = this.formatProfileForDisplay(profileData);
      
      // Prepare the fields object
      const fields: any = {
        'Name': name,
        'User profile': profileString,
        'User ID': userId
      };

      // Add email if provided
      if (email) {
        fields['email'] = email;
      }

      // Try to store with all fields
      try {
        await base!(TABLE_NAME).create([{ fields }]);
        console.log(`Successfully stored profile for ${name} (ID: ${userId}, Email: ${email || 'N/A'}) in Airtable`);
      } catch (userIdError) {
        // If some fields don't exist, try with minimal fields
        console.warn('Some fields not found, trying with minimal fields:', userIdError.message);
        await base!(TABLE_NAME).create([
          {
            fields: {
              'Name': name,
              'User profile': profileString
            }
          }
        ]);
        console.log(`Successfully stored profile for ${name} in Airtable (minimal fields)`);
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
    // Try the dedicated job matches base first
    if (jobMatchesBase) {
      try {
        console.log('📋 Checking dedicated job matches base with ID:', AIRTABLE_JOB_MATCHES_BASE_ID);
        console.log('📋 Looking for table:', JOB_MATCHES_TABLE);
        
        // Try to access the table and get records
        const records = await jobMatchesBase(JOB_MATCHES_TABLE).select({
          maxRecords: 100
        }).all();

        console.log(`📋 Found ${records.length} records in dedicated job matches base`);
        console.log('📋 Raw record fields:', records.map(r => Object.keys(r.fields)));
        const filteredRecords = records
          .filter((record: any) => {
            console.log('📋 All fields in record:', Object.keys(record.fields));
            console.log('📋 Field values:', record.fields);
            
            // Try multiple possible field name variations
            const jobTitle = record.fields['Job title'] || record.fields['Job Title'] || record.fields['JobTitle'] || record.fields['Job_title'];
            const jobDescription = record.fields['Job Description'] || record.fields['Job description'] || record.fields['JobDescription'] || record.fields['Job_Description'];
            const userId = record.fields['User ID'] || record.fields['UserID'] || record.fields['User_ID'] || record.fields['user_id'];
            const companyName = record.fields['Company name'] || record.fields['Company Name'] || record.fields['Company_Name'] || record.fields['companyname'];
            
            console.log('📋 Field match results:', { 
              jobTitle: !!jobTitle, 
              jobDescription: !!jobDescription, 
              userId: !!userId,
              companyName: !!companyName,
              actualJobTitle: jobTitle,
              actualJobDescription: jobDescription?.substring(0, 50) + '...',
              actualUserId: userId,
              actualCompanyName: companyName
            });
            
            return jobTitle && jobDescription && userId;
          })
          .map((record: any) => {
            const jobTitle = record.fields['Job title'] || record.fields['Job Title'] || record.fields['JobTitle'] || record.fields['Job_title'];
            const jobDescription = record.fields['Job Description'] || record.fields['Job description'] || record.fields['JobDescription'] || record.fields['Job_Description'];
            const userId = record.fields['User ID'] || record.fields['UserID'] || record.fields['User_ID'] || record.fields['user_id'];
            const companyName = record.fields['Company name'] || record.fields['Company Name'] || record.fields['Company_Name'] || record.fields['companyname'];
            
            return {
              recordId: record.id,
              name: record.fields['Name'] || 'Unknown',
              userId: userId,
              jobTitle: jobTitle,
              jobDescription: jobDescription,
              companyName: companyName || 'Company from Airtable' // fallback if no company name provided
            };
          });

        console.log(`📋 Found ${filteredRecords.length} valid job match records`);
        if (filteredRecords.length > 0) {
          console.log('Job matches:', filteredRecords.map(m => ({ userId: m.userId, jobTitle: m.jobTitle })));
        }
        return filteredRecords;
      } catch (error) {
        console.error('❌ Error accessing dedicated job matches base:', error);
        console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
        console.log('📋 Falling back to main base for job matches...');
      }
    }

    // Fallback to main base if dedicated base not available
    if (!base) {
      console.warn('No Airtable bases configured, returning empty array');
      return [];
    }

    try {
      console.log('📋 Checking main table for job match entries...');
      const records = await base(TABLE_NAME).select({
        maxRecords: 100,
        view: 'Grid view'
      }).all();

      console.log(`📋 Found ${records.length} total records in main table`);
      
      const jobMatchRecords = records
        .filter((record: any) => {
          const hasJobData = record.fields['Job title'] && record.fields['Job description'] && record.fields['User ID'];
          return hasJobData;
        })
        .map((record: any) => ({
          recordId: record.id,
          name: record.fields['Name'] || 'Unknown',
          userId: record.fields['User ID'],
          jobTitle: record.fields['Job title'],
          jobDescription: record.fields['Job description'],
          companyName: record.fields['Company name'] || 'Company from Airtable'
        }));

      console.log(`📋 Found ${jobMatchRecords.length} potential job match records in main table`);
      return jobMatchRecords;
    } catch (error) {
      console.error('Error fetching job matches from main table:', error);
      return [];
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
      
      // Use company name from Airtable field
      const company = jobMatch.companyName || 'Company from Airtable';
      
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

  async getAllJobPostings(): Promise<AirtableJobPosting[]> {
    if (!jobPostingsBase) {
      console.warn('Job postings base not configured');
      return [];
    }

    try {
      console.log('📋 Fetching job postings from base:', process.env.AIRTABLE_JOB_POSTINGS_BASE_ID);
      
      const records = await jobPostingsBase('Table 1').select({
        maxRecords: 100,
        sort: [{field: 'Posted Date', direction: 'desc'}]
      }).firstPage();

      console.log(`📋 Found ${records.length} raw records in job postings table`);
      
      const jobPostings: AirtableJobPosting[] = [];

      records.forEach(record => {
        const fields = record.fields as any;
        console.log('📋 Processing record fields:', Object.keys(fields));
        console.log('📋 Record data:', fields);
        
        // Extract job posting data from the record
        const jobPosting: AirtableJobPosting = {
          recordId: record.id,
          jobTitle: fields['Job Title'] || fields['Title'] || 'Untitled Position',
          jobDescription: fields['Job Description'] || fields['Description'] || 'No description available',
          companyName: fields['Company Name'] || fields['Company'] || 'Unknown Company',
          location: fields['Location'] || 'Remote',
          salaryRange: fields['Salary Range'] || fields['Salary'] || undefined,
          employmentType: fields['Employment Type'] || fields['Job Type'] || 'Full-time',
          experienceLevel: fields['Experience Level'] || 'Mid Level',
          skills: fields['Skills'] ? (Array.isArray(fields['Skills']) ? fields['Skills'] : fields['Skills'].split(',').map((s: string) => s.trim())) : [],
          postedDate: fields['Posted Date'] || fields['Date'] || new Date().toISOString()
        };

        console.log('📋 Created job posting:', jobPosting);
        jobPostings.push(jobPosting);
      });

      console.log(`📋 Found ${jobPostings.length} job postings in platojobpostings table`);
      return jobPostings;
    } catch (error) {
      console.error('Error fetching job postings from Airtable:', error);
      return [];
    }
  }
}

export const airtableService = new AirtableService();