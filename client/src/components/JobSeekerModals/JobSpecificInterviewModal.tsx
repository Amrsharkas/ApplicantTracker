import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeAPI } from "@/hooks/useRealtimeAPI";
import { MessageCircle, User, Mic, MicOff, PhoneOff } from "lucide-react";

interface JobSummary {
  recordId: string;
  jobTitle: string;
  jobDescription?: string;
  companyName: string;
  location?: string;
}

interface SessionData {
  id: string;
  sessionData: {
    questions: { question: string }[];
    responses: { question: string; answer: string }[];
    currentQuestionIndex: number;
  };
  isCompleted: boolean;
  interviewType?: string;
}

interface JobSpecificInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobSummary | null;
  mode: 'text' | 'voice';
  language: 'english' | 'arabic';
}

export function JobSpecificInterviewModal({ isOpen, onClose, job, mode, language }: JobSpecificInterviewModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // Voice realtime
  const realtimeAPI = useRealtimeAPI({
    onMessage: (event) => {
  
      if (event.type === 'response.audio_transcript.done') {
        const aiText = event.transcript;
        if (aiText) {
          setConversationHistory(prev => {
            // Prevent duplicate AI messages
            const isDuplicate = prev.some(msg =>
              msg.role === 'assistant' && msg.content === aiText
            );
            if (isDuplicate) {
              return prev;
            }
            return [...prev, { role: 'assistant', content: aiText }];
          });
        }
      }

      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        const userText = event.transcript;
        if (userText) {
          setConversationHistory(prev => {
            // Prevent duplicate user messages
            const isDuplicate = prev.some(msg =>
              msg.role === 'user' && msg.content === userText
            );
            if (isDuplicate) {
              return prev;
            }
            return [...prev, { role: 'user', content: userText }];
          });
        }
      }
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        setLoading(true);
        // Fetch current session – job-practice already started by options modal
        const res = await fetch('/api/interview/session', { credentials: 'include' });
        const data = await res.json();
          if (!data || data.interviewType !== 'job-practice') {
          toast({ title: 'Interview not found', description: 'Please start the job-specific interview again.', variant: 'destructive' });
          setLoading(false);
          return;
        }
        setSession(data);

        // Initialize conversation history from existing responses
        if (data?.sessionData?.responses) {
          const history: { role: 'user' | 'assistant'; content: string }[] = [];
          for (const response of data.sessionData.responses) {
            history.push({ role: 'assistant', content: response.question });
            history.push({ role: 'user', content: response.answer });
          }
          setConversationHistory(history);
        }

        if (mode === 'voice' && data?.sessionData?.questions) {
          // Connect voice session
          await realtimeAPI.connect({ interviewType: 'job-practice', questions: data.sessionData.questions });
        }
      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || 'Failed to load session', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    // Disconnect on close
    return () => {
      if (realtimeAPI.isConnected) realtimeAPI.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const currentQuestion = useMemo(() => {
    if (!session) return '';
    const { questions = [], responses = [] } = session.sessionData || ({} as any);
    const idx = responses.length;
    return questions[idx]?.question || questions[0]?.question || '';
  }, [session]);

  const submitTextAnswer = async () => {
    if (!session || !currentQuestion) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/interview/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: session.id, question: currentQuestion, answer: currentAnswer, job })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to submit answer');

      if (data.isComplete) {
        toast({ title: 'Interview Complete', description: 'Your job-specific interview has been completed.' });
        onClose();
        return;
      }

      // Update local session
      setSession(prev => prev ? {
        ...prev,
        sessionData: {
          ...prev.sessionData,
          responses: [...(prev.sessionData.responses || []), { question: currentQuestion, answer: currentAnswer }],
          currentQuestionIndex: (prev.sessionData.responses?.length || 0) + 1
        }
      } : prev);

      // Also update conversation history for voice mode consistency
      setConversationHistory(prev => [...prev, { role: 'assistant', content: currentQuestion }, { role: 'user', content: currentAnswer }]);
      setCurrentAnswer("");
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to submit answer', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitVoiceInterview = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/interview/complete-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationHistory, interviewType: 'job-practice', job })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to complete');
      toast({ title: 'Interview Complete', description: 'Your job-specific voice interview has been completed.' });
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to complete interview', variant: 'destructive' });
    } finally {
      if (realtimeAPI.isConnected) realtimeAPI.disconnect();
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Job-specific Interview</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !session ? (
          <div className="text-center text-slate-600 py-12">No active job-specific interview session.</div>
        ) : mode === 'text' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Text mode • {language === 'arabic' ? 'Arabic' : 'English'}</div>
                <h3 className="text-lg font-semibold">{job?.jobTitle}</h3>
              </div>
              <Badge variant="outline">Question {(session.sessionData.responses?.length || 0) + 1} of {session.sessionData.questions?.length || 5}</Badge>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-4">
    
              {/* Display previous Q&A pairs */}
              {session.sessionData.responses?.map((response, index) => (
                <div key={index} className="space-y-3">
                  <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-400">
                    <div className="flex items-start space-x-2 rtl:space-x-reverse">
                      <User className="h-4 w-4 mt-1 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">Question {index + 1}</p>
                        <p className="text-sm text-blue-700">{response.question}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border-l-4 border-green-400 ml-8">
                    <div className="flex items-start space-x-2 rtl:space-x-reverse">
                      <MessageCircle className="h-4 w-4 mt-1 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">Your Answer</p>
                        <p className="text-sm text-green-700">{response.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Current question */}
              <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-400">
                <div className="flex items-start space-x-2 rtl:space-x-reverse">
                  <User className="h-4 w-4 mt-1 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">Question {(session.sessionData.responses?.length || 0) + 1}</p>
                    <p className="text-sm text-blue-700">{currentQuestion}</p>
                  </div>
                </div>
              </div>
            </div>

            <Textarea value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} placeholder="Type your answer here" rows={4} />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={submitting}>Close</Button>
              <Button onClick={submitTextAnswer} disabled={!currentAnswer.trim() || submitting}>
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Voice mode • {language === 'arabic' ? 'Arabic' : 'English'}</div>
                <h3 className="text-lg font-semibold">{job?.jobTitle}</h3>
              </div>
              <Badge variant="outline">Live</Badge>
            </div>

            <div className="p-3 rounded-md border bg-slate-50 text-sm text-slate-600">
              {realtimeAPI.isConnected ? 'You are connected. Speak naturally to answer questions.' : 'Connecting to voice interview...'}
            </div>

            {/* Conversation history for voice mode */}
            <div className="h-48 overflow-y-auto space-y-2 p-2 border rounded-lg bg-gray-50">
              {conversationHistory.length > 0 ? (
                conversationHistory.map((item, index) => (
                  <div key={`${item.role}-${index}`} className={`p-3 rounded-lg ${
                    item.role === 'assistant'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-green-200 bg-green-50 ml-8'
                  }`}>
                    <div className="flex items-start space-x-2 rtl:space-x-reverse">
                      {item.role === 'assistant' ? (
                        <User className="h-4 w-4 mt-1 text-blue-600" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mt-1 text-green-600" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          item.role === 'assistant' ? 'text-blue-800' : 'text-green-800'
                        }`}>
                          {item.role === 'assistant' ? 'AI Interviewer' : 'You'}
                        </p>
                        <p className={`text-sm ${
                          item.role === 'assistant' ? 'text-blue-700' : 'text-green-700'
                        }`}>
                          {item.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-8">
                  <p className="text-sm">No conversation yet. Start speaking when connected...</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { if (realtimeAPI.isConnected) realtimeAPI.disconnect(); onClose(); }} disabled={processing}>
                <PhoneOff className="h-4 w-4 mr-1" /> End
              </Button>
              <Button onClick={submitVoiceInterview} disabled={processing || !realtimeAPI.isConnected}>
                {processing ? 'Submitting...' : 'End & Submit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
