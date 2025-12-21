import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

import { DataSourceSelector } from "@/components/JobSeekerModals/DataSourceSelector";
import { CareerInsightsUploader } from "@/components/JobSeekerModals/CareerInsightsUploader";
import { CareerInsightsHistory } from "@/components/JobSeekerModals/CareerInsightsHistory";

import {
  Brain,
  RefreshCw,
  AlertCircle,
  Star,
  TrendingUp,
  BarChart3,
  Lightbulb,
  ArrowLeft
} from "lucide-react";

interface SuggestionCard {
  icon: JSX.Element;
  title: string;
  description: string;
  color: string;
  bgGradient: string;
}

interface SuggestionsData {
  success: boolean;
  suggestions: {
    paragraphs: string[];
  };
  profileCompleteness?: number;
  generatedAt: string;
  analysisId?: number;
}

type ModalPhase = 'source-selection' | 'uploading' | 'analyzing' | 'results' | 'history';

export default function CareerPage() {
  const { t, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phase, setPhase] = useState<ModalPhase>('source-selection');
  const [selectedCard, setSelectedCard] = useState<SuggestionCard | null>(null);
  const [currentSuggestions, setCurrentSuggestions] = useState<SuggestionsData | null>(null);
  const [sourceType, setSourceType] = useState<'profile' | 'document' | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    filePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);

  // Fetch profile data to check if user has a profile
  const { data: profileData } = useQuery<{
    completionPercentage: number;
    name: string;
  }>({
    queryKey: ["/api/profile/completion"],
  });

  // Fetch history count
  const { data: historyData } = useQuery<{
    success: boolean;
    totalCount: number;
  }>({
    queryKey: ["/api/career-insights/history", { limit: 1 }],
  });

  // Profile-based suggestions query
  const {
    data: profileSuggestionsData,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = useQuery<SuggestionsData>({
    queryKey: ["/api/career-suggestions"],
    enabled: phase === 'analyzing' && sourceType === 'profile',
  });

  // Document analysis mutation
  const analyzeDocumentMutation = useMutation({
    mutationFn: async (fileInfo: typeof uploadedFileInfo) => {
      const response = await fetch('/api/career-insights/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...fileInfo,
          language: isRTL ? 'arabic' : 'english',
          saveToHistory: true
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze document');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSuggestions(data);
      setPhase('results');
    },
    onError: (error) => {
      toast({
        title: t('careerInsights.analysisFailed') || "Analysis failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      setPhase('uploading');
    }
  });

  // Fetch specific analysis from history
  const fetchHistoryAnalysis = async (analysisId: number) => {
    try {
      const response = await fetch(`/api/career-insights/history/${analysisId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analysis');
      const data = await response.json();
      setCurrentSuggestions({
        success: true,
        suggestions: data.analysis.suggestions,
        generatedAt: data.analysis.createdAt,
        analysisId: data.analysis.id
      });
      setSourceType(data.analysis.sourceType === 'profile' ? 'profile' : 'document');
      setPhase('results');
    } catch (error) {
      toast({
        title: t('careerInsights.loadFailed') || "Failed to load analysis",
        variant: "destructive"
      });
    }
  };

  // Handle profile selection
  const handleSelectProfile = () => {
    setSourceType('profile');
    setPhase('analyzing');
  };

  // Handle upload selection
  const handleSelectUpload = () => {
    setSourceType('document');
    setPhase('uploading');
  };

  // Handle upload complete
  const handleUploadComplete = (fileInfo: typeof uploadedFileInfo) => {
    setUploadedFileInfo(fileInfo);
    setPhase('analyzing');
    analyzeDocumentMutation.mutate(fileInfo);
  };

  // Update suggestions when profile data loads
  useEffect(() => {
    if (profileSuggestionsData && phase === 'analyzing' && sourceType === 'profile') {
      setCurrentSuggestions(profileSuggestionsData);
      setPhase('results');
    }
  }, [profileSuggestionsData, phase, sourceType]);

  const handleRefresh = async () => {
    if (sourceType === 'profile') {
      try {
        await refetchProfile();
        toast({
          title: t('careerSuggestions.refreshed') || "Career suggestions refreshed",
          description: t('careerSuggestions.refreshedDescription') || "Your career insights have been updated",
        });
      } catch (error) {
        toast({
          title: t('careerSuggestions.refreshFailed') || "Failed to refresh",
          description: t('careerSuggestions.refreshFailedDescription') || "Please try again later",
          variant: "destructive",
        });
      }
    }
  };

  const cardConfigs = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.overview') || "Career Overview",
      color: "text-blue-600 dark:text-blue-400",
      bgGradient: "from-blue-50 via-blue-100 to-cyan-50 dark:from-blue-950 dark:via-blue-900 dark:to-cyan-950",
      iconGradient: "from-blue-500 to-cyan-500",
      borderColor: "border-blue-200/50 dark:border-blue-800/50",
      hoverShadow: "hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50",
      glowColor: "blue"
    },
    {
      icon: <Star className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.skills') || "Skills Assessment",
      color: "text-emerald-600 dark:text-emerald-400",
      bgGradient: "from-emerald-50 via-green-100 to-teal-50 dark:from-emerald-950 dark:via-green-900 dark:to-teal-950",
      iconGradient: "from-emerald-500 to-teal-500",
      borderColor: "border-emerald-200/50 dark:border-emerald-800/50",
      hoverShadow: "hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/50",
      glowColor: "emerald"
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.opportunities') || "Career Opportunities",
      color: "text-purple-600 dark:text-purple-400",
      bgGradient: "from-purple-50 via-violet-100 to-fuchsia-50 dark:from-purple-950 dark:via-violet-900 dark:to-fuchsia-950",
      iconGradient: "from-purple-500 to-fuchsia-500",
      borderColor: "border-purple-200/50 dark:border-purple-800/50",
      hoverShadow: "hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50",
      glowColor: "purple"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.market') || "Market Insights",
      color: "text-orange-600 dark:text-orange-400",
      bgGradient: "from-orange-50 via-amber-100 to-yellow-50 dark:from-orange-950 dark:via-amber-900 dark:to-yellow-950",
      iconGradient: "from-orange-500 to-amber-500",
      borderColor: "border-orange-200/50 dark:border-orange-800/50",
      hoverShadow: "hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50",
      glowColor: "orange"
    },
    {
      icon: <Lightbulb className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.recommendations') || "Actionable Recommendations",
      color: "text-pink-600 dark:text-pink-400",
      bgGradient: "from-pink-50 via-rose-100 to-red-50 dark:from-pink-950 dark:via-rose-900 dark:to-red-950",
      iconGradient: "from-pink-500 to-rose-500",
      borderColor: "border-pink-200/50 dark:border-pink-800/50",
      hoverShadow: "hover:shadow-pink-200/50 dark:hover:shadow-pink-900/50",
      glowColor: "pink"
    }
  ];

  const getSuggestionCards = (): (SuggestionCard & { iconGradient?: string; borderColor?: string; hoverShadow?: string; glowColor?: string })[] => {
    if (!currentSuggestions?.suggestions?.paragraphs) return [];

    return currentSuggestions.suggestions.paragraphs.map((paragraph, index) => ({
      icon: cardConfigs[index]?.icon || <Brain className="h-8 w-8" />,
      title: cardConfigs[index]?.title || `Insight ${index + 1}`,
      description: paragraph,
      color: cardConfigs[index]?.color || "text-blue-600 dark:text-blue-400",
      bgGradient: cardConfigs[index]?.bgGradient || "from-blue-50 via-blue-100 to-cyan-50 dark:from-blue-950 dark:via-blue-900 dark:to-cyan-950",
      iconGradient: cardConfigs[index]?.iconGradient,
      borderColor: cardConfigs[index]?.borderColor,
      hoverShadow: cardConfigs[index]?.hoverShadow,
      glowColor: cardConfigs[index]?.glowColor
    }));
  };

  const isLoading = isLoadingProfile || analyzeDocumentMutation.isPending;
  const hasProfile = !!(profileData?.name || (profileData?.completionPercentage && profileData.completionPercentage > 10));

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Career Insights
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {t('careerSuggestions.subtitle') || "AI-powered career guidance and recommendations"}
            </p>
          </div>
        </div>
        {phase === 'results' && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPhase('source-selection')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('careerInsights.newAnalysis') || "New Analysis"}
            </Button>
            {sourceType === 'profile' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {t('careerSuggestions.refresh') || "Refresh"}
              </Button>
            )}
          </div>
        )}
      </div>

      {phase === 'results' && currentSuggestions && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('careerSuggestions.generatedAt') || "Generated"}: {new Date(currentSuggestions.generatedAt).toLocaleString()}
          {sourceType === 'profile' && currentSuggestions.profileCompleteness !== undefined && (
            <> | {t('careerSuggestions.profileCompleteness') || "Profile Completeness"}: {currentSuggestions.profileCompleteness}%</>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-200/60 dark:border-slate-700/60 rounded-lg shadow-xs overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Phase: Source Selection */}
          {phase === 'source-selection' && (
            <motion.div
              key="source-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <DataSourceSelector
                onSelectProfile={handleSelectProfile}
                onSelectUpload={handleSelectUpload}
                onViewHistory={() => setPhase('history')}
                hasProfile={hasProfile}
                profileCompleteness={profileData?.completionPercentage || 0}
                historyCount={historyData?.totalCount || 0}
              />
            </motion.div>
          )}

          {/* Phase: Uploading */}
          {phase === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <CareerInsightsUploader
                onUploadComplete={handleUploadComplete}
                onCancel={() => setPhase('source-selection')}
                isAnalyzing={false}
              />
            </motion.div>
          )}

          {/* Phase: Analyzing */}
          {phase === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-20"
            >
              {/* Simple spinner */}
              <div className="relative mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full"
                />
              </div>

              {/* Text content */}
              <div className="text-center max-w-md">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  {sourceType === 'profile'
                    ? (t('careerSuggestions.loading') || "Analyzing your profile...")
                    : (t('careerInsights.analyzingDocument') || "Analyzing your document...")}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {t('careerSuggestions.loadingSubtitle') || "Generating personalized career insights"}
                </p>
              </div>
            </motion.div>
          )}

          {/* Phase: History */}
          {phase === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <CareerInsightsHistory
                onSelectAnalysis={fetchHistoryAnalysis}
                onBack={() => setPhase('source-selection')}
              />
            </motion.div>
          )}

          {/* Phase: Results */}
          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
          <>
            {profileError && sourceType === 'profile' ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="bg-red-100 dark:bg-red-950 rounded-full p-4 mb-4">
                  <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
                </div>
                <p className="text-lg text-gray-800 dark:text-gray-200 font-medium mb-2">
                  {t('careerSuggestions.error') || "Failed to load career suggestions"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
                  {t('careerSuggestions.errorDescription') || "We couldn't generate your career insights. Please try again or contact support if the issue persists."}
                </p>
                <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('careerSuggestions.tryAgain') || "Try Again"}
                </Button>
              </div>
            ) : !currentSuggestions?.suggestions?.paragraphs?.length ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="bg-yellow-100 dark:bg-yellow-950 rounded-full p-4 mb-4">
                  <AlertCircle className="h-12 w-12 text-yellow-500 dark:text-yellow-400" />
                </div>
                <p className="text-lg text-gray-800 dark:text-gray-200 font-medium mb-2">
                  {t('careerSuggestions.insufficientData') || "No insights generated"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
                  {t('careerSuggestions.insufficientDataDescription') || "We couldn't extract enough information. Please try with a different document or complete your profile."}
                </p>
                <Button onClick={() => setPhase('source-selection')} variant="outline">
                  {t('careerInsights.tryAgain') || "Try Again"}
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="py-6 px-4"
              >
                {/* Card Grid - Clean Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getSuggestionCards().map((card, index) => {
                    const config = cardConfigs[index];
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className="cursor-pointer"
                        onClick={() => setSelectedCard(card)}
                      >
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-200/60 dark:border-slate-700/60 rounded-lg shadow-xs hover:shadow-lg transition-shadow duration-200 p-6 h-full"
                        >
                          <div className="flex flex-col items-center text-center gap-4">
                            {/* Icon with gradient */}
                            <div className={`p-3 rounded-lg bg-linear-to-r ${card.iconGradient || 'from-blue-500 to-blue-600'}`}>
                              <div className="text-white">
                                {card.icon}
                              </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                              {card.title}
                            </h3>

                            {/* Preview text */}
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                              {card.description.substring(0, 120)}...
                            </p>

                            {/* CTA */}
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {t('careerSuggestions.clickToView') || "View Details"} →
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Footer */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {t('careerSuggestions.generatedAt') || "Generated"}: {new Date(currentSuggestions.generatedAt).toLocaleString()}
                      </p>
                      {sourceType === 'profile' && currentSuggestions.profileCompleteness !== undefined && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {t('careerSuggestions.profileCompleteness') || "Profile Completeness"}: {currentSuggestions.profileCompleteness}%
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setPhase('source-selection')}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t('careerInsights.newAnalysis') || "New Analysis"}
                      </Button>
                    </div>
                  </div>
                  </motion.div>
                </motion.div>
              )}
            </>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Dialog - Clean Design */}
      <AnimatePresence>
        {selectedCard && (
          <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
            <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header */}
                <div className="flex items-start gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className={`p-3 rounded-lg bg-linear-to-r ${selectedCard.iconGradient || 'from-blue-500 to-blue-600'}`}>
                    <div className="text-white">
                      {selectedCard.icon}
                    </div>
                  </div>
                  <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex-1">
                    {selectedCard.title}
                  </DialogTitle>
                </div>

                {/* Content area */}
                <div className="py-6">
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <div className="space-y-4">
                      {selectedCard.description.split('\n\n').map((paragraph, paragraphIndex) => (
                        <div key={paragraphIndex}>
                          {paragraph.split('. ').map((sentence, sentenceIndex) => {
                            if (sentence.trim() === '') return null;

                            // Check if sentence looks like a bullet point or list item
                            const isBullet = sentence.trim().match(/^[-•*]\s/);

                            return (
                              <motion.div
                                key={`${paragraphIndex}-${sentenceIndex}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: sentenceIndex * 0.03, duration: 0.2 }}
                                className={isBullet ? "flex gap-2 mb-2" : "mb-2"}
                              >
                                {isBullet && (
                                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                                )}
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {sentence.trim().replace(/^[-•*]\s/, '') +
                                    (sentenceIndex < paragraph.split('. ').length - 1 ? '.' : '')}
                                </p>
                              </motion.div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action footer */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Brain className="h-4 w-4" />
                      <span>{t('careerSuggestions.aiGenerated') || "AI-Generated Insights"}</span>
                    </div>

                    <Button
                      onClick={() => setSelectedCard(null)}
                      className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    >
                      {t('careerSuggestions.close') || "Close"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
