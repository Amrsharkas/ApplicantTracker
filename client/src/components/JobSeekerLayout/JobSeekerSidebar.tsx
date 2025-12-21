import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  Home,
  User,
  Briefcase,
  Target,
  FileText,
  Calendar,
  Mic,
  Video,
  Brain,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@assets/logo.png";

interface NavSection {
  title: string;
  titleKey: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface JobSeekerSidebarProps {
  activePage: string;
  isOpen: boolean;
  onClose: () => void;
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    titleKey: "sidebar.overview",
    items: [
      { id: "dashboard", label: "Dashboard", labelKey: "sidebar.dashboard", icon: Home, path: "/dashboard" },
    ],
  },
  {
    title: "My Profile",
    titleKey: "sidebar.myProfile",
    items: [
      { id: "profile", label: "Profile", labelKey: "sidebar.profile", icon: User, path: "/dashboard/profile" },
    ],
  },
  {
    title: "Job Search",
    titleKey: "sidebar.jobSearch",
    items: [
      { id: "jobs", label: "Browse Jobs", labelKey: "sidebar.browseJobs", icon: Briefcase, path: "/dashboard/jobs" },
      { id: "matches", label: "Job Matches", labelKey: "sidebar.jobMatches", icon: Target, path: "/dashboard/matches" },
      { id: "applications", label: "Applications", labelKey: "sidebar.applications", icon: FileText, path: "/dashboard/applications" },
    ],
  },
  {
    title: "Interviews",
    titleKey: "sidebar.interviews",
    items: [
      { id: "interviews", label: "Upcoming", labelKey: "sidebar.upcoming", icon: Calendar, path: "/dashboard/interviews" },
      { id: "practice", label: "Practice", labelKey: "sidebar.practice", icon: Mic, path: "/dashboard/practice" },
      { id: "job-interviews", label: "Job Interviews", labelKey: "sidebar.jobInterviews", icon: Video, path: "/dashboard/job-interviews" },
    ],
  },
  {
    title: "Career",
    titleKey: "sidebar.career",
    items: [
      { id: "career", label: "Career Insights", labelKey: "sidebar.careerInsights", icon: Brain, path: "/dashboard/career" },
    ],
  },
];

export function JobSeekerSidebar({ activePage, isOpen, onClose }: JobSeekerSidebarProps) {
  const [location, setLocation] = useLocation();
  const { t, isRTL } = useLanguage();

  const isActive = (itemId: string) => {
    return activePage === itemId || activePage.startsWith(itemId + "/");
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
    onClose();
  };

  return (
    <aside
      className={cn(
        "fixed top-0 h-full w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/60 dark:border-slate-700/60 z-40 flex flex-col transition-transform duration-300 ease-in-out",
        isRTL ? "right-0 border-l" : "left-0 border-r",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
      )}
    >
      {/* Logo & Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <div
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => handleNavigation("/dashboard")}
        >
          <img src={logo} alt="Logo" className="h-8 w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              Job Seeker
            </h1>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                    isActive(item.id)
                      ? "bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          Job Seeker Portal
        </p>
      </div>
    </aside>
  );
}
