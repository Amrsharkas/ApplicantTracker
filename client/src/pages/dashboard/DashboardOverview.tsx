import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  User,
  Target,
  FileText,
  Calendar,
  Briefcase,
  Brain,
  Mic,
  Video,
  Upload,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Clock,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Import modals that will remain as modals
import { InvitedJobsModal } from "@/components/JobSeekerModals/InvitedJobsModal";

export default function DashboardOverview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: comprehensiveProfile, refetch: refetchComprehensiveProfile } = useQuery({
    queryKey: ["/api/comprehensive-profile"],
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["/api/job-matches"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
    enabled: !!user,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["/api/applications"],
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  const { data: upcomingInterviews = [] } = useQuery({
    queryKey: ["/api/upcoming-interviews"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
    enabled: !!user,
  });

  const { data: invitedJobsCount } = useQuery({
    queryKey: ["/api/invited-jobs/count"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
    enabled: !!user,
  });

  const { data: resumeProfileStatus } = useQuery({
    queryKey: ["/api/resume-profile/exists"],
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  // Profile completion logic
  const profileProgress = (comprehensiveProfile as any)?.completionPercentage || 0;
  const hasResumeProfile = !!(resumeProfileStatus as any)?.hasResumeProfile;
  const hasCompleteProfile = profileProgress >= 75 || hasResumeProfile;
  // Interview step removed - show full dashboard when profile is complete
  const showFullDashboard = hasCompleteProfile;
  const invitedJobsTotal = invitedJobsCount ? (invitedJobsCount as any).count : 0;

  // End all interview sessions on load
  useEffect(() => {
    const endAllSessions = async () => {
      try {
        await fetch('/api/interview/end-all-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
      } catch (error) {
        console.error('Error ending all sessions:', error);
      }
    };
    if (user) endAllSessions();
  }, [user]);

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('text')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or text file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const response = await fetch('/api/resume/process-and-populate', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
      const result = await response.json();
      const sectionsCount = Object.keys(result.extractedFields || {}).filter(key => result.extractedFields[key]).length;
      toast({
        title: "Resume processed successfully",
        description: `Successfully processed ${sectionsCount} sections from your resume.`,
      });
      refetchProfile();
      refetchComprehensiveProfile();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process resume",
        variant: "destructive",
      });
    } finally {
      setIsUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    refetchProfile();
    refetchComprehensiveProfile();
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          {t('welcome')}{(user as any)?.firstName ? `, ${(user as any).firstName}` : ""}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          {showFullDashboard
            ? "Here's an overview of your career journey"
            : t('dashboard.completeSteps')}
        </p>
      </motion.div>

      {/* Invited Jobs Alert - Enhanced */}
      <AnimatePresence>
        {(showFullDashboard || hasResumeProfile) && invitedJobsTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card className="relative overflow-hidden bg-linear-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 border-purple-200/60 dark:border-purple-700/60 shadow-lg">
              <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5" />
              <motion.div
                className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <CardContent className="p-6 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="p-3 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Video className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-1">
                      {invitedJobsTotal} job{invitedJobsTotal > 1 ? 's' : ''} waiting for your interview
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Complete interviews to boost your chances and stand out
                    </p>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
                    onClick={() => navigate('/dashboard/job-interviews')}
                  >
                    View Jobs
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Onboarding Section with Stepper */}
      {!showFullDashboard && !hasResumeProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden bg-linear-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-slate-200/60 dark:border-slate-700/60 shadow-xl">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-linear-to-br from-blue-500 to-purple-500">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-slate-800 dark:text-slate-200">
                    Getting Started
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Complete these steps to unlock all features
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              {/* Vertical Stepper Line */}
              <div className="absolute left-[52px] top-0 bottom-0 w-0.5 bg-linear-to-b from-blue-200 via-purple-200 to-transparent dark:from-blue-800 dark:via-purple-800" />

              {/* Step 1: Build Profile */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "relative p-5 rounded-2xl border-2 transition-all duration-300",
                  hasCompleteProfile
                    ? "border-emerald-300 bg-linear-to-br from-emerald-50 to-green-50 dark:border-emerald-700 dark:from-emerald-900/30 dark:to-green-900/20 shadow-lg shadow-emerald-500/10"
                    : "border-blue-300 bg-linear-to-br from-blue-50 to-indigo-50 dark:border-blue-700 dark:from-blue-900/30 dark:to-indigo-900/20 shadow-lg shadow-blue-500/10"
                )}
              >
                <div className="flex items-start gap-5">
                  <motion.div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-lg",
                      hasCompleteProfile
                        ? "bg-linear-to-br from-emerald-500 to-green-600"
                        : "bg-linear-to-br from-blue-500 to-indigo-600"
                    )}
                    animate={
                      hasCompleteProfile
                        ? { scale: [1, 1.05, 1] }
                        : {}
                    }
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {hasCompleteProfile ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                        {t('buildProfile')}
                      </h3>
                      {hasCompleteProfile && (
                        <Badge className="bg-emerald-500 text-white border-0">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-3">
                      {hasCompleteProfile
                        ? t('interviewsUnlocked')
                        : t('profileDescription')}
                    </p>
                    {!hasCompleteProfile && (
                      <>
                        <div className="mb-4 p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xs">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              Profile Completion
                            </span>
                            <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                              {profileProgress}%
                            </span>
                          </div>
                          <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              className="absolute inset-y-0 left-0 bg-linear-to-r from-blue-500 to-indigo-600 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${profileProgress}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Link href="/dashboard/profile">
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
                                <User className="w-4 h-4 mr-2" />
                                Complete Profile
                              </Button>
                            </motion.div>
                          </Link>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.txt"
                            onChange={handleResumeUpload}
                            className="hidden"
                          />
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="outline"
                              className="border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingResume}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {isUploadingResume ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                "Upload CV"
                              )}
                            </Button>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      {showFullDashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: "/dashboard/profile",
              title: "Profile Completion",
              value: `${profileProgress}%`,
              icon: User,
              color: "bg-linear-to-br from-blue-500 to-blue-600",
            },
            {
              href: "/dashboard/applications",
              title: "Applications",
              value: (applications as any[]).length,
              icon: FileText,
              color: "bg-linear-to-br from-purple-500 to-purple-600",
            },
            {
              href: "/dashboard/matches",
              title: "Job Matches",
              value: (matches as any[]).length,
              icon: Target,
              color: "bg-linear-to-br from-emerald-500 to-emerald-600",
            },
            {
              href: "/dashboard/interviews",
              title: "Scheduled Interviews",
              value: (upcomingInterviews as any[]).length,
              icon: Calendar,
              color: "bg-linear-to-br from-amber-500 to-amber-600",
            },
          ].map((stat) => (
            <motion.div
              key={stat.title}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={stat.href}>
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{stat.title}</p>
                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <div className={cn("p-3 rounded-xl", stat.color)}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {showFullDashboard && (
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Job Matches",
                description: "AI-curated opportunities for you",
                icon: Target,
                gradient: "bg-linear-to-r from-blue-500 to-blue-600",
                to: "/dashboard/matches",
              },
              {
                title: "Browse Jobs",
                description: "Explore all available positions",
                icon: Briefcase,
                gradient: "bg-linear-to-r from-emerald-500 to-emerald-600",
                to: "/dashboard/jobs",
              },
              {
                title: "Career Insights",
                description: "AI-powered career guidance",
                icon: Brain,
                gradient: "bg-linear-to-r from-purple-500 to-purple-600",
                to: "/dashboard/career",
              },
              {
                title: "Practice Interview",
                description: "Prepare for your next interview",
                icon: Mic,
                gradient: "bg-linear-to-r from-amber-500 to-amber-600",
                to: "/dashboard/practice",
              },
            ].map((action) => (
              <motion.div
                key={action.title}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href={action.to}>
                  <Card className={cn(action.gradient, "border-0 hover:shadow-xl transition-all duration-200 cursor-pointer")}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-xs">
                            <action.icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{action.title}</h3>
                            <p className="text-sm text-white/80">{action.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/60" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Interviews */}
      {showFullDashboard && (upcomingInterviews as any[]).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
              Upcoming Interviews
            </h2>
            <Link href="/dashboard/interviews">
              <Button variant="outline" size="sm" className="border-slate-300 dark:border-slate-600">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-6">
              <div className="space-y-4">
                {(upcomingInterviews as any[]).slice(0, 3).map((interview, index) => (
                  <div
                    key={interview.id || index}
                    className="relative"
                  >
                    {/* Timeline connector */}
                    {index < (upcomingInterviews as any[]).slice(0, 3).length - 1 && (
                      <div className="absolute left-[18px] top-12 bottom-[-16px] w-0.5 bg-slate-200 dark:bg-slate-700" />
                    )}

                    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 hover:shadow-md transition-all duration-200">
                      {/* Timeline dot */}
                      <div className="relative shrink-0">
                        <div className="p-3 rounded-xl bg-linear-to-br from-amber-500 to-amber-600">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      {/* Interview details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-1">
                              {interview.jobTitle || 'Interview'}
                            </h3>
                            {interview.companyName && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                {interview.companyName}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-amber-500 text-white border-0 shrink-0">
                            Scheduled
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              {interview.scheduledDate
                                ? new Date(interview.scheduledDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                                : 'Date TBD'}
                            </span>
                          </div>
                          {interview.location && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              <MapPin className="w-4 h-4" />
                              <span>{interview.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      <InvitedJobsModal
        isOpen={activeModal === 'invitedJobs'}
        onClose={closeModal}
        onStartJobPractice={async () => { }}
        onStartJobPracticeVoice={async () => { }}
      />
    </div>
  );
}
