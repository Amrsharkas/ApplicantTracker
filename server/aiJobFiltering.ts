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
  
  async analyzeJobWithFilters(job: JobPosting, filters: JobFilters): Promise<AIFilterResult> {
    try {
      const prompt = `
You are an intelligent job filtering AI. Analyze how well this job matches the user's specified filters.

JOB DETAILS:
- Title: ${job.jobTitle}
- Company: ${job.companyName}
- Location: ${job.location || 'Not specified'}
- Employment Type: ${job.employmentType || 'Not specified'}
- Experience Level: ${job.experienceLevel || 'Not specified'}
- Posted Date: ${job.postedDate || 'Not specified'}
- Description: ${job.jobDescription}

USER FILTERS:
- Workplace Type: ${filters.workplace.length > 0 ? filters.workplace.join(', ') : 'Any'}
- Country: ${filters.country || 'Any'}
- City: ${filters.city || 'Any'}
- Career Level: ${filters.careerLevel || 'Any'}
- Job Category: ${filters.jobCategory || 'Any'}
- Job Type: ${filters.jobType || 'Any'}
- Date Posted: ${filters.datePosted || 'Any'}
- Search Query: ${filters.searchQuery || 'None'}

ANALYSIS INSTRUCTIONS:
1. Be flexible and forgiving - understand context and meaning, not just exact matches
2. Consider synonyms, variations, and industry terminology
3. Look at the job description content to understand what the job really is
4. Account for incomplete or missing metadata
5. Score from 0-100 where:
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
    
    // First, check if any filters are applied
    const hasFilters = this.hasActiveFilters(filters);
    
    if (!hasFilters) {
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

    // Analyze each job with AI
    const analysisPromises = jobs.map(async (job) => {
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
    
    // Determine filtering strategy
    const highQualityMatches = sortedJobs.filter(job => job.aiFilterScore >= 70);
    const goodMatches = sortedJobs.filter(job => job.aiFilterScore >= 50);
    const anyMatches = sortedJobs.filter(job => job.aiFilterScore >= 30);
    
    let finalJobs = sortedJobs;
    let filterMessage = '';
    let hasExpandedSearch = false;
    
    if (highQualityMatches.length >= 3) {
      // Enough high-quality matches
      finalJobs = highQualityMatches;
    } else if (goodMatches.length >= 2) {
      // Show good matches
      finalJobs = goodMatches;
      if (goodMatches.length < highQualityMatches.length + 3) {
        filterMessage = 'We broadened your filters slightly to show more relevant jobs';
        hasExpandedSearch = true;
      }
    } else if (anyMatches.length >= 1) {
      // Show any partial matches
      finalJobs = anyMatches;
      filterMessage = 'We expanded your search significantly to find potentially relevant jobs';
      hasExpandedSearch = true;
    } else {
      // Show all jobs but with explanation
      finalJobs = sortedJobs;
      filterMessage = 'No exact matches found. Showing all available jobs ranked by relevance';
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