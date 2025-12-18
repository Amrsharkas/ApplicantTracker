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
  jobRequirements?: JobRequirements
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

### PHASE 3: PREDICTIVE MODELING
- Success probability factors
- Retention risk assessment
- Performance trajectory prediction
- Team integration potential
- Leadership readiness evaluation

---

## OUTPUT SPECIFICATION

Return ONLY valid JSON in this enhanced structure:

{
  "version": "6.0",
  "candidate_name": "${candidateName}",
  "assessment_date": "${new Date().toISOString()}",
  "assessment_confidence": "VERY_HIGH|HIGH|MEDIUM|LOW|VERY_LOW",

  "executive_summary": {
    "overall_verdict": "EXCEPTIONAL_CANDIDATE|STRONG_HIRE|HIRE|CONSIDER|MAYBE|PASS",
    "core_competency_level": "EXPERT|SENIOR|INTERMEDIATE|JUNIOR|ENTRY",
    "unique_value_proposition": "What makes this candidate distinctive",
    "primary_hiring_risks": "Main concerns for hiring decision",
    "success_probability": "percentage 0-100",
    "role_fit_score": "number 0-100",
    "team_compatibility": "EXCELLENT|GOOD|MODERATE|MIXED|POOR"
  },

  "linguistic_analysis": {
    "vocabulary_sophistication": {
      "score": "0-100",
      "indicators": ["specific evidence of vocabulary range"],
      "technical_accuracy": "assessment of technical terminology usage"
    },
    "cognitive_complexity": {
      "score": "0-100",
      "abstract_thinking": "demonstrated abstract reasoning",
      "systems_thinking": "ability to see interconnected systems",
      "analytical_depth": "depth of analytical approach"
    },
    "communication_patterns": {
      "clarity_score": "0-100",
      "structure_utilization": "use of structured communication",
      "example_quality": "quality and relevance of examples",
      "conciseness_effectiveness": "balance of detail and brevity"
    }
  },

  "technical_mastery": {
    "score": "0-100",
    "depth_of_knowledge": "assessment of technical expertise",
    "practical_application": "demonstrated real-world application",
    "problem_solving_methodology": "approach to technical challenges",
    "tool_proficiency": {
      "score": "0-100",
      "mastered_tools": ["list of tools they've mastered"],
      "familiar_tools": ["tools they know well"],
      "learning_capability": "ability with new tools"
    },
    "code_quality_indicators": {
      "best_practices": "demonstrated knowledge of best practices",
      "scalability_awareness": "understanding of scalable solutions",
      "security_considerations": "security-conscious approach"
    }
  },

  "problem_solving_capability": {
    "score": "0-100",
    "analytical_approach": "method of breaking down problems",
    "creative_solutions": "innovative thinking examples",
    "decision_process": "how they make technical decisions",
    "trade_off_understanding": "awareness of technical trade-offs",
    "complexity_handling": "ability with complex challenges"
  },

  "communication_excellence": {
    "score": "0-100",
    "articulation_clarity": "how clearly they express ideas",
    "active_listening": "evidence of listening to questions",
    "stakeholder_communication": "ability to communicate with different audiences",
    "technical_translation": "ability to explain complex concepts simply",
    "presentation_skills": "organization and delivery of information"
  },

  "leadership_potential": {
    "score": "0-100",
    "initiative_demonstration": "examples of taking initiative",
    "influence_without_authority": "ability to lead without formal power",
    "team_collaboration": "evidence of effective teamwork",
    "mentoring_indicators": "examples of helping others grow",
    "strategic_thinking": "ability to see bigger picture"
  },

  "cultural_alignment": {
    "score": "0-100",
    "value_alignment": "alignment with company values",
    "work_style_fit": "compatibility with work environment",
    "team_dynamics": "how they'll fit with existing team",
    "adaptability_flexibility": "ability to adapt to culture",
    "long_term_commitment": "likelihood of staying long-term"
  },

  "learning_agility": {
    "score": "0-100",
    "learning_speed": "how quickly they acquire new skills",
    "knowledge_application": "ability to apply learning immediately",
    "continuous_learning": "evidence of ongoing self-education",
    "feedback_receptivity": "how they handle and use feedback",
    "curiosity_indicators": "evidence of genuine curiosity"
  },

  "emotional_intelligence": {
    "score": "0-100",
    "self_awareness": {
      "score": "0-100",
      "strength_recognition": "accuracy in identifying own strengths",
      "limitation_acknowledgment": "awareness and acceptance of limitations",
      "values_clarity": "ability to articulate personal and professional values",
      "emotional_regulation": "demonstrated control over emotional responses",
      "impact_awareness": "understanding of personal impact on others"
    },
    "empathy_demonstration": {
      "score": "0-100",
      "stakeholder_perspective": "ability to understand different viewpoints",
      "customer_empathy": "demonstrated understanding of customer needs",
      "team_empathy": "understanding of team member perspectives",
      "cultural_sensitivity": "awareness of cultural differences",
      "emotional_support": "ability to provide emotional support to others"
    },
    "conflict_resolution": {
      "score": "0-100",
      "approach_style": "collaborative/competitive/compromising/avoiding/accommodating",
      "solution_orientation": "focus on win-win solutions",
      "emotional_control": "ability to remain calm during conflicts",
      "relationship_preservation": "effort to maintain relationships",
      "learning_from_conflict": "ability to learn and grow from conflicts"
    },
    "relationship_building": {
      "score": "0-100",
      "trust_building": "ability to establish and maintain trust",
      "network_development": "skill in building professional networks",
      "mentoring_ability": "capacity to guide and develop others",
      "collaboration_facilitation": "skill in fostering teamwork",
      "long_term_maintenance": "ability to sustain professional relationships"
    },
    "stress_management": {
      "score": "0-100",
      "pressure_response": "how they handle high-pressure situations",
      "deadline_management": "ability to work under time constraints",
      "recovery_ability": "how quickly they bounce back from setbacks",
      "coping_mechanisms": "healthy strategies for dealing with stress",
      "performance_under_stress": "quality of work under pressure"
    }
  },

  "psycholinguistic_analysis": {
    "personality_traits": {
      "big_five_assessment": {
        "openness": {
          "score": "0-100",
          "indicators": ["specific behavioral examples"],
          "creativity_indicators": "evidence of creative thinking",
          "innovation_readiness": "willingness to try new approaches"
        },
        "conscientiousness": {
          "score": "0-100",
          "detail_orientation": "attention to detail and accuracy",
          "organization_skills": "ability to structure and plan",
          "reliability_indicators": "dependability demonstration",
          "quality_focus": "commitment to high standards"
        },
        "extraversion": {
          "score": "0-100",
          "communication_style": "preference for interaction styles",
          "energy_level": "demonstrated enthusiasm and energy",
          "social_confidence": "comfort in social situations",
          "leadership_presence": "natural leadership tendencies"
        },
        "agreeableness": {
          "score": "0-100",
          "cooperation_level": "willingness to work with others",
          "conflict_avoidance": "tendency to avoid or address conflicts",
          "team_orientation": "focus on group success",
          "flexibility": "adaptability to others' needs"
        },
        "neuroticism": {
          "score": "0-100",
          "stress_tolerance": "ability to handle pressure",
          "emotional_stability": "consistency of emotional responses",
          "anxiety_indicators": "signs of stress or worry",
          "confidence_level": "self-assurance demonstration"
        }
      },
      "cognitive_reflection": {
        "score": "0-100",
        "analytical_depth": "depth of analytical thinking",
        "critical_thinking": "ability to evaluate information critically",
        "problem_complexity_handling": "comfort with complex problems",
        "logical_reasoning": "strength of logical arguments"
      },
      "risk_tolerance": {
        "score": "0-100",
        "calculated_risk_taking": "ability to take appropriate risks",
        "innovation_willingness": "readiness to try new approaches",
        "failure_acceptance": "comfort with potential failure",
        "risk_assessment": "ability to evaluate risks effectively"
      }
    },
    "communication_psychology": {
      "assertiveness": {
        "score": "0-100",
        "confidence_expression": "ability to express ideas confidently",
        "boundary_setting": "skill in setting professional boundaries",
        "self_advocacy": "ability to advocate for own ideas",
        "respectful_disagreement": "ability to disagree constructively"
      },
      "learning_orientation": {
        "score": "0-100",
        "growth_mindset": "belief in ability to develop and improve",
        "feedback_seeking": "proactive request for feedback",
        "curiosity_indicators": "evidence of genuine curiosity",
        "knowledge_application": "ability to apply learning immediately"
      },
      "collaboration_style": {
        "score": "0-100",
        "team_preference": "preference for team vs. individual work",
        "knowledge_sharing": "willingness to share expertise",
        "support_provision": "readiness to help team members",
        "consensus_building": "ability to build agreement"
      }
    },
    "behavioral_consistency": {
      "authenticity_score": "0-100",
      "value_alignment": "alignment between stated values and behavior",
      "contradiction_detection": ["detected contradictions between statements"],
      "consistency_indicators": "evidence of consistent behavior patterns",
      "behavioral_reliability": "predictability of responses"
    }
  },

  "technical_philosophy": {
    "score": "0-100",
    "code_quality_mindset": {
      "score": "0-100",
      "clean_code_advocacy": "commitment to writing maintainable code",
      "testing_philosophy": "approach to software testing",
      "documentation_commitment": "dedication to code documentation",
      "refactoring_approach": "attitude toward code improvement",
      "quality_standards": "adherence to coding standards"
    },
    "technical_debt_awareness": {
      "score": "0-100",
      "debt_identification": "ability to recognize technical debt",
      "prioritization_strategy": "approach to managing technical debt",
      "prevention_mindset": "focus on preventing future debt",
      "stakeholder_communication": "ability to explain technical trade-offs",
      "strategic_thinking": "long-term technical planning"
    },
    "architectural_thinking": {
      "score": "0-100",
      "scalability_considerations": "thoughts about system scalability",
      "design_pattern_usage": "application of design patterns",
      "trade_off_analysis": "ability to analyze technical trade-offs",
      "system_integration": "understanding of system components",
      "future_proofing": "consideration for future requirements"
    },
    "innovation_quotient": {
      "score": "0-100",
      "technology_trends_awareness": "knowledge of current trends",
      "experimentation_willingness": "readiness to experiment",
      "creative_problem_solving": "innovative approaches to problems",
      "continuous_learning": "commitment to staying current",
      "thought_leadership": "ability to influence technical direction"
    }
  },

  "leadership_dynamics": {
    "score": "0-100",
    "leadership_style": {
      "primary_style": "TRANSFORMATIONAL|TRANSACTIONAL|SERVANT|SITUATIONAL|AUTHORITATIVE|DEMOCRATIC",
      "adaptability": "ability to adjust style based on situation",
      "vision_communication": "skill in articulating vision",
      "strategic_thinking": "ability to see bigger picture",
      "decision_making_approach": "collaborative vs. autocratic tendencies"
    },
    "team_integration": {
      "score": "0-100",
      "collaboration_effectiveness": "ability to work effectively in teams",
      "conflict_resolution_style": "approach to team conflicts",
      "inclusion_advocacy": "support for diverse perspectives",
      "psychological_safety": "contribution to safe team environment",
      "remote_team_compatibility": "effectiveness in remote settings"
    },
    "influence_ability": {
      "score": "0-100",
      "persuasive_communication": "skill in convincing others",
      "stakeholder_management": "ability to manage stakeholder relationships",
      "network_leverage": "ability to utilize professional networks",
      "change_leadership": "skill in leading through change",
      "mentorship_impact": "ability to develop others"
    },
    "accountability_ownership": {
      "score": "0-100",
      "responsibility_acceptance": "willingness to take ownership",
      "follow_through_commitment": "dedication to completing tasks",
      "team_success_focus": "prioritization of team over individual success",
      "learning_from_failure": "ability to accept and learn from mistakes",
      "transparency_level": "openness about challenges and limitations"
    }
  },

  "adaptability_resilience": {
    "score": "0-100",
    "learning_agility": {
      "score": "0-100",
      "learning_speed": "how quickly they acquire new skills",
      "versatility": "ability to work across different domains",
      "cross_functional_adaptation": "ability to work in different functions",
      "tool_adoption_speed": "quickness to adopt new tools",
      "knowledge_transfer": "ability to apply learning in new contexts"
    },
    "change_resilience": {
      "score": "0-100",
      "adaptation_speed": "how quickly they adapt to change",
      "ambiguity_tolerance": "comfort with uncertainty",
      "flexibility_demonstration": "evidence of adaptability",
      "transition_effectiveness": "success in transitioning between roles/projects",
      "uncertainty_navigation": "ability to work with incomplete information"
    },
    "stress_resilience": {
      "score": "0-100",
      "pressure_performance": "quality of work under pressure",
      "recovery_speed": "how quickly they bounce back from setbacks",
      "coping_strategies": "effective mechanisms for handling stress",
      "setback_learning": "ability to learn from failures",
      "emotional_stability": "consistency under stress"
    },
    "growth_trajectory": {
      "score": "0-100",
      "development_roadmap": "clear path for skill development",
      "ambition_alignment": "alignment between personal goals and role",
      "potential_ceiling": "estimated growth potential",
      "learning_orientation": "commitment to continuous improvement",
      "career_progression": "historical evidence of growth"
    }
  },

  "behavioral_indicators": {
    "strengths": [
      {
        "category": "technical/behavioral/cultural",
        "description": "specific strength observed",
        "evidence": "example from transcript",
        "impact_level": "HIGH|MEDIUM|LOW"
      }
    ],
    "development_areas": [
      {
        "category": "technical/behavioral/cultural",
        "description": "area needing development",
        "evidence": "example from transcript",
        "development_suggestions": "how to improve"
      }
    ],
    "red_flags": [
      {
        "severity": "CRITICAL|HIGH|MEDIUM|LOW",
        "description": "concerning behavior or response",
        "evidence": "specific example",
        "hiring_impact": "why this matters for hiring"
      }
    ]
  },

  "skill_taxonomy_mapping": {
    ${jobRequirements ? `
    "required_skills": {
      "matched_skills": [
        {
          "skill_name": "name of the skill",
          "category": "technical|soft_skill|domain_knowledge",
          "proficiency_level": "EXPERT|ADVANCED|PROFICIENT|BASIC",
          "proficiency_score": "0-100",
          "evidence": ["specific examples from transcript demonstrating this skill"],
          "key_indicators": ["observable behaviors or statements showing mastery"],
          "demonstration_quality": "STRONG|MODERATE|WEAK",
          "interview_examples": ["direct quotes or paraphrased examples from responses"],
          "resume_alignment": "how this skill is represented in resume",
          "growth_trajectory": "signs of improvement or deepening expertise",
          "application_context": "where and how they've applied this skill"
        }
      ],
      "partially_matched_skills": [
        {
          "skill_name": "name of the skill",
          "category": "technical|soft_skill|domain_knowledge",
          "proficiency_level": "BASIC|NOVICE",
          "proficiency_score": "0-100",
          "evidence": ["limited examples showing partial competency"],
          "gap_description": "what aspects are missing or underdeveloped",
          "development_potential": "HIGH|MEDIUM|LOW likelihood of quick development",
          "learning_indicators": "signs they could develop this skill quickly",
          "bridging_timeline": "estimated time to reach proficiency",
          "suggested_training": ["specific training or development approaches"]
        }
      ],
      "missing_skills": [
        {
          "skill_name": "name of the missing skill",
          "category": "technical|soft_skill|domain_knowledge",
          "criticality": "CRITICAL|HIGH|MEDIUM|LOW",
          "impact_on_role": "how the absence affects job performance",
          "gap_severity": "SEVERE|MODERATE|MINOR",
          "compensating_factors": ["other skills or traits that might compensate"],
          "development_difficulty": "EASY|MODERATE|DIFFICULT|VERY_DIFFICULT",
          "learning_curve_estimate": "estimated time to acquire (e.g., '2-3 months')",
          "alternative_approaches": ["workarounds or team support strategies"],
          "hiring_risk": "risk level this gap presents to hiring decision",
          "mitigation_strategy": "how to address this gap if candidate is hired",
          "red_flag_indicator": "boolean - is this a deal-breaker?"
        }
      ]
    },
    "preferred_skills": {
      "matched_skills": [
        {
          "skill_name": "name of the preferred skill",
          "category": "technical|soft_skill|domain_knowledge",
          "proficiency_level": "EXPERT|ADVANCED|PROFICIENT|BASIC",
          "proficiency_score": "0-100",
          "evidence": ["examples demonstrating this preferred skill"],
          "competitive_advantage": "how this skill differentiates the candidate",
          "value_add_potential": "additional value this brings to the role"
        }
      ],
      "missing_preferred_skills": [
        {
          "skill_name": "name of missing preferred skill",
          "category": "technical|soft_skill|domain_knowledge",
          "impact_level": "HIGH|MEDIUM|LOW",
          "potential_indicators": ["signs they might develop or have related skills"],
          "importance_to_role": "significance of this absence"
        }
      ]
    },
    "skills_summary": {
      "total_required_skills": "number",
      "matched_required_count": "number",
      "partially_matched_count": "number",
      "missing_required_count": "number",
      "critical_gaps_count": "number",
      "required_skills_coverage": "percentage 0-100",
      "total_preferred_skills": "number",
      "matched_preferred_count": "number",
      "preferred_skills_coverage": "percentage 0-100",
      "overall_skill_match": "percentage 0-100",
      "strengths_summary": ["key skill strengths"],
      "gaps_summary": ["key skill gaps"],
      "competitive_advantages": ["unique skills or combinations that stand out"]
    }` : '"required_skills": {}, "preferred_skills": {}, "skills_summary": {}'}
  },

  "predictive_assessment": {
    "performance_trajectory": {
      "score": "0-100",
      "ramp_up_timeline": "estimated time to full productivity (weeks)",
      "peak_performance_timeline": "estimated time to peak performance (months)",
      "growth_acceleration": "factors indicating accelerated growth",
      "skill_development_rate": "predicted speed of skill acquisition",
      "advancement_readiness": "readiness for increased responsibility"
    },
    "retention_analysis": {
      "probability_score": "0-100",
      "risk_factors": ["factors that might increase turnover risk"],
      "retention_drivers": ["factors that encourage long-term stay"],
      "cultural_fit_strength": "strength of cultural alignment",
      "career_path_alignment": "alignment between goals and company opportunities",
      "commitment_indicators": "evidence of long-term commitment"
    },
    "leadership_potential": {
      "current_readiness": "0-100",
      "leadership_development_timeline": "estimated time to leadership readiness",
      "leadership_style_prediction": "predicted leadership approach",
      "influence_trajectory": "predicted growth in influence",
      "team_scale_readiness": "ability to lead larger teams",
      "strategic_impact_potential": "potential for strategic contribution"
    },
    "innovation_capacity": {
      "score": "0-100",
      "creative_problem_solving": "ability to develop novel solutions",
      "technology_innovation": "potential for technical innovation",
      "process_improvement": "likelihood of improving existing processes",
      "industry_thought_leadership": "potential for external influence",
      "disruptive_thinking": "capacity for game-changing ideas"
    },
    "team_integration": {
      "collaboration_success_probability": "0-100",
      "conflict_resolution_effectiveness": "predicted success in managing conflicts",
      "team_morale_impact": "predicted impact on team dynamics",
      "knowledge_sharing_propensity": "likelihood of sharing expertise",
      "mentorship_potential": "ability to develop team members",
      "cultural_enhancement": "potential to positively impact culture"
    }
  },

  "hiring_recommendation": {
    "recommendation": "EXCEPTIONAL_CANDIDATE|STRONG_HIRE|HIRE|CONSIDER|MAYBE|PASS",
    "confidence_level": "VERY_HIGH|HIGH|MEDIUM|LOW|VERY_LOW",
    "decision_urgency": "HIGH|MEDIUM|LOW",
    "offer_readiness": "IMMEDIATE|NEXT_ROUND|ADDITIONAL_ASSESSMENT_REQUIRED",
    "key_success_factors": ["what will make them successful"],
    "potential_blockers": ["factors that could hinder success"],
    "mitigation_strategies": ["how to address concerns"],
    "onboarding_recommendations": {
      "first_week_priorities": ["critical activities for first week"],
      "first_month_goals": ["objectives for first month"],
      "training_requirements": ["specific training or certifications needed"],
      "mentorship_needs": "type of mentorship support required",
      "team_integration_plan": "strategy for team integration",
      "resource_requirements": ["tools, systems, or resources needed"]
    },
    "growth_path": {
      "trajectory_12_months": "expected development in first year",
      "trajectory_3_years": "predicted growth over 3 years",
      "leadership_potential_timeline": "timeline for leadership development",
      "skill_development_roadmap": "recommended skill acquisition path",
      "career_progression_opportunities": ["potential advancement paths"]
    },
    "compensation_analysis": {
      "market_alignment": "alignment with market rates",
      "value_proposition": "unique value justifying compensation",
      "total_value_score": "0-100",
      "investment_return_timeline": "expected time to return on investment",
      "compensation_risks": ["factors that might affect compensation satisfaction"]
    },
    "team_integration_strategy": {
      "optimal_team_placement": "best team fit within organization",
      "collaboration_setup": "how to establish effective collaboration",
      "reporting_structure_preference": "optimal reporting relationship",
      "team_role_expectations": "expected role within team dynamics",
      "cross_functional_opportunities": ["potential cross-team collaboration areas"]
    },
    "interview_process_recommendation": {
      "additional_rounds_needed": ["types of additional interviews required"],
      "specific_focus_areas": ["areas to explore in further interviews"],
      "interview_panel_composition": ["who should be involved in future interviews"],
      "technical_assessment_needs": "additional technical evaluation requirements",
      "cultural_fit_validation": "methods to validate cultural alignment"
    }
  },

  "follow_up_questions": {
    "technical_deep_dive": {
      "core_competencies": ["questions about primary technical skills"],
      "architecture_and_design": ["questions about system design and architecture"],
      "problem_solving_scenarios": ["complex problems to solve together"],
      "tool_specific_questions": ["questions about specific technologies mentioned"],
      "best_practices_validation": ["questions to validate understanding of best practices"],
      "code_review_exercise": "suggested code review scenarios"
    },
    "behavioral_exploration": {
      "conflict_resolution_scenarios": ["hypothetical conflict situations to explore"],
      "failure_learning_questions": ["questions about past failures and learning"],
      "collaboration_style_deep_dive": ["questions to understand teamwork approach"],
      "adaptability_scenarios": ["situations to test adaptability and resilience"],
      "leadership_situations": ["scenarios to assess leadership potential"],
      "cultural_value_alignment": ["questions to explore value alignment"]
    },
    "psycholinguistic_deep_dive": {
      "personality_trait_validation": ["questions to validate personality assessments"],
      "communication_style_exploration": ["questions about communication preferences"],
      "decision_process_analysis": ["questions to understand how they make decisions"],
      "learning_style_assessment": ["questions to understand learning preferences"],
      "stress_response_evaluation": ["questions to understand how they handle pressure"],
      "motivation_drivers": ["questions to understand what motivates them"]
    },
    "cultural_fit": {
      "work_style_preferences": ["questions about preferred work environment"],
      "team_dynamics_compatibility": ["questions about team interaction preferences"],
      "company_values_alignment": ["questions about alignment with company values"],
      "remote_work_adaptation": ["questions about remote/hybrid work preferences"],
      "feedback_style_compatibility": ["questions about feedback preferences"],
      "innovation_culture_fit": ["questions about innovation and risk tolerance"]
    },
    "leadership_assessment": {
      "strategic_thinking_evaluation": ["questions to assess strategic thinking"],
      "influence_style_analysis": ["questions about how they influence others"],
      "team_development_approach": ["questions about developing team members"],
      "change_management_scenarios": ["situations about leading through change"],
      "vision_communication": ["questions about articulating and communicating vision"],
      "accountability_and_ownership": ["questions about leadership responsibility"]
    },
    "growth_and_development": {
      "career_goal_alignment": ["questions about long-term career goals"],
      "skill_development_planning": ["questions about skill development approach"],
      "learning_capacity_assessment": ["questions about ability and desire to learn"],
      "ambition_level_evaluation": ["questions to gauge ambition level"],
      "industry_trends_engagement": ["questions about industry knowledge and trends"],
      "personal_brand_development": ["questions about professional growth"]
    }
  },

  "interview_metadata": {
    "session_details": {
      "questions_asked": ${interviewerQuestions.length},
      "responses_provided": ${candidateExchangeCount},
      "total_response_words": ${totalWords},
      "average_response_length": ${avgResponseLength},
      "estimated_speaking_time_minutes": ${Math.round(estimatedTotalSpeakingTime)},
      "interview_duration_category": "COMPREHENSIVE|STANDARD|BRIEF|MINIMAL",
      "question_response_ratio": ${interviewerQuestions.length > 0 ? (candidateExchangeCount / interviewerQuestions.length).toFixed(2) : 0}
    },
    "engagement_metrics": {
      "engagement_level": "HIGH|MEDIUM|LOW",
      "response_proactiveness": "PROACTIVE|RESPONSIVE|PASSIVE",
      "question_clarity_requests": "number of times candidate asked for clarification",
      "follow_up_questions_asked": "number of questions candidate asked interviewer",
      "enthusiasm_indicators": "evidence of genuine interest and excitement",
      "preparation_level": "HIGH|MEDIUM|LOW based on responses"
    },
    "communication_analysis": {
      "clarity_score": "0-100",
      "conciseness_effectiveness": "balance of detail and brevity",
      "articulation_quality": "how well they express complex ideas",
      "listening_indicators": "evidence of active listening",
      "adaptability_to_audience": "ability to adjust communication style",
      "technical_explanation_skill": "ability to explain technical concepts clearly"
    },
    "transcript_quality": {
      "transcript_analysis_quality": "EXCELLENT|GOOD|ADEQUATE|LIMITED",
      "content_depth_level": "DEEP|MODERATE|SURFACE|SUPERFICIAL",
      "example_quality_assessment": "quality and relevance of examples provided",
      "consistency_rating": "consistency across responses",
      "authenticity_indicators": "evidence of genuine vs. rehearsed responses",
      "completeness_level": "thoroughness in addressing questions"
    },
    "assessment_confidence": {
      "overall_confidence": "VERY_HIGH|HIGH|MEDIUM|LOW|VERY_LOW",
      "data_sufficiency": "SUFFICIENT|ADEQUATE|LIMITED|INSUFFICIENT",
      "data_limitations": ["factors limiting assessment accuracy"],
      "confidence_enhancers": ["factors that increase assessment confidence"],
      "confidence_reducers": ["factors that decrease assessment confidence"],
      "assessment_depth": "COMPREHENSIVE|DETAILED|ADEQUATE|BASIC",
      "validation_level": "HIGHLY_VALIDATED|MODERATELY_VALIDATED|REQUIRES_VALIDATION"
    },
    "session_dynamics": {
      "conversation_flow": "NATURAL|STRUCTURED|MECHANICAL|DISJOINTED",
      "rapport_building": "EXCELLENT|GOOD|ADEQUATE|POOR",
      "energy_level": "HIGH|MEDIUM|LOW throughout interview",
      "stress_indicators": ["signs of nervousness or stress"],
      "recovery_from_difficult_questions": "how they handled challenging questions",
      "closing_impression": "strength of interview conclusion"
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