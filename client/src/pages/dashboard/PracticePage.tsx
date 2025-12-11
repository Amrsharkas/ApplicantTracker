import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAPI } from '@/hooks/useRealtimeAPI';
import { useCameraRecorder } from '@/hooks/useCameraRecorder';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Import practice interview components
import { PracticeSetupForm } from '@/components/JobSeekerModals/PracticeInterviewModal/PracticeSetupForm';
import { PracticeFeedbackView } from '@/components/JobSeekerModals/PracticeInterviewModal/PracticeFeedbackView';
import { VoiceInterviewComponent } from '@/components/JobSeekerModals/InterviewModal/VoiceInterviewComponent';

import {
  PracticePhase,
  PracticeSetupData,
  PracticeFeedback,
  PracticeInterviewStartResponse,
  PracticeInterviewCompleteResponse,
  ConversationMessage,
  InterviewSet
} from '@/components/JobSeekerModals/PracticeInterviewModal/types';

export default function PracticePage() {
  const { toast } = useToast();
  const { language: uiLanguage, t } = useLanguage();
  const [, setLocation] = useLocation();

  // State management
  const [phase, setPhase] = useState<PracticePhase>('setup');
  const [setupData, setSetupData] = useState<PracticeSetupData | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [interviewSet, setInterviewSet] = useState<InterviewSet | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);

  // Camera and recording
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | undefined>(undefined);
  const {
    isRecording,
    isUploading,
    startRecording,
    stopRecording,
    cleanup: cleanupRecording
  } = useCameraRecorder();

  // Realtime API hook
  const realtimeAPI = useRealtimeAPI({
    requireCamera: false,
    onInterviewComplete: () => {
      console.log('🎯 Practice interview completion detected');
      setIsInterviewComplete(true);
    },
    onMessage: (event) => {
      // Handle AI transcript
      if (event.type === 'response.audio_transcript.done') {
        const aiText = event.transcript;
        if (aiText) {
          setConversationHistory(prev => {
            const isDuplicate = prev.some(msg =>
              msg.role === 'assistant' && msg.content === aiText
            );
            if (isDuplicate) return prev;
            return [...prev, { role: 'assistant', content: aiText, timestamp: Date.now() }];
          });
        }
      }
      // Handle user transcript
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        const userText = event.transcript;
        if (userText) {
          setConversationHistory(prev => {
            const isDuplicate = prev.some(msg =>
              msg.role === 'user' && msg.content === userText
            );
            if (isDuplicate) return prev;
            return [...prev, { role: 'user', content: userText, timestamp: Date.now() }];
          });
        }
      }
    }
  });

  // Start practice interview mutation
  const startPracticeMutation = useMutation({
    mutationFn: async (data: PracticeSetupData): Promise<PracticeInterviewStartResponse> => {
      return await apiRequest('POST', '/api/practice-interview/start', data);
    },
    onSuccess: async (data) => {
      setSessionId(data.sessionId);
      setInterviewSet(data.interviewSet);
      setWelcomeMessage(data.welcomeMessage);

      // Start camera access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        setCameraStream(stream);
        setCameraError(undefined);
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError(err?.message || 'Failed to access camera');
        // Continue with audio only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          setCameraStream(audioStream);
        } catch (audioErr) {
          console.error('Audio access error:', audioErr);
          toast({
            title: uiLanguage === 'ar' ? 'خطأ في الميكروفون' : 'Microphone Error',
            description: uiLanguage === 'ar' ? 'لا يمكن الوصول إلى الميكروفون' : 'Unable to access microphone',
            variant: 'destructive'
          });
          return;
        }
      }

      // Connect to realtime API
      await realtimeAPI.connect({
        interviewType: 'standalone-practice',
        questions: data.questions,
        language: setupData?.language || 'english',
        welcomeMessage: data.welcomeMessage
      });

      setPhase('interview');
    },
    onError: (error: Error) => {
      toast({
        title: uiLanguage === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (uiLanguage === 'ar' ? 'فشل بدء المقابلة التدريبية' : 'Failed to start practice interview'),
        variant: 'destructive'
      });
    }
  });

  // Complete practice interview mutation
  const completePracticeMutation = useMutation({
    mutationFn: async (): Promise<PracticeInterviewCompleteResponse> => {
      if (!sessionId || !setupData) throw new Error('Missing session data');

      return await apiRequest('POST', '/api/practice-interview/complete', {
        sessionId,
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        jobTitle: setupData.jobTitle,
        seniorityLevel: setupData.seniorityLevel,
        language: setupData.language
      });
    },
    onSuccess: (data) => {
      setFeedback(data.feedback);
      setPhase('feedback');
    },
    onError: (error: Error) => {
      toast({
        title: uiLanguage === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (uiLanguage === 'ar' ? 'فشل إنهاء المقابلة' : 'Failed to complete interview'),
        variant: 'destructive'
      });
    }
  });

  // Start recording when camera and AI audio are ready
  useEffect(() => {
    if (phase === 'interview' && cameraStream && realtimeAPI.aiAudioStream && sessionId && !isRecording) {
      console.log('🎬 Starting recording with mixed audio');
      startRecording(cameraStream, sessionId.toString(), realtimeAPI.aiAudioStream);
    }
  }, [cameraStream, realtimeAPI.aiAudioStream, sessionId, phase, isRecording, startRecording]);

  const performCleanup = useCallback(() => {
    console.log('🧹 Performing practice interview cleanup...');

    // Disconnect realtime API
    if (realtimeAPI.isConnected) {
      realtimeAPI.disconnect();
    }

    // Stop recording
    if (isRecording) {
      stopRecording();
    }
    cleanupRecording();

    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    console.log('✅ Cleanup complete');
  }, [realtimeAPI, isRecording, stopRecording, cleanupRecording, cameraStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performCleanup();
    };
  }, []);

  // Handle setup form submission
  const handleSetupSubmit = (data: PracticeSetupData) => {
    setSetupData(data);
    startPracticeMutation.mutate(data);
  };

  // Handle interview end/submit
  const handleEndInterview = async () => {
    console.log('🏁 Ending practice interview...');

    // Stop recording
    if (isRecording) {
      await stopRecording();
    }

    // Disconnect realtime
    if (realtimeAPI.isConnected) {
      realtimeAPI.disconnect();
    }

    // Stop camera
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    // Get feedback
    completePracticeMutation.mutate();
  };

  // Handle exit during interview
  const handleExitInterview = () => {
    performCleanup();
    setLocation('/dashboard');
  };

  // Handle practice again
  const handlePracticeAgain = () => {
    performCleanup();
    setPhase('setup');
    setSetupData(null);
    setSessionId(null);
    setInterviewSet(null);
    setWelcomeMessage(null);
    setConversationHistory([]);
    setFeedback(null);
    setIsInterviewComplete(false);
  };

  // Handle close
  const handleClose = () => {
    performCleanup();
    setLocation('/dashboard');
  };

  const isLoading = startPracticeMutation.isPending || completePracticeMutation.isPending;

  // If in interview phase, render as fullscreen
  if (phase === 'interview') {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="w-screen h-screen max-w-none m-0 rounded-none overflow-hidden flex flex-col">
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
            {completePracticeMutation.isPending ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-amber-500" />
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {uiLanguage === 'ar' ? 'جاري تحليل المقابلة...' : 'Analyzing your interview...'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {uiLanguage === 'ar' ? 'سيستغرق هذا بضع ثوانٍ' : 'This will take a few seconds'}
                  </p>
                </div>
              </div>
            ) : (
              <VoiceInterviewComponent
                cameraStream={cameraStream}
                isRecording={isRecording}
                isConnected={realtimeAPI.isConnected}
                isStartingInterview={startPracticeMutation.isPending}
                isAiSpeaking={realtimeAPI.isAiSpeaking}
                isProcessingInterview={completePracticeMutation.isPending}
                isUploading={isUploading}
                voiceTranscript={realtimeAPI.voiceTranscript}
                conversationHistory={conversationHistory.map(msg => ({
                  role: msg.role,
                  content: msg.content
                }))}
                sessionTerminated={false}
                windowBlurCount={0}
                maxBlurCount={3}
                showTranscription={showTranscription}
                selectedInterviewLanguage={setupData?.language || 'english'}
                realtimeAPI={realtimeAPI}
                processVoiceInterviewMutation={completePracticeMutation}
                onExitInterview={handleExitInterview}
                onToggleTranscription={() => setShowTranscription(!showTranscription)}
                onSubmitOrEndInterview={handleEndInterview}
                cameraError={cameraError}
                lightMode={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {uiLanguage === 'ar' ? 'مقابلة تدريبية' : 'Practice Interview'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {uiLanguage === 'ar'
                  ? 'استعد لمقابلاتك من خلال جلسات تدريبية مدعومة بالذكاء الاصطناعي'
                  : 'Prepare for your interviews with AI-powered practice sessions'}
              </p>
            </div>
          </div>
        </div>

        {/* Setup Phase */}
        {phase === 'setup' && (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="w-full max-w-lg">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
                <PracticeSetupForm
                  onSubmit={handleSetupSubmit}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Feedback Phase */}
        {phase === 'feedback' && feedback && (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="w-full max-w-4xl">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
                <PracticeFeedbackView
                  feedback={feedback}
                  practiceConfig={setupData}
                  onPracticeAgain={handlePracticeAgain}
                  onClose={handleClose}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
