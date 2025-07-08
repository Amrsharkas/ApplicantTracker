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
  id: string; // Changed to string for Airtable record IDs
  title: string;
  company: string;
  description: string;
  location: string;
  salary?: string; // Changed to string for Airtable format
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string;
  skills?: string[];
  jobType?: string;
  datePosted: string; // Changed from postedAt to datePosted
}

interface JobSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartJobInterview?: (job: any) => void;
}

export function JobSearchModal({ isOpen, onClose, onStartJobInterview }: JobSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ["/api/jobs", { search: searchQuery, location, jobType }],
    enabled: isOpen,
  });

  const handleStartJobInterview = (job: any) => {
    if (onStartJobInterview) {
      onStartJobInterview(job);
      onClose(); // Close the job search modal
    }
  };

  const formatSalary = (salary?: string, min?: number, max?: number) => {
    // Use string salary if available (from Airtable)
    if (salary && salary.trim() !== '') return salary;
    
    // Fallback to numeric format for backward compatibility
    if (!min && !max) return "Competitive";
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
          <DialogTitle className="text-2xl font-bold text-slate-800">Browse Available Positions</DialogTitle>
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
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="glass-card">
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Job Types</SelectItem>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Remote">Remote</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Results */}
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-slate-600 mt-2">Loading jobs from platojobpostings...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-2">Error loading jobs</p>
                <p className="text-slate-600 text-sm">Please try again or contact support if the issue persists.</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🦗</div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  It's quieter than a library here!
                </h3>
                <p className="text-slate-600 mb-1">
                  No job postings are currently available.
                </p>
                <p className="text-slate-500 text-sm">
                  The jobs are probably still getting their coffee ☕
                </p>
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
                              <span>{formatSalary(job.salary, job.salaryMin, job.salaryMax)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(job.datePosted)}</span>
                            </div>
                            {job.jobType && (
                              <Badge variant="outline" className="text-xs">
                                {job.jobType}
                              </Badge>
                            )}
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
                          onClick={() => handleStartJobInterview(job)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white ml-4"
                        >
                          Interview
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
