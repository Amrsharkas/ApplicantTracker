import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface InterviewQuestion {
  question: string;
  context?: string;
}

export interface InterviewSet {
  type: 'personal' | 'professional' | 'technical';
  title: string;
  description: string;
  questions: InterviewQuestion[];
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
  async generateWelcomeMessage(userData: any): Promise<string> {
    const prompt = `You are an AI interview assistant for Plato, an innovative AI-powered job matching platform. Generate a warm, professional welcome message for a candidate starting their comprehensive interview process.

CANDIDATE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : 'Candidate'}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}

Create a personalized welcome message that:
1. Warmly welcomes them to Plato
2. Explains this is a comprehensive interview process with three connected phases
3. Mentions you'll be the same AI interviewer throughout all phases
4. Sets a positive, encouraging tone
5. Personalizes it with their name if available
6. Emphasizes continuity - that you'll remember their answers throughout

Keep it conversational, professional, and encouraging. The message should be 3-4 sentences maximum. Make them feel like they're talking to one intelligent, continuous interviewer who will get to know them deeply.

Return ONLY the welcome message text, no JSON or additional formatting.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0].message.content?.trim() || this.getFallbackWelcomeMessage(userData?.firstName);
    } catch (error) {
      console.error("Error generating welcome message:", error);
      return this.getFallbackWelcomeMessage(userData?.firstName);
    }
  }

  private getFallbackWelcomeMessage(firstName?: string): string {
    const name = firstName ? `, ${firstName}` : '';
    return `Welcome to Plato${name}! I'm excited to get to know you through our comprehensive interview process. We'll conduct three focused interviews together - personal, professional, and technical - with about 7 questions each. This deep understanding will help us create your complete profile and match you with perfect opportunities.`;
  }

  async generateComprehensiveInterviewSets(userData: any, resumeContent?: string): Promise<InterviewSet[]> {
    // Generate all three interview sets: personal, professional, and technical
    
    const personalSet = await this.generatePersonalInterview(userData, resumeContent);
    const professionalSet = await this.generateProfessionalInterview(userData, resumeContent);
    const technicalSet = await this.generateTechnicalInterview(userData, resumeContent);
    
    return [personalSet, professionalSet, technicalSet];
  }

  async generatePersonalInterview(userData: any, resumeContent?: string): Promise<InterviewSet> {
    const prompt = `You are a continuous AI interviewer conducting the Background phase of a comprehensive interview process. 

CRITICAL: You must first analyze the candidate's profile in full detail before asking any questions. You already know about this candidate and must reference their profile naturally in your questions.

CANDIDATE PROFILE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : ''}
${userData?.email ? `Email: ${userData.email}` : ''}
${userData?.phone ? `Phone: ${userData.phone}` : ''}
${userData?.location ? `Location: ${userData.location}` : ''}
${userData?.age ? `Age: ${userData.age}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Years of Experience: ${userData.yearsOfExperience}` : ''}
${userData?.education ? `Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}` : ''}
${userData?.skills ? `Skills: ${userData.skills.join(', ')}` : ''}
${userData?.summary ? `Profile Summary: ${userData.summary}` : ''}
${userData?.linkedinUrl ? `LinkedIn: ${userData.linkedinUrl}` : ''}
${userData?.githubUrl ? `GitHub: ${userData.githubUrl}` : ''}
${userData?.portfolioUrl ? `Portfolio: ${userData.portfolioUrl}` : ''}
${userData?.careerGoals ? `Career Goals: ${userData.careerGoals}` : ''}
${userData?.targetRole ? `Target Role: ${userData.targetRole}` : ''}
${userData?.targetCompany ? `Target Company: ${userData.targetCompany}` : ''}
${userData?.targetSalary ? `Target Salary: ${userData.targetSalary}` : ''}
${userData?.workStyle ? `Work Style: ${userData.workStyle}` : ''}
${userData?.previousRole ? `Previous Role: ${userData.previousRole}` : ''}
${userData?.previousCompany ? `Previous Company: ${userData.previousCompany}` : ''}
${userData?.achievements ? `Achievements: ${userData.achievements}` : ''}
${userData?.certifications ? `Certifications: ${userData.certifications}` : ''}
${userData?.languages ? `Languages: ${userData.languages.join(', ')}` : ''}
${userData?.availability ? `Availability: ${userData.availability}` : ''}
${userData?.remotePreference ? `Remote Preference: ${userData.remotePreference}` : ''}
${userData?.salaryExpectation ? `Salary Expectation: ${userData.salaryExpectation}` : ''}
${resumeContent ? `RESUME CONTENT: ${resumeContent}` : ''}

CRITICAL INSTRUCTIONS:
1. You must analyze this profile fully before generating questions
2. Your questions must reference what you already know about them - use phrases like "I see from your profile that..." or "Based on your ${userData?.currentRole || 'background'}..."
3. DO NOT ask for information already provided in the profile
4. Ask questions that build on their existing profile data
5. Establish your conversational tone to match their profile style
6. Remember: this is the foundation for Professional and Technical interviews

Create 5 background questions that demonstrate you've analyzed their profile:
1. Reference their educational background or career path in context
2. Build on their stated career goals or work style
3. Connect their current role to their personal values
4. Explore motivations behind their career choices
5. Understand what drives them beyond what's already stated

IMPORTANT: Every question must show you've reviewed their profile. Never ask blindly.

Return ONLY JSON:
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
      return {
        type: 'personal',
        title: 'Personal Interview',
        description: 'Understanding your background, values, and personal journey',
        questions: result.questions || this.getFallbackPersonalQuestions()
      };
    } catch (error) {
      console.error("Error generating personal interview:", error);
      return {
        type: 'personal',
        title: 'Personal Interview',
        description: 'Understanding your background, values, and personal journey',
        questions: this.getFallbackPersonalQuestions()
      };
    }
  }

  async generateProfessionalInterview(userData: any, resumeContent?: string, previousInterviewData?: any): Promise<InterviewSet> {
    const contextInsights = previousInterviewData?.insights || '';
    const conversationStyle = previousInterviewData?.conversationStyle || '';
    const keyThemes = previousInterviewData?.keyThemes || [];
    const previousQuestions = previousInterviewData?.previousQuestions || [];
    
    const prompt = `You are continuing as the same AI interviewer. You have full knowledge of this candidate's profile AND their previous interview answers.

COMPLETE CANDIDATE PROFILE:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : ''}
${userData?.email ? `Email: ${userData.email}` : ''}
${userData?.phone ? `Phone: ${userData.phone}` : ''}
${userData?.location ? `Location: ${userData.location}` : ''}
${userData?.age ? `Age: ${userData.age}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Years of Experience: ${userData.yearsOfExperience}` : ''}
${userData?.education ? `Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}` : ''}
${userData?.skills ? `Skills: ${userData.skills.join(', ')}` : ''}
${userData?.summary ? `Profile Summary: ${userData.summary}` : ''}
${userData?.careerGoals ? `Career Goals: ${userData.careerGoals}` : ''}
${userData?.targetRole ? `Target Role: ${userData.targetRole}` : ''}
${userData?.targetCompany ? `Target Company: ${userData.targetCompany}` : ''}
${userData?.workStyle ? `Work Style: ${userData.workStyle}` : ''}
${userData?.previousRole ? `Previous Role: ${userData.previousRole}` : ''}
${userData?.previousCompany ? `Previous Company: ${userData.previousCompany}` : ''}
${userData?.achievements ? `Achievements: ${userData.achievements}` : ''}
${userData?.certifications ? `Certifications: ${userData.certifications}` : ''}
${resumeContent ? `RESUME CONTENT: ${resumeContent}` : ''}

${contextInsights}

${conversationStyle}

KEY THEMES FROM PREVIOUS INTERVIEWS: ${keyThemes.join(', ')}

QUESTIONS ALREADY ASKED (DO NOT REPEAT):
${previousQuestions.map(q => `- ${q}`).join('\n')}

CRITICAL INSTRUCTIONS:
1. You are the SAME interviewer who knows their full profile AND previous answers
2. Reference specific details from BOTH their profile AND previous responses
3. Use phrases like "You mentioned earlier..." or "Building on what you shared about..." 
4. DO NOT repeat any previously asked questions or themes
5. DO NOT ask for information already in their profile
6. Maintain the exact same tone and conversation style
7. Show you remember everything - profile + previous answers

Create 7 professional questions that demonstrate full knowledge:
1. Reference their career progression from profile in context of their personal values
2. Build on their stated career goals using insights from background interview
3. Connect their current role to what they shared about motivations
4. Explore leadership based on their profile achievements AND personal philosophy
5. Ask about career transitions using their educational background as context
6. Connect their target role to their personal aspirations discussed earlier
7. Understand their professional preferences through their stated work style

Return ONLY JSON:
{
  "questions": [
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
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
      return {
        type: 'professional',
        title: 'Professional Interview',
        description: 'Exploring your career journey, achievements, and professional expertise',
        questions: result.questions || this.getFallbackProfessionalQuestions()
      };
    } catch (error) {
      console.error("Error generating professional interview:", error);
      return {
        type: 'professional',
        title: 'Professional Interview',
        description: 'Exploring your career journey, achievements, and professional expertise',
        questions: this.getFallbackProfessionalQuestions()
      };
    }
  }

  async generateTechnicalInterview(userData: any, resumeContent?: string, previousInterviewData?: any): Promise<InterviewSet> {
    const userRole = userData?.currentRole || 'professional';
    const userField = this.determineUserField(userData, resumeContent);
    const contextInsights = previousInterviewData?.insights || '';
    const conversationStyle = previousInterviewData?.conversationStyle || '';
    const keyThemes = previousInterviewData?.keyThemes || [];
    const previousQuestions = previousInterviewData?.previousQuestions || [];
    
    const prompt = `You are completing the final interview phase as the same AI interviewer. You have comprehensive knowledge of this candidate's full profile AND all previous interview answers.

