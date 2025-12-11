import { memo } from "react";
import { motion } from "framer-motion";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  User,
  LogOut,
  ChevronDown,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobSeekerHeaderProps {
  onMenuClick: () => void;
}

export function JobSeekerHeader({ onMenuClick }: JobSeekerHeaderProps) {
  const { user } = useAuth();
  const logout = useLogout();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const { t, isRTL } = useLanguage();

  const handleLogout = () => {
    logout.mutate();
  };

  const userInitials = (user as any)?.firstName && (user as any)?.lastName
    ? `${(user as any).firstName[0]}${(user as any).lastName[0]}`.toUpperCase()
    : (user as any)?.email
      ? (user as any).email.substring(0, 2).toUpperCase()
      : "U";

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed top-0 right-0 left-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 z-30",
        isRTL ? "lg:right-64" : "lg:left-64"
      )}
    >
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
        {/* Left Side - Mobile Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Center - Empty for now (could add breadcrumb or title) */}
        <div className="flex-1" />

        {/* Right Side - User Menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all duration-200"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                  {(user as any)?.firstName || (user as any)?.email}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {(user as any)?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/dashboard/profile")}>
                <User className="w-4 h-4 mr-2" />
                {t('profile') || 'Profile'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout') || 'Sign Out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
