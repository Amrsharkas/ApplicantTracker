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
  
  private hasActiveFilters(filters: JobFilters): boolean {
    return !!(
      filters.jobType ||
      (filters.workplace && filters.workplace.length > 0) ||
      filters.country ||
      filters.city ||
      filters.careerLevel ||
      filters.jobCategory ||
      filters.datePosted ||
      filters.searchQuery
    );
  }
  
  private checkExactFilterMatch(job: JobPosting, filters: JobFilters): boolean {
    // Check all applied filters for exact matches
    
    // Check job type first (hard filter in exact matching)
    if (filters.jobType) {
      const jobTypeKeywords: Record<string, string[]> = {
        'full-time': ['full-time', 'full time', 'fulltime', 'permanent', 'ft'],
        'part-time': ['part-time', 'part time', 'parttime', 'pt'],
        'contract': ['contract', 'contractor', 'freelance', 'temp', 'temporary'],
        'internship': ['intern', 'internship', 'student', 'trainee']
      };
      
      const selectedType = filters.jobType.toLowerCase();
      const jobText = (job.employmentType || '' + job.jobDescription || '').toLowerCase();
      const selectedKeywords = jobTypeKeywords[selectedType] || [];
      
      // If no employment type is specified, check job description for keywords
      const hasSelectedTypeKeywords = selectedKeywords.some(keyword => 
        jobText.includes(keyword.toLowerCase())
      );
      
      // If the job doesn't mention the selected job type, it's not an exact match
      if (!hasSelectedTypeKeywords) {
        return false;
      }
    }
    
    // Check workplace filter
    if (filters.workplace && filters.workplace.length > 0) {
      const workplaceKeywords: Record<string, string[]> = {
        'remote': ['remote', 'work from home', 'wfh', 'distributed', 'virtual'],
        'on-site': ['on-site', 'onsite', 'office', 'in-person', 'on site'],
        'hybrid': ['hybrid', 'flexible', 'mixed', 'combination']
      };
      
      const jobText = (job.location || '' + job.jobDescription || '').toLowerCase();
      const hasMatchingWorkplace = filters.workplace.some(selectedWorkplace => {
        const keywords = workplaceKeywords[selectedWorkplace.toLowerCase()] || [];
        return keywords.some(keyword => jobText.includes(keyword.toLowerCase()));
      });
      
      if (!hasMatchingWorkplace) {
        return false;
      }
    }
    
    // Check country filter
    if (filters.country) {
      const jobLocation = (job.location || '').toLowerCase();
      const selectedCountry = filters.country.toLowerCase();
      
      if (!jobLocation.includes(selectedCountry)) {
        return false;
      }
    }
    
    // Check city filter (soft - case insensitive substring match)
    if (filters.city) {
      const jobLocation = (job.location || '').toLowerCase();
      const cityFilter = filters.city.toLowerCase();
      if (!jobLocation.includes(cityFilter)) {
        return false;
      }
    }
    
    // Check career level (soft - keyword matching)
    if (filters.careerLevel) {
      const careerLevelKeywords: Record<string, string[]> = {
        'entry': ['entry', 'junior', 'beginner', 'graduate', 'trainee', 'intern', 'associate'],
        'junior': ['junior', 'associate', 'entry level', 'graduate'],
        'mid': ['mid', 'intermediate', 'experienced', 'senior associate'],
        'senior': ['senior', 'lead', 'principal', 'expert', 'manager'],
        'executive': ['executive', 'director', 'vp', 'vice president', 'chief', 'head of']
      };
      
      const jobText = (job.jobTitle + ' ' + job.jobDescription + ' ' + (job.experienceLevel || '')).toLowerCase();
      const levelKeywords = careerLevelKeywords[filters.careerLevel.toLowerCase()] || [];
      
      const hasMatch = levelKeywords.some(keyword => 
        jobText.includes(keyword.toLowerCase())
      );
      
      if (!hasMatch) {
        return false;
      }
    }
    
    // Check job category (soft - keyword/industry matching)
    if (filters.jobCategory) {
      const categoryKeywords: Record<string, string[]> = {
        'technology': ['tech', 'software', 'developer', 'engineer', 'programming', 'coding', 'it', 'data', 'ai', 'machine learning'],
        'marketing': ['marketing', 'advertisement', 'promotion', 'brand', 'digital marketing', 'content', 'social media'],
        'sales': ['sales', 'business development', 'account', 'revenue', 'customer', 'client'],
        'finance': ['finance', 'accounting', 'financial', 'analyst', 'investment', 'banking'],
        'healthcare': ['health', 'medical', 'doctor', 'nurse', 'healthcare', 'clinical', 'pharmaceutical'],
        'education': ['teacher', 'education', 'instructor', 'professor', 'tutor', 'academic', 'school'],
        'design': ['design', 'creative', 'graphic', 'ui', 'ux', 'visual', 'artist'],
        'operations': ['operations', 'logistics', 'supply chain', 'project management', 'coordination'],
        'hr': ['human resources', 'hr', 'recruitment', 'talent', 'people', 'hiring'],
        'sports': ['sports', 'fitness', 'coach', 'athletic', 'trainer', 'physical']
      };
      
      const jobText = (job.jobTitle + ' ' + job.jobDescription).toLowerCase();
      const categoryTerms = categoryKeywords[filters.jobCategory.toLowerCase()] || [filters.jobCategory.toLowerCase()];
      
      const hasMatch = categoryTerms.some(term => 
        jobText.includes(term)
      );
      
      if (!hasMatch) {
        return false;
      }
    }
    
    // Check search query (soft - keyword matching)
    if (filters.searchQuery) {
      const jobText = (job.jobTitle + ' ' + job.jobDescription + ' ' + job.companyName).toLowerCase();
      const queryTerms = filters.searchQuery.toLowerCase().split(' ').filter(term => term.length > 2);
      
      const hasMatch = queryTerms.some(term => 
        jobText.includes(term)
      );
      
      if (!hasMatch) {
        return false;
      }
    }
    
    // Check date posted (soft - within range)
    if (filters.datePosted && job.postedDate) {
      const now = new Date();
      const jobDate = new Date(job.postedDate);
      const daysDiff = Math.floor((now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const dateRanges: Record<string, number> = {
        'today': 1,
        'week': 7,
        'month': 30,
        '3months': 90
      };
      
      const maxDays = dateRanges[filters.datePosted] || 365;
      if (daysDiff > maxDays) {
        return false;
      }
    }
    
    return true; // All applied filters match
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
      
      // For hard filter violations, we only care if the job explicitly contradicts the selected type
      // If no employment type is specified, we don't reject (since it's missing metadata)
      if (job.employmentType) {
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
    console.log(`🤖 Starting strict job filtering for ${jobs.length} jobs`);
    
    // Check if any filters are applied
    const hasAnyFilters = this.hasActiveFilters(filters);
    
    if (!hasAnyFilters) {
      // No filters applied, return all jobs
      const jobsWithScores = jobs.map(job => ({
        ...job,
        aiFilterScore: 75,
        aiReasons: ['No filters applied'],
        aiFlags: []
      }));
      
      return {
        jobs: jobsWithScores,
        filterMessage: '',
        hasExpandedSearch: false
      };
    }

    // Apply STRICT filtering - jobs must match ALL selected filters exactly
    console.log(`🔒 Applying STRICT filtering for all selected filters`);
    
    const strictMatchedJobs = jobs.filter(job => {
      // First check hard filters (these are non-negotiable)
      const hardFilters = this.getHardFilters(filters);
      const hardFilterViolations = this.checkHardFilterViolations(job, hardFilters);
      
      if (hardFilterViolations.length > 0) {
        console.log(`❌ Job "${job.jobTitle}" rejected due to hard filter violations:`, hardFilterViolations);
        return false; // Hard filter violation = immediate rejection
      }
      
      // Then check if job matches ALL applied filters exactly
      const exactMatch = this.checkExactFilterMatch(job, filters);
      console.log(`🔍 Job "${job.jobTitle}" exact match check:`, exactMatch);
      
      return exactMatch;
    });

    console.log(`🔒 Strict filtering results: ${strictMatchedJobs.length} jobs match ALL selected filters exactly`);

    if (strictMatchedJobs.length > 0) {
      // We have exact matches - return them with no message
      const exactJobsWithScores = strictMatchedJobs.map(job => ({
        ...job,
        aiFilterScore: 95,
        aiReasons: ['Exact match for all selected filters'],
        aiFlags: []
      }));
      
      console.log(`✅ Returning ${strictMatchedJobs.length} jobs that match ALL filters exactly`);
      
      return {
        jobs: exactJobsWithScores,
        filterMessage: '', // No message when showing exact matches
        hasExpandedSearch: false
      };
    } else {
      // No exact matches found - return empty with explanation
      console.log(`❌ No jobs match ALL selected filters exactly`);
      
      return {
        jobs: [],
        filterMessage: 'No jobs match your selected preferences. Try adjusting your filters.',
        hasExpandedSearch: false
      };
    }
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