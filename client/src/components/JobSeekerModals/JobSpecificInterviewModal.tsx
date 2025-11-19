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
  const { isRecording, startRecording, stopRecording, cleanup } = useCameraRecorder();

  // HLS chunk upload tracking
  const [uploadedChunks, setUploadedChunks] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [uploadQueue, setUploadQueue] = useState<Array<{chunk: Blob, index: number}>>([]);
  const isUploadingRef = useRef<boolean>(false);
  const [failedChunks, setFailedChunks] = useState<number[]>([]);

  // Debug: Log the environment variable value and its type
  const enableTextInterviews = import.meta.env.VITE_ENABLE_TEXT_INTERVIEWS;

  // Upload a single chunk to the server
  const uploadChunk = async (chunk: Blob, chunkIndex: number, retryCount = 0): Promise<boolean> => {
    if (!session) {
      console.warn('No session available for chunk upload');
      return false;
    }

    const formData = new FormData();
    formData.append('chunk', chunk, `chunk-${chunkIndex}.webm`);
    formData.append('sessionId', session.id.toString());
    formData.append('chunkIndex', chunkIndex.toString());

    if (job?.recordId) {
      formData.append('jobMatchId', job.recordId);
    }

    try {
      console.log(`[Chunk Upload] Uploading chunk ${chunkIndex}, size: ${chunk.size} bytes, attempt: ${retryCount + 1}`);

      const response = await fetch('/api/interview/upload-chunk', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const responseData = await response.json().catch(() => ({ message: 'Invalid response' }));

      if (!response.ok) {
        throw new Error(responseData.message || 'Chunk upload failed');
      }

      console.log(`[Chunk Upload] Successfully uploaded chunk ${chunkIndex}`);
      setUploadedChunks(prev => prev + 1);
      return true;
    } catch (error) {
      console.error(`[Chunk Upload] Failed to upload chunk ${chunkIndex}:`, error);

      // Retry logic: try up to 3 times
      if (retryCount < 2) {
        console.log(`[Chunk Upload] Retrying chunk ${chunkIndex}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return uploadChunk(chunk, chunkIndex, retryCount + 1);
      }

      // Mark chunk as failed after all retries
      setFailedChunks(prev => [...prev, chunkIndex]);
      return false;
    }
  };

  // Callback when a chunk is ready from the recorder
  const handleChunkReady = useCallback((chunk: Blob, chunkIndex: number) => {
    console.log(`[HLS] Chunk ${chunkIndex} ready for upload, size: ${chunk.size} bytes`);
    setTotalChunks(prev => Math.max(prev, chunkIndex + 1));

    // Upload chunk immediately
    uploadChunk(chunk, chunkIndex);
  }, [session, job]);

  // Finalize recording when interview completes
  const finalizeRecording = async () => {
    if (!session) {
      console.warn('No session available for finalization');
      return;
    }

    try {
      console.log(`[Finalize] Finalizing recording for session ${session.id}`);

      const response = await fetch('/api/interview/finalize-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Finalization failed' }));
        throw new Error(errorData.message);
      }

      console.log(`[Finalize] Recording finalized successfully`);

      // Show upload status
      if (failedChunks.length > 0) {
        toast({
          title: 'Recording Upload Incomplete',
          description: `${uploadedChunks} of ${totalChunks} chunks uploaded successfully. Some chunks failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Recording Saved',
          description: `All ${uploadedChunks} video chunks uploaded successfully.`,
        });
      }
    } catch (error) {
      console.error('[Finalize] Error finalizing recording:', error);
      toast({
        title: 'Finalization Error',
        description: 'Failed to finalize recording, but chunks may have been saved.',
        variant: 'destructive',
      });
    }
  };

  const startCameraAccess = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        },
        audio: true,
      });
      setCameraStream(videoStream);
      // Start recording with chunk callback for HLS streaming
      startRecording(videoStream, handleChunkReady);
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
          // Start camera access first
          await startCameraAccess();
          // Use job-specific interview language, fallback to provided language
          const interviewLanguage = getInterviewLanguage(job, language);
          console.log('🎤 Using interview language:', interviewLanguage, 'from job:', job?.interviewLanguage);
          // Then connect voice session
          await realtimeAPI.connect({
            interviewType: 'job-practice',
            questions: data.sessionData.questions,
            language: interviewLanguage,
            aiPrompt: job?.aiPrompt
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

  const uploadRecording = async (blob: Blob) => {
    if (!session) {
      console.warn('No current session available for upload');
      return;
    }

    // Validate blob before upload
    if (!blob || blob.size === 0) {
      console.warn('Recording blob is empty or null:', { blob: blob, size: blob?.size });
      toast({
        title: 'Upload Skipped',
        description: 'No recording data available to upload.',
        variant: 'destructive',
      });
      return;
    }

    console.log('About to upload recording:', {
      sessionId: session.id,
      blobSize: blob.size,
      blobType: blob.type
    });

    setIsUploading(true);
    const formData = new FormData();

    // Determine file extension based on blob type
    let fileExtension = 'webm'; // default
    if (blob.type) {
      if (blob.type.includes('mp4') || blob.type.includes('m4v')) {
        fileExtension = 'mp4';
      } else if (blob.type.includes('quicktime') || blob.type.includes('mov')) {
        fileExtension = 'mov';
      } else if (blob.type.includes('webm')) {
        fileExtension = 'webm';
      }
      // Add any other detected types
      console.log('Upload blob type:', blob.type, 'using extension:', fileExtension);
    }

    formData.append('recording', blob, `interview-${session.id}.${fileExtension}`);
    formData.append('sessionId', session.id.toString());

    // Add jobMatchId if available from job record
    if (job?.recordId) {
      formData.append('jobMatchId', job.recordId);
    }

    // Note: userId will be added by the server from the authenticated user

    try {
      console.log(`Uploading recording for session ${session.id}, size: ${blob.size} bytes`);

      const response = await fetch('/api/interview/upload-recording', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include authentication
      });

      const responseData = await response.json().catch(() => ({ message: 'Invalid response' }));

      if (!response.ok) {
        // Handle specific error messages from server
        const errorMessage = responseData.message || 'Upload failed';
        throw new Error(errorMessage);
      }

      console.log('Recording uploaded successfully:', responseData);

      toast({
        title: 'Upload Complete',
        description: 'Your interview recording has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Upload error:', error);

      // Show specific error message from server if available
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';

      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const submitVoiceInterview = async () => {
    setProcessing(true);
    try {
      // Disconnect OpenAI realtime connection first to stop listening
      if (realtimeAPI.isConnected) {
        console.log('Disconnecting OpenAI realtime session...');
        realtimeAPI.disconnect();
      }

      // Stop recording (chunks were already uploaded during recording)
      console.log('Stopping recording...');
      await stopRecording();

      // Stop camera stream
      if (cameraStream) {
        console.log('Stopping camera stream...');
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }

      // Cleanup recorder
      cleanup();

      // Finalize HLS recording (adds end marker to playlist)
      console.log('Finalizing HLS recording...');
      await finalizeRecording();

      const response = await fetch('/api/interview/complete-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationHistory, interviewType: 'job-practice', job })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to complete');

      toast({ title: 'Interview Complete', description: 'Your job-specific voice interview has been completed.' });

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
    }
  };

  // Voice mode uses a different, full-screen interface
  if (mode === 'voice') {
    return (
      <>
      <div className="w-full h-full bg-white dark:bg-gray-950 flex flex-col">
        {/* Header with enhanced controls */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-border px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
        <div className="flex-1 flex flex-col h-full">
          {/* Video grid with responsive layout */}
          <div className={`flex-1 grid gap-4 p-4 ${
            showTranscription
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1'
          }`}>
            {/* User camera - takes full width when transcription is hidden */}
            <div className={`relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden ${
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
              {isRecording && totalChunks > 0 && (
                <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Circle className="h-3 w-3 text-blue-400 animate-pulse" />
                  <span className="text-white text-sm font-medium">
                    Uploading {uploadedChunks}/{totalChunks} chunks
                  </span>
                  {failedChunks.length > 0 && (
                    <span className="text-red-400 text-xs ml-1">
                      ({failedChunks.length} failed)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Transcription panel - only shown when enabled */}
            {showTranscription && (
              <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden flex flex-col border border-gray-200 dark:border-border">
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
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
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
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-border px-6 py-4">
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

                    try {
                      // Stop recording (chunks were already uploaded during recording)
                      await stopRecording();

                      // Finalize HLS recording
                      console.log('Finalizing HLS recording on exit...');
                      await finalizeRecording();
                    } catch (error) {
                      console.error('Error saving recording on exit:', error);
                    } finally {
                      // Always cleanup and exit
                      performCleanup();
                      onClose();
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-accent transition-colors text-sm font-medium border border-border"
                  disabled={processing || isUploading}
                >
                  ← Exit Interview
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
            <div className="relative">
              <CameraPreview
                stream={cameraStream}
                isActive={realtimeAPI.isConnected}
                isRecording={isRecording}
                error={realtimeAPI.cameraError}
                connecting={loading}
                className="h-48 w-full max-w-md mx-auto"
              />
              {isRecording && totalChunks > 0 && (
                <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Circle className="h-2 w-2 text-blue-400 animate-pulse" />
                  <span className="text-white text-xs font-medium">
                    {uploadedChunks}/{totalChunks} chunks
                  </span>
                  {failedChunks.length > 0 && (
                    <span className="text-red-400 text-xs">
                      ({failedChunks.length} ✗)
                    </span>
                  )}
                </div>
              )}
            </div>

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
                  // Stop recording (chunks were already uploaded during recording)
                  await stopRecording();

                  // Finalize HLS recording
                  console.log('Finalizing HLS recording on exit...');
                  await finalizeRecording();
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
      />
    )}
    </>
  );
}
