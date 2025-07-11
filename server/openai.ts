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
    const prompt = `You are an AI interview assistant for Plato, an innovative AI-powered job matching platform. Generate a warm, professional welcome message for a candidate starting their interview.

CANDIDATE DATA:
${userData?.firstName ? `Name: ${userData.firstName} ${userData.lastName || ''}` : 'Candidate'}
${userData?.currentRole ? `Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}` : ''}
${userData?.yearsOfExperience ? `Experience: ${userData.yearsOfExperience} years` : ''}

Create a personalized welcome message that:
1. Warmly welcomes them to Plato
2. Briefly explains what the interview will accomplish
3. Sets a positive, encouraging tone
4. Mentions it will be about 5 questions
5. Personalizes it with their name if available

Keep it conversational, professional, and encouraging. This should feel like a real person welcoming them. The message should be 2-3 sentences maximum.

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
    const userContext = this.buildDetailedUserContext(userData, resumeContent);
    
    const prompt = `You are an expert personal interviewer. Create exactly 5 deep, personal interview questions to understand everything about this candidate as a person - their background, motivations, values, personality, and life journey.

USE THIS SPECIFIC CANDIDATE INFORMATION TO CREATE PERSONALIZED QUESTIONS:
${userContext}

Create 5 personal questions that explore:
1. Their background and upbringing
2. Core values and what drives them
3. Personal motivations and life philosophy
4. How they handle challenges and setbacks
5. What truly fulfills them in life

