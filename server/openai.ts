import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { wrapOpenAIRequest } from "./openaiTracker";

// OpenAI client - models are configured via environment variables
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
    const prompt = `You are an AI interviewer for Plato, an AI-powered job matching platform. Generate a professional but natural-sounding welcome message for a candidate starting their comprehensive interview process. This welcome message must sound human, flow smoothly, and include the rules in a casual conversational style (not numbered).

${language === 'arabic'
  ? `LANGUAGE INSTRUCTION (EGYPTIAN ARABIC ONLY):
- Write ONLY in Egyptian Arabic slang (اللهجة المصرية العامية).
- Talk like a friendly but serious Egyptian explaining something clearly. Imagine chatting in a Cairo ahwa (café) but keeping it professional.
- Examples of words/phrases to use naturally: "إزيك"، "عامل إيه"، "تمام"، "ماشي"، "خلاص"، "كدا"، "دلوقتي"، "يلا نبدأ"، "معلش"، "براحتك"، "خلي بالك"، "واخد بالك"، "على مهلك"، "إحنا هنا"، "من غير لف ودوران"، "ده الطبيعي"، "هو ده"، "بالظبط"، "بص"، "بلاش"، "أيوه"، "لأ"، "ليه"، "فين"، "لسه"، "برضه"، "قوي"، "طبعًا"، "مش مشكلة"، "من غير كتر كلام".
- Use informal pronouns: "انت" / "انتي". Use "دي" not "هذه"، "كدا" not "هكذا"، "ليه" not "لماذا"، "فين" not "أين"، "علشان" not "لكي".
- Absolutely forbidden: فصحى (formal Arabic). Must sound relaxed, local, and natural.`
  : `LANGUAGE INSTRUCTION (ENGLISH ONLY):
