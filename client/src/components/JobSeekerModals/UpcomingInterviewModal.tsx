import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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

  const { data: interviews = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/upcoming-interviews"],
    enabled: isOpen,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const formatInterviewDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      
      // Format date like "July 21st, 2025"
      const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      
      // Format time like "3:00 PM EST"
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      };
      
      const formattedDate = date.toLocaleDateString('en-US', dateOptions);
      const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
      
      // Add ordinal suffix to day
      const day = date.getDate();
      const ordinalSuffix = getOrdinalSuffix(day);
      const finalDate = formattedDate.replace(day.toString(), `${day}${ordinalSuffix}`);
      
      return `${finalDate} @ ${formattedTime}`;
    } catch {
      return dateTimeString; // Fallback to original string
    }
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const getTimeUntilInterview = (dateTimeString: string) => {
    try {
      const interviewDate = new Date(dateTimeString);
      const now = new Date();
      const diffMs = interviewDate.getTime() - now.getTime();
      
      if (diffMs < 0) {
        return "Interview has passed";
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        return `In ${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMinutes} min`;
      } else {
        return `In ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      }
    } catch {
      return "Time unknown";
    }
  };

  const getStatusBadge = (dateTimeString: string) => {
    try {
      const interviewDate = new Date(dateTimeString);
      const now = new Date();
      const diffMs = interviewDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffMs < 0) {
        return <Badge variant="secondary">Completed</Badge>;
      } else if (diffHours <= 1) {
        return <Badge className="bg-red-100 text-red-800 border-red-200">Starting Soon</Badge>;
      } else if (diffHours <= 24) {
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Today</Badge>;
      } else {
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Upcoming</Badge>;
      }
    } catch {
      return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const handleJoinInterview = (interviewLink: string) => {
    if (interviewLink) {
      window.open(interviewLink, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "No Link Available",
        description: "Interview link is not available yet. Please check back later.",
        variant: "destructive",
      });
    }
  };

  const handleManualRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Interview schedule has been updated",
    });
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
              Upcoming Interviews
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
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
                No Upcoming Interviews
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Your interview schedule will appear here when employers schedule meetings with you.
              </p>
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

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">
                          {formatInterviewDateTime(interview.interviewDateTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{getTimeUntilInterview(interview.interviewDateTime)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Button 
                        onClick={() => handleJoinInterview(interview.interviewLink)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        disabled={!interview.interviewLink}
                      >
                        <Video className="w-4 h-4" />
                        Join Interview
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                      
                      {!interview.interviewLink && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Link will be provided closer to interview time
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