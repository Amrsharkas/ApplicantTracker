import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  MapPin,
  DollarSign,
  Clock,
  Search,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  salary?: string;
  jobType?: string;
  datePosted: string;
}

interface BrowseJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartJobInterview?: (job: any) => void;
}

export function BrowseJobsModal({ isOpen, onClose, onStartJobInterview }: BrowseJobsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ["/api/jobs", { search: searchQuery, location, jobType }],
    enabled: isOpen,
  });

  const handleStartJobInterview = (job: Job) => {
    if (onStartJobInterview) {
      onStartJobInterview(job);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      return `${Math.ceil(diffDays / 30)} months ago`;
    } catch {
      return "Recently posted";
    }
  };

  const EmptyState = () => (
    <div className="text-center py-16">
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
  );

  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-slate-600 ml-3">Loading available positions...</p>
    </div>
  );

  const ErrorState = () => (
    <div className="text-center py-12">
      <p className="text-red-600 mb-2">Error loading job postings</p>
      <p className="text-slate-600 text-sm">Please try again or contact support if the issue persists.</p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">
            Browse Available Positions
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Job title or keywords"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200 focus:border-blue-500"
              />
            </div>
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border-slate-200 focus:border-blue-500"
            />
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="border-slate-200 focus:border-blue-500">
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
          <div className="max-h-[55vh] overflow-y-auto space-y-4">
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState />
            ) : jobs.length === 0 ? (
              <EmptyState />
            ) : (
              jobs.map((job: Job, index: number) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 text-lg mb-1">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 mb-3">
                            <Building className="w-4 h-4 text-blue-600" />
                            <p className="text-blue-600 font-medium">{job.company}</p>
                          </div>
                          
                          <p className="text-slate-600 mb-4 line-clamp-3">
                            {job.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                            {job.salary && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                <span>{job.salary}</span>
                              </div>
                            )}
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
                        </div>
                        
                        <Button
                          onClick={() => handleStartJobInterview(job)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white ml-6 px-6"
                        >
                          Start Interview
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