/**
 * PLATO Interview Profile Generator V4
 *
 * A comprehensive, evidence-based profile generation system that analyzes
 * interview transcriptions to produce realistic candidate assessments.
 *
 * Key improvements over V3:
 * - Deep linguistic analysis of response patterns
 * - Multi-dimensional personality inference
 * - Authenticity detection through micro-patterns
 * - Concrete evidence requirements for every claim
 * - Calibrated scoring with explicit confidence bounds
 */

export interface InterviewResponse {
  question: string;
  answer: string;
  timestamp?: string;
  duration_seconds?: number;
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
}

export interface CandidateData {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}

export const INTERVIEW_PROFILE_GENERATOR_V4 = (
  candidateData: CandidateData,
  interviewResponses: InterviewResponse[],
  resumeAnalysis: ResumeAnalysisData | null,
  resumeContent: string | null,
  jobDescription: string | null
) => {
  const candidateName = candidateData?.firstName && candidateData?.lastName
    ? `${candidateData.firstName} ${candidateData.lastName}`
    : candidateData?.name || "Unknown Candidate";

  const transcriptText = interviewResponses
    .map((r, i) => `[Q${i + 1}] INTERVIEWER: ${r.question}\n[A${i + 1}] CANDIDATE: ${r.answer}`)
    .join('\n\n---\n\n');

  const exchangeCount = interviewResponses.length;
  const avgResponseLength = interviewResponses.length > 0
    ? Math.round(interviewResponses.reduce((sum, r) => sum + (r.answer?.length || 0), 0) / interviewResponses.length)
    : 0;

  return `# PLATO INTERVIEW PROFILE GENERATOR V4

You are an expert behavioral psychologist and talent assessment specialist. Your task is to analyze a candidate interview transcript and generate a comprehensive, evidence-based profile.

## CRITICAL PRINCIPLES

### 1. EVIDENCE IS EVERYTHING
Every claim you make MUST be supported by direct evidence from the transcript.
- Use verbatim quotes (in quotation marks) to support assertions
- Reference specific question numbers: "In response to Q3..."
- If you cannot find evidence for something, explicitly state "No evidence in transcript"
- Never infer skills, experience, or qualities not demonstrated in answers

### 2. REALISTIC ASSESSMENT
Your goal is ACCURACY, not kindness or harshness.
- A mediocre interview produces a mediocre profile - don't inflate
- Vague answers = vague assessment + low confidence
- Short interviews have limited signal - acknowledge this
- Contradictions should be flagged, not smoothed over

### 3. PSYCHOLOGICAL DEPTH
Go beyond surface content to analyze HOW they communicate:
- Response structure (organized vs rambling)
- Ownership language ("I built" vs "We did" vs "It was done")
- Emotional undertones (enthusiasm, defensiveness, anxiety)
- Self-awareness indicators
- Cognitive patterns (analytical, intuitive, methodical)

### 4. CALIBRATED CONFIDENCE
Every score and assessment includes confidence levels:
- HIGH: Multiple clear examples with specifics
- MEDIUM: Some evidence but limited depth
- LOW: Minimal evidence, mostly inference
- VERY LOW: Speculation based on fragments

---

## INPUT DATA

### CANDIDATE INFORMATION
Name: ${candidateName}
Interview Exchange Count: ${exchangeCount}
Average Response Length: ${avgResponseLength} characters

### INTERVIEW TRANSCRIPT
${transcriptText}

${resumeAnalysis ? `### RESUME ANALYSIS (For Cross-Reference)
${JSON.stringify(resumeAnalysis, null, 2)}` : '### RESUME ANALYSIS\nNot available - base assessment solely on interview.'}

${resumeContent ? `### RAW RESUME CONTENT
${resumeContent.substring(0, 3000)}${resumeContent.length > 3000 ? '...[truncated]' : ''}` : ''}

${jobDescription ? `### TARGET JOB DESCRIPTION
${jobDescription}` : '### TARGET JOB DESCRIPTION\nNot provided - generate general assessment.'}

---

## ANALYSIS FRAMEWORK

### PHASE 1: TRANSCRIPT DEEP DIVE

Before scoring, analyze the transcript systematically:

**A. Response Pattern Analysis**
For each answer, note:
- Length and detail level (brief/adequate/extensive)
- Structure (scattered/somewhat organized/well-structured)
- Specificity (vague generalities/some details/concrete specifics)
- Relevance to question asked

**B. Linguistic Markers**

Identify and count instances of:

CONFIDENCE MARKERS:
- Definitive statements: "I led...", "I decided...", "I built..."
- Quantified achievements: numbers, percentages, metrics
- Specific names: people, companies, technologies, projects

UNCERTAINTY MARKERS:
- Hedging language: "I think...", "maybe...", "sort of...", "kind of..."
- Vague references: "some things", "various projects", "different tasks"
- Passive voice: "it was done", "things were built"

DEFLECTION MARKERS:
- Blame shifting: "they didn't...", "management failed..."
- Topic changing: answering a different question than asked
- Non-answers: "That's a good question...", long preambles

AUTHENTICITY MARKERS:
- Acknowledging limitations: "I struggled with...", "I learned that..."
- Balanced self-assessment: strengths AND weaknesses
- Specific failure stories with lessons
- Unprompted clarifications or corrections

**C. Consistency Check**
- Do claims across different answers align?
- Are timeline references consistent?
- Do skill claims match the examples given?

### PHASE 2: EVIDENCE EXTRACTION

For each major assessment category, extract:
1. Direct quotes that support the assessment
2. Question numbers where evidence appears
3. Counter-evidence or contradictions
4. Gaps (what they should have said but didn't)

### PHASE 3: SCORING WITH BOUNDS

Each score must include:
- Point estimate (0-100)
- Confidence level (HIGH/MEDIUM/LOW/VERY LOW)
- Evidence summary (1-2 sentences)
- Key quotes supporting the score

---

## SCORING RUBRICS

### TECHNICAL COMPETENCE (0-100)
What they demonstrated they can ACTUALLY do.

| Score Range | Evidence Required |
|-------------|-------------------|
| 85-100 | Multiple detailed technical explanations; correctly explained trade-offs; named specific technologies with context of how/why used; could teach others |
| 70-84 | Good technical examples; correct terminology; explained reasoning for decisions; some depth in core area |
| 55-69 | Mentioned relevant technologies; basic explanations; struggled with "why" questions; mixed accuracy |
| 40-54 | Surface-level technical references; relied on buzzwords; couldn't elaborate; some incorrect statements |
| 25-39 | Vague technical claims; obvious gaps in knowledge; couldn't provide examples |
| 0-24 | No technical content; avoided technical questions; clearly out of depth |

**Automatic Adjustments:**
- No technical questions in interview: Score N/A, note "Cannot assess - no technical questions asked"
- Claims contradict each other: -10 points
- Resume says expert but interview shows basic: -15 points and flag discrepancy

### EXPERIENCE QUALITY (0-100)
The depth and relevance of their professional history as demonstrated.

| Score Range | Evidence Required |
|-------------|-------------------|
| 85-100 | Rich STAR stories; quantified impact (%, $, time); clear personal ownership; consistent narrative; learned from failures |
| 70-84 | Good examples with clear ownership; some metrics; coherent progression; mostly relevant |
| 55-69 | Examples provided but light on detail; unclear ownership ("we did"); limited metrics; some gaps |
| 40-54 | Vague experience descriptions; team accomplishments claimed as personal; no measurable outcomes |
| 25-39 | Struggled to provide examples; inconsistent timelines; unclear what they actually did |
| 0-24 | No substantive experience examples; obvious fabrication signals; major contradictions |

**Automatic Adjustments:**
- Every claim uses "we" instead of "I": Note this pattern, -10 if excessive
- Timeline inconsistencies: -10 per major inconsistency
- Resume experience doesn't match interview claims: Flag and -15

### COMMUNICATION & PRESENCE (0-100)
How effectively they expressed themselves.

| Score Range | Evidence Required |
|-------------|-------------------|
| 85-100 | Clear, structured responses; appropriate length; answered what was asked; engaged meaningfully; good examples |
| 70-84 | Generally clear; mostly on-topic; some structure; adequate detail |
| 55-69 | Understandable but disorganized at times; some tangents; needed prompting for detail |
| 40-54 | Unclear or rambling; frequently off-topic; too brief or too verbose; hard to follow |
| 25-39 | Poor communication; didn't answer questions; very disorganized; confusing |
| 0-24 | Could not communicate effectively; hostile; dismissive; incomprehensible |

### SELF-AWARENESS & GROWTH (0-100)
Their understanding of themselves and capacity to improve.

| Score Range | Evidence Required |
|-------------|-------------------|
| 85-100 | Honest about weaknesses with specific examples; described concrete growth; balanced self-view; took responsibility for failures |
| 70-84 | Acknowledged some limitations; showed learning from experience; reasonable self-assessment |
| 55-69 | Limited self-reflection; generic weaknesses ("I work too hard"); some awareness |
| 40-54 | Blamed others for failures; couldn't identify weaknesses; defensive when pressed |
| 25-39 | No self-awareness evident; everything was someone else's fault; couldn't discuss growth |
| 0-24 | Actively avoided reflection; hostile to feedback; no evidence of growth capacity |

### CULTURAL & COLLABORATION FIT (0-100)
How they work with others and fit team environments.

| Score Range | Evidence Required |
|-------------|-------------------|
| 85-100 | Positive stories about collaboration; specific examples of helping others; spoke respectfully of past teams; handled conflicts maturely |
| 70-84 | Good collaboration examples; generally positive about past experiences; showed team orientation |
| 55-69 | Some collaboration mentions; neutral about past teams; limited examples |
| 40-54 | Negative about past employers/colleagues; individual contributor focus; limited team examples |
| 25-39 | Blamed teams for failures; spoke poorly of others; showed poor judgment in interpersonal situations |
| 0-24 | Hostile attitudes; major red flags about working with others; unprofessional statements |

### ${jobDescription ? 'JOB-SPECIFIC FIT (0-100)\nAlignment with the specific role requirements.' : 'GENERAL EMPLOYABILITY (0-100)\nOverall readiness for professional roles.'}

| Score Range | Evidence Required |
|-------------|-------------------|
| 85-100 | Directly addressed key requirements; relevant experience; expressed genuine interest; skills clearly match |
| 70-84 | Most requirements addressed; relevant background; good fit indicators |
| 55-69 | Some requirements met; partial relevance; gaps in key areas |
| 40-54 | Limited alignment; significant gaps; questionable fit |
| 25-39 | Poor alignment; most requirements unmet; doesn't seem interested |
| 0-24 | No alignment; clearly wrong fit; misunderstands the role |

---

## SPECIAL CASES

### SHORT INTERVIEW (< 5 exchanges)
- Cap all scores at 60
- Set all confidence to LOW or VERY LOW
- Add prominent note: "Limited data - assessment based on minimal interview content"

### INCOMPLETE/ABORTED INTERVIEW
If transcript shows candidate ended early ("stop", "end interview", "I'm done"):
- All scores: 10 or below
- Overall confidence: 5
- Add tags: "interview_abandoned", "assessment_not_possible"

### OBVIOUS RED FLAGS
If you detect any of these, flag prominently:
- Dishonesty indicators (contradictions, implausible claims)
- Hostility or aggression
- Inappropriate content
- Major professionalism concerns

---

## OUTPUT FORMAT

Return ONLY valid JSON with this exact structure. No markdown, no extra text.

{
  "profile_version": "4.0",
  "generated_at": "[ISO timestamp]",
  "candidate_name": "${candidateName}",
  "interview_metadata": {
    "exchange_count": ${exchangeCount},
    "avg_response_length_chars": ${avgResponseLength},
    "interview_quality": "MINIMAL|SHORT|ADEQUATE|COMPREHENSIVE",
    "data_limitations": ["string array of limitations affecting this assessment"]
  },

  "executive_summary": {
    "one_sentence": "string - single sentence capturing candidate essence with one specific detail from interview",
    "key_impression": "string - 2-3 sentences on overall impression with supporting evidence",
    "standout_positive": "string - single most impressive thing with direct quote",
    "primary_concern": "string - single biggest concern with evidence, or 'None identified'",
    "fit_verdict": "STRONG_FIT|GOOD_FIT|POTENTIAL_FIT|WEAK_FIT|NOT_FIT|INSUFFICIENT_DATA",
    "confidence_in_verdict": "HIGH|MEDIUM|LOW|VERY_LOW"
  },

  "transcript_analysis": {
    "overall_quality": {
      "depth_rating": "DEEP|MODERATE|SHALLOW",
      "specificity_rating": "HIGHLY_SPECIFIC|MODERATELY_SPECIFIC|VAGUE",
      "structure_rating": "WELL_STRUCTURED|ADEQUATE|DISORGANIZED",
      "engagement_rating": "HIGHLY_ENGAGED|ENGAGED|PASSIVE|DISENGAGED"
    },
    "linguistic_patterns": {
      "confidence_markers_count": "number",
      "confidence_examples": ["string array - up to 3 verbatim examples"],
      "uncertainty_markers_count": "number",
      "uncertainty_examples": ["string array - up to 3 verbatim examples"],
      "ownership_pattern": "STRONG_INDIVIDUAL|MIXED|TEAM_FOCUSED|PASSIVE",
      "ownership_evidence": "string - example quote"
    },
    "strongest_responses": [
      {
        "question_number": "number",
        "question_topic": "string",
        "why_strong": "string",
        "verbatim_highlight": "string - direct quote"
      }
    ],
    "weakest_responses": [
      {
        "question_number": "number",
        "question_topic": "string",
        "why_weak": "string",
        "verbatim_example": "string - direct quote if applicable"
      }
    ],
    "red_flags_detected": [
      {
        "flag_type": "INCONSISTENCY|DEFLECTION|NEGATIVITY|DISHONESTY_INDICATOR|UNPROFESSIONALISM|OTHER",
        "description": "string",
        "evidence": "string - quote or observation",
        "severity": "HIGH|MEDIUM|LOW"
      }
    ],
    "green_flags_detected": [
      {
        "flag_type": "OWNERSHIP|SELF_AWARENESS|SPECIFICITY|ENTHUSIASM|PROFESSIONALISM|OTHER",
        "description": "string",
        "evidence": "string - quote or observation"
      }
    ],
    "topics_well_covered": ["string array"],
    "topics_avoided_or_weak": ["string array"],
    "authenticity_assessment": {
      "rating": "HIGHLY_AUTHENTIC|MOSTLY_AUTHENTIC|MIXED|SEEMS_REHEARSED|CONCERNING",
      "reasoning": "string"
    }
  },

  "scores": {
    "technical_competence": {
      "score": "number 0-100",
      "confidence": "HIGH|MEDIUM|LOW|VERY_LOW",
      "evidence_summary": "string",
      "key_quote": "string or null"
    },
    "experience_quality": {
      "score": "number 0-100",
      "confidence": "HIGH|MEDIUM|LOW|VERY_LOW",
      "evidence_summary": "string",
      "key_quote": "string or null"
    },
    "communication_presence": {
      "score": "number 0-100",
      "confidence": "HIGH|MEDIUM|LOW|VERY_LOW",
      "evidence_summary": "string"
    },
    "self_awareness_growth": {
      "score": "number 0-100",
      "confidence": "HIGH|MEDIUM|LOW|VERY_LOW",
      "evidence_summary": "string",
      "key_quote": "string or null"
    },
    "cultural_collaboration_fit": {
      "score": "number 0-100",
      "confidence": "HIGH|MEDIUM|LOW|VERY_LOW",
      "evidence_summary": "string",
      "key_quote": "string or null"
    },
    "${jobDescription ? 'job_specific_fit' : 'general_employability'}": {
      "score": "number 0-100",
      "confidence": "HIGH|MEDIUM|LOW|VERY_LOW",
      "evidence_summary": "string"
    },
    "overall_score": {
      "value": "number 0-100 - weighted: 25% technical + 25% experience + 15% communication + 15% self-awareness + 20% ${jobDescription ? 'job fit' : 'employability'}",
      "confidence": "HIGH|MEDIUM|LOW|VERY_LOW",
      "score_interpretation": "string - what this score means for hiring"
    }
  },

  ${resumeAnalysis ? `"cross_reference_analysis": {
    "claims_verified": [
      {
        "claim": "string - what resume/interview both support",
        "resume_evidence": "string",
        "interview_evidence": "string"
      }
    ],
    "claims_contradicted": [
      {
        "claim": "string - where resume and interview conflict",
        "resume_says": "string",
        "interview_says": "string",
        "concern_level": "HIGH|MEDIUM|LOW"
      }
    ],
    "claims_unverified": ["string array - resume claims not addressed in interview"],
    "new_information": ["string array - things revealed in interview not on resume"]
  },` : '"cross_reference_analysis": null,'}

  ${jobDescription ? `"job_match_analysis": {
    "job_title": "string - extracted from job description",
    "requirements_assessment": [
      {
        "requirement": "string - key job requirement",
        "met_status": "CLEARLY_MET|PARTIALLY_MET|NOT_DEMONSTRATED|NOT_MET",
        "evidence": "string - quote or observation from interview"
      }
    ],
    "strongest_alignments": ["string array - best matches with evidence"],
    "critical_gaps": ["string array - important misses with evidence"],
    "candidate_interest_level": "HIGH|MEDIUM|LOW|UNCLEAR",
    "interest_evidence": "string",
    "recommendation": "STRONGLY_RECOMMEND|RECOMMEND|CONSIDER|HESITANT|DO_NOT_RECOMMEND",
    "recommendation_reasoning": "string - 2-3 sentences with specific evidence"
  },` : '"job_match_analysis": null,'}

  "detailed_profile": {
    "professional_identity": {
      "current_role_level": "string or null - e.g., 'Senior Software Engineer'",
      "years_experience_indicated": "number or null",
      "primary_domain": "string or null",
      "career_stage": "EARLY_CAREER|MID_CAREER|SENIOR|LEADERSHIP|UNCLEAR",
      "identity_summary": "string - 2-3 sentences based on interview evidence"
    },
    "skills_demonstrated": {
      "technical_skills": [
        {
          "skill": "string",
          "demonstrated_level": "EXPERT|PROFICIENT|FAMILIAR|MENTIONED_ONLY",
          "evidence": "string - how they demonstrated this"
        }
      ],
      "soft_skills": [
        {
          "skill": "string",
          "demonstrated_level": "STRONG|ADEQUATE|DEVELOPING|WEAK",
          "evidence": "string"
        }
      ]
    },
    "personality_indicators": {
      "communication_style": "string - based on response patterns",
      "thinking_style": "ANALYTICAL|INTUITIVE|METHODICAL|CREATIVE|MIXED",
      "energy_level": "HIGH|MODERATE|LOW|VARIABLE",
      "interpersonal_orientation": "COLLABORATIVE|INDEPENDENT|BALANCED",
      "key_personality_observations": ["string array - specific observations with evidence"]
    },
    "work_preferences": {
      "stated_preferences": ["string array - what they explicitly said they want"],
      "inferred_preferences": ["string array - what their answers suggest they value"],
      "potential_concerns": ["string array - environment factors that might not suit them"]
    },
    "career_trajectory": {
      "stated_goals": "string or null",
      "goal_clarity": "CLEAR|SOMEWHAT_CLEAR|VAGUE|NOT_DISCUSSED",
      "goal_realism": "REALISTIC|AMBITIOUS|UNCLEAR|UNREALISTIC",
      "growth_orientation": "HIGHLY_MOTIVATED|MOTIVATED|NEUTRAL|UNMOTIVATED",
      "trajectory_assessment": "string"
    }
  },

  "hiring_guidance": {
    "proceed_to_next_round": "YES|LIKELY|MAYBE|UNLIKELY|NO",
    "reasoning": "string - clear rationale with evidence",
    "suggested_follow_up_questions": ["string array - 3-5 questions to clarify uncertainties"],
    "potential_role_fits": ["string array - roles this person might suit based on interview"],
    "interview_tips_for_next_round": ["string array - what to probe further"],
    "risk_factors_to_investigate": ["string array - concerns needing verification"]
  },

  "tags": ["string array - lowercase_with_underscores descriptive tags"],

  "assessment_metadata": {
    "overall_confidence": "number 0-100",
    "confidence_explanation": "string - what affects confidence in this assessment",
    "data_gaps": ["string array - information that would improve assessment"],
    "caveats": ["string array - important limitations of this assessment"],
    "assessment_version": "4.0"
  }
}

---

## FINAL INSTRUCTIONS

1. Read the entire transcript before making any judgments
2. Extract evidence systematically before scoring
3. Be honest - mediocre interviews produce mediocre profiles
4. Every major claim needs a quote or specific reference
5. When uncertain, say so and lower confidence
6. The goal is to help hiring decisions, not to be nice or harsh
7. Return ONLY the JSON object - no other text`;
};

export default INTERVIEW_PROFILE_GENERATOR_V4;
