import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar, 
  Building, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AirtableApplication {
  recordId: string;
  jobTitle: string;
  jobId: string;
  companyName: string;
  appliedAt: string;
  status: 'pending' | 'accepted' | 'closed' | 'denied';
  notes?: string;
  jobDescription?: string;
}

interface ApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenJobDetails?: (jobTitle: string, jobId: string) => void;
}

export function ApplicationsModal({ isOpen, onClose, onOpenJobDetails }: ApplicationsModalProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [withdrawConfirm, setWithdrawConfirm] = useState<{isOpen: boolean, recordId: string, jobTitle: string} | null>(null);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/applications"],
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

  // Withdraw application mutation
  const withdrawMutation = useMutation({
    mutationFn: async (recordId: string) => {
      return await apiRequest('POST', `/api/applications/${recordId}/withdraw`);
    },
    onSuccess: (data, recordId) => {
      toast({
        title: t("applicationsModal.withdrawSuccessTitle"),
        description: t("applicationsModal.withdrawSuccessDescription"),
        variant: "default",
      });
      
      // Invalidate and refetch applications to update the UI
      queryClient.invalidateQueries(["/api/applications"]);
    },
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
        return;
      }
      
      toast({
        title: t("applicationsModal.withdrawErrorTitle"),
        description: error.message || t("applicationsModal.withdrawErrorDescription"),
        variant: "destructive",
      });
    },
  });

  const handleWithdraw = (recordId: string, jobTitle: string, status: string) => {
    // Show custom confirmation modal
    setWithdrawConfirm({ isOpen: true, recordId, jobTitle });
  };

  const confirmWithdraw = () => {
    if (withdrawConfirm) {
      withdrawMutation.mutate(withdrawConfirm.recordId);
      setWithdrawConfirm(null);
    }
  };

  const cancelWithdraw = () => {
    setWithdrawConfirm(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      case 'denied':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const statusLabelKeyMap: Record<string, string> = {
    accepted: "applicationsModal.stats.accepted",
    pending: "applicationsModal.stats.pending",
    closed: "applicationsModal.stats.closed",
    denied: "applicationsModal.stats.denied",
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      accepted: { variant: "default" as const, color: "bg-green-100 text-green-800" },
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      closed: { variant: "outline" as const, color: "bg-gray-100 text-gray-800" },
      denied: { variant: "destructive" as const, color: "bg-red-100 text-red-800" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const labelKey = statusLabelKeyMap[status] || "applicationsModal.stats.pending";
    return (
      <Badge variant={config.variant} className={`${config.color} flex items-center gap-1`}>
        {getStatusIcon(status)}
        {t(labelKey)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const localeMap: Record<string, string> = {
      en: 'en-US',
      ar: 'ar-EG',
      fr: 'fr-FR',
    };
    const locale = localeMap[language] || 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredApplications = applications.filter((app: AirtableApplication) => {
    if (statusFilter === "all") return true;
    return app.status === statusFilter;
  });

  const getApplicationStats = () => {
    const stats = applications.reduce((acc: any, app: AirtableApplication) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: applications.length,
      accepted: stats.accepted || 0,
      pending: stats.pending || 0,
      closed: stats.closed || 0,
      denied: stats.denied || 0,
    };
  };

  const stats = getApplicationStats();

  const getStatusLabel = (status: string) => {
    if (status === "all") {
      return t("applicationsModal.filterOptions.all");
    }
    return t(statusLabelKeyMap[status] || "applicationsModal.stats.pending");
  };

  const handleManualRefresh = () => {
    refetch();
    toast({
      title: t("applicationsModal.refreshToastTitle"),
      description: t("applicationsModal.refreshToastDescription"),
    });
  };

  const emptyStateTitle = statusFilter === "all"
    ? t("applicationsModal.emptyAllTitle")
    : t("applicationsModal.emptyFilteredTitle").replace("{{status}}", getStatusLabel(statusFilter));

  const emptyStateDescription = statusFilter === "all"
    ? t("applicationsModal.emptyAllDescription")
    : t("applicationsModal.emptyFilteredDescription").replace("{{status}}", getStatusLabel(statusFilter));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {t("applicationsModal.title")}
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("applicationsModal.refresh")}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Application Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {stats.total}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{t("applicationsModal.stats.total")}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{t("applicationsModal.stats.accepted")}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{t("applicationsModal.stats.pending")}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{t("applicationsModal.stats.closed")}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{t("applicationsModal.stats.denied")}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("applicationsModal.filterLabel")}
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 glass-card">
                <SelectValue placeholder={t("applicationsModal.filterOptions.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("applicationsModal.filterOptions.all")}</SelectItem>
                <SelectItem value="accepted">{t("applicationsModal.filterOptions.accepted")}</SelectItem>
                <SelectItem value="pending">{t("applicationsModal.filterOptions.pending")}</SelectItem>
                <SelectItem value="closed">{t("applicationsModal.filterOptions.closed")}</SelectItem>
                <SelectItem value="denied">{t("applicationsModal.filterOptions.denied")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {emptyStateTitle}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {emptyStateDescription}
                </p>
              </div>
            ) : (
              filteredApplications.map((application: AirtableApplication) => {
                const appliedDateText = t("applicationsModal.appliedOn").replace("{{date}}", formatDate(application.appliedAt));

                return (
                  <motion.div
                    key={application.recordId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 rounded-lg"
                  >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          {application.jobTitle}
                        </h3>
                        {getStatusBadge(application.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {application.companyName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {appliedDateText}
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 rtl:space-x-reverse">
                    {(application.status === 'pending' || application.status === 'closed') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-2"
                        onClick={() => handleWithdraw(application.recordId, application.jobTitle, application.status)}
                        disabled={withdrawMutation.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                        {withdrawMutation.isPending ? t("applicationsModal.withdrawing") : t("applicationsModal.withdraw")}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2"
                      onClick={() => {
                        onClose(); // Close applications modal
                        onOpenJobDetails?.(application.jobTitle, application.jobId); // Open specific job details
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      {t("applicationsModal.viewDetails")}
                    </Button>
                  </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>

      {/* Withdraw Confirmation Modal */}
      <Dialog open={withdrawConfirm?.isOpen || false} onOpenChange={() => setWithdrawConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              {t("applicationsModal.withdrawModalTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("applicationsModal.withdrawModalDescription").replace("{{jobTitle}}", withdrawConfirm?.jobTitle ?? "")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 rtl:space-x-reverse mt-6">
            <Button
              variant="outline"
              onClick={cancelWithdraw}
              disabled={withdrawMutation.isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmWithdraw}
              disabled={withdrawMutation.isPending}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {withdrawMutation.isPending ? t("applicationsModal.withdrawing") : t("applicationsModal.withdrawConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}