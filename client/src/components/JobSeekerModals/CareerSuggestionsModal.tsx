import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

import { DataSourceSelector } from "./DataSourceSelector";
import { CareerInsightsUploader } from "./CareerInsightsUploader";
import { CareerInsightsHistory } from "./CareerInsightsHistory";

import {
  Brain,
  RefreshCw,
  AlertCircle,
  Star,
  TrendingUp,
  BarChart3,
  Lightbulb,
  X,
  ArrowLeft
} from "lucide-react";

interface CareerSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function CareerSuggestionsModal({ isOpen, onClose }: CareerSuggestionsModalProps) {
  const { t, isRTL } = useLanguage();
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhase('source-selection');
      setSelectedCard(null);
      setCurrentSuggestions(null);
      setSourceType(null);
      setUploadedFileInfo(null);
    }
  }, [isOpen]);

  // Fetch profile data to check if user has a profile
  const { data: profileData } = useQuery<{
    completionPercentage: number;
    name: string;
  }>({
    queryKey: ["/api/profile/completion"],
    enabled: isOpen,
  });

  // Fetch history count
  const { data: historyData } = useQuery<{
    success: boolean;
    totalCount: number;
  }>({
    queryKey: ["/api/career-insights/history", { limit: 1 }],
    enabled: isOpen,
  });

  // Profile-based suggestions query
  const {
    data: profileSuggestionsData,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = useQuery<SuggestionsData>({
    queryKey: ["/api/career-suggestions"],
    enabled: isOpen && phase === 'analyzing' && sourceType === 'profile',
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
      color: "text-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
      hoverBorder: "hover:border-blue-400"
    },
    {
      icon: <Star className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.skills') || "Skills Assessment",
      color: "text-green-600",
      bgGradient: "from-green-50 to-green-100",
      borderColor: "border-green-200",
      hoverBorder: "hover:border-green-400"
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.opportunities') || "Career Opportunities",
      color: "text-purple-600",
      bgGradient: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200",
      hoverBorder: "hover:border-purple-400"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.market') || "Market Insights",
      color: "text-orange-600",
      bgGradient: "from-orange-50 to-orange-100",
      borderColor: "border-orange-200",
      hoverBorder: "hover:border-orange-400"
    },
    {
      icon: <Lightbulb className="h-8 w-8" />,
      title: t('careerSuggestions.paragraphTitles.recommendations') || "Actionable Recommendations",
      color: "text-yellow-600",
      bgGradient: "from-yellow-50 to-yellow-100",
      borderColor: "border-yellow-200",
      hoverBorder: "hover:border-yellow-400"
    }
  ];

  const getSuggestionCards = (): SuggestionCard[] => {
    if (!currentSuggestions?.suggestions?.paragraphs) return [];

    return currentSuggestions.suggestions.paragraphs.map((paragraph, index) => ({
      icon: cardConfigs[index]?.icon || <Brain className="h-8 w-8" />,
      title: cardConfigs[index]?.title || `Insight ${index + 1}`,
      description: paragraph,
      color: cardConfigs[index]?.color || "text-blue-600",
      bgGradient: cardConfigs[index]?.bgGradient || "from-blue-50 to-blue-100",
    }));
  };

  const isLoading = isLoadingProfile || analyzeDocumentMutation.isPending;
  const hasProfile = !!(profileData?.name || (profileData?.completionPercentage && profileData.completionPercentage > 10));

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-6xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                <Brain className="h-6 w-6 text-blue-600" />
                {t('careerSuggestions.title') || "Career Insights & Suggestions"}
              </DialogTitle>
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
              <div className="text-sm text-gray-600">
                {t('careerSuggestions.generatedAt') || "Generated"}: {new Date(currentSuggestions.generatedAt).toLocaleString()}
                {sourceType === 'profile' && currentSuggestions.profileCompleteness !== undefined && (
                  <> | {t('careerSuggestions.profileCompleteness') || "Profile Completeness"}: {currentSuggestions.profileCompleteness}%</>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Phase: Source Selection */}
          {phase === 'source-selection' && (
            <DataSourceSelector
              onSelectProfile={handleSelectProfile}
              onSelectUpload={handleSelectUpload}
              onViewHistory={() => setPhase('history')}
              hasProfile={hasProfile}
              profileCompleteness={profileData?.completionPercentage || 0}
              historyCount={historyData?.totalCount || 0}
            />
          )}

          {/* Phase: Uploading */}
          {phase === 'uploading' && (
            <CareerInsightsUploader
              onUploadComplete={handleUploadComplete}
              onCancel={() => setPhase('source-selection')}
              isAnalyzing={false}
            />
          )}

          {/* Phase: Analyzing */}
          {phase === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
                <Brain className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg text-gray-600 font-medium">
                {sourceType === 'profile'
                  ? (t('careerSuggestions.loading') || "Analyzing your profile...")
                  : (t('careerInsights.analyzingDocument') || "Analyzing your document...")}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('careerSuggestions.loadingSubtitle') || "Generating personalized career insights"}
              </p>
            </div>
          )}

          {/* Phase: History */}
          {phase === 'history' && (
            <CareerInsightsHistory
              onSelectAnalysis={fetchHistoryAnalysis}
              onBack={() => setPhase('source-selection')}
            />
          )}

          {/* Phase: Results */}
          {phase === 'results' && (
            <>
              {profileError && sourceType === 'profile' ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="bg-red-100 rounded-full p-4 mb-4">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                  </div>
                  <p className="text-lg text-gray-800 font-medium mb-2">
                    {t('careerSuggestions.error') || "Failed to load career suggestions"}
                  </p>
                  <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
                    {t('careerSuggestions.errorDescription') || "We couldn't generate your career insights. Please try again or contact support if the issue persists."}
                  </p>
                  <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {t('careerSuggestions.tryAgain') || "Try Again"}
                  </Button>
                </div>
              ) : !currentSuggestions?.suggestions?.paragraphs?.length ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="bg-yellow-100 rounded-full p-4 mb-4">
                    <AlertCircle className="h-12 w-12 text-yellow-500" />
                  </div>
                  <p className="text-lg text-gray-800 font-medium mb-2">
                    {t('careerSuggestions.insufficientData') || "No insights generated"}
                  </p>
                  <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
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
                  className="py-6"
                >
                  {/* Card Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getSuggestionCards().map((card, index) => (
                      <motion.div
                        key={index}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className="cursor-pointer"
                        onClick={() => setSelectedCard(card)}
                      >
                        <div className={`bg-gradient-to-br ${card.bgGradient} rounded-xl border-2 ${cardConfigs[index]?.borderColor} ${cardConfigs[index]?.hoverBorder} shadow-md hover:shadow-xl transition-all duration-300 p-8 h-full flex flex-col items-center justify-center text-center gap-4`}>
                          <div className={`${card.color} bg-white rounded-full p-4 shadow-lg`}>
                            {card.icon}
                          </div>
                          <h3 className={`text-lg font-bold ${card.color}`}>
                            {card.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {t('careerSuggestions.clickToView') || "Click to view details"}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="pt-8 mt-8 border-t border-gray-200"
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-gray-600 mb-1">
                          {t('careerSuggestions.generatedAt') || "Generated"}: {new Date(currentSuggestions.generatedAt).toLocaleString()}
                        </p>
                        {sourceType === 'profile' && currentSuggestions.profileCompleteness !== undefined && (
                          <p className="text-xs text-gray-500">
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
                        <Button onClick={onClose} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                          {t('careerSuggestions.close') || "Close"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <AnimatePresence>
        {selectedCard && (
          <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
            <DialogContent className={`max-w-3xl max-h-[85vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                      <div className={`${selectedCard.color} bg-gradient-to-br ${selectedCard.bgGradient} rounded-lg p-3 shadow-md`}>
                        {selectedCard.icon}
                      </div>
                      {selectedCard.title}
                    </DialogTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCard(null)}
                      className="flex-shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </DialogHeader>

                <div className="mt-6">
                  <div className={`bg-gradient-to-br ${selectedCard.bgGradient} rounded-xl p-6 border-2 ${cardConfigs.find(c => c.title === selectedCard.title)?.borderColor || 'border-gray-200'}`}>
                    <div className="text-gray-700 leading-relaxed space-y-4">
                      {selectedCard.description.split('. ').map((sentence, sentenceIndex) => {
                        if (sentence.trim() === '') return null;
                        return (
                          <motion.p
                            key={sentenceIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: sentenceIndex * 0.05 }}
                            className="text-base"
                          >
                            {sentence.trim() + (sentenceIndex < selectedCard.description.split('. ').length - 1 ? '.' : '')}
                          </motion.p>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() => setSelectedCard(null)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
    </>
  );
}