Make questions deeply personal and insightful. Return ONLY JSON:
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

  async generateProfessionalInterview(userData: any, resumeContent?: string): Promise<InterviewSet> {
    const userContext = this.buildDetailedUserContext(userData, resumeContent);
    
    const prompt = `You are an expert professional interviewer. Create exactly 7 comprehensive professional interview questions to deeply understand this candidate's career journey, work experience, achievements, and professional skills.

USE THIS SPECIFIC CANDIDATE INFORMATION TO CREATE PERSONALIZED QUESTIONS:
${userContext}

Create 7 professional questions that explore:
1. Their career trajectory and key transitions
2. Most significant professional achievements
3. Leadership and teamwork experiences
4. How they handle professional challenges
5. Their professional strengths and expertise
6. Career goals and aspirations
7. What they're looking for in their next role

Make questions specific to their field and experience level. Return ONLY JSON:
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

  async generateTechnicalInterview(userData: any, resumeContent?: string): Promise<InterviewSet> {
    const userRole = userData?.currentRole || userData?.desiredJobTitles?.[0] || 'professional';
    const userField = this.determineUserField(userData, resumeContent);
    const userContext = this.buildDetailedUserContext(userData, resumeContent);
    
    const prompt = `You are an expert technical interviewer. Create exactly 11 technical assessment questions tailored specifically for a ${userRole} in the ${userField} field. Focus heavily on IQ assessment, logical reasoning, pattern recognition, and analytical thinking, with field-specific technical knowledge.

USE THIS SPECIFIC CANDIDATE INFORMATION TO CREATE PERSONALIZED QUESTIONS:
${userContext}

For ${userField} professionals, create 11 questions that assess:
1. Logical reasoning and pattern recognition
2. Mathematical and quantitative thinking
3. Abstract problem-solving abilities
4. Spatial and analytical reasoning
5. Core technical knowledge in their domain
6. Critical thinking and decision-making
7. Cognitive flexibility and adaptability
8. Memory and information processing
9. Verbal reasoning and comprehension
10. Creative problem-solving approaches
11. Technical leadership and strategic thinking

Emphasize IQ-style questions that test intelligence, reasoning ability, and cognitive skills while relating to their field. Include logic puzzles, pattern analysis, mathematical reasoning, and abstract thinking challenges. Return ONLY JSON:
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

  private buildDetailedUserContext(userData: any, resumeContent?: string): string {
    let context = "=== COMPREHENSIVE CANDIDATE PROFILE ===\n\n";
    
    // Basic Information
    if (userData?.firstName || userData?.lastName) {
      context += `📋 PERSONAL DETAILS:\n`;
      context += `• Name: ${userData.firstName || ''} ${userData.lastName || ''}`.trim() + '\n';
      if (userData?.name) context += `• Full Name: ${userData.name}\n`;
      if (userData?.birthdate) context += `• Age/Birthdate: ${userData.birthdate}\n`;
      if (userData?.gender) context += `• Gender: ${userData.gender}\n`;
      if (userData?.nationality) context += `• Nationality: ${userData.nationality}\n`;
      if (userData?.maritalStatus) context += `• Marital Status: ${userData.maritalStatus}\n`;
      if (userData?.dependents) context += `• Dependents: ${userData.dependents}\n`;
      if (userData?.militaryStatus) context += `• Military Status: ${userData.militaryStatus}\n`;
      context += '\n';
    }
    
    // Location & Contact
    if (userData?.country || userData?.city || userData?.location) {
      context += `📍 LOCATION & CONTACT:\n`;
      if (userData?.country) context += `• Country: ${userData.country}\n`;
      if (userData?.city) context += `• City: ${userData.city}\n`;
      if (userData?.location) context += `• General Location: ${userData.location}\n`;
      if (userData?.willingToRelocate !== undefined) context += `• Willing to Relocate: ${userData.willingToRelocate ? 'Yes' : 'No'}\n`;
      if (userData?.mobileNumber) context += `• Mobile: ${userData.mobileNumber}\n`;
      if (userData?.emailAddress) context += `• Email: ${userData.emailAddress}\n`;
      context += '\n';
    }
    
    // Career Information
    context += `💼 CAREER PROFILE:\n`;
    if (userData?.currentRole) context += `• Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}\n`;
    if (userData?.totalYearsExperience !== undefined) context += `• Total Experience: ${userData.totalYearsExperience} years\n`;
    if (userData?.careerLevel) context += `• Career Level: ${userData.careerLevel}\n`;
    if (userData?.jobSearchStatus) context += `• Job Search Status: ${userData.jobSearchStatus}\n`;
    if (userData?.preferredWorkplace) context += `• Preferred Workplace: ${userData.preferredWorkplace}\n`;
    if (userData?.minimumSalary) context += `• Minimum Salary: ${userData.minimumSalary}\n`;
    if (userData?.hideSalaryFromEmployers) context += `• Hide Salary from Employers: ${userData.hideSalaryFromEmployers ? 'Yes' : 'No'}\n`;
    context += '\n';
    
    // Career Interests
    if (userData?.jobTypesOpen?.length || userData?.desiredJobTitles?.length || userData?.jobCategories?.length) {
      context += `🎯 CAREER INTERESTS:\n`;
      if (userData?.jobTypesOpen?.length) context += `• Job Types Open To: ${userData.jobTypesOpen.join(', ')}\n`;
      if (userData?.desiredJobTitles?.length) context += `• Desired Job Titles: ${userData.desiredJobTitles.join(', ')}\n`;
      if (userData?.jobCategories?.length) context += `• Job Categories: ${userData.jobCategories.join(', ')}\n`;
      if (userData?.preferredWorkCountries?.length) context += `• Preferred Work Countries: ${userData.preferredWorkCountries.join(', ')}\n`;
      context += '\n';
    }
    
    // Work Experience
    if (userData?.workExperiences?.length) {
      context += `💻 WORK EXPERIENCE:\n`;
      userData.workExperiences.forEach((exp: any, index: number) => {
        context += `${index + 1}. ${exp.jobTitle || 'Position'} at ${exp.company || 'Company'}\n`;
        if (exp.startDate || exp.endDate) context += `   Duration: ${exp.startDate || 'Start'} - ${exp.endDate || 'Present'}\n`;
        if (exp.description) context += `   Description: ${exp.description}\n`;
        if (exp.achievements) context += `   Achievements: ${exp.achievements}\n`;
      });
      context += '\n';
    }
    
    // Skills
    if (userData?.skills?.length) {
      context += `🛠️ SKILLS & EXPERTISE:\n`;
      userData.skills.forEach((skill: any) => {
        const proficiency = skill.proficiency ? ` (${skill.proficiency}/5 stars)` : '';
        context += `• ${skill.name || skill}${proficiency}\n`;
      });
      context += '\n';
    }
    
    // Languages
    if (userData?.languages?.length) {
      context += `🗣️ LANGUAGES:\n`;
      userData.languages.forEach((lang: any) => {
        context += `• ${lang.name || lang}`;
        if (lang.reading || lang.writing || lang.listening || lang.speaking) {
          const skills = [];
          if (lang.reading) skills.push(`Reading: ${lang.reading}`);
          if (lang.writing) skills.push(`Writing: ${lang.writing}`);
          if (lang.listening) skills.push(`Listening: ${lang.listening}`);
          if (lang.speaking) skills.push(`Speaking: ${lang.speaking}`);
          context += ` (${skills.join(', ')})`;
        }
        context += '\n';
      });
      context += '\n';
    }
    
    // Education
    context += `🎓 EDUCATION:\n`;
    if (userData?.currentEducationLevel) context += `• Current Education Level: ${userData.currentEducationLevel}\n`;
    if (userData?.universityDegrees?.length) {
      context += `• University Degrees:\n`;
      userData.universityDegrees.forEach((degree: any, index: number) => {
        context += `  ${index + 1}. ${degree.degreeType || 'Degree'} in ${degree.fieldOfStudy || 'Field'}\n`;
        if (degree.university) context += `     University: ${degree.university}\n`;
        if (degree.graduationYear) context += `     Graduation: ${degree.graduationYear}\n`;
        if (degree.gpa) context += `     GPA: ${degree.gpa}\n`;
      });
    }
    if (userData?.education) context += `• General Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}\n`;
    context += '\n';
    
    // Additional Qualifications
    if (userData?.certifications?.length) {
      context += `📜 CERTIFICATIONS:\n`;
      userData.certifications.forEach((cert: any, index: number) => {
        context += `${index + 1}. ${cert.name || 'Certification'}\n`;
        if (cert.issuingOrganization) context += `   Issued by: ${cert.issuingOrganization}\n`;
        if (cert.issueDate) context += `   Date: ${cert.issueDate}\n`;
        if (cert.expiryDate) context += `   Expires: ${cert.expiryDate}\n`;
      });
      context += '\n';
    }
    
    if (userData?.trainingCourses?.length) {
      context += `📚 TRAINING & COURSES:\n`;
      userData.trainingCourses.forEach((course: any, index: number) => {
        context += `${index + 1}. ${course.topic || 'Course'}\n`;
        if (course.organization) context += `   Organization: ${course.organization}\n`;
        if (course.monthYear) context += `   Completed: ${course.monthYear}\n`;
        if (course.additionalInfo) context += `   Details: ${course.additionalInfo}\n`;
      });
      context += '\n';
    }
    
    // Online Presence
    if (userData?.linkedinUrl || userData?.githubUrl || userData?.websiteUrl) {
      context += `🌐 ONLINE PRESENCE:\n`;
      if (userData?.linkedinUrl) context += `• LinkedIn: ${userData.linkedinUrl}\n`;
      if (userData?.githubUrl) context += `• GitHub: ${userData.githubUrl}\n`;
      if (userData?.websiteUrl) context += `• Website: ${userData.websiteUrl}\n`;
      if (userData?.facebookUrl) context += `• Facebook: ${userData.facebookUrl}\n`;
      if (userData?.twitterUrl) context += `• Twitter: ${userData.twitterUrl}\n`;
      if (userData?.instagramUrl) context += `• Instagram: ${userData.instagramUrl}\n`;
      if (userData?.youtubeUrl) context += `• YouTube: ${userData.youtubeUrl}\n`;
      if (userData?.otherUrl) context += `• Other: ${userData.otherUrl}\n`;
      context += '\n';
    }
    
    // Achievements
    if (userData?.achievements) {
      context += `🏆 ACHIEVEMENTS:\n${userData.achievements}\n\n`;
    }
    
    // Profile Summary
    if (userData?.summary) {
      context += `📝 PROFILE SUMMARY:\n${userData.summary}\n\n`;
    }
    
    // Resume Content
    if (resumeContent) {
      context += `📄 RESUME CONTENT:\n${resumeContent}\n\n`;
    }
    
    context += "=== END OF PROFILE ===\n";
    context += "Use this comprehensive information to create highly personalized, specific questions that reference their actual background, experiences, and goals.";
    
    return context;
  }

  private determineUserField(userData: any, resumeContent?: string): string {
    // Collect all text sources for analysis
    const role = (userData?.currentRole || '').toLowerCase();
    const summary = (userData?.summary || '').toLowerCase();
    const resume = (resumeContent || '').toLowerCase();
    
    // Include career interests and job preferences
    const desiredTitles = (userData?.desiredJobTitles || []).join(' ').toLowerCase();
    const jobCategories = (userData?.jobCategories || []).join(' ').toLowerCase();
    
    // Include skills
    const skills = (userData?.skills || []).map((skill: any) => 
      typeof skill === 'string' ? skill : skill.name || ''
    ).join(' ').toLowerCase();
    
    // Include education field
    const education = userData?.universityDegrees?.map((degree: any) => 
      `${degree.fieldOfStudy || ''} ${degree.degreeType || ''}`
    ).join(' ').toLowerCase() || '';
    
    // Include work experience
    const workExp = (userData?.workExperiences || []).map((exp: any) => 
      `${exp.jobTitle || ''} ${exp.description || ''}`
    ).join(' ').toLowerCase();
    
    // Combine all text for comprehensive analysis
    const allText = `${role} ${summary} ${resume} ${desiredTitles} ${jobCategories} ${skills} ${education} ${workExp}`;

    // Enhanced field detection with more specific patterns
    if (allText.includes('software') || allText.includes('developer') || allText.includes('programming') || 
        allText.includes('coding') || allText.includes('frontend') || allText.includes('backend') || 
        allText.includes('fullstack') || allText.includes('web development') || allText.includes('mobile app')) {
      return 'Software Engineering';
    } else if (allText.includes('civil engineer') || allText.includes('structural') || allText.includes('construction') ||
               allText.includes('infrastructure') || allText.includes('building design')) {
      return 'Civil Engineering';
    } else if (allText.includes('mechanical engineer') || allText.includes('manufacturing') || allText.includes('automotive') ||
               allText.includes('machinery') || allText.includes('robotics')) {
      return 'Mechanical Engineering';
    } else if (allText.includes('electrical engineer') || allText.includes('electronics') || allText.includes('power systems') ||
               allText.includes('telecommunications') || allText.includes('circuit')) {
      return 'Electrical Engineering';
    } else if (allText.includes('finance') || allText.includes('investment') || allText.includes('banking') || 
               allText.includes('analyst') || allText.includes('accounting') || allText.includes('financial')) {
      return 'Finance';
    } else if (allText.includes('marketing') || allText.includes('sales') || allText.includes('growth') ||
               allText.includes('advertising') || allText.includes('brand') || allText.includes('promotion')) {
      return 'Marketing & Sales';
    } else if (allText.includes('design') || allText.includes('creative') || allText.includes('ux') || 
               allText.includes('ui') || allText.includes('graphic') || allText.includes('visual')) {
      return 'Design';
    } else if (allText.includes('data') || allText.includes('analytics') || allText.includes('scientist') ||
               allText.includes('machine learning') || allText.includes('artificial intelligence') || allText.includes('statistics')) {
      return 'Data Science';
    } else if (allText.includes('product') || allText.includes('management') || allText.includes('strategy') ||
               allText.includes('project manager') || allText.includes('product manager')) {
      return 'Product Management';
    } else if (allText.includes('operations') || allText.includes('consulting') || allText.includes('business') ||
               allText.includes('analyst') || allText.includes('coordinator')) {
      return 'Business Operations';
    } else if (allText.includes('teacher') || allText.includes('education') || allText.includes('academic') ||
               allText.includes('professor') || allText.includes('instructor')) {
      return 'Education';
    } else if (allText.includes('healthcare') || allText.includes('medical') || allText.includes('nurse') ||
               allText.includes('doctor') || allText.includes('physician') || allText.includes('clinical')) {
      return 'Healthcare';
    } else if (allText.includes('legal') || allText.includes('lawyer') || allText.includes('attorney') ||
               allText.includes('law') || allText.includes('paralegal')) {
      return 'Legal';
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

    // Build comprehensive context using the same method as the interview agent
    const userContext = this.buildDetailedUserContext(userData, resumeContent);

    const prompt = `You are an expert AI career analyst specializing in comprehensive candidate assessment. Your job is to analyze ALL available data about a candidate and create a detailed professional profile.

${userContext}

INTERVIEW RESPONSES:
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

  private buildDetailedUserContext(userData: any, resumeContent?: string): string {
    let context = "=== COMPREHENSIVE CANDIDATE PROFILE ===\n\n";
    
    // Basic Information
    if (userData?.firstName || userData?.lastName) {
      context += `📋 PERSONAL DETAILS:\n`;
      context += `• Name: ${userData.firstName || ''} ${userData.lastName || ''}`.trim() + '\n';
      if (userData?.name) context += `• Full Name: ${userData.name}\n`;
      if (userData?.birthdate) context += `• Age/Birthdate: ${userData.birthdate}\n`;
      if (userData?.gender) context += `• Gender: ${userData.gender}\n`;
      if (userData?.nationality) context += `• Nationality: ${userData.nationality}\n`;
      if (userData?.maritalStatus) context += `• Marital Status: ${userData.maritalStatus}\n`;
      if (userData?.dependents) context += `• Dependents: ${userData.dependents}\n`;
      if (userData?.militaryStatus) context += `• Military Status: ${userData.militaryStatus}\n`;
      context += '\n';
    }
    
    // Location & Contact
    if (userData?.country || userData?.city || userData?.location) {
      context += `📍 LOCATION & CONTACT:\n`;
      if (userData?.country) context += `• Country: ${userData.country}\n`;
      if (userData?.city) context += `• City: ${userData.city}\n`;
      if (userData?.location) context += `• General Location: ${userData.location}\n`;
      if (userData?.willingToRelocate !== undefined) context += `• Willing to Relocate: ${userData.willingToRelocate ? 'Yes' : 'No'}\n`;
      if (userData?.mobileNumber) context += `• Mobile: ${userData.mobileNumber}\n`;
      if (userData?.emailAddress) context += `• Email: ${userData.emailAddress}\n`;
      context += '\n';
    }
    
    // Career Information
    context += `💼 CAREER PROFILE:\n`;
    if (userData?.currentRole) context += `• Current Role: ${userData.currentRole}${userData.company ? ` at ${userData.company}` : ''}\n`;
    if (userData?.totalYearsExperience !== undefined) context += `• Total Experience: ${userData.totalYearsExperience} years\n`;
    if (userData?.careerLevel) context += `• Career Level: ${userData.careerLevel}\n`;
    if (userData?.jobSearchStatus) context += `• Job Search Status: ${userData.jobSearchStatus}\n`;
    if (userData?.preferredWorkplace) context += `• Preferred Workplace: ${userData.preferredWorkplace}\n`;
    if (userData?.minimumSalary) context += `• Minimum Salary: ${userData.minimumSalary}\n`;
    if (userData?.hideSalaryFromEmployers) context += `• Hide Salary from Employers: ${userData.hideSalaryFromEmployers ? 'Yes' : 'No'}\n`;
    context += '\n';
    
    // Career Interests
    if (userData?.jobTypesOpen?.length || userData?.desiredJobTitles?.length || userData?.jobCategories?.length) {
      context += `🎯 CAREER INTERESTS:\n`;
      if (userData?.jobTypesOpen?.length) context += `• Job Types Open To: ${userData.jobTypesOpen.join(', ')}\n`;
      if (userData?.desiredJobTitles?.length) context += `• Desired Job Titles: ${userData.desiredJobTitles.join(', ')}\n`;
      if (userData?.jobCategories?.length) context += `• Job Categories: ${userData.jobCategories.join(', ')}\n`;
      if (userData?.preferredWorkCountries?.length) context += `• Preferred Work Countries: ${userData.preferredWorkCountries.join(', ')}\n`;
      context += '\n';
    }
    
    // Work Experience
    if (userData?.workExperiences?.length) {
      context += `💻 WORK EXPERIENCE:\n`;
      userData.workExperiences.forEach((exp: any, index: number) => {
        context += `${index + 1}. ${exp.jobTitle || 'Position'} at ${exp.company || 'Company'}\n`;
        if (exp.startDate || exp.endDate) context += `   Duration: ${exp.startDate || 'Start'} - ${exp.endDate || 'Present'}\n`;
        if (exp.description) context += `   Description: ${exp.description}\n`;
        if (exp.achievements) context += `   Achievements: ${exp.achievements}\n`;
      });
      context += '\n';
    }
    
    // Skills
    if (userData?.skills?.length) {
      context += `🛠️ SKILLS & EXPERTISE:\n`;
      userData.skills.forEach((skill: any) => {
        const proficiency = skill.proficiency ? ` (${skill.proficiency}/5 stars)` : '';
        context += `• ${skill.name || skill}${proficiency}\n`;
      });
      context += '\n';
    }
    
    // Languages
    if (userData?.languages?.length) {
      context += `🗣️ LANGUAGES:\n`;
      userData.languages.forEach((lang: any) => {
        context += `• ${lang.name || lang}`;
        if (lang.reading || lang.writing || lang.listening || lang.speaking) {
          const skills = [];
          if (lang.reading) skills.push(`Reading: ${lang.reading}`);
          if (lang.writing) skills.push(`Writing: ${lang.writing}`);
          if (lang.listening) skills.push(`Listening: ${lang.listening}`);
          if (lang.speaking) skills.push(`Speaking: ${lang.speaking}`);
          context += ` (${skills.join(', ')})`;
        }
        context += '\n';
      });
      context += '\n';
    }
    
    // Education
    context += `🎓 EDUCATION:\n`;
    if (userData?.currentEducationLevel) context += `• Current Education Level: ${userData.currentEducationLevel}\n`;
    if (userData?.universityDegrees?.length) {
      context += `• University Degrees:\n`;
      userData.universityDegrees.forEach((degree: any, index: number) => {
        context += `  ${index + 1}. ${degree.degreeType || 'Degree'} in ${degree.fieldOfStudy || 'Field'}\n`;
        if (degree.university) context += `     University: ${degree.university}\n`;
        if (degree.graduationYear) context += `     Graduation: ${degree.graduationYear}\n`;
        if (degree.gpa) context += `     GPA: ${degree.gpa}\n`;
      });
    }
    if (userData?.education) context += `• General Education: ${userData.education}${userData.university ? ` from ${userData.university}` : ''}\n`;
    context += '\n';
    
    // Additional Qualifications
    if (userData?.certifications?.length) {
      context += `📜 CERTIFICATIONS:\n`;
      userData.certifications.forEach((cert: any, index: number) => {
        context += `${index + 1}. ${cert.name || 'Certification'}\n`;
        if (cert.issuingOrganization) context += `   Issued by: ${cert.issuingOrganization}\n`;
        if (cert.issueDate) context += `   Date: ${cert.issueDate}\n`;
        if (cert.expiryDate) context += `   Expires: ${cert.expiryDate}\n`;
      });
      context += '\n';
    }
    
    if (userData?.trainingCourses?.length) {
      context += `📚 TRAINING & COURSES:\n`;
      userData.trainingCourses.forEach((course: any, index: number) => {
        context += `${index + 1}. ${course.topic || 'Course'}\n`;
        if (course.organization) context += `   Organization: ${course.organization}\n`;
        if (course.monthYear) context += `   Completed: ${course.monthYear}\n`;
        if (course.additionalInfo) context += `   Details: ${course.additionalInfo}\n`;
      });
      context += '\n';
    }
    
    // Online Presence
    if (userData?.linkedinUrl || userData?.githubUrl || userData?.websiteUrl) {
      context += `🌐 ONLINE PRESENCE:\n`;
      if (userData?.linkedinUrl) context += `• LinkedIn: ${userData.linkedinUrl}\n`;
      if (userData?.githubUrl) context += `• GitHub: ${userData.githubUrl}\n`;
      if (userData?.websiteUrl) context += `• Website: ${userData.websiteUrl}\n`;
      if (userData?.facebookUrl) context += `• Facebook: ${userData.facebookUrl}\n`;
      if (userData?.twitterUrl) context += `• Twitter: ${userData.twitterUrl}\n`;
      if (userData?.instagramUrl) context += `• Instagram: ${userData.instagramUrl}\n`;
      if (userData?.youtubeUrl) context += `• YouTube: ${userData.youtubeUrl}\n`;
      if (userData?.otherUrl) context += `• Other: ${userData.otherUrl}\n`;
      context += '\n';
    }
    
    // Achievements
    if (userData?.achievements) {
      context += `🏆 ACHIEVEMENTS:\n${userData.achievements}\n\n`;
    }
    
    // Profile Summary
    if (userData?.summary) {
      context += `📝 PROFILE SUMMARY:\n${userData.summary}\n\n`;
    }
    
    // Resume Content
    if (resumeContent) {
      context += `📄 RESUME CONTENT:\n${resumeContent}\n\n`;
    }
    
    context += "=== END OF PROFILE ===\n";
    context += "Use this comprehensive information to create accurate, specific professional analysis based on their actual background, experiences, and goals.";
    
    return context;
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
  generatePersonalInterview: aiInterviewAgent.generatePersonalInterview.bind(aiInterviewAgent),
  generateProfessionalInterview: aiInterviewAgent.generateProfessionalInterview.bind(aiInterviewAgent),
  generateTechnicalInterview: aiInterviewAgent.generateTechnicalInterview.bind(aiInterviewAgent),
  generateInitialQuestions: aiInterviewAgent.generatePersonalizedQuestions.bind(aiInterviewAgent),
  generateProfile: aiProfileAnalysisAgent.generateComprehensiveProfile.bind(aiProfileAnalysisAgent),
  parseResume: aiProfileAnalysisAgent.parseResume.bind(aiProfileAnalysisAgent)
};