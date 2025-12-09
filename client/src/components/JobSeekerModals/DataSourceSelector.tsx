import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  User,
  Upload,
  History,
  CheckCircle,
  FileText,
  ArrowRight
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
    <div className={`py-8 px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('careerInsights.selectDataSource') || "Choose Your Data Source"}
        </h2>
        <p className="text-gray-600">
          {t('careerInsights.selectDataSourceDescription') || "Select how you'd like to generate your career insights"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Current Profile Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer"
          onClick={onSelectProfile}
        >
          <div className={`relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border-2 ${hasProfile ? 'border-blue-300 hover:border-blue-500' : 'border-gray-200'} shadow-md hover:shadow-xl transition-all duration-300 p-6 h-full`}>
            {hasProfile && (
              <div className="absolute -top-2 -right-2">
                <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t('careerInsights.ready') || "Ready"}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-white rounded-full p-4 shadow-lg">
                <User className="h-10 w-10 text-blue-600" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {t('careerInsights.useCurrentProfile') || "Use Current Profile"}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {t('careerInsights.useCurrentProfileDescription') || "Analyze your existing profile data including work experience, skills, and education"}
                </p>
              </div>

              {hasProfile && (
                <div className="w-full">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t('careerInsights.profileCompleteness') || "Profile Completeness"}</span>
                    <span>{profileCompleteness}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompleteness}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                disabled={!hasProfile}
              >
                {hasProfile
                  ? (t('careerInsights.analyzeProfile') || "Analyze My Profile")
                  : (t('careerInsights.completeProfileFirst') || "Complete Profile First")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Upload Document Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer"
          onClick={onSelectUpload}
        >
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl border-2 border-purple-200 hover:border-purple-400 shadow-md hover:shadow-xl transition-all duration-300 p-6 h-full">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-white rounded-full p-4 shadow-lg">
                <Upload className="h-10 w-10 text-purple-600" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {t('careerInsights.uploadNewDocument') || "Upload New Document"}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {t('careerInsights.uploadNewDocumentDescription') || "Upload a resume, CV, cover letter, or any career-related document for analysis"}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {['PDF', 'DOCX', 'DOC', 'TXT'].map((format) => (
                  <span
                    key={format}
                    className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full"
                  >
                    {format}
                  </span>
                ))}
              </div>

              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                {t('careerInsights.uploadDocument') || "Upload Document"}
                <FileText className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* History Link */}
      {historyCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8"
        >
          <Button
            variant="ghost"
            onClick={onViewHistory}
            className="text-gray-600 hover:text-gray-900"
          >
            <History className="h-4 w-4 mr-2" />
            {t('careerInsights.viewPreviousAnalyses') || "View Previous Analyses"} ({historyCount})
          </Button>
        </motion.div>
      )}
    </div>
  );
}
