import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from 'react-markdown';
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Building, ExternalLink, MapPin, RefreshCw, Star, ArrowLeft, Play, CheckCircle2, Clock, Award, Sparkles, Search, FileText, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { JobSpecificInterviewOptionsModal } from "@/components/JobSeekerModals/JobSpecificInterviewOptionsModal";
import { JobSpecificInterviewModal } from "@/components/JobSeekerModals/JobSpecificInterviewModal";
import { AssessmentFormModal } from "@/components/JobSeekerModals/AssessmentFormModal";
import { getInterviewLanguage } from "@/lib/interviewUtils";

interface InvitedJob {
  recordId: string;
  jobId: string | number;
  jobTitle: string;
  jobDescription?: string;
  companyName: string;
  location?: string;
  skills?: string[];
  status?: string;
  score?: number;
  interviewComments?: string;
  aiPrompt?: string;
  interviewLanguage?: string;
  assessmentQuestions?: any[];
  assessmentResponses?: any;
}

export default function JobInterviewsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<InvitedJob | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewMode, setInterviewMode] = useState<'text' | 'voice'>('text');
  const [interviewLanguage, setInterviewLanguage] = useState<'english' | 'arabic'>('english');
  const [assessmentOpen, setAssessmentOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'invited' | 'completed'>('invited');

  const { data: items = [], refetch, isLoading, error } = useQuery({
    queryKey: ["/api/job-specific-ai-interviews", activeTab],
    queryFn: async () => apiRequest(`/api/job-specific-ai-interviews?status=${activeTab}`),
    onError: (err: Error) => {
      if (isUnauthorizedError(err)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
      } else {
        toast({ title: "Error", description: err.message || "Failed to load invitations" , variant: "destructive" });
      }
    }
  });

  const invitedJobs: InvitedJob[] = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((j: InvitedJob) =>
      (j.jobTitle || "").toLowerCase().includes(q) ||
      (j.companyName || "").toLowerCase().includes(q) ||
      (j.jobDescription || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleInterviewComplete = async () => {
    // Refresh the interview data
    await refetch();
    // Switch to completed tab to show the finished interview
    setActiveTab('completed');
  };

  // Check if job has assessment questions that need to be completed
  const needsAssessment = (job: InvitedJob | null): boolean => {
    if (!job) return false;
    const hasQuestions = job.assessmentQuestions && job.assessmentQuestions.length > 0;
    const alreadyCompleted = job.assessmentResponses !== null && job.assessmentResponses !== undefined;
    return hasQuestions && !alreadyCompleted;
  };

  // Handler for starting interview - checks for assessment first
  const handleStartInterviewClick = (job: InvitedJob) => {
    setSelectedJob(job);
    if (needsAssessment(job)) {
      setAssessmentOpen(true);
    } else {
      setOptionsOpen(true);
    }
  };

  // Handler for when assessment is completed
  const handleAssessmentComplete = async () => {
    setAssessmentOpen(false);
    await refetch(); // Refresh to get updated assessmentResponses
    // Now open the interview options modal
    setOptionsOpen(true);
  };

  return (
    <>
      {/* Full-screen interview overlay */}
      {interviewOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900">
          <JobSpecificInterviewModal
            isOpen={interviewOpen}
            onClose={() => {
              console.log('JobSpecificInterviewModal onClose called');
              setInterviewOpen(false);
            }}
            job={selectedJob}
            mode={interviewMode}
            language={interviewLanguage}
            onInterviewComplete={handleInterviewComplete}
          />
        </div>
      )}

      {/* Main page content - hidden when interview is open */}
      <div className={`${interviewOpen ? 'hidden' : 'space-y-6'}`}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Job Interviews
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Complete AI interviews for specific job applications ({invitedJobs.length})
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
            title="Refresh invitations"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-600 dark:text-slate-400 shadow-inner">
              <TabsTrigger
                value="invited"
                className="relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-blue-400 gap-2"
              >
                <Clock className="h-4 w-4" />
                Pending Interviews
                {activeTab === 'invited' && invitedJobs.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-0">
                    {invitedJobs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-green-400 gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Completed Interviews
                {activeTab === 'completed' && invitedJobs.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0">
                    {invitedJobs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Search Bar */}
            <div className="relative w-full sm:w-auto sm:min-w-[320px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title, company, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Invited Tab */}
          <TabsContent value="invited" className="space-y-4 mt-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-blue-600"></div>
                  <Clock className="absolute inset-0 m-auto h-6 w-6 text-blue-600 animate-pulse" />
                </div>
                <p className="mt-4 text-slate-500 dark:text-slate-400">Loading interviews...</p>
              </div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Failed to load invitations</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">There was an error loading your interview invitations</p>
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </motion.div>
            ) : invitedJobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full flex items-center justify-center">
                    <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Pending Interviews</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
                  You don't have any job-specific interview invitations at the moment. Check back later or explore other opportunities.
                </p>
                <Button onClick={() => setLocation("/dashboard")} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {invitedJobs.map((job, index) => (
                  <motion.div
                    key={job.recordId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-blue-950/20 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700">
                      {/* Accent gradient */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500"></div>

                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          {/* Company Logo */}
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                                <Building className="w-10 h-10 text-white" />
                              </div>
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center">
                                <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                    {job.jobTitle}
                                  </h3>
                                  <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 border-blue-200 dark:border-blue-800 flex-shrink-0">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <Building className="h-4 w-4" />
                                    <span className="text-slate-900 dark:text-slate-100">{job.companyName}</span>
                                  </div>
                                  <span className="text-slate-400">•</span>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>{job.location || 'Remote'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4 line-clamp-2 prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{job.jobDescription || 'No description available'}</ReactMarkdown>
                            </div>

                            {/* Skills */}
                            {job.skills && job.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {job.skills.slice(0, 5).map((skill) => (
                                  <Badge key={skill} variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {job.skills.length > 5 && (
                                  <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 text-xs">
                                    +{job.skills.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                onClick={() => handleStartInterviewClick(job)}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                size="sm"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                {needsAssessment(job) ? 'Start Assessment' : 'Start Interview'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedJob(job)}
                                className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-4 mt-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-green-600"></div>
                  <CheckCircle2 className="absolute inset-0 m-auto h-6 w-6 text-green-600 animate-pulse" />
                </div>
                <p className="mt-4 text-slate-500 dark:text-slate-400">Loading completed interviews...</p>
              </div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Failed to load finished interviews</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">There was an error loading your completed interviews</p>
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </motion.div>
            ) : invitedJobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Completed Interviews Yet</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
                  You haven't completed any interviews yet. Start with a pending interview to see your results here.
                </p>
                <Button onClick={() => setActiveTab('invited')} variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  View Pending Interviews
                </Button>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {invitedJobs.map((job, index) => {
                  const score = typeof job.score === 'number' ? job.score : null;
                  const getScoreColor = (score: number) => {
                    if (score >= 80) return { bg: 'from-green-500 to-emerald-600', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' };
                    if (score >= 60) return { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' };
                    return { bg: 'from-red-500 to-rose-600', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' };
                  };
                  const scoreColor = score !== null ? getScoreColor(score) : null;

                  return (
                    <motion.div
                      key={job.recordId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-green-50/30 dark:from-slate-800 dark:to-green-950/20 border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700">
                        {/* Accent gradient */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500"></div>

                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            {/* Company Logo with Score Badge */}
                            <div className="flex-shrink-0">
                              <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                                  <Building className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-100 dark:bg-green-900 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center">
                                  <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
                                      {job.jobTitle}
                                    </h3>
                                    <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 border-green-200 dark:border-green-800 flex-shrink-0">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex items-center gap-1.5 font-medium">
                                      <Building className="h-4 w-4" />
                                      <span className="text-slate-900 dark:text-slate-100">{job.companyName}</span>
                                    </div>
                                    <span className="text-slate-400">•</span>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-4 w-4" />
                                      <span>{job.location || 'Remote'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4 line-clamp-2 prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{job.jobDescription || 'No description available'}</ReactMarkdown>
                              </div>

                              {/* Score Display */}
                              {score !== null && scoreColor && (
                                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200 dark:border-slate-600">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Award className={`h-5 w-5 ${scoreColor.text}`} />
                                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Interview Score</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-2xl font-bold ${scoreColor.text}`}>{score}</span>
                                      <span className="text-sm text-slate-500 dark:text-slate-400">/100</span>
                                    </div>
                                  </div>
                                  <Progress
                                    value={score}
                                    className="h-2.5 bg-slate-200 dark:bg-slate-700"
                                  />
                                  <div className="mt-2 flex items-center justify-between">
                                    <Badge variant="outline" className={scoreColor.badge}>
                                      {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement'}
                                    </Badge>
                                  </div>
                                </div>
                              )}

                              {/* Skills */}
                              {job.skills && job.skills.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {job.skills.slice(0, 5).map((skill) => (
                                    <Badge key={skill} variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {job.skills.length > 5 && (
                                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 text-xs">
                                      +{job.skills.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex flex-wrap items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedJob(job)}
                                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Details & Feedback
                                </Button>
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
          </TabsContent>
        </Tabs>

        {/* Details Drawer */}
        <AnimatePresence>
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex z-40"
              onClick={() => setSelectedJob(null)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="ml-auto w-full sm:w-2/3 max-w-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
                  {/* Status accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    selectedJob.status === 'completed'
                      ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500'
                      : 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500'
                  }`}></div>

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                            {selectedJob.jobTitle}
                          </h2>
                          <Badge className={`flex-shrink-0 ${
                            selectedJob.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          }`}>
                            {selectedJob.status === 'completed' ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</>
                            ) : (
                              <><Clock className="w-3 h-3 mr-1" /> Pending</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Building className="h-4 w-4" />
                            <span className="text-slate-900 dark:text-slate-100">{selectedJob.companyName}</span>
                          </div>
                          <span className="text-slate-400">•</span>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            <span>{selectedJob.location || 'Remote'}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedJob(null)}
                        className="hover:bg-slate-200 dark:hover:bg-slate-800 flex-shrink-0"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Score display for completed interviews */}
                    {selectedJob.status === 'completed' && typeof selectedJob.score === 'number' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selectedJob.score >= 80
                                ? 'bg-green-100 dark:bg-green-900/50'
                                : selectedJob.score >= 60
                                ? 'bg-yellow-100 dark:bg-yellow-900/50'
                                : 'bg-red-100 dark:bg-red-900/50'
                            }`}>
                              <Award className={`h-5 w-5 ${
                                selectedJob.score >= 80
                                  ? 'text-green-600 dark:text-green-400'
                                  : selectedJob.score >= 60
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Interview Score</p>
                              <p className="text-xs text-slate-500 dark:text-slate-500">Performance evaluation</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${
                              selectedJob.score >= 80
                                ? 'text-green-600 dark:text-green-400'
                                : selectedJob.score >= 60
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {selectedJob.score}
                              <span className="text-lg text-slate-500 dark:text-slate-400">/100</span>
                            </div>
                          </div>
                        </div>
                        <Progress value={selectedJob.score} className="h-2.5 mb-3" />
                        <Badge variant="outline" className={
                          selectedJob.score >= 80
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                            : selectedJob.score >= 60
                            ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                            : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                        }>
                          {selectedJob.score >= 80 ? 'Excellent Performance' : selectedJob.score >= 60 ? 'Good Performance' : 'Needs Improvement'}
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {/* Job Description */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Job Description</h3>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <ReactMarkdown>{selectedJob.jobDescription || 'No description available'}</ReactMarkdown>
                      </div>
                    </motion.div>

                    {/* Required Skills */}
                    {selectedJob.skills && selectedJob.skills.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Required Skills</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills.map((skill, index) => (
                            <motion.div
                              key={skill}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 + index * 0.05 }}
                            >
                              <Badge
                                variant="outline"
                                className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-sm py-1.5"
                              >
                                {skill}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Interview Comments */}
                    {selectedJob.status === 'completed' && selectedJob.interviewComments && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Feedback</h3>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                          <ReactMarkdown>{selectedJob.interviewComments}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}

                    <div className="h-20"></div>
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedJob(null)}
                      className="border-slate-300 dark:border-slate-600"
                    >
                      Close
                    </Button>
                    {selectedJob.status !== 'completed' && (
                      <Button
                        onClick={() => handleStartInterviewClick(selectedJob)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {needsAssessment(selectedJob) ? 'Start Assessment' : 'Start Interview'}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <JobSpecificInterviewOptionsModal
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          job={selectedJob}
          onConfirm={async ({ mode, language }) => {
            try {
              // Use job-specific interview language, fallback to user selection
              const interviewLanguage = getInterviewLanguage(selectedJob, language);
              console.log('🎤 Starting interview with language:', interviewLanguage, 'from job:', selectedJob?.interviewLanguage, 'user selected:', language);

              const endpoint = mode === 'voice' ? '/api/interview/start-job-practice-voice' : '/api/interview/start-job-practice';
              const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ job: selectedJob, language: interviewLanguage })
              });
              if (!res.ok) throw new Error('Failed to start');
              // leave options open until interview modal opens
              // Let parent open interview modal if handlers were passed
              if (mode === 'voice') {
                setInterviewMode('voice');
              } else {
                setInterviewMode('text');
              }
              setInterviewLanguage(interviewLanguage);
              setInterviewOpen(true);
              setOptionsOpen(false);
            } catch (e: any) {
              toast({ title: "Error", description: e.message || "Failed to start interview", variant: "destructive" });
            }
          }}
        />

        <AssessmentFormModal
          isOpen={assessmentOpen}
          onClose={() => setAssessmentOpen(false)}
          onComplete={handleAssessmentComplete}
          job={selectedJob ? {
            recordId: selectedJob.recordId,
            jobId: selectedJob.jobId,
            jobTitle: selectedJob.jobTitle,
            companyName: selectedJob.companyName,
            assessmentQuestions: selectedJob.assessmentQuestions || [],
          } : null}
        />
      </div>
    </>
  );
}
