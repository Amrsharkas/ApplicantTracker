import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface JobFilters {
  workplace: string[];
  country: string;
  city: string;
  careerLevel: string;
  jobCategory: string;
  jobType: string;
  datePosted: string;
  searchQuery: string;
}

interface JobPosting {
  recordId: string;
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  location?: string;
  salaryRange?: string;
  employmentType?: string;
  experienceLevel?: string;
  skills?: string[];
  postedDate?: string;
  employerQuestions?: string;
}

interface AIFilterResult {
  score: number; // 0-100 relevance score
  matchReasons: string[];
  flaggedIssues: string[];
  isRecommended: boolean;
}

interface FilterAnalysisResult {
  jobs: Array<JobPosting & { aiFilterScore: number; aiReasons: string[]; aiFlags: string[] }>;
  filterMessage: string;
  hasExpandedSearch: boolean;
}

export class AIJobFilteringService {
  
  // Hard filters that must be strictly enforced
  private getHardFilters(filters: JobFilters) {
    return {
      workplace: filters.workplace.length > 0 ? filters.workplace : null,
      country: filters.country || null,
      jobType: filters.jobType || null
    };
  }
  
  // Soft filters that can be expanded by AI
  private getSoftFilters(filters: JobFilters) {
    return {
      city: filters.city || null,
      careerLevel: filters.careerLevel || null,
      jobCategory: filters.jobCategory || null,
      datePosted: filters.datePosted || null,
      searchQuery: filters.searchQuery || null
    };
  }
  
  private checkHardFilterViolations(job: JobPosting, hardFilters: { workplace: string[] | null; country: string | null; jobType: string | null }): string[] {
    const violations: string[] = [];
    
    // Check job type (strict enforcement)
    if (hardFilters.jobType) {
      const jobTypeKeywords: Record<string, string[]> = {
        'Full Time': ['full-time', 'full time', 'fulltime', 'permanent', 'ft'],
        'Part Time': ['part-time', 'part time', 'parttime', 'pt'],
        'Contract': ['contract', 'contractor', 'freelance', 'temp', 'temporary'],
        'Internship': ['intern', 'internship', 'student', 'trainee']
      };
      
      const selectedType = hardFilters.jobType;
      const jobText = (job.employmentType || '' + job.jobDescription || '').toLowerCase();
      const selectedKeywords = jobTypeKeywords[selectedType] || [];
      
      // Check if job contains keywords for the selected type
      const hasSelectedTypeKeywords = selectedKeywords.some((keyword: string) => 
        jobText.includes(keyword.toLowerCase())
      );
      
      // Check if job contains keywords for other types
      const otherTypes = Object.keys(jobTypeKeywords).filter(type => type !== selectedType);
      const hasOtherTypeKeywords = otherTypes.some(otherType => 
        (jobTypeKeywords[otherType] || []).some((keyword: string) => 
          jobText.includes(keyword.toLowerCase())
        )
      );
      
      if (hasOtherTypeKeywords && !hasSelectedTypeKeywords) {
        violations.push(`Job type mismatch: looking for ${selectedType} but job appears to be different type`);
      }
    }
    
    // Check workplace type (strict enforcement)
    if (hardFilters.workplace) {
      const workplaceKeywords: Record<string, string[]> = {
        'Remote': ['remote', 'work from home', 'wfh', 'distributed', 'virtual'],
        'On-site': ['on-site', 'onsite', 'office', 'in-person', 'on site'],
        'Hybrid': ['hybrid', 'flexible', 'mixed', 'combination']
      };
      
      const jobText = (job.location || '' + job.jobDescription || '').toLowerCase();
      const hasMatchingWorkplace = hardFilters.workplace.some((selectedWorkplace: string) => {
        const keywords = workplaceKeywords[selectedWorkplace] || [];
        return keywords.some((keyword: string) => jobText.includes(keyword.toLowerCase()));
      });
      
      // If job explicitly mentions a different workplace type, it's a violation
      const allWorkplaceTypes = Object.keys(workplaceKeywords);
      const mentionedTypes = allWorkplaceTypes.filter(type => {
        if (hardFilters.workplace && hardFilters.workplace.includes(type)) return false;
        return (workplaceKeywords[type] || []).some((keyword: string) => 
          jobText.includes(keyword.toLowerCase())
        );
      });
      
      if (mentionedTypes.length > 0 && !hasMatchingWorkplace) {
        violations.push(`Workplace type mismatch: looking for ${hardFilters.workplace.join('/')} but job mentions ${mentionedTypes.join('/')}`);
      }
    }
    
    // Check country (strict enforcement)
    if (hardFilters.country) {
      const jobLocation = (job.location || '').toLowerCase();
      const selectedCountry = hardFilters.country.toLowerCase();
      
      if (jobLocation && !jobLocation.includes(selectedCountry)) {
        // Check for common country variations
        const countryVariations: Record<string, string[]> = {
          'usa': ['united states', 'america', 'us'],
          'uk': ['united kingdom', 'britain', 'england', 'scotland', 'wales'],
          'uae': ['united arab emirates', 'dubai', 'abu dhabi']
        };
        
        const variations = countryVariations[selectedCountry] || [];
        const hasVariation = variations.some((variation: string) => 
          jobLocation.includes(variation)
        );
        
        if (!hasVariation) {
          violations.push(`Country mismatch: looking for ${hardFilters.country} but job is in different location`);
        }
      }
    }
    
    return violations;
  }
  
