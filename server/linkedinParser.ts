import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LinkedInProfileData {
  // Basic Information
  name?: string;
  headline?: string;
  location?: string;
  summary?: string;
  profileImageUrl?: string;
  
  // Experience
  experience?: Array<{
    title: string;
    company: string;
    location?: string;
    duration?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  
  // Education
  education?: Array<{
    institution: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: string;
    endYear?: string;
    description?: string;
  }>;
  
  // Skills
  skills?: string[];
  
  // Languages (if available)
  languages?: string[];
  
  // Contact info
  email?: string;
  phone?: string;
  website?: string;
  
  // Additional sections
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate?: string;
    expirationDate?: string;
    credentialId?: string;
  }>;
  
  achievements?: string[];
}

export class LinkedInParsingError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'LinkedInParsingError';
  }
}

export class LinkedInParser {
  private static readonly USER_AGENT = 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Parse LinkedIn profile from URL using web scraping
   * Note: This method may be blocked by LinkedIn's anti-scraping measures
   */
  static async parseFromUrl(linkedinUrl: string): Promise<LinkedInProfileData> {
    try {
      // Validate LinkedIn URL
      if (!this.isValidLinkedInUrl(linkedinUrl)) {
        throw new LinkedInParsingError('Invalid LinkedIn URL format', 400);
      }

      // Attempt to scrape the LinkedIn profile
      const html = await this.fetchLinkedInPage(linkedinUrl);
      const profileData = await this.extractProfileData(html);
      
      return profileData;
    } catch (error) {
      if (error instanceof LinkedInParsingError) {
        throw error;
      }
      
      console.error('LinkedIn parsing error:', error);
      throw new LinkedInParsingError(
        'Failed to parse LinkedIn profile. LinkedIn may be blocking automated access.',
        500
      );
    }
  }

