
export interface InterviewResponse {
    role: string;
    content: string;
    timestamp?: string;
}

export interface ResumeAnalysisData {
    skills?: string[];
    experience?: any[];
    education?: any[];
    summary?: string;
    strengths?: string[];
    areas_for_improvement?: string[];
    career_level?: string;
    total_experience_years?: number;
    red_flags?: string[];
    impressive_achievements?: string[];
    verification_points?: string[];
    experience_inconsistencies?: string[];
    credibility_assessment?: any;
    technical_skills?: {
        programming_languages?: string[];
        frameworks?: string[];
        tools?: string[];
        methodologies?: string[];
    };
    soft_skills?: string[];
    industry_knowledge?: string[];
}

export interface CandidateData {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    github_url?: string;
}

export interface JobRequirements {
    title?: string;
    level?: string;
    department?: string;
    required_skills?: string[];
    preferred_skills?: string[];
    responsibilities?: string[];
    qualifications?: string[];
    work_style?: string;
    team_structure?: string;
    company_values?: string[];
    technical_stack?: string[];
    soft_skills_priority?: string[];
}

export const INTERVIEW_PROFILE_GENERATOR_V7 = (
    candidateData: CandidateData,
    interviewResponses: InterviewResponse[],
    resumeAnalysis: ResumeAnalysisData | null,
    resumeContent: string | null,
    jobDescription: string | null,
    jobRequirements?: JobRequirements,
    qualityCheck?: {
        qualityScore: number;
        dataSufficiency: 'SUFFICIENT' | 'ADEQUATE' | 'LIMITED' | 'INSUFFICIENT';
        issues: string[];
        recommendations: string[];
        metrics: {
            questionsCount: number;
            totalWords: number;
            avgResponseLength: number;
            estimatedMinutes: number;
        };
    },
    applicantProfile?: any // CV data field - analyzed applicant profile from database
): string => {
    const candidateName =
        candidateData?.firstName && candidateData?.lastName
            ? `${candidateData.firstName} ${candidateData.lastName}`
            : candidateData?.name || "Unknown Candidate";

    const candidateResponses = interviewResponses.filter(r => r.role === 'user');

    const totalWords = candidateResponses.reduce(
        (sum, r) => sum + (r.content?.split(/\s+/).filter(w => w.length > 0).length || 0),
        0
    );

    const avgResponseLength =
        candidateResponses.length > 0
            ? Math.round(
                candidateResponses.reduce((sum, r) => sum + (r.content?.length || 0), 0) /
                candidateResponses.length
            )
            : 0;

    const estimatedTotalSpeakingTime = Math.round(totalWords / 150);

    const qualityMetrics = qualityCheck || {
        qualityScore:
            candidateResponses.length >= 10 && totalWords >= 500 ? 80 :
                candidateResponses.length >= 5 && totalWords >= 200 ? 60 : 40,
        dataSufficiency:
            candidateResponses.length >= 10 && totalWords >= 500 ? 'SUFFICIENT' :
                candidateResponses.length >= 5 && totalWords >= 200 ? 'ADEQUATE' :
                    candidateResponses.length >= 3 ? 'LIMITED' : 'INSUFFICIENT',
        issues: [],
        recommendations: [],
        metrics: {
            questionsCount: candidateResponses.length,
            totalWords,
            avgResponseLength,
            estimatedMinutes: estimatedTotalSpeakingTime
        }
    };

    // Extract skills from resumeAnalysis, interviewResponses, and applicant profile (CV data)
    const applicantProfileSkills = applicantProfile?.skills ?
        (Array.isArray(applicantProfile.skills) ? applicantProfile.skills : [applicantProfile.skills]) : [];

    // Helper function to ensure value is an array
    const ensureArray = (value: any): any[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        return [value];
    };

    const extractedSkills = [
        ...ensureArray(resumeAnalysis?.skills),
        ...ensureArray(resumeAnalysis?.technical_skills?.programming_languages),
        ...ensureArray(resumeAnalysis?.technical_skills?.frameworks),
        ...ensureArray(resumeAnalysis?.technical_skills?.tools),
        ...ensureArray(resumeAnalysis?.soft_skills),
        ...applicantProfileSkills // Include skills from applicant profile (CV data)
    ].filter((v, i, a) => v && a.indexOf(v) === i); // unique

    // Extract data from applicant profile (CV data) - READ ONLY, DO NOT MODIFY
    const applicantWorkExperiences = applicantProfile?.workExperiences || [];
    const applicantDegrees = applicantProfile?.degrees || [];
    const applicantSkillsData = applicantProfile?.skillsData || applicantProfile?.skillsList || [];
    const applicantCertifications = applicantProfile?.certifications || [];
    const applicantLanguages = applicantProfile?.languages || [];
    const applicantLinkedInUrl = applicantProfile?.linkedinUrl || candidateData?.linkedin_url || '';
    const applicantPortfolioUrl = applicantProfile?.portfolioUrl || candidateData?.portfolio_url || '';
    const applicantGithubUrl = applicantProfile?.githubUrl || candidateData?.github_url || '';

    // Map experience from resumeAnalysis and applicant profile (CV data)
    const resumeExperience = resumeAnalysis?.experience || [];
    const allExperience = [...resumeExperience, ...applicantWorkExperiences];
    const totalExperienceYears = applicantProfile?.totalYearsOfExperience ||
        resumeAnalysis?.total_experience_years || 0;

    // Build comprehensive prompt that requests the FULL structure
    return `You are PLATO_INTERVIEW_PROFILE_GENERATOR_V7, an expert hiring analyst. Your job is to analyze interview transcriptions and generate a comprehensive candidate profile.

## CANDIDATE INFORMATION
**Name:** ${candidateName}
**Email:** ${candidateData?.email || 'Not provided'}

## CV/RESUME DATA (FROM APPLICANT PROFILE TABLE - READ ONLY)
**Work Experiences:**
${JSON.stringify(applicantWorkExperiences, null, 2)}

**Education/Degrees:**
${JSON.stringify(applicantDegrees, null, 2)}

**Skills Data:**
${JSON.stringify(applicantSkillsData, null, 2)}

**Certifications:**
${JSON.stringify(applicantCertifications, null, 2)}

**Languages:**
${JSON.stringify(applicantLanguages, null, 2)}

**URLs:**
- LinkedIn: ${applicantLinkedInUrl || 'Not provided'}
- Portfolio: ${applicantPortfolioUrl || 'Not provided'}
- GitHub: ${applicantGithubUrl || 'Not provided'}

**Additional CV Metadata:**
- Salary Expectation: ${applicantProfile?.salaryExpectation || 'Not provided'}
- Notice Period: ${applicantProfile?.noticePeriod || 'Not provided'}
- Job Search Reason: ${applicantProfile?.jobSearchReason || 'Not provided'}
- Transport Highlights: ${JSON.stringify(applicantProfile?.transportHighlights || [], null, 2)}
- Executive Summary: ${applicantProfile?.executiveSummary || applicantProfile?.summary || 'Not provided'}

## RESUME ANALYSIS
${resumeAnalysis ? JSON.stringify(resumeAnalysis, null, 2) : 'Resume analysis not available'}

## RESUME CONTENT (RAW TEXT)
${resumeContent ? resumeContent.substring(0, 5000) : 'Resume content not available'}

## INTERVIEW TRANSCRIPT
${interviewResponses.map((r, idx) => `${r.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${r.content}`).join('\n\n')}

## JOB DESCRIPTION
${jobDescription || 'No job description provided'}

## INTERVIEW QUALITY METRICS
- Quality Score: ${qualityMetrics.qualityScore}/100
- Data Sufficiency: ${qualityMetrics.dataSufficiency}
- Questions Answered: ${qualityMetrics.metrics.questionsCount}
- Total Words: ${qualityMetrics.metrics.totalWords}
- Average Response Length: ${qualityMetrics.metrics.avgResponseLength} words
- Estimated Duration: ${qualityMetrics.metrics.estimatedMinutes} minutes

${qualityMetrics.issues.length > 0 ? `**⚠️ DATA QUALITY ISSUES:**\n${qualityMetrics.issues.map(issue => `- ${issue}`).join('\n')}\n` : ''}
${qualityMetrics.recommendations.length > 0 ? `**📋 RECOMMENDATIONS:**\n${qualityMetrics.recommendations.map(rec => `- ${rec}`).join('\n')}\n` : ''}

---

## OUTPUT FORMAT (STRICT - YOU MUST RETURN THIS EXACT STRUCTURE)

You MUST output valid JSON only. No extra text, no markdown, no commentary outside the JSON.

Your response MUST be a single JSON object with exactly the following top-level keys:

{
  "meta_profile_overview": {
    "headline": "string - e.g., 'Mid-level Backend Engineer with 5+ years in SaaS'",
    "one_line_summary": "string - very short, recruiter-friendly summary",
    "key_highlights": ["string array - 3-7 bullet-style key strengths"],
    "key_watchouts": ["string array - 0-5 important risks or concerns"]
  },
  "identity_and_background": {
    "full_name": "string | null",
    "city": "string | null",
    "country": "string | null",
    "primary_role": "string | null",
    "seniority_level": "string | null - e.g., 'junior', 'mid', 'senior', 'manager'",
    "years_of_experience": "number | null",
    "brief_background_summary": "string - short paragraph"
  },
  "career_story": {
    "narrative": "string - 1-3 paragraphs describing career journey",
    "key_milestones": ["string array - notable roles, promotions, transitions"],
    "representative_achievements": ["string array - 3-7 concise achievements with context"]
  },
  "skills_and_capabilities": {
    "core_hard_skills": ["string array - main domain skills"],
    "tools_and_technologies": ["string array - important tools or tech"],
    "soft_skills_and_behaviors": ["string array - e.g., 'clear communicator', 'stakeholder management'"],
    "strengths_summary": "string - short paragraph integrating skills from CV plus interview",
    "notable_gaps_or_limits": ["string array - skills or areas that appear weaker or missing"]
  },
  "personality_and_values": {
    "personality_summary": "string - narrative synthesizing patterns from interview",
    "values_and_what_matters": ["string array - 3-7 items e.g., 'autonomy', 'learning', 'stability'"],
    "response_to_stress_and_feedback": "string",
    "decision_making_style": "string"
  },
  "work_style_and_collaboration": {
    "day_to_day_work_style": "string - how they like to work",
    "team_and_collaboration_style": "string - how they show up in teams",
    "communication_style": "string",
    "examples_from_interview": ["string array - brief, evidence-based examples"]
  },
  "technical_and_domain_profile": {
    "domain_focus": ["string array - e.g., ['backend_engineering', 'distributed_systems']"],
    "technical_depth_summary": "string - overall view of depth versus breadth",
    "typical_problems_they_can_solve": ["string array - examples of problem types"],
    "areas_for_further_development": ["string array - where they need growth"]
  },
  "motivation_and_career_direction": {
    "why_they_are_in_this_field": "string",
    "reasons_for_looking_or_leaving": "string | null",
    "short_term_goals_1_2_years": "string | null",
    "long_term_direction_3_5_years": "string | null",
    "clarity_and_realism_assessment": "string - view on how clear/realistic goals seem"
  },
  "risk_and_stability": {
    "integrated_risk_view": "string - narrative combining CV plus interview",
    "job_hopping_risk_note": "string",
    "unemployment_gap_risk_note": "string",
    "stability_overall_assessment": "string - e.g., 'generally stable with one short stint explained by...'"
  },
  "environment_and_culture_fit": {
    "environments_where_they_thrive": ["string array - e.g., 'product-driven SaaS teams'"],
    "environments_where_they_struggle": ["string array - if any"],
    "non_negotiables_summary": "string - integrated view of non-negotiables",
    "culture_fit_notes": "string - high-level comments about culture fit"
  },
  "recommended_roles_and_pathways": {
    "recommended_role_types": ["string array - e.g., ['mid_level_backend_engineer_in_saas']"],
    "suitable_team_or_org_contexts": ["string array - e.g., 'small cross-functional squads'"],
    "leadership_vs_ic_potential": "string - view on whether they lean IC, lead, or both",
    "development_recommendations": ["string array - suggestions for growth"]
  },
  "scores": {
    "technical_skills_score_0_100": "number 0-100 - integrated technical capability",
    "experience_score_0_100": "number 0-100 - quality and quantity of experience",
    "cultural_fit_score_0_100": "number 0-100 - general cultural and behavioral fit",
    "overall_weighted_score_0_100": "number 0-100 - round(0.40 * technical + 0.40 * experience + 0.20 * cultural_fit)"
  },
  "derived_tags": ["string array - final tag list, lowercase with underscores"],
  "data_quality_and_limits": {
    "overall_confidence_0_100": "number 0-100 - confidence in this profile",
    "major_gaps_in_information": ["string array - e.g., 'limited detail on technical stack'"],
    "inconsistencies": ["string array - contradictions between CV and interview, if any"],
    "notes": "string - any additional caveats or comments"
  },
  "trends": {
    "career_trajectory": "string - upward, stable, or concerning trajectory",
    "skill_development_trend": "string - how skills have evolved",
    "communication_trend": "string - communication quality over interview"
  },
  "gaps": {
    "skill_gaps": ["string array - missing skills for the role"],
    "experience_gaps": ["string array - missing experience areas"],
    "knowledge_gaps": ["string array - knowledge areas needing development"]
  },
  "concerns": {
    "red_flags": ["string array - serious concerns"],
    "yellow_flags": ["string array - moderate concerns"],
    "mitigation_strategies": ["string array - how to address concerns"]
  },
  "achievements": [
    {
      "achievement": "string - description",
      "impact": "string - quantifiable impact if mentioned",
      "evidence": "string - quote or reference from interview"
    }
  ],
  "metadata": {
    "salaryExpectation": "${applicantProfile?.salaryExpectation || ''}",
    "noticePeriod": "${applicantProfile?.noticePeriod || ''}",
    "backgroundHighlights": "${applicantProfile?.summary || resumeAnalysis?.summary || ''}",
    "jobSearchReason": "${applicantProfile?.jobSearchReason || ''}",
    "transportHighlights": ${JSON.stringify(applicantProfile?.transportHighlights || [])},
    "interviewQuality": {
      "qualityScore": ${qualityMetrics.qualityScore},
      "dataSufficiency": "${qualityMetrics.dataSufficiency}",
      "questionsCount": ${qualityMetrics.metrics.questionsCount},
      "totalWords": ${qualityMetrics.metrics.totalWords}
    }
  }
}

## CRITICAL RULES:
1. Always return a well-formed JSON object exactly matching this structure
2. Arrays may be empty; fields may be null when unknown
3. All percentage-like fields ending in _0_100 must be numbers between 0 and 100
4. overall_weighted_score_0_100 MUST be computed: round(0.40 * technical_skills_score_0_100 + 0.40 * experience_score_0_100 + 0.20 * cultural_fit_score_0_100)
5. Do NOT include comments in the JSON output
6. Do NOT include any text outside the JSON
7. Use data from applicant profile (CV data) for metadata fields
8. Every major statement must be traceable to interview transcript, CV data, or resume analysis
9. Be honest - mediocre interviews produce mediocre profiles
10. Adjust confidence based on dataSufficiency: INSUFFICIENT/LIMITED = lower confidence, SUFFICIENT = higher confidence

Now generate the comprehensive profile following this exact structure.`;

};

export default INTERVIEW_PROFILE_GENERATOR_V7;
