import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, Building, DollarSign, Clock, Users, Search, Briefcase, Filter, ChevronDown, ChevronUp, X, Star, ExternalLink, ArrowRight, CheckCircle, AlertTriangle, Zap } from "lucide-react";

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
}

interface AIMatchResponse {
  matchScore: number;
  isStrongMatch: boolean;
  feedback: string;
  reasons: string[];
  suggestedActions?: string[];
  alternativeJobs?: JobPosting[];
}

interface JobPostingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const funnyNoJobsMessages = [
  "🦗 *crickets chirping* Looks like employers are still deciding if they want to hire amazing talent like you!",
  "🌵 It's quieter than a desert out here! But hey, good things come to those who wait... and refresh the page.",
  "🎭 Plot twist: All the employers are probably still figuring out how to use Airtable. Give them a moment!",
  "🚀 Houston, we have no job postings! But don't worry, mission control is working on it.",
  "🎪 The job posting circus hasn't come to town yet, but when it does, you'll be front row center!",
  "🔮 Our crystal ball says job postings are coming soon. Either that or we need to clean the crystal ball.",
  "🏖️ Looks like all the employers are on vacation! Must be nice... but they'll be back with jobs soon!",
  "🎯 Zero job postings found, but hey, you're 100% prepared when they arrive!",
  "🎨 Think of this as a blank canvas - employers are about to paint it with amazing opportunities!",
  "🍕 No jobs yet, but that just means more time to grab a snack before the opportunities flood in!"
];