  /**
   * Parse LinkedIn profile using AI analysis of provided text/content
   * This is a more reliable alternative when direct scraping fails
   */
  static async parseFromText(profileText: string): Promise<LinkedInProfileData> {
    try {
      const prompt = `
        Parse the following LinkedIn profile information and extract structured data. 
        Return a JSON object with the following structure, only include fields that have actual data:

        {
          "name": "Full name",
          "headline": "Professional headline",
          "location": "Location",
          "summary": "Professional summary",
          "experience": [
            {
              "title": "Job title",
              "company": "Company name",
              "location": "Work location",
              "duration": "Time period",
              "startDate": "Start date (MM/YYYY format)",
              "endDate": "End date (MM/YYYY format or 'Present')",
              "current": true/false,
              "description": "Job description"
            }
          ],
          "education": [
            {
              "institution": "School name",
              "degree": "Degree type",
              "fieldOfStudy": "Field of study",
              "startYear": "Start year",
              "endYear": "End year",
              "description": "Additional details"
            }
          ],
          "skills": ["skill1", "skill2", ...],
          "languages": ["language1", "language2", ...],
          "certifications": [
            {
              "name": "Certification name",
              "issuer": "Issuing organization",
              "issueDate": "Issue date",
              "expirationDate": "Expiration date",
              "credentialId": "Credential ID"
            }
          ],
          "achievements": ["achievement1", "achievement2", ...]
        }

        LinkedIn Profile Text:
        ${profileText}
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: 'system',
            content: 'You are an expert at parsing LinkedIn profiles. Extract structured data accurately and return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const parsedData = JSON.parse(response.choices[0].message.content || '{}');
      return parsedData as LinkedInProfileData;
    } catch (error) {
      console.error('AI parsing error:', error);
      throw new LinkedInParsingError('Failed to parse LinkedIn profile using AI analysis', 500);
    }
  }

  /**
   * Convert LinkedIn data to our profile format
   */
  static mapToProfileFormat(linkedinData: LinkedInProfileData) {
    // Extract location components
    const locationParts = linkedinData.location?.split(',').map(s => s.trim()) || [];
    const city = locationParts[0] || '';
    const country = locationParts[locationParts.length - 1] || '';

    // Process work experiences
    const workExperiences = linkedinData.experience?.map(exp => ({
      jobTitle: exp.title,
      company: exp.company,
      location: exp.location || '',
      startDate: exp.startDate || '',
      endDate: exp.current ? '' : (exp.endDate || ''),
      current: exp.current || false,
      description: exp.description || '',
      responsibilities: exp.description ? [exp.description] : [],
    })) || [];

    // Process education
    const degrees = linkedinData.education?.map(edu => ({
      institution: edu.institution,
      degree: edu.degree || '',
      fieldOfStudy: edu.fieldOfStudy || '',
      graduationYear: edu.endYear || '',
      startYear: edu.startYear || '',
      gpa: '',
      achievements: edu.description ? [edu.description] : [],
    })) || [];

    // Process certifications
    const certifications = linkedinData.certifications?.map(cert => ({
      name: cert.name,
      issuer: cert.issuer,
      issueDate: cert.issueDate || '',
      expirationDate: cert.expirationDate || '',
      credentialId: cert.credentialId || '',
      description: '',
    })) || [];

    // Calculate total years of experience
    let totalYearsOfExperience = 0;
    if (workExperiences.length > 0) {
      // Simple calculation - can be enhanced
      totalYearsOfExperience = Math.min(workExperiences.length * 2, 20); // Rough estimate
    }

    // Determine career level based on experience
    let careerLevel = 'entry_level';
    if (totalYearsOfExperience >= 10) {
      careerLevel = 'senior_management';
    } else if (totalYearsOfExperience >= 7) {
      careerLevel = 'manager';
    } else if (totalYearsOfExperience >= 3) {
      careerLevel = 'experienced';
    }

    return {
      // Basic Information
      name: linkedinData.name || '',
      city: city,
      country: country,
      
      // Career Information
      currentRole: linkedinData.headline || '',
      summary: linkedinData.summary || '',
      totalYearsOfExperience: totalYearsOfExperience,
      careerLevel: careerLevel,
      
      // Professional Data
      workExperiences: workExperiences,
      degrees: degrees,
      certifications: certifications,
      skillsList: linkedinData.skills || [],
      
      // Online Presence
      linkedinUrl: '', // This will be set by the caller
      
      // Languages (simple format)
      languages: linkedinData.languages?.map(lang => ({
        language: lang,
        proficiency: 'professional', // Default proficiency
      })) || [],
      
      // Achievements
      achievements: linkedinData.achievements?.join('\n') || '',
      
      // Set completion percentage higher since we have substantial data
      completionPercentage: 75,
    };
  }

  private static isValidLinkedInUrl(url: string): boolean {
    const linkedinUrlPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-_]+\/?$/;
    return linkedinUrlPattern.test(url);
  }

  private static async fetchLinkedInPage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 429) {
          throw new LinkedInParsingError(
            'LinkedIn is blocking automated access. Please try copying and pasting your profile content instead.',
            403
          );
        }
      }
      
      throw new LinkedInParsingError('Failed to fetch LinkedIn profile page', 500);
    }
  }

  private static async extractProfileData(html: string): Promise<LinkedInProfileData> {
    const $ = cheerio.load(html);
    
    // LinkedIn heavily relies on JavaScript, so basic scraping might not work
    // This is a basic implementation - in practice, LinkedIn blocks most scraping attempts
    
    const profileData: LinkedInProfileData = {};
    
    // Try to extract basic information (this may not work due to LinkedIn's structure)
    profileData.name = $('h1').first().text().trim();
    profileData.headline = $('div.text-body-medium').first().text().trim();
    
    // Since LinkedIn's actual structure is complex and protected, 
    // we'll return what we can extract and recommend the AI parsing approach
    
    return profileData;
  }
}