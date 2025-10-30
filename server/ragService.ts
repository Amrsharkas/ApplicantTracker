/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles interactions with the vector database search API for job matching
 */

// TypeScript interfaces for RAG API
export interface RagSearchCollection {
  name: string;
}

export interface RagSearchRequest {
  query: string;
  collections: RagSearchCollection[];
  top_k?: number;
  score_threshold?: number;
}

export interface RagJobPayload {
  id: string;
  title: string;
  description: string;
  requirements: string;
  technicalSkills: string[];
  softSkills: string[];
  experience: string;
  employmentType: string;
  workplaceType: string;
  seniorityLevel: string;
  industry: string;
  location: string;
  organizationId: string;
  fullJob?: {
    id: number;
    title: string;
    description: string;
    requirements: string;
    technicalSkills: string[];
    softSkills: string[];
    experience: string;
    employmentType: string;
    workplaceType: string;
    seniorityLevel: string;
    industry: string;
    location: string;
    organizationId: string;
  };
}

export interface RagSearchResult {
  id: number;
  version: number;
  score: number;
  payload: RagJobPayload;
  vector: null;
  shard_key: null;
  order_value: null;
}

export interface RagSearchResponse {
  results: {
    jobs: RagSearchResult[];
  };
}

/**
 * RAG Service Class
 */
export class RagService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.RAG_API_URL || 'http://localhost:8002';
  }

  /**
   * Search for jobs in the vector database based on a query
   * @param query - The search query (typically an applicant's profile)
   * @param topK - Maximum number of results to return (default: 10)
   * @param scoreThreshold - Minimum similarity score threshold (optional)
   * @returns Array of job search results
   */
  async searchJobs(
    query: string,
    topK: number = 10,
    scoreThreshold?: number
  ): Promise<RagSearchResult[]> {
    try {
      if (!query) {
        console.warn('⚠️ RAG search called with empty query');
        return [];
      }

      console.log({
        query
      });
      
      const requestBody: RagSearchRequest = {
        query: query,
        collections: [{ name: 'jobs' }],
        // top_k: topK,
      };

      // Add score threshold if provided
      if (scoreThreshold !== undefined) {
        requestBody.score_threshold = scoreThreshold;
      }

      console.log(`🔍 Searching RAG API for jobs with query length: ${query.length} characters`);

      const response = await fetch(`${this.apiUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`RAG API returned status ${response.status}: ${response.statusText}`);
      }

      const data: RagSearchResponse = await response.json();

      console.log({
        response: JSON.stringify(data, null, 2),
      });

      const results = data.results?.jobs || [];
      console.log(`✅ RAG API returned ${results.length} job matches`);

      return results;
    } catch (error) {
      console.error('❌ Error calling RAG API:', error);

      // Provide more context for common errors
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          console.error(`💡 RAG API connection refused. Is the service running at ${this.apiUrl}?`);
        } else if (error.message.includes('fetch')) {
          console.error('💡 Network error connecting to RAG API');
        }
      }

      throw error;
    }
  }

  /**
   * Transform RAG search results into a format compatible with the application's job matching interface
   * @param ragResults - Array of RAG search results
   * @returns Formatted job matches
   */
  transformToJobMatches(ragResults: RagSearchResult[]): any[] {
    return ragResults.map((result) => {
      const job = result.payload.fullJob || result.payload;

      return {
        id: result.id,
        matchScore: result.score,
        matchReasons: this.generateMatchReasons(result),
        job: {
          id: typeof job.id === 'number' ? job.id : parseInt(job.id || result.payload.id),
          title: job.title,
          company: this.getCompanyFromOrganizationId(job.organizationId),
          description: job.description,
          requirements: job.requirements,
          location: job.location,
          salaryMin: undefined, // RAG payload doesn't include salary info
          salaryMax: undefined,
          experienceLevel: job.seniorityLevel || job.experience,
          skills: job.technicalSkills || [],
          jobType: job.employmentType,
          workplaceType: job.workplaceType,
          industry: job.industry,
        },
      };
    });
  }

  /**
   * Generate human-readable match reasons based on the RAG result
   * @param result - RAG search result
   * @returns Array of match reasons
   */
  private generateMatchReasons(result: RagSearchResult): string[] {
    const reasons: string[] = [];
    const score = result.score;

    // Generate reasons based on match score
    if (score > 0.8) {
      reasons.push('Excellent match for your profile');
    } else if (score > 0.6) {
      reasons.push('Strong match for your skills and experience');
    } else if (score > 0.4) {
      reasons.push('Good match for your career interests');
    } else {
      reasons.push('Relevant match for your background');
    }

    // Add skill-based reasons if available
    const skills = result.payload.technicalSkills;
    if (skills && skills.length > 0) {
      reasons.push(`Matches ${skills.slice(0, 3).join(', ')} skills`);
    }

    // Add location if available
    if (result.payload.location) {
      reasons.push(`Located in ${result.payload.location}`);
    }

    return reasons;
  }

  /**
   * Get company name from organization ID
   * TODO: This should be replaced with actual organization lookup from database
   * @param organizationId - Organization UUID
   * @returns Company name or placeholder
   */
  private getCompanyFromOrganizationId(organizationId: string): string {
    // For now, return a placeholder
    // In production, this should query the organizations table
    return 'Company'; // TODO: Implement organization lookup
  }
}

// Export singleton instance
export const ragService = new RagService();
