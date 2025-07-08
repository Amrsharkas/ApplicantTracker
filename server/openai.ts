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

// Job-specific interview agent
export class AIJobInterviewAgent {
  async generateJobSpecificQuestions(jobTitle: string, jobDescription: string, userProfile: any): Promise<InterviewQuestion[]> {
    try {
      const prompt = `
You are an expert AI recruiter conducting a focused interview for a specific job position. Generate exactly 2 comprehensive, thoughtful questions to assess if this candidate is truly fit for this role.

JOB DETAILS:
Job Title: ${jobTitle}
Job Description: ${jobDescription}

CANDIDATE PROFILE:
${JSON.stringify(userProfile, null, 2)}

INSTRUCTIONS:
1. Generate exactly 2 questions that go deep into job-specific requirements
2. Questions should assess both technical competency and cultural fit
3. Consider the candidate's existing profile and experience
4. Make questions challenging but fair
5. Focus on real scenarios they'd face in this role

Return a JSON object with this structure:
{
  "questions": [
    {
      "question": "Your first comprehensive question here",
      "context": "Brief explanation of what this question assesses"
    },
    {
      "question": "Your second comprehensive question here", 
      "context": "Brief explanation of what this question assesses"
    }
  ]
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content!);
      return result.questions || this.getFallbackJobQuestions(jobTitle);
    } catch (error) {
      console.error('Error generating job-specific questions:', error);
      return this.getFallbackJobQuestions(jobTitle);
    }
  }

  async evaluateJobFitness(jobTitle: string, jobDescription: string, userProfile: any, interviewResponses: InterviewResponse[]): Promise<{score: number, feedback: string, isApproved: boolean}> {
    try {
      const prompt = `
You are an expert AI recruiter evaluating a candidate's fitness for a specific job role. Analyze their interview responses and provide a comprehensive evaluation.

JOB DETAILS:
Job Title: ${jobTitle}
Job Description: ${jobDescription}

CANDIDATE PROFILE:
${JSON.stringify(userProfile, null, 2)}

INTERVIEW RESPONSES:
${interviewResponses.map((resp, i) => `
Q${i + 1}: ${resp.question}
A${i + 1}: ${resp.answer}
`).join('\n')}

EVALUATION CRITERIA:
1. Technical competency for the role (40 points)
2. Relevant experience and skills match (30 points)
3. Communication and problem-solving ability (20 points)
4. Cultural fit and motivation (10 points)

Provide a score from 0-100 and detailed feedback. Be fair but thorough.

Return a JSON object with this structure:
{
  "score": 85,
  "technicalFit": "Detailed assessment of technical capabilities",
  "experienceMatch": "How well their experience aligns",
  "communicationSkills": "Assessment of their responses quality",
  "overallFeedback": "Comprehensive evaluation summary",
  "strengths": ["List of key strengths"],
  "improvements": ["Areas for potential growth"]
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content!);
      const score = Math.max(0, Math.min(100, result.score || 50));
      const isApproved = score >= 50;
      
      // Generate appropriate feedback message
      let feedback;
      if (isApproved) {
        feedback = this.generateApprovalMessage(jobTitle, score);
      } else {
        feedback = this.generateRejectionMessage(score);
      }

      return {
        score,
        feedback,
        isApproved,
        ...result
      };
    } catch (error) {
      console.error('Error evaluating job fitness:', error);
      return {
        score: 50,
        feedback: "We appreciate your interest! Due to technical issues, we'll review your application manually.",
        isApproved: true
      };
    }
  }

  private getFallbackJobQuestions(jobTitle: string): InterviewQuestion[] {
    return [
      {
        question: `What specific experience or skills do you have that make you a great fit for this ${jobTitle} position?`,
        context: "Assessing relevant experience and skills match"
      },
      {
        question: `Describe a challenging situation you've faced that's similar to what you might encounter in this ${jobTitle} role. How did you handle it?`,
        context: "Evaluating problem-solving and practical application"
      }
    ];
  }

  private generateApprovalMessage(jobTitle: string, score: number): string {
    const messages = [
      `🎉 Fantastic! You absolutely nailed it! Your responses show you're a perfect match for this ${jobTitle} role. Consider yourself hired (well, almost)! 🚀`,
      `✨ Wow! You knocked that interview out of the park! Your experience and passion for this ${jobTitle} position really shine through. We're excited to move forward! 🌟`,
      `🎯 Bullseye! You've got exactly what we're looking for in this ${jobTitle} role. Your thoughtful responses demonstrate both competence and enthusiasm. Welcome aboard! 🎊`,
      `💫 Outstanding work! You've shown remarkable alignment with this ${jobTitle} position. Your insights were spot-on and your experience speaks volumes. Let's make this happen! 🎈`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private generateRejectionMessage(score: number): string {
    const messages = [
      `😊 Thanks for sharing your thoughts with us! While this particular role might not be the perfect match right now, we see great potential in you. Keep exploring - your dream job is out there waiting! 🌈`,
      `🌟 We really appreciate the time you took for this interview! This specific position might not align perfectly, but don't let that discourage you. Every experience builds towards your ideal opportunity! 💪`,
      `😄 Your enthusiasm really came through in the interview! While this role might not be the exact fit, we encourage you to keep applying. The right position that matches your unique talents is definitely out there! 🎯`,
      `🌻 Thank you for the genuine conversation! This particular position might not be your perfect match, but that just means your ideal role is still waiting to be discovered. Keep that positive energy going! ✨`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

// Create instances of all AI agents
export const aiInterviewAgent = new AIInterviewAgent();
export const aiProfileAnalysisAgent = new AIProfileAnalysisAgent();
export const aiJobInterviewAgent = new AIJobInterviewAgent();

// Legacy export for backward compatibility
export const aiInterviewService = {
  generateInitialQuestions: aiInterviewAgent.generatePersonalizedQuestions.bind(aiInterviewAgent),
  generateProfile: aiProfileAnalysisAgent.generateComprehensiveProfile.bind(aiProfileAnalysisAgent),
  parseResume: aiProfileAnalysisAgent.parseResume.bind(aiProfileAnalysisAgent)
};