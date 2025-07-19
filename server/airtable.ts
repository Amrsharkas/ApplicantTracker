import Airtable from 'airtable';
import { storage } from './storage';
import { aiProfileAnalysisAgent } from './openai';

// Configure Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
const AIRTABLE_BASE_ID = 'app3tA4UpKQCT2s17'; // platouserprofiles base
const AIRTABLE_JOB_MATCHES_BASE_ID = process.env.AIRTABLE_JOB_MATCHES_BASE_ID; // platojobmatches base
const AIRTABLE_JOB_POSTINGS_BASE_ID = process.env.AIRTABLE_JOB_POSTINGS_BASE_ID; // platojobpostings base
const AIRTABLE_JOB_APPLICATIONS_BASE_ID = 'appEYs1fTytFXoJ7x'; // platojobapplications base
const TABLE_NAME = 'Table 1'; // For user profiles
const JOB_MATCHES_TABLE = 'Table 1'; // For job matches in the dedicated base
const JOB_APPLICATIONS_TABLE = 'Table 1'; // For job applications

if (!AIRTABLE_BASE_ID) {
  console.warn('AIRTABLE_BASE_ID not configured. Airtable integration will be disabled.');
}

if (!AIRTABLE_JOB_MATCHES_BASE_ID) {
  console.warn('AIRTABLE_JOB_MATCHES_BASE_ID not configured. Will fallback to main base for job matches.');
} else {
  console.log('✅ Job matches base configured:', AIRTABLE_JOB_MATCHES_BASE_ID);
}

if (!AIRTABLE_JOB_POSTINGS_BASE_ID) {
  console.warn('⚠️ Job postings base NOT configured - missing AIRTABLE_JOB_POSTINGS_BASE_ID');
} else {
  console.log('✅ Job postings base configured:', AIRTABLE_JOB_POSTINGS_BASE_ID);
}

if (!AIRTABLE_JOB_APPLICATIONS_BASE_ID) {
  console.warn('⚠️ Job applications base NOT configured - missing AIRTABLE_JOB_APPLICATIONS_BASE_ID');
} else {
  console.log('✅ Job applications base configured:', AIRTABLE_JOB_APPLICATIONS_BASE_ID);
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_API_KEY
});

const base = AIRTABLE_BASE_ID ? Airtable.base(AIRTABLE_BASE_ID) : null;
const jobMatchesBase = AIRTABLE_JOB_MATCHES_BASE_ID ? Airtable.base(AIRTABLE_JOB_MATCHES_BASE_ID) : null;
const jobPostingsBase = AIRTABLE_JOB_POSTINGS_BASE_ID ? Airtable.base(AIRTABLE_JOB_POSTINGS_BASE_ID) : null;
const jobApplicationsBase = AIRTABLE_JOB_APPLICATIONS_BASE_ID ? Airtable.base(AIRTABLE_JOB_APPLICATIONS_BASE_ID) : null;

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
  interviewDateTime?: string;
  interviewLink?: string;
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

export interface AirtableJobApplication {
  name: string;
  userId: string;
  email: string;
  jobTitle: string;
  companyName: string;
  applicationDate: string;
  resume: string;
  userProfile: string;
  score: number;
  analysisDetails: string;
}

