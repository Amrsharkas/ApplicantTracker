import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { wrapOpenAIRequest } from "./openaiTracker";

// Using the latest OpenAI model gpt-4o (May 13, 2024). Note: ChatGPT-5 is not yet publicly available
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
  matchScorePercentage?: number;
  experiencePercentage?: number;
  techSkillsPercentage?: number;
  culturalFitPercentage?: number;
  brutallyHonestProfile?: any;
}

// AI Agent 1: Interview Conductor - analyzes resume/profile and conducts personalized interviews
export class AIInterviewAgent {
  public openai = openai;

  async generateWelcomeMessage(userData: any, language: string = 'english'): Promise<string> {
    const prompt = `You are an AI interviewer for Plato, an AI-powered job matching platform. Generate a professional welcome message for a candidate starting their comprehensive interview process.

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Generate this welcome message ONLY in Egyptian Arabic dialect (اللهجة المصرية العامية). You MUST use casual Egyptian slang like "إزيك" (how are you), "عامل إيه" (how are you doing), "يلا" (come on), "معلش" (never mind), "ماشي" (okay), "ربنا يوفقك" (good luck), "هو ده" (that\'s it), "خلاص" (done), "كدا" (like this), "دي" (this). Use informal pronouns like "انت" not "أنت". Replace formal words: say "دي" not "هذه", "كدا" not "هكذا", "ليه" not "لماذا", "فين" not "أين". Talk like you\'re in a Cairo coffee shop having a friendly chat. ABSOLUTELY FORBIDDEN: formal Arabic (فصحى). Think as an Egyptian having a relaxed conversation.' : 'LANGUAGE INSTRUCTION: Generate this welcome message entirely in English.'}

COMPREHENSIVE CANDIDATE DATA:
${userData?.name ? `Name: ${userData.name}` : 'Candidate'}
${userData?.workExperiences?.[0] ? `Current Role: ${userData.workExperiences[0].position} at ${userData.workExperiences[0].company}` : ''}
${userData?.totalYearsOfExperience ? `Experience: ${userData.totalYearsOfExperience} years` : ''}
${userData?.degrees?.[0] ? `Education: ${userData.degrees[0].degree} in ${userData.degrees[0].field} from ${userData.degrees[0].institution}` : ''}
${userData?.skillsList?.length ? `Key Skills: ${userData.skillsList.slice(0, 3).join(', ')}` : ''}
${userData?.careerLevel ? `Career Level: ${userData.careerLevel}` : ''}
${userData?.jobTitles?.[0] ? `Target Role: ${userData.jobTitles[0]}` : ''}

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
      const messages = language === 'arabic' ? [
        { 
          role: "system" as const, 
          content: "انت مصري من القاهرة وبتتكلم عامية مصرية بس. استخدم كلمات زي 'إزيك' و 'عامل إيه' و 'يلا' و 'معلش' و 'ماشي' و 'كدا' و 'دي'. ممنوع تستخدم فصحى خالص. اتكلم كإنك قاعد في قهوة في وسط البلد."
        },
        { role: "user" as const, content: prompt }
      ] : [
        { role: "user" as const, content: prompt }
      ];

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          temperature: 0.7,
          max_completion_tokens: 200
        }),
        {
          requestType: "generateWelcomeMessage",
          model: "gpt-4o",
          userId: userData?.id,
        }
      );

      return response.choices[0].message.content?.trim() || this.getFallbackWelcomeMessage(userData?.firstName, language);
    } catch (error) {
      console.error("Error generating welcome message:", error);
      return this.getFallbackWelcomeMessage(userData?.firstName, language);
    }
  }

  private getFallbackWelcomeMessage(firstName?: string, language: string = 'english'): string {
    if (language === 'arabic') {
      const name = firstName ? ` يا ${firstName}` : '';
      return `إزيك${name}! أهلاً وسهلاً بيك في بلاتو. أنا هكون المحاور اللي هعمل معاك مقابلة شاملة النهاردة. إحنا هنمر بتلات مراحل مترابطة - شخصية ومهنية وتقنية - عشان نفهم خلفيتك وقدراتك كدا. هحافظ على الاستمرارية في كل المراحل عشان نبني ملف شخصي متكامل. يلا نبدأ!`;
    } else {
      const name = firstName ? `, ${firstName}` : '';
      return `Welcome to Plato${name}. I'll be conducting a comprehensive interview process with you today. We'll proceed through three connected phases - personal, professional, and technical - to understand your background and capabilities. I'll maintain continuity throughout all phases to build a complete profile.`;
    }
  }

  async generateComprehensiveInterviewSets(userData: any, resumeContent?: string): Promise<InterviewSet[]> {
    // Generate all three interview sets: personal, professional, and technical
    
    const personalSet = await this.generatePersonalInterview(userData, resumeContent);
    const professionalSet = await this.generateProfessionalInterview(userData, resumeContent);
    const technicalSet = await this.generateTechnicalInterview(userData, resumeContent);
    
    return [personalSet, professionalSet, technicalSet];
  }

  async generatePersonalInterview(userData: any, resumeContent?: string, resumeAnalysis?: any, language: string = 'english'): Promise<InterviewSet> {
    const prompt = `You are a continuous AI interviewer conducting the Background phase of a comprehensive interview process. 

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Conduct this interview ONLY in Egyptian Arabic dialect (اللهجة المصرية العامية). You MUST use casual Egyptian slang like "إزيك" (how are you), "عامل إيه" (how are you doing), "يلا" (come on), "معلش" (never mind), "ماشي" (okay), "ربنا يوفقك" (good luck), "هو ده" (that\'s it), "خلاص" (done), "كدا" (like this), "دي" (this). Use informal pronouns like "انت" not "أنت". Replace formal words: say "دي" not "هذه", "كدا" not "هكذا", "ليه" not "لماذا", "فين" not "أين". Talk like you\'re in a Cairo coffee shop having a friendly chat. ABSOLUTELY FORBIDDEN: formal Arabic (فصحى). Think as an Egyptian having a relaxed conversation.' : 'LANGUAGE INSTRUCTION: Conduct this interview entirely in English.'}

CRITICAL: You must first analyze the candidate's profile in full detail before asking any questions. You already know about this candidate and must reference their profile naturally in your questions.

COMPREHENSIVE CANDIDATE PROFILE DATA:
=== PERSONAL DETAILS ===
${userData?.name ? `Full Name: ${userData.name}` : ''}
${userData?.email ? `Email: ${userData.email}` : ''}
${userData?.phone ? `Phone: ${userData.phone}` : ''}
${userData?.birthdate ? `Date of Birth: ${new Date(userData.birthdate).toLocaleDateString()}` : ''}
${userData?.gender ? `Gender: ${userData.gender}` : ''}
${userData?.nationality ? `Nationality: ${userData.nationality}` : ''}
${userData?.maritalStatus ? `Marital Status: ${userData.maritalStatus}` : ''}
${userData?.dependents ? `Dependents: ${userData.dependents}` : ''}
${userData?.militaryStatus ? `Military Status: ${userData.militaryStatus}` : ''}

=== LOCATION & MOBILITY ===
${userData?.country ? `Country: ${userData.country}` : ''}
${userData?.city ? `City: ${userData.city}` : ''}
${userData?.willingToRelocate !== undefined ? `Willing to Relocate: ${userData.willingToRelocate ? 'Yes' : 'No'}` : ''}
${userData?.preferredWorkCountries?.length ? `Preferred Work Countries: ${userData.preferredWorkCountries.join(', ')}` : ''}
${userData?.workplaceSettings ? `Work Arrangement Preference: ${userData.workplaceSettings}` : ''}

=== ONLINE PRESENCE & PORTFOLIO ===
${userData?.linkedinUrl ? `LinkedIn: ${userData.linkedinUrl}` : ''}
${userData?.githubUrl ? `GitHub: ${userData.githubUrl}` : ''}
${userData?.websiteUrl ? `Personal Website: ${userData.websiteUrl}` : ''}
${userData?.facebookUrl ? `Facebook: ${userData.facebookUrl}` : ''}
${userData?.twitterUrl ? `Twitter: ${userData.twitterUrl}` : ''}
${userData?.instagramUrl ? `Instagram: ${userData.instagramUrl}` : ''}
${userData?.youtubeUrl ? `YouTube: ${userData.youtubeUrl}` : ''}
${userData?.otherUrls?.length ? `Other URLs: ${userData.otherUrls.join(', ')}` : ''}

=== EDUCATION ===
${userData?.currentEducationLevel ? `Current Education Level: ${userData.currentEducationLevel}` : ''}
${userData?.degrees?.length ? `Degrees:\n${userData.degrees.map((deg: any) => `  • ${deg.degree} in ${deg.field || 'N/A'} from ${deg.institution} (${deg.startDate} - ${deg.endDate || 'Present'})${deg.gpa ? ` - GPA: ${deg.gpa}` : ''}`).join('\n')}` : ''}
${userData?.highSchools?.length ? `High School Education:\n${userData.highSchools.map((hs: any) => `  • ${hs.institution} (${hs.startDate} - ${hs.endDate || 'Present'})`).join('\n')}` : ''}

=== WORK EXPERIENCE ===
${userData?.totalYearsOfExperience ? `Total Years of Experience: ${userData.totalYearsOfExperience}` : ''}
${userData?.workExperiences?.length ? `Work Experience:\n${userData.workExperiences.map((exp: any) => `  • ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})\n    Responsibilities: ${exp.responsibilities || 'N/A'}`).join('\n')}` : ''}

=== SKILLS & LANGUAGES ===
${userData?.skillsList?.length ? `Skills: ${userData.skillsList.join(', ')}` : ''}
${userData?.languages?.length ? `Languages:\n${userData.languages.map((lang: any) => `  • ${lang.language}: ${lang.proficiency}${lang.certification ? ` (Certified: ${lang.certification})` : ''}`).join('\n')}` : ''}

=== CERTIFICATIONS & TRAINING ===
${userData?.certifications?.length ? `Certifications:\n${userData.certifications.map((cert: any) => `  • ${cert.name} by ${cert.issuer || 'N/A'} (${cert.issueDate}${cert.expiryDate ? ` - expires ${cert.expiryDate}` : ''})`).join('\n')}` : ''}
${userData?.trainingCourses?.length ? `Training Courses:\n${userData.trainingCourses.map((course: any) => `  • ${course.name} by ${course.provider || 'N/A'}`).join('\n')}` : ''}

=== CAREER GOALS & PREFERENCES ===
${userData?.jobTitles?.length ? `Target Job Titles: ${userData.jobTitles.join(', ')}` : ''}
${userData?.jobCategories?.length ? `Target Industries: ${userData.jobCategories.join(', ')}` : ''}
${userData?.careerLevel ? `Career Level: ${userData.careerLevel}` : ''}
${userData?.minimumSalary ? `Minimum Salary Expectation: ${userData.minimumSalary}` : ''}
${userData?.jobTypes?.length ? `Preferred Job Types: ${userData.jobTypes.join(', ')}` : ''}
${userData?.jobSearchStatus ? `Job Search Status: ${userData.jobSearchStatus}` : ''}

=== ACHIEVEMENTS & SUMMARY ===
${userData?.achievements ? `Notable Achievements: ${userData.achievements}` : ''}
${userData?.summary ? `Professional Summary: ${userData.summary}` : ''}
${resumeContent ? `RESUME CONTENT: ${resumeContent}` : ''}

${resumeAnalysis ? `
RESUME ANALYSIS - INTERVIEW GUIDANCE:
Critical Areas to Explore: ${resumeAnalysis.interview_notes?.verification_points?.join(', ') || 'None identified'}
Red Flags to Investigate: ${resumeAnalysis.interview_notes?.red_flags?.join(', ') || 'None identified'}
Impressive Achievements to Validate: ${resumeAnalysis.interview_notes?.impressive_achievements?.join(', ') || 'None identified'}
Skill Gaps to Probe: ${resumeAnalysis.interview_notes?.skill_gaps?.join(', ') || 'None identified'}
Experience Inconsistencies: ${resumeAnalysis.interview_notes?.experience_inconsistencies?.join(', ') || 'None identified'}
Career Progression Assessment: ${resumeAnalysis.interview_notes?.career_progression_notes?.join(', ') || 'Standard progression'}
Overall Credibility: ${resumeAnalysis.raw_analysis?.credibility_assessment || 'Standard assessment'}
` : ''}

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
      const messages = language === 'arabic' ? [
        { 
          role: "system" as const, 
          content: "انت مصري من القاهرة وبتتكلم عامية مصرية بس. استخدم كلمات زي 'إزيك' و 'عامل إيه' و 'يلا' و 'معلش' و 'ماشي' و 'كدا' و 'دي'. ممنوع تستخدم فصحى خالص. اتكلم كإنك قاعد في قهوة في وسط البلد."
        },
        { role: "user" as const, content: prompt }
      ] : [
        { role: "user" as const, content: prompt }
      ];

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        {
          requestType: "generatePersonalInterview",
          model: "gpt-4o",
          userId: userData?.id,
        }
      );

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

  async generateProfessionalInterview(userData: any, resumeContent?: string, previousInterviewData?: any, resumeAnalysis?: any, language: string = 'english'): Promise<InterviewSet> {
    const contextInsights = previousInterviewData?.insights || '';
    const conversationStyle = previousInterviewData?.conversationStyle || '';
    const keyThemes = previousInterviewData?.keyThemes || [];
    const previousQuestions = previousInterviewData?.previousQuestions || [];
    
    const prompt = `You are continuing as the same AI interviewer. You have full knowledge of this candidate's profile AND their previous interview answers.

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Conduct this interview ONLY in Egyptian Arabic dialect (اللهجة المصرية العامية). You MUST use casual Egyptian slang like "إزيك" (how are you), "عامل إيه" (how are you doing), "يلا" (come on), "معلش" (never mind), "ماشي" (okay), "ربنا يوفقك" (good luck), "هو ده" (that\'s it), "خلاص" (done), "كدا" (like this), "دي" (this). Use informal pronouns like "انت" not "أنت". Replace formal words: say "دي" not "هذه", "كدا" not "هكذا", "ليه" not "لماذا", "فين" not "أين". Talk like you\'re in a Cairo coffee shop having a friendly chat. ABSOLUTELY FORBIDDEN: formal Arabic (فصحى). Think as an Egyptian having a relaxed conversation.' : 'LANGUAGE INSTRUCTION: Conduct this interview entirely in English.'}

COMPREHENSIVE CANDIDATE PROFILE DATA:
=== PERSONAL DETAILS ===
${userData?.name ? `Full Name: ${userData.name}` : ''}
${userData?.email ? `Email: ${userData.email}` : ''}
${userData?.phone ? `Phone: ${userData.phone}` : ''}
${userData?.birthdate ? `Date of Birth: ${new Date(userData.birthdate).toLocaleDateString()}` : ''}
${userData?.gender ? `Gender: ${userData.gender}` : ''}
${userData?.nationality ? `Nationality: ${userData.nationality}` : ''}
${userData?.maritalStatus ? `Marital Status: ${userData.maritalStatus}` : ''}
${userData?.dependents ? `Dependents: ${userData.dependents}` : ''}
${userData?.militaryStatus ? `Military Status: ${userData.militaryStatus}` : ''}

=== LOCATION & MOBILITY ===
${userData?.country ? `Country: ${userData.country}` : ''}
${userData?.city ? `City: ${userData.city}` : ''}
${userData?.willingToRelocate !== undefined ? `Willing to Relocate: ${userData.willingToRelocate ? 'Yes' : 'No'}` : ''}
${userData?.preferredWorkCountries?.length ? `Preferred Work Countries: ${userData.preferredWorkCountries.join(', ')}` : ''}
${userData?.workplaceSettings ? `Work Arrangement Preference: ${userData.workplaceSettings}` : ''}

=== ONLINE PRESENCE & PORTFOLIO ===
${userData?.linkedinUrl ? `LinkedIn: ${userData.linkedinUrl}` : ''}
${userData?.githubUrl ? `GitHub: ${userData.githubUrl}` : ''}
${userData?.websiteUrl ? `Personal Website: ${userData.websiteUrl}` : ''}
${userData?.facebookUrl ? `Facebook: ${userData.facebookUrl}` : ''}
${userData?.twitterUrl ? `Twitter: ${userData.twitterUrl}` : ''}
${userData?.instagramUrl ? `Instagram: ${userData.instagramUrl}` : ''}
${userData?.youtubeUrl ? `YouTube: ${userData.youtubeUrl}` : ''}
${userData?.otherUrls?.length ? `Other URLs: ${userData.otherUrls.join(', ')}` : ''}

=== EDUCATION ===
${userData?.currentEducationLevel ? `Current Education Level: ${userData.currentEducationLevel}` : ''}
${userData?.degrees?.length ? `Degrees:\n${userData.degrees.map((deg: any) => `  • ${deg.degree} in ${deg.field || 'N/A'} from ${deg.institution} (${deg.startDate} - ${deg.endDate || 'Present'})${deg.gpa ? ` - GPA: ${deg.gpa}` : ''}`).join('\n')}` : ''}
${userData?.highSchools?.length ? `High School Education:\n${userData.highSchools.map((hs: any) => `  • ${hs.institution} (${hs.startDate} - ${hs.endDate || 'Present'})`).join('\n')}` : ''}

=== WORK EXPERIENCE ===
${userData?.totalYearsOfExperience ? `Total Years of Experience: ${userData.totalYearsOfExperience}` : ''}
${userData?.workExperiences?.length ? `Work Experience:\n${userData.workExperiences.map((exp: any) => `  • ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})\n    Responsibilities: ${exp.responsibilities || 'N/A'}`).join('\n')}` : ''}

