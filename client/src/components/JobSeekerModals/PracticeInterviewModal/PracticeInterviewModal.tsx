import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAPI } from '@/hooks/useRealtimeAPI';
import { useCameraRecorder } from '@/hooks/useCameraRecorder';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

import { PracticeSetupForm } from './PracticeSetupForm';
import { PracticeFeedbackView } from './PracticeFeedbackView';
import { VoiceInterviewComponent } from '../InterviewModal/VoiceInterviewComponent';

import {
  PracticePhase,
  PracticeSetupData,
  PracticeFeedback,
  PracticeInterviewStartResponse,
  PracticeInterviewCompleteResponse,
  ConversationMessage,
  InterviewSet
} from './types';

interface PracticeInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PracticeInterviewModal({ isOpen, onClose }: PracticeInterviewModalProps) {
  const { toast } = useToast();
  const { language: uiLanguage, t } = useLanguage();

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

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      performCleanup();
      // Reset state
      setPhase('setup');
      setSetupData(null);
      setSessionId(null);
      setInterviewSet(null);
      setWelcomeMessage(null);
      setConversationHistory([]);
      setFeedback(null);
      setIsInterviewComplete(false);
    }
  }, [isOpen]);

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
    onClose();
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

  // Full screen modal for all phases
  const getModalClass = () => {
    return 'w-screen h-screen max-w-none m-0 rounded-none';
  };

  const isLoading = startPracticeMutation.isPending || completePracticeMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${getModalClass()} overflow-hidden flex flex-col`}>
        {phase !== 'interview' && (
          <DialogHeader>
            <DialogTitle>
              {phase === 'setup' && (uiLanguage === 'ar' ? 'مقابلة تدريبية' : 'Practice Interview')}
              {phase === 'feedback' && (uiLanguage === 'ar' ? 'نتائج المقابلة' : 'Interview Results')}
            </DialogTitle>
          </DialogHeader>
        )}

        {/* Setup Phase */}
        {phase === 'setup' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-lg">
              <PracticeSetupForm
                onSubmit={handleSetupSubmit}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* Interview Phase - Light Mode */}
        {phase === 'interview' && (
          <div className="flex-1 flex flex-col h-full bg-white">
            {completePracticeMutation.isPending ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-amber-500" />
                  <p className="text-lg font-medium text-gray-900">
                    {uiLanguage === 'ar' ? 'جاري تحليل المقابلة...' : 'Analyzing your interview...'}
                  </p>
                  <p className="text-sm text-gray-500">
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
        )}

        {/* Feedback Phase */}
        {phase === 'feedback' && feedback && (
          <div className="flex-1 flex items-center justify-center overflow-auto py-6">
            <div className="w-full max-w-4xl px-4">
              <PracticeFeedbackView
                feedback={feedback}
                practiceConfig={setupData}
                onPracticeAgain={handlePracticeAgain}
                onClose={onClose}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
