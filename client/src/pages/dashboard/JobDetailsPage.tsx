import { useState, useEffect } from "react";
import { useLocation, useParams, useRoute } from "wouter";
import ReactMarkdown from 'react-markdown';
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EmployerQuestionsModal } from "@/components/JobSeekerModals/EmployerQuestionsModal";
import {
  ArrowLeft,
  MapPin,
  Building,
  DollarSign,
  Clock,
  Users,
  Briefcase,
  Star,
  Zap,
  Calendar,
  Loader2,
  CheckCircle,
  Globe,
  Award
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface JobPosting {
  recordId: string;
  id: number;
  title: string;
  description: string;
  requirements: string;
  location?: string;
  salaryRange?: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType: string;
  workplaceType: string;
  seniorityLevel: string;
  industry: string;
  experienceLevel?: string;
  skills?: string[];
  postedAt?: string;
  employerQuestions?: string[];
  aiPrompt?: string;
  companyName: string;
}

const AI_LOADING_MESSAGE_KEYS = [
  "jobPostingsModal.aiAssistantMessages.msg1",
  "jobPostingsModal.aiAssistantMessages.msg2",
  "jobPostingsModal.aiAssistantMessages.msg3",
  "jobPostingsModal.aiAssistantMessages.msg4",
  "jobPostingsModal.aiAssistantMessages.msg5",
  "jobPostingsModal.aiAssistantMessages.msg6",
  "jobPostingsModal.aiAssistantMessages.msg7",
  "jobPostingsModal.aiAssistantMessages.msg8",
  "jobPostingsModal.aiAssistantMessages.msg9",
] as const;

export default function JobDetailsPage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const params = useParams();
  const jobId = params?.jobId;
  const { toast } = useToast();

  const [showAILoadingModal, setShowAILoadingModal] = useState(false);
  const [aiLoadingResult, setAiLoadingResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [showEmployerQuestions, setShowEmployerQuestions] = useState(false);
  const [pendingApplication, setPendingApplication] = useState<JobPosting | null>(null);

  // Fetch job details
  const { data: job, isLoading, error } = useQuery<JobPosting>({
    queryKey: ["/api/job-postings", jobId],
    queryFn: async () => {
      const jobs = await apiRequest("/api/job-postings", { method: "GET" });
      const foundJob = jobs.find((j: JobPosting) =>
        String(j.id) === String(jobId) || j.recordId === jobId
      );
      if (!foundJob) throw new Error("Job not found");
      return foundJob;
    },
    enabled: !!jobId,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
  });

  // Application mutation
  const newApplicationMutation = useMutation({
    mutationFn: async (data: { job: JobPosting }) => {
      setShowAILoadingModal(true);
      const response = await apiRequest("/api/job-applications/submit", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      setAiLoadingResult({
        type: 'success',
        message: t("jobPostingsModal.aiResultMessages.success")
      });
      toast({
        title: t("jobPostingsModal.toasts.applicationSuccessTitle"),
        description: t("jobPostingsModal.toasts.applicationSuccessDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: (error: Error) => {
      if (error.message.includes('already applied')) {
        setAiLoadingResult({
          type: 'success',
          message: t("jobPostingsModal.aiResultMessages.alreadyApplied")
        });
        toast({
          title: t("jobPostingsModal.toasts.alreadyAppliedTitle"),
          description: t("jobPostingsModal.toasts.alreadyAppliedDescription"),
        });
        return;
      }

      if (isUnauthorizedError(error)) {
        setAiLoadingResult({
          type: 'error',
          message: t("jobPostingsModal.aiResultMessages.error").replace("{{message}}", error.message)
        });
        toast({
          title: t("jobPostingsModal.toasts.unauthorizedTitle"),
          description: t("jobPostingsModal.toasts.unauthorizedDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      setAiLoadingResult({
        type: 'error',
        message: t("jobPostingsModal.aiResultMessages.error").replace("{{message}}", error.message)
      });
      toast({
        title: t("jobPostingsModal.toasts.applicationFailedTitle"),
        description: t("jobPostingsModal.toasts.applicationFailedDescription").replace("{{message}}", error.message),
        variant: "destructive",
      });
    },
  });

  // AI Match Score calculation
  const calculateAIMatchScore = (job: JobPosting): number => {
    if (!userProfile?.aiProfile) return 50;

    let score = 0;
    const profile = userProfile.aiProfile;

    if (job.skills && profile.skills && job.skills.length > 0) {
      const matchingSkills = job.skills.filter(skill =>
        profile.skills.some((userSkill: string) =>
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      score += (matchingSkills.length / job.skills.length) * 40;
    } else {
      score += 25;
    }

    if (job.experienceLevel && profile.experience) {
      const experienceYears = Array.isArray(profile.experience) ? profile.experience.length : 0;
      const jobLevel = job.experienceLevel.toLowerCase();
      if (
        (jobLevel.includes('entry') && experienceYears <= 2) ||
        (jobLevel.includes('junior') && experienceYears <= 3) ||
        (jobLevel.includes('mid') && experienceYears >= 2 && experienceYears <= 5) ||
        (jobLevel.includes('senior') && experienceYears >= 5)
      ) {
        score += 30;
      }
    } else {
      score += 15;
    }

    if (job.location && profile.workStyle) {
      const workStyleStr = typeof profile.workStyle === 'string' ? profile.workStyle : String(profile.workStyle);
      if (workStyleStr.toLowerCase().includes('remote') && job.employmentType?.toLowerCase().includes('remote')) {
        score += 20;
      } else if (workStyleStr.toLowerCase().includes('office') && job.employmentType?.toLowerCase().includes('office')) {
        score += 20;
      }
    } else {
      score += 10;
    }

    if (job.description && profile.careerGoals) {
      const descriptionLower = job.description.toLowerCase();
      const goalsLower = profile.careerGoals.toLowerCase();
      if (descriptionLower.includes(goalsLower.split(' ')[0]) ||
        goalsLower.includes(job.title.toLowerCase().split(' ')[0])) {
        score += 10;
      }
    }

    const finalScore = Math.min(Math.round(score), 100);
    return isNaN(finalScore) ? 50 : finalScore;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return t("jobPostingsModal.labels.recentlyPosted");
    }
  };

  const getRandomAiAssistantMessage = () => {
    const messages = AI_LOADING_MESSAGE_KEYS.map((key) => t(key));
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 60) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
  };

  const proceedWithApplication = (job: JobPosting) => {
    if (job.employerQuestions && job.employerQuestions.length > 0) {
      setPendingApplication(job);
      setShowEmployerQuestions(true);
    } else {
      submitApplication(job, []);
    }
  };

  const handleEmployerQuestionsSubmit = (answers: string[]) => {
    if (pendingApplication) {
      setShowEmployerQuestions(false);
      submitApplication(pendingApplication, answers);
    }
  };

  const submitApplication = (job: JobPosting, answers: string[]) => {
    const notesWithAnswers = answers.length > 0
      ? `Employer Questions Responses:\n${answers.map((answer, index) => `Q${index + 1}: ${answer}`).join('\n\n')}`
      : '';

    newApplicationMutation.mutate({
      job: {
        ...job,
        notes: notesWithAnswers
      } as any
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard/jobs")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Button>
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Job Not Found
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              This job posting may have been removed or is no longer available.
            </p>
            <Button onClick={() => setLocation("/dashboard/jobs")}>
              Browse All Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const matchScore = calculateAIMatchScore(job);
  const daysSincePosted = job.postedAt
    ? Math.floor((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setLocation("/dashboard/jobs")}
        className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Button>

      {/* Job Header Card */}
      <Card className="overflow-hidden bg-linear-to-r from-blue-500 to-blue-600 border-0">
        <CardContent className="p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-6 flex-1">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-xs rounded-2xl flex items-center justify-center shrink-0">
                <Building className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  {daysSincePosted !== null && daysSincePosted <= 1 && (
                    <Badge variant="destructive" className="bg-red-500 border-0">
                      {t("jobPostingsModal.badges.urgent")}
                    </Badge>
                  )}
                  {daysSincePosted !== null && daysSincePosted <= 3 && daysSincePosted > 1 && (
                    <Badge className="bg-white/20 border-0 text-white">
                      {t("jobPostingsModal.badges.new")}
                    </Badge>
                  )}
                  {matchScore >= 60 && (
                    <Badge className={getScoreColor(matchScore)}>
                      <Star className="w-3 h-3 mr-1" />
                      {matchScore}% Match
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
                <p className="text-xl text-white/90 mb-4">{job.companyName}</p>
                <div className="flex flex-wrap items-center gap-4 text-white/80">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {job.location || "Remote"}
                  </span>
                  {job.salaryRange && (
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {job.salaryRange}
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Posted {formatDate(job.postedAt || new Date().toISOString())}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                onClick={() => proceedWithApplication(job)}
                disabled={newApplicationMutation.isPending}
                className="bg-white text-blue-600 hover:bg-white/90 font-semibold shadow-lg"
              >
                {newApplicationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Apply Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Job Description
              </h2>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown>{job.description}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          {job.requirements && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Requirements
                </h2>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown>{job.requirements}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Job Details Card */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Job Details</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Employment Type</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {job.employmentType || "Full-time"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Experience Level</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {job.experienceLevel || job.seniorityLevel || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Workplace Type</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {job.workplaceType || "On-site"}
                    </p>
                  </div>
                </div>

                {job.industry && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Building className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Industry</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {job.industry}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Match Score Card */}
          {matchScore >= 50 && (
            <Card className="bg-linear-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200/60 dark:border-emerald-700/60">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  {matchScore}% Match
                </h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-500">
                  Based on your profile and skills
                </p>
              </CardContent>
            </Card>
          )}

          {/* Apply CTA */}
          <Card className="bg-slate-900 dark:bg-slate-800 border-0">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">
                Ready to apply?
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Submit your application and let the AI match you with the employer.
              </p>
              <Button
                className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                onClick={() => proceedWithApplication(job)}
                disabled={newApplicationMutation.isPending}
              >
                {newApplicationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Apply Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Loading Modal */}
      <AnimatePresence>
        {showAILoadingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-60"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
            >
              {aiLoadingResult.type === null ? (
                <div className="space-y-6">
                  <div className="w-20 h-20 mx-auto bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-4xl">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {t("jobPostingsModal.aiAssistant.title")}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {t("jobPostingsModal.aiAssistant.analyzing")}
                    </p>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="h-full w-1/2 bg-linear-to-r from-blue-500 to-blue-600"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    {getRandomAiAssistantMessage()}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-6xl">
                    {aiLoadingResult.type === 'success' ? '✅' : '❌'}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold mb-2 ${aiLoadingResult.type === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                      }`}>
                      {aiLoadingResult.type === 'success'
                        ? t("jobPostingsModal.aiAssistant.successTitle")
                        : t("jobPostingsModal.aiAssistant.errorTitle")}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {aiLoadingResult.message}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setShowAILoadingModal(false);
                      setAiLoadingResult({ type: null, message: '' });
                      if (aiLoadingResult.type === 'success') {
                        setLocation("/dashboard/applications");
                      }
                    }}
                    className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    {aiLoadingResult.type === 'success' ? 'View Applications' : t("close")}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employer Questions Modal */}
      <EmployerQuestionsModal
        isOpen={showEmployerQuestions}
        onClose={() => {
          setShowEmployerQuestions(false);
          setPendingApplication(null);
        }}
        onSubmit={handleEmployerQuestionsSubmit}
        jobTitle={pendingApplication?.title || ''}
        companyName={pendingApplication?.companyName || ''}
        jobId={pendingApplication?.recordId || ''}
      />
    </div>
  );
}
