/**
 * PLATO INTERVIEW PROFILE GENERATOR V6 - ULTRA-COMPREHENSIVE TRANSCRIPTION ANALYSIS
 *
 * A sophisticated, multi-dimensional AI-powered interview assessment system that performs
 * exhaustive transcription analysis to extract granular insights about candidate capabilities,
 * communication patterns, technical proficiency, behavioral indicators, and predictive success metrics.
 *
 * Key enhancements in V6:
 * - Advanced psycholinguistic analysis and personality trait detection
 * - Micro-expression and behavioral pattern recognition from language
 * - Technical debt awareness and code quality assessment
 * - Growth trajectory prediction and role readiness scoring
 * - Team dynamics compatibility matrix
 * - Innovation and creativity quotient assessment
 * - Resilience and adaptability under pressure indicators
 * - Cross-functional collaboration potential analysis
 * - Leadership style detection and development roadmap
 * - Cultural value alignment deep-dive analysis
 * - Compensation expectations alignment analysis
 * - Risk mitigation strategies and onboarding requirements
 */

export interface InterviewResponse {
  role: string; // 'user' or 'ai' (interviewer or candidate)
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

export const INTERVIEW_PROFILE_GENERATOR_V6 = (
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
  }
) => {
  const candidateName = candidateData?.firstName && candidateData?.lastName
    ? `${candidateData.firstName} ${candidateData.lastName}`
    : candidateData?.name || "Unknown Candidate";

  const transcriptText = JSON.stringify(interviewResponses, null, 2);


  // Filter for candidate responses only (user role)
  const candidateResponses = interviewResponses.filter(r => r.role === 'user');
  const interviewerQuestions = interviewResponses.filter(r => r.role === 'ai');

  // Calculate candidate-specific metrics
  const candidateExchangeCount = candidateResponses.length;
  const totalWords = candidateResponses.reduce((sum, r) => {
    return sum + (r.content?.split(/\s+/).filter(w => w.length > 0).length || 0);
  }, 0);

  const avgResponseLength = candidateResponses.length > 0
    ? Math.round(candidateResponses.reduce((sum, r) => sum + (r.content?.length || 0), 0) / candidateResponses.length)
    : 0;

  // Estimate speaking rate (assuming average 150 WPM for responses)
  const estimatedTotalSpeakingTime = totalWords / 150; // minutes
  const avgSpeakingRate = candidateResponses.length > 0 ? 150 : 0; // estimated WPM

  const qualityMetrics = qualityCheck || {
    qualityScore: candidateExchangeCount >= 10 && totalWords >= 500 ? 80 :
      candidateExchangeCount >= 5 && totalWords >= 200 ? 60 : 40,
    dataSufficiency: candidateExchangeCount >= 10 && totalWords >= 500 ? 'SUFFICIENT' :
      candidateExchangeCount >= 5 && totalWords >= 200 ? 'ADEQUATE' :
        candidateExchangeCount >= 3 ? 'LIMITED' : 'INSUFFICIENT',
    issues: [],
    recommendations: [],
    metrics: {
      questionsCount: candidateExchangeCount,
      totalWords,
      avgResponseLength: avgResponseLength,
      estimatedMinutes: Math.round(estimatedTotalSpeakingTime)
    }
  };

  return `# PLATO ADVANCED INTERVIEW ASSESSMENT V6

You are an expert industrial-organizational psychologist, linguistics specialist, and senior technical interviewer working as a team. Your task is to perform a comprehensive analysis of this interview transcript to provide the most detailed, nuanced assessment possible.

## ANALYTICAL FRAMEWORK

### 1. LINGUISTIC ANALYSIS MODULE
Analyze the candidate's language patterns, cognitive complexity, and communication sophistication:

**Vocabulary & Language Complexity:**
- Lexical diversity and vocabulary range
- Technical terminology usage accuracy
- Abstract vs. concrete language balance
- Metaphor and analogy usage
- Sentence structure complexity
- Industry-specific jargon appropriateness

**Cognitive Indicators:**
- Critical thinking demonstration
- Problem-solving approach articulation
- Logical reasoning patterns
- Conceptual understanding depth
- Learning agility indicators
- Metacognition awareness

**Communication Patterns:**
- Narrative structure usage
- Example elaboration quality
- STAR method implementation
- Conciseness vs. thoroughness balance
- Question interpretation accuracy
- Active listening indicators

### 2. BEHAVIORAL ASSESSMENT MODULE
Extract behavioral competencies from response patterns:

**Leadership Behaviors:**
- Initiative taking examples
- Influencing attempts
- Decision-making processes
- Conflict resolution approaches
- Team collaboration descriptions
- Accountability demonstrations

**Adaptability Indicators:**
- Change management experiences
- Learning from failures
- Problem-solving flexibility
- Ambiguity tolerance
- Cross-functional collaboration

**Work Ethic Patterns:**
- Project commitment examples
- Quality standards demonstration
- Time management strategies
- Priority setting approaches
- Deliverable consistency

### 3. TECHNICAL DEPTH ANALYSIS
Evaluate technical capabilities through content analysis:

**Technical Knowledge:**
- Domain expertise demonstration
- Tool/methodology familiarity
- Best practices awareness
- Problem-solving approach
- Implementation knowledge
- Industry standard understanding

**Practical Application:**
- Real-world experience examples
- Technical decision rationale
- Trade-off considerations
- Solution scalability awareness
- Security/maintainability focus

**Learning Capability:**
- Technology acquisition examples
- Self-learning strategies
- Knowledge sharing approaches
- Continuous learning mindset

### 4. EMOTIONAL INTELLIGENCE ASSESSMENT
Analyze emotional and social competencies:

**Self-Awareness:**
- Strength recognition accuracy
- Limitation acknowledgment
- Values articulation
- Motivation understanding
- Impact awareness

**Social Awareness:**
- Stakeholder consideration
- Team dynamics understanding
- Customer focus demonstration
- Cultural awareness
- Empathy indicators

**Relationship Management:**
- Conflict navigation
- Influence without authority
- Feedback reception
- Collaboration success
- Network building

### 5. PSYCHOLINGUISTIC ANALYSIS
Deep linguistic pattern analysis for personality and behavioral insights:

**Personality Trait Indicators:**
- Big Five personality traits detection (OCEAN)
- Cognitive reflection and analytical thinking patterns
- Risk tolerance and decision-making style
- Ambition and drive indicators
- Conscientiousness and attention to detail
- Openness to experience and innovation
- Neuroticism and stress handling patterns

**Communication Psychology:**
- Assertiveness vs. passiveness in language
- Collaboration preference indicators
- Leadership vs. follower language patterns
- Problem-solving orientation (proactive vs. reactive)
- Learning orientation (growth vs. fixed mindset)
- Adaptability and change readiness indicators

**Behavioral Consistency:**
- Response pattern consistency analysis
- Value-behavior alignment verification
- Contradiction detection between stated and demonstrated traits
- Authenticity indicators in communication
- Emotional regulation through language patterns

### 6. TECHNICAL DEBT & CODE PHILOSOPHY ASSESSMENT
Analyze approach to technical quality and maintainability:

**Technical Best Practices:**
- Code quality awareness and standards
- Technical debt understanding and management approach
- Testing philosophy and quality assurance mindset
- Documentation and knowledge sharing commitment
- Security-first approach indicators
- Performance optimization awareness

**Architectural Thinking:**
- System design and scalability considerations
- Trade-off decision rationale
- Technical decision documentation approach
- Code review and collaboration practices
- Technical leadership potential indicators

**Innovation & Learning:**
- Technology trend awareness
- Continuous learning demonstration
- Experimentation and innovation mindset
- Knowledge sharing and mentorship potential
- Technical curiosity indicators

### 7. LEADERSHIP & TEAM DYNAMICS ANALYSIS
Evaluate leadership potential and team compatibility:

**Leadership Style Assessment:**
- Transformational vs. transactional leadership indicators
- Servant leadership characteristics
- Situational leadership adaptability
- Vision and strategic thinking communication
- Decision-making approach (autocratic vs. collaborative)
- Accountability and ownership demonstration

**Team Integration Potential:**
- Collaboration style indicators
- Conflict resolution approach
- Communication clarity and effectiveness
- Psychological safety contribution potential
- Diversity and inclusion awareness
- Remote/hybrid team compatibility

**Influence & Motivation:**
- Ability to inspire and motivate others
- Persuasive communication techniques
- Stakeholder management approach
- Network building and relationship cultivation
- Change management and transformation leadership

### 8. ADAPTABILITY & RESILIENCE ASSESSMENT
Analyze change readiness and pressure handling:

**Change Adaptability:**
- Learning agility demonstration
- Technology adoption speed indicators
- Process flexibility and improvement mindset
- Ambiguity tolerance and problem-solving
- Cross-functional experience and versatility

**Pressure Handling:**
- Stress indicators in language patterns
- Deadline and pressure response patterns
- Problem-solving under duress examples
- Emotional regulation during challenges
- Recovery and learning from setbacks

**Growth Mindset Indicators:**
- Continuous learning commitment
- Feedback seeking and implementation
- Challenge embracing behavior
- Failure reframing and learning orientation
- Self-improvement and development planning

---

## INPUT DATA

### CANDIDATE PROFILE
Name: ${candidateName}
Email: ${candidateData?.email || 'Not provided'}
LinkedIn: ${candidateData?.linkedin_url || 'Not provided'}
Portfolio: ${candidateData?.portfolio_url || 'Not provided'}
GitHub: ${candidateData?.github_url || 'Not provided'}

### INTERVIEW STATISTICS
Total Questions Asked: ${interviewerQuestions.length}
Candidate Responses: ${candidateExchangeCount}
Total Response Words: ${totalWords}
Average Response Length: ${avgResponseLength} characters
Estimated Speaking Time: ${Math.round(estimatedTotalSpeakingTime)} minutes
Average Speaking Rate: ${avgSpeakingRate} WPM

### FULL INTERVIEW TRANSCRIPT
**Interviewer Questions and Candidate Responses:**

${interviewResponses.map((r, i) => {
    const role = r.role === 'ai' ? 'Interviewer' : 'Candidate';
    return `### ${i + 1}. ${role} (${r.role === 'ai' ? 'Q' : 'A'})
${r.content}`;
  }).join('\n\n')}

### CANDIDATE RESPONSES ANALYSIS
${candidateResponses.map((r, i) => `
**Response ${i + 1}:**
- Word Count: ${r.content?.split(/\s+/).filter(w => w.length > 0).length || 0}
- Character Count: ${r.content?.length || 0}
- Key Themes: [To be analyzed by AI]
- Technical Content: [To be analyzed by AI]
- Behavioral Indicators: [To be analyzed by AI]
`).join('\n')}

### RESUME DEEP DIVE
${resumeAnalysis ? `
**Summary:** ${resumeAnalysis.summary || 'No summary available'}

**Technical Skills:**
- Programming: ${resumeAnalysis.technical_skills?.programming_languages?.join(', ') || 'Not specified'}
- Frameworks: ${resumeAnalysis.technical_skills?.frameworks?.join(', ') || 'Not specified'}
- Tools: ${resumeAnalysis.technical_skills?.tools?.join(', ') || 'Not specified'}
- Methodologies: ${resumeAnalysis.technical_skills?.methodologies?.join(', ') || 'Not specified'}

**Soft Skills:** ${resumeAnalysis.soft_skills?.join(', ') || 'Not specified'}
**Industry Knowledge:** ${resumeAnalysis.industry_knowledge?.join(', ') || 'Not specified'}

**Career Level:** ${resumeAnalysis.career_level || 'Not specified'}
**Total Experience:** ${resumeAnalysis.total_experience_years || 'Not specified'} years

**Key Achievements:** ${resumeAnalysis.impressive_achievements?.join('\n- ') || 'None specified'}

**Areas for Growth:** ${resumeAnalysis.areas_for_improvement?.join(', ') || 'Not specified'}

**Credibility Indicators:**
- Verification Points: ${resumeAnalysis.verification_points?.join('\n- ') || 'None identified'}
- Experience Consistency: ${resumeAnalysis.experience_inconsistencies?.join('\n- ') || 'No inconsistencies noted'}
` : 'Resume analysis not available'}

### FULL RESUME CONTENT
${resumeContent ? `
**Complete Resume Text:**
${resumeContent}

**Resume Key Highlights:**
- Overall structure and formatting quality
- Experience progression and growth trajectory
- Achievement quantification quality
- Skill representation accuracy
- Educational background relevance
` : 'Resume content not available'}

### TARGET ROLE DEEP DIVE
${jobDescription ? `
**Job Description:** ${jobDescription}

**Job Requirements Analysis:**
${jobRequirements ? `
- **Title:** ${jobRequirements.title || 'Not specified'}
- **Level:** ${jobRequirements.level || 'Not specified'}
- **Department:** ${jobRequirements.department || 'Not specified'}

**Required Skills:** ${jobRequirements.required_skills?.join(', ') || 'Not specified'}
**Preferred Skills:** ${jobRequirements.preferred_skills?.join(', ') || 'Not specified'}

**Key Responsibilities:** ${jobRequirements.responsibilities?.join('\n- ') || 'Not specified'}

**Technical Stack:** ${jobRequirements.technical_stack?.join(', ') || 'Not specified'}
**Soft Skills Priority:** ${jobRequirements.soft_skills_priority?.join(', ') || 'Not specified'}

**Work Style:** ${jobRequirements.work_style || 'Not specified'}
**Team Structure:** ${jobRequirements.team_structure || 'Not specified'}

**Company Values:** ${jobRequirements.company_values?.join(', ') || 'Not specified'}
` : 'Detailed job requirements not provided'}
` : 'Target role not specified'}

---
## INTERVIEW DATA QUALITY METRICS

**Quality Assessment:**
- Quality Score: ${qualityMetrics.qualityScore}/100
- Data Sufficiency: ${qualityMetrics.dataSufficiency}
- Questions Answered: ${qualityMetrics.metrics.questionsCount}
- Total Words: ${qualityMetrics.metrics.totalWords}
- Average Response Length: ${qualityMetrics.metrics.avgResponseLength.toFixed(1)} words
- Estimated Duration: ${qualityMetrics.metrics.estimatedMinutes} minutes

${qualityMetrics.issues.length > 0 ? `
**⚠️ DATA QUALITY ISSUES:**
${qualityMetrics.issues.map(issue => `- ${issue}`).join('\n')}

**📋 RECOMMENDATIONS:**
${qualityMetrics.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

**IMPORTANT:** Adjust your confidence levels and scoring based on these quality metrics:
- If dataSufficiency is "INSUFFICIENT" or "LIMITED": Score conservatively, set confidence to LOW/VERY_LOW
- If dataSufficiency is "ADEQUATE": Use moderate confidence (MEDIUM)
- If dataSufficiency is "SUFFICIENT": You can use HIGH confidence
- Short interviews (< 5 questions): Cap scores at 60, set confidence to LOW
- Low word count (< 200 words): Reduce all scores by 10-15 points

---

## COMPREHENSIVE ASSESSMENT FRAMEWORK

### PHASE 1: TRANSCRIPT DECONSTRUCTION
1. **Response-by-Response Analysis**
   - Content depth evaluation
   - Linguistic complexity scoring
   - Technical accuracy verification
   - Behavioral indicator extraction
   - Sentiment progression tracking

2. **Pattern Recognition**
   - Consistency across responses
   - Recurring themes
   - Contradiction identification
   - Strength area clustering
   - Gap pattern analysis

### PHASE 2: MULTI-DIMENSIONAL SCORING
Score each dimension 0-100 with detailed rationale:

**Core Dimensions (Weighted):**
  1. Technical Mastery (25%)
  2. Problem-Solving Capability (20%)
  3. Communication Excellence (15%)
  4. Leadership Potential (15%)
  5. Cultural Alignment (10%)
  6. Learning Agility (10%)
  7. Emotional Intelligence (5%)

**Critical Assessment Scores (NEW):**

1. **Gap Severity Score (0-100, higher = worse)**
   - "How risky are the missing pieces for this role?"
   - Based on:
     * Number of gaps (more gaps = higher score)
     * How critical they are (core skill gap > minor gap)
     * How "fixable" they are short-term (harder to fix = higher score)
   - Interpretation:
     * 0-20: Low risk - minor gaps, easily addressable
     * 21-50: Manageable risk - some gaps but workable
     * 51-75: Serious risk - needs strong validation before hiring
     * 76-100: Likely not a fit - critical gaps that are hard to address
   - Note: A candidate can have high strengths AND high gap severity (be honest!)

2. **Answer Quality Score (0-100)**
   - "How good are their answers as data?"
   - Evaluate:
     * Specificity and detail level
     * Use of concrete examples vs vague statements
     * STAR method implementation
     * Evidence provided vs claims made
     * Depth of technical explanations
     * Consistency within answers
   - Higher score = more reliable data for assessment

3. **CV Consistency Score (0-100)**
   - "How consistent is the interview with the CV?"
   - Check for:
     * Skills mentioned in CV vs demonstrated in interview
     * Experience claims vs interview examples
     * Timeline consistency
     * Achievement verification
     * Contradictions or discrepancies
   - Higher score = more consistent (trustworthy)
   - Lower score = inconsistencies detected (red flag)

### PHASE 3: PREDICTIVE MODELING
- Success probability factors
- Retention risk assessment
- Performance trajectory prediction
- Team integration potential
- Leadership readiness evaluation

---

## OUTPUT SPECIFICATION

Return ONLY valid JSON in this enhanced structure (aligned with resume scoring system for UI consistency):

{
  "version": "6.0",
  "candidate_name": "${candidateName}",
  "assessment_date": "${new Date().toISOString()}",

  "overallScore": "0-100 (composite interview performance score)",
  "gapSeverityScore": "0-100 (higher = worse risk from missing skills/gaps)",
  "answerQualityScore": "0-100 (how good are their answers as data)",
  "cvConsistencyScore": "0-100 (consistency between CV and interview responses)",
  "technicalSkillsScore": "0-100",
  "experienceScore": "0-100",
  "culturalFitScore": "0-100",
  "communicationScore": "0-100",
  "leadershipScore": "0-100",

  "sectionA": "0-30 (Technical Competency)",
  "sectionB": "0-25 (Experience & Problem Solving)",
  "sectionC": "0-20 (Communication & Soft Skills)",
  "sectionD": "0-10 (Cultural Fit & Values)",
  "sectionE": "0-10 (Leadership & Growth Potential)",
  "sectionF": "-5 to +5 (Modifiers - Bonuses/Penalties)",

  "recommendation": "STRONG_YES|YES|MAYBE|NO|STRONG_NO",
  "recommendationReason": "Crisp 1-2 sentence hiring recommendation with key evidence",

  "executiveSummary": {
    "oneLiner": "10-word max summary for quick scanning",
    "fitScore": "EXCELLENT|GOOD|FAIR|POOR|MISMATCH",
    "hiringUrgency": "EXPEDITE|STANDARD|LOW_PRIORITY|PASS",
    "competencyLevel": "EXPERT|SENIOR|INTERMEDIATE|JUNIOR|ENTRY",
    "uniqueValueProposition": "What makes this candidate distinctive"
  },

  "verdict": {
    "decision": "INTERVIEW|CONSIDER|REVIEW|NOT PASS",
    "confidence": "HIGH|MEDIUM|LOW",
    "summary": "One powerful sentence answering: Should we hire this person?",
    "topStrength": "The single most compelling reason to proceed",
    "topConcern": "The single biggest risk (or 'None identified' if strong match)",
    "dealbreakers": ["List any absolute disqualifiers, or empty array"],
    "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL"
  },

  "matchSummary": "3-4 sentence brutally honest assessment written for the hiring manager",

  "strengthsHighlights": [
    {
      "strength": "Specific strength observed",
      "evidence": "Direct quote or specific example from interview",
      "impact": "HIGH|MEDIUM|LOW",
      "relevanceToJob": "How this maps to job requirements",
      "category": "technical|behavioral|communication|leadership|cultural"
    }
  ],

  "improvementAreas": [
    {
      "gap": "What's missing or concerning",
      "reason": "Detailed explanation of WHY this is considered a gap",
      "severity": "CRITICAL|MAJOR|MINOR",
      "jobRequirement": "Related job requirement if applicable",
      "impact": "Business impact of this gap",
      "trainable": true|false,
      "recommendation": "Specific actionable suggestion to address",
      "timeToAddress": "Estimated time to close this gap",
      "evidenceFromInterview": "Quote or reference from interview",
      "workaround": "Potential alternative approach"
    }
  ],

  "detailedBreakdown": {
    "sectionA": {
      "A1_technicalKnowledge": {
        "score": "0-15",
        "scorePercent": "0-100",
        "evidence": "Specific technical discussions from interview",
        "demonstratedSkills": ["skills shown in interview"],
        "missingAreas": ["technical gaps identified"]
      },
      "A2_problemSolving": {
        "score": "0-10",
        "scorePercent": "0-100",
        "approach": "How they approached problems",
        "examples": ["specific problem-solving instances"]
      },
      "A3_practicalApplication": {
        "score": "0-5",
        "scorePercent": "0-100",
        "realWorldExamples": ["examples of applying knowledge"]
      }
    },
    "sectionB": {
      "B1_experienceDepth": {
        "score": "0-10",
        "scorePercent": "0-100",
        "yearsRelevant": "years of relevant experience demonstrated",
        "evidenceQuality": "STRONG|MODERATE|WEAK"
      },
      "B2_achievementCommunication": {
        "score": "0-10",
        "scorePercent": "0-100",
        "quantifiedResults": ["achievements with metrics mentioned"],
        "projectScope": "scale of projects discussed"
      },
      "B3_careerProgression": {
        "score": "0-5",
        "scorePercent": "0-100",
        "progression": "ASCENDING|STABLE|MIXED|DESCENDING",
        "evidence": "career growth indicators from interview"
      }
    },
    "sectionC": {
      "C1_communicationClarity": {
        "score": "0-10",
        "scorePercent": "0-100",
        "articulation": "clarity of expression",
        "technicalExplanation": "ability to explain complex topics"
      },
      "C2_listeningSkills": {
        "score": "0-5",
        "scorePercent": "0-100",
        "questionUnderstanding": "how well they understood questions",
        "followUpQuality": "quality of their follow-up questions"
      },
      "C3_softSkillsEvidence": {
        "score": "0-5",
        "scorePercent": "0-100",
        "matchedSoftSkills": ["soft skills demonstrated"],
        "evidenceQuality": "STRONG|MODERATE|WEAK"
      }
    },
    "sectionD": {
      "D1_valueAlignment": {
        "score": "0-5",
        "scorePercent": "0-100",
        "alignedValues": ["values that match company culture"],
        "concerns": ["potential misalignments"]
      },
      "D2_teamFit": {
        "score": "0-5",
        "scorePercent": "0-100",
        "collaborationStyle": "their preferred work style",
        "teamDynamicsMatch": "how they'd fit with team"
      }
    },
    "sectionE": {
      "E1_leadershipPotential": {
        "score": "0-5",
        "scorePercent": "0-100",
        "leadershipStyle": "TRANSFORMATIONAL|TRANSACTIONAL|SERVANT|SITUATIONAL|DEMOCRATIC",
        "evidenceOfLeadership": ["leadership examples from interview"]
      },
      "E2_growthMindset": {
        "score": "0-5",
        "scorePercent": "0-100",
        "learningOrientation": "evidence of continuous learning",
        "adaptability": "how they handle change"
      }
    },
    "sectionF": {
      "bonusPoints": {
        "score": "0-5",
        "appliedBonuses": [{"condition": "reason", "points": 1}]
      },
      "penalties": {
        "score": "0",
        "appliedPenalties": [{"issue": "concern", "points": -1}]
      }
    }
  },

  "skillAnalysis": {
    "matchedSkills": [
      {
        "skill": "Skill name",
        "matchType": "EXACT|PARTIAL|RELATED",
        "depth": "EXPERT|PROFICIENT|FAMILIAR|LISTED",
        "evidence": "Specific proof from interview",
        "recency": "CURRENT|RECENT|DATED"
      }
    ],
    "partialMatches": [
      {
        "required": "Required skill",
        "found": "Related skill candidate has",
        "similarityPercent": "0-100",
        "note": "Why partial",
        "trainable": true|false
      }
    ],
    "missingSkills": [
      {
        "skill": "Missing skill",
        "importance": "MUST_HAVE|IMPORTANT|NICE_TO_HAVE",
        "severity": "CRITICAL|MAJOR|MINOR",
        "trainable": true|false,
        "timeToAcquire": "Estimated learning time"
      }
    ],
    "skillDepthSummary": {
      "expert": 0,
      "proficient": 0,
      "familiar": 0,
      "listedOnly": 0
    },
    "skillGapRisk": "LOW|MEDIUM|HIGH|CRITICAL"
  },

  "experienceAnalysis": {
    "totalYears": 0,
    "relevantYears": 0,
    "experienceSummary": "2-3 sentence summary of experience from interview",
    "careerProgression": "ASCENDING|STABLE|MIXED|DESCENDING",
    "progressionExplanation": "Explanation of career trajectory",
    "seniorityMatch": {
      "jobRequiredLevel": "Level from job",
      "candidateLevel": "Candidate's demonstrated level",
      "match": "EXACT|OVERQUALIFIED|UNDERQUALIFIED|MISMATCH",
      "gapExplanation": "Details of any seniority gap"
    },
    "keyProjects": [
      {
        "project": "Project name/description",
        "role": "Their role",
        "impact": "What they achieved",
        "relevance": "HIGH|MEDIUM|LOW",
        "technologiesUsed": ["technologies mentioned"]
      }
    ]
  },

  "communicationAnalysis": {
    "overallScore": "0-100",
    "clarity": {
      "score": "0-100",
      "strengths": ["communication strengths"],
      "weaknesses": ["areas to improve"]
    },
    "structuredThinking": {
      "score": "0-100",
      "usesSTAR": true|false,
      "organizesThoughts": "well organized|somewhat organized|disorganized"
    },
    "technicalExplanation": {
      "score": "0-100",
      "canSimplifyComplexTopics": true|false,
      "examples": ["examples of good/poor explanations"]
    },
    "listeningSkills": {
      "score": "0-100",
      "answersQuestionAsked": true|false,
      "asksFollowUps": true|false
    }
  },

  "behavioralIndicators": {
    "emotionalIntelligence": {
      "score": "0-100",
      "selfAwareness": "evidence of self-awareness",
      "empathy": "evidence of empathy",
      "conflictResolution": "how they handle conflicts"
    },
    "workStyle": {
      "preferredEnvironment": "remote|hybrid|onsite|flexible",
      "collaborationStyle": "independent|collaborative|balanced",
      "stressHandling": "evidence of stress management"
    },
    "motivationDrivers": ["what motivates them based on interview"],
    "potentialConcerns": ["behavioral concerns if any"]
  },

  "psycholinguisticAnalysis": {
    "personalityIndicators": {
      "openness": {"score": "0-100", "evidence": "examples"},
      "conscientiousness": {"score": "0-100", "evidence": "examples"},
      "extraversion": {"score": "0-100", "evidence": "examples"},
      "agreeableness": {"score": "0-100", "evidence": "examples"},
      "neuroticism": {"score": "0-100", "evidence": "examples"}
    },
    "cognitiveStyle": {
      "analyticalThinking": "0-100",
      "creativeThinking": "0-100",
      "decisionMaking": "analytical|intuitive|balanced"
    },
    "authenticity": {
      "score": "0-100",
      "genuineResponses": true|false,
      "consistencyAcrossAnswers": true|false,
      "contradictions": ["any contradictions detected"]
    }
  },

  "leadershipAssessment": {
    "score": "0-100",
    "currentLevel": "IC|TEAM_LEAD|MANAGER|DIRECTOR|EXECUTIVE",
    "potentialLevel": "estimated future level",
    "style": "TRANSFORMATIONAL|TRANSACTIONAL|SERVANT|SITUATIONAL|DEMOCRATIC",
    "strengths": ["leadership strengths"],
    "developmentAreas": ["areas to develop"],
    "readinessForPromotion": "READY|NEEDS_DEVELOPMENT|NOT_READY",
    "mentorshipCapability": {
      "score": "0-100",
      "evidence": "examples of mentoring"
    }
  },

  "culturalFitAnalysis": {
    "score": "0-100",
    "valueAlignment": {
      "score": "0-100",
      "alignedValues": ["values that match"],
      "potentialConflicts": ["potential value conflicts"]
    },
    "teamDynamics": {
      "score": "0-100",
      "collaborationStyle": "their style",
      "teamRolePreference": "leader|contributor|facilitator|specialist"
    },
    "workEnvironmentFit": {
      "score": "0-100",
      "preferredPace": "fast|moderate|methodical",
      "structurePreference": "structured|flexible|balanced"
    }
  },

  "redFlags": [
    {
      "type": "BEHAVIORAL|TECHNICAL|COMMUNICATION|CULTURAL|EXPERIENCE|OTHER",
      "severity": "HIGH|MEDIUM|LOW",
      "issue": "Clear description of the concern",
      "evidence": "Specific proof from interview",
      "impact": "Effect on hiring decision",
      "mitigatingFactors": "Any context that reduces concern"
    }
  ],

  "quantifiedAchievements": [
    {
      "achievement": "Description from interview",
      "metric": "The specific number/percentage",
      "category": "REVENUE|EFFICIENCY|SCALE|QUALITY|LEADERSHIP|INNOVATION",
      "impactLevel": "HIGH|MEDIUM|LOW",
      "verifiable": true|false
    }
  ],

  "interviewRecommendations": {
    "mustExplore": ["Critical topics to probe in next round"],
    "technicalValidation": ["Skills to verify through testing"],
    "redFlagQuestions": ["Questions to address specific concerns"],
    "culturalFitTopics": ["Soft skill and culture questions"],
    "referenceCheckFocus": ["What to verify with references"]
  },

  "followUpQuestions": {
    "technical": ["Specific technical questions for next round"],
    "behavioral": ["Behavioral scenarios to explore"],
    "leadership": ["Leadership situations to discuss"],
    "cultural": ["Culture fit validation questions"],
    "clarification": ["Questions to clarify unclear areas"]
  },

  "predictiveAssessment": {
    "performanceTrajectory": {
      "score": "0-100",
      "rampUpWeeks": "estimated weeks to productivity",
      "peakPerformanceMonths": "months to peak performance"
    },
    "retentionRisk": {
      "score": "0-100 (higher = more likely to stay)",
      "riskFactors": ["factors that might cause turnover"],
      "retentionDrivers": ["factors that encourage staying"]
    },
    "growthPotential": {
      "score": "0-100",
      "trajectory12Months": "expected development in year 1",
      "leadershipTimeline": "when they could take leadership roles"
    }
  },

  "hiringRecommendation": {
    "decision": "STRONG_HIRE|HIRE|CONSIDER|MAYBE|PASS",
    "confidence": "VERY_HIGH|HIGH|MEDIUM|LOW|VERY_LOW",
    "urgency": "HIGH|MEDIUM|LOW",
    "nextSteps": ["recommended next steps"],
    "onboardingRecommendations": {
      "firstWeekPriorities": ["week 1 focus areas"],
      "firstMonthGoals": ["month 1 objectives"],
      "trainingNeeds": ["specific training required"],
      "mentorshipNeeds": "type of mentorship needed"
    },
    "compensationConsiderations": {
      "marketAlignment": "above|at|below market",
      "valueJustification": "why they're worth their ask"
    }
  },

  "interviewMetadata": {
    "sessionDetails": {
      "questionsAsked": ${interviewerQuestions.length},
      "responsesProvided": ${candidateExchangeCount},
      "totalResponseWords": ${totalWords},
      "averageResponseLength": ${avgResponseLength},
      "estimatedSpeakingTimeMinutes": ${Math.round(estimatedTotalSpeakingTime)},
      "interviewDurationCategory": "COMPREHENSIVE|STANDARD|BRIEF|MINIMAL",
      "questionResponseRatio": ${interviewerQuestions.length > 0 ? (candidateExchangeCount / interviewerQuestions.length).toFixed(2) : 0}
    },
    "engagementMetrics": {
      "engagementLevel": "HIGH|MEDIUM|LOW",
      "responseProactiveness": "PROACTIVE|RESPONSIVE|PASSIVE",
      "enthusiasmIndicators": "evidence of genuine interest",
      "preparationLevel": "HIGH|MEDIUM|LOW"
    },
    "transcriptQuality": {
      "analysisQuality": "EXCELLENT|GOOD|ADEQUATE|LIMITED",
      "contentDepth": "DEEP|MODERATE|SURFACE|SUPERFICIAL",
      "exampleQuality": "quality of examples provided",
      "authenticityIndicators": "genuine vs rehearsed"
    },
    "assessmentConfidence": {
      "overallConfidence": "${qualityMetrics.dataSufficiency === 'SUFFICIENT' ? 'VERY_HIGH' : qualityMetrics.dataSufficiency === 'ADEQUATE' ? 'HIGH' : qualityMetrics.dataSufficiency === 'LIMITED' ? 'MEDIUM' : 'LOW'}",
      "dataSufficiency": "${qualityMetrics.dataSufficiency}",
      "dataLimitations": ${JSON.stringify(qualityMetrics.issues)},
      "confidenceEnhancers": ${JSON.stringify(qualityMetrics.recommendations.filter(r => r.includes('recommended') || r.includes('Consider')))}
    }
  }
}

---

## QUALITY STANDARDS

### REQUIREMENTS:
- Provide specific examples for every score
- Acknowledge limitations honestly
- Consider entire candidate, not just technical skills
- Be fair, balanced, and objective
- Focus on demonstrated capabilities, not potential
- Provide actionable insights for hiring team

### PROHIBITIONS:
- Do not make up examples or evidence
- Do not assume skills without demonstration
- Do not be overly harsh or generous
- Do not ignore concerning patterns
- Do not provide generic feedback

### DATA INSUFFICIENCY PROTOCOL:
- Clearly state when data is insufficient
- Score conservatively in areas with limited evidence
- Recommend follow-up assessments when needed
- Focus analysis on available evidence
- Suggest areas for further exploration

Remember: Your assessment directly impacts hiring decisions. Be thorough, fair, and provide the most detailed insights possible from the available data.`;
};

export default INTERVIEW_PROFILE_GENERATOR_V6;