- Write ONLY in neutral, professional English.
- Keep the tone calm, direct, and natural — not robotic, not overly formal.`}

COMPREHENSIVE CANDIDATE DATA (OPTIONAL PERSONALIZATION):
${userData?.name ? `Name: ${userData.name}` : 'Candidate'}
${userData?.workExperiences?.[0] ? `Current Role: ${userData.workExperiences[0].position} at ${userData.workExperiences[0].company}` : ''}
${userData?.totalYearsOfExperience ? `Experience: ${userData.totalYearsOfExperience} years` : ''}
${userData?.degrees?.[0] ? `Education: ${userData.degrees[0].degree} in ${userData.degrees[0].field} from ${userData.degrees[0].institution}` : ''}
${userData?.skillsList?.length ? `Key Skills: ${userData.skillsList.slice(0, 3).join(', ')}` : ''}
${userData?.careerLevel ? `Career Level: ${userData.careerLevel}` : ''}
${userData?.jobTitles?.[0] ? `Target Role: ${userData.jobTitles[0]}` : ''}

OUTPUT REQUIREMENTS:
- Start by saying: "Welcome to Plato" (in the chosen language).
- Clearly explain there are FOUR interviews: Personal, Professional, Technical, and Job-Tailored.
- Mention you (the AI interviewer) will stay with them through all phases and remember their answers.
- Then, introduce the rules casually and clearly, as if talking normally:
   • No switching tabs or opening other windows.
   • No using phones or other devices.
   • No screen sharing.
   • You must be the one doing the interview, no one else.
   • Keep your focus on the screen, don't look away too much.
   • Keep your mouse active in the interview window.
   • Sit alone in a quiet room and make sure nobody comes in.
   • If the internet cuts out, unfortunately, the interview will be disqualified.
- State the rules smoothly, like natural speech, not as a numbered list. Be very clear but conversational.
- Add one short sentence about WHY these rules exist (privacy, fairness, and focus).
- End by telling them what to do next, e.g., "When you're ready, let me know so we can begin." (in the selected language).
- Keep the message complete but natural — no JSON, no metadata, no formatting.

ROBUSTNESS / SAFETY:
- If any candidate data is missing, skip it naturally without breaking flow.
- If there's ANY ambiguity (even 1%), ask a short clarifying question in the same language before continuing.
- Never output in the wrong language.
- Always sound like a human interviewer who knows Egyptian slang (if Arabic is chosen) or a professional recruiter (if English is chosen).`;

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
          model: process.env.OPENAI_MODEL_WELCOME_MESSAGE || "gpt-4o",
          messages,
          temperature: 0.7,
          max_completion_tokens: 200
        }),
        {
          requestType: "generateWelcomeMessage",
          model: process.env.OPENAI_MODEL_WELCOME_MESSAGE || "gpt-4o",
          userId: userData?.id || null,
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
      return `إزيك${name}! أهلاً وسهلاً بيك في بلاتو. أنا هكون المحاور اللي هعمل معاك مقابلة شاملة النهاردة. إحنا هنمر بأربع مراحل مترابطة - شخصية ومهنية وتقنية ومتخصصة للوظيفة - عشان نفهم خلفيتك وقدراتك كدا. هحافظ على الاستمرارية في كل المراحل عشان نبني ملف شخصي متكامل. بس قبل ما نبدأ، فيه حاجات لازم ننتبه ليها: مفيش تبديل تابات أو فتح نوافذ تانية، مفيش استخدام موبايل أو أي devices تانية، مفيش screen sharing، ولازم تكون انت اللي بتعمل المقابلة لوحدك في مكان هادي. لو الإنترنت قطع، للأسف المقابلة هتتشطب. القواعد دي علشان الخصوصية والعدالة والتركيز. يلا لما تكون جاهز، قولي عشان نبدأ.`;
    } else {
      const name = firstName ? `, ${firstName}` : '';
      return `Welcome to Plato${name}. I'll be conducting a comprehensive interview process with you today. We'll proceed through four connected phases - personal, professional, technical, and job-tailored - to understand your background and capabilities. I'll maintain continuity throughout all phases to build a complete profile. Before we begin, I need to mention a few important rules: no switching tabs or opening other windows, no using phones or other devices, no screen sharing, and you must be the one doing the interview alone in a quiet room. If your internet disconnects, unfortunately the interview will be disqualified. These rules exist to ensure privacy, fairness, and focus. When you're ready, let me know so we can begin.`;
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
7. Your ultimate goal is to learn more about them and their personality, character, and life decisions – not just their work history

QUESTION QUALITY STANDARDS:
- Ask human, high-quality questions - avoid templates and clichés
- Be sharp, contextual, and judgment-based
- Prioritize clarity, depth, and specificity
- Make every question purposeful and custom to this person
- Focus on gaps, clarity, reflection, and judgment
- Push for concrete examples, logic, habits, and life choices
- Explore discipline, consistency, resilience, teamwork, and personal growth
- Invite reflection about their values, routines, and approach to solving problems

Create 11 personal background questions that demonstrate you've analyzed their profile:
1. Reference their educational background or career path in context – ask why they made certain key transitions and what they learned from them.
2. Build on their stated career goals or work style – explore the reasoning behind their long-term choices and whether they have clear systems for personal growth.
3. Connect their current role to their personal values – ask what gives them a sense of purpose, fulfillment, and alignment.
4. Explore motivations behind their career and life choices – ask about sacrifices, trade-offs, and moments that shaped them.
5. Understand what drives them beyond what's already stated – focus on decision-making, mental frameworks, and real-life examples.
6. Ask about habits, routines, and systems of discipline – learn how they structure their day, manage focus, and keep promises to themselves.
7. Ask about moments of adversity – how they react under pressure, recover from setbacks, and maintain consistency.
8. Explore interpersonal dynamics – how they work with others, manage conflicts, and motivate people around them.
9. Dig into long-term vision – where they see themselves in 5–10 years, what they're building toward, and why.
10. Ask about personal inspirations – mentors, books, philosophies, or experiences that shaped their worldview.
11. Invite them to share a story that reveals who they are as a person – something outside of work that taught them a life lesson.

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
          model: process.env.OPENAI_MODEL_PERSONAL_INTERVIEW || "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        {
          requestType: "generatePersonalInterview",
          model: process.env.OPENAI_MODEL_PERSONAL_INTERVIEW || "gpt-4o",
          userId: userData?.id || null,
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
Overall Credibility: ${resumeAnalysis.raw_analysis?.credibility_assessment || 'Standard assessment'}
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
4. DO NOT repeat previously asked questions or themes
5. DO NOT ask for information already available in their profile
6. Maintain the exact same tone and conversation style
7. Show you remember everything - profile + previous answers
8. Go deeper into how they THINK, DECIDE, and EXECUTE professionally – this round is about work patterns, judgment, and practical experiences

QUESTION QUALITY STANDARDS:
- Ask high-quality, insight-driven questions - avoid generic templates and clichés
- Be sharp, contextual, and judgment-based
- Dig into their problem-solving process, decision-making under pressure, and real-world execution
- Focus on clarity, specificity, and actionable examples
- Ask them to walk through trade-offs, priorities, conflicts, and outcomes
- Explore how they collaborate, communicate, and lead – especially in high-stakes situations
- Sequence questions logically to feel like a natural, evolving conversation

Create 7–10 professional questions that demonstrate full knowledge and go beyond surface-level:
1. Reference their career progression from profile – ask how they adapted to challenges, overcame resistance, or redefined their role.
2. Build on their stated career goals – ask about the systems and strategies they've used to stay on track or pivot when necessary.
3. Connect their current role to their decision-making – explore a specific project or task where their judgment significantly influenced results.
4. Explore leadership and collaboration – ask about moments they had to align conflicting stakeholders, motivate teams, or resolve tensions.
5. Ask about mistakes, failures, or missed opportunities – focus on what they learned and how they've applied it since.
6. Explore how they handle pressure – deadlines, resource constraints, or conflicting priorities – and how they keep quality high.
7. Connect their educational or technical background to their problem-solving ability – ask how it shaped their approach to real-world situations.
8. Explore their growth mindset – how they measure progress, seek feedback, and continuously improve professionally.
9. Understand how they evaluate opportunities – what criteria they use to accept projects, roles, or responsibilities.
10. Ask how they'd bring value to the target role specifically – what unique contribution they'd make in the first 90 days.

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
          model: process.env.OPENAI_MODEL_PROFESSIONAL_INTERVIEW || "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        {
          requestType: "generateProfessionalInterview",
          model: process.env.OPENAI_MODEL_PROFESSIONAL_INTERVIEW || "gpt-4o",
          userId: userData?.id || null,
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

  async generateTechnicalInterview(userData: any, resumeContent?: string, language: string = 'english'): Promise<InterviewSet> {
    const userRole = userData?.currentRole || 'professional';
    const userField = this.determineUserField(userData, resumeContent);
    
    const prompt = `You are completing the final interview phase as the same AI interviewer. You have comprehensive knowledge of this candidate's full profile AND all previous interview answers.

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Conduct this interview ONLY in Egyptian Arabic dialect (اللهجة المصرية العامية). You MUST use casual Egyptian slang like "إزيك" (how are you), "عامل إيه" (how are you doing), "يلا" (come on), "معلش" (never mind), "ماشي" (okay), "ربنا يوفقك" (good luck), "هو ده" (that\'s it), "خلاص" (done), "كدا" (like this), "دي" (this). Use informal pronouns like "انت" not "أنت". Replace formal words: say "دي" not "هذه", "كدا" not "هكذا", "ليه" not "لماذا", "فين" not "أين". Talk like you\'re in a Cairo coffee shop having a friendly chat. ABSOLUTELY FORBIDDEN: formal Arabic (فصحى). Think as an Egyptian having a relaxed conversation.' : 'LANGUAGE INSTRUCTION: Conduct this interview entirely in English.'}

COMPREHENSIVE CANDIDATE PROFILE DATA:
...

CRITICAL INSTRUCTIONS:
1. You are the SAME interviewer with full memory of their profile and all previous answers
2. Your questions must be technical, domain-specific, and deeply contextual
3. Reference their specific tech stack, projects, and skills mentioned in their profile
4. Build on themes from previous interviews - connect their technical skills to their professional experiences
5. Use phrases like "In your role at ${userData?.previousCompany || 'your last company'}, you mentioned using..." or "Let's dig into the technical details of the project where you..."
6. DO NOT repeat any previously asked questions
7. Maintain the same neutral, professional tone
8. Your goal is to assess technical depth, problem-solving skills, and real-world application of knowledge
9. Go beyond theory – focus on how they actually execute, debug, optimize, and scale solutions

QUESTION QUALITY STANDARDS:
- Ask highly specific, scenario-based technical questions - avoid generic textbook questions
- Be sharp, contextual, and judgment-based - test their decision-making process
- Prioritize depth and specificity - push for concrete examples of how they solved a complex technical problem
- Make every question purposeful and custom to this person's technical background
- Focus on trade-offs, design choices, and debugging scenarios
- Push for code examples, architectural diagrams, or step-by-step problem-solving logic
- Include opportunities to test their ability to simplify complex ideas for non-technical people

Create 11 technical questions that assess deep expertise for a ${userRole} in ${userField}:
1. Ask a deep-dive question about a core technology or methodology they claim expertise in – focus on an advanced or non-obvious aspect.
2. Present a realistic, complex problem scenario related to their past projects and ask them to design or debug a solution step-by-step.
3. Ask about a critical technical trade-off they had to make – explore what constraints existed, what options they considered, and how they measured success.
4. Challenge them with a relevant system design or architecture question – test scalability, fault-tolerance, and performance considerations.
5. Explore their debugging process – give them a subtle bug or performance issue and ask how they'd isolate and resolve it.
6. Ask about security, reliability, or compliance considerations – how they ensure robustness in production environments.
7. Explore optimization thinking – ask how they would improve efficiency or reduce cost in one of their previous solutions.
8. Ask them to compare multiple technical approaches – explain when they'd use one over the other and why.
9. Test their ability to work in constraints – limited time, legacy systems, or cross-team dependencies – and still deliver.
10. Explore how they review and write code – what standards, documentation, and testing practices they follow.
11. Ask them to explain a very complex technical concept from their work to a non-technical stakeholder, testing clarity and communication.

RESPONSE STANDARDS FOR CANDIDATE ANSWERS:
- Respond professionally - never overly positive or flattering
- Use real interviewer language - neutral, grounded, professionally curious
- Never provide emotional reactions or value judgments
- Don't evaluate how "good" an answer was - ask the next smart question
- Maintain a calm, consistent tone - focused, observant, and neutral
- Examples of good responses: "Thank you. Could you walk me through the data model for that solution?" or "Interesting. What were the performance implications of that approach?"
- Avoid: "That's brilliant!" "Perfect answer!" "Wow, you're a real expert!"

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
          model: process.env.OPENAI_MODEL_TECHNICAL_INTERVIEW || "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        {
          requestType: "generateTechnicalInterview",
          model: process.env.OPENAI_MODEL_TECHNICAL_INTERVIEW || "gpt-4o",
          userId: userData?.id || null,
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
          model: process.env.OPENAI_MODEL_BRUTALLY_HONEST_PROFILE || "gpt-4o",
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
          model: process.env.OPENAI_MODEL_BRUTALLY_HONEST_PROFILE || "gpt-4o",
          userId: userData?.id || null,
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
          model: process.env.OPENAI_MODEL_JOB_APPLICATION_ANALYSIS || "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
        {
          requestType: "analyzeJobApplication",
          model: process.env.OPENAI_MODEL_JOB_APPLICATION_ANALYSIS || "gpt-4o",
          userId: userProfile?.userId || null,
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
          requestType: "uploadResumeFile",
          model: process.env.OPENAI_MODEL_RESUME_TEXT_EXTRACTION || "gpt-4o-mini",
        }
      );

      const extractionPrompt = "Extract and return the full plain text from this resume file. Preserve reading order and line breaks. Do not summarize, translate, or add any commentary. Output ONLY the raw plaintext.";

      // Use Responses API to have the model read the uploaded file and emit plaintext
      // Using a cost-effective model for extraction; downstream structured parsing will use GPT-5
      const response: any = await wrapOpenAIRequest(
        async () => await (openai as any).responses.create({
          model: process.env.OPENAI_MODEL_RESUME_TEXT_EXTRACTION || "gpt-4o-mini",
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
        }),
        {
          requestType: "extractResumeTextWithOpenAI",
          model: process.env.OPENAI_MODEL_RESUME_TEXT_EXTRACTION || "gpt-4o-mini",
        }
      );

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
          model: process.env.OPENAI_MODEL_RESUME_TEXT_EXTRACTION || "gpt-4o-mini",
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
          model: process.env.OPENAI_MODEL_RESUME_TEXT_EXTRACTION || "gpt-4o-mini",
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
    resumeAnalysis?: any,
    jobDescription?: string
  ): Promise<GeneratedProfile> {
    // Prepare the input JSON structure as specified
    const inputJson = {
      profile_analysis: resumeAnalysis || {},
      interview_profile: {
        candidate_identity: userData,
        pre_interview_questionnaire: userData.questionnaire || {},
        transcript: interviewResponses,
        interview_summary: {
          // This would typically come from a separate interview analysis
          personality_and_values: "Extracted from interview responses",
          culture_fit_insights: "Extracted from interview responses",
          technical_ability_insights: "Extracted from interview responses"
        }
      },
      candidate_profile: userData
    };

    console.log({
      inputJson
    });
    

    const prompt = `You are PLATO_COMPREHENSIVE_PROFILE_GENERATOR, the final-stage profile composer for the PLATO hiring platform.

Your job is to take:
1) The structured CV/profile analysis of a candidate, and
2) The structured interview transcript and interview summary, and
3) (Optionally) the raw candidate profile / resume JSON,