=== SKILLS & LANGUAGES ===
${userData?.skillsList?.length ? `Skills: ${userData.skillsList.join(', ')}` : ''}
${userData?.languages?.length ? `Languages:\n${userData.languages.map((lang: any) => `  • ${lang.language}: ${lang.proficiency}${lang.certification ? ` (Certified: ${lang.certification})` : ''}`).join('\n')}` : ''}

=== CERTIFICATIONS & TRAINING ===
${userData?.certifications?.length ? `Certifications:\n${userData.certifications.map((cert: any) => `  • ${cert.name} by ${cert.issuer || 'N/A'} (${cert.issueDate}${cert.expiryDate ? ` - expires ${cert.expiryDate}` : ''})`).join('\n')}` : ''}
${userData?.trainingCourses?.length ? `Training Courses:\n${userData.trainingCourses.map((course: any) => `  • ${course.name} by ${course.provider || 'N/A'}`).join('\n')}` : ''}

=== CAREER GOALS & PREFERENCES ===
${userData?.jobTitles?.length ? `Target Job Titles: ${userData.jobTitles.join(', ')}` : ''}
${userData?.jobCategories?.length ? `Target Industries: ${userData.jobCategories.join(', ')}` : ''}
${userData?.careerLevel ? `Career Level: ${userData.careerLevel}` : ''}
${userData?.minimumSalary ? `Minimum Salary Expectation: ${userData.minimumSalary}` : ''}
${userData?.jobTypes?.length ? `Preferred Job Types: ${userData.jobTypes.join(', ')}` : ''}
${userData?.jobSearchStatus ? `Job Search Status: ${userData.jobSearchStatus}` : ''}

