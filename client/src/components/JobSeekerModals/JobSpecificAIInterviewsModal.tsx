import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from 'react-markdown';
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building, ExternalLink, MapPin, RefreshCw, Star, X, ArrowLeft, Play } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

interface InvitedJob {
  recordId: string;
  jobTitle: string;
  jobDescription?: string;
  companyName: string;
  location?: string;
  skills?: string[];
  status?: string;
  score?: number;
  interviewComments?: string;
  aiPrompt?: string;
}

interface JobSpecificAIInterviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartJobPractice?: (job: InvitedJob) => void;
  onStartJobPracticeVoice?: (job: InvitedJob) => void;
  onInterviewComplete?: () => void;
}

import { JobSpecificInterviewOptionsModal } from "./JobSpecificInterviewOptionsModal";
import { JobSpecificInterviewModal } from "./JobSpecificInterviewModal";

export function JobSpecificAIInterviewsModal({ isOpen, onClose, onStartJobPractice, onStartJobPracticeVoice, onInterviewComplete }: JobSpecificAIInterviewsModalProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<InvitedJob | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewMode, setInterviewMode] = useState<'text' | 'voice'>('text');
  const [interviewLanguage, setInterviewLanguage] = useState<'english' | 'arabic'>('english');

  const [activeTab, setActiveTab] = useState<'invited' | 'completed'>('invited');

  const { data: items = [], refetch, isLoading, error } = useQuery({
    queryKey: ["/api/job-specific-ai-interviews", activeTab],
    queryFn: async () => apiRequest(`/api/job-specific-ai-interviews?status=${activeTab}`),
    enabled: isOpen,
    onError: (err: Error) => {
      if (isUnauthorizedError(err)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
      } else {
        toast({ title: "Error", description: err.message || "Failed to load invitations" , variant: "destructive" });
      }
    }
  });

  useEffect(() => {
    if (!isOpen) {
      setSelectedJob(null);
      setSearchQuery("");
    }
  }, [isOpen]);

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Recently posted";
    try { return new Date(dateString).toLocaleDateString(); } catch { return "Recently posted"; }
  };

  const handleClose = () => {
    setSelectedJob(null);
    onClose();
  };

  const handleInterviewComplete = async () => {
    // Refresh the interview data
    await refetch();
    // Call the parent callback if provided
    onInterviewComplete?.();
    // Switch to completed tab to show the finished interview
    setActiveTab('completed');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`${
        interviewOpen
          ? 'w-screen h-screen max-w-none max-h-none p-0'
          : 'max-w-6xl max-h-[95vh] overflow-hidden p-0'
      }`}>
        {/* Only show header when not in interview mode */}
        {!interviewOpen ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  Job specific AI interviews ({invitedJobs.length})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1"
                    title="Refresh invitations"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="hover:bg-gray-100"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="px-4 pt-4">
            <TabsList>
              <TabsTrigger value="invited">Pending interviews</TabsTrigger>
              <TabsTrigger value="completed">Finished interviews</TabsTrigger>
            </TabsList>
          </div>

          {/* Search Bar (per tab) */}
          <div className="p-4 border-b bg-white flex-shrink-0">
            <div className="relative">
              <Input
                placeholder="Search by title, company, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-3"
              />
            </div>
          </div>

          {/* List Area */}
          <TabsContent value="invited" className="flex-1 overflow-y-auto p-4 min-h-0 m-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">Failed to load invitations</div>
          ) : invitedJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No job-specific interviews yet.</div>
          ) : (
            <div className="space-y-4">
              {invitedJobs.map((job) => (
                <motion.div key={job.recordId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-blue-600 text-lg hover:text-blue-800 cursor-pointer">
                              {job.jobTitle}
                            </h3>
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-800">
                              <Badge variant="secondary" className="text-xs">Invited</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2 text-gray-600">
                            <span className="text-gray-900 font-medium">{job.companyName}</span>
                            <span className="text-gray-500">•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location || 'Remote'}
                            </span>
                          </div>
                          <div className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3 prose prose-sm max-w-none">
                            <ReactMarkdown>{job.jobDescription || ''}</ReactMarkdown>
                          </div>
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
                              onClick={() => { setSelectedJob(job); setOptionsOpen(true); }}
                              className="flex items-center gap-1"
                            >
                              <Play className="h-3 w-3" />
                              Start interview
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
              ))}
            </div>
          )}
          </TabsContent>

          <TabsContent value="completed" className="flex-1 overflow-y-auto p-4 min-h-0 m-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">Failed to load finished interviews</div>
            ) : invitedJobs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No finished interviews yet.</div>
            ) : (
              <div className="space-y-4">
                {invitedJobs.map((job) => (
                  <motion.div key={job.recordId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="hover:shadow-lg transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-blue-600 text-lg">{job.jobTitle}</h3>
                              <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800">
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Completed</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2 text-gray-600">
                              <span className="text-gray-900 font-medium">{job.companyName}</span>
                              <span className="text-gray-500">•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.location || 'Remote'}
                              </span>
                            </div>
                            <div className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3 prose prose-sm max-w-none">
                              <ReactMarkdown>{job.jobDescription || ''}</ReactMarkdown>
                            </div>

                            {/* Interview Results Section */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">Interview Results</h4>
                              {typeof job.score === 'number' && (
                                <div className="mb-2 text-sm">
                                  <span className="font-medium">Score:</span>
                                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                    job.score >= 80 ? 'bg-green-100 text-green-800' :
                                    job.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {job.score}/100
                                  </span>
                                </div>
                              )}
                              {job.interviewComments && (
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                  <span className="font-medium">Feedback:</span> {job.interviewComments}
                                </div>
                              )}
                            </div>

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
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
            </>
          ) : (
            /* Interview mode - show full screen interview for both text and voice */
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
          )}

        {/* Details Drawer - only show when not in interview */}
        {!interviewOpen ? (
          <AnimatePresence>
            {selectedJob && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-30 flex z-40"
            >
              <div className="flex-1" onClick={(e) => { e.stopPropagation(); setSelectedJob(null); }} />

              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-2/3 max-w-3xl bg-white shadow-2xl flex flex-col"
              >
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedJob.jobTitle}</h2>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                          selectedJob.status === 'completed'
                            ? 'bg-green-100'
                            : 'bg-blue-100'
                        }`}>
                          <Star className={`h-4 w-4 ${
                            selectedJob.status === 'completed'
                              ? 'text-green-600'
                              : 'text-blue-600'
                          }`} />
                          <span className={`text-sm font-medium ${
                            selectedJob.status === 'completed'
                              ? 'text-green-800'
                              : 'text-blue-800'
                          }`}>
                            {selectedJob.status === 'completed' ? 'Completed' : 'Invited'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{selectedJob.companyName}</span>
                        <span>•</span>
                        <MapPin className="h-4 w-4" />
                        <span>{selectedJob.location || 'Remote'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedJob(null); }}
                        className="hover:bg-gray-100"
                        title="Back to list"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleClose(); }}
                        className="hover:bg-gray-100"
                        title="Close"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                        <ReactMarkdown>{selectedJob.jobDescription || ''}</ReactMarkdown>
                      </div>
                    </div>
                    {selectedJob.skills && selectedJob.skills.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills.map((s) => (
                            <Badge key={s} variant="outline" className="text-sm">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="h-20"></div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 shadow-lg">
                  <div className="flex items-center justify-end gap-3 rtl:space-x-reverse">
                    <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
                    {selectedJob.status === 'completed' ? (
                      <div className="flex items-center gap-4">
                        {typeof selectedJob.score === 'number' && (
                          <div className="text-sm">
                            <span className="font-medium">Interview Score:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              selectedJob.score >= 80 ? 'bg-green-100 text-green-800' :
                              selectedJob.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {selectedJob.score}/100
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => { setOptionsOpen(true); }}
                        className="flex items-center gap-2 px-6"
                      >
                        <Play className="h-4 w-4" />
                        Start interview
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
          </AnimatePresence>
        ) : null}

        <JobSpecificInterviewOptionsModal
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          job={selectedJob}
          onConfirm={async ({ mode, language }) => {
            try {
              const endpoint = mode === 'voice' ? '/api/interview/start-job-practice-voice' : '/api/interview/start-job-practice';
              const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ job: selectedJob, language })
              });
              if (!res.ok) throw new Error('Failed to start');
              // leave options open until interview modal opens
              // Let parent open interview modal if handlers were passed
              if (mode === 'voice') {
                setInterviewMode('voice');
              } else {
                setInterviewMode('text');
              }
              setInterviewLanguage(language);
              setInterviewOpen(true);
              setOptionsOpen(false);
            } catch (e: any) {
              // Simple toast; reuse parent toast
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
