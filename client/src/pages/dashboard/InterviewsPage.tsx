import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Phone,
  User,
  Building2,
  Sparkles,
  CalendarCheck,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

export default function InterviewsPage() {
  const { t } = useLanguage();

  const { data: upcomingInterviews = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/upcoming-interviews"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "Date TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeUntil = (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return "Past";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} away`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} away`;
    return "Starting soon";
  };

  const getUrgencyLevel = (dateString: string) => {
    if (!dateString) return 'none';
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 0) return 'past';
    if (hours < 3) return 'urgent';
    if (hours < 24) return 'today';
    if (hours < 48) return 'tomorrow';
    if (hours < 168) return 'week';
    return 'future';
  };

  const getInterviewIcon = (interview: any) => {
    if (interview.meetingLink?.includes('zoom') || interview.meetingLink?.includes('meet')) {
      return Video;
    }
    if (interview.location?.toLowerCase().includes('phone')) {
      return Phone;
    }
    if (interview.location?.toLowerCase().includes('onsite') || interview.location) {
      return MapPin;
    }
    return User;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
            <CalendarCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Upcoming Interviews
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Your scheduled interviews and video calls
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="group hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all"
        >
          <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
          Refresh
        </Button>
      </motion.div>

      {/* Interviews List */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-12 text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Loading interviews...</p>
        </motion.div>
      ) : (upcomingInterviews as any[]).length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xs border-blue-200/60 dark:border-slate-700/60 overflow-hidden">
            <CardContent className="p-12 text-center relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-block mb-6"
              >
                <div className="relative">
                  <Calendar className="w-20 h-20 text-blue-300 dark:text-blue-600" />
                  <Sparkles className="w-6 h-6 text-blue-500 absolute -top-2 -right-2 animate-pulse" />
                </div>
              </motion.div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
                No Interviews Scheduled Yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                Your interview calendar is clear right now
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4" />
                Keep applying and interviews will appear here
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-linear-to-b from-blue-200 via-blue-300 to-transparent dark:from-blue-800 dark:via-blue-700"></div>

          <div className="space-y-8">
            {(upcomingInterviews as any[]).map((interview, index) => {
              const timeUntil = getTimeUntil(interview.scheduledDate);
              const urgency = getUrgencyLevel(interview.scheduledDate);
              const InterviewIcon = getInterviewIcon(interview);
              const interviewDate = interview.scheduledDate ? new Date(interview.scheduledDate) : null;

              return (
                <InterviewCard
                  key={interview.id || index}
                  interview={interview}
                  index={index}
                  timeUntil={timeUntil}
                  urgency={urgency}
                  InterviewIcon={InterviewIcon}
                  interviewDate={interviewDate}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Countdown Timer Component
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.days > 7) return null;

  return (
    <div className="flex gap-2">
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center min-w-[50px] bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-2">
          <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{timeLeft.days}</span>
          <span className="text-xs text-blue-600 dark:text-blue-400">days</span>
        </div>
      )}
      <div className="flex flex-col items-center min-w-[50px] bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-2">
        <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{timeLeft.hours}</span>
        <span className="text-xs text-blue-600 dark:text-blue-400">hrs</span>
      </div>
      <div className="flex flex-col items-center min-w-[50px] bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-2">
        <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{timeLeft.minutes}</span>
        <span className="text-xs text-blue-600 dark:text-blue-400">min</span>
      </div>
      {timeLeft.days === 0 && (
        <div className="flex flex-col items-center min-w-[50px] bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-2">
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-xl font-bold text-blue-700 dark:text-blue-300"
          >
            {timeLeft.seconds}
          </motion.span>
          <span className="text-xs text-blue-600 dark:text-blue-400">sec</span>
        </div>
      )}
    </div>
  );
}

// Calendar Widget Component
function CalendarWidget({ date }: { date: Date | null }) {
  if (!date) {
    return (
      <div className="flex flex-col items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-xl">
        <span className="text-xs text-slate-400">TBD</span>
      </div>
    );
  }

  const monthShort = date.toLocaleDateString(undefined, { month: 'short' });
  const day = date.getDate();
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 2 }}
      className="flex flex-col items-center w-20 h-20 bg-linear-to-br from-white to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-600 overflow-hidden"
    >
      <div className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold text-center py-1">
        {monthShort}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{day}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{weekday}</span>
      </div>
    </motion.div>
  );
}

