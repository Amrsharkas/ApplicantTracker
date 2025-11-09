import { useEffect, useMemo, useRef, useState } from "react";
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
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showTranscription, setShowTranscription] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const { isRecording, startRecording, stopRecording, cleanup } = useCameraRecorder();

  // Debug: Log the environment variable value and its type
  const enableTextInterviews = import.meta.env.VITE_ENABLE_TEXT_INTERVIEWS;

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
      startRecording(videoStream);
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
    // Disconnect on close
    return () => {
      if (realtimeAPI.isConnected) realtimeAPI.disconnect();
      // Stop camera stream and recording
      cleanup();
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
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
        onInterviewComplete?.();
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
      // Stop recording and get blob before submitting
      const recordedBlob = await stopRecording();

      // Upload recording if we have data
      if (recordedBlob && recordedBlob.size > 0) {
        console.log('Uploading recorded blob...');
        await uploadRecording(recordedBlob);
      } else {
        console.log('No recording data to upload');
      }

      const response = await fetch('/api/interview/complete-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationHistory, interviewType: 'job-practice', job })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to complete');
      toast({ title: 'Interview Complete', description: 'Your job-specific voice interview has been completed.' });
      onInterviewComplete?.();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to complete interview', variant: 'destructive' });
    } finally {
      if (realtimeAPI.isConnected) realtimeAPI.disconnect();
      setProcessing(false);
    }
  };

  // Voice mode uses a different, full-screen interface
  if (mode === 'voice') {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col">
        {/* Header with enhanced controls */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${realtimeAPI.isConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              <span className="text-white font-medium">
                {realtimeAPI.isConnected ? 'Live Interview' : 'Connecting...'}
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              Job Interview • {job?.jobTitle} • {getLanguageDisplayName(getInterviewLanguage(job, language))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTranscription(!showTranscription)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
              title={showTranscription ? "Hide transcription" : "Show transcription"}
            >
              <MessageSquare className="h-4 w-4 text-gray-300" />
              <span className="text-sm font-medium text-gray-300">
                {showTranscription ? "Hide" : "Show"} Transcription
              </span>
            </button>

            <button
              onClick={() => { if (realtimeAPI.isConnected) realtimeAPI.disconnect(); onClose(); }}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
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
            <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${
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
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                You
              </div>
              {realtimeAPI.isConnected && (
                <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-white text-sm">Speaking</span>
                </div>
              )}
            </div>

            {/* Transcription panel - only shown when enabled */}
            {showTranscription && (
              <div className="bg-gray-900 rounded-lg overflow-hidden flex flex-col">
                {/* Transcription header */}
                <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Live Transcription
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        realtimeAPI.isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                      }`} />
                      <span className="text-xs text-gray-400">
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
                            ? 'bg-blue-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs font-medium opacity-75">
                              {item.role === 'assistant' ? 'AI' : 'You'}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{item.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Conversation will appear here...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Meeting controls bar */}
          <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Recording status indicator */}
                {isRecording && (
                  <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
                    <Video className="h-4 w-4" />
                    <span className="text-xs font-medium">Recording</span>
                    <Circle className="h-2 w-2 bg-red-800 rounded-full animate-pulse" />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${
                    realtimeAPI.isConnected ? 'bg-green-500' : 'bg-yellow-500'
                  } animate-pulse`} />
                  <span className="text-gray-400 text-sm">
                    {realtimeAPI.isConnected ? (isRecording ? '🔴 Recording' : '🟢 Live') : '🟡 Connecting...'}
                  </span>
                </div>

                <div className="text-sm text-gray-500">
                  {job?.jobTitle} • {getLanguageDisplayName(getInterviewLanguage(job, language))}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={async () => {
                    if (processing || isUploading) {
                      return;
                    }

                    console.log('Exiting interview...');

                    try {
                      // Disconnect OpenAI realtime connection first
                      if (realtimeAPI.isConnected) {
                        realtimeAPI.disconnect();
                      }

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
                      console.log('Cleaning up and closing dialog...');
                      cleanup();
                      // Stop camera stream and recording
                      if (cameraStream) {
                        cameraStream.getTracks().forEach(track => track.stop());
                      }
                      setCameraStream(null);
                      console.log('Calling onClose...');
                      onClose();
                    }
                  }}
                  className="text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
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
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:bg-gray-700 disabled:text-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2`}
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
    );
  }

  // Regular dialog for text mode
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Job-specific Interview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-10 w-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !session ? (
            <div className="text-center text-slate-600 h-full flex items-center justify-center">No active job-specific interview session.</div>
          ) : (enableTextInterviews === 'true' && mode === 'text') ? (
            <div className="max-w-4xl mx-auto space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Text mode • {getLanguageDisplayName(getInterviewLanguage(job, language))}</div>
                <h3 className="text-lg font-semibold">{job?.jobTitle}</h3>
                {job?.jobDescription && (
                  <div className="mt-2 text-sm text-slate-600 prose prose-sm max-w-none">
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

            <div className="border-t pt-4 space-y-4">
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
                <div className="text-sm text-slate-600">Voice mode • {getLanguageDisplayName(getInterviewLanguage(job, language))}</div>
                <h3 className="text-lg font-semibold">{job?.jobTitle}</h3>
                {job?.jobDescription && (
                  <div className="mt-2 text-sm text-slate-600 prose prose-sm max-w-none">
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
              <Button variant="outline" onClick={async () => {
                if (processing || isUploading) {
                  return;
                }

                console.log('Exiting interview from dialog mode...');

                try {
                  // Disconnect OpenAI realtime connection first
                  if (realtimeAPI.isConnected) {
                    realtimeAPI.disconnect();
                  }

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
                  console.log('Cleaning up and closing dialog...');
                  cleanup();
                  // Stop camera stream and recording
                  if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                  }
                  setCameraStream(null);
                  console.log('Calling onClose...');
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
  );
}