COMPLETE CANDIDATE PROFILE:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : ''}
${userData?.email ? `Email: ${userData.email}` : ''}
${userData?.phone ? `Phone: ${userData.phone}` : ''}
${userData?.location ? `Location: ${userData.location}` : ''}
${userData?.age ? `Age: ${userData.age}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Years of Experience: ${userData.yearsOfExperience}` : ''}
${userData?.education ? `Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}` : ''}
${userData?.skills ? `Skills: ${userData.skills.join(', ')}` : ''}
${userData?.summary ? `Profile Summary: ${userData.summary}` : ''}
${userData?.careerGoals ? `Career Goals: ${userData.careerGoals}` : ''}
${userData?.targetRole ? `Target Role: ${userData.targetRole}` : ''}
${userData?.workStyle ? `Work Style: ${userData.workStyle}` : ''}
${userData?.previousRole ? `Previous Role: ${userData.previousRole}` : ''}
${userData?.achievements ? `Achievements: ${userData.achievements}` : ''}
${userData?.certifications ? `Certifications: ${userData.certifications}` : ''}
${resumeContent ? `RESUME CONTENT: ${resumeContent}` : ''}

${contextInsights}

${conversationStyle}

KEY THEMES FROM ALL PREVIOUS INTERVIEWS: ${keyThemes.join(', ')}

