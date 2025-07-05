import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface InterviewQuestion {
  question: string;
  context?: string;
}

export interface InterviewResponse {
  question: string;
  answer: string;
  followUp?: string;
}

export interface GeneratedProfile {
  skills: string[];
  personality: string;
  experience: {
    role: string;
    company: string;
    duration: string;
    description: string;
  }[];
  strengths: string[];
  careerGoals: string;
  workStyle: string;
  summary: string;
}

// AI Agent 1: Interview Conductor - analyzes resume/profile and conducts personalized interviews
export class AIInterviewAgent {
  async generatePersonalizedQuestions(userData: any, resumeContent?: string): Promise<InterviewQuestion[]> {
    // This AI agent analyzes user data and creates personalized interview questions
    
    const prompt = `You are an expert AI interviewer. Your job is to create exactly 5 personalized interview questions based on the candidate's background.

CANDIDATE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}
${userData?.education ? `Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}` : ''}
${userData?.location ? `Location: ${userData.location}` : ''}
${userData?.summary ? `Profile Summary: ${userData.summary}` : ''}
${resumeContent ? `RESUME CONTENT: ${resumeContent}` : ''}

Based on this information, create exactly 5 progressive interview questions that:
1. Start with personal background and motivation
2. Explore their current role and daily work
3. Identify key strengths and skills
4. Discuss meaningful projects or challenges
5. Understand their career aspirations

Make each question personalized by referencing their specific background, role, or experience when relevant. Return ONLY a JSON array of questions in this format:
[
  {"question": "...", "context": "..."},
  {"question": "...", "context": "..."},
  ...
]`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.questions || this.getFallbackQuestions();
    } catch (error) {
      console.error("Error generating personalized questions:", error);
      return this.getFallbackQuestions();
    }
  }

  private getFallbackQuestions(): InterviewQuestion[] {
    return [
      {
        question: "Let's start with you as a person - tell me about your background and what led you to your current career path?",
        context: "Personal foundation - understanding their journey and motivations"
      },
      {
        question: "What does a typical day or week look like in your current role, and what aspects do you find most fulfilling?",
        context: "Professional reality - current work experience and satisfaction"
      },
      {
        question: "When you think about your key strengths and skills, which ones make you stand out in your field?",
        context: "Core competencies - identifying their unique value proposition"
      },
      {
        question: "Tell me about a challenge or project you're particularly proud of - what made it meaningful to you?",
        context: "Achievement analysis - understanding their impact and values"
      },
      {
        question: "Looking ahead, what kind of role or environment would be your ideal next step, and what drives that vision?",
        context: "Future aspirations - career goals and desired growth direction"
      }
    ];
  }
}

// AI Agent 2: Profile Analyzer - creates comprehensive user analysis from resume, profile, and interview responses
export class AIProfileAnalysisAgent {
  async generateComprehensiveProfile(
    userData: any,
    resumeContent: string | null,
    interviewResponses: InterviewResponse[]
  ): Promise<GeneratedProfile> {
    try {
      const conversationHistory = interviewData.map(qa => 
        `Q: ${qa.question}\nA: ${qa.answer}`
      ).join('\n\n');

      const prompt = `You are an AI career analyst. Generate a comprehensive professional profile based on the interview and available data.

      Candidate Information:
      - Name: ${userData.firstName} ${userData.lastName}
      - Education: ${userData.education || 'Not provided'}
      - Current Role: ${userData.currentRole || 'Not provided'}
      - Company: ${userData.company || 'Not provided'}
      - Experience: ${userData.yearsOfExperience || 'Not provided'} years
      - Location: ${userData.location || 'Not provided'}
      
      Interview Conversation:
      ${conversationHistory}
      
      ${resumeContent ? `Resume Content:\n${resumeContent}\n` : ''}
      
      Generate a comprehensive profile in JSON format:
      {
        "skills": ["skill1", "skill2", ...], // Extract technical and soft skills
        "personality": "Brief personality assessment",
        "experience": [
          {
            "role": "Job title",
            "company": "Company name",
            "duration": "Time period",
            "description": "Key achievements and responsibilities"
          }
        ],
        "strengths": ["strength1", "strength2", ...], // Top 3-5 strengths
        "careerGoals": "Summary of career aspirations",
        "workStyle": "Preferred work environment and style",
        "summary": "Professional summary paragraph (2-3 sentences)"
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const profile = JSON.parse(response.choices[0].message.content || '{}');
      
      // Ensure required fields exist
      return {
        skills: profile.skills || [],
        personality: profile.personality || "Professional and motivated individual",
        experience: profile.experience || [],
        strengths: profile.strengths || [],
        careerGoals: profile.careerGoals || "Seeking growth opportunities",
        workStyle: profile.workStyle || "Collaborative and results-oriented",
        summary: profile.summary || "Experienced professional seeking new opportunities"
      };
    } catch (error) {
      console.error("Error generating profile:", error);
      // Return default profile structure
      return {
        skills: [],
        personality: "Professional and motivated individual",
        experience: [],
        strengths: [],
        careerGoals: "Seeking growth opportunities",
        workStyle: "Collaborative and results-oriented",
        summary: "Experienced professional seeking new opportunities"
      };
    }
  }

  async parseResume(resumeContent: string): Promise<any> {
    try {
      const prompt = `Extract structured information from this resume content:

      ${resumeContent}

      Return JSON with these fields:
      {
        "name": "Full name",
        "email": "Email address",
        "phone": "Phone number",
        "location": "Location/Address",
        "summary": "Professional summary",
        "experience": [
          {
            "role": "Job title",
            "company": "Company name",
            "duration": "Time period",
            "description": "Responsibilities and achievements"
          }
        ],
        "education": [
          {
            "degree": "Degree type",
            "school": "Institution name",
            "year": "Graduation year",
            "field": "Field of study"
          }
        ],
        "skills": ["skill1", "skill2", ...],
        "certifications": ["cert1", "cert2", ...]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error("Error parsing resume:", error);
      return {};
    }
  }
}

export const aiInterviewService = new AIInterviewService();
