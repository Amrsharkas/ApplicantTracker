import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Target,
  MapPin,
  DollarSign,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Briefcase,
  TrendingUp,
  Award,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function MatchesPage() {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: matches = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/job-matches/rag"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-slate-600 dark:text-slate-400";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-100 dark:bg-emerald-900/40";
    if (score >= 60) return "bg-blue-100 dark:bg-blue-900/40";
    if (score >= 40) return "bg-amber-100 dark:bg-amber-900/40";
    return "bg-slate-100 dark:bg-slate-800";
  };

  const getMatchStrength = (score: number) => {
    if (score >= 80) return { label: "Excellent Match", icon: Award };
    if (score >= 60) return { label: "Great Match", icon: TrendingUp };
    if (score >= 40) return { label: "Good Match", icon: CheckCircle2 };
    return { label: "Potential Match", icon: Target };
  };

  const getGradientByScore = (score: number) => {
    if (score >= 80) return "from-emerald-500/20 via-transparent to-transparent";
    if (score >= 60) return "from-blue-500/20 via-transparent to-transparent";
    if (score >= 40) return "from-amber-500/20 via-transparent to-transparent";
    return "from-slate-500/10 via-transparent to-transparent";
  };

  const getCardElevation = (score: number) => {
    if (score >= 80) return "shadow-lg shadow-emerald-500/10";
    if (score >= 60) return "shadow-md shadow-blue-500/10";
    return "shadow-sm";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-600";
    if (score >= 60) return "[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-blue-600";
    if (score >= 40) return "[&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-amber-600";
    return "[&>div]:bg-slate-400";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Job Matches
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            AI-curated job opportunities matched to your profile
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Matches
        </Button>
      </div>

      {/* AI Matching Info - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border-blue-200/60 dark:border-blue-700/60">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
          <CardContent className="relative p-6">
            <div className="flex items-start gap-4">
              <motion.div
                className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                    AI-Powered Matching
                  </h3>
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                    <Zap className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Our advanced AI analyzes your skills, experience, and preferences to find the perfect job matches.
                  Each match is scored based on multiple compatibility factors.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Skills Match</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Experience Level</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Location & Salary</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Matches List */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-12 text-center"
        >
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Finding your best matches...</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Analyzing opportunities</p>
        </motion.div>
      ) : (matches as any[]).length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -mr-32 -mt-32"></div>
            <CardContent className="relative p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 flex items-center justify-center">
                  <Target className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
              </motion.div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                No Matches Yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-1">
                We're ready to find your perfect opportunities
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
                Complete your profile to unlock personalized AI-powered job matches
              </p>
              <Link href="/dashboard/profile">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Complete Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {(matches as any[]).map((match, index) => {
            const matchScore = match.matchScore || 0;
            const matchStrength = getMatchStrength(matchScore);
            const MatchIcon = matchStrength.icon;

            return (
              <motion.div
                key={match.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
                whileHover={{ y: -4 }}
              >
                <Card className={cn(
                  "relative overflow-hidden bg-white dark:bg-slate-800 backdrop-blur-sm border-slate-200 dark:border-slate-700 transition-all duration-300",
                  getCardElevation(matchScore),
                  "hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-600"
                )}>
                  {/* Gradient Accent */}
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                    getGradientByScore(matchScore).replace("via-transparent to-transparent", "to-transparent")
                  )} />

                  <div className={cn(
                    "absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl opacity-30 pointer-events-none",
                    getGradientByScore(matchScore)
                  )} />

                  <CardContent className="relative p-0">
                    {/* Main Content */}
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        <div className="flex-1 min-w-0 space-y-4">
                          {/* Header with Logo Placeholder */}
                          <div className="flex items-start gap-4">
                            {/* Company Logo Placeholder */}
                            <motion.div
                              className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center shadow-sm"
                              whileHover={{ scale: 1.05 }}
                            >
                              <Building2 className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                            </motion.div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-1 leading-tight">
                                {match.jobTitle || "Job Position"}
                              </h3>
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <span className="font-medium">{match.companyName || "Company"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Location & Salary */}
                          <div className="flex flex-wrap gap-4">
                            {match.location && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg">
                                <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-500" />
                                <span className="font-medium">{match.location}</span>
                              </div>
                            )}
                            {match.salary && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg">
                                <DollarSign className="w-4 h-4 text-slate-500 dark:text-slate-500" />
                                <span className="font-medium">{match.salary}</span>
                              </div>
                            )}
                          </div>

                          {/* Skills Tags - Enhanced */}
                          {match.skills && match.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {match.skills.slice(0, 6).map((skill: string, i: number) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: index * 0.05 + i * 0.02 }}
                                >
                                  <Badge
                                    variant="secondary"
                                    className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 font-medium px-3 py-1"
                                  >
                                    {skill}
                                  </Badge>
                                </motion.div>
                              ))}
                              {match.skills.length > 6 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 font-medium px-3 py-1"
                                >
                                  +{match.skills.length - 6} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Match Score - Circular Progress */}
                        <div className="flex flex-col items-center gap-3 lg:min-w-[140px]">
                          {/* Circular Progress */}
                          <div className="relative w-28 h-28">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                              {/* Background circle */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-slate-200 dark:text-slate-700"
                              />
                              {/* Progress circle */}
                              <motion.circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="url(#gradient-{index})"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - matchScore / 100) }}
                                transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                              />
                              <defs>
                                <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor={matchScore >= 80 ? "#10b981" : matchScore >= 60 ? "#3b82f6" : matchScore >= 40 ? "#f59e0b" : "#64748b"} />
                                  <stop offset="100%" stopColor={matchScore >= 80 ? "#059669" : matchScore >= 60 ? "#2563eb" : matchScore >= 40 ? "#d97706" : "#475569"} />
                                </linearGradient>
                              </defs>
                            </svg>
                            {/* Score in center */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={cn("text-3xl font-bold", getMatchScoreColor(matchScore))}>
                                {matchScore}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">MATCH</span>
                            </div>
                          </div>

                          {/* Match Strength Badge */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.3 }}
                          >
                            <Badge className={cn(
                              "px-3 py-1.5 text-xs font-semibold shadow-sm",
                              matchScore >= 80 && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                              matchScore >= 60 && matchScore < 80 && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                              matchScore >= 40 && matchScore < 60 && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                              matchScore < 40 && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            )}>
                              <MatchIcon className="w-3 h-3 mr-1 inline-block" />
                              {matchStrength.label}
                            </Badge>
                          </motion.div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId(expandedId === match.id ? null : match.id)
                          }
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {expandedId === match.id ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Show Details
                            </>
                          )}
                        </Button>
                        <Link href={`/jobs/${match.jobId}`}>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25"
                          >
                            View Full Job
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedId === match.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-slate-200 dark:border-slate-700">
                            <div className="pt-5 space-y-5">
                              {/* Why This Match - Enhanced */}
                              {match.matchReason && (
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1 }}
                                  className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-5 border border-blue-100 dark:border-blue-900/50"
                                >
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                                      <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">
                                        Why This Match?
                                      </h4>
                                      <p className="text-sm text-slate-500 dark:text-slate-400">
                                        AI-generated match analysis
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed ml-14">
                                    {match.matchReason}
                                  </p>
                                </motion.div>
                              )}

                              {/* Job Description */}
                              {match.description && (
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700"
                                >
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700">
                                      <Briefcase className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                                      Job Description
                                    </h4>
                                  </div>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed ml-14 line-clamp-4">
                                    {match.description}
                                  </p>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
