import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useRealtimeAPI } from "@/hooks/useRealtimeAPI";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  CheckCircle, 
  Sparkles,
  Clock,
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  MessageSquare,
  ArrowLeft
} from "lucide-react";

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
}

export function InterviewModal({ isOpen, onClose }: InterviewModalProps) {
  const [mode, setMode] = useState<'select' | 'voice' | 'text'>('select');
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [isInterviewConcluded, setIsInterviewConcluded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Voice interview integration
  const realtimeAPI = useRealtimeAPI({
    onMessage: (event) => {
      console.log('Realtime event:', event);
      
      if (event.type === 'response.audio_transcript.delta') {
        // AI speaking
        setVoiceTranscript(prev => prev + (event.delta || ''));
      }
      
      if (event.type === 'response.audio_transcript.done') {
        // AI finished speaking
        const transcript = event.transcript || '';
        const aiMessage: InterviewMessage = {
          type: 'question',
          content: transcript,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        setVoiceTranscript("");
        
        // Check if the AI used "conclude" to signal interview completion
        if (transcript.toLowerCase().includes('conclude')) {
          setIsInterviewConcluded(true);
        }
      }
      
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        // User finished speaking
        const userMessage: InterviewMessage = {
          type: 'answer',
          content: event.transcript || '',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Update conversation history
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: event.transcript || '' }
        ]);
      }
      
      if (event.type === 'input_audio_buffer.speech_started') {
        console.log('User started speaking');
      }
      
      if (event.type === 'input_audio_buffer.speech_stopped') {
        console.log('User stopped speaking');
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
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/interview/start", {});
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSession({
        id: data.sessionId,
        sessionData: {
          questions: data.questions,
          responses: [],
          currentQuestionIndex: 0,
        },
        isCompleted: false,
      });

      // Initialize messages with first question for text mode
      if (mode === 'text' && data.questions.length > 0) {
        const firstQuestion: InterviewMessage = {
          type: 'question',
          content: data.questions[0].question,
          timestamp: new Date()
        };
        setMessages([firstQuestion]);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to start interview",
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

  const submitAnswer = () => {
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
    setVoiceTranscript("");
    setConversationHistory([]);
    setCurrentSession(null);
    setCurrentQuestionIndex(0);
    setIsInterviewConcluded(false);
    onClose();
  };

  const goBack = () => {
    if (mode === 'voice') {
      realtimeAPI.disconnect();
    }
    setMode('select');
    setMessages([]);
    setCurrentAnswer("");
    setVoiceTranscript("");
  };

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (existingSession?.isCompleted) {
      setCurrentSession(existingSession);
    }
  }, [existingSession]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {mode !== 'select' && (
                <Button variant="ghost" size="sm" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span>AI Interview</span>
              </DialogTitle>
            </div>
            {mode === 'voice' && (
              <div className="flex items-center space-x-2">
                <Badge variant={realtimeAPI.isConnected ? "default" : "secondary"}>
                  {realtimeAPI.isConnected ? "Connected" : "Connecting..."}
                </Badge>
                {realtimeAPI.isSpeaking && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-sm">AI Speaking</span>
                  </div>
                )}
                {realtimeAPI.isListening && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Mic className="h-4 w-4" />
                    <span className="text-sm">Listening</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {mode === 'select' && (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-md mx-auto space-y-6 text-center">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">Choose Interview Mode</h3>
                  <p className="text-gray-600">
                    Select how you'd like to complete your AI interview
                  </p>
                </div>

                <div className="space-y-4">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300" onClick={startVoiceInterview}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <Phone className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900">Voice Interview</h4>
                          <p className="text-sm text-gray-600">
                            Speak naturally with our AI interviewer - more intuitive and conversational
                          </p>
                          <Badge variant="outline" className="mt-2">Recommended</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-gray-300" onClick={startTextInterview}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <MessageSquare className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900">Text Interview</h4>
                          <p className="text-sm text-gray-600">
                            Type your responses - take your time to craft detailed answers
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <strong>Note:</strong> Both modes will generate the same comprehensive AI profile. 
                  Choose based on your preference for interaction style.
                </div>
              </div>
            </div>
          )}

          {(mode === 'voice' || mode === 'text') && (
            <div className="h-full flex flex-col">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === 'answer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] flex items-start space-x-2 ${message.type === 'answer' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'answer' ? 'bg-blue-600' : 'bg-gray-600'}`}>
                          {message.type === 'answer' ? (
                            <User className="h-4 w-4 text-white" />
                          ) : (
                            <Bot className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className={`rounded-lg p-3 ${message.type === 'answer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Live voice transcript */}
                {mode === 'voice' && voiceTranscript && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] flex items-start space-x-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-600">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="rounded-lg p-3 bg-gray-100 text-gray-900 border-2 border-blue-200">
                        <p className="text-sm">{voiceTranscript}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-500">Speaking...</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {(startInterviewMutation.isPending || respondMutation.isPending) && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area for Text Mode */}
              {mode === 'text' && currentSession && !currentSession.isCompleted && (
                <div className="border-t p-4">
                  <div className="flex space-x-3">
                    <Textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Type your response here..."
                      className="flex-1 min-h-[80px] resize-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          submitAnswer();
                        }
                      }}
                    />
                    <Button 
                      onClick={submitAnswer}
                      disabled={!currentAnswer.trim() || respondMutation.isPending}
                      size="lg"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Voice Status Indicator */}
              {mode === 'voice' && realtimeAPI.isConnected && (
                <div className="border-t bg-gray-50 p-3">
                  <div className="flex items-center justify-center space-x-3">
                    {realtimeAPI.isListening ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-red-600">Listening...</span>
                        </div>
                      </>
                    ) : realtimeAPI.isSpeaking ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-blue-600">AI Speaking...</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Ready to listen</span>
                    )}
                  </div>
                </div>
              )}

              {/* Voice Controls */}
              {mode === 'voice' && (
                <div className="border-t p-4">
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={realtimeAPI.toggleMute}
                      disabled={!realtimeAPI.isConnected}
                    >
                      {realtimeAPI.isListening ? (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Mute
                        </>
                      ) : (
                        <>
                          <MicOff className="h-4 w-4 mr-2" />
                          Unmute
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant={isInterviewConcluded ? "default" : "destructive"}
                      onClick={async () => {
                        realtimeAPI.disconnect();
                        
                        if (isInterviewConcluded) {
                          // Submit the completed interview
                          try {
                            // Process the conversation history to create an interview session
                            const responses = [];
                            for (let i = 0; i < conversationHistory.length; i += 2) {
                              if (conversationHistory[i]?.role === 'user' && conversationHistory[i + 1]?.role === 'assistant') {
                                responses.push({
                                  question: conversationHistory[i + 1]?.content || '',
                                  answer: conversationHistory[i]?.content || ''
                                });
                              }
                            }
                            
                            // Submit the voice interview responses
                            const submitResponse = await apiRequest("POST", "/api/interview/voice-submit", {
                              responses,
                              conversationHistory
                            });
                            const result = await submitResponse.json();
                            
                            if (result.profile) {
                              setCurrentSession({
                                id: result.sessionId || Date.now(),
                                sessionData: { questions: [], responses, currentQuestionIndex: responses.length },
                                isCompleted: true,
                                generatedProfile: result.profile
                              });
                              // Force a refresh of the profile data to update dashboard
                              queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
                            }
                          } catch (error) {
                            toast({
                              title: "Submission Error",
                              description: "Failed to submit interview. Please try again.",
                              variant: "destructive",
                            });
                          }
                        } else {
                          // Check if interview was completed and refresh session data
                          try {
                            const response = await apiRequest("GET", "/api/interview/session", {});
                            const sessionData = await response.json();
                            if (sessionData?.isCompleted) {
                              setCurrentSession(sessionData);
                              // Force a refresh of the profile data to update dashboard
                              queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
                            } else {
                              setMode('select');
                              setMessages([]);
                              setVoiceTranscript("");
                              onClose();
                            }
                          } catch (error) {
                            // If there's an error, just close normally
                            setMode('select');
                            setMessages([]);
                            setVoiceTranscript("");
                            onClose();
                          }
                        }
                      }}
                      disabled={!realtimeAPI.isConnected}
                      className={isInterviewConcluded ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {isInterviewConcluded ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Interview
                        </>
                      ) : (
                        <>
                          <Phone className="h-4 w-4 mr-2" />
                          Hang Up
                        </>
                      )}
                    </Button>
                    
                    <div className="text-sm text-gray-600 text-center">
                      {realtimeAPI.isConnected ? (
                        "Speak naturally - the AI will respond when you're done talking"
                      ) : (
                        "Connecting to voice interview..."
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completed State */}
          {currentSession?.isCompleted && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">Interview Complete!</h3>
                  <p className="text-gray-600 max-w-md">
                    Your AI interview is finished and your comprehensive professional profile has been generated. 
                    You can now access personalized job matches!
                  </p>
                </div>
                
                {/* AI Profile Preview */}
                {currentSession.generatedProfile && (
                  <div className="bg-blue-50 rounded-lg p-4 max-w-md text-left space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Brain className="h-4 w-4 mr-2 text-blue-600" />
                      Your AI Profile Summary
                    </h4>
                    <p className="text-sm text-gray-700">{currentSession.generatedProfile.summary}</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-gray-600">Key Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentSession.generatedProfile.skills?.slice(0, 4).map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                          {currentSession.generatedProfile.skills?.length > 4 && (
                            <Badge variant="outline" className="text-xs">+{currentSession.generatedProfile.skills.length - 4} more</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Full AI Profile Details */}
                {showProfileDetails && currentSession.generatedProfile && (
                  <div className="bg-gray-50 rounded-lg p-4 max-w-lg text-left space-y-4 max-h-64 overflow-y-auto">
                    <h4 className="font-semibold text-gray-900">Complete AI Profile</h4>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Professional Summary:</span>
                        <p className="text-gray-600 mt-1">{currentSession.generatedProfile.summary}</p>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Key Strengths:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentSession.generatedProfile.strengths?.map((strength: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">{strength}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentSession.generatedProfile.skills?.map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Work Style:</span>
                        <p className="text-gray-600 mt-1">{currentSession.generatedProfile.workStyle}</p>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Career Goals:</span>
                        <p className="text-gray-600 mt-1">{currentSession.generatedProfile.careerGoals}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col space-y-3">
                  <Button onClick={() => setShowProfileDetails(!showProfileDetails)} variant="outline">
                    <Brain className="h-4 w-4 mr-2" />
                    {showProfileDetails ? 'Hide' : 'View'} Full AI Profile
                  </Button>
                  
                  <Button onClick={handleClose}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Continue to Job Matches
                  </Button>
                  
                  {/* Hang Up Button for Voice Mode */}
                  {mode === 'voice' && (
                    <Button 
                      onClick={() => {
                        realtimeAPI.disconnect();
                        handleClose();
                      }} 
                      variant="destructive"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      End Call
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}