import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface JobSummary {
  recordId: string;
  jobTitle: string;
  jobDescription?: string;
  companyName: string;
  location?: string;
}

interface JobSpecificInterviewOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobSummary | null;
  onConfirm: (opts: { mode: 'text' | 'voice'; language: 'english' | 'arabic' }) => Promise<void> | void;
}

export function JobSpecificInterviewOptionsModal({ isOpen, onClose, job, onConfirm }: JobSpecificInterviewOptionsModalProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [language, setLanguage] = useState<'english' | 'arabic'>('english');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <DialogTitle>Start interview</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {job && (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{job.jobTitle}</div>
              <div className="text-slate-600">{job.companyName}</div>
            </div>
          )}

          <div className={isSubmitting ? 'opacity-60 pointer-events-none' : ''}>
            <div className="text-sm font-medium mb-2">Interview style</div>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="text" id="mode-text" />
                <Label htmlFor="mode-text">Text</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="voice" id="mode-voice" />
                <Label htmlFor="mode-voice">Voice</Label>
              </div>
            </RadioGroup>
          </div>

          <div className={isSubmitting ? 'opacity-60 pointer-events-none' : ''}>
            <div className="text-sm font-medium mb-2">Language</div>
            <RadioGroup value={language} onValueChange={(v) => setLanguage(v as any)} className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="english" id="lang-en" />
                <Label htmlFor="lang-en">English</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="arabic" id="lang-ar" />
                <Label htmlFor="lang-ar">Arabic</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleStart} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Starting...
                </>
              ) : 'Start'}
            </Button>
          </div>

          {isSubmitting && (
            <div className="text-xs text-slate-500 text-right">Preparing your interview...</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
