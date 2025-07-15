import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MapPin, Building, DollarSign, Clock, Users, Search, Briefcase, Filter, ChevronDown, ChevronUp, X } from "lucide-react";

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
    workplace: false,
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

  // Filter job postings based on search query and filters
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

    // Workplace filter (On-site, Remote, Hybrid)
    if (filters.workplace.length > 0) {
      const jobWorkplace = job.employmentType?.toLowerCase() || "";
      const hasWorkplaceMatch = filters.workplace.some(w => 
        jobWorkplace.includes(w.toLowerCase()) || 
        (w === "On-site" && jobWorkplace.includes("full time")) ||
        (w === "Remote" && jobWorkplace.includes("remote")) ||
        (w === "Hybrid" && jobWorkplace.includes("hybrid"))
      );
      if (!hasWorkplaceMatch) return false;
    }

    // Country filter
    if (filters.country && job.location) {
      if (!job.location.toLowerCase().includes(filters.country.toLowerCase())) {
        return false;
      }
    }

    // City filter
    if (filters.city && job.location) {
      if (!job.location.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
    }

    // Career Level filter
    if (filters.careerLevel && job.experienceLevel) {
      if (!job.experienceLevel.toLowerCase().includes(filters.careerLevel.toLowerCase())) {
        return false;
      }
    }

    // Job Category filter
    if (filters.jobCategory) {
      const jobCategory = job.jobTitle.toLowerCase();
      if (!jobCategory.includes(filters.jobCategory.toLowerCase())) {
        return false;
      }
    }

    // Job Type filter
    if (filters.jobType && job.employmentType) {
      if (!job.employmentType.toLowerCase().includes(filters.jobType.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Job Postings ({filteredJobs.length})
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
          {/* Filters Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">
                Filters
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                {activeFiltersCount} filters selected
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
                  {filteredJobs.map((job: JobPosting, index: number) => (
                    <motion.div
                      key={job.recordId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-blue-600 text-lg hover:text-blue-800 cursor-pointer">
                                  {job.jobTitle}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-gray-900 font-medium">{job.companyName}</span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-600">{job.location || 'Location not specified'}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                  {job.employmentType || 'Full Time'}
                                </span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  {job.experienceLevel || 'All Levels'}
                                </span>
                                <span className="text-gray-500">
                                  {job.postedDate ? formatDate(job.postedDate) : 'Recently posted'}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                                {job.jobDescription}
                              </p>
                              {job.skills && job.skills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {job.skills.slice(0, 4).map((skill) => (
                                    <Badge 
                                      key={skill} 
                                      variant="secondary"
                                      className="bg-gray-100 text-gray-700 text-xs"
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}