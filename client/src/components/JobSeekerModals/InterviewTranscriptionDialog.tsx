import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, User, Clock, Download, Loader2, Lightbulb } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TranscriptionItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ParsedQA {
  question: string;
  answer: string;
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
}

export function InterviewTranscriptionDialog({ isOpen, onClose, sessionId }: InterviewTranscriptionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [recording, setRecording] = useState<InterviewRecording | null>(null);
  const [parsedQA, setParsedQA] = useState<ParsedQA[]>([]);
  const [showRawTranscript, setShowRawTranscript] = useState(false);
  const { t, language } = useLanguage();
  const localeMap: Record<string, string> = {
    en: 'en-US',
    ar: 'ar-EG',
    fr: 'fr-FR',
  };
  const locale = localeMap[language] || 'en-US';

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

        // Fetch recording if available
        try {
          const recordingRes = await fetch(`/api/interview/recording/${sessionId}`, {
            credentials: 'include'
          });
          if (recordingRes.ok) {
            const recordingData = await recordingRes.json();
            setRecording(recordingData);
          }
        } catch (err) {
          console.log('No recording found for this session');
        }

        // Auto-parse the transcription
        if (sessionData?.sessionData?.responses) {
          await parseTranscription(sessionData.sessionData.responses);
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
  }, [isOpen, sessionId, t]);

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

      if (current.role === 'assistant' && next.role === 'user') {
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

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (start: number, end: number) => {
    const seconds = Math.floor((end - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return t("interviewTranscriptionDialog.durationFormat")
      .replace("{{minutes}}", mins.toString())
      .replace("{{seconds}}", secs.toString());
  };

  const downloadTranscript = () => {
    if (!session?.sessionData?.responses) return;

    const content = session.sessionData.responses
      .map(item => `[${formatTimestamp(item.timestamp)}] ${item.role === 'assistant' ? t("interviewTranscriptionDialog.roles.aiShort") : t("interviewTranscriptionDialog.roles.userShort")}: ${item.content}`)
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
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{t("interviewTranscriptionDialog.title")}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{session?.interviewType}</Badge>
                {session?.createdAt && (
                  <span className="text-sm text-gray-500">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawTranscript(!showRawTranscript)}
              >
                {showRawTranscript ? t("interviewTranscriptionDialog.toggleShowQA") : t("interviewTranscriptionDialog.toggleShowRaw")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTranscript}
              >
                <Download className="h-4 w-4 mr-2" />
                {t("interviewTranscriptionDialog.download")}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Recording Player */}
          {recording?.recordingUrl && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t("interviewTranscriptionDialog.recordingTitle")}</span>
              </div>
              <video
                controls
                className="w-full rounded-lg"
                src={recording.recordingUrl}
              >
                {t("interviewTranscriptionDialog.videoFallback")}
              </video>
            </div>
          )}

          {/* Transcription Content */}
          <div className="flex-1 overflow-y-auto">
            {parsing ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                <span className="text-sm text-gray-600">{t("interviewTranscriptionDialog.parsing")}</span>
              </div>
            ) : showRawTranscript ? (
              <div className="space-y-3">
                {session?.sessionData?.responses?.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      item.role === 'assistant'
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-green-50 border-green-400 ml-8'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.role === 'assistant' ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          item.role === 'assistant' ? 'text-blue-800' : 'text-green-800'
                        }`}>
                          {item.role === 'assistant' ? t("interviewTranscriptionDialog.roles.ai") : t("interviewTranscriptionDialog.roles.user")}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      item.role === 'assistant' ? 'text-blue-700' : 'text-green-700'
                    }`}>
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {parsedQA.map((qa, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">
                            {t("interviewTranscriptionDialog.questionLabel").replace("{{index}}", (index + 1).toString())}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(qa.questionTimestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 pl-6">{qa.question}</p>
                    </div>

                    <div className="ml-6 pl-4 border-l-2 border-green-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-800">
                            {t("interviewTranscriptionDialog.answerLabel")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {formatDuration(qa.questionTimestamp, qa.answerTimestamp)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(qa.answerTimestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-green-700">{qa.answer}</p>

                      {/* Feedback Section */}
                      {hasMeaningfulFeedback(qa.feedback) && (
                        <div className="mt-4 pt-4 border-t border-green-100">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-sm font-semibold text-amber-800 block mb-1">
                                {t("interviewTranscriptionDialog.aiFeedback")}
                              </span>
                              <p className="text-sm text-amber-700 leading-relaxed">
                                {qa.feedback}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4 flex justify-end">
          <Button onClick={onClose}>{t("interviewTranscriptionDialog.close")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