QUESTIONS ALREADY ASKED (DO NOT REPEAT):
${previousQuestions.map(q => `- ${q}`).join('\n')}

CRITICAL INSTRUCTIONS:
1. You are the SAME interviewer who knows their full profile AND all previous answers
2. Reference specific details from their profile, background answers, AND professional answers
3. Use phrases like "Based on your ${userRole} experience..." or "You mentioned in our earlier conversation..."
4. DO NOT repeat any previously asked questions or themes
5. DO NOT ask for information already in their profile
6. Maintain the exact same tone and conversation style from the beginning
7. Show complete memory of profile + all previous discussions

Create 11 technical questions for a ${userRole} in ${userField} that demonstrate total continuity:
1. Reference their ${userData?.education || 'educational background'} when assessing technical foundation
2. Connect their ${userData?.skills?.join(' and ') || 'technical skills'} to problem-solving scenarios
3. Use their ${userData?.achievements || 'professional achievements'} as context for technical leadership
4. Build on their stated ${userData?.careerGoals || 'career goals'} with technical scenarios
5. Test cognitive abilities through their ${userData?.yearsOfExperience || 'stated experience'} level
6. Evaluate analytical thinking using their ${userData?.workStyle || 'work approach'} insights
7. Assess technical communication based on their background responses
8. Test adaptability through their career transition insights from earlier interviews
9. Evaluate memory and processing in their ${userData?.currentRole || 'professional'} context
10. Challenge creative problem-solving using their innovation examples from previous answers
11. Assess technical leadership using their management insights from all previous discussions

