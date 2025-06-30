import { useState, memo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Bell, 
  User, 
  Search, 
  Target, 
  FileText, 
  TrendingUp, 
  Upload,
  Sun,
  Moon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { JobSearchModal } from "@/components/JobSeekerModals/JobSearchModal";
import { MatchesModal } from "@/components/JobSeekerModals/MatchesModal";
import { ProfileModal } from "@/components/JobSeekerModals/ProfileModal";
import { ApplicationsModal } from "@/components/JobSeekerModals/ApplicationsModal";
import { InterviewModal } from "@/components/JobSeekerModals/InterviewModal";

// Live components for real-time data updates
const LiveProfileProgress = memo(() => {
  const { data: profile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const calculateProgress = () => {
    if (!profile) return 0;
    return profile.completionPercentage || 0;
  };

  const progress = calculateProgress();
  return (
    <div className="text-3xl font-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
      {progress}%
    </div>
  );
});

const LiveMatchCount = memo(() => {
  const { data: matches = [] } = useQuery({
    queryKey: ["/api/job-matches"],
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  
  return (
    <div className="text-3xl font-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
      {matches.length}
    </div>
  );
});

const LiveApplicationCount = memo(() => {
  const { data: applications = [] } = useQuery({
    queryKey: ["/api/applications"],
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  
  return (
    <div className="text-3xl font-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
      {applications.length}
    </div>
  );
});

const InteractiveCard = memo(({ children, onClick, className, index }: {
  children: React.ReactNode;
  onClick: (e?: any) => void;
  className?: string;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className={`group relative glass-card rounded-2xl p-6 cursor-pointer transition-all duration-300 will-change-transform ${className}`}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
    whileHover={{
      scale: 1.02,
      transition: { duration: 0.2 }
    }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.div>
));

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isDark, setIsDark] = useState(false);
  
  // Modal states
  const [isJobSearchModalOpen, setIsJobSearchModalOpen] = useState(false);
  const [isMatchesModalOpen, setIsMatchesModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      window.location.href = "/";
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Floating decorative elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="floating-element absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute top-1/2 right-20 w-24 h-24 bg-gradient-to-br from-green-400/20 to-teal-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
      </div>

      {/* Modern Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-700/60"
      >
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              Plato
            </motion.button>
            
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 py-2 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {user?.firstName || 'Job Seeker'} Dashboard
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100/60 hover:bg-yellow-100/60 dark:bg-slate-700/60 dark:hover:bg-yellow-900/60 text-slate-600 hover:text-yellow-600 dark:text-slate-400 dark:hover:text-yellow-400 transition-all duration-200"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button className="p-2 rounded-xl bg-slate-100/60 hover:bg-blue-100/60 dark:bg-slate-700/60 dark:hover:bg-blue-900/60 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-all duration-200 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white text-sm font-medium transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main Content - 3-Tier Grid Layout */}
      <div className="h-[calc(100vh-4rem)] p-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-full grid grid-rows-[auto_1fr_1fr] gap-6"
        >
          {/* Top Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InteractiveCard
              index={0}
              onClick={() => setIsJobSearchModalOpen(true)}
              className="bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent"
            >
              <div className="h-full flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Search Jobs</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Find opportunities</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </InteractiveCard>
            
            <InteractiveCard
              index={1}
              onClick={() => setIsMatchesModalOpen(true)}
              className="bg-gradient-to-br from-green-500/10 via-green-400/5 to-transparent"
            >
              <div className="h-full flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Job Matches</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">AI recommendations</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </InteractiveCard>
            
            <InteractiveCard
              index={2}
              onClick={() => setIsProfileModalOpen(true)}
              className="bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-transparent"
            >
              <div className="h-full flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">My Profile</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Update information</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </InteractiveCard>
          </div>

          {/* Middle Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InteractiveCard
              index={3}
              onClick={() => setIsApplicationsModalOpen(true)}
              className="bg-gradient-to-br from-orange-500/10 via-orange-400/5 to-transparent"
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <FileText className="w-8 h-8 text-orange-600" />
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                    APPLICATIONS
                  </div>
                </div>
                <div className="mt-4">
                  <LiveApplicationCount />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Applications</p>
                </div>
              </div>
            </InteractiveCard>
            
            <InteractiveCard
              index={4}
              onClick={() => setIsProfileModalOpen(true)}
              className="bg-gradient-to-br from-teal-500/10 via-teal-400/5 to-transparent"
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-8 h-8 text-teal-600" />
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                    PROFILE
                  </div>
                </div>
                <div className="mt-4">
                  <LiveProfileProgress />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Completion Rate</p>
                </div>
              </div>
            </InteractiveCard>
          </div>

          {/* Bottom Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InteractiveCard
              index={5}
              onClick={() => setIsMatchesModalOpen(true)}
              className="bg-gradient-to-br from-indigo-500/10 via-indigo-400/5 to-transparent"
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Target className="w-8 h-8 text-indigo-600" />
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                    MATCHES
                  </div>
                </div>
                <div className="mt-4">
                  <LiveMatchCount />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Job Matches</p>
                </div>
              </div>
            </InteractiveCard>
            
            <InteractiveCard
              index={6}
              onClick={() => setIsJobSearchModalOpen(true)}
              className="bg-gradient-to-br from-rose-500/10 via-rose-400/5 to-transparent"
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Search className="w-8 h-8 text-rose-600" />
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                    SEARCH
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">1.2K</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Available Jobs</p>
                </div>
              </div>
            </InteractiveCard>
            
            <InteractiveCard
              index={7}
              onClick={() => setIsInterviewModalOpen(true)}
              className="bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent"
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Upload className="w-8 h-8 text-amber-600" />
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                    INTERVIEW
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200">AI Chat</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Start Interview</p>
                </div>
              </div>
            </InteractiveCard>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <JobSearchModal 
        isOpen={isJobSearchModalOpen} 
        onClose={() => setIsJobSearchModalOpen(false)} 
      />
      <MatchesModal 
        isOpen={isMatchesModalOpen} 
        onClose={() => setIsMatchesModalOpen(false)} 
      />
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      <ApplicationsModal 
        isOpen={isApplicationsModalOpen} 
        onClose={() => setIsApplicationsModalOpen(false)} 
      />
      <InterviewModal 
        isOpen={isInterviewModalOpen} 
        onClose={() => setIsInterviewModalOpen(false)} 
      />
    </div>
  );
}
