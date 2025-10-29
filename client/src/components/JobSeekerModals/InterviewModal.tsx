import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAPI } from '@/hooks/useRealtimeAPI';
import { useResumeRequirement } from '@/hooks/useResumeRequirement';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { ResumeRequiredModal } from '@/components/ResumeRequiredModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCameraRecorder } from '@/hooks/useCameraRecorder';
import {
  ViolationRulesComponent,
  ModeSelectionComponent,
  TextInterviewComponent,
  VoiceInterviewComponent,
  InterviewMessage,
  InterviewSession,
  InterviewModalProps
} from './InterviewModal/index';

export function InterviewModal({ isOpen, onClose, onAllInterviewsCompleted }: InterviewModalProps) {
  const [mode, setMode] = useState<'select' | 'text' | 'voice'>('select');
  const [selectedInterviewType, setSelectedInterviewType] = useState<string>('professional');
  const [selectedInterviewLanguage, setSelectedInterviewLanguage] = useState<string>('english');
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [isInterviewConcluded, setIsInterviewConcluded] = useState(false);
  const [isProcessingInterview, setIsProcessingInterview] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [lastAiResponse, setLastAiResponse] = useState<string>('');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [windowBlurCount, setWindowBlurCount] = useState(0);
  const [warningVisible, setWarningVisible] = useState(false);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showTranscription, setShowTranscription] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showViolationRules, setShowViolationRules] = useState(false);
  const [violationRulesAccepted, setViolationRulesAccepted] = useState(false);
  const maxBlurCount = 3; // Maximum allowed window switches before termination
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();
  const { isRecording, startRecording, stopRecording, cleanup } = useCameraRecorder();

  // Debug: Log the environment variable value and its type
  const enableTextInterviews = import.meta.env.VITE_ENABLE_TEXT_INTERVIEWS;

  // Check resume requirement
  const { hasResume, requiresResume, isLoading: isLoadingResume } = useResumeRequirement();

  // Reset interview state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('select');
      setSelectedInterviewType('professional');
      setMessages([]);
      setCurrentAnswer('');
      setCurrentQuestionIndex(0);
      setCurrentSession(null);
      setVoiceTranscript('');
      setConversationHistory([]);
      setShowProfileDetails(false);
      setIsInterviewConcluded(false);
      setIsProcessingInterview(false);
      setIsStartingInterview(false);
      setIsAiSpeaking(false);
      setLastAiResponse('');
      setWindowBlurCount(0);
      setWarningVisible(false);
      setSessionTerminated(false);
      setShowViolationRules(false);
      setViolationRulesAccepted(false);
    }
  }, [isOpen]);

  // Fetch user profile data for personalized interview questions
  const { data: userProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    enabled: isOpen,
    retry: false,
  });

  
  // Fetch welcome message
  const { data: welcomeMessageData } = useQuery({
    queryKey: ["/api/interview/welcome"],
    enabled: isOpen && mode !== 'select',
    retry: false,
  });

  // Voice interview integration
  const realtimeAPI = useRealtimeAPI({
    userProfile,
    requireCamera: false, // Don't require camera in realtime API since we'll handle it separately
    onInterviewComplete: () => {
      console.log('🎯 Interview completion callback triggered in InterviewModal');
      setIsInterviewConcluded(true);
    },
    onLanguageWarning: (detectedLanguage) => {
      toast({
        title: selectedInterviewLanguage === 'arabic' ? 'تنبيه لغوي' : 'Language Warning',
        description: selectedInterviewLanguage === 'arabic'
          ? `يرجى التحدث باللغة العربية فقط. تم اكتشاف لغة مختلفة: ${detectedLanguage}`
          : `Please speak in English only. Detected different language: ${detectedLanguage}`,
        variant: "destructive",
      });
    },
    onMessage: (event) => {
      console.log('Realtime event:', event);
      
      if (event.type === 'response.audio.delta') {
        // AI started speaking - set speaking state
        setIsAiSpeaking(true);
      }
      
      if (event.type === 'response.audio.done' || event.type === 'response.done') {
        // AI finished speaking - clear speaking state
        setIsAiSpeaking(false);
      }
      
      if (event.type === 'response.audio_transcript.delta') {
        // AI speaking - build transcript
        setVoiceTranscript(prev => prev + (event.delta || ''));
      }
      
      if (event.type === 'response.audio_transcript.done') {
        const aiText = event.transcript;
        setVoiceTranscript("");
        
        // Prevent duplicate responses - only add if different from last response
        if (aiText && aiText !== lastAiResponse) {
          setLastAiResponse(aiText);
          
          // Add unique assistant message to conversation history
          setConversationHistory(prev => {
            // Check if this exact message already exists
            const isDuplicate = prev.some(msg => 
              msg.role === 'assistant' && msg.content === aiText
            );
            
            if (isDuplicate) {
              return prev; // Don't add duplicate
            }
            
            // Add new unique message
            return [...prev, { role: 'assistant', content: aiText }];
          });
          
          // Check if the AI is concluding the interview in English or Arabic
          const conclusionKeywords = [
            'conclude', 'final', 'wrap up', 'end of interview', 'that concludes', 'thank you for', 'this concludes',
            'complete', 'finished', 'done with', 'good luck', 'best wishes', 'interview is over', 'all done',
            'أتمنى لك', 'شكراً لك', 'انتهت المقابلة', 'نهاية المقابلة', 'هذا كل شيء', 'عفواً', 'تم الانتهاء',
            'بالتوفيق', 'أتمنى لك النجاح', 'هذا يختتم', 'انتهينا من', 'كل التوفيق'
          ];
          
          // Also check for question count completion - if we've reached expected count
          const expectedQuestionCount = getQuestionCount(selectedInterviewType);
          const currentQuestionCount = conversationHistory.filter(msg => msg.role === 'assistant').length;
          
          if (conclusionKeywords.some(keyword => aiText.toLowerCase().includes(keyword.toLowerCase())) || 
              currentQuestionCount >= expectedQuestionCount) {
            console.log('🎯 Voice interview concluded - setting submit button state');
            setIsInterviewConcluded(true);
          }
        }
      }
      
      if (event.type === 'input_audio_buffer.speech_started') {
        setVoiceTranscript("");
        // User started speaking - interrupt AI if needed
        if (isAiSpeaking) {
          setIsAiSpeaking(false);
        }
      }
      
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        const userText = event.transcript;
        
        // Add user message to conversation history - prevent duplicates
        if (userText) {
          setConversationHistory(prev => {
            const isDuplicate = prev.some(msg => 
              msg.role === 'user' && msg.content === userText
            );
            
            if (isDuplicate) {
              return prev; // Don't add duplicate
            }
            
            return [...prev, { role: 'user', content: userText }];
          });
        }
      }
    },
    onError: (error) => {
      console.error('Voice interview error:', error);
      toast({
        title: t('interview.voiceInterviewError') || 'Voice Interview Error',
        description: t('interview.voiceInterviewErrorDescription') || 'There was an issue with the voice interview. Please try text mode instead.',
        variant: 'destructive'
      });
      setMode('text');
    }
  });

  const { data: existingSession } = useQuery({
    queryKey: ["/api/interview/session"],
    enabled: isOpen,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t('auth.unauthorized') || "Unauthorized",
          description: t('auth.loggingOut') || "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      const endpoint = selectedInterviewType 
        ? `/api/interview/start/${selectedInterviewType}`
        : "/api/interview/start";
      
      console.log('Starting interview with endpoint:', endpoint, 'language:', selectedInterviewLanguage);
      const response = await apiRequest("POST", endpoint, {
        language: selectedInterviewLanguage
      });
      return response;
    },
    onSuccess: (data) => {
      setIsStartingInterview(false);
      
      // Create session object from the response data
      const session = {
        id: data.sessionId,
        sessionData: {
          questions: data.questions || [],
          responses: [],
          currentQuestionIndex: 0
        },
        isCompleted: false
      };
      
      setCurrentSession(session);
      setCurrentQuestionIndex(0);
      
      // Show welcome message first, then first question
      const messages = [];
      
      if (welcomeMessageData && typeof welcomeMessageData === 'object' && 'welcomeMessage' in welcomeMessageData) {
        messages.push({
          type: 'question' as const,
          content: (welcomeMessageData as any).welcomeMessage,
          timestamp: new Date()
        });
      }
      
      if (data.firstQuestion) {
        const questionContent = typeof data.firstQuestion === 'string' 
          ? data.firstQuestion 
          : (data.firstQuestion.question || data.firstQuestion.text || JSON.stringify(data.firstQuestion));
        
        messages.push({
          type: 'question' as const,
          content: questionContent,
          timestamp: new Date()
        });
      }
      
      setMessages(messages);
    },
    onError: (error: any) => {
      setIsStartingInterview(false);
      console.error('Start interview error:', error);
      
      // Check if the error is due to missing resume
      if (error?.message?.includes("Resume required") || error?.message?.includes("requiresResume")) {
        setShowResumeModal(true);
        return;
      }
      
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t('auth.unauthorized') || "Unauthorized",
          description: t('auth.loggingOut') || "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: t('interview.startError') || "Error",
        description: t('interview.startErrorDescription') || "Failed to start interview. Please try again.",
        variant: "destructive",
      });
      setMode('select');
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (answer: string) => {
      const response = await apiRequest("POST", "/api/interview/respond", {
        sessionId: currentSession?.id,
        answer,
        questionIndex: currentQuestionIndex
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.isComplete) {
        setCurrentSession(prev => prev ? { ...prev, isCompleted: true, generatedProfile: data.profile } : null);
        queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/interview/types"] });
        
        if (data.allInterviewsCompleted) {
          // Final completion - show profile generation success
          toast({
            title: t('interview.allInterviewsComplete') || "All Interviews Complete!",
            description: t('interview.profileGeneratedSuccessfully') || "Your comprehensive AI profile has been generated successfully.",
          });

          // Call callback to open JobSpecificAIInterviewsModal
          onAllInterviewsCompleted?.();

          // Reset to interview types view to show all completed
          setMode('select');
          setSelectedInterviewType('');
        } else if (data.nextInterviewType) {
          // Continue to next interview type automatically
          toast({
            title: t('interview.interviewSectionComplete') || "Interview Section Complete",
            description: `${t('interview.movingTo') || 'Moving to'} ${data.nextInterviewType} ${t('interview.interview') || 'interview'}...`,
          });
          
          // Automatically start next interview
          setTimeout(() => {
            setSelectedInterviewType(data.nextInterviewType);
            setMode('select');
          }, 1500);
        } else {
          // Individual interview complete with no next type
          toast({
            title: t('interview.interviewSectionComplete') || "Interview Section Complete!",
            description: t('interview.continueRemainingInterviews') || "Continue with the remaining interviews to complete your profile.",
          });
        }
      } else if (data.nextQuestion) {
        const nextQuestion: InterviewMessage = {
          type: 'question',
          content: data.nextQuestion,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, nextQuestion]);
        setCurrentQuestionIndex(prev => prev + 1);
        
        // Check if the question contains conclusion keywords in English or Arabic to show submit button
        const conclusionKeywords = [
          'conclude', 'final', 'wrap up', 'end of interview', 'that concludes', 'thank you for', 'this concludes',
          'complete', 'finished', 'done with', 'good luck', 'best wishes', 'interview is over', 'all done',
          'أتمنى لك', 'شكراً لك', 'انتهت المقابلة', 'نهاية المقابلة', 'هذا كل شيء', 'عفواً', 'تم الانتهاء',
          'بالتوفيق', 'أتمنى لك النجاح', 'هذا يختتم', 'انتهينا من', 'كل التوفيق'
        ];
        
        // Also check if this is the last question in the set
        const questions = currentSession?.sessionData?.questions || [];
        const isLastQuestion = currentQuestionIndex >= questions.length - 1;
        
        if (conclusionKeywords.some(keyword => data.nextQuestion.toLowerCase().includes(keyword.toLowerCase())) || isLastQuestion) {
          console.log('🎯 Text interview concluded - setting submit button state');
          setIsInterviewConcluded(true);
        }
      }
    },
    onError: () => {
      toast({
        title: t('interview.processResponseError') || "Error",
        description: t('interview.processResponseErrorDescription') || "Failed to process your response",
        variant: "destructive",
      });
    },
  });

  
  const processVoiceInterviewMutation = useMutation({
    mutationFn: async () => {
      setIsProcessingInterview(true);
      
      // Convert conversation history to the format expected by the API
      // Group conversation by pairs of AI question and user response
      const responses = [];
      for (let i = 0; i < conversationHistory.length; i += 2) {
        const aiMessage = conversationHistory[i];
        const userMessage = conversationHistory[i + 1];
        
        if (aiMessage?.role === 'assistant' && userMessage?.role === 'user') {
          responses.push({
            question: aiMessage.content,
            answer: userMessage.content
          });
        }
      }

      // If no proper pairs found, try alternative approach
      if (responses.length === 0) {
        const aiMessages = conversationHistory.filter(msg => msg.role === 'assistant');
        const userMessages = conversationHistory.filter(msg => msg.role === 'user');
        
        for (let i = 0; i < Math.min(aiMessages.length, userMessages.length); i++) {
          responses.push({
            question: aiMessages[i]?.content || `Question ${i + 1}`,
            answer: userMessages[i]?.content || ''
          });
        }
      }

      console.log('Sending voice interview data:', { 
        conversationHistory: responses, 
        interviewType: selectedInterviewType 
      });

      const response = await apiRequest("POST", "/api/interview/complete-voice", {
        conversationHistory: responses,
        interviewType: selectedInterviewType
      });
      return response;
    },
    onSuccess: async (data) => {
      console.log('Processing voice interview success - starting cleanup');

      try {
        // Disconnect realtime API first
        if (realtimeAPI.isConnected) {
          console.log('Disconnecting OpenAI realtime connection...');
          realtimeAPI.disconnect();
        }

        // Stop recording and get blob
        console.log('Stopping recording...');
        const recordedBlob = await stopRecording();

        console.log('Recording stopped, blob info:', {
          blob: recordedBlob,
          size: recordedBlob?.size,
          type: recordedBlob?.type
        });

        // Upload recording if we have data
        if (recordedBlob && recordedBlob.size > 0) {
          console.log('Uploading recorded blob...');
          await uploadRecording(recordedBlob);
        } else {
          console.log('No recording data to upload');
        }
      } catch (error) {
        console.error('Error during interview processing cleanup:', error);
      } finally {
        setIsProcessingInterview(false);
        setCurrentSession(prev => prev ? { ...prev, isCompleted: true, generatedProfile: data.profile } : null);
        queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/interview/types"] });
        setIsInterviewConcluded(false);
        console.log('Voice interview processing completed');
      }
      
      if (data.allInterviewsCompleted) {
        // Final completion - show profile generation success and close modal
        toast({
          title: t('interview.allInterviewsComplete') || "All Interviews Complete!",
          description: t('interview.profileGeneratedSuccessfully') || "Your comprehensive AI profile has been generated successfully.",
        });

        // Call callback to open JobSpecificAIInterviewsModal
        onAllInterviewsCompleted?.();

        onClose();
      } else if (data.nextInterviewType) {
        // Continue to next interview type automatically
        toast({
          title: t('interview.interviewSectionComplete') || "Interview Section Complete",
          description: `${t('interview.movingTo') || 'Moving to'} ${data.nextInterviewType} ${t('interview.interview') || 'interview'}...`,
        });
        
        // Automatically start next interview
        setTimeout(() => {
          setSelectedInterviewType(data.nextInterviewType);
          setMode('select');
        }, 1500);
      } else {
        // Individual interview complete with no next type
        toast({
          title: t('interview.voiceInterviewComplete') || "Interview Complete!",
          description: t('interview.voiceInterviewProcessedSuccessfully') || "Your voice interview has been processed successfully.",
        });
        
        // Reset to interview types view
        setMode('select');
        setSelectedInterviewType('');
      }
    },
    onError: (error) => {
      setIsProcessingInterview(false);
      console.error('Voice interview processing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: t('interview.processingFailed') || "Processing Failed",
        description: `${t('interview.processingFailedDescription') || 'There was an issue processing your interview'}: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  const uploadRecording = async (blob: Blob) => {
    if (!currentSession) {
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
      sessionId: currentSession.id,
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

    formData.append('recording', blob, `interview-${currentSession.id}.${fileExtension}`);
    formData.append('sessionId', currentSession.id.toString());

    // Note: This is a general interview, not job-specific, so no jobMatchId is included
    // userId will be added by the server from the authenticated user

    try {
      console.log(`Uploading recording for session ${currentSession.id}, size: ${blob.size} bytes`);

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

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !currentSession) return;
    
    // Add user answer to messages
    const userMessage: InterviewMessage = {
      type: 'answer',
      content: currentAnswer.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Update conversation history for text interviews
    setConversationHistory(prev => [...prev, { role: 'user', content: currentAnswer.trim() }]);
    
    try {
      // For text interviews, process response through the unified system
      const currentQuestionIndex = currentSession.sessionData?.currentQuestionIndex || 0;
      const questions = currentSession.sessionData?.questions || [];
      
      if (currentQuestionIndex < questions.length - 1) {
        // Move to next question
        const nextIndex = currentQuestionIndex + 1;
        const questionObj = questions[nextIndex];
        const questionContent = typeof questionObj === 'string' 
          ? questionObj 
          : questionObj?.question || questionObj?.text || JSON.stringify(questionObj);
          
        const nextQuestion: InterviewMessage = {
          type: 'question',
          content: questionContent,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, nextQuestion]);
        
        // Update session data
        setCurrentSession(prev => prev ? {
          ...prev,
          sessionData: {
            ...prev.sessionData!,
            currentQuestionIndex: nextIndex,
            responses: [...(prev.sessionData?.responses || []), { 
              question: typeof questions[currentQuestionIndex] === 'string' 
                ? questions[currentQuestionIndex] 
                : questions[currentQuestionIndex]?.question || questions[currentQuestionIndex]?.text || '',
              answer: currentAnswer.trim() 
            }]
          }
        } : null);
        
        // Check if this is the last question
        if (nextIndex === questions.length - 1) {
          setIsInterviewConcluded(true);
        }
      } else {
        // Last question answered - process interview completion
        await processInterviewCompletion();
      }
    } catch (error) {
      console.error('Error processing answer:', error);
      toast({
        title: t('interview.processAnswerError') || 'Error',
        description: t('interview.processAnswerErrorDescription') || 'Failed to process your answer. Please try again.',
        variant: 'destructive'
      });
    }
    
    setCurrentAnswer("");
  };

  const processInterviewCompletion = async () => {
    if (!currentSession || !selectedInterviewType) return;
    
    try {
      // Submit final answer and process completion
      const finalAnswer = currentAnswer.trim();
      const allResponses = [...(currentSession.sessionData?.responses || []), finalAnswer];
      
      // Call the interview completion endpoint
      const response = await fetch('/api/interview/complete-voice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          conversationHistory: allResponses.map((answer, index) => ({
            question: currentSession.sessionData?.questions?.[index] || `Question ${index + 1}`,
            answer: answer
          })),
          interviewType: selectedInterviewType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete interview');
      }

      const completionData = await response.json();
      
      // Mark session as completed
      setCurrentSession(prev => prev ? { 
        ...prev, 
        isCompleted: true,
        generatedProfile: completionData.profile 
      } : null);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interview/types"] });
      
      if (completionData.allInterviewsCompleted) {
        // Final completion - show profile generation success
        toast({
          title: t('interview.allInterviewsComplete') || "All Interviews Complete!",
          description: t('interview.profileGeneratedSuccessfully') || "Your comprehensive AI profile has been generated successfully.",
        });

        // Call callback to open JobSpecificAIInterviewsModal
        onAllInterviewsCompleted?.();

        // Reset to interview types view to show all completed
        setMode('select');
        setSelectedInterviewType('');
      } else {
        // Individual interview complete - no profile generated yet
        toast({
          title: t('interview.interviewSectionComplete') || "Interview Section Complete!",
          description: t('interview.continueRemainingInterviews') || "Continue with the remaining interviews to complete your profile.",
        });
        setMode('select');
        setSelectedInterviewType('');
      }
      
    } catch (error) {
      console.error('Error completing interview:', error);
      toast({
        title: t('interview.completeInterviewError') || 'Error',
        description: t('interview.completeInterviewErrorDescription') || 'Failed to complete interview. Please try again.',
        variant: 'destructive'
      });
    }
  };;

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

const enterFullscreen = async () => {
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      await (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).mozRequestFullScreen) {
      await (elem as any).mozRequestFullScreen();
    } else if ((elem as any).msRequestFullscreen) {
      await (elem as any).msRequestFullscreen();
    }
    setIsFullscreen(true);
  } catch (error) {
    console.error('Fullscreen error:', error);
  }
};

const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    }
    setIsFullscreen(false);
  } catch (error) {
    console.error('Exit fullscreen error:', error);
  }
};

const toggleFullscreen = () => {
  if (isFullscreen) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
};

// Listen for fullscreen changes
useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);

  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  };
}, []);

const startVoiceInterview = async () => {
    if (!selectedInterviewType) {
      toast({
        title: t('interview.selectInterviewTypeError') || 'Error',
        description: t('interview.selectInterviewTypeErrorDescription') || 'Please select an interview type first.',
        variant: 'destructive'
      });
      return;
    }

    // First show violation rules if not accepted yet
    if (!violationRulesAccepted) {
      setShowViolationRules(true);
      return;
    }

    setIsStartingInterview(true);
    setMode('voice');
    setMessages([]);
    setIsInterviewConcluded(false);
    setConversationHistory([]);

    // Start camera access immediately when voice mode is selected
    await startCameraAccess();

    // Try to enter fullscreen immediately when switching to voice mode
    enterFullscreen();

    // Show loading message
    const loadingMessage: InterviewMessage = {
      type: 'question',
      content: t('interview.startingVoiceInterviewConnecting') || 'Starting your voice interview... Camera enabled, connecting to AI interviewer...',
      timestamp: new Date()
    };
    setMessages([loadingMessage]);

    try {
      // Call the dedicated voice interview route
      const response = await fetch('/api/interview/start-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          interviewType: selectedInterviewType,
          language: selectedInterviewLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Voice interview start failed:', response.status, errorData);
        throw new Error(errorData.error || `API returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const htmlContent = await response.text();
        console.error('Expected JSON but got:', contentType, htmlContent.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON');
      }

      const interviewData = await response.json();
      console.log('Voice interview initialized:', interviewData);

      // Update current session
      setCurrentSession({
        id: interviewData.sessionId,
        sessionData: {
          questions: interviewData.questions || [],
          responses: [],
          currentQuestionIndex: 0
        },
        isCompleted: false
      });

      // Update with welcome message
      if (interviewData.welcomeMessage) {
        const welcomeMessage: InterviewMessage = {
          type: 'question',
          content: interviewData.welcomeMessage,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }

      // Connect to realtime API with the interview data
      await realtimeAPI.connect({
        interviewType: selectedInterviewType,
        questions: interviewData.questions,
        language: selectedInterviewLanguage
      });

      setIsStartingInterview(false);

      toast({
        title: t('interview.voiceInterviewStarted') || "Voice Interview Started",
        description: t('interview.voiceInterviewStartedDescription') || "You can now speak naturally with the AI interviewer.",
      });

      // Auto-enter fullscreen for voice mode with a small delay to ensure UI is ready
      setTimeout(async () => {
        await enterFullscreen();
      }, 500);
    } catch (error) {
      setIsStartingInterview(false);
      console.error('Voice interview error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      toast({
        title: t('interview.connectionFailed') || 'Connection Failed',
        description: `${t('interview.couldNotStartVoiceInterview') || 'Could not start voice interview'}: ${errorMessage}. ${t('interview.tryTextMode') || 'Please try text mode'}.`,
        variant: 'destructive'
      });
      setMode('select');
    }
  };

  const startTextInterview = async () => {
    if (!selectedInterviewType) {
      toast({
        title: t('interview.selectInterviewTypeError') || 'Error',
        description: t('interview.selectInterviewTypeErrorDescription') || 'Please select an interview type first.',
        variant: 'destructive'
      });
      return;
    }

    setIsStartingInterview(true);
    setMode('text');
    setMessages([]);
    setIsInterviewConcluded(false);
    setConversationHistory([]);
    
    // Show loading message immediately
    const loadingMessage: InterviewMessage = {
      type: 'question',
      content: t('interview.startingTextInterview') || 'Starting your text interview... Please wait while I prepare your personalized questions.',
      timestamp: new Date()
    };
    setMessages([loadingMessage]);
    
    try {
      // Use the same backend system as voice interview
      const response = await fetch('/api/interview/start-voice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          interviewType: selectedInterviewType,
          language: selectedInterviewLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Text interview start failed:', response.status, errorData);
        throw new Error(errorData.error || `API returned ${response.status}`);
      }

      const interviewData = await response.json();
      console.log('Text interview initialized:', interviewData);
      
      // Update current session
      setCurrentSession({
        id: interviewData.sessionId,
        sessionData: {
          questions: interviewData.questions || [],
          responses: [],
          currentQuestionIndex: 0
        },
        isCompleted: false
      });

      // Update with welcome message and first question
      if (interviewData.welcomeMessage) {
        const welcomeMessage: InterviewMessage = {
          type: 'question',
          content: interviewData.welcomeMessage,
          timestamp: new Date()
        };
        
        // If there are questions, show the first one after the welcome
        if (interviewData.questions && interviewData.questions.length > 0) {
          const firstQuestionObj = interviewData.questions[0];
          const firstQuestionText = typeof firstQuestionObj === 'string' 
            ? firstQuestionObj 
            : firstQuestionObj?.question || firstQuestionObj?.text || 'Question content not available';
            
          const firstQuestion: InterviewMessage = {
            type: 'question',
            content: firstQuestionText,
            timestamp: new Date()
          };
          setMessages([welcomeMessage, firstQuestion]);
        } else {
          setMessages([welcomeMessage]);
        }
      } else if (interviewData.questions && interviewData.questions.length > 0) {
        // Show first question directly if no welcome message
        const firstQuestionObj = interviewData.questions[0];
        const firstQuestionText = typeof firstQuestionObj === 'string' 
          ? firstQuestionObj 
          : firstQuestionObj?.question || firstQuestionObj?.text || 'Question content not available';
          
        const firstQuestion: InterviewMessage = {
          type: 'question',
          content: firstQuestionText,
          timestamp: new Date()
        };
        setMessages([firstQuestion]);
      }
      
      setIsStartingInterview(false);
      toast({
        title: t('interview.textInterviewStarted') || "Text Interview Started",
        description: t('interview.textInterviewStartedDescription') || "You can now type your responses to the interview questions.",
      });
    } catch (error) {
      setIsStartingInterview(false);
      console.error('Text interview error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: t('interview.failedToStartInterview') || 'Failed to Start Interview',
        description: `${t('interview.couldNotStartTextInterview') || 'Could not start text interview'}: ${errorMessage}. ${t('interview.pleaseTryAgain') || 'Please try again'}.`,
        variant: 'destructive'
      });
      setMode('select');
    }
  };

  const getQuestionCount = (interviewType: string) => {
    switch (interviewType) {
      case 'professional': return 11;
      default: return 11;
    }
  };

  const resetInterview = () => {
    // Stop recording first
    cleanup();

    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    // Exit fullscreen when resetting from voice mode
    if (mode === 'voice') {
      exitFullscreen();
    }

    setMode('select');
    setSelectedInterviewType('professional');
    setMessages([]);
    setCurrentAnswer('');
    setCurrentQuestionIndex(0);
    setCurrentSession(null);
    setVoiceTranscript('');
    setConversationHistory([]);
    setShowProfileDetails(false);
    setIsInterviewConcluded(false);
    setIsProcessingInterview(false);
    setIsStartingInterview(false);
    setIsAiSpeaking(false);
    setLastAiResponse('');
    setWindowBlurCount(0);
    setWarningVisible(false);
    setSessionTerminated(false);
    setCameraStream(null);
  };

  // Reset interview state when modal opens
  useEffect(() => {
    if (isOpen) {
      resetInterview();
    }
  }, [isOpen]);

  // Window focus/blur detection for interview security
  useEffect(() => {
    if (!isOpen || sessionTerminated) return;

    const handleBlur = () => {
      if (mode === 'voice' || (mode === 'select' && selectedInterviewType)) {
        const newCount = windowBlurCount + 1;
        setWindowBlurCount(newCount);
        setWarningVisible(true);

        // Auto-hide warning after 3 seconds
        setTimeout(() => setWarningVisible(false), 3000);

        if (newCount >= maxBlurCount) {
          // Terminate session
          setSessionTerminated(true);
          toast({
            title: "Session Terminated",
            description: "Interview session has been terminated due to multiple window switches.",
            variant: "destructive",
          });

          // Disconnect voice interview if active
          if (realtimeAPI.isConnected) {
            realtimeAPI.disconnect();
          }

          // Close modal after delay
          setTimeout(() => {
            handleClose();
          }, 2000);
        } else {
          // Show warning
          const remaining = maxBlurCount - newCount;
          toast({
            title: "Warning: Window Switch Detected",
            description: `Switching tabs during interviews is not allowed. ${remaining} more violation${remaining > 1 ? 's' : ''} before session termination.`,
            variant: "destructive",
          });
        }
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isOpen, mode, selectedInterviewType, windowBlurCount, sessionTerminated, toast, realtimeAPI]);

  // Cleanup voice interview and recording when modal closes
  useEffect(() => {
    return () => {
      if (realtimeAPI.isConnected) {
        realtimeAPI.disconnect();
      }
      // Clean up recording when component unmounts
      cleanup();
    };
  }, [cleanup]);

  const handleClose = () => {
    // Prevent closing during active AI speech or processing
    if (isAiSpeaking || isProcessingInterview || isStartingInterview) {
      toast({
        title: t('interview.interviewInProgress') || "Interview in Progress",
        description: t('interview.waitBeforeClosing') || "Please wait for the current interaction to complete before closing.",
        variant: "default",
      });
      return;
    }

    if (realtimeAPI.isConnected) {
      realtimeAPI.disconnect();
    }

    // Stop recording first
    cleanup();

    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    // Exit fullscreen when closing voice mode
    if (mode === 'voice') {
      exitFullscreen();
    }

    resetInterview();
    onClose();
  };

  
  useEffect(() => {
    if (existingSession && typeof existingSession === 'object' && !currentSession) {
      const session = existingSession as InterviewSession;
      // Only auto-handle sessions created for job-specific practice to avoid
      // interfering with the generic interview flow.
      if (session && (session as any).interviewType === 'job-practice') {
        setCurrentSession(session);
        if (!session.isCompleted) {
          const sessionMode = (session.sessionData as any)?.mode;
          if (sessionMode === 'voice') {
            setMode('voice');
            (async () => {
              try {
                await realtimeAPI.connect({
                  interviewType: 'job-practice',
                  questions: session.sessionData?.questions,
                  language: selectedInterviewLanguage
                });
              } catch (e) {
                console.error('Auto voice connect failed:', e);
              }
            })();
          } else {
            const questions = session.sessionData?.questions || [];
            const firstQuestionObj = questions[0];
            const questionContent = typeof firstQuestionObj === 'string'
              ? firstQuestionObj
              : firstQuestionObj?.question || firstQuestionObj?.text || t('interview.question1') || 'Question 1';
            setMode('text');
            setMessages([{
              type: 'question',
              content: questionContent,
              timestamp: new Date()
            }]);
            setCurrentQuestionIndex(0);
          }
        }
      }
    }
  }, [existingSession, currentSession]);

  const handleViolationRulesAccept = async () => {
    setShowViolationRules(false);
    setViolationRulesAccepted(true);

    // Start voice interview directly after accepting rules
    try {
      setIsStartingInterview(true);
      setMode('voice');
      setMessages([]);
      setIsInterviewConcluded(false);
      setConversationHistory([]);

      // Start camera access immediately when voice mode is selected
      await startCameraAccess();

      // Try to enter fullscreen immediately when switching to voice mode
      enterFullscreen();

      // Show loading message
      const loadingMessage: InterviewMessage = {
        type: 'question',
        content: t('interview.startingVoiceInterviewConnecting') || 'Starting your voice interview... Camera enabled, connecting to AI interviewer...',
        timestamp: new Date()
      };
      setMessages([loadingMessage]);

      // Call the dedicated voice interview route
      const response = await fetch('/api/interview/start-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          interviewType: selectedInterviewType,
          language: selectedInterviewLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Voice interview start failed:', response.status, errorData);
        throw new Error(errorData.error || `API returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const htmlContent = await response.text();
        console.error('Expected JSON but got:', contentType, htmlContent.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON');
      }

      const interviewData = await response.json();
      console.log('Voice interview initialized:', interviewData);

      // Update current session
      setCurrentSession({
        id: interviewData.sessionId,
        sessionData: {
          questions: interviewData.questions || [],
          responses: [],
          currentQuestionIndex: 0
        },
        isCompleted: false
      });

      // Update with welcome message
      if (interviewData.welcomeMessage) {
        const welcomeMessage: InterviewMessage = {
          type: 'question',
          content: interviewData.welcomeMessage,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }

      // Connect to realtime API with the interview data
      await realtimeAPI.connect({
        interviewType: selectedInterviewType,
        questions: interviewData.questions,
        language: selectedInterviewLanguage
      });

      setIsStartingInterview(false);

      toast({
        title: t('interview.voiceInterviewStarted') || "Voice Interview Started",
        description: t('interview.voiceInterviewStartedDescription') || "You can now speak naturally with the AI interviewer.",
      });

      // Auto-enter fullscreen for voice mode with a small delay to ensure UI is ready
      setTimeout(async () => {
        await enterFullscreen();
      }, 500);
    } catch (error) {
      setIsStartingInterview(false);
      console.error('Voice interview error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      toast({
        title: t('interview.connectionFailed') || 'Connection Failed',
        description: `${t('interview.couldNotStartVoiceInterview') || 'Could not start voice interview'}: ${errorMessage}. ${t('interview.tryTextMode') || 'Please try text mode'}.`,
        variant: 'destructive'
      });
      setMode('select');
    }
  };

  const handleViolationRulesDecline = () => {
    setShowViolationRules(false);
    setMode('select');
  };

  const handleStartVoiceInterview = () => {
    if (!selectedInterviewType) {
      toast({
        title: t('interview.selectInterviewTypeError') || 'Error',
        description: t('interview.selectInterviewTypeErrorDescription') || 'Please select an interview type first.',
        variant: 'destructive'
      });
      return;
    }

    // First show violation rules if not accepted yet
    if (!violationRulesAccepted) {
      setShowViolationRules(true);
      return;
    }

    startVoiceInterview();
  };

  const handleExitInterview = async () => {
    if (isAiSpeaking || isProcessingInterview) {
      return;
    }

    console.log('Exit Interview button clicked, recording state:', { isRecording });

    try {
      // Disconnect OpenAI realtime connection first
      if (realtimeAPI.isConnected) {
        console.log('Disconnecting OpenAI realtime connection...');
        realtimeAPI.disconnect();
      }

      // Stop recording and get the blob
      console.log('Stopping recording...');
      const recordedBlob = await stopRecording();

      console.log('Recording stopped, blob info:', {
        blob: recordedBlob,
        size: recordedBlob?.size,
        type: recordedBlob?.type
      });

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
      cleanup();
      exitFullscreen();
      setMode('select');
    }
  };

  const handleSubmitOrEndInterview = () => {
    if (realtimeAPI.isInterviewComplete || isInterviewConcluded) {
      processVoiceInterviewMutation.mutate();
    } else {
      // Allow ending interview early but don't allow submit unless completed
      realtimeAPI.disconnect();
      exitFullscreen();
      setMode('select');
    }
  };

  
  // Voice mode uses a different, full-screen interface
  if (mode === 'voice') {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${sessionTerminated ? 'bg-red-500' : windowBlurCount > 0 ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
                <span className="text-white font-medium">
                  {sessionTerminated ? 'Session Terminated' : windowBlurCount > 0 ? `${windowBlurCount}/${maxBlurCount} violations` : 'Live Interview'}
                </span>
              </div>
              <div className="text-gray-400 text-sm">
                {selectedInterviewType && `${selectedInterviewType.charAt(0).toUpperCase() + selectedInterviewType.slice(1)} Interview`} • {selectedInterviewLanguage === 'arabic' ? 'Arabic' : 'English'}
              </div>

              {/* Transcription toggle */}
              <button
                onClick={() => setShowTranscription(!showTranscription)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                  showTranscription ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={showTranscription ? 'Hide transcription' : 'Show transcription'}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{showTranscription ? 'Transcript On' : 'Transcript Off'}</span>
              </button>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              disabled={isAiSpeaking || isProcessingInterview || isStartingInterview}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Warning overlay */}
          {warningVisible && !sessionTerminated && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm font-medium">Tab Switch Detected - {maxBlurCount - windowBlurCount} violations remaining</p>
            </div>
          )}

          {/* Session terminated overlay */}
          {sessionTerminated && (
            <div className="absolute inset-0 z-40 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <PhoneOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">Interview Session Terminated</h3>
                <p className="text-gray-300">Your session has been terminated due to multiple window switches.</p>
              </div>
            </div>
          )}

          {/* Main video meeting area */}
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Main content area */}
            <div className="flex-1 flex flex-col p-4 min-h-0">
              <VoiceInterviewComponent
                cameraStream={cameraStream}
                isRecording={isRecording}
                isConnected={realtimeAPI.isConnected}
                isStartingInterview={isStartingInterview}
                isAiSpeaking={isAiSpeaking}
                isProcessingInterview={isProcessingInterview}
                isUploading={isUploading}
                voiceTranscript={voiceTranscript}
                conversationHistory={conversationHistory}
                sessionTerminated={sessionTerminated}
                windowBlurCount={windowBlurCount}
                maxBlurCount={maxBlurCount}
                showTranscription={showTranscription}
                selectedInterviewType={selectedInterviewType}
                selectedInterviewLanguage={selectedInterviewLanguage}
                realtimeAPI={realtimeAPI}
                processVoiceInterviewMutation={processVoiceInterviewMutation}
                onExitInterview={handleExitInterview}
                onToggleTranscription={() => setShowTranscription(!showTranscription)}
                onSubmitOrEndInterview={handleSubmitOrEndInterview}
                cameraError={realtimeAPI.cameraError}
              />
            </div>
          </div>
        </div>

        <ResumeRequiredModal
          isOpen={showResumeModal}
          onClose={() => setShowResumeModal(false)}
          onResumeUploaded={() => {
            setShowResumeModal(false);
            queryClient.invalidateQueries({ queryKey: ['/api/interview/resume-check'] });
            queryClient.invalidateQueries({ queryKey: ['/api/interview/types'] });
            toast({
              title: t('interview.success') || "Success",
              description: t('interview.resumeUploadedSuccessfully') || "Resume uploaded successfully! You can now start interviews.",
              variant: "default",
            });
          }}
        />
      </>
    );
  }

  // Regular dialog for non-voice modes
  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{t('interview.aiInterview') || 'AI Interview'}</DialogTitle>
              {(mode === 'select' && selectedInterviewType) && (
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${sessionTerminated ? 'bg-red-500' : windowBlurCount > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {sessionTerminated ? 'Session Terminated' : windowBlurCount > 0 ? `${windowBlurCount}/${maxBlurCount} violations` : 'Active'}
                  </span>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Window switch warning */}
          {warningVisible && !sessionTerminated && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-red-800">Tab Switch Detected</p>
                  <p className="text-xs text-red-600">
                    Switching tabs during interviews is not allowed. {maxBlurCount - windowBlurCount > 1 ? 's' : ''} before session termination.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Session terminated overlay */}
          {sessionTerminated && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
              <div className="text-center space-y-2">
                <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                  <PhoneOff className="h-4 w-4 text-white" />
                </div>
                <p className="font-medium text-red-800">Interview Session Terminated</p>
                <p className="text-sm text-red-600">
                  Your session has been terminated due to multiple window switches.
                </p>
              </div>
            </div>
          )}

          {mode === 'select' && (
            <ModeSelectionComponent
              selectedInterviewType={selectedInterviewType}
              selectedInterviewLanguage={selectedInterviewLanguage}
              onInterviewTypeChange={setSelectedInterviewType}
              onLanguageChange={setSelectedInterviewLanguage}
              onStartVoiceInterview={handleStartVoiceInterview}
              onStartTextInterview={startTextInterview}
              isStartingInterview={isStartingInterview}
              currentMode={mode}
              enableTextInterviews={enableTextInterviews}
            />
          )}
          {mode === 'text' && (
            <TextInterviewComponent
              messages={messages}
              currentAnswer={currentAnswer}
              onAnswerChange={setCurrentAnswer}
              onSubmitAnswer={handleSubmitAnswer}
              onSubmitInterview={processInterviewCompletion}
              isInterviewConcluded={isInterviewConcluded}
              isProcessingInterview={isProcessingInterview}
              isRespondPending={respondMutation.isPending}
              isStartPending={startInterviewMutation.isPending}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={currentSession?.sessionData?.questions?.length || getQuestionCount(selectedInterviewType)}
              sessionCompleted={currentSession?.isCompleted || false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Violation Rules Dialog */}
      <Dialog open={showViolationRules} onOpenChange={(open) => !open && setShowViolationRules(false)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-red-600">Interview Violation Rules</DialogTitle>
          </DialogHeader>
          <ViolationRulesComponent
            onAccept={handleViolationRulesAccept}
            onDecline={handleViolationRulesDecline}
          />
        </DialogContent>
      </Dialog>

      <ResumeRequiredModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResumeUploaded={() => {
          setShowResumeModal(false);
          queryClient.invalidateQueries({ queryKey: ['/api/interview/resume-check'] });
          queryClient.invalidateQueries({ queryKey: ['/api/interview/types'] });
          toast({
            title: t('interview.success') || "Success",
            description: t('interview.resumeUploadedSuccessfully') || "Resume uploaded successfully! You can now start interviews.",
            variant: "default",
          });
        }}
      />
    </>
  );
}