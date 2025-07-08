import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MapPin, DollarSign, Clock, Building } from "lucide-react";

interface Job {
  id: number;
  title: string;
  company: string;
  description: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string;
  skills?: string[];
  jobType?: string;
  postedAt: string;
}

interface JobSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JobSearchModal({ isOpen, onClose }: JobSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["/api/jobs", { search: searchQuery, location, experienceLevel }],
    enabled: isOpen,
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("POST", "/api/applications", { jobId });
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: (error) => {
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
        title: "Application Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified";
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `$${(min / 1000).toFixed(0)}k+`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">Search Jobs</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Job title or keywords"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-card"
            />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="glass-card"
            />
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger className="glass-card">
                <SelectValue placeholder="Experience Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Experience Levels</SelectItem>
                <SelectItem value="Entry Level">Entry Level</SelectItem>
                <SelectItem value="Mid Level">Mid Level</SelectItem>
                <SelectItem value="Senior">Senior Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Results */}
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                No jobs found. Try adjusting your search criteria.
              </div>
            ) : (
              jobs.map((job: Job, index: number) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 text-lg mb-1">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="w-4 h-4 text-blue-600" />
                            <p className="text-blue-600 font-medium">{job.company}</p>
                          </div>
                          
                          <p className="text-slate-600 mb-3 line-clamp-2">
                            {job.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(job.postedAt)}</span>
                            </div>
                          </div>

                          {job.skills && job.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {job.skills.slice(0, 4).map((skill) => (
                                <Badge 
                                  key={skill} 
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                                >
                                  {skill}
                                </Badge>
                              ))}
                              {job.skills.length > 4 && (
                                <Badge variant="outline">
                                  +{job.skills.length - 4} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => applyMutation.mutate(job.id)}
                          disabled={applyMutation.isPending}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white ml-4"
                        >
                          {applyMutation.isPending ? "Applying..." : "Apply"}
                        </Button>
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
