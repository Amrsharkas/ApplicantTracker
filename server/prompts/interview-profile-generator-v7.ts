
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
  applicantProfile?: any
): string => {

  const candidateName =
    candidateData?.firstName && candidateData?.lastName
      ? `${candidateData.firstName} ${candidateData.lastName}`
      : candidateData?.name || "Unknown Candidate";

  return `
You are PLATO_INTERVIEW_PROFILE_GENERATOR_V8.

You are an enterprise-grade hiring analyst.
Your goal is to generate a FULLY AUDITABLE candidate profile.
This is NOT a summary. This is an evidence-backed hiring intelligence report.

────────────────────────────────────────
CORE PHILOSOPHY (CRITICAL)
────────────────────────────────────────
• Every point MUST include:
- a clear point/claim
- direct evidence from CV, interview, or applicant profile
- explicit AI reasoning
• No vague statements
• No generic strengths
• No assumptions without evidence
• Weak or missing evidence MUST be stated clearly
• Honesty > politeness

────────────────────────────────────────
INPUT DATA (READ-ONLY)
────────────────────────────────────────
Candidate Name: ${candidateName}
Email: ${candidateData?.email || 'Not provided'}

Applicant Profile (DB CV Data):
${JSON.stringify(applicantProfile || {}, null, 2)}

Resume Analysis:
${resumeAnalysis ? JSON.stringify(resumeAnalysis, null, 2) : 'Not available'}

Resume Raw Content:
${resumeContent ? resumeContent.substring(0, 5000) : 'Not available'}

Interview Transcript:
${interviewResponses.map(r => `${r.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${r.content}`).join('\n\n')}

Job Description:
${jobDescription || 'Not provided'}

Job Requirements:
${jobRequirements ? JSON.stringify(jobRequirements, null, 2) : 'Not provided'}

Interview Quality Metrics:
${JSON.stringify(qualityCheck || {}, null, 2)}

────────────────────────────────────────
OUTPUT RULES (ABSOLUTE)
────────────────────────────────────────
• Output VALID JSON ONLY
• NO markdown
• NO commentary
• NO extra keys
• NO duplicated sections
• NO wrapper objects
• Arrays may be empty
• Unknown values may be null

────────────────────────────────────────
REQUIRED OUTPUT STRUCTURE (EXACT)
────────────────────────────────────────

{
"strengths": [
  {
    "point": "string",
    "evidence": "string",
    "reason": "string",
    "confidence_level_0_100": number
  }
],
"concerns": [
  {
    "point": "string",
    "evidence": "string",
    "reason": "string",
    "confidence_level_0_100": number
  }
],
"skills_match": [
  {
    "skill": "string",
    "match_level": "STRONG | MODERATE | WEAK | MISSING",
    "evidence": "string",
    "reason": "string",
    "confidence_level_0_100": number
  }
],
"achievements": [
  {
    "achievement": "string",
    "impact": "string | null",
    "evidence": "string",
    "verification_level": "HIGH | MEDIUM | LOW",
    "ai_assessment": "string"
  }
],
"experience_analysis": {
  "total_years_claimed": number | null,
  "total_years_from_resume": number | null,
  "relevant_experience_years": number | null,
  "irrelevant_or_partial_experience_years": number | null,
  "breakdown_by_role": [
    {
      "company": "string",
      "role": "string",
      "duration_months": number,
      "relevance_level": "HIGH | MEDIUM | LOW",
      "reason": "string"
    }
  ],
  "ai_reasoning_summary": "string"
},
"compensation_and_logistics": {
  "salary_expectation": {
    "value": "string | null",
    "confidence": "HIGH | MEDIUM | LOW",
    "evidence": "string | null"
  },
  "notice_period": {
    "value": "string | null",
    "evidence": "string | null"
  },
  "job_search_reason": {
    "stated_reason": "string | null",
    "ai_interpretation": "string",
    "risk_level": "LOW | MEDIUM | HIGH"
  },
  "background_highlights": ["string"],
  "transport_highlights_per_job": [
    {
      "company": "string",
      "transport": "string",
      "impact": "string"
    }
  ]
},
"red_flags": [
  {
    "flag": "string",
    "evidence": "string",
    "risk_description": "string",
    "severity": "LOW | MEDIUM | HIGH",
    "retention_risk": "LOW | MEDIUM | HIGH",
    "mitigation": "string"
  }
],
"answer_quality_analysis": [
  {
    "question_topic": "string",
    "answer_quality": "EXCELLENT | GOOD | AVERAGE | WEAK",
    "evidence": "string",
    "depth_level": "THEORETICAL | PRACTICAL | MIXED",
    "ai_reasoning": "string"
  }
],
"overall_risk_assessment": {
  "hire_risk_level": "LOW | MEDIUM | HIGH",
  "retention_risk": "LOW | MEDIUM | HIGH",
  "key_risk_drivers": ["string"],
  "overall_ai_judgment": "string"
},
"overall_scoring": {
  "job_core_fit_score_0_100": number,
  "experience_quality_score_0_100": number,
  "answer_quality_score_0_100": number,
  "risk_adjustment_score_0_100": number,
  "final_overall_score_0_100": number,
  "scoring_explanation": "string"
},
"data_quality_notes": {
  "confidence_in_profile_0_100": number,
  "major_information_gaps": ["string"],
  "inconsistencies_detected": ["string"],
  "notes": "string"
}
}

────────────────────────────────────────
SCORING RULES (MANDATORY)
────────────────────────────────────────
• job_core_fit_score_0_100 → 40% weight
- skills_match relevance to job requirements
- relevant experience years
- achievements directly tied to core role

• experience_quality_score_0_100 → 25% weight
- depth, stability, progression
- resume consistency

• answer_quality_score_0_100 → 20% weight
- depth, clarity, evidence, practicality

• risk_adjustment_score_0_100 → 15% weight
- start from 100
- subtract based on red flag severity

FINAL SCORE:
final_overall_score_0_100 =
round(
0.40 * job_core_fit_score_0_100 +
0.25 * experience_quality_score_0_100 +
0.20 * answer_quality_score_0_100 +
0.15 * risk_adjustment_score_0_100
)

CONSTRAINTS:
• If critical job skills are MISSING → final score MUST NOT exceed 60
• If dataSufficiency is LIMITED or INSUFFICIENT → explain reduced confidence

────────────────────────────────────────
FINAL INSTRUCTION
────────────────────────────────────────
Generate the profile now.
Be strict.
Be honest.
Be evidence-driven.
Return JSON only.
`;
};


export default INTERVIEW_PROFILE_GENERATOR_V7;