and then produce a single, integrated, end-to-end profile that any recruiter, hiring manager, or matching system can read to clearly understand:

- Who this person is,
- What they have done,
- How they think and work,
- What they are strong at,
- Where they have limitations or risks,
- What environments and roles they are likely to thrive in.

You are NOT making a hiring decision and NOT applying a pass/fail judgment. However, you MUST provide three component scores (technical, experience, cultural fit) plus a single overall score, derived in a fixed way from those components. These scores are a compact numeric summary of the integrated profile and must always be fully consistent with your written analysis.

--------------------
INPUTS YOU RECEIVE
--------------------

You will receive a JSON object with the following structure:

${JSON.stringify(inputJson, null, 2)}

Rules:
- When there is a conflict:
  - Prioritize clearly stated facts that are consistent across sources.
  - If the CV and interview present different versions, describe the discrepancy briefly in \`data_quality_and_limits.inconsistencies\`.
- Do NOT rely on any external source. Use only these inputs.

--------------------
GENERAL PRINCIPLES
--------------------

- Evidence-based synthesis.
  - You must ground your final profile in the information from:
    - \`profile_analysis\`,
    - \`interview_profile.interview_summary\`,
    - and, where needed, the interview \`transcript\`.
  - Do NOT invent degrees, companies, skills, or experiences that are not supported by the data.
  - You may infer patterns, but they must be reasonable and clearly derived from the data.

- No clinical or diagnostic language.
  - You may describe behavior and tendencies (for example, 'tends to reflect before making decisions'),
    but do NOT use clinical or medical labels or diagnoses.

- Integrative, not repetitive.
  - Do NOT just copy blocks of text from \`profile_analysis\` or the interview.
  - Your job is to integrate and summarize:
    - combine the CV-based view and interview-based view into a single narrative and structured profile.

- Human-readable and recruiter-friendly.
  - Use clear, concise language that a recruiter or hiring manager can skim quickly.
  - Use short paragraphs and bullet-style lists where appropriate.
  - Avoid jargon unless it comes from the candidate's domain and is necessary.

- Neutral, non-judgmental tone.
  - Be honest about risks and gaps, but do not be harsh or insulting.
  - Focus on fit and context, not absolute judgments of 'good' or 'bad' people.

- Consistency and traceability.
  - When you highlight important strengths or risks, they should clearly map back to:
    - CV content (experience, achievements, skills), and/or
    - interview insights (what they said in answers, interviewer's interpretation).

--------------------
WHAT YOU MUST SYNTHESIZE
--------------------

From the inputs, you must build a single, comprehensive profile, covering at least:

1) Meta Profile Overview
   - A concise snapshot someone can read in 15–30 seconds:
     - role and seniority,
     - years of experience,
     - main domains or industries,
     - standout strengths,
     - high-level risks or watch-outs.

2) Identity and Background
   - Name and basic identifying info (non-sensitive):
     - first_name, last_name, city, country.
   - Brief professional background:
     - original discipline or training (from education),
     - any notable shifts (for example, 'moved from civil engineering to data analysis').

3) Career Story and Trajectory
   - A chronological narrative of their career:
     - main roles and companies (at a high level; do not list every detail),
     - key transitions and promotions,
     - patterns (for example, 'increasing responsibility', 'several short stints', 'industry change from banking to SaaS').
   - Emphasize:
     - what they actually owned,
     - major achievements (draw from CV and interview),
     - how their responsibilities evolved.

4) Skills and Capabilities (Integrated)
   - Integrate skills from \`profile_analysis.skills\` and interview insights.
   - Distinguish between:
     - core hard skills or domain skills (for example, backend development, financial modeling, sales prospecting),
     - tools and technologies (for example, Python, Excel, Salesforce),
     - soft skills and behavioral strengths (for example, communication, stakeholder management, coaching).
   - Indicate:
     - strongest skill clusters,
     - skills mentioned but with weaker evidence,
     - any important gaps or limitations that matter for typical roles in their field.

5) Personality, Values and Inner World (From Interview)
   - Summarize personality-related patterns based primarily on:
     - \`interview_profile.interview_summary.personality_and_values\`,
     - culture_fit_insights,
     - and the transcript where needed.
   - Cover:
     - how they handle stress, feedback, and failure,
     - how they make decisions,
     - how reflective or self-aware they seem,
     - what they value in work and life (for example, autonomy, stability, impact, learning).
   - Use descriptive, non-clinical language.

6) Work Style and Collaboration
   - How they like to work day-to-day:
     - level of structure versus ambiguity,
     - preferred pace,
     - independence versus collaboration.
   - How they interact with:
     - teammates,
     - managers,
     - stakeholders or clients.
   - Include specific indications from:
     - \`questionnaire.typical_day\`,
     - \`questionnaire.non_negotiables\`,
     - and interview answers around teams and conflict.

7) Technical or Professional Depth (Role-Specific)
   - Integrate:
     - CV-based technical evidence,
     - \`interview_profile.interview_summary.technical_ability_insights\`,
     - and relevant portions of the transcript.
   - Describe:
     - how deep they seem in their core discipline,
     - what types of problems they can handle independently,
     - where they might still need guidance or growth,
     - examples of projects or scenarios that show their level (without full transcripts).

8) Motivation and Career Direction
   - Why they are in this field and why they are looking (from questionnaire and interview).
   - What they are seeking next:
     - type of role,
     - type of environment (for example, startup versus corporate),
     - growth aspirations (for example, individual-contributor depth versus people management).
   - How clear and realistic their goals seem.

9) Risk and Stability (Integrated View)
   - Combine:
     - \`profile_analysis.risk_and_stability\`,
     - \`interview_profile.interview_summary\`,
     - and any explanations given by the candidate.
   - Cover:
     - job-hopping or tenure patterns,
     - gaps in employment and their explanations,
     - any potential reliability or alignment concerns.
   - Be fair: consider whether the interview mitigates or reinforces raw CV concerns.

10) Environment and Culture Fit
    - Based on their values, non-negotiables, and work style:
      - what types of teams and cultures they are likely to thrive in (for example, highly collaborative, low-ego, fast-paced),
      - what types of environments may be a poor fit (for example, very rigid hierarchy, constant chaos).
    - Use evidence from:
      - non_negotiables,
      - why_looking_or_leaving,
      - personality and culture-fit insights from the interview.

11) Recommended Role and Pathways (Non-binding)
    - Suggest types of roles and contexts where they would likely perform well.
      - For example, 'mid-level backend engineer in a product-focused SaaS company',
        'enterprise account executive in B2B tech',
        'finance analyst in a structured, process-driven environment'.
    - Also note if they seem on track for:
      - deeper individual-contributor expertise,
      - or leadership or management,
      - or cross-functional roles (for example, product, pre-sales).
    - These are recommendations, not hard rules.

12) Derived Tags (For Matching)
    - A refined list of tags that reflect the final integrated view, building on \`profile_analysis.derived_tags\`.
    - Include:
      - primary role or function tags,
      - seniority tags,
      - key industry tags,
      - important tools or technologies,
      - personality or work-style tags where appropriate (for example, 'highly_structured', 'fast_paced_environment').
    - Tags must be:
      - lowercase,
      - machine-friendly (words separated by underscores).

13) Data Quality and Limits (Integrated)
    - Comment on:
      - how complete and reliable the overall picture is,
      - any contradictions between CV and interview,
      - any areas where you are unsure or where more data would help (for example, 'limited detail on technical stack', 'no clear examples of leading a team').
    - This helps users interpret your profile correctly.

14) Score Components and Weighted Overall Score (Integrated)
    - Based on the full, integrated view (CV plus interview), assign four scores on a 0–100 scale:

      a) technical_skills_score_0_100 (0–100)
        - Reflects the depth and clarity of the candidate's hard skills and tools relevant to their field, considering CV plus interview.
        - Base this on:
          - Hard skills from CV and interview
          - Tools and technologies demonstrated
          - Technical depth shown in answers
          - Domain expertise evidenced
        - Ignore generic soft skills when scoring this dimension.

      b) experience_score_0_100 (0–100)
        - Reflects the quantity and quality of professional experience:
          - Total years
          - Complexity and scope of roles
          - Progression in responsibility or seniority
          - Concreteness of achievements
          - Career trajectory
        - Base this on work history, achievements, and leadership experience.
        - Do NOT let this score be influenced by soft-skills wording.

      c) cultural_fit_score_0_100 (0–100)
        - Reflects general professional behaviors, values, and soft skills as they relate to thriving in healthy modern workplaces (not a specific employer's culture).
        - Base this on:
          - Communication and teamwork from interview
          - Personality and values assessment
          - Work style and collaboration patterns
          - Adaptability and self-awareness
          - Alignment with modern workplace values
        - This is NOT about a specific company's culture; it is about fit for modern, collaborative workplaces in general.

      d) overall_weighted_score_0_100 (0–100)
        - MUST be computed as:
          overall_weighted_score_0_100 = round(0.40 * technical_skills_score_0_100 + 0.40 * experience_score_0_100 + 0.20 * cultural_fit_score_0_100)
        - This uses a 40/40/20 weighting: Technical (40%), Experience (40%), Cultural Fit (20%).

    - IMPORTANT: These three component scores MUST be assessed independently.
      - Do NOT simply copy the same number into multiple fields.
      - It is RARE that all three dimensions are identical. If you ever set two scores within 3 points of each other, your narratives must clearly justify why.
      - Avoid always using round numbers. Use any integer from 0–100 that best reflects the evidence (e.g., 57, 63, 72).
      - Avoid assigning very high scores (90+) when evidence is limited.

    - If any dimension has weak or limited evidence, choose a cautious, moderate score and explain this explicitly in data_quality_and_limits.notes.

--------------------
OUTPUT FORMAT (STRICT)
--------------------

You MUST output valid JSON only. No extra text, no markdown, no commentary outside the JSON.

Your response MUST be a single JSON object with exactly the following top-level keys:

- meta_profile_overview
- identity_and_background
- career_story
- skills_and_capabilities
- personality_and_values
- work_style_and_collaboration
- technical_and_domain_profile
- motivation_and_career_direction
- risk_and_stability
- environment_and_culture_fit
- recommended_roles_and_pathways
- scores
- derived_tags
- data_quality_and_limits

The structure is:

{
  "meta_profile_overview": {
    "headline": string,                     // for example, 'Mid-level Backend Engineer with 5+ years in SaaS'
    "one_line_summary": string,             // very short, recruiter-friendly summary
    "key_highlights": string[],             // 3–7 bullet-style key strengths or points
    "key_watchouts": string[]               // 0–5 important risks or concerns, if any
  },
  "identity_and_background": {
    "full_name": string | null,
    "city": string | null,
    "country": string | null,
    "primary_role": string | null,
    "seniority_level": string | null,       // for example, 'junior', 'mid', 'senior', 'manager'
    "years_of_experience": number | null,
    "brief_background_summary": string      // short paragraph on who they are and where they come from professionally
  },
  "career_story": {
    "narrative": string,                    // 1–3 paragraphs describing their career journey
    "key_milestones": string[],             // notable roles, promotions, transitions
    "representative_achievements": string[] // 3–7 concise achievements with context (no need for full metrics)
  },
  "skills_and_capabilities": {
    "core_hard_skills": string[],           // main domain skills (for example, 'backend development', 'financial modeling')
    "tools_and_technologies": string[],     // important tools or tech they actually use
    "soft_skills_and_behaviors": string[],  // for example, 'clear communicator', 'stakeholder management'
    "strengths_summary": string,            // short paragraph integrating skills from CV plus interview
    "notable_gaps_or_limits": string[]      // skills or areas that appear weaker or missing
  },
  "personality_and_values": {
    "personality_summary": string,          // narrative synthesizing patterns from interview (non-clinical)
    "values_and_what_matters": string[],    // 3–7 items (for example, 'autonomy', 'learning', 'stability')
    "response_to_stress_and_feedback": string,
    "decision_making_style": string
  },
  "work_style_and_collaboration": {
    "day_to_day_work_style": string,        // how they like to work (pace, structure, independence)
    "team_and_collaboration_style": string, // how they show up in teams
    "communication_style": string,
    "examples_from_interview": string[]     // brief, evidence-based examples or paraphrased anecdotes
  },
  "technical_and_domain_profile": {
    "domain_focus": string[],               // for example, ['backend_engineering', 'distributed_systems']
    "technical_depth_summary": string,      // overall view of their depth versus breadth
    "typical_problems_they_can_solve": string[], // examples of problem types they can handle
    "areas_for_further_development": string[]     // where they likely need growth
  },
  "motivation_and_career_direction": {
    "why_they_are_in_this_field": string,
    "reasons_for_looking_or_leaving": string | null,
    "short_term_goals_1_2_years": string | null,
    "long_term_direction_3_5_years": string | null,
    "clarity_and_realism_assessment": string       // your view on how clear or realistic their goals seem
  },
  "risk_and_stability": {
    "integrated_risk_view": string,         // narrative combining CV plus interview explanations
    "job_hopping_risk_note": string,
    "unemployment_gap_risk_note": string,
    "stability_overall_assessment": string  // for example, 'generally stable with one short stint explained by...'
  },
  "environment_and_culture_fit": {
    "environments_where_they_thrive": string[],    // for example, 'product-driven SaaS teams', 'supportive leadership'
    "environments_where_they_struggle": string[],  // if any
    "non_negotiables_summary": string,             // integrated view of their non-negotiables
    "culture_fit_notes": string                    // high-level comments about culture fit considerations
  },
  "recommended_roles_and_pathways": {
    "recommended_role_types": string[],            // for example, ['mid_level_backend_engineer_in_saas', 'data_analyst_in_fintech']
    "suitable_team_or_org_contexts": string[],     // for example, 'small cross-functional squads', 'structured corporate finance team'
    "leadership_vs_ic_potential": string,          // your view on whether they lean IC, lead, or both
    "development_recommendations": string[]        // suggestions for growth (skills, experiences)
  },
  "scores": {
    "technical_skills_score_0_100": number,        // 0–100, integrated technical or domain capability
    "experience_score_0_100": number,              // 0–100, quality and quantity of experience
    "cultural_fit_score_0_100": number,            // 0–100, general cultural and behavioral fit
    "overall_weighted_score_0_100": number         // round(0.40 * technical + 0.40 * experience + 0.20 * cultural_fit)
  },
  "derived_tags": string[],                        // final tag list, lowercase with underscores
  "data_quality_and_limits": {
    "overall_confidence_0_100": number,           // your confidence in this integrated profile
    "major_gaps_in_information": string[],        // for example, 'limited detail on technical stack', 'no examples of leading teams'
    "inconsistencies": string[],                  // contradictions between CV and interview, if any
    "notes": string                               // any additional caveats or comments
  }
}

Rules:
- Always return a well-formed JSON object exactly matching this structure.
- Arrays may be empty; fields may be null when unknown.
- All percentage-like fields ending in _0_100 must be numbers between 0 and 100.
- overall_weighted_score_0_100 MUST always be computed from the three component scores using the 40% / 40% / 20% weighting (Technical: 40%, Experience: 40%, Cultural Fit: 20%).
- Do NOT include comments in the JSON output.
- Do NOT include any text outside the JSON.
- Do NOT expose raw interview questions or answers verbatim unless necessary to illustrate a point; prefer paraphrased examples.
- Ensure that every major statement in the profile can be traced back to either the profile_analysis, the interview_summary, or clearly evident patterns in the transcript.`;

    try {
      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_COMPREHENSIVE_PROFILE || "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an elite HR strategist and assessment analyst producing evidence-based candidate profiles for executive decision-making."
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
          model: process.env.OPENAI_MODEL_COMPREHENSIVE_PROFILE || "gpt-4o",
          userId: userData?.id || null,
        }
      );

      const profile = JSON.parse(response.choices[0].message.content || '{}');

      console.log({
        profile
      });
      
      // Store the comprehensive profile for employers
      const comprehensiveProfile = profile;

      // Extract basic info for backward compatibility using new structure
      const legacySkills = comprehensiveProfile.skills_and_capabilities?.core_hard_skills ||
                          comprehensiveProfile.skills_and_capabilities?.tools_and_technologies || [];

      // Extract scores from AI response
      const scores = comprehensiveProfile.scores || {};
      const technicalScore = Math.round(scores.technical_skills_score_0_100 || 70);
      const experienceScore = Math.round(scores.experience_score_0_100 || 70);
      const culturalFitScore = Math.round(scores.cultural_fit_score_0_100 || 70);
      const overallScore = Math.round(scores.overall_weighted_score_0_100 || 70);

      // Return legacy format for backward compatibility with new comprehensive data
      return {
        summary: comprehensiveProfile.meta_profile_overview?.one_line_summary ||
                comprehensiveProfile.identity_and_background?.brief_background_summary ||
                "Candidate assessment completed.",
        skills: legacySkills,
        personality: comprehensiveProfile.personality_and_values?.personality_summary || "Not assessed",
        experience: [], // Will be populated from existing profile data
        strengths: comprehensiveProfile.meta_profile_overview?.key_highlights || [],
        careerGoals: comprehensiveProfile.motivation_and_career_direction?.short_term_goals_1_2_years ||
                    "Career goals extracted from interview responses.",
        workStyle: comprehensiveProfile.work_style_and_collaboration?.day_to_day_work_style || "Not assessed",
        matchScorePercentage: overallScore,
        experiencePercentage: experienceScore,
        techSkillsPercentage: technicalScore,
        culturalFitPercentage: culturalFitScore,
        // Store the full comprehensive profile for employer access
        brutallyHonestProfile: {
          version: 2,
          ...comprehensiveProfile
        }
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
          model: process.env.OPENAI_MODEL_RESUME_PARSING || "gpt-5",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
        {
          requestType: "parseResume",
          model: process.env.OPENAI_MODEL_RESUME_PARSING || "gpt-5",
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
      const instruction = `You are an expert resume parser and career analyst. Extract ALL available information into the provided JSON schema.

CRITICAL REQUIREMENTS:
- For work experience: ALWAYS extract startDate and endDate (format as "Month Year" or "YYYY-MM" or "YYYY")
- For education: ALWAYS extract startDate and endDate (format as "Month Year" or "YYYY-MM" or "YYYY")
- For certifications: ALWAYS extract dateObtained and expiryDate if mentioned
- If exact dates are not provided, use approximate dates based on context (e.g., "2020" if only year is mentioned)
- If no date information is available at all, use null
- Be precise; do not invent data that isn't in the resume
- Use nulls/empty arrays for missing non-date info`;

      const response: any = await wrapOpenAIRequest(
        () => (openai as any).responses.create({
          model: process.env.OPENAI_MODEL_RESUME_PROFILE_PARSING || "gpt-5",
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
        }),
        {
          requestType: "parseResumeForProfile",
          model: process.env.OPENAI_MODEL_RESUME_PROFILE_PARSING || "gpt-5",
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
            model: process.env.OPENAI_MODEL_RESUME_PROFILE_PARSING || "gpt-5",
            messages: [
              { role: "system", content: "Return only valid JSON matching the requested structure." },
              { role: "user", content: `Extract structured JSON for this resume:\n${resumeContent}` }
            ],
            response_format: { type: "json_object" },
          }),
          {
            requestType: "parseResumeForProfile-fallback",
            model: process.env.OPENAI_MODEL_RESUME_PROFILE_PARSING || "gpt-5",
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

// AI Agent 3: Career Suggestion Agent - provides career insights based on profile content
export class AICareerSuggestionAgent {
  private openai = openai;

  async generateCareerSuggestions(profileData: any, language: string = 'english'): Promise<{
    paragraphs: string[];
  }> {
    const prompt = `You are an expert career strategist and AI-powered career advisor providing direct, actionable advice to help the user advance their career. Write as if you're speaking directly to them.

${language === 'arabic' ? 'LANGUAGE INSTRUCTION: Provide ALL responses in Egyptian Arabic dialect (اللهجة المصرية العامية). Use casual Egyptian slang like "إزيك", "عامل إيه", "يلا", "معلش", "ماشي", "كدا", "دي". Use informal pronouns like "انت" not "أنت". Talk directly to them as if you\'re their personal career coach having a friendly chat. ABSOLUTELY FORBIDDEN: formal Arabic (فصحى).' : 'LANGUAGE INSTRUCTION: Write directly to the user in a professional but personal tone. Use "you" and address them directly as their personal career advisor.'}

COMPREHENSIVE USER PROFILE DATA:
=== PERSONAL INFORMATION ===
Name: ${profileData?.name || 'Not specified'}
Total Years of Experience: ${profileData?.totalYearsOfExperience || 'Not specified'}
Summary: ${profileData?.summary || 'Not specified'}

=== WORK EXPERIENCE ===
${profileData?.workExperiences?.length ?
  profileData.workExperiences.map((exp: any, index: number) =>
    `Position ${index + 1}: ${exp.position || 'N/A'} at ${exp.company || 'N/A'} (${exp.startDate || 'N/A'} - ${exp.endDate || 'Present'})\n  Responsibilities: ${exp.responsibilities || 'N/A'}\n  Duration: ${exp.yearsAtPosition || 'N/A'}`
  ).join('\n\n')
  : 'No work experience specified'
}

=== EDUCATION ===
Current Education Level: ${profileData?.currentEducationLevel || 'Not specified'}
${profileData?.degrees?.length ?
  profileData.degrees.map((deg: any) =>
    `• ${deg.degree || 'N/A'} in ${deg.field || 'N/A'} from ${deg.institution || 'N/A'} (${deg.startDate || 'N/A'} - ${deg.endDate || 'Present'})${deg.gpa ? ` - GPA: ${deg.gpa}` : ''}`
  ).join('\n')
  : 'No degrees specified'
}

=== SKILLS ===
${profileData?.skillsData ?
  `Technical Skills: ${profileData.skillsData.technicalSkills?.map((skill: any) => `${skill.skill} (${skill.level})`).join(', ') || 'None specified'}
Soft Skills: ${profileData.skillsData.softSkills?.map((skill: any) => `${skill.skill} (${skill.level})`).join(', ') || 'None specified'}`
  : 'No skills data specified'
}

=== LANGUAGES ===
${profileData?.languages?.length ?
  profileData.languages.map((lang: any) => `${lang.language}: ${lang.proficiency}${lang.certification ? ` (${lang.certification})` : ''}`).join(', ')
  : 'No languages specified'
}

=== CERTIFICATIONS ===
${profileData?.certifications?.length ?
  profileData.certifications.map((cert: any) => `${cert.name} by ${cert.issuer || 'N/A'} (${cert.issueDate || 'N/A'})`).join(', ')
  : 'No certifications specified'
}

=== CAREER PREFERENCES ===
Target Job Titles: ${profileData?.jobTitles?.join(', ') || 'Not specified'}
Target Industries/Categories: ${profileData?.jobCategories?.join(', ') || 'Not specified'}
Career Level: ${profileData?.careerLevel || 'Not specified'}
Job Types: ${profileData?.jobTypes?.join(', ') || 'Not specified'}
Workplace Settings: ${profileData?.workplaceSettings || 'Not specified'}
Minimum Salary Expectation: ${profileData?.minimumSalary || 'Not specified'}
Preferred Work Countries: ${profileData?.preferredWorkCountries?.join(', ') || 'Not specified'}

=== ACHIEVEMENTS ===
${profileData?.achievements || 'No achievements specified'}

=== ONLINE PRESENCE ===
LinkedIn: ${profileData?.linkedinUrl || 'Not specified'}
GitHub: ${profileData?.githubUrl || 'Not specified'}
Portfolio/Website: ${profileData?.websiteUrl || 'Not specified'}

ANALYSIS REQUIREMENTS:
1. Be direct and personal - speak TO the user, not ABOUT them
2. Provide brutally honest but encouraging advice
3. Give specific, actionable steps they can take immediately
4. Focus on what they should do, not just what they should know
5. Consider their actual background, skills, and career goals

Write exactly 5 paragraphs that give DIRECT ADVICE to the user:
1. Your current career situation and what it means for you
2. Your key strengths to leverage and skills you need to improve
3. Specific career opportunities you should pursue right now
4. Realistic salary expectations and negotiation strategies for your level
5. Immediate next steps you should take this week and this month

Write DIRECTLY TO THE USER using "you" and giving them clear instructions. For example: "You should focus on...", "Your next step is...", "I recommend you..."

Return ONLY JSON in this exact format:
{
  "paragraphs": [
    "Direct advice about your current career situation...",
    "Direct advice about your strengths and skills to develop...",
    "Direct advice about specific opportunities you should pursue...",
    "Direct advice about realistic salary and negotiation...",
    "Direct advice about immediate next steps to take..."
  ]
}`;

    try {
      const messages = language === 'arabic' ? [
        {
          role: "system" as const,
          content: "انت خبير استشارات مهنية محترف وبتتكلم عامية مصرية بس. استخدم كلمات زي 'إزيك' و 'عامل إيه' و 'يلا' و 'معلش' و 'ماشي' و 'كدا' و 'دي'. ممنوع تستخدم فصحى خالص. اتكلم كإنك خبير بتقدم نصايح مهنية عملية في قهوة في وسط البلد."
        },
        { role: "user" as const, content: prompt }
      ] : [
        { role: "user" as const, content: prompt }
      ];

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_CAREER_SUGGESTIONS || "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7
        }),
        {
          requestType: "generateCareerSuggestions",
          model: process.env.OPENAI_MODEL_CAREER_SUGGESTIONS || "gpt-4o",
          userId: profileData?.userId || null,
        }
      );

      const suggestions = JSON.parse(response.choices[0].message.content || '{}');
      return {
        paragraphs: suggestions.paragraphs || []
      };
    } catch (error) {
      console.error("Error generating career suggestions:", error);
      return this.getFallbackCareerSuggestions();
    }
  }

  private getFallbackCareerSuggestions() {
    return {
      paragraphs: [
        "You're currently in a good position in your career with a solid foundation that employers value. You should leverage your existing experience while identifying areas where you can grow and improve your market position.",
        "You have valuable skills that are in demand, but you should focus on addressing any gaps that might be holding you back from reaching the next level. Consider what additional training or experience could make you more competitive.",
        "You should actively pursue career advancement opportunities through both internal promotions and external moves. Look for roles that build on your current experience while offering new challenges and growth potential.",
        "You should research current market rates for your role and experience level to ensure you're being compensated fairly. Be prepared to negotiate based on your actual skills and achievements, not just what the market offers.",
        "You should take immediate action by networking within your industry, updating your resume to highlight your key achievements, and identifying specific skills to develop over the next few months. Set clear, measurable goals and track your progress."
      ]
    };
  }
}

