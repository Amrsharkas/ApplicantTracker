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

  // Analyze resume content using AI
  async analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
    try {
      const prompt = `Analyze this resume and extract key information. Provide a comprehensive analysis in JSON format with the following structure:

{
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "duration": "Start Date - End Date",
      "responsibilities": ["responsibility1", "responsibility2", ...]
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
  "summary": "Brief professional summary",
  "strengths": ["strength1", "strength2", ...],
  "areas_for_improvement": ["area1", "area2", ...],
  "career_level": "entry_level|mid_level|senior_level|executive",
  "total_experience_years": number
}

Be thorough and accurate. Extract all relevant technical and soft skills. Identify the candidate's career progression and current level. Be honest about areas for improvement.

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