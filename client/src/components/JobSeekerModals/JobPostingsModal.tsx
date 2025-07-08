import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MapPin, Building, DollarSign, Clock, Users, Search, Briefcase } from "lucide-react";

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

  // Filter job postings based on search query
  const filteredJobs = jobPostings.filter((job: JobPosting) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.jobTitle.toLowerCase().includes(query) ||
      job.companyName.toLowerCase().includes(query) ||
      job.jobDescription.toLowerCase().includes(query) ||
      job.location?.toLowerCase().includes(query) ||
      job.skills?.some(skill => skill.toLowerCase().includes(query))
    );
  });

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Job Postings
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-6 overflow-hidden">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search jobs by title, company, location, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Job Results */}
          <div className="flex-1 overflow-y-auto space-y-4 max-h-[60vh]">
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
                    <p className="text-gray-600">Try adjusting your search terms</p>
                  </div>
                )}
              </div>
            ) : (
              filteredJobs.map((job: JobPosting, index: number) => (
                <motion.div
                  key={job.recordId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {job.jobTitle}
                          </h3>
                          <div className="flex items-center gap-2 mb-3">
                            <Building className="w-4 h-4 text-blue-600" />
                            <p className="text-blue-600 font-medium">{job.companyName}</p>
                          </div>

                          <p className="text-gray-600 mb-4 line-clamp-3">
                            {job.jobDescription}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                            {job.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{job.location}</span>
                              </div>
                            )}
                            {job.salaryRange && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                <span>{job.salaryRange}</span>
                              </div>
                            )}
                            {job.employmentType && (
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{job.employmentType}</span>
                              </div>
                            )}
                            {job.postedDate && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>Posted {formatDate(job.postedDate)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {job.experienceLevel && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                {job.experienceLevel}
                              </Badge>
                            )}
                            {job.skills && job.skills.length > 0 && (
                              <>
                                {job.skills.slice(0, 4).map((skill) => (
                                  <Badge 
                                    key={skill} 
                                    variant="secondary"
                                    className="bg-blue-100 text-blue-700"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                                {job.skills.length > 4 && (
                                  <Badge variant="outline">
                                    +{job.skills.length - 4} more
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}