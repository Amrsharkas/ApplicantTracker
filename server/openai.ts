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

export class AIInterviewService {
  async generateInitialQuestions(userData: any): Promise<InterviewQuestion[]> {
    try {
      const prompt = `You are an AI career coach conducting a conversational interview. 
      Generate 3-4 initial interview questions for ${userData.firstName || 'the candidate'}.
      
      Available context:
      - Name: ${userData.firstName} ${userData.lastName}
      - Education: ${userData.education || 'Not provided'}
      - Current Role: ${userData.currentRole || 'Not provided'}
      - Experience: ${userData.yearsOfExperience || 'Not provided'} years
      
      Generate questions that are:
      1. Conversational and friendly
      2. Designed to understand their experience, skills, and career goals
      3. Open-ended to encourage detailed responses
      4. Professional but warm in tone
      
      Return as JSON in this format: { "questions": [{"question": "...", "context": "..."}] }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      return result.questions || [];
    } catch (error) {
      console.error("Error generating initial questions:", error);
      return [
        { question: "Can you tell me about your current role and what you enjoy most about it?" },
        { question: "What are your strongest technical skills, and how have you developed them?" },
        { question: "Where do you see your career heading in the next few years?" }
      ];
    }
  }

  async generateFollowUpQuestion(
    previousQA: InterviewResponse[],
    userData: any
  ): Promise<InterviewQuestion | null> {
    try {
      const conversationHistory = previousQA.map(qa => 
        `Q: ${qa.question}\nA: ${qa.answer}`
      ).join('\n\n');

      const prompt = `You are conducting an AI interview. Based on the conversation so far, generate ONE thoughtful follow-up question.

      Candidate context:
      - Name: ${userData.firstName} ${userData.lastName}
      - Current Role: ${userData.currentRole || 'Not provided'}
      
      Conversation so far:
      ${conversationHistory}
      
      Generate a follow-up question that:
      1. Builds on their previous answers
      2. Helps understand their skills, experience, or goals better
      3. Is conversational and engaging
      4. Avoids repeating topics already covered
      
      If the interview feels complete (5+ meaningful exchanges), return null.
      
      Return as JSON: { "question": "...", "context": "...", "continue": true/false }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"continue": false}');
      
      if (!result.continue || !result.question) {
        return null;
      }

      return { question: result.question, context: result.context };
    } catch (error) {
      console.error("Error generating follow-up question:", error);
      return null;
    }
  }

  async generateProfile(
    interviewData: InterviewResponse[],
    userData: any,
    resumeContent?: string
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