export class AirtableService {
  private formatProfileForDisplay(profileData: any): string {
    const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
    
    let formatted = '';
    
    // Header with name if available
    formatted += '# 📋 **COMPREHENSIVE CANDIDATE PROFILE**\n\n';
    
    // Summary Overview
    if (profile.comprehensiveProfile?.summaryOverview || profile.summary) {
      formatted += '## 📊 **SUMMARY OVERVIEW**\n';
      formatted += `${profile.comprehensiveProfile?.summaryOverview || profile.summary}\n\n`;
    }
    
    // Verified Skills with Evidence Status
    if (profile.comprehensiveProfile?.verifiedSkills?.length > 0) {
      formatted += '## ✅ **VERIFIED SKILLS**\n';
      formatted += '_Skills assessment based on interview performance_\n\n';
      
      profile.comprehensiveProfile.verifiedSkills.forEach((skill: any) => {
        if (typeof skill === 'string') {
          formatted += `• **${skill}** - Verified\n`;
        } else {
          const statusIcon = skill.status === 'verified' ? '✅' : 
                           skill.status === 'basic-understanding' ? '⚠️' : '❌';
          formatted += `• **${skill.skill}** ${statusIcon} ${skill.status}\n`;
          if (skill.evidence) {
            formatted += `  _${skill.evidence}_\n`;
          }
        }
      });
      formatted += '\n';
    }
    
    // Interview Insights (Categorized)
    if (profile.comprehensiveProfile?.interviewInsights) {
      formatted += '## 💬 **INTERVIEW INSIGHTS**\n';
      formatted += '_Factual assessment based on interview responses_\n\n';
      
      const insights = profile.comprehensiveProfile.interviewInsights;
      if (insights.backgroundExperience) {
        formatted += '### 📋 Background & Experience\n';
        formatted += `${insights.backgroundExperience}\n\n`;
      }
      
      if (insights.workplaceBehavior) {
        formatted += '### 🏢 Workplace Behavior & Preferences\n';
        formatted += `${insights.workplaceBehavior}\n\n`;
      }
      
      if (insights.professionalCommunication) {
        formatted += '### 💼 Professional Communication\n';
        formatted += `${insights.professionalCommunication}\n\n`;
      }
      
      if (insights.technicalKnowledge) {
        formatted += '### 🔧 Technical Knowledge\n';
        formatted += `${insights.technicalKnowledge}\n\n`;
      }
    }
    
    // Strengths (Only if Proven)
    if (profile.comprehensiveProfile?.strengths?.length > 0) {
      formatted += '## 💪 **STRENGTHS (PROVEN)**\n';
      formatted += '_Strengths clearly demonstrated through interview responses_\n\n';
      profile.comprehensiveProfile.strengths.forEach((strength: string) => {
        formatted += `• ${strength}\n`;
      });
      formatted += '\n';
    }
    
    // Weaknesses or Gaps (Critical Information)
    if (profile.comprehensiveProfile?.weaknessesOrGaps?.length > 0) {
      formatted += '## ⚠️ **WEAKNESSES OR GAPS**\n';
      formatted += '_Areas where profile claims weren\'t backed up by interview performance_\n\n';
      profile.comprehensiveProfile.weaknessesOrGaps.forEach((weakness: string) => {
        formatted += `• ${weakness}\n`;
      });
      formatted += '\n';
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
    
    // Work Preferences
    if (profile.comprehensiveProfile?.workPreferences) {
      formatted += '## 🏢 **WORK PREFERENCES**\n';
      formatted += '_Stated preferences from profile and interviews_\n\n';
      const prefs = profile.comprehensiveProfile.workPreferences;
      formatted += `**Work Mode:** ${prefs.workMode}\n`;
      formatted += `**Team Style:** ${prefs.teamStyle}\n`;
      formatted += `**Relocation:** ${prefs.relocation}\n`;
      formatted += `**Career Goals:** ${prefs.careerGoals}\n\n`;
    }
    
    // Legacy Skills (fallback)
    if (profile.skills && profile.skills.length > 0 && !profile.comprehensiveProfile?.verifiedSkills?.length) {
      formatted += '## 🛠️ **REPORTED SKILLS**\n';
      formatted += '_Self-reported skills (not yet verified through interviews)_\n\n';
      const skillsPerRow = 3;
      for (let i = 0; i < profile.skills.length; i += skillsPerRow) {
        const skillsRow = profile.skills.slice(i, i + skillsPerRow);
        formatted += skillsRow.map((skill: string) => `• **${skill}**`).join(' | ') + '\n';
      }
      formatted += '\n';
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

  async getEmployerJobId(jobRecordId: string): Promise<string> {
    if (!AIRTABLE_JOB_POSTINGS_BASE_ID) {
      console.warn('Job postings Airtable base not configured, cannot lookup Job ID');
      throw new Error('Job posting system not configured. Please contact support.');
    }

    try {
      console.log(`🔍 Looking up employer Job ID for record: ${jobRecordId}`);
      console.log(`🔍 Using base ID: ${AIRTABLE_JOB_POSTINGS_BASE_ID}`);
      
      // Try different possible table names for job postings
      const possibleTableNames = ['platojobpostings', 'Job Postings', 'Table 1', 'tblDncwzlJBapB2V8'];
      let jobPost;
      let lastError;

      for (const tableName of possibleTableNames) {
        const url = `https://api.airtable.com/v0/${AIRTABLE_JOB_POSTINGS_BASE_ID}/${tableName}/${jobRecordId}`;
        console.log(`🔍 Trying table name: ${tableName} at ${url}`);
        
        try {
          const response = await fetch(url, {
            headers: {
              'Authorization': 'Bearer pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0',
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            jobPost = await response.json();
            console.log(`✅ Success with table name: ${tableName}`);
            console.log("Fetched job post:", JSON.stringify(jobPost, null, 2));
            break;
          } else {
            const errorText = await response.text();
            console.log(`❌ Failed with ${tableName}: ${response.status} - ${errorText}`);
            lastError = errorText;
          }
        } catch (error) {
          console.log(`❌ Exception with ${tableName}:`, error);
          lastError = error;
        }
      }

      if (!jobPost) {
        console.error('❌ Failed to fetch job posting from all table attempts. Last error:', lastError);
        throw new Error('Something went wrong fetching job details. Please try again or contact support.');
      }

      const employerJobId = jobPost.fields?.["Job ID"];
      console.log("Extracted employerJobId:", employerJobId);
      
      if (!employerJobId) {
        console.error('❌ Missing Job ID field in job posting:', jobPost.fields);
        throw new Error('Missing Job ID in fetched job posting');
      }

      console.log(`✅ Found employer Job ID: ${employerJobId}`);
      return employerJobId;
    } catch (error) {
      console.error('❌ Error looking up employer Job ID:', error);
      throw error; // Re-throw to surface to user
    }
  }

  async checkExistingApplication(employerJobId: string, userId: string): Promise<boolean> {
    if (!AIRTABLE_JOB_APPLICATIONS_BASE_ID) {
      console.warn('Job applications Airtable base not configured, cannot check for duplicates');
      return false;
    }

    try {
      const filterFormula = `AND({Job ID} = "${employerJobId}", {Applicant User ID} = "${userId}")`;
      const url = `https://api.airtable.com/v0/${AIRTABLE_JOB_APPLICATIONS_BASE_ID}/Table 1?filterByFormula=${encodeURIComponent(filterFormula)}`;
      
      console.log(`🔍 Checking for existing application: Employer Job ID ${employerJobId}, User ID ${userId}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Bearer pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ Error checking for existing application:', response.status, await response.text());
        return false;
      }

      const data = await response.json();
      const existingApplications = data.records || [];
      
      if (existingApplications.length > 0) {
        console.log(`⚠️ Found ${existingApplications.length} existing application(s) for this job`);
        return true;
      } else {
        console.log('✅ No existing application found, proceeding with submission');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking for existing application:', error);
      return false; // Allow submission if check fails
    }
  }

  async submitJobApplication(applicationData: {
    jobTitle: string;
    jobId: string;
    jobDescription: string;
    companyName: string;
    applicantName: string;
    applicantId: string;
    aiProfile: any;
    notes: string;
  }): Promise<void> {
    if (!jobApplicationsBase) {
      console.warn('Job applications Airtable base not configured, skipping application submission');
      return;
    }

    // Lookup the employer-defined Job ID from the job posting
    const employerJobId = await this.getEmployerJobId(applicationData.jobId);

    // Check for existing application using employer Job ID
    const isDuplicate = await this.checkExistingApplication(employerJobId, applicationData.applicantId);
    if (isDuplicate) {
      throw new Error('You have already applied to this job position.');
    }

    try {
      // Fetch the complete user profile from the "platouserprofiles" table
      console.log(`📋 Fetching complete user profile for user ID: ${applicationData.applicantId}`);
      const existingUserProfile = await this.getUserProfileFromInterview(applicationData.applicantId);
      
      let userProfileForApplication: string;
      if (existingUserProfile) {
        // Use the complete existing profile from interview
        userProfileForApplication = existingUserProfile;
        console.log('✅ Using complete existing user profile from interview');
      } else {
        // Fallback to current profile data if no interview profile exists
        console.log('⚠️ No interview profile found, using current profile data');
        userProfileForApplication = JSON.stringify(applicationData.aiProfile || {});
      }

      // Create notes string from missing skills
      const missingSkills = applicationData.notes?.split('\n').filter(line => line.includes('Missing:')).map(line => line.replace('• Missing: ', '')) || [];
      const notesString = missingSkills.length > 0
        ? missingSkills.map(skill => `• Missing: ${skill}`).join('\n')
        : "No missing skills";

      // Use exact field names matching Airtable base with employer Job ID
      const payload = {
        fields: {
          "Job title": applicationData.jobTitle,
          "Job ID": employerJobId, // Use employer-defined Job ID instead of record ID
          "Job description": applicationData.jobDescription || `${applicationData.jobTitle} position at ${applicationData.companyName}`,
          "Company": applicationData.companyName,
          "Applicant Name": applicationData.applicantName,
          "Applicant User ID": applicationData.applicantId,
          "User profile": userProfileForApplication,
          "Notes": notesString
        }
      };

      console.log("Airtable Payload:\n", JSON.stringify(payload, null, 2));
      console.log('📋 Field names being sent:', Object.keys(payload.fields));

      // Try different possible table names since the error suggests model not found
      const possibleTableNames = ['platojobapplications', 'Applications', 'Job Applications', 'Table 1', 'tblApplications'];
      let response;
      let lastError;

      for (const tableName of possibleTableNames) {
        const url = `https://api.airtable.com/v0/appEYs1fTytFXoJ7x/${tableName}`;
        console.log(`🔍 Trying table name: ${tableName} at ${url}`);
        
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            console.log(`✅ Success with table name: ${tableName}`);
            break;
          } else {
            const errorText = await response.text();
            console.log(`❌ Failed with ${tableName}: ${response.status} - ${errorText}`);
            lastError = errorText;
          }
        } catch (fetchError) {
          console.log(`❌ Network error with ${tableName}:`, fetchError);
          lastError = fetchError;
        }
      }

      if (!response || !response.ok) {
        console.error('❌ All table names failed. Last error:', lastError);
        throw new Error(`Airtable API error: All table names failed - ${lastError}`);
      }

      const result = await response.json();
      console.log('✅ Successfully submitted application to Airtable:', result.id);
    } catch (error) {
      console.error('Error submitting job application to Airtable:', error);
      throw new Error('Failed to submit job application to Airtable');
    }
  }

  async getUserProfileFromInterview(userId: string): Promise<string | null> {
    if (!base) {
      console.warn('Airtable user profiles base not configured, cannot fetch profile');
      return null;
    }

    try {
      console.log(`📋 Fetching existing user profile for user ID: ${userId}`);
      
      const records = await base(TABLE_NAME).select({
        filterByFormula: `{User ID} = '${userId}'`,
        maxRecords: 1
      }).firstPage();

      if (records.length > 0) {
        const userProfile = records[0].get('User profile') as string;
        console.log(`✅ Found existing user profile for user ${userId}`);
        return userProfile;
      } else {
        console.log(`⚠️ No existing user profile found for user ${userId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching user profile from Airtable:', error);
      return null;
    }
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

  async getUserApplications(userId: string): Promise<any[]> {
    if (!jobApplicationsBase) {
      console.warn('Job applications base not configured, returning empty array');
      return [];
    }

    try {
      console.log(`📋 Fetching applications for user ID: ${userId}`);
      
      const records = await jobApplicationsBase(JOB_APPLICATIONS_TABLE).select({
        filterByFormula: `{Applicant User ID} = '${userId}'`,
        maxRecords: 100
      }).firstPage();

      const applications = records.map(record => ({
        recordId: record.id,
        jobTitle: record.get('Job title') as string,
        jobId: record.get('Job ID') as string,
        jobDescription: record.get('Job description') as string,
        companyName: record.get('Company') as string,
        applicantName: record.get('Applicant Name') as string,
        applicantUserId: record.get('Applicant User ID') as string,
        userProfile: record.get('User profile') as string,
        notes: record.get('Notes') as string,
        createdTime: record.get('Created Time') || new Date().toISOString()
      }));

      console.log(`✅ Found ${applications.length} applications for user ${userId}`);
      return applications;
    } catch (error) {
      console.error('❌ Error fetching user applications from Airtable:', error);
      return [];
    }
  }

  async checkJobStatus(jobId: string, jobTitle: string): Promise<'exists' | 'removed'> {
    if (!jobPostingsBase) {
      console.warn('Job postings base not configured');
      return 'exists'; // Default to exists if we can't check
    }

    try {
      const records = await jobPostingsBase('Table 1').select({
        filterByFormula: `OR({Job ID} = '${jobId}', {Job title} = '${jobTitle}')`,
        maxRecords: 1
      }).firstPage();

      return records.length > 0 ? 'exists' : 'removed';
    } catch (error) {
      console.error('Error checking job status:', error);
      return 'exists'; // Default to exists if there's an error
    }
  }

  async checkUserAccepted(userId: string, jobTitle: string): Promise<boolean> {
    if (!jobMatchesBase) {
      console.warn('Job matches base not configured');
      return false;
    }

    try {
      const records = await jobMatchesBase(JOB_MATCHES_TABLE).select({
        filterByFormula: `AND({User ID} = '${userId}', {Job title} = '${jobTitle}')`,
        maxRecords: 1
      }).firstPage();

      return records.length > 0;
    } catch (error) {
      console.error('Error checking user acceptance:', error);
      return false;
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

  // Method to clear all tracking for testing
  clearProcessedTracking(): void {
    this.processedRecords.clear();
    this.processedJobMatches.clear();
    console.log('🔄 Cleared all processed record tracking');
  }

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
      console.log('🔧 Job match data before processing:', {
        jobTitle: jobMatch.jobTitle,
        companyName: jobMatch.companyName,
        description: jobMatch.jobDescription?.substring(0, 50) + '...'
      });
      
      // Use company name from Airtable field
      const company = jobMatch.companyName || 'Company from Airtable';
      
      // Create the job in the database
      const jobData = {
        title: jobMatch.jobTitle!,
        company: company,
        description: jobMatch.jobDescription!,
        location: 'Remote',
        experienceLevel: 'Mid-level',
        skills: this.extractSkills(jobMatch.jobDescription!),
        employmentType: 'Full-time'
      };
      
      console.log('🔧 Sending to createJobFromAirtable:', jobData);
      const job = await storage.createJobFromAirtable(jobData);

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
      const records = await jobPostingsBase('Table 1').select({
        maxRecords: 100,
        sort: [{field: 'Date Posted', direction: 'desc'}]
      }).firstPage();

      const jobPostings: AirtableJobPosting[] = [];

      records.forEach((record) => {
        const fields = record.fields as any;
        
        // Find field names dynamically to handle different naming conventions
        const fieldKeys = Object.keys(fields);
        const titleField = fieldKeys.find(key => 
          key.toLowerCase().includes('title') || 
          key.toLowerCase().includes('job')
        );
        const descField = fieldKeys.find(key => 
          key.toLowerCase().includes('description')
        );
        
        const jobTitle = titleField ? fields[titleField] : 'Untitled Position';
        const jobDescription = descField ? fields[descField] : 'No description available';
        
        const jobPosting: AirtableJobPosting = {
          recordId: record.id,
          jobTitle: jobTitle,
          jobDescription: jobDescription,
          companyName: fields['Company Name'] || fields['Company'] || 'Unknown Company',
          location: fields['Location'] || 'Remote',
          salaryRange: fields['Salary Range'] || fields['Salary'] || undefined,
          employmentType: fields['Employment Type'] || fields['Job type'] || fields['Job Type'] || 'Full-time',
          experienceLevel: fields['Experience Level'] || 'Mid Level',
          skills: fields['Skills'] ? (Array.isArray(fields['Skills']) ? fields['Skills'] : fields['Skills'].split(',').map((s: string) => s.trim())) : [],
          postedDate: fields['Posted Date'] || fields['Date Posted'] || fields['Date'] || new Date().toISOString()
        };

        jobPostings.push(jobPosting);
      });

      console.log(`📋 Found ${jobPostings.length} job postings in platojobpostings table`);
      return jobPostings;
    } catch (error) {
      console.error('Error fetching job postings from Airtable:', error);
      return [];
    }
  }

  // Store job application in Airtable
  async storeJobApplication(applicationData: AirtableJobApplication): Promise<void> {
    if (!jobApplicationsBase) {
      console.warn('Job applications base not configured, skipping storage');
      return;
    }

    try {
      // Try multiple field name variations to match existing table structure
      const fields = {
        'jobTitle': applicationData.jobTitle,
        'userId': applicationData.userId,
        'email': applicationData.email,
        'companyName': applicationData.companyName,
        'applicantName': applicationData.name,
        'applicantId': applicationData.userId,
        'aiProfile': applicationData.userProfile,
        'score': applicationData.score,
        'analysisDetails': applicationData.analysisDetails,
        'applicationDate': applicationData.applicationDate
      };

      console.log('📤 Storing job application with fields:', Object.keys(fields));
      await jobApplicationsBase(JOB_APPLICATIONS_TABLE).create([{ fields }]);
      console.log(`✅ Successfully stored job application for ${applicationData.name} to ${applicationData.jobTitle} at ${applicationData.companyName}`);
    } catch (error) {
      console.error('Error storing job application in Airtable:', error);
      throw new Error('Failed to store job application in Airtable');
    }
  }

  async getUpcomingInterviews(userId: string): Promise<AirtableJobMatch[]> {
    if (!jobMatchesBase) {
      console.warn('🔍 Job matches base not configured, returning empty interviews');
      return [];
    }

    try {
      console.log(`📋 Fetching upcoming interviews for user ID: ${userId}`);
      console.log(`📋 Checking dedicated job matches base with ID: ${AIRTABLE_JOB_MATCHES_BASE_ID}`);
      console.log(`📋 Looking for table: ${JOB_MATCHES_TABLE}`);

      const records = await jobMatchesBase(JOB_MATCHES_TABLE).select({
        filterByFormula: `AND({User ID} = '${userId}', {Interview date&time} != '')`,
        sort: [{ field: 'Interview date&time', direction: 'asc' }]
      }).all();

      console.log(`📋 Found ${records.length} interview records for user ${userId}`);

      const interviews: AirtableJobMatch[] = records.map(record => {
        const fields = record.fields as any;
        return {
          recordId: record.id,
          name: fields['Name'] || 'Unknown',
          userId: fields['User ID'] || '',
          jobTitle: fields['Job title'] || 'Unknown Position',
          jobDescription: fields['Job description'] || '',
          companyName: fields['Company name'] || 'Unknown Company',
          interviewDateTime: fields['Interview date&time'] || '',
          interviewLink: fields['Interview Link'] || ''
        };
      });

      console.log(`📋 Returning ${interviews.length} processed interviews for user ${userId}`);
      return interviews;
    } catch (error) {
      console.error('Error fetching upcoming interviews:', error);
      return [];
    }
  }
}

export const airtableService = new AirtableService();