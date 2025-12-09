import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeAPI } from "@/hooks/useRealtimeAPI";
import { useCameraRecorder } from '@/hooks/useCameraRecorder';
import { MessageCircle, MessageSquare, User, Mic, MicOff, PhoneOff, Video, Circle, CheckCircle } from "lucide-react";
import { CameraPreview } from '@/components/CameraPreview';
import { getInterviewLanguage, getLanguageDisplayName } from '@/lib/interviewUtils';
import { InterviewTranscriptionDialog } from './InterviewTranscriptionDialog';

interface JobSummary {
  recordId: string;
  jobTitle: string;
  jobDescription?: string;
  companyName: string;
  location?: string;
  aiPrompt?: string;
  interviewLanguage?: string;
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
  onInterviewComplete?: () => void;
}

export function JobSpecificInterviewModal({ isOpen, onClose, job, mode, language, onInterviewComplete }: JobSpecificInterviewModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: number }[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showTranscription, setShowTranscription] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [showTranscriptionDialog, setShowTranscriptionDialog] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<number | null>(null);
  const { isRecording, uploadProgress, startRecording, stopRecording, cleanup } = useCameraRecorder();

  // Debug: Log the environment variable value and its type
  const enableTextInterviews = import.meta.env.VITE_ENABLE_TEXT_INTERVIEWS;

  const startCameraAccess = async (sessionData?: SessionData) => {
    try {
      // Use provided sessionData or fall back to state
      const currentSession = sessionData || session;

      if (!currentSession?.id) {
        console.error('Cannot start recording: No session ID available');
        toast({
          title: 'Recording Error',
          description: 'Session not initialized. Please try again.',
          variant: 'destructive'
        });
        return null;
      }

      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 854 },     // Reduced to 480p (was 720p)
          height: { ideal: 480, max: 480 },    // 480p resolution
          frameRate: { ideal: 15, max: 20 },   // Reduced frame rate (was 30fps)
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,                   // Lower sample rate (was 48kHz)
          channelCount: 1                      // Mono audio (was stereo)
        },
      });
      setCameraStream(videoStream);

      // Note: We'll start recording with AI audio stream after connection
      // This is handled in the useEffect that connects the realtime API
      console.log('📹 Camera stream ready for session:', currentSession.id);

      return videoStream;
    } catch (error) {
      console.error('Camera access error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      toast({
        title: 'Camera Access Failed',
        description: 'Could not access camera. You can continue with audio only.',
        variant: 'destructive'
      });
      return null;
    }
  };

  // Voice realtime
  const realtimeAPI = useRealtimeAPI({
    requireCamera: false, // Don't require camera in realtime API since we'll handle it separately
    onInterviewComplete: () => {
      console.log('🎯 Interview completion callback triggered in JobSpecificInterviewModal');
      setIsInterviewComplete(true);
    },
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
            return [...prev, { role: 'assistant', content: aiText, timestamp: Date.now() }];
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
            return [...prev, { role: 'user', content: userText, timestamp: Date.now() }];
          });
        }
      }
    }
  });

  // Start recording when both camera and AI audio are ready
  useEffect(() => {
    if (mode === 'voice' && cameraStream && realtimeAPI.aiAudioStream && session?.id && !isRecording) {
      console.log('🎬 Both camera and AI audio ready - starting recording with mixed audio');
      startRecording(cameraStream, session.id.toString(), realtimeAPI.aiAudioStream);
    }
  }, [cameraStream, realtimeAPI.aiAudioStream, session?.id, mode, isRecording, startRecording]);

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
          const history: { role: 'user' | 'assistant'; content: string; timestamp: number }[] = [];
          const baseTimestamp = Date.now() - (data.sessionData.responses.length * 60000); // Estimate 1min per Q&A
          for (let i = 0; i < data.sessionData.responses.length; i++) {
            const response = data.sessionData.responses[i];
            history.push({ role: 'assistant', content: response.question, timestamp: baseTimestamp + (i * 60000) });
            history.push({ role: 'user', content: response.answer, timestamp: baseTimestamp + (i * 60000) + 30000 });
          }
          setConversationHistory(history);
        }

        if (mode === 'voice' && data?.sessionData?.questions) {
          // Start camera access first (pass data directly since state hasn't updated yet)
          await startCameraAccess(data);
          // Use job-specific interview language, fallback to provided language
          const interviewLanguage = getInterviewLanguage(job, language);
          console.log('🎤 Using interview language:', interviewLanguage, 'from job:', job?.interviewLanguage);
          // Then connect voice session with job and AI profile context
          const interviewContext = data.sessionData?.context?.interviewContext || null;
          console.log('📋 Passing interview context to realtime API:', {
            hasJobContext: !!interviewContext?.jobContext,
            hasCandidateProfile: !!interviewContext?.candidateProfile
          });
          await realtimeAPI.connect({
            interviewType: 'job-practice',
            questions: data.sessionData.questions,
            language: interviewLanguage,
            aiPrompt: job?.aiPrompt,
            interviewContext
          });
        }
      } catch (e: any) {
        toast({ title: 'Error', description: e?.message || 'Failed to load session', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    // Disconnect on close - cleanup function
    return () => {
      console.log('🧹 Cleanup: Disconnecting OpenAI and stopping camera...');

      // Disconnect OpenAI realtime session
      if (realtimeAPI.isConnected) {
        console.log('🔌 Disconnecting OpenAI session...');
        realtimeAPI.disconnect();
      }

      // Stop recording
      cleanup();

      // Stop camera stream
      if (cameraStream) {
        console.log('📹 Stopping camera tracks...');
        cameraStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped track: ${track.kind}`);
        });
        setCameraStream(null);
      }

      console.log('✅ Cleanup complete');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Centralized cleanup function
  const performCleanup = useCallback(() => {
    console.log('🧹 Performing cleanup...');

    // Disconnect OpenAI realtime session
    if (realtimeAPI.isConnected) {
      console.log('🔌 Disconnecting OpenAI session...');
      realtimeAPI.disconnect();
    }

    // Stop recording
    cleanup();

    // Stop camera stream
    if (cameraStream) {
      console.log('📹 Stopping camera tracks...');
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}`);
      });
      setCameraStream(null);
    }

    console.log('✅ Cleanup complete');
  }, [realtimeAPI, cleanup, cameraStream]);

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
        onInterviewComplete?.();

        // Show transcription dialog
        if (session?.id) {
          setCompletedSessionId(session.id);
          setShowTranscriptionDialog(true);
        } else {
          onClose();
        }
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
      const timestamp = Date.now();
      setConversationHistory(prev => [
        ...prev,
        { role: 'assistant', content: currentQuestion, timestamp },
        { role: 'user', content: currentAnswer, timestamp: timestamp + 1000 }
      ]);
      setCurrentAnswer("");
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to submit answer', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Old uploadRecording function removed - now handled by chunked upload in useCameraRecorder

  const submitVoiceInterview = async () => {
    setProcessing(true);
    setIsUploading(true);
    try {
      // Disconnect OpenAI realtime connection first to stop listening
      if (realtimeAPI.isConnected) {
        console.log('Disconnecting OpenAI realtime session...');
        realtimeAPI.disconnect();
      }

      // Stop recording and finalize (uploads remaining chunks + generates HLS playlist)
      console.log('Stopping recording and finalizing...');
      const result = await stopRecording();

      // Stop camera stream
      if (cameraStream) {
        console.log('Stopping camera stream...');
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }

      // Cleanup recorder
      cleanup();

      // Check if recording was finalized successfully
      if (result.success) {
        console.log('✅ Recording finalized with HLS playlist:', result.playlistUrl);
        toast({
          title: 'Recording Complete',
          description: 'Your interview recording has been processed successfully.',
        });
      } else {
        console.warn('⚠️ Recording finalization had issues:', result.error);
        // Continue anyway - interview can still be completed without recording
      }

      // Make the complete-voice call in the background (don't await)
      // This prevents blocking the UI while scoring happens
      console.log('🚀 Starting interview completion in background...');
      fetch('/api/interview/complete-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationHistory,
          interviewType: 'job-practice',
          job,
          sessionId: session?.id
        })
      }).then(async response => {
        const data = await response.json();
        if (!response.ok) {
          console.error('❌ Background interview completion failed:', data?.message);
        } else {
          console.log('✅ Background interview completion succeeded');
        }
      }).catch(error => {
        console.error('❌ Error in background interview completion:', error);
      });

      // Immediately show success and continue
      toast({
        title: 'Interview Submitted',
        description: 'Your interview is being processed in the background. You can continue using the app.'
      });

      // Store the session ID and show transcription dialog
      if (session?.id) {
        setCompletedSessionId(session.id);
        setShowTranscriptionDialog(true);
      }

      onInterviewComplete?.();
      // Don't close the main dialog yet - transcription dialog will handle that
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to complete interview', variant: 'destructive' });
    } finally {
      setProcessing(false);
      setIsUploading(false);
    }
  };

  // Voice mode uses a different, full-screen interface
  if (mode === 'voice') {
    return (
      <>
      <div className="fixed inset-0 w-full h-screen bg-white dark:bg-gray-950 flex flex-col z-50">
        {/* Header with enhanced controls */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-border px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${realtimeAPI.isConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              <span className="text-foreground font-medium">
                {realtimeAPI.isConnected ? 'Live Interview' : 'Connecting...'}
              </span>
            </div>
            <div className="text-muted-foreground text-sm">
              Job Interview • {job?.jobTitle} • {getLanguageDisplayName(getInterviewLanguage(job, language))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTranscription(!showTranscription)}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              title={showTranscription ? "Hide transcription" : "Show transcription"}
            >
              <MessageSquare className="h-4 w-4 text-foreground" />
              <span className="text-sm font-medium text-foreground">
                {showTranscription ? "Hide" : "Show"} Transcription
              </span>
            </button>

            <button
              onClick={() => {
                console.log('❌ Close button clicked');
                performCleanup();
                onClose();
              }}
              className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-accent transition-colors"
              disabled={processing}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main video meeting area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Video grid with responsive layout */}
          <div className={`flex-1 grid gap-4 p-4 min-h-0 ${
            showTranscription
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1'
          }`}>
            {/* User camera - takes full width when transcription is hidden */}
            <div className={`relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden min-h-0 ${
              showTranscription ? '' : 'lg:col-span-1'
            }`}>
              <CameraPreview
                stream={cameraStream}
                isActive={realtimeAPI.isConnected}
                isRecording={isRecording}
                error={realtimeAPI.cameraError}
                connecting={loading}
                className="h-full"
              />
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
                You
              </div>
              {realtimeAPI.isConnected && (
                <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">Connected</span>
                </div>
              )}
            </div>

            {/* Transcription panel - only shown when enabled */}
            {showTranscription && (
              <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden flex flex-col border border-gray-200 dark:border-border min-h-0 h-full">
                {/* Transcription header */}
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-foreground font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Live Transcription
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        realtimeAPI.isListening ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                      }`} />
                      <span className="text-xs text-muted-foreground">
                        {realtimeAPI.isListening ? 'Listening' : 'Idle'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transcription content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {conversationHistory.length > 0 ? (
                    conversationHistory.map((item, index) => (
                      <div key={`${item.role}-${index}`} className={`flex ${
                        item.role === 'assistant' ? 'justify-start' : 'justify-end'
                      }`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                          item.role === 'assistant'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs font-medium opacity-75">
                              {item.role === 'assistant' ? 'PLATO Interviewer' : 'You'}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{item.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Conversation will appear here...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Meeting controls bar */}
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-border px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Recording status indicator */}
                {isRecording && (
                  <div className="flex items-center space-x-2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full shadow-lg">
                    <Video className="h-4 w-4" />
                    <span className="text-xs font-medium">Recording</span>
                    <Circle className="h-2 w-2 bg-destructive-foreground/50 rounded-full animate-pulse" />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${
                    realtimeAPI.isConnected ? 'bg-green-500' : 'bg-yellow-500'
                  } animate-pulse shadow-lg`} />
                  <span className="text-muted-foreground text-sm font-medium">
                    {realtimeAPI.isConnected ? (isRecording ? 'Recording' : 'Live') : 'Connecting...'}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground">
                  {job?.jobTitle} • {getLanguageDisplayName(getInterviewLanguage(job, language))}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={async () => {
                    if (processing || isUploading) {
                      return;
                    }

                    console.log('🚪 Exiting interview...');
                    setIsUploading(true);

                    try {
                      // Stop recording and finalize (uploads chunks + generates HLS)
                      console.log('Stopping recording and finalizing on exit...');
                      const result = await stopRecording();

                      if (result.success) {
                        console.log('✅ Recording saved on exit:', result.playlistUrl);
                      } else {
                        console.warn('⚠️ Recording finalization had issues on exit:', result.error);
                      }
                    } catch (error) {
                      console.error('Error saving recording on exit:', error);
                    } finally {
                      // Always cleanup and exit
                      setIsUploading(false);
                      performCleanup();
                      onClose();
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-accent transition-colors text-sm font-medium border border-border"
                  disabled={processing || isUploading}
                >
                  {isUploading ? '⏳ Saving...' : '← Exit Interview'}
                </button>

                <button
                  onClick={submitVoiceInterview}
                  disabled={processing || !realtimeAPI.isConnected || isUploading}
                  className={`${
                    realtimeAPI.isInterviewComplete || isInterviewComplete
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-destructive hover:bg-destructive/90'
                  } disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-all flex items-center space-x-2 shadow-lg`}
                >
                  {processing || isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>{isUploading ? 'Uploading...' : 'Processing...'}</span>
                    </>
                  ) : realtimeAPI.isInterviewComplete || isInterviewComplete ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Submit Interview</span>
                    </>
                  ) : (
                    <>
                      <PhoneOff className="h-4 w-4" />
                      <span>End Interview</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Show transcription dialog after interview completion */}
      {showTranscriptionDialog && completedSessionId && (
        <InterviewTranscriptionDialog
          isOpen={showTranscriptionDialog}
          onClose={() => {
            setShowTranscriptionDialog(false);
            setCompletedSessionId(null);
            onClose(); // Close the main interview modal as well
          }}
          sessionId={completedSessionId}
          initialTranscription={conversationHistory}
        />
      )}
      </>
    );
  }

  // Regular dialog for text mode
  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Dialog is closing - perform cleanup
        console.log('📋 Dialog closing via onOpenChange');
        performCleanup();
        onClose();
      }
    }}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Job-specific Interview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !session ? (
            <div className="text-center text-muted-foreground h-full flex items-center justify-center">No active job-specific interview session.</div>
          ) : (enableTextInterviews === 'true' && mode === 'text') ? (
            <div className="max-w-4xl mx-auto space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Text mode • {getLanguageDisplayName(getInterviewLanguage(job, language))}</div>
                <h3 className="text-lg font-semibold text-foreground">{job?.jobTitle}</h3>
                {job?.jobDescription && (
                  <div className="mt-2 text-sm text-muted-foreground prose prose-sm max-w-none">
                    <ReactMarkdown>{job.jobDescription}</ReactMarkdown>
                  </div>
                )}
              </div>
              <Badge variant="outline">Question {(session.sessionData.responses?.length || 0) + 1} of {session.sessionData.questions?.length || 5}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">

              {/* Display previous Q&A pairs */}
              {session.sessionData.responses?.map((response, index) => (
                <div key={index} className="space-y-3">
                  <div className="p-4 rounded-lg bg-primary/10 border-l-4 border-primary">
                    <div className="flex items-start space-x-2 rtl:space-x-reverse">
                      <User className="h-4 w-4 mt-1 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Question {index + 1}</p>
                        <p className="text-sm text-foreground/80">{response.question}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary border-l-4 border-secondary-foreground/20 ml-8">
                    <div className="flex items-start space-x-2 rtl:space-x-reverse">
                      <MessageCircle className="h-4 w-4 mt-1 text-secondary-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-secondary-foreground">Your Answer</p>
                        <p className="text-sm text-secondary-foreground/80">{response.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Current question */}
              <div className="p-4 rounded-lg bg-primary/10 border-l-4 border-primary">
                <div className="flex items-start space-x-2 rtl:space-x-reverse">
                  <User className="h-4 w-4 mt-1 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Question {(session.sessionData.responses?.length || 0) + 1}</p>
                    <p className="text-sm text-foreground/80">{currentQuestion}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <Textarea value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} placeholder="Type your answer here" rows={4} />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose} disabled={submitting}>Close</Button>
                <Button onClick={submitTextAnswer} disabled={!currentAnswer.trim() || submitting}>
                  {submitting ? 'Submitting...' : 'Submit Answer'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Voice mode • {getLanguageDisplayName(getInterviewLanguage(job, language))}</div>
                <h3 className="text-lg font-semibold text-foreground">{job?.jobTitle}</h3>
                {job?.jobDescription && (
                  <div className="mt-2 text-sm text-muted-foreground prose prose-sm max-w-none">
                    <ReactMarkdown>{job.jobDescription}</ReactMarkdown>
                  </div>
                )}
              </div>
              <Badge variant="outline">Live</Badge>
            </div>

            {/* Camera Preview */}
            <CameraPreview
              stream={cameraStream}
              isActive={realtimeAPI.isConnected}
              isRecording={isRecording}
              error={realtimeAPI.cameraError}
              connecting={loading}
              className="h-48 w-full max-w-md mx-auto"
            />

            <div className="p-3 rounded-md border border-border bg-muted text-sm text-muted-foreground">
              {realtimeAPI.isConnected ? 'You are connected. Speak naturally to answer questions.' : 'Connecting to voice interview...'}
            </div>

            {/* Conversation history for voice mode */}
            <div className="h-48 overflow-y-auto space-y-2 p-2 border border-border rounded-lg bg-muted/50">
              {conversationHistory.length > 0 ? (
                conversationHistory.map((item, index) => (
                  <div key={`${item.role}-${index}`} className={`p-3 rounded-lg ${
                    item.role === 'assistant'
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-secondary border border-secondary-foreground/20 ml-8'
                  }`}>
                    <div className="flex items-start space-x-2 rtl:space-x-reverse">
                      {item.role === 'assistant' ? (
                        <User className="h-4 w-4 mt-1 text-primary" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mt-1 text-secondary-foreground" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          item.role === 'assistant' ? 'text-primary' : 'text-secondary-foreground'
                        }`}>
                          {item.role === 'assistant' ? 'PLATO Interviewer' : 'You'}
                        </p>
                        <p className={`text-sm ${
                          item.role === 'assistant' ? 'text-foreground/80' : 'text-secondary-foreground/80'
                        }`}>
                          {item.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No conversation yet. Start speaking when connected...</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={async () => {
                if (processing || isUploading) {
                  return;
                }

                console.log('🚪 Exiting interview from dialog mode...');

                try {
                  // Stop recording and get the blob
                  const recordedBlob = await stopRecording();

                  // Upload the recording if we have data
                  if (recordedBlob && recordedBlob.size > 0) {
                    console.log('Uploading recorded blob...');
                    await uploadRecording(recordedBlob);
                  } else {
                    console.log('No recording data to upload');
                  }
                } catch (error) {
                  console.error('Error saving recording on exit:', error);
                } finally {
                  // Always cleanup and exit
                  performCleanup();
                  onClose();
                }
              }} disabled={processing || isUploading}>
                <PhoneOff className="h-4 w-4 mr-1" /> End
              </Button>
              <Button
                onClick={submitVoiceInterview}
                disabled={processing || !realtimeAPI.isConnected || isUploading}
                className={realtimeAPI.isInterviewComplete || isInterviewComplete ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {processing || isUploading ? (isUploading ? 'Uploading...' : 'Submitting...') : (
                  realtimeAPI.isInterviewComplete || isInterviewComplete ? 'Submit Interview' : 'End & Submit'
                )}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Show transcription dialog after interview completion */}
    {showTranscriptionDialog && completedSessionId && (
      <InterviewTranscriptionDialog
        isOpen={showTranscriptionDialog}
        onClose={() => {
          setShowTranscriptionDialog(false);
          setCompletedSessionId(null);
          onClose(); // Close the main interview modal as well
        }}
        sessionId={completedSessionId}
        initialTranscription={conversationHistory}
      />
    )}
    </>
  );
}
