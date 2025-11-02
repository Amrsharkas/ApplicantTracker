import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { JobSpecificInterviewOptionsModal } from "./JobSpecificInterviewOptionsModal";
import { JobSpecificInterviewModal } from "./JobSpecificInterviewModal";
import { useToast } from "@/hooks/use-toast";

import { MapPin, Target, Building, RefreshCw, Briefcase, ChevronDown, ChevronUp, Video } from "lucide-react";

interface JobMatch {
  id: number;
  matchScore: number;
  matchReasons: string[];
  recordId?: string; // Job match record ID for interview tracking
  job: {
    id: number;
    title: string;
    company: string;
    description: string;
    requirements?: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    experienceLevel?: string;
    skills?: string[];
    jobType?: string;
    workplaceType?: string;
    industry?: string;
  };
}

interface JobSummary {
  recordId: string;
  jobTitle: string;
  jobDescription?: string;
  companyName: string;
  location?: string;
  aiPrompt?: string;
}

interface MatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MatchesModal({ isOpen, onClose }: MatchesModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: matches = [], isLoading } = useQuery<JobMatch[]>({
    queryKey: ["/api/job-matches/rag"],
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false, // Refresh every 30 seconds when modal is open to sync with RAG
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({});

  // Interview state management
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewMode, setInterviewMode] = useState<'text' | 'voice'>('voice');
  const [interviewLanguage, setInterviewLanguage] = useState<'english' | 'arabic'>('english');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/job-matches/rag"] });
    setTimeout(() => setIsRefreshing(false), 1000); // Show animation for 1 second
  };

  const toggleExpanded = (jobId: number) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const handleStartInterview = async (match: JobMatch) => {
    try {
      // First, create a job match record in the database
      const response = await fetch('/api/job-matches/rag/create-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ragMatch: match })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create interview record');
      }

      const { recordId } = await response.json();

      // Create job summary for interview modal
      const jobSummary: JobSummary = {
        recordId,
        jobTitle: match.job.title,
        jobDescription: match.job.description,
        companyName: match.job.company,
        location: match.job.location,
      };

      setSelectedJob(jobSummary);
      setOptionsOpen(true);
    } catch (error) {
      console.error('Error starting interview:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start interview',
        variant: 'destructive',
      });
    }
  };

  const handleOptionsSubmit = async (opts: { mode: 'text' | 'voice'; language: 'english' | 'arabic' }) => {
    setInterviewMode(opts.mode);
    setInterviewLanguage(opts.language);

    try {
      // Start the interview session with the selected options
      const response = await fetch('/api/interview/start-job-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          job: selectedJob,
          language: opts.language
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start interview');
      }

      setOptionsOpen(false);
      setInterviewOpen(true);
    } catch (error) {
      console.error('Error starting interview session:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start interview session',
        variant: 'destructive',
      });
    }
  };

  const handleInterviewComplete = () => {
    // Refresh matches to update status
    queryClient.invalidateQueries({ queryKey: ["/api/job-matches/rag"] });
    toast({
      title: 'Interview Complete',
      description: 'Your interview has been saved successfully.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-800">AI Job Matches</DialogTitle>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>
        
        <div className="max-h-[75vh] overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-20 h-20 text-slate-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-slate-700 mb-3">🔍 Still Hunting for Your Perfect Match!</h3>
              <div className="space-y-2 mb-6">
                <p className="text-lg text-slate-600">
                  Our AI matchmaker is working overtime, but your dream job is playing hard to get! 
                </p>
                <p className="text-slate-500">
                  Don't worry - we're like a persistent dating app but for careers. We never give up! 💪
                </p>
                <p className="text-sm text-slate-400 italic">
                  (Pro tip: The more interviews you complete, the better we get at finding your professional soulmate)
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-70"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Check Again (Pretty Please!)
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-slate-300 hover:bg-slate-50"
                >
                  I'll Wait Patiently 😌
                </Button>
              </div>
            </div>
          ) : (
            matches.map((match: JobMatch, index: number) => {
              const isExpanded = expandedJobs[match.id] || false;

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          {/* Header Section */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-800 text-xl mb-2">
                                {match.job.title}
                              </h3>
                              <div className="flex items-center gap-2 mb-2">
                                <Building className="w-4 h-4 text-blue-600" />
                                <p className="text-blue-600 font-medium">{match.job.company}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className="bg-green-500 text-white">
                                {Math.round(match.matchScore * 100)}% Match
                              </Badge>
                              <Button
                                onClick={() => handleStartInterview(match)}
                                size="sm"
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center gap-2"
                              >
                                <Video className="w-4 h-4" />
                                Start Interview
                              </Button>
                            </div>
                          </div>

                          {/* Match Reasons */}
                          {match.matchReasons && match.matchReasons.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200 mb-3">
                              <p className="text-sm font-medium text-green-700 mb-1">✨ Why this matches you:</p>
                              <ul className="text-sm text-green-600 list-disc list-inside">
                                {match.matchReasons.slice(0, 3).map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Job Details Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-700">{match.job.location}</span>
                            </div>
                            {match.job.experienceLevel && (
                              <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-slate-500" />
                                <span className="text-slate-700">{match.job.experienceLevel}</span>
                              </div>
                            )}
                            {match.job.jobType && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="capitalize">
                                  {match.job.jobType}
                                </Badge>
                              </div>
                            )}
                            {match.job.workplaceType && (
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="capitalize">
                                  {match.job.workplaceType}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Skills Section */}
                          {match.job.skills && match.job.skills.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-slate-700 mb-2">Required Skills:</p>
                              <div className="flex flex-wrap gap-2">
                                {match.job.skills.slice(0, 6).map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant="secondary"
                                    className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                                {match.job.skills.length > 6 && (
                                  <Badge variant="outline">
                                    +{match.job.skills.length - 6} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Description Preview */}
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-2">Description:</p>
                            {!isExpanded ? (
                              <div className="text-slate-600 text-sm line-clamp-3">
                                {match.job.description}
                              </div>
                            ) : (
                              <div className="prose prose-sm max-w-none text-slate-600">
                                <ReactMarkdown>{match.job.description}</ReactMarkdown>
                              </div>
                            )}
                          </div>

                          {/* Requirements Section (only shown when expanded) */}
                          {isExpanded && match.job.requirements && (
                            <div className="mb-3 border-t pt-3">
                              <p className="text-sm font-medium text-slate-700 mb-2">Requirements:</p>
                              <div className="prose prose-sm max-w-none text-slate-600">
                                <ReactMarkdown>{match.job.requirements}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* Expand/Collapse Button */}
                          <Button
                            onClick={() => toggleExpanded(match.id)}
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                Show More Details
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </DialogContent>

      {/* Interview Options Modal */}
      <JobSpecificInterviewOptionsModal
        isOpen={optionsOpen}
        onClose={() => {
          setOptionsOpen(false);
          setSelectedJob(null);
        }}
        job={selectedJob}
        onConfirm={handleOptionsSubmit}
      />

      {/* Interview Modal */}
      <JobSpecificInterviewModal
        isOpen={interviewOpen}
        onClose={() => {
          setInterviewOpen(false);
          setSelectedJob(null);
        }}
        job={selectedJob}
        mode={interviewMode}
        language={interviewLanguage}
        onInterviewComplete={handleInterviewComplete}
      />
    </Dialog>
  );
}
