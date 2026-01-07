import { useEffect, useMemo, useState, useRef } from "react";
import Hls from "hls.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, User, Download, Loader2, Lightbulb, Video, Play, Clock, Timer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TranscriptionItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ParsedQA {
  question: string;
  answer: string;
  feedbackTitle?: string;
  feedback: string;
  questionTimestamp: number;
  answerTimestamp: number;
}

interface InterviewSession {
  id: number;
  userId: string;
  interviewType: string;
  sessionData: {
    responses: TranscriptionItem[];
    questions?: { question: string }[];
  };
  isCompleted: boolean;
  createdAt: string;
}

interface InterviewRecording {
  id: number;
  sessionId: number;
  recordingUrl: string;
  createdAt: string;
}

interface InterviewTranscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  initialTranscription?: TranscriptionItem[];
}

export function InterviewTranscriptionDialog({ isOpen, onClose, sessionId, initialTranscription }: InterviewTranscriptionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [recording, setRecording] = useState<InterviewRecording | null>(null);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [parsedQA, setParsedQA] = useState<ParsedQA[]>([]);
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionItem[]>([]);
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate interview start time from parsed Q&A data
  const interviewStartTime = useMemo(() => {
    if (parsedQA.length > 0) {
      // Use the first question timestamp as the start
      return parsedQA[0].questionTimestamp;
    }
    if (transcriptionData.length > 0) {
      return Math.min(...transcriptionData.map(item => item.timestamp));
    }
    return 0;
  }, [parsedQA, transcriptionData]);

  // Format timestamp as relative time from interview start (e.g., "0:45", "2:30")
  const formatRelativeTime = (timestamp: number) => {
    // Handle case where timestamp might already be in seconds (small number) vs milliseconds
    const normalizedTimestamp = timestamp > 1e10 ? timestamp : timestamp * 1000;
    const normalizedStart = interviewStartTime > 1e10 ? interviewStartTime : interviewStartTime * 1000;

    const elapsed = Math.max(0, Math.floor((normalizedTimestamp - normalizedStart) / 1000));
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format duration between two timestamps (e.g., "45s", "1m 30s")
  const formatDuration = (start: number, end: number) => {
    // Handle case where timestamps might be in seconds vs milliseconds
    const normalizedStart = start > 1e10 ? start : start * 1000;
    const normalizedEnd = end > 1e10 ? end : end * 1000;

    const seconds = Math.max(0, Math.floor((normalizedEnd - normalizedStart) / 1000));
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Fetch recording with polling for processing state
  const fetchRecording = async () => {
    try {
      const recordingRes = await fetch(`/api/interview/recording/${sessionId}`, {
        credentials: 'include'
      });
      if (recordingRes.ok) {
        const recordingData = await recordingRes.json();

        // Check if video is still processing
        if (recordingData.recordingUrl === 'processing') {
          setVideoProcessing(true);
          setRecording(null);

          // Start polling if not already polling
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(async () => {
              try {
                const pollRes = await fetch(`/api/interview/recording/${sessionId}`, {
                  credentials: 'include'
                });
                if (pollRes.ok) {
                  const pollData = await pollRes.json();
                  if (pollData.recordingUrl && pollData.recordingUrl !== 'processing') {
                    // Video is ready
                    setRecording(pollData);
                    setVideoProcessing(false);
                    // Stop polling
                    if (pollingIntervalRef.current) {
                      clearInterval(pollingIntervalRef.current);
                      pollingIntervalRef.current = null;
                    }
                  }
                }
              } catch (err) {
                console.log('Error polling for recording:', err);
              }
            }, 5000); // Poll every 5 seconds
          }
        } else {
          // Video is ready
          setRecording(recordingData);
          setVideoProcessing(false);
        }
      }
    } catch (err) {
      console.log('No recording found for this session');
    }
  };

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch session data
        const sessionRes = await fetch(`/api/interview/session/${sessionId}`, {
          credentials: 'include'
        });
        if (!sessionRes.ok) throw new Error(t("interviewTranscriptionDialog.toastErrorDescription"));
        const sessionData = await sessionRes.json();
        setSession(sessionData);

        // Fetch recording - start polling if still processing
        await fetchRecording();

        // Use initialTranscription if provided (for immediate display before server save completes)
        // Otherwise fall back to session data
        // IMPORTANT: Only use conversationHistory format (role/content), not Q&A format (question/answer)
        let transcriptionToUse = null;

        if (initialTranscription && initialTranscription.length > 0) {
          // Validate that initialTranscription is in conversationHistory format (has role/content)
          const isValidFormat = initialTranscription.every((item: any) =>
            item.role && item.content && (item.role === 'assistant' || item.role === 'user')
          );
          if (isValidFormat) {
            transcriptionToUse = initialTranscription;
          }
        }

        // If no valid initialTranscription, try sessionData.responses (conversationHistory format)
        if (!transcriptionToUse && sessionData?.sessionData?.responses) {
          const sessionResponses = sessionData.sessionData.responses;
          // Check if it's conversationHistory format (role/content) not Q&A format (question/answer)
          const isConversationFormat = Array.isArray(sessionResponses) && sessionResponses.length > 0 &&
            sessionResponses.every((item: any) =>
              item.role && item.content && (item.role === 'assistant' || item.role === 'user')
            );
          if (isConversationFormat) {
            transcriptionToUse = sessionResponses;
          }
        }

        console.log('InterviewTranscriptionDialog - Using transcription:', {
          hasInitial: !!initialTranscription,
          initialLength: initialTranscription?.length,
          hasSessionResponses: !!sessionData?.sessionData?.responses,
          sessionResponsesLength: sessionData?.sessionData?.responses?.length,
          usingLength: transcriptionToUse?.length,
          transcriptionFormat: transcriptionToUse?.[0] ? (transcriptionToUse[0].role ? 'conversationHistory' : 'unknown') : 'none'
        });

        // Store transcription data for timestamp calculations
        // Only process if we have actual conversationHistory format with both questions and answers
        if (transcriptionToUse && transcriptionToUse.length > 0) {
          // Validate that we have at least one user response (answer)
          const hasUserResponses = transcriptionToUse.some((item: any) => item.role === 'user' && item.content && item.content.trim().length > 0);

          if (hasUserResponses) {
            setTranscriptionData(transcriptionToUse);
            await parseTranscription(transcriptionToUse);
          } else {
            console.log('InterviewTranscriptionDialog - No user responses found, skipping parsing');
            setParsedQA([]);
          }
        } else {
          console.log('InterviewTranscriptionDialog - No transcription data available');
          setParsedQA([]);
        }
      } catch (error: any) {
        toast({
          title: t("interviewTranscriptionDialog.toastErrorTitle"),
          description: error.message || t("interviewTranscriptionDialog.toastErrorDescription"),
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup polling when dialog closes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, sessionId, t, initialTranscription]);

  // Set up HLS playback when recording URL is available
  useEffect(() => {
    const video = videoRef.current;
    const videoUrl = recording?.recordingUrl;

    if (!video || !videoUrl) return;

    // Check if this is an HLS stream (m3u8 file)
    const isHLS = videoUrl.includes('.m3u8');

    if (isHLS) {
      if (Hls.isSupported()) {
        // Clean up previous HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            toast({
              title: 'Video playback error',
              description: 'Failed to load video stream',
              variant: 'destructive'
            });
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = videoUrl;
      }
    } else {
      // Regular video file
      video.src = videoUrl;
    }

    // Cleanup on unmount or when recording URL changes
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [recording?.recordingUrl, toast]);

  const parseTranscription = async (transcription: TranscriptionItem[]) => {
    try {
      setParsing(true);

      // Call AI API to parse the transcription into Q&A pairs
      const response = await fetch('/api/interview/parse-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transcription })
      });

      if (!response.ok) throw new Error(t("interviewTranscriptionDialog.parsingFailedDescription"));

      const data = await response.json();
      console.log('Parsed QA data:', data.parsedQA);
      if (data.parsedQA?.length > 0) {
        console.log('First QA timestamps:', {
          questionTimestamp: data.parsedQA[0].questionTimestamp,
          answerTimestamp: data.parsedQA[0].answerTimestamp,
          type: typeof data.parsedQA[0].questionTimestamp
        });
      }
      setParsedQA(data.parsedQA || []);
    } catch (error: any) {
      toast({
        title: t("interviewTranscriptionDialog.parsingFailedTitle"),
        description: error.message || t("interviewTranscriptionDialog.parsingFailedDescription"),
        variant: 'destructive'
      });
      // Fall back to simple parsing
      const simple = simpleParseTranscription(transcription);
      setParsedQA(simple);
    } finally {
      setParsing(false);
    }
  };

  // Simple fallback parsing when AI is not available
  const simpleParseTranscription = (transcription: TranscriptionItem[]): ParsedQA[] => {
    const qa: ParsedQA[] = [];

    for (let i = 0; i < transcription.length - 1; i++) {
      const current = transcription[i];
      const next = transcription[i + 1];

      // ONLY include Q&A pairs where BOTH question AND answer exist
      if (current.role === 'assistant' && next.role === 'user' && next.content && next.content.trim().length > 0) {
        qa.push({
          question: current.content,
          answer: next.content,
          feedback: t("interviewTranscriptionDialog.feedbackUnavailable"),
          questionTimestamp: current.timestamp,
          answerTimestamp: next.timestamp
        });
      }
    }

    return qa;
  };

  const hasMeaningfulFeedback = (feedback?: string) => {
    if (!feedback) return false;
    const normalized = feedback.trim().toLowerCase();
    const fallbackValues = [
      'feedback not available',
      t("interviewTranscriptionDialog.feedbackUnavailable").trim().toLowerCase(),
    ];
    return !fallbackValues.includes(normalized);
  };

  const downloadTranscript = () => {
    if (transcriptionData.length === 0) return;

    const content = transcriptionData
      .map(item => `[${formatRelativeTime(item.timestamp)}] ${item.role === 'assistant' ? 'Interviewer' : 'You'}: ${item.content}`)
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-transcript-${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{t("interviewTranscriptionDialog.title")}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{session?.interviewType}</Badge>
                {session?.createdAt && (
                  <span className="text-sm text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                )}
                {parsedQA.length > 0 && (
                  <Badge variant="secondary">{parsedQA.length} Questions</Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTranscript}
            >
              <Download className="h-4 w-4 mr-2" />
              {t("interviewTranscriptionDialog.download")}
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Column - Video Player (sticky on desktop) */}
          <div className="lg:w-2/5 shrink-0 border-b lg:border-b-0 lg:border-r bg-muted/30">
            <div className="p-4 h-full flex flex-col">
              {recording?.recordingUrl ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{t("interviewTranscriptionDialog.recordingTitle")}</span>
                  </div>
                  <div className="flex-1 bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      controls
                      className="w-full h-full object-contain"
                    >
                      {t("interviewTranscriptionDialog.videoFallback")}
                    </video>
                  </div>
                </div>
              ) : videoProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                  <Loader2 className="h-12 w-12 mb-3 animate-spin text-primary" />
                  <span className="text-sm font-medium">Processing video...</span>
                  <span className="text-xs mt-1">This may take a few minutes</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                  <Play className="h-12 w-12 mb-2 opacity-30" />
                  <span className="text-sm">No recording available</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Q&A Cards */}
          <div className="flex-1 overflow-y-auto p-4">
            {parsing ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                <span className="text-sm text-muted-foreground">{t("interviewTranscriptionDialog.parsing")}</span>
              </div>
            ) : parsedQA.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
                <span className="text-sm">No Q&A data available</span>
              </div>
            ) : (
              <div className="space-y-4">
                {parsedQA.map((qa, index) => (
                  <div key={index} className="space-y-3">
                    {/* Q&A Card */}
                    <div className="border rounded-lg overflow-hidden bg-card shadow-xs">
                      {/* Header with Question Number and Timestamps */}
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                        <span className="text-sm font-semibold text-foreground">
                          {t("interviewTranscriptionDialog.questionLabel").replace("{{index}}", (index + 1).toString())}
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatRelativeTime(qa.questionTimestamp)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded">
                            <Timer className="h-3 w-3" />
                            <span className="font-medium">{formatDuration(qa.questionTimestamp, qa.answerTimestamp)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Question Section */}
                      <div className="px-4 py-3 border-b bg-blue-50/50 dark:bg-blue-950/20">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Interviewer</span>
                              <span className="text-xs text-muted-foreground font-mono">@ {formatRelativeTime(qa.questionTimestamp)}</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">
                              {qa.question}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Answer Section */}
                      <div className="px-4 py-3 bg-green-50/50 dark:bg-green-950/20">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageCircle className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-green-700 dark:text-green-400">{t("interviewTranscriptionDialog.answerLabel")}</span>
                              <span className="text-xs text-muted-foreground font-mono">@ {formatRelativeTime(qa.answerTimestamp)}</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">
                              {qa.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Separate Feedback Card */}
                    {hasMeaningfulFeedback(qa.feedback) && (
                      <div className="border rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 shadow-xs">
                        <div className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                              <Lightbulb className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                  {qa.feedbackTitle || t("interviewTranscriptionDialog.aiFeedback")}
                                </span>
                              </div>
                              <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                                {qa.feedback}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end shrink-0">
          <Button onClick={onClose}>{t("interviewTranscriptionDialog.close")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