// Interview Card Component
function InterviewCard({
  interview,
  index,
  timeUntil,
  urgency,
  InterviewIcon,
  interviewDate,
  formatDate,
  formatTime,
}: any) {
  const [isHovered, setIsHovered] = useState(false);

  const urgencyConfig = {
    urgent: {
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800',
      ring: 'ring-2 ring-red-500/50 dark:ring-red-400/50',
      icon: 'bg-linear-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40',
      iconColor: 'text-red-600 dark:text-red-400',
      pulse: true,
      button: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 shadow-lg shadow-red-500/30',
      timeline: 'bg-red-500 shadow-lg shadow-red-500/50',
      label: 'Starting Soon!',
    },
    today: {
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      ring: 'ring-2 ring-amber-500/40 dark:ring-amber-400/40',
      icon: 'bg-linear-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      pulse: false,
      button: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 shadow-lg shadow-amber-500/30',
      timeline: 'bg-amber-500 shadow-md shadow-amber-500/50',
      label: 'Today',
    },
    tomorrow: {
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      ring: 'ring-1 ring-orange-400/30 dark:ring-orange-500/30',
      icon: 'bg-linear-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
      pulse: false,
      button: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700',
      timeline: 'bg-orange-500',
      label: 'Tomorrow',
    },
    week: {
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      ring: 'ring-1 ring-blue-400/20 dark:ring-blue-500/20',
      icon: 'bg-linear-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      pulse: false,
      button: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
      timeline: 'bg-blue-500',
      label: 'This Week',
    },
    future: {
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
      ring: '',
      icon: 'bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800',
      iconColor: 'text-slate-600 dark:text-slate-400',
      pulse: false,
      button: 'bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700',
      timeline: 'bg-slate-400',
      label: 'Upcoming',
    },
    past: {
      badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      ring: '',
      icon: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-500 dark:text-gray-500',
      pulse: false,
      button: 'bg-gray-500 hover:bg-gray-600',
      timeline: 'bg-gray-400',
      label: 'Past',
    },
  };

  const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.future;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
      className="relative pl-16 sm:pl-20"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Timeline Node */}
      <motion.div
        animate={{
          scale: config.pulse ? [1, 1.2, 1] : 1,
        }}
        transition={{
          repeat: config.pulse ? Infinity : 0,
          duration: 2,
        }}
        className={`absolute left-4 sm:left-6 top-8 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 ${config.timeline} z-10`}
      />

      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card
          className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs border-slate-200/60 dark:border-slate-700/60 hover:shadow-xl transition-all duration-300 ${config.ring} overflow-hidden`}
        >
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Section - Calendar & Icon */}
              <div className="flex gap-4 items-start">
                <CalendarWidget date={interviewDate} />

                <div className={`p-4 rounded-2xl ${config.icon} relative`}>
                  <InterviewIcon className={`w-7 h-7 ${config.iconColor}`} />
                  {config.pulse && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`absolute inset-0 rounded-2xl ${config.icon}`}
                    />
                  )}
                </div>
              </div>

              {/* Middle Section - Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">
                      {interview.jobTitle || "Interview"}
                    </h3>
                    {timeUntil && (
                      <Badge className={`${config.badge} flex items-center gap-1 px-3 py-1 font-semibold`}>
                        {(urgency === 'urgent' || urgency === 'today') && (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {timeUntil}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-3">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">{interview.companyName || "Company"}</span>
                  </div>
                </div>

                {/* Countdown Timer */}
                {interviewDate && urgency !== 'past' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <CountdownTimer targetDate={interviewDate} />
                  </motion.div>
                )}

                {/* Interview Details */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(interview.scheduledDate)}</span>
                  </div>
                  {interview.scheduledDate && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(interview.scheduledDate)}</span>
                    </div>
                  )}
                  {interview.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg">
                      <MapPin className="w-4 h-4" />
                      <span>{interview.location}</span>
                    </div>
                  )}
                </div>

                {/* Interview Notes */}
                {interview.notes && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/60"
                  >
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Notes:</span> {interview.notes}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Right Section - Actions */}
              {interview.meetingLink && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="lg:self-start"
                >
                  <Button
                    size="lg"
                    className={`${config.button} text-white font-semibold group relative overflow-hidden`}
                    asChild
                  >
                    <a
                      href={interview.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ rotate: isHovered ? 360 : 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Video className="w-5 h-5" />
                      </motion.div>
                      <span>Join Meeting</span>
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </a>
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