=== ACHIEVEMENTS & SUMMARY ===
${userData?.achievements ? `Notable Achievements: ${userData.achievements}` : ''}
${userData?.summary ? `Professional Summary: ${userData.summary}` : ''}
${userData?.previousRole ? `Previous Role: ${userData.previousRole}` : ''}
${userData?.previousCompany ? `Previous Company: ${userData.previousCompany}` : ''}
${userData?.achievements ? `Achievements: ${userData.achievements}` : ''}
${userData?.certifications ? `Certifications: ${userData.certifications}` : ''}
${resumeContent ? `RESUME CONTENT: ${resumeContent}` : ''}

${resumeAnalysis ? `
RESUME ANALYSIS - INTERVIEW GUIDANCE:
Critical Areas to Explore: ${resumeAnalysis.interview_notes?.verification_points?.join(', ') || 'None identified'}
Red Flags to Investigate: ${resumeAnalysis.interview_notes?.red_flags?.join(', ') || 'None identified'}
Impressive Achievements to Validate: ${resumeAnalysis.interview_notes?.impressive_achievements?.join(', ') || 'None identified'}
Skill Gaps to Probe: ${resumeAnalysis.interview_notes?.skill_gaps?.join(', ') || 'None identified'}
Experience Inconsistencies: ${resumeAnalysis.interview_notes?.experience_inconsistencies?.join(', ') || 'None identified'}
Career Progression Assessment: ${resumeAnalysis.interview_notes?.career_progression_notes?.join(', ') || 'Standard progression'}
` : ''}