export function JobPostingsModal({ isOpen, onClose }: JobPostingsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplicationAnalysis, setShowApplicationAnalysis] = useState(false);
  const [applicationAnalysis, setApplicationAnalysis] = useState<AIMatchResponse | null>(null);
  const [filters, setFilters] = useState({
    workplace: [] as string[],
    country: "",
    city: "",
    area: "",
    careerLevel: "",
    jobCategory: "",
    jobType: "",
    datePosted: ""
  });
  const [expandedFilters, setExpandedFilters] = useState({
    workplace: true,
    country: false,
    city: false,
    area: false,
    careerLevel: false,
    jobCategory: false,
    jobType: false,
    datePosted: false
  });
  const { toast } = useToast();

  const { data: jobPostings = [], isLoading, error } = useQuery({
    queryKey: ["/api/job-postings"],
    enabled: isOpen,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load job postings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    enabled: isOpen,
  });

  const applicationMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await apiRequest("/api/job-application/analyze", {
        method: "POST",
        body: JSON.stringify({
          jobId: jobData.recordId,
          jobTitle: jobData.jobTitle,
          jobDescription: jobData.jobDescription,
          companyName: jobData.companyName,
          requirements: jobData.skills || [],
          employmentType: jobData.employmentType
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      setApplicationAnalysis(data);
      setShowApplicationAnalysis(true);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to analyze job match. Please try again.",
        variant: "destructive",
      });
    },
  });

  const actualApplicationMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await apiRequest("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          jobId: 1, // Placeholder since we don't have actual job IDs
          jobTitle: jobData.jobTitle,
          companyName: jobData.companyName,
          status: "pending",
          appliedAt: new Date().toISOString()
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setShowApplicationAnalysis(false);
      setSelectedJob(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Smart filtering with partial matches
  const filteredJobs = jobPostings.filter((job: JobPosting) => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        job.jobTitle.toLowerCase().includes(query) ||
        job.companyName.toLowerCase().includes(query) ||
        job.jobDescription.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        job.skills?.some(skill => skill.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }

    // Smart workplace filter with partial matching
    if (filters.workplace.length > 0) {
      const jobWorkplace = job.employmentType?.toLowerCase() || "";
      const hasWorkplaceMatch = filters.workplace.some(w => {
        const filterValue = w.toLowerCase();
        return (
          jobWorkplace.includes(filterValue) ||
          (filterValue === "on-site" && (jobWorkplace.includes("full time") || jobWorkplace.includes("office"))) ||
          (filterValue === "remote" && jobWorkplace.includes("remote")) ||
          (filterValue === "hybrid" && (jobWorkplace.includes("hybrid") || jobWorkplace.includes("flexible")))
        );
      });
      if (!hasWorkplaceMatch) return false;
    }

    // Smart location filters with partial matching
    if (filters.country && job.location) {
      const locationLower = job.location.toLowerCase();
      const countryLower = filters.country.toLowerCase();
      if (!locationLower.includes(countryLower)) return false;
    }

    if (filters.city && job.location) {
      const locationLower = job.location.toLowerCase();
      const cityLower = filters.city.toLowerCase();
      if (!locationLower.includes(cityLower)) return false;
    }

    // Smart career level filter
    if (filters.careerLevel && job.experienceLevel) {
      const experienceLower = job.experienceLevel.toLowerCase();
      const levelLower = filters.careerLevel.toLowerCase();
      if (!experienceLower.includes(levelLower)) return false;
    }

    // Smart job category filter
    if (filters.jobCategory) {
      const jobCategory = job.jobTitle.toLowerCase();
      const categoryLower = filters.jobCategory.toLowerCase();
      if (!jobCategory.includes(categoryLower)) return false;
    }

    // Smart job type filter
    if (filters.jobType && job.employmentType) {
      const typeLower = job.employmentType.toLowerCase();
      const filterTypeLower = filters.jobType.toLowerCase();
      if (!typeLower.includes(filterTypeLower)) return false;
    }

    return true;
  });

  // AI Match Score calculation (simplified)
  const calculateAIMatchScore = (job: JobPosting): number => {
    if (!userProfile?.aiProfile) return 0;
    
    let score = 0;
    const profile = userProfile.aiProfile;
    
    // Skills matching
    if (job.skills && profile.skills) {
      const matchingSkills = job.skills.filter(skill => 
        profile.skills.some((userSkill: string) => 
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      score += (matchingSkills.length / job.skills.length) * 40;
    }
    
    // Experience level matching
    if (job.experienceLevel && profile.experience) {
      const experienceYears = profile.experience.length;
      const jobLevel = job.experienceLevel.toLowerCase();
      if (
        (jobLevel.includes('entry') && experienceYears <= 2) ||
        (jobLevel.includes('junior') && experienceYears <= 3) ||
        (jobLevel.includes('mid') && experienceYears >= 2 && experienceYears <= 5) ||
        (jobLevel.includes('senior') && experienceYears >= 5)
      ) {
        score += 30;
      }
    }
    
    // Location preference (if available in profile)
    if (job.location && profile.workStyle) {
      if (profile.workStyle.toLowerCase().includes('remote') && job.employmentType?.toLowerCase().includes('remote')) {
        score += 20;
      } else if (profile.workStyle.toLowerCase().includes('office') && job.employmentType?.toLowerCase().includes('office')) {
        score += 20;
      }
    }
    
    // Random factor for demonstration
    score += Math.random() * 10;
    
    return Math.min(Math.round(score), 100);
  };

  // Helper functions
  const toggleFilter = (filterType: keyof typeof expandedFilters) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const updateFilter = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const toggleWorkplaceFilter = (value: string) => {
    setFilters(prev => ({
      ...prev,
      workplace: prev.workplace.includes(value)
        ? prev.workplace.filter(w => w !== value)
        : [...prev.workplace, value]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      workplace: [],
      country: "",
      city: "",
      area: "",
      careerLevel: "",
      jobCategory: "",
      jobType: "",
      datePosted: ""
    });
    setSearchQuery("");
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    Array.isArray(value) ? value.length > 0 : value !== ""
  ).length;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const getRandomFunnyMessage = () => {
    return funnyNoJobsMessages[Math.floor(Math.random() * funnyNoJobsMessages.length)];
  };

  const getJobTags = (job: JobPosting) => {
    const tags = [];
    if (job.employmentType) tags.push(job.employmentType);
    if (job.experienceLevel) tags.push(job.experienceLevel);
    if (job.postedDate) {
      const daysSincePosted = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSincePosted <= 3) tags.push("New");
      if (daysSincePosted <= 1) tags.push("Urgent");
    }
    return tags;
  };

  const handleApply = (job: JobPosting) => {
    applicationMutation.mutate(job);
  };

  const handleConfirmApplication = () => {
    if (selectedJob) {
      actualApplicationMutation.mutate(selectedJob);
    }
  };

  const showRelatedNotice = filteredJobs.length > 0 && filteredJobs.length < jobPostings.length && activeFiltersCount > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Intelligent Job Discovery ({filteredJobs.length} matches)
            </div>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear Filters ({activeFiltersCount})
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Smart Filters Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Smart Filters
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                {activeFiltersCount} active • Always available
              </p>

              {/* Workplace Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('workplace')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>Workplace</span>
                  <div className="flex items-center gap-2">
                    {filters.workplace.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {filters.workplace.length}
                      </span>
                    )}
                    {expandedFilters.workplace ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {expandedFilters.workplace && (
                  <div className="mt-2 space-y-2 pl-2">
                    {['On-site', 'Remote', 'Hybrid'].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`workplace-${option}`}
                          checked={filters.workplace.includes(option)}
                          onCheckedChange={() => toggleWorkplaceFilter(option)}
                        />
                        <label
                          htmlFor={`workplace-${option}`}
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Country Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('country')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>Country</span>
                  {expandedFilters.country ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.country && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.country} onValueChange={(value) => updateFilter('country', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="egypt">Egypt</SelectItem>
                        <SelectItem value="usa">United States</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="canada">Canada</SelectItem>
                        <SelectItem value="germany">Germany</SelectItem>
                        <SelectItem value="france">France</SelectItem>
                        <SelectItem value="uae">UAE</SelectItem>
                        <SelectItem value="saudi">Saudi Arabia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* City Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('city')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>City</span>
                  {expandedFilters.city ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.city && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.city} onValueChange={(value) => updateFilter('city', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cairo">Cairo</SelectItem>
                        <SelectItem value="giza">Giza</SelectItem>
                        <SelectItem value="alexandria">Alexandria</SelectItem>
                        <SelectItem value="new-york">New York</SelectItem>
                        <SelectItem value="london">London</SelectItem>
                        <SelectItem value="toronto">Toronto</SelectItem>
                        <SelectItem value="berlin">Berlin</SelectItem>
                        <SelectItem value="dubai">Dubai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Career Level Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('careerLevel')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>Career Level</span>
                  {expandedFilters.careerLevel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.careerLevel && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.careerLevel} onValueChange={(value) => updateFilter('careerLevel', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid">Mid Level</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Job Category Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('jobCategory')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>Job Category</span>
                  {expandedFilters.jobCategory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.jobCategory && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.jobCategory} onValueChange={(value) => updateFilter('jobCategory', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Job Type Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('jobType')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>Job Type</span>
                  {expandedFilters.jobType ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.jobType && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.jobType} onValueChange={(value) => updateFilter('jobType', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full Time</SelectItem>
                        <SelectItem value="part-time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Date Posted Filter */}
              <div className="pb-3">
                <button
                  onClick={() => toggleFilter('datePosted')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>Date Posted</span>
                  {expandedFilters.datePosted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.datePosted && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.datePosted} onValueChange={(value) => updateFilter('datePosted', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="week">Past Week</SelectItem>
                        <SelectItem value="month">Past Month</SelectItem>
                        <SelectItem value="3months">Past 3 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search jobs by title, company, location, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Smart Notice */}
            {showRelatedNotice && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
                <p className="text-sm text-blue-800">
                  <Zap className="h-4 w-4 inline mr-1" />
                  No exact matches found. Showing related roles based on your profile.
                </p>
              </div>
            )}

            {/* Job Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-500 mb-2">Failed to load job postings</div>
                  <p className="text-gray-600">Please try again later</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                  {jobPostings.length === 0 ? (
                    <div className="max-w-md mx-auto">
                      <div className="text-6xl mb-4">🎭</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Job Postings Yet</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {getRandomFunnyMessage()}
                      </p>
                      <Button
                        onClick={() => window.location.reload()}
                        className="mt-4"
                        variant="outline"
                      >
                        Refresh Page
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
                      <p className="text-gray-600">Try adjusting your filters or search terms</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job: JobPosting, index: number) => {
                    const matchScore = calculateAIMatchScore(job);
                    const jobTags = getJobTags(job);
                    
                    return (
                      <motion.div
                        key={job.recordId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-blue-600 text-lg hover:text-blue-800 cursor-pointer">
                                    {job.jobTitle}
                                  </h3>
                                  <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
                                    <Star className="h-3 w-3 text-green-600" />
                                    <span className="text-xs font-medium text-green-800">
                                      {matchScore}% Match
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-gray-900 font-medium">{job.companyName}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-600 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {job.location || 'Location not specified'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                  {jobTags.map((tag, tagIndex) => (
                                    <Badge 
                                      key={tagIndex}
                                      variant={tag === "New" ? "default" : tag === "Urgent" ? "destructive" : "secondary"}
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  <span className="text-gray-500 text-sm">
                                    {job.postedDate ? formatDate(job.postedDate) : 'Recently posted'}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                                  {job.jobDescription}
                                </p>
                                {job.skills && job.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {job.skills.slice(0, 4).map((skill) => (
                                      <Badge 
                                        key={skill} 
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {skill}
                                      </Badge>
                                    ))}
                                    {job.skills.length > 4 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{job.skills.length - 4} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedJob(job)}
                                    className="flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    View Details
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApply(job)}
                                    disabled={applicationMutation.isPending}
                                    className="flex items-center gap-1"
                                  >
                                    {applicationMutation.isPending ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        Analyzing...
                                      </>
                                    ) : (
                                      <>
                                        <ArrowRight className="h-3 w-3" />
                                        Apply Now
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="ml-6 flex-shrink-0 flex items-center">
                                <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                                  <Building className="w-8 h-8 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Job Details Modal */}
        <AnimatePresence>
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedJob(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedJob.jobTitle}
                      </h2>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{selectedJob.companyName}</span>
                        <span>•</span>
                        <MapPin className="h-4 w-4" />
                        <span>{selectedJob.location || 'Remote'}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedJob(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedJob.jobDescription}</p>
                    </div>

                    {selectedJob.skills && selectedJob.skills.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills.map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t">
                      <Button
                        onClick={() => handleApply(selectedJob)}
                        disabled={applicationMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        {applicationMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Analyzing Match...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4" />
                            Apply Now
                          </>
                        )}
                      </Button>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Star className="h-4 w-4 text-green-600" />
                        <span>{calculateAIMatchScore(selectedJob)}% Match</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Application Analysis Modal */}
        <AnimatePresence>
          {showApplicationAnalysis && applicationAnalysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowApplicationAnalysis(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {applicationAnalysis.isStrongMatch ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      Application Analysis
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-900">
                        Match Score: {applicationAnalysis.matchScore}%
                      </span>
                    </div>

                    <div className={`p-3 rounded-lg ${
                      applicationAnalysis.isStrongMatch 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-orange-50 border border-orange-200'
                    }`}>
                      <p className={`text-sm ${
                        applicationAnalysis.isStrongMatch 
                          ? 'text-green-800' 
                          : 'text-orange-800'
                      }`}>
                        {applicationAnalysis.feedback}
                      </p>
                    </div>

                    {applicationAnalysis.reasons.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Analysis:</h4>
                        <ul className="space-y-1">
                          {applicationAnalysis.reasons.map((reason, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button
                        onClick={handleConfirmApplication}
                        disabled={actualApplicationMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        {actualApplicationMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Confirm Application
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowApplicationAnalysis(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}