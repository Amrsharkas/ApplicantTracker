import { useState, useRef, useEffect, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, MessageCircle, Phone, PhoneOff, Users, Briefcase, Target, User, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAPI } from '@/hooks/useRealtimeAPI';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface InterviewQuestion {
  question: string;
  context?: string;
}

interface InterviewMessage {
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

interface InterviewSession {
  id: number;
  sessionData: {
    questions: InterviewQuestion[];
    responses: Array<{ question: string; answer: string }>;
    currentQuestionIndex: number;
    isComplete?: boolean;
  };
  isCompleted: boolean;
  generatedProfile?: any;
}

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobData?: any; // For job-specific interviews
}

export function InterviewModal({ isOpen, onClose, jobData }: InterviewModalProps) {
  const [mode, setMode] = useState<'select' | 'text' | 'voice'>('select');
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [isInterviewConcluded, setIsInterviewConcluded] = useState(false);
  const [isProcessingInterview, setIsProcessingInterview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile data for personalized interview questions
  const { data: userProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    enabled: isOpen,
    retry: false,
  });

  // Voice interview integration
  const realtimeAPI = useRealtimeAPI({
    userProfile,
    jobData,
    onMessage: (event) => {
      console.log('Realtime event:', event);
      
      if (event.type === 'response.audio_transcript.delta') {
        // AI speaking
        setVoiceTranscript(prev => prev + (event.delta || ''));
      }
      
      if (event.type === 'response.audio_transcript.done') {
        const aiText = event.transcript;
        setVoiceTranscript("");
        
        // Add AI message to conversation history
        setConversationHistory(prev => [...prev, { role: 'assistant', content: aiText }]);
        
        // Check if the AI is concluding the interview
        if (aiText && aiText.toLowerCase().includes('conclude')) {
          setIsInterviewConcluded(true);
        }
      }
      
      if (event.type === 'input_audio_buffer.speech_started') {
        setVoiceTranscript("");
      }
      
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        const userText = event.transcript;
        // Add user message to conversation history
        setConversationHistory(prev => [...prev, { role: 'user', content: userText }]);
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
      if (jobData) {
        // Start job-specific interview
        const response = await apiRequest("POST", "/api/job-interview/start", {
          jobId: jobData.id,
          jobTitle: jobData.title,
          jobDescription: jobData.description,
          company: jobData.company
        });
        return response.json();
      } else {
        // Start regular profile interview
        const response = await apiRequest("POST", "/api/interview/start", {});
        return response.json();
      }
    },
    onSuccess: (data) => {
      // Create session object from the response data
      const session = {
        id: data.sessionId,
        sessionData: {
          questions: data.questions || [],
          responses: [],
          currentQuestionIndex: 0,
          jobContext: jobData ? { 
            jobId: jobData.id, 
            jobTitle: jobData.title, 
            jobDescription: jobData.description, 
            company: jobData.company 
          } : undefined
        },
        isCompleted: false
      };
      
      setCurrentSession(session);
      setCurrentQuestionIndex(0);
      
      if (data.firstQuestion) {
        const firstQuestion: InterviewMessage = {
          type: 'question',
          content: data.firstQuestion,
          timestamp: new Date()
        };
        setMessages([firstQuestion]);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to start ${jobData ? 'job' : 'profile'} interview`,
        variant: "destructive",
      });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (answer: string) => {
      const response = await apiRequest("POST", "/api/interview/respond", {
        sessionId: currentSession?.id,
        answer,
        questionIndex: currentQuestionIndex
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.isComplete) {
        setCurrentSession(prev => prev ? { ...prev, isCompleted: true, generatedProfile: data.profile } : null);
        queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
        toast({
          title: "Interview Complete!",
          description: "Your AI profile has been generated successfully.",
        });
      } else if (data.nextQuestion) {
        const nextQuestion: InterviewMessage = {
          type: 'question',
          content: data.nextQuestion,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, nextQuestion]);
        setCurrentQuestionIndex(prev => prev + 1);
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

  const processVoiceInterviewMutation = useMutation({
    mutationFn: async () => {
      setIsProcessingInterview(true);
      
      // Convert conversation history to the format expected by the API
      const responses = conversationHistory
        .filter((_, index) => index % 2 === 1) // Get only user responses (odd indices)
        .map((item, index) => ({
          question: conversationHistory[index * 2]?.content || `Question ${index + 1}`,
          answer: item.content
        }));

      if (jobData) {
        // Submit job-specific interview
        const response = await apiRequest("POST", "/api/job-interview/submit", {
          sessionId: currentSession?.id,
          responses
        });
        return response.json();
      } else {
        // Submit regular profile interview
        const response = await apiRequest("POST", "/api/interview/complete-voice", {
          conversationHistory: responses
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      setIsProcessingInterview(false);
      setCurrentSession(prev => prev ? { ...prev, isCompleted: true, generatedProfile: data.profile || data.evaluation } : null);
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
      
      if (jobData) {
        // Job interview completed
        toast({
          title: data.approved ? "Congratulations!" : "Interview Complete",
          description: data.message || "Your job interview has been evaluated.",
          variant: data.approved ? "default" : "destructive",
        });
      } else {
        // Regular profile interview completed
        toast({
          title: "Interview Complete!",
          description: "Your AI profile has been generated and saved to your database.",
        });
      }
      
      realtimeAPI.disconnect();
      setIsInterviewConcluded(false);
      onClose();
    },
    onError: (error) => {
      setIsProcessingInterview(false);
      toast({
        title: "Processing Failed",
        description: "There was an issue processing your interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim() || !currentSession) return;

    const answerMessage: InterviewMessage = {
      type: 'answer',
      content: currentAnswer,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, answerMessage]);
    respondMutation.mutate(currentAnswer);
    setCurrentAnswer("");
  };

  const startVoiceInterview = async () => {
    setMode('voice');
    setMessages([]);
    setIsInterviewConcluded(false);
    setConversationHistory([]);
    try {
      await realtimeAPI.connect();
      toast({
        title: "Voice Interview Started",
        description: "You can now speak naturally with the AI interviewer.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not start voice interview. Please try text mode.",
        variant: "destructive",
      });
      setMode('text');
    }
  };

  const startTextInterview = () => {
    setMode('text');
    setMessages([]);
    startInterviewMutation.mutate();
  };

  const handleClose = () => {
    if (mode === 'voice') {
      realtimeAPI.disconnect();
    }
    setMode('select');
    setMessages([]);
    setCurrentAnswer("");
    setCurrentSession(null);
    setIsInterviewConcluded(false);
    setConversationHistory([]);
    onClose();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceTranscript]);

  useEffect(() => {
    if (existingSession?.isCompleted && !currentSession) {
      setCurrentSession(existingSession);
    }
  }, [existingSession, currentSession]);

  const renderModeSelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h3 className="text-lg font-semibold">Choose Your Interview Style</h3>
        <p className="text-sm text-muted-foreground">
          Select how you'd like to experience your AI interview
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={startVoiceInterview}>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
            <Mic className="h-8 w-8 text-primary" />
            <div className="text-center">
              <h4 className="font-medium">Voice Interview</h4>
              <p className="text-sm text-muted-foreground">
                {jobData 
                  ? '2 job-specific questions via voice'
                  : '5 focused questions via voice'
                }
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={startTextInterview}>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
            <MessageCircle className="h-8 w-8 text-primary" />
            <div className="text-center">
              <h4 className="font-medium">Text Interview</h4>
              <p className="text-sm text-muted-foreground">
                {jobData 
                  ? '2 job-specific questions via text'
                  : '5 focused questions via text'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTextInterview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {jobData ? 'Job Application Interview' : 'Text Interview'}
        </h3>
        <Badge variant="outline">
          Question {currentQuestionIndex + 1} of {jobData ? 2 : 5}
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
                <p className="text-sm">{message.content}</p>
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
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
                Your AI profile has been generated successfully.
              </p>
            </CardContent>
          </Card>

          {currentSession.generatedProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Your Generated AI Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {currentSession.generatedProfile.summary}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProfileDetails(!showProfileDetails)}
                  >
                    {showProfileDetails ? 'Hide' : 'Show'} Full Profile Details
                  </Button>

                  {showProfileDetails && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="skills">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center space-x-2">
                            <Target className="h-4 w-4" />
                            <span>Skills & Expertise</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-wrap gap-2">
                            {currentSession.generatedProfile.skills?.map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="strengths">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>Key Strengths</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {currentSession.generatedProfile.strengths?.map((strength: string, index: number) => (
                              <li key={index}>{strength}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="workstyle">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center space-x-2">
                            <Briefcase className="h-4 w-4" />
                            <span>Work Style & Goals</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="font-medium">Work Style:</span>
                              <p className="text-muted-foreground mt-1">{currentSession.generatedProfile.workStyle}</p>
                            </div>
                            <div>
                              <span className="font-medium">Career Goals:</span>
                              <p className="text-muted-foreground mt-1">{currentSession.generatedProfile.careerGoals}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
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
            <Button variant="outline" onClick={() => setMode('select')}>
              ← Back to Options
            </Button>
            <Button 
              onClick={handleSubmitAnswer}
              disabled={!currentAnswer.trim() || respondMutation.isPending}
            >
              {respondMutation.isPending ? 'Processing...' : 'Submit Answer'}
            </Button>
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
                {realtimeAPI.isConnected ? 'AI Interview Active' : 'Connecting...'}
              </p>
              <p className="text-sm text-muted-foreground">
                {realtimeAPI.isConnected 
                  ? (jobData 
                      ? 'Speak naturally - the AI will guide you through 2 job-specific questions'
                      : 'Speak naturally - the AI will guide you through 5 focused questions'
                    )
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
        {conversationHistory.slice(-4).map((item, index) => (
          <Card key={index} className={`${
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
                Your AI profile has been generated successfully.
              </p>
            </CardContent>
          </Card>

          {currentSession.generatedProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Your Generated AI Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {currentSession.generatedProfile.summary}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProfileDetails(!showProfileDetails)}
                  >
                    {showProfileDetails ? 'Hide' : 'Show'} Full Profile Details
                  </Button>

                  {showProfileDetails && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="skills">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center space-x-2">
                            <Target className="h-4 w-4" />
                            <span>Skills & Expertise</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-wrap gap-2">
                            {currentSession.generatedProfile.skills?.map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="strengths">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>Key Strengths</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {currentSession.generatedProfile.strengths?.map((strength: string, index: number) => (
                              <li key={index}>{strength}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="workstyle">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center space-x-2">
                            <Briefcase className="h-4 w-4" />
                            <span>Work Style & Goals</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="font-medium">Work Style:</span>
                              <p className="text-muted-foreground mt-1">{currentSession.generatedProfile.workStyle}</p>
                            </div>
                            <div>
                              <span className="font-medium">Career Goals:</span>
                              <p className="text-muted-foreground mt-1">{currentSession.generatedProfile.careerGoals}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setMode('select')}>
          ← Back to Options
        </Button>
        <div className="space-x-2">
          {realtimeAPI.isConnected && (
            <Button
              variant={isInterviewConcluded ? "default" : "destructive"}
              onClick={() => {
                if (isInterviewConcluded) {
                  processVoiceInterviewMutation.mutate();
                } else {
                  // Just hang up
                  realtimeAPI.disconnect();
                  setMode('select');
                }
              }}
              disabled={isProcessingInterview || processVoiceInterviewMutation.isPending}
            >
              {isProcessingInterview || processVoiceInterviewMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Interview...
                </>
              ) : isInterviewConcluded ? (
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {jobData ? `Interview for ${jobData.title} at ${jobData.company}` : 'AI Interview'}
          </DialogTitle>
        </DialogHeader>
        
        {mode === 'select' && renderModeSelection()}
        {mode === 'text' && renderTextInterview()}
        {mode === 'voice' && renderVoiceInterview()}
      </DialogContent>
    </Dialog>
  );
}