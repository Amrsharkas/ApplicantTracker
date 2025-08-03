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

// Enhanced AI Interview System with Cross-Analysis
export class AIInterviewAgent {
  public openai = openai;

  async generateWelcomeMessage(userData: any, interviewType: 'background' | 'professional' | 'technical'): Promise<string> {
    const interviewTypeNames = {
      background: 'Background Interview',
      professional: 'Professional Skills Interview', 
      technical: 'Technical Interview'
    };

    const prompt = `You are an AI interviewer for Plato, an AI-powered job matching platform. Generate a professional welcome message for a candidate.

CANDIDATE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : 'Candidate'}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}

INTERVIEW TYPE: ${interviewTypeNames[interviewType]}

Create a professional welcome message that:
1. Welcomes them to this specific interview phase
2. Explains what this interview will cover
3. Mentions you'll cross-reference their CV, profile, and any previous interviews
4. Sets a professional, analytical tone
5. Personalizes it with their name if available

Keep it professional and direct - this is an assessment interview. 2-3 sentences maximum.

Return ONLY the welcome message text, no JSON or additional formatting.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0].message.content?.trim() || this.getFallbackWelcomeMessage(userData?.firstName, interviewType);
    } catch (error) {
      console.error("Error generating welcome message:", error);
      return this.getFallbackWelcomeMessage(userData?.firstName, interviewType);
    }
  }

  private getFallbackWelcomeMessage(firstName?: string, interviewType?: string): string {
    const name = firstName ? `, ${firstName}` : '';
    const typeText = interviewType ? ` ${interviewType}` : '';
    return `Welcome to Plato${name}. I'll be conducting your${typeText} interview today to assess your background and capabilities thoroughly.`;
  }

  // Generate interview questions with cross-analysis of CV, profile, and previous interviews
  async generateInterviewQuestions(
    interviewType: 'background' | 'professional' | 'technical',
    userData: any,
    resumeContent?: string,
    previousInterviews?: any[]
  ): Promise<InterviewQuestion[]> {
    
    const prompts = {
      background: this.getBackgroundInterviewPrompt(userData, resumeContent, previousInterviews),
      professional: this.getProfessionalInterviewPrompt(userData, resumeContent, previousInterviews),
      technical: this.getTechnicalInterviewPrompt(userData, resumeContent, previousInterviews)
    };

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompts[interviewType] }],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
      return result.questions || [];
    } catch (error) {
      console.error(`Error generating ${interviewType} interview questions:`, error);
      return this.getFallbackQuestions(interviewType);
    }
  }

  private getBackgroundInterviewPrompt(userData: any, resumeContent?: string, previousInterviews?: any[]): string {
    return `You are an AI interviewer conducting a Background Interview as part of a comprehensive assessment process.

CRITICAL CROSS-ANALYSIS REQUIREMENTS:
✅ CV Analysis: Extract job titles, responsibilities, tools, dates, education, achievements
✅ Profile Data: Cross-validate with manually filled information
✅ Previous Interviews: Reference earlier answers and build upon them
✅ Discrepancy Detection: If CV mentions skills/tools omitted in profile/interviews, PROBE FURTHER

CANDIDATE PROFILE:
${userData?.name ? `Name: ${userData.name}` : ''}
${userData?.email ? `Email: ${userData.email}` : ''}
${userData?.phone ? `Phone: ${userData.phone}` : ''}
${userData?.country || userData?.city ? `Location: ${userData.country || ''} ${userData.city || ''}` : ''}
${userData?.birthdate ? `Birthdate: ${userData.birthdate}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}
${userData?.education ? `Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}` : ''}
${userData?.careerLevel ? `Career Level: ${userData.careerLevel}` : ''}
${userData?.jobSearchStatus ? `Job Search Status: ${userData.jobSearchStatus}` : ''}

CV CONTENT:
${resumeContent || 'No resume uploaded'}

PREVIOUS INTERVIEWS:
${previousInterviews?.length ? previousInterviews.map(i => `${i.interviewType}: ${JSON.stringify(i.sessionData)}`).join('\n') : 'None completed'}