${contextInsights}

${conversationStyle}

KEY THEMES FROM PREVIOUS INTERVIEWS: ${keyThemes.join(', ')}

QUESTIONS ALREADY ASKED (DO NOT REPEAT):
${previousQuestions.map((q: string) => `- ${q}`).join('\n')}

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
      const messages = language === 'arabic' ? [
        { 
          role: "system" as const, 
          content: "انت مصري من القاهرة وبتتكلم عامية مصرية بس. استخدم كلمات زي 'إزيك' و 'عامل إيه' و 'يلا' و 'معلش' و 'ماشي' و 'كدا' و 'دي'. ممنوع تستخدم فصحى خالص. اتكلم كإنك قاعد في قهوة في وسط البلد."
        },
        { role: "user" as const, content: prompt }
      ] : [
        { role: "user" as const, content: prompt }
      ];

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        {
          requestType: "generateProfessionalInterview",
          model: "gpt-4o",
          userId: userData?.id,
        }
      );

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

  async generateTechnicalInterview(userData: any, resumeContent?: string, previousInterviewData?: any, resumeAnalysis?: any, language: string = 'english'): Promise<InterviewSet> {
    const userRole = userData?.currentRole || 'professional';
    const userField = this.determineUserField(userData, resumeContent);
    const contextInsights = previousInterviewData?.insights || '';
    const conversationStyle = previousInterviewData?.conversationStyle || '';
    const keyThemes = previousInterviewData?.keyThemes || [];
    const previousQuestions = previousInterviewData?.previousQuestions || [];
    
    const prompt = `You are completing the final interview phase as the same AI interviewer. You have comprehensive knowledge of this candidate's full profile AND all previous interview answers.

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Conduct this interview ONLY in Egyptian Arabic dialect (اللهجة المصرية العامية). You MUST use casual Egyptian slang like "إزيك" (how are you), "عامل إيه" (how are you doing), "يلا" (come on), "معلش" (never mind), "ماشي" (okay), "ربنا يوفقك" (good luck), "هو ده" (that\'s it), "خلاص" (done), "كدا" (like this), "دي" (this). Use informal pronouns like "انت" not "أنت". Replace formal words: say "دي" not "هذه", "كدا" not "هكذا", "ليه" not "لماذا", "فين" not "أين". Talk like you\'re in a Cairo coffee shop having a friendly chat. ABSOLUTELY FORBIDDEN: formal Arabic (فصحى). Think as an Egyptian having a relaxed conversation.' : 'LANGUAGE INSTRUCTION: Conduct this interview entirely in English.'}

COMPREHENSIVE CANDIDATE PROFILE DATA:
=== PERSONAL DETAILS ===
${userData?.name ? `Full Name: ${userData.name}` : ''}
${userData?.email ? `Email: ${userData.email}` : ''}
${userData?.phone ? `Phone: ${userData.phone}` : ''}
${userData?.birthdate ? `Date of Birth: ${new Date(userData.birthdate).toLocaleDateString()}` : ''}
${userData?.gender ? `Gender: ${userData.gender}` : ''}
${userData?.nationality ? `Nationality: ${userData.nationality}` : ''}
${userData?.maritalStatus ? `Marital Status: ${userData.maritalStatus}` : ''}
${userData?.dependents ? `Dependents: ${userData.dependents}` : ''}
${userData?.militaryStatus ? `Military Status: ${userData.militaryStatus}` : ''}

=== LOCATION & MOBILITY ===
${userData?.country ? `Country: ${userData.country}` : ''}
${userData?.city ? `City: ${userData.city}` : ''}
${userData?.willingToRelocate !== undefined ? `Willing to Relocate: ${userData.willingToRelocate ? 'Yes' : 'No'}` : ''}
${userData?.preferredWorkCountries?.length ? `Preferred Work Countries: ${userData.preferredWorkCountries.join(', ')}` : ''}
${userData?.workplaceSettings ? `Work Arrangement Preference: ${userData.workplaceSettings}` : ''}

=== ONLINE PRESENCE & PORTFOLIO ===
${userData?.linkedinUrl ? `LinkedIn: ${userData.linkedinUrl}` : ''}
${userData?.githubUrl ? `GitHub: ${userData.githubUrl}` : ''}
${userData?.websiteUrl ? `Personal Website: ${userData.websiteUrl}` : ''}
${userData?.facebookUrl ? `Facebook: ${userData.facebookUrl}` : ''}
${userData?.twitterUrl ? `Twitter: ${userData.twitterUrl}` : ''}
${userData?.instagramUrl ? `Instagram: ${userData.instagramUrl}` : ''}
${userData?.youtubeUrl ? `YouTube: ${userData.youtubeUrl}` : ''}
${userData?.otherUrls?.length ? `Other URLs: ${userData.otherUrls.join(', ')}` : ''}

=== EDUCATION ===
${userData?.currentEducationLevel ? `Current Education Level: ${userData.currentEducationLevel}` : ''}
${userData?.degrees?.length ? `Degrees:\n${userData.degrees.map((deg: any) => `  • ${deg.degree} in ${deg.field || 'N/A'} from ${deg.institution} (${deg.startDate} - ${deg.endDate || 'Present'})${deg.gpa ? ` - GPA: ${deg.gpa}` : ''}`).join('\n')}` : ''}
${userData?.highSchools?.length ? `High School Education:\n${userData.highSchools.map((hs: any) => `  • ${hs.institution} (${hs.startDate} - ${hs.endDate || 'Present'})`).join('\n')}` : ''}

=== WORK EXPERIENCE ===
${userData?.totalYearsOfExperience ? `Total Years of Experience: ${userData.totalYearsOfExperience}` : ''}
${userData?.workExperiences?.length ? `Work Experience:\n${userData.workExperiences.map((exp: any) => `  • ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})\n    Responsibilities: ${exp.responsibilities || 'N/A'}`).join('\n')}` : ''}

=== SKILLS & LANGUAGES ===
${userData?.skillsList?.length ? `Skills: ${userData.skillsList.join(', ')}` : ''}
${userData?.languages?.length ? `Languages:\n${userData.languages.map((lang: any) => `  • ${lang.language}: ${lang.proficiency}${lang.certification ? ` (Certified: ${lang.certification})` : ''}`).join('\n')}` : ''}

=== CERTIFICATIONS & TRAINING ===
${userData?.certifications?.length ? `Certifications:\n${userData.certifications.map((cert: any) => `  • ${cert.name} by ${cert.issuer || 'N/A'} (${cert.issueDate}${cert.expiryDate ? ` - expires ${cert.expiryDate}` : ''})`).join('\n')}` : ''}
${userData?.trainingCourses?.length ? `Training Courses:\n${userData.trainingCourses.map((course: any) => `  • ${course.name} by ${course.provider || 'N/A'}`).join('\n')}` : ''}

=== CAREER GOALS & PREFERENCES ===
${userData?.jobTitles?.length ? `Target Job Titles: ${userData.jobTitles.join(', ')}` : ''}
${userData?.jobCategories?.length ? `Target Industries: ${userData.jobCategories.join(', ')}` : ''}
${userData?.careerLevel ? `Career Level: ${userData.careerLevel}` : ''}
${userData?.minimumSalary ? `Minimum Salary Expectation: ${userData.minimumSalary}` : ''}
${userData?.jobTypes?.length ? `Preferred Job Types: ${userData.jobTypes.join(', ')}` : ''}
${userData?.jobSearchStatus ? `Job Search Status: ${userData.jobSearchStatus}` : ''}

=== ACHIEVEMENTS & SUMMARY ===
${userData?.achievements ? `Notable Achievements: ${userData.achievements}` : ''}
${userData?.summary ? `Professional Summary: ${userData.summary}` : ''}
${resumeContent ? `RESUME CONTENT: ${resumeContent}` : ''}

${resumeAnalysis ? `
RESUME ANALYSIS - INTERVIEW GUIDANCE:
Critical Areas to Explore: ${resumeAnalysis.interview_notes?.verification_points?.join(', ') || 'None identified'}
Red Flags to Investigate: ${resumeAnalysis.interview_notes?.red_flags?.join(', ') || 'None identified'}
Impressive Achievements to Validate: ${resumeAnalysis.interview_notes?.impressive_achievements?.join(', ') || 'None identified'}
Skill Gaps to Probe: ${resumeAnalysis.interview_notes?.skill_gaps?.join(', ') || 'None identified'}
Experience Inconsistencies: ${resumeAnalysis.interview_notes?.experience_inconsistencies?.join(', ') || 'None identified'}
Career Progression Assessment: ${resumeAnalysis.interview_notes?.career_progression_notes?.join(', ') || 'Standard progression'}
` : ''}

${contextInsights}

${conversationStyle}

KEY THEMES FROM ALL PREVIOUS INTERVIEWS: ${keyThemes.join(', ')}

QUESTIONS ALREADY ASKED (DO NOT REPEAT):
${previousQuestions.map((q: string) => `- ${q}`).join('\n')}

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
      const messages = language === 'arabic' ? [
        { 
          role: "system" as const, 
          content: "انت مصري من القاهرة وبتتكلم عامية مصرية بس. استخدم كلمات زي 'إزيك' و 'عامل إيه' و 'يلا' و 'معلش' و 'ماشي' و 'كدا' و 'دي'. ممنوع تستخدم فصحى خالص. اتكلم كإنك قاعد في قهوة في وسط البلد."
        },
        { role: "user" as const, content: prompt }
      ] : [
        { role: "user" as const, content: prompt }
      ];

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        {
          requestType: "generateTechnicalInterview",
          model: "gpt-4o",
          userId: userData?.id,
        }
      );

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

  // Generate brutally honest candidate profile for Airtable
  async generateBrutallyHonestProfile(userData: any, interviewResponses: any, resumeAnalysis: any): Promise<{
    profileSummary: string;
    strengths: string[];
    criticalWeaknesses: string[];
    skillAssessment: string;
    experienceVerification: string;
    redFlags: string[];
    hirabilityScore: number;
    recommendedRole: string;
    salaryRange: string;
    notes: string;
  }> {
    const prompt = `You are a brutally honest HR expert creating a candid assessment for employers. This profile will be used by hiring managers to make informed decisions. Be fair but unflinchingly honest about this candidate's actual capabilities, gaps, and potential.

CANDIDATE DATA:
${JSON.stringify(userData, null, 2)}

RESUME ANALYSIS:
${JSON.stringify(resumeAnalysis, null, 2)}

INTERVIEW RESPONSES:
${JSON.stringify(interviewResponses, null, 2)}

ASSESSMENT GUIDELINES:
- Be brutally honest but fair
- Focus on EVIDENCE-BASED assessments
- Highlight both genuine strengths AND real weaknesses
- Call out any inconsistencies or red flags
- Assess actual vs claimed experience levels
- Provide realistic hiring recommendations
- No sugar-coating, but remain professional

SCORING SYSTEM (1-10):
1-3: Not hireable for stated roles
4-5: Significant gaps, proceed with caution  
6-7: Solid candidate with some limitations
8-9: Strong candidate with minor gaps
10: Exceptional candidate

Provide a comprehensive assessment in JSON format:
{
  "profileSummary": "Honest 2-3 sentence summary of this candidate",
  "strengths": ["actual demonstrable strengths", ...],
  "criticalWeaknesses": ["significant gaps and limitations", ...],
  "skillAssessment": "Honest evaluation of claimed vs actual skills",
  "experienceVerification": "Assessment of experience claims vs evidence",
  "redFlags": ["concerning patterns, inconsistencies, or issues", ...],
  "hirabilityScore": number_1_to_10,
  "recommendedRole": "Most appropriate role level for this candidate",
  "salaryRange": "Realistic salary range based on actual capabilities",
  "notes": "Additional context for hiring managers"
}

Be thorough, honest, and evidence-based. This assessment will help employers make informed hiring decisions.`;

    try {
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: "You are a brutally honest HR expert who provides evidence-based candidate assessments for employers. Your assessments are known for their accuracy and honesty."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2, // Lower temperature for consistent, honest assessments
        }),
        {
          requestType: "generateBrutallyHonestProfile",
          model: "gpt-4o",
          userId: userData?.id,
        }
      );

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      return analysis;
    } catch (error) {
      console.error("Error generating honest profile:", error);
      throw new Error("Failed to generate candidate profile");
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
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
        {
          requestType: "analyzeJobApplication",
          model: "gpt-4o",
          userId: userProfile?.userId,
        }
      );

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
  // Extract plain text from an uploaded resume file by letting OpenAI read the file directly
  // and return the raw text content. This avoids local OCR/PDF parsing.
  async extractResumeTextWithOpenAI(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string> {
    try {
      const uploaded = await wrapOpenAIRequest(
        async () => openai.files.create({
          file: await toFile(file.buffer, file.originalname, { type: file.mimetype }),
          purpose: "assistants"
        }),
        {
          requestType: "extractResumeTextWithOpenAI",
          model: "gpt-4o-mini",
        }
      );

      const extractionPrompt = "Extract and return the full plain text from this resume file. Preserve reading order and line breaks. Do not summarize, translate, or add any commentary. Output ONLY the raw plaintext.";

      // Use Responses API to have the model read the uploaded file and emit plaintext
      // Using a cost-effective model for extraction; downstream structured parsing will use GPT-5
      const response: any = await (openai as any).responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: extractionPrompt },
              { type: "input_file", file_id: uploaded.id }
            ]
          }
        ],
        // Allow long outputs for multi-page resumes
        max_output_tokens: 64000
      });

      // Best-effort extraction of output text across SDK versions
      let text = "";
      if (response?.output_text) {
        text = response.output_text;
      } else if (Array.isArray(response?.output)) {
        for (const item of response.output) {
          if (Array.isArray(item?.content)) {
            for (const c of item.content) {
              if (c?.type === "output_text" && typeof c?.text === "string") {
                text += c.text;
              } else if (c?.type === "text" && typeof c?.text === "string") {
                text += c.text;
              }
            }
          }
        }
      }

      // Optional: cleanup the uploaded file
      try { await openai.files.delete(uploaded.id as any); } catch (_) { /* ignore */ }

      return (text || "").trim();
    } catch (error) {
      console.error("Failed to extract resume text via OpenAI file reading:", error);
      return "";
    }
  }

  // Extract plain text directly from an existing OpenAI file by its file_id
  async extractResumeTextFromOpenAIFileId(fileId: string): Promise<string> {
    try {
      const extractionPrompt = "Extract and return the full plain text from this resume file. Preserve reading order and line breaks. Do not summarize, translate, or add any commentary. Output ONLY the raw plaintext.";

      const response: any = await wrapOpenAIRequest(
        () => (openai as any).responses.create({
          model: "gpt-4o-mini",
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: extractionPrompt },
                { type: "input_file", file_id: fileId }
              ]
            }
          ],
          max_output_tokens: 64000
        }),
        {
          requestType: "extractResumeTextFromOpenAIFileId",
          model: "gpt-4o-mini",
        }
      );

      let text = "";
      if (response?.output_text) {
        text = response.output_text;
      } else if (Array.isArray(response?.output)) {
        for (const item of response.output) {
          if (Array.isArray(item?.content)) {
            for (const c of item.content) {
              if (c?.type === "output_text" && typeof c?.text === "string") {
                text += c.text;
              } else if (c?.type === "text" && typeof c?.text === "string") {
                text += c.text;
              }
            }
          }
        }
      }

      return (text || "").trim();
    } catch (error) {
      console.error("Failed to extract resume text from file_id via OpenAI:", error);
      return "";
    }
  }

  async generateComprehensiveProfile(
    userData: any,
    resumeContent: string | null,
    interviewResponses: InterviewResponse[],
    jobDescription?: string
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
- ${jobDescription ? 'Evaluate specifically for the target job - how well do their skills and experience match what this role requires?' : 'Assess general professional capabilities and readiness'}

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

` : ''}${jobDescription ? `🎯 JOB DESCRIPTION (Target Role):
${jobDescription}

` : ''}🎤 INTERVIEW RESPONSES (3 interviews: Background/Soft Skills, Professional/Experience, Technical/Problem Solving):
${conversationHistory}

