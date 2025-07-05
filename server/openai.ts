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

Make each question personalized by referencing their specific background, role, or experience when relevant. Return ONLY a JSON object with a "questions" array in this format:
{
  "questions": [
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."}
  ]
}`;

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
    const conversationHistory = interviewResponses.map(qa => 
      `Q: ${qa.question}\nA: ${qa.answer}`
    ).join('\n\n');

    const prompt = `You are an expert AI career analyst specializing in comprehensive candidate assessment. Your job is to analyze ALL available data about a candidate and create a detailed professional profile.

CANDIDATE PROFILE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}
${userData?.education ? `Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}` : ''}
${userData?.location ? `Location: ${userData.location}` : ''}
${userData?.summary ? `Profile Summary: ${userData.summary}` : ''}

${resumeContent ? `RESUME CONTENT:
${resumeContent}

` : ''}INTERVIEW RESPONSES:
${conversationHistory}

Based on this comprehensive data (profile, resume, and interview responses), create a detailed professional analysis. Consider:
- What their resume reveals about their career trajectory
- How their profile data shows their current situation
- What their interview responses reveal about their personality, work style, and goals
- Patterns across all data sources that show their true professional identity

Generate a comprehensive profile in JSON format:
{
  "summary": "A 2-3 sentence professional summary that captures who they are",
  "skills": ["skill1", "skill2", "skill3", ...] (8-12 specific technical and soft skills),
  "personality": "A detailed paragraph describing their personality, communication style, and work approach",
  "experience": [
    {
      "role": "Position Title",
      "company": "Company Name", 
      "duration": "Time period",
      "description": "Key responsibilities and achievements"
    }
  ] (extract from resume and interview),
  "strengths": ["strength1", "strength2", ...] (5-8 key professional strengths),
  "careerGoals": "A paragraph about their career aspirations and desired growth",
  "workStyle": "A paragraph describing how they prefer to work, collaborate, and approach tasks"
}

Be specific and insightful. This analysis will be used for job matching and career guidance.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert career analyst. Provide detailed, accurate professional assessments based on all available candidate data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500
      });

      const profile = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        summary: profile.summary || "Professional candidate with demonstrated experience.",
        skills: profile.skills || [],
        personality: profile.personality || "Dedicated professional with strong work ethic.",
        experience: profile.experience || [],
        strengths: profile.strengths || [],
        careerGoals: profile.careerGoals || "Seeking opportunities for professional growth.",
        workStyle: profile.workStyle || "Collaborative and results-oriented approach to work."
      };
    } catch (error) {
      console.error("Error generating comprehensive profile:", error);
      return {
        summary: "Professional candidate seeking new opportunities.",
        skills: [],
        personality: "Dedicated and motivated professional.",
        experience: [],
        strengths: [],
        careerGoals: "Looking to advance career in chosen field.",
        workStyle: "Team-oriented with focus on results."
      };
    }
  }

  async parseResume(resumeContent: string): Promise<any> {
    const prompt = `Extract structured information from this resume:

${resumeContent}

Return a JSON object with:
{
  "name": "Full name",
  "email": "email address",
  "phone": "phone number", 
  "experience": [
    {
      "role": "Job title",
      "company": "Company name",
      "duration": "Time period",
      "description": "Key responsibilities"
    }
  ],
  "education": [
    {
      "degree": "Degree type",
      "school": "Institution name",
      "year": "Graduation year"
    }
  ],
  "skills": ["skill1", "skill2", ...],
  "summary": "Brief professional summary"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error("Error parsing resume:", error);
      return {};
    }
  }
}

// Create instances of both AI agents
export const aiInterviewAgent = new AIInterviewAgent();
export const aiProfileAnalysisAgent = new AIProfileAnalysisAgent();

// Legacy export for backward compatibility
export const aiInterviewService = {
  generateInitialQuestions: aiInterviewAgent.generatePersonalizedQuestions.bind(aiInterviewAgent),
  generateProfile: aiProfileAnalysisAgent.generateComprehensiveProfile.bind(aiProfileAnalysisAgent),
  parseResume: aiProfileAnalysisAgent.parseResume.bind(aiProfileAnalysisAgent)
};