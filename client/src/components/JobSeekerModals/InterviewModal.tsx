import { useState, useRef, useEffect, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, MessageCircle, Phone, PhoneOff, Users, Briefcase, Target, User, CheckCircle, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAPI } from '@/hooks/useRealtimeAPI';
import { useResumeRequirement } from '@/hooks/useResumeRequirement';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ResumeRequiredModal } from '@/components/ResumeRequiredModal';
import { useLanguage } from '@/contexts/LanguageContext';

interface InterviewQuestion {
  question: string;
  text?: string; // Alternative property for question text
  context?: string;
}

interface InterviewMessage {
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

interface InterviewType {
  type: string;
  title: string;
  description: string;
  completed: boolean;
  questions: number;
}

interface InterviewSession {
  id: number;
  sessionData: {
    questions: InterviewQuestion[];
    responses: Array<{ question: string; answer: string }>;
    currentQuestionIndex: number;
    isComplete?: boolean;
    mode?: 'voice' | 'text'; // Added mode property
  };
  isCompleted: boolean;
  generatedProfile?: any;
}

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterviewModal({ isOpen, onClose }: InterviewModalProps) {
  const [mode, setMode] = useState<'types' | 'select' | 'text' | 'voice'>('types');
  const [selectedInterviewType, setSelectedInterviewType] = useState<string>('');
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();

  // Check resume requirement
  const { hasResume, requiresResume, isLoading: isLoadingResume } = useResumeRequirement();

  // Reset interview state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('types');
      setSelectedInterviewType('');
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
    }
  }, [isOpen]);

  // Fetch user profile data for personalized interview questions
  const { data: userProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    enabled: isOpen,
    retry: false,
  });

  // Fetch interview types
  const { data: interviewTypesData } = useQuery({
    queryKey: ["/api/interview/types"],
    enabled: isOpen,
    retry: false,
  });

  // Fetch welcome message
  const { data: welcomeMessageData } = useQuery({
    queryKey: ["/api/interview/welcome"],
    enabled: isOpen && mode !== 'select' && mode !== 'types',
    retry: false,
  });

  // Voice interview integration
  const realtimeAPI = useRealtimeAPI({
    userProfile,
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
        title: 'Voice Interview Error',
        description: 'There was an issue with the voice interview. Please try text mode instead.',
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
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
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
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to start interview. Please try again.",
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
            title: "All Interviews Complete!",
            description: "Your comprehensive AI profile has been generated successfully.",
          });
          
          // Reset to interview types view to show all completed
          setMode('types');
          setSelectedInterviewType('');
        } else if (data.nextInterviewType) {
          // Continue to next interview type automatically
          toast({
            title: "Interview Section Complete",
            description: `Moving to ${data.nextInterviewType} interview...`,
          });
          
          // Automatically start next interview
          setTimeout(() => {
            setSelectedInterviewType(data.nextInterviewType);
            setMode('select');
          }, 1500);
        } else {
          // Individual interview complete with no next type
          toast({
            title: "Interview Section Complete!",
            description: "Continue with the remaining interviews to complete your profile.",
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
        title: "Error",
        description: "Failed to process your response",
        variant: "destructive",
      });
    },
  });

  const processTextInterviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/interview/complete", {
        sessionId: currentSession?.id,
        interviewType: selectedInterviewType
      });
      return response;
    },
    onSuccess: (data) => {
      setCurrentSession(prev => prev ? { ...prev, isCompleted: true, generatedProfile: data.profile } : null);
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interview/types"] });
      
      if (data.allInterviewsCompleted) {
        // Final completion - show profile generation success
        toast({
          title: "All Interviews Complete!",
          description: "Your comprehensive AI profile has been generated successfully.",
        });
        
        // Reset to interview types view to show all completed
        setMode('types');
        setSelectedInterviewType('');
      } else if (data.nextInterviewType) {
        // Continue to next interview type automatically
        toast({
          title: "Interview Section Complete",
          description: `Moving to ${data.nextInterviewType} interview...`,
        });
        
        // Automatically start next interview
        setTimeout(() => {
          setSelectedInterviewType(data.nextInterviewType);
          setMode('select');
        }, 1500);
      } else {
        // Individual interview complete with no next type
        toast({
          title: "Interview Section Complete!",
          description: "Continue with the remaining interviews to complete your profile.",
        });
      }
      
      setIsInterviewConcluded(false);
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "There was an issue submitting your interview. Please try again.",
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
    onSuccess: (data) => {
      setIsProcessingInterview(false);
      setCurrentSession(prev => prev ? { ...prev, isCompleted: true, generatedProfile: data.profile } : null);
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interview/types"] });
      
      realtimeAPI.disconnect();
      setIsInterviewConcluded(false);
      
      if (data.allInterviewsCompleted) {
        // Final completion - show profile generation success and close modal
        toast({
          title: "All Interviews Complete!",
          description: "Your comprehensive AI profile has been generated successfully.",
        });
        onClose();
      } else if (data.nextInterviewType) {
        // Continue to next interview type automatically
        toast({
          title: "Interview Section Complete",
          description: `Moving to ${data.nextInterviewType} interview...`,
        });
        
        // Automatically start next interview
        setTimeout(() => {
          setSelectedInterviewType(data.nextInterviewType);
          setMode('select');
        }, 1500);
      } else {
        // Individual interview complete with no next type
        toast({
          title: "Interview Complete!",
          description: "Your voice interview has been processed successfully.",
        });
        
        // Reset to interview types view
        setMode('types');
        setSelectedInterviewType('');
      }
    },
    onError: (error) => {
      setIsProcessingInterview(false);
      console.error('Voice interview processing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Processing Failed",
        description: `There was an issue processing your interview: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

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
        title: 'Error',
        description: 'Failed to process your answer. Please try again.',
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
          title: "All Interviews Complete!",
          description: "Your comprehensive AI profile has been generated successfully.",
        });
        
        // Reset to interview types view to show all completed
        setMode('types');
        setSelectedInterviewType('');
      } else {
        // Individual interview complete - no profile generated yet
        toast({
          title: "Interview Section Complete!",
          description: "Continue with the remaining interviews to complete your profile.",
        });
        setMode('types');
        setSelectedInterviewType('');
      }
      
    } catch (error) {
      console.error('Error completing interview:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete interview. Please try again.',
        variant: 'destructive'
      });
    }
  };;

  const startVoiceInterview = async () => {
    if (!selectedInterviewType) {
      toast({
        title: 'Error',
        description: 'Please select an interview type first.',
        variant: 'destructive'
      });
      return;
    }

    setIsStartingInterview(true);
    setMode('voice');
    setMessages([]);
    setIsInterviewConcluded(false);
    setConversationHistory([]);
    
    // Show loading message
    const loadingMessage: InterviewMessage = {
      type: 'question',
      content: 'Starting your voice interview... Connecting to AI interviewer...',
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
        questions: interviewData.questions
      });
      
      setIsStartingInterview(false);
      toast({
        title: "Voice Interview Started",
        description: "You can now speak naturally with the AI interviewer.",
      });
    } catch (error) {
      setIsStartingInterview(false);
      console.error('Voice interview error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: 'Connection Failed',
        description: `Could not start voice interview: ${errorMessage}. Please try text mode.`,
        variant: 'destructive'
      });
      setMode('select');
    }
  };

  const startTextInterview = async () => {
    if (!selectedInterviewType) {
      toast({
        title: 'Error',
        description: 'Please select an interview type first.',
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
      content: 'Starting your text interview... Please wait while I prepare your personalized questions.',
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
        title: "Text Interview Started",
        description: "You can now type your responses to the interview questions.",
      });
    } catch (error) {
      setIsStartingInterview(false);
      console.error('Text interview error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: 'Failed to Start Interview',
        description: `Could not start text interview: ${errorMessage}. Please try again.`,
        variant: 'destructive'
      });
      setMode('select');
    }
  };

  const getQuestionCount = (interviewType: string) => {
    switch (interviewType) {
      case 'personal': return 5;
      case 'professional': return 7;
      case 'technical': return 11;
      default: return 7;
    }
  };

  const resetInterview = () => {
    setMode('types');
    setSelectedInterviewType('');
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
  };

  // Reset interview state when modal opens
  useEffect(() => {
    if (isOpen) {
      resetInterview();
    }
  }, [isOpen]);

  const handleClose = () => {
    // Prevent closing during active AI speech or processing
    if (isAiSpeaking || isProcessingInterview || isStartingInterview) {
      toast({
        title: "Interview in Progress",
        description: "Please wait for the current interaction to complete before closing.",
        variant: "default",
      });
      return;
    }
    
    if (realtimeAPI.isConnected) {
      realtimeAPI.disconnect();
    }
    resetInterview();
    onClose();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceTranscript]);

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
                  questions: session.sessionData?.questions
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
              : firstQuestionObj?.question || firstQuestionObj?.text || 'Question 1';
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

  const renderInterviewTypes = () => {
    // Get completion status from user profile
    const personalCompleted = userProfile?.personalInterviewCompleted || false;
    const professionalCompleted = userProfile?.professionalInterviewCompleted || false;
    const technicalCompleted = userProfile?.technicalInterviewCompleted || false;
    
    const interviewTypes = (interviewTypesData && typeof interviewTypesData === 'object' && 'interviewTypes' in interviewTypesData) 
      ? (interviewTypesData as any).interviewTypes || [] : [
      {
        type: 'personal',
        title: 'Personal Interview',
        description: 'Understanding your personal self, background, and history',
        completed: personalCompleted,
        questions: 5
      },
      {
        type: 'professional',
        title: 'Professional Interview',
        description: 'Exploring your career background and professional experience',
        completed: professionalCompleted,
        questions: 7
      },
      {
        type: 'technical',
        title: 'Technical Interview',
        description: 'Dynamic assessment based on your field - problem solving and IQ evaluation',
        completed: technicalCompleted,
        questions: 11
      }
    ];

    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <h3 className="text-lg font-semibold">Choose Your Interview</h3>
          <p className="text-sm text-muted-foreground">
            Complete all 3 interviews to generate your comprehensive AI profile
          </p>
        </div>
        
        <div className="space-y-4">
          {interviewTypes.map((interview: InterviewType) => (
            <Card 
              key={interview.type}
              id={`interview-${interview.type}-button`}
              className={`cursor-pointer hover:bg-accent/50 transition-colors ${interview.completed ? 'border-green-300 bg-green-50' : ''}`}
              onClick={() => {
                setSelectedInterviewType(interview.type);
                setMode('select');
              }}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {interview.type === 'personal' && <User className="h-8 w-8 text-blue-600" />}
                    {interview.type === 'professional' && <Briefcase className="h-8 w-8 text-green-600" />}
                    {interview.type === 'technical' && <Target className="h-8 w-8 text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium flex items-center space-x-2">
                      <span>{interview.title}</span>
                      {interview.completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {interview.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {interview.questions} questions
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {interview.completed ? (
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Start
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderModeSelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h3 className="text-lg font-semibold">{t('interview.chooseStyle')}</h3>
        <p className="text-sm text-muted-foreground">
          {selectedInterviewType.charAt(0).toUpperCase() + selectedInterviewType.slice(1)} Interview - {t('interview.selectExperience')}
        </p>
      </div>
      
      {/* Language Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">{t('interview.selectLanguage')}</label>
        </div>
        <Select 
          value={selectedInterviewLanguage} 
          onValueChange={setSelectedInterviewLanguage}
        >
          <SelectTrigger className="w-full max-w-xs mx-auto">
            <SelectValue placeholder={t('interview.selectLanguage')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="english">{t('languages.english')}</SelectItem>
            <SelectItem value="arabic">{t('languages.arabic')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground text-center">
          {t('interview.languageNote')}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`transition-colors ${
            isStartingInterview 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer hover:bg-accent/50'
          }`} 
          onClick={isStartingInterview ? undefined : startVoiceInterview}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
            {isStartingInterview && mode === 'voice' ? (
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mic className="h-8 w-8 text-primary" />
            )}
            <div className="text-center">
              <h4 className="font-medium">{t('voiceInterview') || 'Voice Interview'}</h4>
              <p className="text-sm text-muted-foreground">
                {isStartingInterview && mode === 'voice' 
                  ? t('startingVoiceInterview') || 'Starting voice interview...' 
                  : t('speakNaturally') || 'Speak naturally with the AI interviewer'
                }
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`transition-colors ${
            isStartingInterview 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer hover:bg-accent/50'
          }`} 
          onClick={isStartingInterview ? undefined : startTextInterview}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
            {isStartingInterview && mode === 'text' ? (
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <MessageCircle className="h-8 w-8 text-primary" />
            )}
            <div className="text-center">
              <h4 className="font-medium">{t('textInterview') || 'Text Interview'}</h4>
              <p className="text-sm text-muted-foreground">
                {isStartingInterview && mode === 'text' 
                  ? 'Preparing interview questions...' 
                  : 'Type your responses at your own pace'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-start">
        <Button variant="outline" onClick={() => setMode('types')}>
          ← Back to Interview Types
        </Button>
      </div>
    </div>
  );

  const renderTextInterview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Text Interview</h3>
        <Badge variant="outline">
          Question {currentQuestionIndex + 1} of {currentSession?.sessionData?.questions?.length || getQuestionCount(selectedInterviewType)}
        </Badge>
      </div>
      
      <div className="max-h-96 overflow-y-auto space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.type === 'question'
                ? 'bg-blue-50 border-l-4 border-blue-400'
                : 'bg-green-50 border-l-4 border-green-400 ml-8'
            }`}
          >
            <div className="flex items-start space-x-2">
              {message.type === 'question' ? (
                <User className="h-4 w-4 mt-1 text-blue-600" />
              ) : (
                <MessageCircle className="h-4 w-4 mt-1 text-green-600" />
              )}
              <div className="flex-1">
                <p className="text-sm">
                  {typeof message.content === 'string' 
                    ? message.content 
                    : 'Question content not available'
                  }
                </p>
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator when processing responses */}
        {(respondMutation.isPending || startInterviewMutation.isPending) && (
          <div className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-400">
            <div className="flex items-start space-x-2">
              <div className="h-4 w-4 mt-1 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  {startInterviewMutation.isPending ? 'Preparing questions...' : 'Processing your response...'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {currentSession?.isCompleted ? (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-700">Interview Complete!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Interview section completed successfully! Continue with remaining interviews to complete your profile.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            placeholder="Type your answer here..."
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="min-h-24"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitAnswer();
              }
            }}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setMode('types')}>
              ← Back to Interview Types
            </Button>
            <div className="flex space-x-2">
              {isInterviewConcluded ? (
                <Button 
                  onClick={() => processInterviewCompletion()}
                  disabled={isProcessingInterview}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessingInterview ? 'Submitting...' : 'Submit Interview'}
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmitAnswer}
                  disabled={!currentAnswer.trim() || respondMutation.isPending}
                >
                  {respondMutation.isPending ? 'Processing...' : 'Submit Answer'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderVoiceInterview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Voice Interview</h3>
        <div className="flex items-center space-x-2">
          {realtimeAPI.isConnected && (
            <Badge variant="default" className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live</span>
            </Badge>
          )}
        </div>
      </div>

      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className={`h-20 w-20 mx-auto rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                realtimeAPI.isConnected 
                  ? 'border-green-500 bg-green-100 animate-pulse' 
                  : 'border-gray-300 bg-gray-100'
              }`}>
                {realtimeAPI.isConnected ? (
                  <Mic className="h-8 w-8 text-green-600" />
                ) : (
                  <MicOff className="h-8 w-8 text-gray-600" />
                )}
              </div>
              {realtimeAPI.isConnected && (
                <div className="absolute inset-0 h-20 w-20 mx-auto rounded-full border-4 border-green-500 animate-ping opacity-30" />
              )}
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">
                {isStartingInterview 
                  ? 'Starting Interview...' 
                  : isAiSpeaking 
                    ? 'AI is Speaking...' 
                    : realtimeAPI.isConnected 
                      ? 'AI Interview Active' 
                      : 'Connecting...'
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {isStartingInterview 
                  ? 'Preparing your personalized questions...'
                  : isAiSpeaking 
                    ? 'Please wait for the AI to finish speaking before responding'
                    : realtimeAPI.isConnected 
                      ? `Speak naturally - the AI will guide you through ${getQuestionCount(selectedInterviewType)} ${selectedInterviewType} questions`
                      : 'Setting up your voice interview...'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {voiceTranscript && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <User className="h-4 w-4 mt-1 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">AI Interviewer</p>
                <p className="text-sm text-blue-700">{voiceTranscript}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="h-48 overflow-y-auto space-y-2 p-2 border rounded-lg bg-gray-50">
        {conversationHistory
          .slice(-6) // Show last 6 messages for better context
          .map((item, index) => (
          <Card key={`${item.role}-${index}-${item.content.substring(0, 20)}`} className={`${
            item.role === 'assistant' 
              ? 'border-blue-200 bg-blue-50' 
              : 'border-green-200 bg-green-50 ml-8'
          }`}>
            <CardContent className="p-3">
              <div className="flex items-start space-x-2">
                {item.role === 'assistant' ? (
                  <User className="h-4 w-4 mt-1 text-blue-600" />
                ) : (
                  <MessageCircle className="h-4 w-4 mt-1 text-green-600" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.role === 'assistant' ? 'text-blue-800' : 'text-green-800'}`}>
                    {item.role === 'assistant' ? 'AI Interviewer' : 'You'}
                  </p>
                  <p className={`text-sm ${item.role === 'assistant' ? 'text-blue-700' : 'text-green-700'}`}>
                    {item.content}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Show AI speaking indicator */}
        {isAiSpeaking && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-3">
              <div className="flex items-start space-x-2">
                <div className="h-4 w-4 mt-1 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800">AI Interviewer</p>
                  <p className="text-sm text-orange-700">Speaking...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {currentSession?.isCompleted && (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-700">Voice Interview Complete!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Interview section completed successfully! Continue with remaining interviews to complete your profile.
              </p>
            </CardContent>
          </Card>


        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setMode('types')}>
          ← Back to Interview Types
        </Button>
        <div className="space-x-2">
          {realtimeAPI.isConnected && (
            <Button
              variant={isInterviewConcluded ? "default" : "destructive"}
              onClick={() => {
                if (isInterviewConcluded) {
                  processVoiceInterviewMutation.mutate();
                } else {
                  // Check if minimum conversation length reached (at least 5 exchanges)
                  const userMessages = conversationHistory.filter(msg => msg.role === 'user');
                  if (userMessages.length >= 3) {
                    console.log('🎯 Minimum voice interview length reached - enabling submit');
                    setIsInterviewConcluded(true);
                    processVoiceInterviewMutation.mutate();
                  } else {
                    // Just hang up
                    realtimeAPI.disconnect();
                    setMode('select');
                  }
                }
              }}
              disabled={isProcessingInterview || processVoiceInterviewMutation.isPending}
            >
              {isProcessingInterview || processVoiceInterviewMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Interview...
                </>
              ) : isInterviewConcluded || conversationHistory.filter(msg => msg.role === 'user').length >= 3 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Interview
                </>
              ) : (
                <>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Hang Up
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Interview</DialogTitle>
          </DialogHeader>
          
          {mode === 'types' && renderInterviewTypes()}
          {mode === 'select' && renderModeSelection()}
          {mode === 'text' && renderTextInterview()}
          {mode === 'voice' && renderVoiceInterview()}
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
            title: "Success",
            description: "Resume uploaded successfully! You can now start interviews.",
            variant: "default",
          });
        }}
      />
    </>
  );
}