// Create instances of all AI agents
export const aiInterviewAgent = new AIInterviewAgent();
export const aiProfileAnalysisAgent = new AIProfileAnalysisAgent();
export const aiCareerSuggestionAgent = new AICareerSuggestionAgent();

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
          model: process.env.OPENAI_MODEL_JOB_PRACTICE_INTERVIEW || "gpt-4o",
          messages,
          response_format: { type: "json_object" },
          temperature: 0.6
        }),
        {
          requestType: "generateJobPracticeInterview",
          model: process.env.OPENAI_MODEL_JOB_PRACTICE_INTERVIEW || "gpt-4o",
          userId: userData?.id || null,
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
  generateProfile: (userData: any, resumeContent: string | null, interviewResponses: InterviewResponse[], resumeAnalysis?: any, jobDescription?: string) =>
    aiProfileAnalysisAgent.generateComprehensiveProfile(userData, resumeContent, interviewResponses, resumeAnalysis, jobDescription),
  parseResume: aiProfileAnalysisAgent.parseResume.bind(aiProfileAnalysisAgent),
  parseResumeForProfile: aiProfileAnalysisAgent.parseResumeForProfile.bind(aiProfileAnalysisAgent),

  // Parse interview transcription into Q&A pairs
  parseInterviewTranscription: async (transcription: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>, userId?: string) => {
    try {
      // Build a formatted transcript for AI
      const formattedTranscript = transcription
        .map((item) => {
          const timestamp = new Date(item.timestamp).toISOString();
          const speaker = item.role === 'assistant' ? 'INTERVIEWER' : 'CANDIDATE';
          return `[${timestamp}] ${speaker}: ${item.content}`;
        })
        .join('\n\n');
        
      const prompt = `You are analyzing an interview transcription. Parse the following conversation into clear question-answer pairs and provide constructive feedback for each answer.

For each Q&A pair, extract:
1. The question asked by the interviewer
2. The answer given by the candidate
3. The timestamps for both (convert from ISO format to milliseconds since epoch)
4. Provide constructive feedback on the candidate's answer, including:
   - What they did well
   - Areas for improvement
   - Suggestions for a stronger response
   - Overall quality assessment (1-2 sentences)

Return ONLY a JSON object with this structure (no markdown, no additional text):
      {
        data: [
          {
            "question": "the interviewer's question",
            "answer": "the candidate's answer",
            "feedback": "constructive feedback on the answer with specific suggestions for improvement",
            "questionTimestamp": timestamp_in_milliseconds,
            "answerTimestamp": timestamp_in_milliseconds
          }
        ]
      }

IMPORTANT:
- Return ONLY the JSON object, no markdown code blocks or additional text
- Feedback should be constructive, specific, and actionable
- Keep feedback concise but valuable (2-4 sentences)
- Focus on both strengths and areas for improvement

Transcription:
${formattedTranscript}`;

      const response = await wrapOpenAIRequest(
        () => openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_PARSE_TRANSCRIPTION || "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        }),
        {
          requestType: "parseInterviewTranscription",
          model: process.env.OPENAI_MODEL_PARSE_TRANSCRIPTION || "gpt-4o-mini",
          userId: userId || null,
        }
      );

      const responseText = response.choices[0].message.content || '';

      try {
        // Try to parse the response as JSON
        const parsed = JSON.parse(responseText);
        
        return parsed.data || [];
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Fallback to simple parsing
        return transcription
          .filter((item, index) =>
            item.role === 'assistant' &&
            index < transcription.length - 1 &&
            transcription[index + 1].role === 'user'
          )
          .map((item, index) => {
            const nextItem = transcription.find((t, i) =>
              i > transcription.indexOf(item) && t.role === 'user'
            );
            return {
              question: item.content,
              answer: nextItem?.content || '',
              feedback: 'Feedback not available',
              questionTimestamp: item.timestamp,
              answerTimestamp: nextItem?.timestamp || item.timestamp
            };
          });
      }
    } catch (error) {
      console.error('Error parsing transcription with AI:', error);
      // Fallback to simple parsing
      return transcription
        .filter((item, index) =>
          item.role === 'assistant' &&
          index < transcription.length - 1 &&
          transcription[index + 1].role === 'user'
        )
        .map((item, index) => {
          const nextItem = transcription.find((t, i) =>
            i > transcription.indexOf(item) && t.role === 'user'
          );
          return {
            question: item.content,
            answer: nextItem?.content || '',
            feedback: 'Feedback not available',
            questionTimestamp: item.timestamp,
            answerTimestamp: nextItem?.timestamp || item.timestamp
          };
        });
    }
  }
};