📘 GENERATE BRUTALLY HONEST PROFILE IN JSON:
{
  "candidateSummary": "Max 3-5 lines: Honest overview evaluating their claims vs actual demonstration${jobDescription ? ' specifically for the target job' : ''}. Do NOT repeat what they said—evaluate it critically.",
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
  "communicationScore": between 0-100,
  "credibilityScore": between 0-100,
  "consistencyScore": between 0-100,
  "matchScorePercentage": between 0-100,
  "experiencePercentage": between 0-100,
  "techSkillsPercentage": between 0-100,
  "culturalFitPercentage": between 0-100,
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
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
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
          temperature: 0.1
        }),
        {
          requestType: "generateComprehensiveProfile",
          model: "gpt-4o",
          userId: userData?.id,
        }
      );

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
        matchScorePercentage: profile.matchScorePercentage || 0,
        experiencePercentage: profile.experiencePercentage || 0,
        techSkillsPercentage: profile.techSkillsPercentage || 0,
        culturalFitPercentage: profile.culturalFitPercentage || 0,
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
        matchScorePercentage: comprehensiveProfile.matchScorePercentage,
        experiencePercentage: comprehensiveProfile.experiencePercentage,
        techSkillsPercentage: comprehensiveProfile.techSkillsPercentage,
        culturalFitPercentage: comprehensiveProfile.culturalFitPercentage,
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
        workStyle: "Team-oriented with focus on results.",
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
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
        {
          requestType: "parseResume",
          model: "gpt-5",
        }
      );

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error("Error parsing resume:", error);
      return {};
    }
  }

  async parseResumeForProfile(resumeContent: string): Promise<any> {
    // Define a JSON Schema for strict extraction
    const resumeProfileSchema: any = {
      type: "object",
      additionalProperties: false,
      properties: {
        personalDetails: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            location: {
              type: "object",
              additionalProperties: false,
              properties: {
                city: { type: ["string", "null"] },
                country: { type: ["string", "null"] },
                fullAddress: { type: ["string", "null"] }
              },
              required: ["city", "country", "fullAddress"]
            },
            dateOfBirth: { type: ["string", "null"] },
            nationality: { type: ["string", "null"] },
            gender: { type: ["string", "null"] }
          },
          required: ["name", "email", "phone", "location", "dateOfBirth", "nationality", "gender"]
        },
        workExperience: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              company: { type: ["string", "null"] },
              position: { type: ["string", "null"] },
              startDate: { type: ["string", "null"] },
              endDate: { type: ["string", "null"] },
              current: { type: ["boolean", "null"] },
              location: { type: ["string", "null"] },
              employmentType: { type: ["string", "null"] },
              responsibilities: { type: ["string", "null"] },
              yearsAtPosition: { type: ["string", "number", "null"] }
            },
            required: ["company", "position", "startDate", "endDate", "current", "location", "employmentType", "responsibilities", "yearsAtPosition"]
          }
        },
        education: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              institution: { type: ["string", "null"] },
              degree: { type: ["string", "null"] },
              fieldOfStudy: { type: ["string", "null"] },
              startDate: { type: ["string", "null"] },
              endDate: { type: ["string", "null"] },
              current: { type: ["boolean", "null"] },
              gpa: { type: ["string", "null"] },
              location: { type: ["string", "null"] },
              honors: { type: ["string", "null"] }
            },
            required: ["institution", "degree", "fieldOfStudy", "startDate", "endDate", "current", "gpa", "location", "honors"]
          }
        },
        skills: {
          type: "object",
          additionalProperties: false,
          properties: {
            technicalSkills: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  skill: { type: ["string", "null"] },
                  level: { type: ["string", "null"] },
                  yearsOfExperience: { type: ["string", "number", "null"] }
                },
                required: ["skill", "level", "yearsOfExperience"]
              }
            },
            softSkills: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  skill: { type: ["string", "null"] },
                  level: { type: ["string", "null"] }
                },
                required: ["skill", "level"]
              }
            },
            languages: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  language: { type: ["string", "null"] },
                  proficiency: { type: ["string", "null"] },
                  certification: { type: ["string", "null"] }
                },
                required: ["language", "proficiency", "certification"]
              }
            }
          },
          required: ["technicalSkills", "softSkills", "languages"]
        },
        certifications: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: ["string", "null"] },
              issuer: { type: ["string", "null"] },
              dateObtained: { type: ["string", "null"] },
              expiryDate: { type: ["string", "null"] },
              credentialId: { type: ["string", "null"] }
            },
            required: ["name", "issuer", "dateObtained", "expiryDate", "credentialId"]
          }
        },
        onlinePresence: {
          type: "object",
          additionalProperties: false,
          properties: {
            linkedinUrl: { type: ["string", "null"] },
            githubUrl: { type: ["string", "null"] },
            websiteUrl: { type: ["string", "null"] },
            portfolioUrl: { type: ["string", "null"] },
            otherUrls: { type: "array", items: { type: "string" } }
          },
          required: ["linkedinUrl", "githubUrl", "websiteUrl", "portfolioUrl", "otherUrls"]
        },
        careerInformation: {
          type: "object",
          additionalProperties: false,
          properties: {
            totalYearsOfExperience: { type: ["string", "number", "null"] },
            currentEducationLevel: { type: ["string", "null"] },
            careerLevel: { type: ["string", "null"] },
            jobTitles: { type: "array", items: { type: "string" } },
            industries: { type: "array", items: { type: "string" } },
            summary: { type: ["string", "null"] }
          },
          required: ["totalYearsOfExperience", "currentEducationLevel", "careerLevel", "jobTitles", "industries", "summary"]
        },
        achievements: { type: ["string", "null"] },
        projects: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: ["string", "null"] },
              description: { type: ["string", "null"] },
              technologies: { type: "array", items: { type: "string" } },
              url: { type: ["string", "null"] }
            },
            required: ["name", "description", "technologies", "url"]
          }
        }
      },
      required: [
        "personalDetails",
        "workExperience",
        "education",
        "skills",
        "certifications",
        "onlinePresence",
        "careerInformation",
        "achievements",
        "projects"
      ]
    };

    try {
      const instruction = `You are an expert resume parser and career analyst. Extract ALL available information into the provided JSON schema. Use nulls/empty arrays for missing info. Be precise; do not invent data.`;

      const response: any = await wrapOpenAIRequest(
        () => (openai as any).responses.create({
          model: "gpt-5",
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: instruction },
                { type: "input_text", text: `RESUME CONTENT:\n${resumeContent}` }
              ]
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "ApplicantProfile",
              schema: resumeProfileSchema,
              strict: true
            }
          },
          max_output_tokens: 4000
        }),
        {
          requestType: "parseResumeForProfile",
          model: "gpt-5",
        }
      );

      let text = "";
      if (response?.output_text) {
        text = response.output_text;
      } else if (Array.isArray(response?.output)) {
        for (const item of response.output) {
          if (Array.isArray(item?.content)) {
            for (const c of item.content) {
              if (c?.type === "output_text" && typeof c?.text === "string") text += c.text;
              else if (c?.type === "text" && typeof c?.text === "string") text += c.text;
            }
          }
        }
      }

      const parsed = text ? JSON.parse(text) : {};
      return parsed;
    } catch (error) {
      console.error("Error parsing resume for profile (Responses API):", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      // Fallback to simple chat completion JSON mode as last resort
      try {
        const fallback = await wrapOpenAIRequest(
          () => openai.chat.completions.create({
            model: "gpt-5",
            messages: [
              { role: "system", content: "Return only valid JSON matching the requested structure." },
              { role: "user", content: `Extract structured JSON for this resume:\n${resumeContent}` }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 2000
          }),
          {
            requestType: "parseResumeForProfile-fallback",
            model: "gpt-5",
          }
        );
        return JSON.parse(fallback.choices[0].message.content || "{}");
      } catch (fallbackError) {
        console.error("Fallback parsing also failed:", fallbackError);
        return {};
      }
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
  // New: job-specific practice interview
  generateJobPracticeInterview: async (userData: any, jobDetails: any, language: string = 'english') => {
    const jobTitle = jobDetails?.jobTitle || 'the role';
    const companyName = jobDetails?.companyName || 'the company';
    const jobDescription = jobDetails?.jobDescription || '';
    const providedSkills: string[] = Array.isArray(jobDetails?.skills) ? jobDetails.skills : [];
    const aiPromptContext = jobDetails.aiPrompt || ''

    // Extract skills from job description if not provided
    let extractedSkills: string[] = [];
    try {
      const skillPatterns = [
        /(?:skills?|requirements?|qualifications?|experience)[:\s]*([^.]*)/gi,
        /(?:proficiency|knowledge|expertise)\s+(?:in|with|of)[:\s]*([^.]*)/gi,
        /(?:must have|required|essential)[:\s]*([^.]*)/gi
      ];

      skillPatterns.forEach((pattern: RegExp) => {
        const matches: RegExpMatchArray | null = jobDescription.match(pattern);
        if (matches) {
          matches.forEach((match: string) => {
            const text = match.replace(/(?:skills?|requirements?|qualifications?|experience|proficiency|knowledge|expertise|must have|required|essential)[:\s]*/gi, '');
            const parts: string[] = text.split(/[,;•\-\n]/)
              .map((s: string) => s.trim().toLowerCase())
              .filter((s: string) => s.length > 2 && s.length < 40);
            extractedSkills.push(...parts);
          });
        }
      });
      const stopWords = new Set(['and','or','with','in','of','the','to','for','on','a','an']);
      extractedSkills = Array.from(new Set(extractedSkills)).filter((s) => !stopWords.has(s));
    } catch {}

    const combinedSkills = Array.from(new Set([
      ...providedSkills.map((s: string) => s.trim()),
      ...extractedSkills.map((s: string) => s.trim())
    ].filter(Boolean as unknown as (value: string | undefined) => value is string)));
    const requiredSkills = combinedSkills.join(', ');

    // Rough responsibilities extraction for better grounding
    const responsibilities = (jobDescription.match(/(^|\n)\s*(?:[-•])\s+.+/g) || [])
      .map((line: string) => line.replace(/^[\s\n]*[-•]\s*/, '').trim())
      .slice(0, 10);

    // Build candidate profile block from available user data
    const safeJoin = (arr: unknown, sep: string = ', '): string => Array.isArray(arr) ? (arr.filter(Boolean) as string[]).join(sep) : '';
    const experienceLines: string[] = Array.isArray((userData as any)?.workExperiences)
      ? ((userData as any).workExperiences as any[]).map((exp: any) => {
          const position: string = typeof exp?.position === 'string' ? exp.position : '';
          const company: string = typeof exp?.company === 'string' ? exp.company : '';
          const dateRange: string = [exp?.startDate, exp?.endDate].filter(Boolean).join(' - ');
          const responsibilitiesText: string = typeof exp?.responsibilities === 'string' ? exp.responsibilities : '';
          return `• ${position}${company ? ` at ${company}` : ''}${dateRange ? ` (${dateRange})` : ''}${responsibilitiesText ? `\n  Responsibilities: ${responsibilitiesText}` : ''}`.trim();
        })
      : [];
    const educationLines: string[] = Array.isArray((userData as any)?.degrees)
      ? ((userData as any).degrees as any[]).map((deg: any) => {
          const degree: string = typeof deg?.degree === 'string' ? deg.degree : '';
          const field: string = typeof deg?.field === 'string' ? deg.field : '';
          const institution: string = typeof deg?.institution === 'string' ? deg.institution : '';
          const dateRange: string = [deg?.startDate, deg?.endDate].filter(Boolean).join(' - ');
          return `• ${degree}${field ? ` in ${field}` : ''}${institution ? ` from ${institution}` : ''}${dateRange ? ` (${dateRange})` : ''}`.trim();
        })
      : [];
    const languageLines: string[] = Array.isArray((userData as any)?.languages)
      ? ((userData as any).languages as any[]).map((lang: any) => {
          const language: string = typeof lang?.language === 'string' ? lang.language : '';
          const proficiency: string = typeof lang?.proficiency === 'string' ? lang.proficiency : '';
          return `• ${language}${proficiency ? `: ${proficiency}` : ''}`;
        })
      : [];
    const portfolioLines: string[] = [
      (userData as any)?.linkedinUrl,
      (userData as any)?.githubUrl,
      (userData as any)?.websiteUrl
    ]
      .filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((url: string) => `• ${url}`);
    const skillsList: string = safeJoin((userData as any)?.skillsList, ', ');
    const targetJobTitles: string = safeJoin((userData as any)?.jobTitles, ', ');
    const targetIndustries: string = safeJoin((userData as any)?.jobCategories, ', ');
    const aiProfileRaw: unknown = (userData as any)?.aiProfile;
    const aiProfileFormatted: string = typeof aiProfileRaw === 'string'
      ? aiProfileRaw
      : (typeof (aiProfileRaw as any)?.formattedProfile === 'string' ? (aiProfileRaw as any).formattedProfile : '');
    const aiProfileExcerpt: string = aiProfileFormatted ? aiProfileFormatted.slice(0, 1200) : '';

    const candidateProfileBlock = `\nCANDIDATE PROFILE DATA:\nName: ${(userData as any)?.name || ''}\nSummary: ${(userData as any)?.summary || ''}\nTarget Roles: ${targetJobTitles}\nTarget Industries: ${targetIndustries}\nSkills: ${skillsList}\nExperience:\n${experienceLines.join('\n')}\nEducation:\n${educationLines.join('\n')}\nLanguages:\n${languageLines.join('\n')}\nPortfolio:\n${portfolioLines.join('\n')}\n${aiProfileExcerpt ? `\nAI Profile Excerpt:\n${aiProfileExcerpt}\n` : ''}`;

    const prompt = `You are an expert interviewer helping a candidate practice specifically for a job they just applied to.

JOB DETAILS:
- Title: ${jobTitle}
- Company: ${companyName}
- Required skills: ${requiredSkills || 'Not explicitly listed'}
- Description:\n${jobDescription}
${responsibilities.length ? `\nTop responsibilities parsed from the post:\n- ${responsibilities.join('\n- ')}` : ''}

${candidateProfileBlock}

Based on these job details and the candidate's profile (assume you know it), create 7 sharp, role-specific practice questions that:
- Focus on responsibilities and skills explicitly relevant to this job
- Probe for concrete outcomes, metrics, and decision-making
- Avoid generic prompts; be targeted to the described role
- Sequence questions progressively (from calibration to deep dives)
- Explicitly reference at least one listed skill or responsibility in each question
- Personalize using the candidate's background above; if a listed skill is missing in their profile, create a bridging/hypothetical relevant to their experience

${aiPromptContext}

Return ONLY JSON:
{
  "questions": [
    {"question": "...", "context": "why this matters for the role"},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."},
    {"question": "...", "context": "..."}
  ]
}`;

    const messages = language === 'arabic' ? [
      { role: "system" as const, content: "انت مصري من القاهرة وبتتكلم عامية مصرية بس. الأسئلة لازم تكون عملية ومناسبة للوظيفة، وتركز على نتائج ومقاييس." },
      { role: "user" as const, content: prompt }
    ] : [
      { role: "user" as const, content: prompt }
    ];

    try {
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.6
        }),
        {
          requestType: "generateJobPracticeInterview",
          model: "gpt-4o",
          userId: userData?.id,
        }
      );
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        type: 'job-practice',
        title: `Practice Interview for ${jobTitle}`,
        description: `Targeted practice based on ${companyName} - ${jobTitle}`,
        questions: result.questions || []
      };
    } catch (error) {
      console.error('Error generating job practice interview:', error);
      return {
        type: 'job-practice',
        title: `Practice Interview for ${jobTitle}`,
        description: `Targeted practice based on ${companyName} - ${jobTitle}`,
        questions: [
          { question: `Walk me through a project most relevant to ${jobTitle}. What measurable outcomes did you deliver?`, context: 'Align past work to the role' },
          { question: `Which of the listed skills (${requiredSkills || 'core skills'}) is your strongest? Provide a detailed example.`, context: 'Skill depth' },
          { question: `Describe a time you handled a responsibility similar to those in the description.`, context: 'Role responsibilities' },
          { question: `If you joined ${companyName}, what would your 30/60/90-day plan look like?`, context: 'Impact plan' },
          { question: `Tell me about a decision with trade-offs similar to this role. How did you choose?`, context: 'Decision-making' },
          { question: `What metric would you own in this role and how would you move it?`, context: 'Metrics ownership' },
          { question: `What gaps do you see compared to the description and how would you address them?`, context: 'Self-awareness' }
        ]
      };
    }
  },
  generateProfile: (userData: any, resumeContent: string | null, interviewResponses: InterviewResponse[], jobDescription?: string) =>
    aiProfileAnalysisAgent.generateComprehensiveProfile(userData, resumeContent, interviewResponses, jobDescription),
  parseResume: aiProfileAnalysisAgent.parseResume.bind(aiProfileAnalysisAgent),
  parseResumeForProfile: aiProfileAnalysisAgent.parseResumeForProfile.bind(aiProfileAnalysisAgent)
};