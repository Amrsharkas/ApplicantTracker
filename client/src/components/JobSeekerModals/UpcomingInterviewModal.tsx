import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Calendar, 
  Clock,
  Building, 
  Video,
  ExternalLink,
  RefreshCw,
  Users
} from "lucide-react";

interface UpcomingInterview {
  recordId: string;
  jobTitle: string;
  companyName: string;
  interviewDateTime: string;
  interviewLink: string;
  userId: string;
}

interface UpcomingInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpcomingInterviewModal({ isOpen, onClose }: UpcomingInterviewModalProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t, language } = useLanguage();
  const localeMap: Record<string, string> = {
    en: 'en-US',
    ar: 'ar-EG',
    fr: 'fr-FR',
  };
  const locale = localeMap[language] || 'en-US';
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const { data: interviews = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/upcoming-interviews"],
    enabled: isOpen,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("applicationsModal.unauthorizedTitle"),
          description: t("applicationsModal.unauthorizedDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const formatInterviewDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return t("upcomingInterviewsModal.invalidDate");
    
    try {
      let date = new Date(dateTimeString);
      
      if (isNaN(date.getTime()) && dateTimeString.includes(' at ')) {
        const cleanedDate = dateTimeString.replace(' at ', 'T') + ':00';
        date = new Date(cleanedDate);
      }
      
      if (isNaN(date.getTime())) {
        return t("upcomingInterviewsModal.invalidDate");
      }
      
      const formattedDate = date.toLocaleDateString(locale, {
        dateStyle: 'full',
      });
      const formattedTime = date.toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
      
      return { date: formattedDate, time: formattedTime };
    } catch (error) {
      console.error('Date formatting error:', error);
      return t("upcomingInterviewsModal.invalidDate");
    }
  };

  const getTimeUntilInterview = (dateTimeString: string) => {
    if (!dateTimeString) return t("upcomingInterviewsModal.timeUnknown");
    
    try {
      const interviewDate = new Date(dateTimeString);
      
      if (isNaN(interviewDate.getTime())) {
        return t("upcomingInterviewsModal.timeUnknown");
      }
      
      const now = new Date();
      const diffMs = interviewDate.getTime() - now.getTime();
      
      if (diffMs < 0) {
        return t("upcomingInterviewsModal.interviewPassed");
      }
      
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      if (diffMinutes >= 60 * 24) {
        const days = Math.max(1, Math.round(diffMinutes / (60 * 24)));
        return relativeTimeFormatter.format(days, 'day');
      }
      if (diffMinutes >= 60) {
        const hours = Math.max(1, Math.round(diffMinutes / 60));
        return relativeTimeFormatter.format(hours, 'hour');
      }
      return relativeTimeFormatter.format(Math.max(1, diffMinutes), 'minute');
    } catch (error) {
      console.error('Time calculation error:', error);
      return t("upcomingInterviewsModal.timeUnknown");
    }
  };

  const getStatusBadge = (dateTimeString: string) => {
    if (!dateTimeString) return <Badge variant="secondary">{t("upcomingInterviewsModal.badges.unknown")}</Badge>;
    
    try {
      const interviewDate = new Date(dateTimeString);
      
      if (isNaN(interviewDate.getTime())) {
        return <Badge variant="secondary">{t("upcomingInterviewsModal.badges.unknown")}</Badge>;
      }
      
      const now = new Date();
      const diffMs = interviewDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffMs < 0) {
        return <Badge variant="secondary">{t("upcomingInterviewsModal.badges.completed")}</Badge>;
      } else if (diffHours <= 1) {
        return <Badge className="bg-red-100 text-red-800 border-red-200">{t("upcomingInterviewsModal.badges.startingSoon")}</Badge>;
      } else if (diffHours <= 24) {
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">{t("upcomingInterviewsModal.badges.today")}</Badge>;
      } else {
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">{t("upcomingInterviewsModal.badges.upcoming")}</Badge>;
      }
    } catch (error) {
      console.error('Status badge error:', error);
      return <Badge variant="secondary">{t("upcomingInterviewsModal.badges.unknown")}</Badge>;
    }
  };

  const handleJoinInterview = (interviewLink: string) => {
    if (interviewLink) {
      window.open(interviewLink, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: t("upcomingInterviewsModal.noLinkTitle"),
        description: t("upcomingInterviewsModal.noLinkDescription"),
        variant: "destructive",
      });
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      // Add a small delay to show the animation
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Sort interviews by date (earliest first)
  const sortedInterviews = interviews
    .filter(interview => interview.interviewDateTime) // Only show interviews with dates
    .sort((a, b) => new Date(a.interviewDateTime).getTime() - new Date(b.interviewDateTime).getTime());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Video className="h-6 w-6 text-blue-600" />
              {t("upcomingInterviewsModal.title")}
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t("upcomingInterviewsModal.refreshing") : t("upcomingInterviewsModal.refresh")}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sortedInterviews.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("upcomingInterviewsModal.emptyTitle")}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {t("upcomingInterviewsModal.emptyDescription")}
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>{t("upcomingInterviewsModal.proTipLabel")}</strong> {t("upcomingInterviewsModal.proTipMessage")}
                </p>
              </div>
            </div>
          ) : (
            sortedInterviews.map((interview) => (
              <motion.div
                key={interview.recordId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <Card className="glass-card border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            {interview.jobTitle}
                          </h3>
                          {getStatusBadge(interview.interviewDateTime)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {interview.companyName}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        const formattedDateTime = formatInterviewDateTime(interview.interviewDateTime);
                        if (typeof formattedDateTime === 'object' && formattedDateTime.date && formattedDateTime.time) {
                          return (
                            <>
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                    {formattedDateTime.date}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Clock className="w-5 h-5 text-blue-600" />
                                  <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                                    {formattedDateTime.time}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{getTimeUntilInterview(interview.interviewDateTime)}</span>
                              </div>
                            </>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">{formattedDateTime}</span>
                            </div>
                          );
                        }
                      })()}
                    </div>

                    <div className="flex items-center gap-2 rtl:space-x-reverse mt-4">
                      <Button 
                        onClick={() => handleJoinInterview(interview.interviewLink)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        disabled={!interview.interviewLink}
                      >
                        <Video className="w-4 h-4" />
                        {t("upcomingInterviewsModal.joinButton")}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                      
                      {!interview.interviewLink && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {t("upcomingInterviewsModal.linkPlaceholder")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}