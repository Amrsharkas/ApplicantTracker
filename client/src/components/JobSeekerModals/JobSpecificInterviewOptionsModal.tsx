import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getInterviewLanguage } from "@/lib/interviewUtils";
import { useLanguage } from "@/contexts/LanguageContext";

interface JobSummary {
  recordId: string;
  jobTitle: string;
  jobDescription?: string;
  companyName: string;
  location?: string;
  interviewLanguage?: string;
}

interface JobSpecificInterviewOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobSummary | null;
  onConfirm: (opts: { mode: 'text' | 'voice'; language: 'english' | 'arabic' }) => Promise<void> | void;
}

export function JobSpecificInterviewOptionsModal({ isOpen, onClose, job, onConfirm }: JobSpecificInterviewOptionsModalProps) {
  // Debug: Log the environment variable value and its type
  const enableTextInterviews = import.meta.env.VITE_ENABLE_TEXT_INTERVIEWS;
  const [mode, setMode] = useState<'text' | 'voice'>(enableTextInterviews === 'true' ? 'text' : 'voice');
  const [language, setLanguage] = useState<'english' | 'arabic'>('english');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();
  
  // Determine if job has a specific interview language
  const hasJobLanguage = job?.interviewLanguage && job.interviewLanguage.trim() !== '';
  const jobLanguage = hasJobLanguage ? getInterviewLanguage(job, 'english') : null;

  // Auto-set language when job has interviewLanguage specified
  useEffect(() => {
    if (hasJobLanguage && jobLanguage) {
      setLanguage(jobLanguage);
    }
  }, [hasJobLanguage, jobLanguage]);

  const handleStart = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm({ mode, language });
    } finally {
      // keep disabled until parent closes modal; if parent keeps it open, allow retry
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("jobSpecificInterviewOptions.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {job && (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{job.jobTitle}</div>
              <div className="text-slate-600">{job.companyName}</div>
            </div>
          )}

          <div className={isSubmitting ? 'opacity-60 pointer-events-none' : ''}>
            <div className="text-sm font-medium mb-2">{t("jobSpecificInterviewOptions.interviewStyle")}</div>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className={`${enableTextInterviews === 'true' ? 'grid grid-cols-2' : ''} gap-3`}>
              {enableTextInterviews === 'true' && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                  <RadioGroupItem value="text" id="mode-text" />
                  <Label htmlFor="mode-text">{t("jobSpecificInterviewOptions.textMode")}</Label>
                </div>
              )}
              <div className={`flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3 ${enableTextInterviews === 'true' ? '' : 'w-full'}`}>
                <RadioGroupItem value="voice" id="mode-voice" />
                <Label htmlFor="mode-voice">{t("jobSpecificInterviewOptions.voiceMode")}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className={isSubmitting ? 'opacity-60 pointer-events-none' : ''}>
            <div className="text-sm font-medium mb-2">{t("jobSpecificInterviewOptions.languageLabel")}</div>
            {hasJobLanguage ? (
              <div className="rounded-md border p-3 bg-slate-50">
                <div className="text-sm">
                  <span className="font-medium">
                    {jobLanguage === 'arabic' ? t("arabic") : t("english")}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">{t("jobSpecificInterviewOptions.setByJob")}</span>
                </div>
              </div>
            ) : (
              <RadioGroup value={language} onValueChange={(v) => setLanguage(v as any)} className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                  <RadioGroupItem value="english" id="lang-en" />
                  <Label htmlFor="lang-en">{t("english")}</Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                  <RadioGroupItem value="arabic" id="lang-ar" />
                  <Label htmlFor="lang-ar">{t("arabic")}</Label>
                </div>
              </RadioGroup>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={handleStart} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {t("interview.startingInterview")}
                </>
              ) : t("interview.start")}
            </Button>
          </div>

          {isSubmitting && (
            <div className="text-xs text-slate-500 text-right">{t("jobSpecificInterviewOptions.preparing")}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