BACKGROUND INTERVIEW REQUIREMENTS:
🟠 PURPOSE: Understand education, work history, achievements, motivations, career trajectory
🟠 CROSS-VALIDATE: Timeline consistency, role alignment, depth of explanations

Generate 5-7 targeted questions in JSON format:
{
  "questions": [
    {
      "question": "Walk me through your most recent role as [title from CV/profile]. What were your daily tasks?",
      "context": "Validating CV job title against actual responsibilities"
    },
    {
      "question": "Why did you transition from [previous role] to [current role]?",
      "context": "Checking career progression logic and timeline consistency"
    }
  ]
}

EVALUATION CRITERIA:
- Timeline consistency between roles and dates
- Alignment between job titles and described responsibilities  
- Depth of explanation and ability to reflect on growth
- Storytelling clarity, engagement, and relevance

Return ONLY the JSON object with questions that specifically reference their CV/profile data.`;
  }

  private getProfessionalInterviewPrompt(userData: any, resumeContent?: string, previousInterviews?: any[]): string {
    return `You are an AI interviewer conducting a Professional Skills Interview (soft skills assessment).

CRITICAL CROSS-ANALYSIS REQUIREMENTS:
✅ CV Analysis: Extract leadership roles, team sizes, company cultures
✅ Profile Data: Cross-validate claimed soft skills with examples
✅ Background Interview: Reference previous answers about roles/challenges
✅ Behavioral Validation: Probe for specific examples, not generalizations

