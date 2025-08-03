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
  type: 'background' | 'professional' | 'technical';
  title: string;
  description: string;
  questions: InterviewQuestion[];
  evaluationCriteria: string[];
}

export interface InterviewResponse {
  question: string;
  answer: string;
  followUp?: string;
}

// Comprehensive final profile structure based on all 3 interviews
export interface ComprehensiveFinalProfile {
  candidateSummary: string; // Role-focused snapshot with "but" statements
  softSkillsOverview: {
    strengths: string[];
    gaps: string[];
    communicationAbility: string;
    emotionalIntelligence: string;
    leadership: string;
  };
  technicalSkillsEvaluation: {
    authenticSkills: string[];
    claimedButUnverified: string[];
    depthAssessment: string;
    practicalUnderstanding: string;
  };
  certifications: {
    verified: string[];
    claimed: string[];
    needsVerification: string[];
  };
  gapsAndConcerns: string[];
  finalRecommendation: {
    shouldShortlist: boolean;
    reasoning: string;
    employerQuestions: string[];
  };
  overallScore: number; // 0-100
}

// Cross-validation findings
export interface CrossValidationResult {
  cvProfileAlignment: string[];
  timelineConsistency: string[];
  skillClaimsVerification: string[];
  inconsistencies: string[];
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
    return `Welcome to Plato${name}. I'll be conducting a comprehensive interview process with you today. We'll proceed through three connected phases - background, professional, and technical - to understand your background and capabilities. I'll maintain continuity throughout all phases to build a complete profile.`;
  }

  private getFallbackBackgroundQuestions(): InterviewQuestion[] {
    return [
      { question: "Walk me through your current role and what your typical day looks like." },
      { question: "What led you to your current career path and what transitions have you made?" },
      { question: "Tell me about a professional achievement you're particularly proud of and its impact." },
      { question: "What originally attracted you to your field and how has that motivation evolved?" },
      { question: "Describe the different work environments you've experienced - startups, large companies, etc." },
      { question: "How do you typically approach learning new skills or adapting to change?" },
      { question: "What aspects of your background do you feel best prepare you for your target role?" }
    ];
  }

  private getFallbackProfessionalQuestions(): InterviewQuestion[] {
    return [
      { question: "Tell me about a time you faced conflict in a team. How did you resolve it?" },
      { question: "What's your approach to time management in high-pressure situations?" },
      { question: "Describe your leadership style. Can you give an example from your past role?" },
      { question: "What kind of work culture do you thrive in?" },
      { question: "Tell me about difficult feedback you received and how you reacted." },
      { question: "How do you handle competing priorities and deadlines?" },
      { question: "Describe a situation where you had to adapt quickly to change." }
    ];
  }

  private getFallbackTechnicalQuestions(): InterviewQuestion[] {
    return [
      { question: "Explain how you approach problem-solving in your technical work." },
      { question: "Tell me about a challenging technical project and how you handled it." },
      { question: "How do you stay current with developments in your field?" },
      { question: "Describe your experience with the tools and technologies relevant to your role." },
      { question: "Walk me through your process for learning new technical skills." },
      { question: "Tell me about a time you had to troubleshoot a complex technical issue." },
      { question: "How do you ensure the quality and reliability of your work?" }
    ];
  }

  async generateComprehensiveInterviewSets(userData: any, resumeContent?: string): Promise<InterviewSet[]> {
    // Generate all three interview sets: personal, professional, and technical
    
    const personalSet = await this.generatePersonalInterview(userData, resumeContent);
    const professionalSet = await this.generateProfessionalInterview(userData, resumeContent);
    const technicalSet = await this.generateTechnicalInterview(userData, resumeContent);
    
    return [personalSet, professionalSet, technicalSet];
  }

  // Stage 1: Background Interview - Education, work history, achievements, motivations, career trajectory
  async generateBackgroundInterview(userData: any, resumeContent?: string): Promise<InterviewSet> {
    const prompt = `You are conducting Stage 1: Background Interview. This evaluates education, work history, achievements, motivations, and career trajectory through cross-analysis of CV and profile data.

COMPLETE CANDIDATE DATA FOR CROSS-ANALYSIS:
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

BACKGROUND INTERVIEW OBJECTIVES:
✅ Cross-validate CV dates, roles, and timeline consistency
✅ Understand educational path and career entry point  
✅ Assess ability to articulate growth and reflection
✅ Identify career transitions and reasoning
✅ Evaluate storytelling clarity and engagement
✅ Check alignment between CV claims and described responsibilities

REQUIRED QUESTION STRUCTURE:
1. "Walk me through your most recent role as [specific title from CV/profile]. What were your daily tasks?"
2. "Why did you transition from [previous role from CV] to [current role from CV]?"
3. "Tell me about a time you felt proud of your work. What was the impact?"
4. "What prompted you to enter [their field based on education/experience]?"
5. "What kind of environments have you worked in — startups, corporates, freelance?" (Reference their actual companies)
6. Ask about specific achievements mentioned in CV but probe for details
7. Address any timeline gaps or transitions visible in their background

EVALUATION CRITERIA TO ASSESS:
- Timeline consistency between roles and dates
- Alignment between job titles and described responsibilities  
- Depth of explanation and ability to reflect on growth
- Storytelling clarity, engagement, and relevance

Return ONLY JSON:
{
  "questions": [
    "Walk me through your most recent role as [specific title]. What were your daily tasks?",
    "Why did you transition from [previous role] to [current role]?", 
    "Tell me about a time you felt proud of your work. What was the impact?",
    "What prompted you to enter [their field]?",
    "What kind of environments have you worked in — startups, corporates, freelance?",
    "Specific question about achievements from CV/profile",
    "Question addressing timeline gaps or transitions"
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
        type: 'background',
        title: 'Background Interview',
        description: 'Understanding your education, work history, and career trajectory',
        questions: result.questions?.map((q: any) => typeof q === 'string' ? { question: q } : q) || this.getFallbackBackgroundQuestions(),
        evaluationCriteria: [
          'Timeline consistency between roles and dates',
          'Alignment between job titles and described responsibilities',
          'Depth of explanation and ability to reflect on growth',
          'Storytelling clarity, engagement, and relevance'
        ]
      };
    } catch (error) {
      console.error("Error generating background interview:", error);
      return {
        type: 'background',
        title: 'Background Interview',
        description: 'Understanding your education, work history, and career trajectory',
        questions: this.getFallbackBackgroundQuestions(),
        evaluationCriteria: [
          'Timeline consistency between roles and dates',
          'Alignment between job titles and described responsibilities',
          'Depth of explanation and ability to reflect on growth',
          'Storytelling clarity, engagement, and relevance'
        ]
      };
    }
  }

  // Stage 2: Professional Interview - Soft skills, behavioral fit, conflict resolution, leadership
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
        title: 'Professional Interview (Soft Skills)',
        description: 'Assessing behavioral fit, communication, and leadership abilities',
        questions: result.questions?.map((q: any) => typeof q === 'string' ? { question: q } : q) || this.getFallbackProfessionalQuestions(),
        evaluationCriteria: [
          'Specificity vs generality in answers',
          'Communication ability and emotional intelligence',
          'Alignment between declared personality traits and examples',
          'Leadership, collaboration, adaptability, and maturity indicators'
        ]
      };
    } catch (error) {
      console.error("Error generating professional interview:", error);
      return {
        type: 'professional',
        title: 'Professional Interview (Soft Skills)',
        description: 'Assessing behavioral fit, communication, and leadership abilities',
        questions: this.getFallbackProfessionalQuestions(),
        evaluationCriteria: [
          'Specificity vs generality in answers',
          'Communication ability and emotional intelligence',
          'Alignment between declared personality traits and examples',
          'Leadership, collaboration, adaptability, and maturity indicators'
        ]
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

  // Method to generate comprehensive final profile after all 3 interviews
  async generateComprehensiveFinalProfile(
    userData: any, 
    resumeContent: string, 
    backgroundInterview: any, 
    professionalInterview: any, 
    technicalInterview: any
  ): Promise<any> {
    const prompt = `You are conducting the FINAL EVALUATION after completing all three comprehensive interviews. Your task is to generate a single, honest, comprehensive, and reliable final profile by cross-analyzing CV, profile data, and ALL interview responses.

COMPLETE CANDIDATE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Years of Experience: ${userData.yearsOfExperience}` : ''}
${userData?.education ? `Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}` : ''}
${userData?.skills ? `Skills: ${userData.skills.join(', ')}` : ''}
${userData?.certifications ? `Certifications: ${userData.certifications}` : ''}
${resumeContent ? `RESUME CONTENT: ${resumeContent}` : ''}

INTERVIEW RESPONSES TO ANALYZE:
Stage 1 - Background Interview: ${JSON.stringify(backgroundInterview)}
Stage 2 - Professional Interview: ${JSON.stringify(professionalInterview)}  
Stage 3 - Technical Interview: ${JSON.stringify(technicalInterview)}

CRITICAL EVALUATION REQUIREMENTS:
✅ Cross-validate CV, profile, and interview responses for inconsistencies
✅ Assess timeline consistency and role/responsibility alignment
✅ Evaluate depth vs surface-level understanding
✅ Check for authentic examples vs vague/generic answers
✅ Identify claimed skills/certifications lacking verification
✅ Note gaps, red flags, and unsupported claims

FINAL PROFILE STRUCTURE - BE BRUTALLY HONEST:
1. Candidate Summary: Role-focused snapshot with "but" statements (e.g., "Strong project experience, but lacked detail in communication examples")
2. Soft Skills: Strengths AND gaps - avoid promotional language
3. Technical Skills: Authentic skills vs claimed but unverified vs buzzword dropping
4. Certifications: Verified vs claimed vs needs verification
5. Gaps & Concerns: Red flags, vague answers, timeline gaps, unsupported claims
6. Final Recommendation: Should they be shortlisted? What should employer ask face-to-face?
7. Overall Score: 0-100 based on all evidence

ASSESSMENT STANDARDS:
- Never be overly positive - provide balanced, critical analysis
- Always include "but" statements highlighting weaknesses
- Flag discrepancies between claimed skills and demonstrated knowledge
- Note when answers were vague, generic, or lacked specificity
- Cross-reference claimed certifications with actual evidence
- Highlight timeline inconsistencies or gaps

Return ONLY JSON:
{
  "candidateSummary": "Honest role-focused snapshot with 'but' statements",
  "softSkillsOverview": {
    "strengths": ["verified strength 1", "verified strength 2"],
    "gaps": ["identified gap 1", "identified gap 2"],
    "communicationAbility": "assessment with specifics",
    "emotionalIntelligence": "assessment with evidence",
    "leadership": "assessment with concrete examples or lack thereof"
  },
  "technicalSkillsEvaluation": {
    "authenticSkills": ["skills with demonstrated competency"],
    "claimedButUnverified": ["skills mentioned but not validated"],
    "depthAssessment": "surface-level vs deep understanding analysis",
    "practicalUnderstanding": "evidence of hands-on experience vs theoretical"
  },
  "certifications": {
    "verified": ["certifications with evidence"],
    "claimed": ["mentioned but unverified"],
    "needsVerification": ["require document verification"]
  },
  "gapsAndConcerns": ["red flag 1", "vague answer pattern", "timeline gap", "unsupported claim"],
  "finalRecommendation": {
    "shouldShortlist": true/false,
    "reasoning": "honest assessment based on all evidence",
    "employerQuestions": ["what employer should ask to probe deeper"]
  },
  "overallScore": 85
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3 // Lower temperature for more consistent evaluation
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error("Error generating comprehensive final profile:", error);
      throw new Error("Failed to generate comprehensive final profile");
    }
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
  generateBackgroundInterview: aiInterviewAgent.generateBackgroundInterview.bind(aiInterviewAgent),
  generateProfessionalInterview: aiInterviewAgent.generateProfessionalInterview.bind(aiInterviewAgent),
  generateTechnicalInterview: aiInterviewAgent.generateTechnicalInterview.bind(aiInterviewAgent),
  generateComprehensiveFinalProfile: aiInterviewAgent.generateComprehensiveFinalProfile.bind(aiInterviewAgent),
  generateProfile: aiProfileAnalysisAgent.generateComprehensiveProfile.bind(aiProfileAnalysisAgent),
  parseResume: aiProfileAnalysisAgent.parseResume.bind(aiProfileAnalysisAgent),
  analyzeJobApplication: aiInterviewAgent.analyzeJobApplication.bind(aiInterviewAgent),
  // For backward compatibility - alias personal interview to background interview
  generatePersonalInterview: aiInterviewAgent.generateBackgroundInterview.bind(aiInterviewAgent)
};