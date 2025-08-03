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
  public openai = openai;

  async generateWelcomeMessage(userData: any): Promise<string> {
    const prompt = `You are an AI interviewer for Plato, an AI-powered job matching platform. Generate a professional welcome message for a candidate starting their comprehensive interview process.

CANDIDATE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : 'Candidate'}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}

Create a professional welcome message that:
1. Welcomes them to Plato professionally
2. Explains this is a comprehensive interview process with three connected phases
3. Mentions you'll be the same AI interviewer throughout all phases
4. Sets a neutral, professional tone
5. Personalizes it with their name if available
6. Emphasizes continuity - that you'll remember their answers throughout

Keep it professional and neutral - avoid overly positive or encouraging language. The message should be 3-4 sentences maximum. Sound like a professional interviewer who will assess and understand them thoroughly.

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
    return `Welcome to Plato${name}. I'll be conducting a comprehensive interview process with you today. We'll proceed through three connected phases - personal, professional, and technical - to understand your background and capabilities. I'll maintain continuity throughout all phases to build a complete profile.`;
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

QUESTION QUALITY STANDARDS:
- Ask human, high-quality questions - avoid templates and clichés
- Be sharp, contextual, and judgment-based
- Prioritize clarity, depth, and specificity
- Make every question purposeful and custom to this person
- Focus on gaps, clarity, and reflection
- Push for concrete examples, logic, outcomes, and learning

Create 5 background questions that demonstrate you've analyzed their profile:
1. Reference their educational background or career path in context - ask about specific decisions or transitions
2. Build on their stated career goals or work style - explore the reasoning behind their choices
3. Connect their current role to their personal values - dig into what drives their professional decisions
4. Explore motivations behind their career choices - ask about specific resistance or challenges they faced
5. Understand what drives them beyond what's already stated - focus on judgment calls and learning

RESPONSE STANDARDS FOR CANDIDATE ANSWERS:
- Respond professionally - never overly positive or flattering
- Use real interviewer language - neutral, grounded, professionally curious
- Never provide emotional reactions or value judgments
- Don't evaluate how "good" an answer was - ask the next smart question
- Maintain a calm, consistent tone - focused, observant, and neutral
- Examples of good responses: "Thank you. Could you clarify how you prioritized tasks in that situation?" or "Got it. What was the biggest trade-off you had to make?"
- Avoid: "That's amazing!" "Fantastic answer!" "Wow, that really shows how great you are!"

IMPORTANT: Every question must show you've reviewed their profile. Never ask blindly. Focus on WHY they made specific choices, not just WHAT they did.

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

QUESTION QUALITY STANDARDS:
- Ask human, high-quality questions - avoid templates and clichés like "Tell me about a time..."
- Be sharp, contextual, and judgment-based
- Ask deeper, not broader - dig into what's already been shared
- Focus on gaps, clarity, and reflection - push for concrete examples, logic, outcomes, and learning
- Be strategic and natural - sequence questions with logical flow
- Use context smartly - reference past answers naturally without mentioning interview structure

Create 7 professional questions that demonstrate full knowledge:
1. Reference their career progression from profile - ask about specific resistance or challenges they faced during transitions
2. Build on their stated career goals - explore the reasoning and trade-offs behind their choices
3. Connect their current role to their motivations - dig into specific judgment calls they've made
4. Explore leadership based on achievements AND personal philosophy - ask about concrete situations where they had to make difficult decisions
5. Ask about career transitions using educational background - focus on WHY they made specific choices
6. Connect their target role to personal aspirations - explore what specific obstacles they anticipate
7. Understand their professional preferences - ask about times when their work style was challenged

RESPONSE STANDARDS FOR CANDIDATE ANSWERS:
- Respond professionally - never overly positive or flattering
- Use real interviewer language - neutral, grounded, professionally curious
- Never provide emotional reactions or value judgments
- Don't evaluate how "good" an answer was - ask the next smart question
- Maintain a calm, consistent tone - focused, observant, and neutral
- Examples of good responses: "Thank you. Could you clarify how you prioritized tasks in that situation?" or "Got it. What was the biggest trade-off you had to make?"
- Avoid: "That's amazing!" "Fantastic answer!" "Wow, that really shows how great you are!"

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

QUESTION QUALITY STANDARDS:
- Ask human, high-quality questions - avoid templates and clichés
- Be sharp, contextual, and judgment-based
- Ask deeper, not broader - dig into what's already been shared
- Focus on gaps, clarity, and reflection - push for concrete examples, logic, outcomes, and learning
- Be strategic and natural - sequence questions with logical flow
- Use context smartly - reference past answers naturally without mentioning interview structure

Create 11 technical questions for a ${userRole} in ${userField} that demonstrate total continuity:
1. Reference their ${userData?.education || 'educational background'} - ask about specific technical decisions or trade-offs they had to make
2. Connect their ${userData?.skills?.join(' and ') || 'technical skills'} - explore reasoning behind their technical approach choices
3. Use their ${userData?.achievements || 'professional achievements'} - dig into specific resistance or obstacles they overcame
4. Build on their stated ${userData?.careerGoals || 'career goals'} - ask about technical challenges they anticipate
5. Test cognitive abilities through specific scenarios related to their ${userData?.yearsOfExperience || 'stated experience'} level
6. Evaluate analytical thinking using concrete examples from their ${userData?.workStyle || 'work approach'} 
7. Assess technical communication - ask them to explain complex concepts they've mentioned
8. Test adaptability through specific technical challenges they've faced during career transitions
9. Evaluate memory and processing using scenarios from their ${userData?.currentRole || 'professional'} context
10. Challenge creative problem-solving with specific technical obstacles they've encountered
11. Assess technical leadership using concrete examples from their management experiences discussed earlier

RESPONSE STANDARDS FOR CANDIDATE ANSWERS:
- Respond professionally - never overly positive or flattering
- Use real interviewer language - neutral, grounded, professionally curious
- Never provide emotional reactions or value judgments
- Don't evaluate how "good" an answer was - ask the next smart question
- Maintain a calm, consistent tone - focused, observant, and neutral
- Examples of good responses: "Thank you. Could you clarify how you prioritized tasks in that situation?" or "Got it. What was the biggest trade-off you had to make?"
- Avoid: "That's amazing!" "Fantastic answer!" "Wow, that really shows how great you are!"

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

  // New method for job application scoring
  async analyzeJobApplication(userProfile: any, jobDetails: any, resumeContent: string): Promise<{
    score: number;
    message: string;
    detailedAnalysis: string;
  }> {
    const prompt = `You are an expert HR analyst. Analyze how well this candidate fits the job requirements and provide a compatibility score from 0-100.

CANDIDATE PROFILE:
${JSON.stringify(userProfile, null, 2)}

JOB DETAILS:
Title: ${jobDetails.title}
Company: ${jobDetails.company}
Description: ${jobDetails.description}
Requirements: ${jobDetails.requirements?.join(', ') || 'Not specified'}
Skills: ${jobDetails.skills?.join(', ') || 'Not specified'}
Experience Level: ${jobDetails.experienceLevel || 'Not specified'}

RESUME CONTENT:
${resumeContent}

SCORING CRITERIA:
- Skills alignment (40 points)
- Experience relevance (30 points)
- Educational background (15 points)
- Communication quality from interviews (15 points)

Return JSON with:
{
  "score": [0-100 integer],
  "detailedAnalysis": "Professional analysis of fit with specific examples",
  "goodFitMessage": "Humorous, kind, encouraging message for scores 50+",
  "poorFitMessage": "Humorous, kind, supportive message for scores <50 about exploring other opportunities"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        score: analysis.score || 0,
        message: analysis.score >= 50 ? analysis.goodFitMessage : analysis.poorFitMessage,
        detailedAnalysis: analysis.detailedAnalysis || 'Analysis not available'
      };
    } catch (error) {
      console.error("Error analyzing job application:", error);
      return {
        score: 0,
        message: "Well, this is awkward... our crystal ball is in the shop! 🔮 But hey, don't let that stop you - sometimes the best opportunities come from the most unexpected places!",
        detailedAnalysis: "Analysis could not be completed due to technical issues."
      };
    }
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

    const prompt = `You are a brutally honest professional analyst creating an employer-facing candidate profile. Your role is to be a tough, fair recruiter who has just completed an in-depth interview. You MUST be critical, evidence-based, and blunt—no promotional fluff.

🧩 CRITICAL ANALYSIS RULES:
- Be brutally honest and grounded in evidence
- Every strength MUST be followed by a "but" that points out what's lacking
- Call out vague answers, contradictions, and unsupported claims
- No sugarcoating or generic praise
- Focus solely on what the candidate actually demonstrated vs. claimed

📊 CANDIDATE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : ''}
${userData?.email ? `Email: ${userData.email}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.totalYearsOfExperience ? `Claimed Experience: ${userData.totalYearsOfExperience} years` : ''}
${userData?.currentEducationLevel ? `Education: ${userData.currentEducationLevel}` : ''}
${userData?.skillsList ? `Self-Reported Skills: ${Array.isArray(userData.skillsList) ? userData.skillsList.join(', ') : userData.skillsList}` : ''}
${userData?.location ? `Location: ${userData.location}` : ''}
${userData?.age ? `Age: ${userData.age}` : ''}

${resumeContent ? `📄 RESUME CONTENT:
${resumeContent}

` : ''}🎤 INTERVIEW RESPONSES (3 interviews: Background/Soft Skills, Professional/Experience, Technical/Problem Solving):
${conversationHistory}

📘 GENERATE BRUTALLY HONEST PROFILE IN JSON:
{
  "candidateSummary": "Max 3-5 lines: Honest overview evaluating their claims vs actual demonstration. Do NOT repeat what they said—evaluate it critically.",
  "keyStrengths": [
    {
      "strength": "Specific strength clearly demonstrated",
      "butCritique": "What's still lacking or unclear about this strength"
    }
  ],
  "weaknessesAndGaps": [
    "Direct weaknesses: missing skills, vague answers, inconsistencies, overstatements"
  ],
  "softSkillsReview": {
    "communicationClarity": "Critical assessment of how clearly they expressed ideas",
    "evidenceQuality": "Assessment of whether they provided real examples or just buzzwords",
    "emotionalIntelligence": "Based on tone and responses about teamwork/conflict",
    "overallTone": "Confident/hesitant/unclear/defensive assessment"
  },
  "technicalKnowledge": {
    "claimedVsActual": "Skills they claimed vs what they could actually demonstrate",
    "gapsIdentified": "Technical areas where knowledge was clearly lacking",
    "problemSolvingApproach": "Assessment of logical thinking in technical scenarios"
  },
  "problemSolvingCriticalThinking": {
    "approachClarity": "How well-structured was their thinking process",
    "realismFactoring": "Did they consider practical constraints and real-world factors",
    "logicalConsistency": "Were their solutions logical and well-reasoned"
  },
  "unverifiedClaims": [
    "Things they stated with no supporting evidence or examples"
  ],
  "communicationScore": 7,
  "credibilityScore": 6,
  "consistencyScore": 8,
  "readinessAssessment": {
    "faceToFaceReady": true,
    "areasToClarity": ["Specific areas that need clarification in face-to-face interview"],
    "recommendation": "Clear statement on interview readiness with specific focus areas"
  }
}

❌ DO NOT:
- Fill gaps with assumptions
- Give praise for vague statements  
- Sound optimistic or promotional
- Use generic career advice language

✅ WRITE LIKE:
A tough, fair recruiter who just finished an in-depth interview—credible, nuanced, trustworthy, with no marketing fluff.`;

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
      
      // Store the brutally honest comprehensive profile for employers
      const comprehensiveProfile = {
        candidateSummary: profile.candidateSummary || "Candidate assessment could not be completed.",
        keyStrengths: profile.keyStrengths || [],
        weaknessesAndGaps: profile.weaknessesAndGaps || [],
        softSkillsReview: profile.softSkillsReview || {
          communicationClarity: "Communication assessment not available",
          evidenceQuality: "Evidence quality not assessed",
          emotionalIntelligence: "Emotional intelligence not evaluated",
          overallTone: "Overall tone not determined"
        },
        technicalKnowledge: profile.technicalKnowledge || {
          claimedVsActual: "Technical claims not verified",
          gapsIdentified: "Technical gaps not identified",
          problemSolvingApproach: "Problem-solving approach not assessed"
        },
        problemSolvingCriticalThinking: profile.problemSolvingCriticalThinking || {
          approachClarity: "Approach clarity not assessed",
          realismFactoring: "Realism factoring not evaluated", 
          logicalConsistency: "Logical consistency not determined"
        },
        unverifiedClaims: profile.unverifiedClaims || [],
        communicationScore: profile.communicationScore || 5,
        credibilityScore: profile.credibilityScore || 5,
        consistencyScore: profile.consistencyScore || 5,
        readinessAssessment: profile.readinessAssessment || {
          faceToFaceReady: false,
          areasToClarity: ["Assessment incomplete"],
          recommendation: "Further assessment required"
        }
      };

      // Extract basic info for backward compatibility
      const legacySkills = comprehensiveProfile.keyStrengths.map((item: any) => 
        typeof item === 'object' && item.strength ? item.strength : 'Not specified'
      );

      // Return legacy format for backward compatibility with new comprehensive data
      return {
        summary: comprehensiveProfile.candidateSummary,
        skills: legacySkills,
        personality: comprehensiveProfile.softSkillsReview.overallTone,
        experience: [], // Will be populated from existing profile data
        strengths: comprehensiveProfile.keyStrengths.map((item: any) => 
          typeof item === 'object' && item.strength ? 
          `${item.strength} - but ${item.butCritique}` : item
        ),
        careerGoals: "Assessment from interview responses",
        workStyle: comprehensiveProfile.softSkillsReview.communicationClarity,
        // Store the full brutally honest profile for employer access
        brutallyHonestProfile: comprehensiveProfile
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