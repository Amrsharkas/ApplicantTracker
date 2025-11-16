import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Mic, MessageCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLanguage } from "@/contexts/LanguageContext";

type InvitedJob = {
  recordId: string;
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  skills?: string[];
};

interface InvitedJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartJobPractice: (job: InvitedJob) => Promise<void> | void;
  onStartJobPracticeVoice: (job: InvitedJob) => Promise<void> | void;
}

export function InvitedJobsModal({ isOpen, onClose, onStartJobPractice, onStartJobPracticeVoice }: InvitedJobsModalProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<InvitedJob | null>(null);
  const [interviewLanguage, setInterviewLanguage] = useState<string>("english");
  const { t } = useLanguage();

  const { data: invited = [], refetch, isLoading } = useQuery({
    queryKey: ["/api/upcoming-interviews"],
    enabled: isOpen,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: t("applicationsModal.unauthorizedTitle"), description: t("applicationsModal.unauthorizedDescription"), variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
      }
    }
  });

  const invitedJobs: InvitedJob[] = useMemo(() => {
    return (invited as any[]).map((i) => ({
      recordId: i.recordId,
      jobTitle: i.jobTitle,
      companyName: i.companyName,
      jobDescription: i.jobDescription || "",
      skills: i.skills || []
    }));
  }, [invited]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refetch(); } finally { setTimeout(() => setIsRefreshing(false), 400); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{t("invitedJobsModal.title")}</DialogTitle>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoading} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t("invitedJobsModal.refreshing") : t("invitedJobsModal.refresh")}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : invitedJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">{t("invitedJobsModal.empty")}</div>
          ) : (
            invitedJobs.map((job) => (
              <motion.div key={job.recordId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold">{job.jobTitle}</h3>
                          <Badge variant="outline">{t("invitedJobsModal.invitedBadge")}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 mb-3">
                          <Building className="w-4 h-4" /> {job.companyName}
                        </div>
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {job.skills.slice(0, 8).map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                      <div className="md:col-span-2">
                        <div className="text-sm text-slate-600 mb-2">{t("invitedJobsModal.selectLanguage")}</div>
                        <Select value={interviewLanguage} onValueChange={setInterviewLanguage}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("invitedJobsModal.languagePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="english">{t("english")}</SelectItem>
                            <SelectItem value="arabic">{t("arabic")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 justify-end rtl:space-x-reverse">
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            setSelectedJob(job);
                            await onStartJobPractice({ ...job, skills: job.skills });
                            onClose();
                          }}
                          className="flex items-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {t("invitedJobsModal.applyText")}
                        </Button>
                        <Button
                          onClick={async () => {
                            setSelectedJob(job);
                            await onStartJobPracticeVoice({ ...job, skills: job.skills });
                            onClose();
                          }}
                          className="flex items-center gap-2"
                        >
                          <Mic className="w-4 h-4" />
                          {t("invitedJobsModal.applyVoice")}
                        </Button>
                      </div>
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


