import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  History,
  FileText,
  User,
  Calendar,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronRight
} from "lucide-react";

interface HistoryItem {
  id: number;
  sourceType: 'profile' | 'uploaded_document';
  documentFileName?: string;
  language: string;
  createdAt: string;
  preview?: string;
}

interface CareerInsightsHistoryProps {
  onSelectAnalysis: (analysisId: number) => void;
  onBack: () => void;
}

export function CareerInsightsHistory({
  onSelectAnalysis,
  onBack
}: CareerInsightsHistoryProps) {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    history: HistoryItem[];
    totalCount: number;
  }>({
    queryKey: ["/api/career-insights/history"],
    refetchOnWindowFocus: false
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/career-insights/history/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to delete analysis');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career-insights/history"] });
      toast({
        title: t('careerInsights.analysisDeleted') || "Analysis deleted",
        description: t('careerInsights.analysisDeletedDescription') || "The analysis has been removed from your history",
      });
      setDeletingId(null);
    },
    onError: () => {
      toast({
        title: t('careerInsights.deleteFailed') || "Delete failed",
        description: t('careerInsights.deleteFailedDescription') || "Could not delete the analysis. Please try again.",
        variant: "destructive"
      });
      setDeletingId(null);
    }
  });

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceIcon = (sourceType: string) => {
    return sourceType === 'profile'
      ? <User className="h-5 w-5 text-blue-500" />
      : <FileText className="h-5 w-5 text-purple-500" />;
  };

  const getSourceLabel = (item: HistoryItem) => {
    if (item.sourceType === 'profile') {
      return t('careerInsights.fromProfile') || "From Profile";
    }
    return item.documentFileName || (t('careerInsights.uploadedDocument') || "Uploaded Document");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-10 w-10 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-600">{t('careerInsights.loadingHistory') || "Loading history..."}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-gray-700 font-medium mb-2">
          {t('careerInsights.historyError') || "Failed to load history"}
        </p>
        <Button variant="outline" onClick={onBack}>
          {t('careerInsights.goBack') || "Go Back"}
        </Button>
      </div>
    );
  }

  const history = data?.history || [];

  return (
    <div className={`py-6 px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">
            {t('careerInsights.analysisHistory') || "Analysis History"}
          </h3>
        </div>
        <span className="text-sm text-gray-500 ml-auto">
          {data?.totalCount || 0} {t('careerInsights.analyses') || "analyses"}
        </span>
      </div>

      {/* Empty State */}
      {history.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="bg-gray-100 rounded-full p-4 w-fit mx-auto mb-4">
            <History className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-2">
            {t('careerInsights.noHistory') || "No previous analyses"}
          </p>
          <p className="text-sm text-gray-500">
            {t('careerInsights.noHistoryDescription') || "Your career insight analyses will appear here"}
          </p>
        </motion.div>
      ) : (
        /* History List */
        <div className="space-y-3">
          <AnimatePresence>
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectAnalysis(item.id)}
                className="group bg-white border rounded-xl p-4 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Source Icon */}
                  <div className={`
                    rounded-lg p-2
                    ${item.sourceType === 'profile' ? 'bg-blue-50' : 'bg-purple-50'}
                  `}>
                    {getSourceIcon(item.sourceType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {getSourceLabel(item)}
                      </h4>
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full
                        ${item.sourceType === 'profile'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'}
                      `}>
                        {item.sourceType === 'profile'
                          ? (t('careerInsights.profile') || 'Profile')
                          : (t('careerInsights.document') || 'Document')}
                      </span>
                    </div>

                    {/* Preview */}
                    {item.preview && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {item.preview}
                      </p>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.createdAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deletingId === item.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