  async analyzeJobWithFilters(job: JobPosting, filters: JobFilters): Promise<AIFilterResult> {
    try {
      const hardFilters = this.getHardFilters(filters);
      const softFilters = this.getSoftFilters(filters);
      
      // First check hard filter violations
      const hardFilterViolations = this.checkHardFilterViolations(job, hardFilters);
      
      // If there are hard filter violations, immediately reject the job
      if (hardFilterViolations.length > 0) {
        return {
          score: 0,
          matchReasons: [],
          flaggedIssues: hardFilterViolations,
          isRecommended: false
        };
      }
      
      // If hard filters pass, use AI to analyze soft filters
      const prompt = `
You are an intelligent job filtering AI. This job has already passed strict hard filter requirements.
Now analyze how well it matches the user's soft preferences, being contextually intelligent about missing metadata.

JOB DETAILS:
- Title: ${job.jobTitle}
- Company: ${job.companyName}
- Location: ${job.location || 'Not specified'}
- Employment Type: ${job.employmentType || 'Not specified'}
- Experience Level: ${job.experienceLevel || 'Not specified'}
- Posted Date: ${job.postedDate || 'Not specified'}
- Description: ${job.jobDescription}

USER SOFT PREFERENCES (can be intelligently expanded):
- City: ${softFilters.city || 'Any'}
- Career Level: ${softFilters.careerLevel || 'Any'}
- Job Category: ${softFilters.jobCategory || 'Any'}
- Date Posted: ${softFilters.datePosted || 'Any'}
- Search Query: ${softFilters.searchQuery || 'None'}

ANALYSIS INSTRUCTIONS:
1. Be contextually intelligent about missing or incomplete metadata
2. Infer job characteristics from description content when metadata is missing
3. Consider synonyms, variations, and industry terminology
4. Score from 0-100 where:
   - 90-100: Perfect match
   - 70-89: Very good match with minor variations
   - 50-69: Good match but some differences
   - 30-49: Partial match, some relevant aspects
   - 0-29: Poor match

Respond in JSON format:
{
  "score": 85,
  "matchReasons": ["Specific reasons why this job matches the filters"],
  "flaggedIssues": ["Any concerns or mismatches, if any"],
  "isRecommended": true
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are an expert job filtering AI that understands job descriptions contextually and provides intelligent, flexible matching." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        score: Math.min(Math.max(analysis.score || 50, 0), 100),
        matchReasons: analysis.matchReasons || [],
        flaggedIssues: analysis.flaggedIssues || [],
        isRecommended: analysis.isRecommended || analysis.score >= 50
      };
    } catch (error) {
      console.error('Error in AI job filtering:', error);
      // Fallback to basic matching
      return this.basicFilterAnalysis(job, filters);
    }
  }

  async intelligentJobFiltering(jobs: JobPosting[], filters: JobFilters): Promise<FilterAnalysisResult> {
    console.log(`🤖 Starting AI job filtering for ${jobs.length} jobs`);
    
    const hardFilters = this.getHardFilters(filters);
    const softFilters = this.getSoftFilters(filters);
    
    // Check if any filters are applied
    const hasHardFilters = hardFilters.workplace || hardFilters.country || hardFilters.jobType;
    const hasSoftFilters = softFilters.city || softFilters.careerLevel || softFilters.jobCategory || 
                          softFilters.datePosted || softFilters.searchQuery;
    
    if (!hasHardFilters && !hasSoftFilters) {
      // No filters applied, return all jobs with basic scoring
      const jobsWithScores = jobs.map(job => ({
        ...job,
        aiFilterScore: 75, // Default score when no filters
        aiReasons: ['No specific filters applied'],
        aiFlags: []
      }));
      
      return {
        jobs: jobsWithScores,
        filterMessage: '',
        hasExpandedSearch: false
      };
    }

    // First pass: Strict enforcement of hard filters
    console.log(`🔒 Applying strict hard filters: ${hasHardFilters ? 'Yes' : 'No'}`);
    const hardFilteredJobs = jobs.filter(job => {
      const violations = this.checkHardFilterViolations(job, hardFilters);
      return violations.length === 0; // Only include jobs with NO hard filter violations
    });

    console.log(`🔒 Hard filter results: ${hardFilteredJobs.length} jobs passed strict filters (filtered out ${jobs.length - hardFilteredJobs.length})`);

    // If hard filters eliminated all jobs, return empty with explanation
    if (hasHardFilters && hardFilteredJobs.length === 0) {
      return {
        jobs: [],
        filterMessage: 'No jobs match your selected preferences. Try adjusting your job type, workplace, or location filters.',
        hasExpandedSearch: false
      };
    }

    // Second pass: AI analysis of soft filters on remaining jobs
    const jobsToAnalyze = hasHardFilters ? hardFilteredJobs : jobs;
    
    if (!hasSoftFilters) {
      // Only hard filters applied, return all jobs that passed hard filters
      const jobsWithScores = jobsToAnalyze.map(job => ({
        ...job,
        aiFilterScore: 80, // High score since they passed hard filters
        aiReasons: ['Matches your strict filter requirements'],
        aiFlags: []
      }));
      
      return {
        jobs: jobsWithScores,
        filterMessage: hasHardFilters ? 'Showing jobs that match your selected requirements' : '',
        hasExpandedSearch: false
      };
    }

    // Apply AI analysis for soft filters
    console.log(`🤖 Applying AI analysis for soft filters on ${jobsToAnalyze.length} jobs`);
    const analysisPromises = jobsToAnalyze.map(async (job) => {
      const analysis = await this.analyzeJobWithFilters(job, filters);
      return {
        ...job,
        aiFilterScore: analysis.score,
        aiReasons: analysis.matchReasons,
        aiFlags: analysis.flaggedIssues
      };
    });

    const analyzedJobs = await Promise.all(analysisPromises);
    
    // Sort by AI score (highest first)
    const sortedJobs = analyzedJobs.sort((a, b) => b.aiFilterScore - a.aiFilterScore);
    
    // Determine smart expansion strategy for soft filters only
    const perfectMatches = sortedJobs.filter(job => job.aiFilterScore >= 85);
    const goodMatches = sortedJobs.filter(job => job.aiFilterScore >= 60);
    const decentMatches = sortedJobs.filter(job => job.aiFilterScore >= 40);
    
    let finalJobs = sortedJobs;
    let filterMessage = '';
    let hasExpandedSearch = false;
    
    if (perfectMatches.length >= 2) {
      // Show perfect matches
      finalJobs = perfectMatches;
      filterMessage = hasHardFilters ? 'Found jobs matching your requirements' : 'Found jobs matching your preferences';
    } else if (goodMatches.length >= 2) {
      // Show good matches with soft expansion
      finalJobs = goodMatches;
      filterMessage = 'Showing jobs with flexible interpretation of your preferences';
      hasExpandedSearch = true;
    } else if (decentMatches.length >= 1) {
      // Show decent matches with broader soft expansion
      finalJobs = decentMatches;
      filterMessage = 'Expanded search to include jobs that partially match your preferences';
      hasExpandedSearch = true;
    } else {
      // Show all remaining jobs
      finalJobs = sortedJobs;
      filterMessage = hasHardFilters ? 
        'Showing all jobs that match your strict requirements, ranked by relevance' :
        'Expanded search significantly to find potentially relevant opportunities';
      hasExpandedSearch = true;
    }
    
    console.log(`🎯 AI filtering complete: ${finalJobs.length} jobs selected from ${jobs.length} total`);
    
    return {
      jobs: finalJobs,
      filterMessage,
      hasExpandedSearch
    };
  }

  private hasActiveFilters(filters: JobFilters): boolean {
    return (
      filters.workplace.length > 0 ||
      filters.country !== '' ||
      filters.city !== '' ||
      filters.careerLevel !== '' ||
      filters.jobCategory !== '' ||
      filters.jobType !== '' ||
      filters.datePosted !== '' ||
      filters.searchQuery !== ''
    );
  }

  private basicFilterAnalysis(job: JobPosting, filters: JobFilters): AIFilterResult {
    let score = 50; // Base score
    const matchReasons: string[] = [];
    const flaggedIssues: string[] = [];

    // Basic workplace matching
    if (filters.workplace.length > 0) {
      const jobType = job.employmentType?.toLowerCase() || '';
      const hasWorkplaceMatch = filters.workplace.some(w => {
        const filterValue = w.toLowerCase();
        return jobType.includes(filterValue) ||
          (filterValue === 'remote' && jobType.includes('remote')) ||
          (filterValue === 'on-site' && (jobType.includes('office') || jobType.includes('on-site'))) ||
          (filterValue === 'hybrid' && jobType.includes('hybrid'));
      });
      
      if (hasWorkplaceMatch) {
        score += 20;
        matchReasons.push('Workplace type matches your preference');
      } else {
        flaggedIssues.push('Workplace type may not match your preference');
      }
    }

    // Basic location matching
    if (filters.country && job.location) {
      const locationLower = job.location.toLowerCase();
      if (locationLower.includes(filters.country.toLowerCase())) {
        score += 15;
        matchReasons.push('Location matches your country preference');
      } else {
        flaggedIssues.push('Location may not match your country preference');
      }
    }

    // Basic search query matching
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const title = job.jobTitle.toLowerCase();
      const description = job.jobDescription.toLowerCase();
      
      if (title.includes(query) || description.includes(query)) {
        score += 25;
        matchReasons.push('Job content matches your search query');
      } else {
        flaggedIssues.push('Job may not directly match your search query');
      }
    }

    return {
      score: Math.min(score, 100),
      matchReasons,
      flaggedIssues,
      isRecommended: score >= 50
    };
  }
}

export const aiJobFilteringService = new AIJobFilteringService();