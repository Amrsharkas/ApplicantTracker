import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  User,
  Upload,
  History,
  CheckCircle,
  FileText,
  ArrowRight,
  Sparkles,
  Zap
} from "lucide-react";

interface DataSourceSelectorProps {
  onSelectProfile: () => void;
  onSelectUpload: () => void;
  onViewHistory: () => void;
  hasProfile: boolean;
  profileCompleteness: number;
  historyCount: number;
}

export function DataSourceSelector({
  onSelectProfile,
  onSelectUpload,
  onViewHistory,
  hasProfile,
  profileCompleteness,
  historyCount
}: DataSourceSelectorProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className={`py-10 px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="h-6 w-6 text-blue-500" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('careerInsights.selectDataSource') || "Choose Your Data Source"}
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t('careerInsights.selectDataSourceDescription') || "Select how you'd like to generate your career insights"}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Current Profile Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="cursor-pointer group"
          onClick={onSelectProfile}
        >
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`
              relative overflow-hidden
              bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50
              dark:from-blue-950 dark:via-indigo-950 dark:to-cyan-950
              rounded-2xl border-2
              ${hasProfile ? 'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600' : 'border-gray-300 dark:border-gray-700'}
              shadow-lg hover:shadow-2xl hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50
              transition-all duration-300 p-8 h-full
            `}
          >
            {/* Background decorations */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-400 opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-300" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-400 opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-300" />

            {hasProfile && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
                className="absolute -top-3 -right-3 z-10"
              >
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <CheckCircle className="h-4 w-4" />
                  {t('careerInsights.ready') || "Ready"}
                </div>
              </motion.div>
            )}

            <div className="relative flex flex-col items-center text-center gap-5">
              {/* Icon */}
              <motion.div
                whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xl border-2 border-blue-100 dark:border-blue-800">
                  <User className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-2 -right-2"
                >
                  <Zap className="h-5 w-5 text-yellow-400" />
                </motion.div>
              </motion.div>

              {/* Title */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {t('careerInsights.useCurrentProfile') || "Use Current Profile"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t('careerInsights.useCurrentProfileDescription') || "Analyze your existing profile data including work experience, skills, and education"}
                </p>
              </div>

              {/* Progress bar */}
              {hasProfile && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="w-full"
                >
                  <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <span>{t('careerInsights.profileCompleteness') || "Profile Completeness"}</span>
                    <span className="text-blue-600 dark:text-blue-400">{profileCompleteness}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${profileCompleteness}%` }}
                      transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                      className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 h-2.5 rounded-full relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* CTA Button */}
              <Button
                className={`
                  w-full mt-2
                  ${hasProfile
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-gray-400 cursor-not-allowed'}
                  text-white font-semibold shadow-lg hover:shadow-xl
                  transition-all duration-300
                `}
                disabled={!hasProfile}
              >
                {hasProfile
                  ? (t('careerInsights.analyzeProfile') || "Analyze My Profile")
                  : (t('careerInsights.completeProfileFirst') || "Complete Profile First")}
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Upload Document Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="cursor-pointer group"
          onClick={onSelectUpload}
        >
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="
              relative overflow-hidden
              bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50
              dark:from-purple-950 dark:via-pink-950 dark:to-rose-950
              rounded-2xl border-2 border-purple-300 dark:border-purple-700
              hover:border-purple-400 dark:hover:border-purple-600
              shadow-lg hover:shadow-2xl hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50
              transition-all duration-300 p-8 h-full
            "
          >
            {/* Background decorations */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-300" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-400 opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-300" />

            <div className="relative flex flex-col items-center text-center gap-5">
              {/* Icon */}
              <motion.div
                whileHover={{ rotate: [0, -5, 5, -5, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xl border-2 border-purple-100 dark:border-purple-800">
                  <Upload className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                </motion.div>
              </motion.div>

              {/* Title */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {t('careerInsights.uploadNewDocument') || "Upload New Document"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t('careerInsights.uploadNewDocumentDescription') || "Upload a resume, CV, cover letter, or any career-related document for analysis"}
                </p>
              </div>

              {/* Supported formats */}
              <div className="flex flex-wrap justify-center gap-2">
                {['PDF', 'DOCX', 'DOC', 'TXT'].map((format, index) => (
                  <motion.span
                    key={format}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800"
                  >
                    {format}
                  </motion.span>
                ))}
              </div>

              {/* CTA Button */}
              <Button className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                {t('careerInsights.uploadDocument') || "Upload Document"}
                <FileText className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* History Link */}
      {historyCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-10"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              onClick={onViewHistory}
              className="group border-2 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-all duration-300 px-6 py-3"
            >
              <History className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                {t('careerInsights.viewPreviousAnalyses') || "View Previous Analyses"}
              </span>
              <span className="ml-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-xs font-semibold">
                {historyCount}
              </span>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
