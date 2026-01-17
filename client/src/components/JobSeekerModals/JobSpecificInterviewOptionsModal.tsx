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
  onConfirm: (opts: { mode: 'text' | 'voice'; language: 'english' | 'arabic' | 'egyptian-arabic' }) => Promise<void> | void;
}

export function JobSpecificInterviewOptionsModal({ isOpen, onClose, job, onConfirm }: JobSpecificInterviewOptionsModalProps) {
  // Debug: Log the environment variable value and its type
  const enableTextInterviews = import.meta.env.VITE_ENABLE_TEXT_INTERVIEWS;
  const [mode, setMode] = useState<'text' | 'voice'>(enableTextInterviews === 'true' ? 'text' : 'voice');
  const [language, setLanguage] = useState<'english' | 'arabic' | 'egyptian-arabic' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [showInstructionsStep, setShowInstructionsStep] = useState(true);
  const [instructionsCountdown, setInstructionsCountdown] = useState(60);
  const { t } = useLanguage();

  // Determine if job has a specific interview language
  const hasJobLanguage = job?.interviewLanguage && job.interviewLanguage.trim() !== '';

  console.log({
    job,
  });

  // Extract language directly without fallback to avoid defaulting to english
  const jobLanguage = hasJobLanguage ? (() => {
    const jobLang = job.interviewLanguage!.toLowerCase().trim();
    if (jobLang === 'arabic' || jobLang === 'ar' || jobLang === 'العربية') {
      return 'arabic';
    }
    if (jobLang === 'english' || jobLang === 'en' || jobLang === 'eng') {
      return 'english';
    }
    return 'english'; // fallback only if job specifies an unknown language
  })() : null;

  // Auto-set language when job has interviewLanguage specified, but don't default to anything if null
  useEffect(() => {
    if (hasJobLanguage && jobLanguage) {
      setLanguage(jobLanguage);
    } else {
      setLanguage(null);
    }
  }, [hasJobLanguage, jobLanguage]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    const checkDevice = () => {
      const userAgent = navigator.userAgent || '';
      const isTouchDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(userAgent);
      const isSmallViewport = window.matchMedia('(max-width: 1024px)').matches;
      setIsMobileOrTablet(isTouchDevice || isSmallViewport);
    };

    checkDevice();
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleChange = () => checkDevice();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowInstructionsStep(true);
      setInstructionsCountdown(60);
      return;
    }

    if (!showInstructionsStep) {
      setInstructionsCountdown(60);
      return;
    }

    const timer = setInterval(() => {
      setInstructionsCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, showInstructionsStep]);

  const handleStart = async () => {
    if (isSubmitting || !language || isMobileOrTablet) return;
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
      <DialogContent
        className="max-w-md max-h-[70vh] flex flex-col"
        onInteractOutside={(e) => {
          if (isMobileOrTablet) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isMobileOrTablet) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("jobSpecificInterviewOptions.title")}</DialogTitle>
        </DialogHeader>

        {isMobileOrTablet ? (
          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This interview cannot be started on mobile or tablet devices. Please use a desktop device.
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { window.location.href = "/dashboard/job-interviews"; }}>
                Go to Job Interviews
              </Button>
            </div>
          </div>
        ) : showInstructionsStep ? (
          <div className="flex flex-col min-h-0">
            <div className="space-y-4 overflow-y-auto pr-1">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Please read these instructions carefully before starting your interview.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <span className="mt-0.5 text-amber-600">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Invitation will be canceled if you exit now</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      If you read all instructions, wait for the 1-minute countdown, then click Continue, leaving at this stage will cancel your invitation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="mt-0.5 text-red-600">🖥️</span>
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Don't Press F11 or Exit Fullscreen Mode</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <strong>CRITICAL:</strong> The interview will automatically start in fullscreen mode. <strong>Do NOT press F11 or exit fullscreen mode</strong> during the interview. If you exit fullscreen, your interview will be automatically cancelled.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="mt-0.5 text-red-600">📋</span>
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Don't Copy Anything or Use Keyboard Keys</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <strong>CRITICAL:</strong> During the interview, <strong>do NOT copy anything or use keyboard keys</strong> for typing or shortcuts. However, you may use keyboard keys to adjust speaker volume or toggle microphone if needed. Copying, pasting, or typing text will result in immediate interview cancellation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="mt-0.5 text-red-600">👀</span>
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Don't Look Away While Interview</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <strong>IMPORTANT:</strong> Stay focused and engaged throughout the interview. <strong>Do NOT look away</strong> from the screen or camera during the interview. Maintain eye contact with the camera to show your engagement and professionalism.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="mt-0.5 text-red-600">🎥</span>
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Stay Always in Front of the Camera</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <strong>REQUIRED:</strong> You must <strong>stay always in front of the camera</strong> during the entire interview. Do not move away from the camera or leave the frame. Ensure your face is clearly visible and well-lit throughout the interview session.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="mt-0.5 text-red-600">❌</span>
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Don't Click Exit Button or X Icon</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <strong>WARNING:</strong> <strong>Do NOT click the exit button or X icon</strong> because your interview will be cancelled. The X icon (close button) in the top-right corner works exactly like the "Exit Interview" button. Clicking either will <strong>cancel your interview immediately</strong>. Only use these buttons if you absolutely need to exit, as it will result in interview cancellation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <span className="mt-0.5 text-yellow-600">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">No Tab Switching or Window Changes</h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      <strong>IMPORTANT:</strong> Do not switch tabs, minimize the window, or open other applications during the interview. The system monitors your activity, and switching away from the interview may result in cancellation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <span className="mt-0.5 text-green-600">🔊</span>
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">Allowed: Volume and Microphone Controls</h4>
                    <p className="text-sm text-green-800 dark:text-green-300">
                      You may use keyboard keys to <strong>adjust speaker volume</strong> (volume up/down keys) or <strong>toggle microphone</strong> if needed. These controls are allowed to ensure you can properly hear and be heard during the interview.
                    </p>
                  </div>
                </div>
              </div>
              {instructionsCountdown > 0 && (
                <div className="text-sm text-amber-600">
                  Please wait {instructionsCountdown}s before continuing.
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => setShowInstructionsStep(false)}
                disabled={instructionsCountdown > 0}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
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
                // Job has a specific language - show locked options
                jobLanguage === 'arabic' ? (
                  // Arabic is set - show both Arabic options enabled, English locked
                  <div className="space-y-2">
                    <RadioGroup value={language || undefined} onValueChange={(v) => setLanguage(v as any)} className="space-y-2">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                        <RadioGroupItem value="arabic" id="lang-ar" />
                        <Label htmlFor="lang-ar">Arabic</Label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                        <RadioGroupItem value="egyptian-arabic" id="lang-eg-ar" />
                        <Label htmlFor="lang-eg-ar">Egyptian Arabic</Label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3 opacity-50 cursor-not-allowed">
                        <RadioGroupItem value="english" id="lang-en" disabled />
                        <Label htmlFor="lang-en" className="cursor-not-allowed">English (Locked)</Label>
                      </div>
                    </RadioGroup>
                    <div className="text-xs text-slate-500">{t("jobSpecificInterviewOptions.setByJob")}</div>
                  </div>
                ) : (
                  // English is set - lock Arabic options
                  <div className="space-y-2">
                    <RadioGroup value={language || undefined} onValueChange={(v) => setLanguage(v as any)} className="space-y-2">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                        <RadioGroupItem value="english" id="lang-en" />
                        <Label htmlFor="lang-en">English</Label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3 opacity-50 cursor-not-allowed">
                        <RadioGroupItem value="arabic" id="lang-ar" disabled />
                        <Label htmlFor="lang-ar" className="cursor-not-allowed">Arabic (Locked)</Label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3 opacity-50 cursor-not-allowed">
                        <RadioGroupItem value="egyptian-arabic" id="lang-eg-ar" disabled />
                        <Label htmlFor="lang-eg-ar" className="cursor-not-allowed">Egyptian Arabic (Locked)</Label>
                      </div>
                    </RadioGroup>
                    <div className="text-xs text-slate-500">{t("jobSpecificInterviewOptions.setByJob")}</div>
                  </div>
                )
              ) : (
                // No job language set - show all options, no default selection
                <RadioGroup value={language || undefined} onValueChange={(v) => setLanguage(v as any)} className="space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                    <RadioGroupItem value="english" id="lang-en" />
                    <Label htmlFor="lang-en">English</Label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                    <RadioGroupItem value="arabic" id="lang-ar" />
                    <Label htmlFor="lang-ar">Arabic</Label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse border rounded-md p-3">
                    <RadioGroupItem value="egyptian-arabic" id="lang-eg-ar" />
                    <Label htmlFor="lang-eg-ar">Egyptian Arabic</Label>
                  </div>
                </RadioGroup>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
              <Button onClick={handleStart} disabled={isSubmitting || !language || isMobileOrTablet}>
                {isSubmitting ? (
                  <>
                    <span className="mr-2 inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t("interview.startingInterview")}
                  </>
                ) : t("interview.start")}
              </Button>
            </div>

            {isMobileOrTablet && (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                This interview not allowd to be done on mobile or tablet and its allowd only on desktop devices.
              </div>
            )}

            {isSubmitting && (
              <div className="text-xs text-slate-500 text-right">{t("jobSpecificInterviewOptions.preparing")}</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
