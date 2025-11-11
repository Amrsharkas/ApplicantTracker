import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

import {
  Brain,
  RefreshCw,
  AlertCircle,
  Star,
  TrendingUp,
  BarChart3,
  Lightbulb
} from "lucide-react";

interface CareerSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CareerSuggestionsModal({ isOpen, onClose }: CareerSuggestionsModalProps) {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();

  const { data: suggestionsData, isLoading, error, refetch } = useQuery<{
    success: boolean;
    suggestions: {
      paragraphs: string[];
    };
    profileCompleteness: number;
    generatedAt: string;
  }>({
    queryKey: ["/api/career-suggestions"],
    enabled: isOpen,
    refetchInterval: isOpen ? 300000 : false, // Refresh every 5 minutes
  });

  const handleRefresh = async () => {
    try {
      await refetch();
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
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Brain className="h-6 w-6 text-blue-600" />
              {t('careerSuggestions.title') || "Career Insights & Suggestions"}
            </DialogTitle>
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
          </div>
          {suggestionsData && (
            <div className="text-sm text-gray-600">
              {t('careerSuggestions.generatedAt') || "Generated"}: {new Date(suggestionsData.generatedAt).toLocaleString()} |
              {t('careerSuggestions.profileCompleteness') || "Profile Completeness"}: {suggestionsData.profileCompleteness}%
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
              <Brain className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-lg text-gray-600 font-medium">{t('careerSuggestions.loading') || "Analyzing your profile..."}</p>
            <p className="text-sm text-gray-500 mt-2">{t('careerSuggestions.loadingSubtitle') || "Generating personalized career insights"}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-red-100 rounded-full p-4 mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <p className="text-lg text-gray-800 font-medium mb-2">{t('careerSuggestions.error') || "Failed to load career suggestions"}</p>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-md">{t('careerSuggestions.errorDescription') || "We couldn't generate your career insights. Please try again or contact support if the issue persists."}</p>
            <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('careerSuggestions.tryAgain') || "Try Again"}
            </Button>
          </div>
        ) : !suggestionsData?.suggestions || !suggestionsData.suggestions.paragraphs || suggestionsData.suggestions.paragraphs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-yellow-100 rounded-full p-4 mb-4">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
            </div>
            <p className="text-lg text-gray-800 font-medium mb-2">{t('careerSuggestions.insufficientData') || "Complete your profile to get personalized career suggestions"}</p>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-md">{t('careerSuggestions.insufficientDataDescription') || "Add more details to your profile including work experience, skills, and education to receive comprehensive career insights."}</p>
            <Button onClick={onClose} variant="outline">
              {t('careerSuggestions.close') || "Close"}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              {suggestionsData.suggestions.paragraphs.map((paragraph, index) => {
                const paragraphIcons = [
                  <Brain key="brain" className="h-5 w-5 text-blue-600" />,
                  <Star key="star" className="h-5 w-5 text-green-600" />,
                  <TrendingUp key="trending" className="h-5 w-5 text-purple-600" />,
                  <BarChart3 key="chart" className="h-5 w-5 text-orange-600" />,
                  <Lightbulb key="bulb" className="h-5 w-5 text-yellow-600" />
                ];

                const paragraphTitles = [
                  t('careerSuggestions.paragraphTitles.overview') || "Career Overview",
                  t('careerSuggestions.paragraphTitles.skills') || "Skills Assessment",
                  t('careerSuggestions.paragraphTitles.opportunities') || "Career Opportunities",
                  t('careerSuggestions.paragraphTitles.market') || "Market Insights",
                  t('careerSuggestions.paragraphTitles.recommendations') || "Actionable Recommendations"
                ];

                return (
                  <motion.div
                    key={index}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.15, duration: 0.6, ease: "easeOut" }}
                    whileHover={{ scale: 1.02 }}
                    className="group"
                  >
                    <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 p-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className="bg-white rounded-lg p-2 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                            {paragraphIcons[index]}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            {paragraphTitles[index]}
                          </h3>

                          <div className="text-gray-700 leading-relaxed space-y-3">
                            {paragraph.split('. ').map((sentence, sentenceIndex) => {
                              if (sentence.trim() === '') return null;
                              return (
                                <p key={sentenceIndex} className="text-base">
                                  {sentence.trim() + (sentenceIndex < paragraph.split('. ').length - 1 ? '.' : '')}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-end">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="pt-8 border-t border-gray-200"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-sm text-gray-600 mb-1">
                    {t('careerSuggestions.generatedAt') || "Generated"}: {new Date(suggestionsData.generatedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('careerSuggestions.profileCompleteness') || "Profile Completeness"}: {suggestionsData.profileCompleteness}%
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('careerSuggestions.refresh') || "Refresh"}
                  </Button>
                  <Button onClick={onClose} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {t('careerSuggestions.close') || "Close"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}