Return ONLY JSON:
{
  "questions": [
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
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
      return {
        type: 'technical',
        title: 'Technical Interview',
        description: `Assessing your technical abilities and problem-solving skills in ${userField}`,
        questions: result.questions || this.getFallbackTechnicalQuestions()
      };
    } catch (error) {
      console.error("Error generating technical interview:", error);
      return {
        type: 'technical',
        title: 'Technical Interview',
        description: 'Assessing your technical abilities and problem-solving skills',
        questions: this.getFallbackTechnicalQuestions()
      };
    }
  }

  private determineUserField(userData: any, resumeContent?: string): string {
    const role = (userData?.currentRole || '').toLowerCase();
    const summary = (userData?.summary || '').toLowerCase();
    const resume = (resumeContent || '').toLowerCase();
    const allText = `${role} ${summary} ${resume}`;

    if (allText.includes('software') || allText.includes('developer') || allText.includes('engineer') || allText.includes('programming')) {
      return 'Software Engineering';
    } else if (allText.includes('finance') || allText.includes('investment') || allText.includes('banking') || allText.includes('analyst')) {
      return 'Finance';
    } else if (allText.includes('marketing') || allText.includes('sales') || allText.includes('growth')) {
      return 'Marketing & Sales';
    } else if (allText.includes('design') || allText.includes('creative') || allText.includes('ux') || allText.includes('ui')) {
      return 'Design';
    } else if (allText.includes('data') || allText.includes('analytics') || allText.includes('scientist')) {
      return 'Data Science';
    } else if (allText.includes('product') || allText.includes('management') || allText.includes('strategy')) {
      return 'Product Management';
    } else if (allText.includes('operations') || allText.includes('consulting') || allText.includes('business')) {
      return 'Business Operations';
    } else {
      return 'General Professional';
    }
  }

  async generatePersonalizedQuestions(userData: any, resumeContent?: string): Promise<InterviewQuestion[]> {
    // Legacy method for backward compatibility - now returns first interview set only
    const interviewSets = await this.generateComprehensiveInterviewSets(userData, resumeContent);
    return interviewSets[0]?.questions || this.getFallbackQuestions();
  }

  private getFallbackPersonalQuestions(): InterviewQuestion[] {
    return [
      {
        question: "Tell me about your background and upbringing - what shaped you into the person you are today?",
        context: "Personal foundation - understanding their life journey"
      },
      {
        question: "What core values and principles guide your decisions and actions in life?",
        context: "Values exploration - understanding their moral compass"
      },
      {
        question: "What truly motivates and drives you beyond work and career?",
        context: "Personal motivation - understanding their inner drive"
      },
      {
        question: "How do you typically handle setbacks and challenges in your personal life?",
        context: "Resilience assessment - understanding their coping mechanisms"
      },
      {
        question: "What are you most passionate about outside of your professional life?",
        context: "Personal interests - understanding their broader identity"
      },
      {
        question: "Describe a moment or experience that significantly changed your perspective on life.",
        context: "Growth moments - understanding transformative experiences"
      },
      {
        question: "What does fulfillment and happiness mean to you personally?",
        context: "Life philosophy - understanding their definition of success"
      }
    ];
  }

  private getFallbackProfessionalQuestions(): InterviewQuestion[] {
    return [
      {
        question: "Walk me through your career journey - what were the key decisions and transitions that brought you here?",
        context: "Career trajectory - understanding professional evolution"
      },
      {
        question: "What do you consider your most significant professional achievement and why?",
        context: "Achievement analysis - understanding their professional impact"
      },
      {
        question: "Describe your leadership style and how you work with teams to achieve goals.",
        context: "Leadership assessment - understanding their collaborative approach"
      },
      {
        question: "Tell me about a major professional challenge you faced and how you overcame it.",
        context: "Problem-solving ability - understanding their professional resilience"
      },
      {
        question: "What are your strongest professional skills and areas of expertise?",
        context: "Competency mapping - understanding their professional strengths"
      },
      {
        question: "Where do you see your career heading in the next 3-5 years?",
        context: "Career vision - understanding their professional aspirations"
      },
      {
        question: "What type of work environment and role would be ideal for your next career move?",
        context: "Job fit assessment - understanding their preferences and needs"
      }
    ];
  }

  private getFallbackTechnicalQuestions(): InterviewQuestion[] {
    return [
      {
        question: "Describe your approach to solving complex problems in your field - what's your methodology?",
        context: "Problem-solving methodology - understanding their analytical process"
      },
      {
        question: "Walk me through a challenging technical project you worked on - what made it complex and how did you tackle it?",
        context: "Technical experience - understanding their hands-on capabilities"
      },
      {
        question: "How do you stay current with new technologies and best practices in your field?",
        context: "Continuous learning - understanding their growth mindset"
      },
      {
        question: "If you had to explain a complex concept from your field to someone with no background in it, how would you do it?",
        context: "Communication skills - understanding their ability to simplify complexity"
      },
      {
        question: "Describe a situation where you had to innovate or think creatively to solve a technical challenge.",
        context: "Innovation assessment - understanding their creative problem-solving"
      },
      {
        question: "What tools, technologies, or methodologies do you consider essential in your work and why?",
        context: "Technical expertise - understanding their domain knowledge"
      },
      {
        question: "How do you approach learning and mastering new technical skills or technologies?",
        context: "Learning ability - understanding their adaptability and growth potential"
      }
    ];
  }

  private getFallbackQuestions(): InterviewQuestion[] {
    // Legacy fallback - returns personal questions for backward compatibility
    return this.getFallbackPersonalQuestions();
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
  generateWelcomeMessage: aiInterviewAgent.generateWelcomeMessage.bind(aiInterviewAgent),
  generateInterviewSets: aiInterviewAgent.generateComprehensiveInterviewSets.bind(aiInterviewAgent),
  generateInitialQuestions: aiInterviewAgent.generatePersonalizedQuestions.bind(aiInterviewAgent),
  generatePersonalInterview: aiInterviewAgent.generatePersonalInterview.bind(aiInterviewAgent),
  generateProfessionalInterview: aiInterviewAgent.generateProfessionalInterview.bind(aiInterviewAgent),
  generateTechnicalInterview: aiInterviewAgent.generateTechnicalInterview.bind(aiInterviewAgent),
  generateProfile: aiProfileAnalysisAgent.generateComprehensiveProfile.bind(aiProfileAnalysisAgent),
  parseResume: aiProfileAnalysisAgent.parseResume.bind(aiProfileAnalysisAgent)
};