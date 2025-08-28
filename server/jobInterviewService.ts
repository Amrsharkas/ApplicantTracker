import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface JobSpecificInterviewQuestion {
  question: string;
  context: string;
  expectedSkills: string[];
}

export interface JobInterviewAnalysis {
  overallScore: number;
  skillsAssessment: {
    skill: string;
    score: number;
    evidence: string;
    gaps: string[];
  }[];
  roleCompatibility: {
    score: number;
    strengths: string[];
    concerns: string[];
  };
  recommendation: {
    qualified: boolean;
    reasoning: string;
    nextSteps: string[];
  };
  detailedFeedback: string;
}

export interface JobPostingData {
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  requirements?: string;
  skills?: string[];
}

export class JobInterviewService {
  
  async generateJobSpecificQuestions(
    jobData: JobPostingData, 
    language: string = 'english'
  ): Promise<JobSpecificInterviewQuestion[]> {
    const prompt = `You are an expert AI interviewer conducting a role-specific interview for a ${jobData.jobTitle} position at ${jobData.companyName}.

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Ask all questions in Egyptian Arabic dialect (اللهجة المصرية العامية). Use casual Egyptian slang like "إزيك", "عامل إيه", "يلا", "معلش", "ماشي", "كدا", "دي", "ليه", "فين". Talk like you\'re having a friendly chat in a Cairo coffee shop. ABSOLUTELY FORBIDDEN: formal Arabic (فصحى).' : 'LANGUAGE INSTRUCTION: Ask all questions in English.'}

JOB DETAILS:
- Position: ${jobData.jobTitle}
- Company: ${jobData.companyName}
- Description: ${jobData.jobDescription}
${jobData.requirements ? `- Requirements: ${jobData.requirements}` : ''}
${jobData.skills?.length ? `- Required Skills: ${jobData.skills.join(', ')}` : ''}

Generate exactly 10 progressive interview questions that:
1. Start with role-specific motivation and interest
2. Assess understanding of the job requirements
3. Evaluate relevant technical/functional skills
4. Test problem-solving for role-specific scenarios
5. Explore experience with similar responsibilities
6. Check cultural fit with the company
7. Assess ability to handle job-specific challenges
8. Evaluate knowledge of industry/domain
9. Test adaptability to company's work environment
10. Close with commitment and availability

Make each question highly specific to this role and company. Reference the job requirements and skills naturally.

Return ONLY a JSON array in this format:
[
  {
    "question": "Question text here",
    "context": "Why this question matters for the role",
    "expectedSkills": ["skill1", "skill2", "skill3"]
  }
]`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{"questions":[]}');
      
      // Handle different response formats
      if (result.questions && Array.isArray(result.questions)) {
        return result.questions;
      } else if (Array.isArray(result)) {
        return result;
      } else {
        // Fallback questions
        return this.getFallbackQuestions(jobData, language);
      }
      
    } catch (error) {
      console.error("Error generating job-specific questions:", error);
      return this.getFallbackQuestions(jobData, language);
    }
  }

  private getFallbackQuestions(jobData: JobPostingData, language: string): JobSpecificInterviewQuestion[] {
    const isArabic = language === 'arabic';
    
    return [
      {
        question: isArabic ? 
          `إيه اللي خلاك مهتم بوظيفة ${jobData.jobTitle} في ${jobData.companyName}؟` :
          `What interests you about the ${jobData.jobTitle} position at ${jobData.companyName}?`,
        context: "Assessing genuine interest and research about the role",
        expectedSkills: ["communication", "research", "motivation"]
      },
      {
        question: isArabic ?
          `بناءً على وصف الوظيفة، إيه فهمك للمسؤوليات الأساسية لدور ${jobData.jobTitle}؟` :
          `Based on the job description, what do you understand to be the key responsibilities of a ${jobData.jobTitle}?`,
        context: "Testing comprehension of role requirements",
        expectedSkills: ["analytical thinking", "role understanding"]
      },
      {
        question: isArabic ?
          `إيه الخبرة اللي عندك في المهارات المطلوبة للدور ده؟` :
          `What experience do you have with the skills required for this role?`,
        context: "Evaluating relevant technical and soft skills",
        expectedSkills: jobData.skills || ["relevant experience"]
      }
    ];
  }

  async analyzeJobInterviewResponses(
    jobData: JobPostingData,
    questions: JobSpecificInterviewQuestion[],
    responses: { question: string; answer: string }[],
    language: string = 'english'
  ): Promise<JobInterviewAnalysis> {
    const prompt = `You are an expert hiring manager analyzing a candidate's interview responses for a ${jobData.jobTitle} position at ${jobData.companyName}.

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Provide analysis in Egyptian Arabic dialect when possible, but use English for technical terms and scores.' : 'LANGUAGE INSTRUCTION: Provide analysis entirely in English.'}

JOB DETAILS:
- Position: ${jobData.jobTitle}
- Company: ${jobData.companyName}
- Description: ${jobData.jobDescription}
${jobData.requirements ? `- Requirements: ${jobData.requirements}` : ''}
${jobData.skills?.length ? `- Required Skills: ${jobData.skills.join(', ')}` : ''}

INTERVIEW QUESTIONS AND RESPONSES:
${responses.map((r, i) => `
Q${i+1}: ${r.question}
Answer: ${r.answer}
Expected Skills: ${questions[i]?.expectedSkills?.join(', ') || 'N/A'}
`).join('\n')}

Provide a comprehensive analysis in JSON format:

{
  "overallScore": number (0-100),
  "skillsAssessment": [
    {
      "skill": "skill name",
      "score": number (0-10),
      "evidence": "evidence from responses",
      "gaps": ["specific gaps identified"]
    }
  ],
  "roleCompatibility": {
    "score": number (0-100),
    "strengths": ["candidate strengths for this role"],
    "concerns": ["concerns or weaknesses"]
  },
  "recommendation": {
    "qualified": boolean,
    "reasoning": "detailed reasoning for recommendation",
    "nextSteps": ["recommended next steps"]
  },
  "detailedFeedback": "comprehensive feedback summary"
}

Be brutally honest but constructive. Focus on role-specific competencies and cultural fit.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 3000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        overallScore: result.overallScore || 50,
        skillsAssessment: result.skillsAssessment || [],
        roleCompatibility: result.roleCompatibility || { score: 50, strengths: [], concerns: [] },
        recommendation: result.recommendation || { 
          qualified: false, 
          reasoning: "Analysis incomplete", 
          nextSteps: [] 
        },
        detailedFeedback: result.detailedFeedback || "Interview analysis completed."
      };
      
    } catch (error) {
      console.error("Error analyzing interview responses:", error);
      
      // Return basic analysis as fallback
      return {
        overallScore: 50,
        skillsAssessment: [],
        roleCompatibility: { 
          score: 50, 
          strengths: ["Participated in interview"], 
          concerns: ["Analysis incomplete"] 
        },
        recommendation: { 
          qualified: false, 
          reasoning: "Unable to complete analysis due to technical error", 
          nextSteps: ["Retry interview or contact support"] 
        },
        detailedFeedback: "Interview completed but analysis encountered technical difficulties."
      };
    }
  }

  async generateRealtimeInstructions(
    jobData: JobPostingData,
    questions: JobSpecificInterviewQuestion[],
    language: string = 'english'
  ): Promise<string> {
    return `You are an expert AI interviewer conducting a job-specific interview for a ${jobData.jobTitle} position at ${jobData.companyName}.

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Conduct this interview in Egyptian Arabic dialect (اللهجة المصرية العامية). Use casual Egyptian slang like "إزيك", "عامل إيه", "يلا", "معلش", "ماشي", "كدا", "دي". Talk like you\'re having a friendly conversation in Cairo. FORBIDDEN: formal Arabic.' : 'LANGUAGE INSTRUCTION: Conduct this interview entirely in English.'}

JOB CONTEXT:
- Position: ${jobData.jobTitle}
- Company: ${jobData.companyName}
- Key Requirements: ${jobData.skills?.join(', ') || 'See job description'}

INTERVIEW QUESTIONS TO ASK:
${questions.map((q, i) => `${i+1}. ${q.question} (Focus: ${q.expectedSkills.join(', ')})`).join('\n')}

INSTRUCTIONS:
1. Ask questions one at a time, in order
2. Listen carefully to responses and ask natural follow-up questions
3. Keep responses concise and professional
4. Reference the specific job requirements naturally
5. Maintain a balance between being thorough and respectful of time
6. After all questions, thank them and explain next steps

Start with a brief welcome and ask the first question.`;
  }
}

export const jobInterviewService = new JobInterviewService();