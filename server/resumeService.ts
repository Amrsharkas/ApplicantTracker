import OpenAI from "openai";
import { ObjectStorageService } from "./objectStorage.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ResumeAnalysis {
  skills: string[];
  experience: {
    company: string;
    position: string;
    duration: string;
    responsibilities: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    year?: string;
  }[];
  summary: string;
  strengths: string[];
  areas_for_improvement: string[];
  career_level: string;
  total_experience_years: number;
  
  // Enhanced analysis for interview context
  interview_notes: {
    red_flags: string[];
    impressive_achievements: string[];
    skill_gaps: string[];
    experience_inconsistencies: string[];
    career_progression_notes: string[];
    verification_points: string[];
    potential_interview_topics: string[];
  };
  
  // Raw data for deep analysis
  raw_analysis: {
    education_analysis: string;
    experience_analysis: string;
    skills_assessment: string;
    overall_impression: string;
    credibility_assessment: string;
  };
}

export class ResumeService {
  private objectStorageService: ObjectStorageService;

  constructor() {
    this.objectStorageService = new ObjectStorageService();
  }

  // Extract text from PDF resume
  async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const fileContent = await this.objectStorageService.getFileContent(filePath);
      
      // Dynamic import to avoid module loading issues
      const pdfParse = await import('pdf-parse');
      const pdf = pdfParse.default;
      
      const data = await pdf(fileContent);
      return data.text;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw new Error("Failed to extract text from PDF");
    }
  }

  // Analyze resume content using AI with brutal honesty and comprehensive notes
  async analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
    try {
      const prompt = `You are a brutally honest resume analyst for a hiring platform. Analyze this resume with complete honesty and provide deep insights that will be used during AI interviews. Be fair but critical, giving credit where due while identifying real weaknesses.

RESUME CONTENT:
${resumeText}

Provide a comprehensive analysis in JSON format with the following structure:

{
  "skills": ["actual verified skills based on experience", ...],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title", 
      "duration": "Start Date - End Date",
      "responsibilities": ["actual responsibilities mentioned", ...]
    }
  ],
  "education": [
    {
      "institution": "University/School Name",
      "degree": "Degree Type",
      "field": "Field of Study", 
      "year": "Graduation Year (if available)"
    }
  ],
  "summary": "Honest professional summary highlighting both strengths and gaps",
  "strengths": ["real, demonstrable strengths based on evidence", ...],
  "areas_for_improvement": ["specific gaps and weaknesses identified", ...],
  "career_level": "entry_level|mid_level|senior_level|executive",
  "total_experience_years": number,
  
  "interview_notes": {
    "red_flags": ["concerning patterns, gaps, inconsistencies", ...],
    "impressive_achievements": ["standout accomplishments worth exploring", ...],
    "skill_gaps": ["missing skills for claimed level", ...],
    "experience_inconsistencies": ["timeline gaps, unusual career moves", ...],
    "career_progression_notes": ["pattern analysis, growth trajectory", ...],
    "verification_points": ["claims that need verification during interview", ...],
    "potential_interview_topics": ["areas to probe deeper", ...]
  },
  
  "raw_analysis": {
    "education_analysis": "Detailed assessment of educational background and relevance",
    "experience_analysis": "Critical evaluation of work history and responsibilities",
    "skills_assessment": "Honest evaluation of claimed vs demonstrated skills",
    "overall_impression": "Holistic view of the candidate's profile",
    "credibility_assessment": "Assessment of resume authenticity and claims"
  }
}

ANALYSIS GUIDELINES:
- Be brutally honest but fair
- Flag any inconsistencies or red flags
- Identify impressive achievements that deserve credit
- Note skill gaps relative to claimed experience level
- Assess career progression realistically
- Identify areas that need verification during interviews
- Provide specific, actionable insights for interview preparation

Resume text:
${resumeText}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert HR analyst and resume reviewer. Analyze resumes thoroughly and provide detailed, honest assessments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      return analysis as ResumeAnalysis;
    } catch (error) {
      console.error("Error analyzing resume:", error);
      throw new Error("Failed to analyze resume");
    }
  }

  // Generate interview context based on resume analysis
  async generateInterviewContext(analysis: ResumeAnalysis): Promise<any> {
    const context = {
      candidateBackground: {
        experienceLevel: analysis.career_level,
        totalYears: analysis.total_experience_years,
        keySkills: analysis.skills.slice(0, 10), // Top 10 skills
        recentCompanies: analysis.experience.slice(0, 3).map(exp => exp.company),
        education: analysis.education[0] // Most recent/relevant education
      },
      interviewFocus: {
        technicalAreas: analysis.skills.filter(skill => 
          skill.toLowerCase().includes('programming') ||
          skill.toLowerCase().includes('software') ||
          skill.toLowerCase().includes('development') ||
          skill.toLowerCase().includes('technology')
        ),
        experienceAreas: analysis.experience.map(exp => exp.position),
        improvementAreas: analysis.areas_for_improvement,
        strengths: analysis.strengths
      },
      suggestedQuestions: {
        technical: analysis.skills.slice(0, 5),
        behavioral: analysis.experience.slice(0, 3),
        growth: analysis.areas_for_improvement.slice(0, 3)
      }
    };

    return context;
  }
}