CANDIDATE DATA:
${userData?.name ? `Name: ${userData.name}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}
${userData?.workplaceSettings ? `Work Style: ${userData.workplaceSettings}` : ''}
${userData?.careerLevel ? `Career Level: ${userData.careerLevel}` : ''}

CV CONTENT:
${resumeContent || 'No resume uploaded'}

PREVIOUS INTERVIEWS:
${previousInterviews?.length ? previousInterviews.map(i => `${i.interviewType}: Key points - ${JSON.stringify(i.sessionData)}`).join('\n') : 'None completed'}

🟡 PROFESSIONAL INTERVIEW REQUIREMENTS:
PURPOSE: Assess soft skills, behavioral fit, critical thinking, communication, conflict resolution, leadership, emotional intelligence

Generate 5-7 behavioral questions in JSON format:
{
  "questions": [
    {
      "question": "Tell me about a time you faced conflict in a team. How did you resolve it?",
      "context": "Testing conflict resolution and emotional intelligence"
    },
    {
      "question": "What's your approach to time management in high-pressure situations?",
      "context": "Assessing stress management and organizational skills"
    }
  ]
}

EVALUATION CRITERIA:
- Specificity vs generality in answers
- Communication ability and emotional intelligence
- Alignment between declared personality traits and examples
- Evidence of leadership, collaboration, adaptability, maturity

Reference their background interview answers and CV experiences when asking questions.`;
  }

  private getTechnicalInterviewPrompt(userData: any, resumeContent?: string, previousInterviews?: any[]): string {
    return `You are an AI interviewer conducting a Technical Interview for domain expertise assessment.

CRITICAL CROSS-ANALYSIS REQUIREMENTS:
✅ CV Analysis: Extract all technical skills, tools, certifications, projects
✅ Profile Data: Cross-validate claimed technical competencies
✅ Previous Interviews: Reference technical mentions from background/professional phases
✅ Certification Validation: If certifications claimed but no documents, FLAG FOR VERIFICATION

CANDIDATE DATA:
${userData?.name ? `Name: ${userData.name}` : ''}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}
${userData?.education ? `Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}` : ''}
${userData?.certifications ? `Certifications: ${userData.certifications.join(', ')}` : ''}

CV CONTENT:
${resumeContent || 'No resume uploaded'}

PREVIOUS INTERVIEWS:
${previousInterviews?.length ? previousInterviews.map(i => `${i.interviewType}: ${JSON.stringify(i.sessionData)}`).join('\n') : 'None completed'}

🔵 TECHNICAL INTERVIEW REQUIREMENTS:
PURPOSE: Evaluate domain expertise, technical competencies, problem-solving, tool familiarity, certifications

Generate 5-7 technical questions in JSON format:
{
  "questions": [
    {
      "question": "Explain how you used [specific tool from CV] in a real project.",
      "context": "Validating claimed tool experience with practical examples"
    },
    {
      "question": "What's a recent technical challenge you faced, and how did you solve it?",
      "context": "Testing problem-solving approach and technical depth"
    }
  ]
}

EVALUATION CRITERIA:
- Authenticity and clarity of technical examples
- Tool knowledge vs buzzword dropping
- Depth of understanding vs surface-level explanations
- Certification verification (flag if claimed but unverified)

If candidate claims certifications without uploaded documents, include this question:
"I see you've mentioned [certification]. Can you walk me through a specific project where you applied these certified skills?"

Return ONLY the JSON object with role-specific technical questions.`;
  }

  private getFallbackQuestions(interviewType: 'background' | 'professional' | 'technical'): InterviewQuestion[] {
    const fallbacks = {
      background: [
        { question: "Tell me about your career journey so far.", context: "General background assessment" },
        { question: "What motivated you to enter this field?", context: "Understanding career motivations" },
        { question: "Describe your most significant professional achievement.", context: "Assessing accomplishments" }
      ],
      professional: [
        { question: "How do you handle challenging situations at work?", context: "Stress management assessment" },
        { question: "Describe your communication style with team members.", context: "Communication skills evaluation" },
        { question: "Tell me about a time you had to adapt to change.", context: "Adaptability assessment" }
      ],
      technical: [
        { question: "What technical skills do you consider your strongest?", context: "Technical competency assessment" },
        { question: "How do you stay updated with industry trends?", context: "Continuous learning evaluation" },
        { question: "Describe a technical problem you solved recently.", context: "Problem-solving assessment" }
      ]
    };
    return fallbacks[interviewType];
  }

  // Process interview responses and analyze answer consistency
  async analyzeInterviewResponse(
    question: string,
    answer: string,
    interviewType: 'background' | 'professional' | 'technical',
    userData: any,
    resumeContent?: string,
    previousInterviews?: any[]
  ): Promise<{ followUp?: string; concerns?: string[] }> {
    
    const prompt = `You are analyzing an interview response for consistency and depth.

QUESTION: ${question}
ANSWER: ${answer}
INTERVIEW TYPE: ${interviewType}

CROSS-REFERENCE DATA:
PROFILE: ${JSON.stringify(userData)}
CV: ${resumeContent || 'None'}
PREVIOUS INTERVIEWS: ${previousInterviews?.length ? JSON.stringify(previousInterviews) : 'None'}

ANALYZE FOR:
✅ Consistency with CV claims
✅ Alignment with profile data  
✅ Depth vs surface-level responses
✅ Specific examples vs generalizations
✅ Contradictions with previous answers

Generate response analysis in JSON:
{
  "followUp": "Follow-up question if needed (or null)",
  "concerns": ["Array of any inconsistencies or concerns found"]
}

Only generate follow-up if the answer lacks depth, contradicts other data, or needs clarification.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        followUp: result.followUp || undefined,
        concerns: result.concerns || []
      };
    } catch (error) {
      console.error("Error analyzing interview response:", error);
      return {};
    }
  }
}

// AI Agent 2: Profile Analyzer - generates comprehensive final profiles after all interviews
export class AIProfileAnalyzer {
  public openai = openai;

  async generateComprehensiveFinalProfile(
    userData: any,
    resumeContent: string,
    allInterviews: any[] // All three completed interviews
  ): Promise<any> {
    
    const prompt = `You are an AI Profile Analyzer generating a FINAL COMPREHENSIVE CANDIDATE PROFILE after all interviews are complete.

CRITICAL: This profile is FOR EMPLOYERS ONLY - be brutally honest, evidence-based, and analytical. Do NOT sugar-coat anything.

CANDIDATE DATA:
${JSON.stringify(userData, null, 2)}

CV CONTENT:
${resumeContent || 'No resume provided'}

COMPLETED INTERVIEWS:
${allInterviews.map(interview => `
${(interview.interviewType || interview.question || 'INTERVIEW').toUpperCase()} INTERVIEW:
${JSON.stringify(interview.sessionData || interview, null, 2)}
`).join('\n')}

COMPREHENSIVE ANALYSIS REQUIREMENTS:

🔴 CROSS-VALIDATION ANALYSIS:
✅ Compare CV claims vs interview responses vs profile data
✅ Identify discrepancies, exaggerations, or gaps
✅ Flag unverified certifications or skills
✅ Note timeline inconsistencies or role misalignments

🔴 EVIDENCE-BASED ASSESSMENT:
✅ Rate each skill/competency with evidence from interviews (0-100)
✅ Distinguish between claimed vs demonstrated abilities
✅ Identify specific strengths with concrete examples
✅ Document weaknesses and knowledge gaps clearly

🔴 EMPLOYER RECOMMENDATIONS:
✅ Suitable roles and why
✅ Required additional training/certifications
✅ Team fit and management considerations
✅ Risk factors and mitigation strategies

Generate the final profile in JSON format:
{
  "candidateOverview": {
    "name": "Full name",
    "currentRole": "Title and company",
    "yearsOfExperience": "Number with verification notes",
    "overallScore": 0-100,
    "riskLevel": "LOW/MEDIUM/HIGH with justification"
  },
  "technicalCompetencies": [
    {
      "skill": "Skill name",
      "claimedLevel": "What they claimed",
      "verifiedLevel": "Evidence-based assessment", 
      "evidenceScore": 0-100,
      "evidence": "Specific examples from interviews",
      "concerns": ["Any red flags or gaps"]
    }
  ],
  "professionalSkills": [
    {
      "skill": "Soft skill name",
      "rating": 0-100,
      "evidence": "Behavioral examples from interviews",
      "concerns": ["Areas for improvement"]
    }
  ],
  "workHistory": {
    "consistencyScore": 0-100,
    "verifiedRoles": ["Roles confirmed through interview depth"],
    "questionableClems": ["Claims lacking depth or contradictory"],
    "careerProgression": "Analysis of growth trajectory"
  },
  "redFlags": [
    "Any concerning inconsistencies or gaps"
  ],
  "strengths": [
    "Evidence-based strengths with examples"
  ],
  "developmentAreas": [
    "Specific gaps or weaknesses identified"
  ],
  "employerRecommendations": {
    "idealRoles": ["Specific role types they'd excel in"],
    "requiredSupport": ["Training/mentoring needs"],
    "teamFit": "Management and collaboration assessment",
    "compensationRange": "Justified salary recommendation",
    "hiringRisk": "LOW/MEDIUM/HIGH with mitigation strategies"
  },
  "interviewQuality": {
    "communicationScore": 0-100,
    "depthScore": 0-100,
    "honestyScore": 0-100,
    "preparationScore": 0-100
  }
}

BE DIRECT AND HONEST - this profile determines hiring decisions. Focus on FACTS and EVIDENCE, not assumptions.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const profile = JSON.parse(response.choices[0].message.content || '{}');
      return profile;
    } catch (error) {
      console.error("Error generating comprehensive profile:", error);
      return this.getFallbackProfile(userData);
    }
  }

  private getFallbackProfile(userData: any): any {
    return {
      candidateOverview: {
        name: userData?.name || 'Unknown',
        currentRole: userData?.currentRole || 'Not specified',
        yearsOfExperience: userData?.yearsOfExperience || 'Unknown',
        overallScore: 50,
        riskLevel: "HIGH - Profile generation failed"
      },
      technicalCompetencies: [],
      professionalSkills: [],
      workHistory: {
        consistencyScore: 0,
        verifiedRoles: [],
        questionableClems: ["Profile generation failed - manual review required"],
        careerProgression: "Unable to assess"
      },
      redFlags: ["AI analysis failed - requires manual interview review"],
      strengths: [],
      developmentAreas: ["Complete assessment required"],
      employerRecommendations: {
        idealRoles: [],
        requiredSupport: ["Manual profile review needed"],
        teamFit: "Unable to assess",
        compensationRange: "Unknown",
        hiringRisk: "HIGH - Missing analysis"
      },
      interviewQuality: {
        communicationScore: 0,
        depthScore: 0,
        honestyScore: 0,
        preparationScore: 0
      }
    };
  }
}

// Create instances
export const aiInterviewAgent = new AIInterviewAgent();
export const aiProfileAnalyzer = new AIProfileAnalyzer();