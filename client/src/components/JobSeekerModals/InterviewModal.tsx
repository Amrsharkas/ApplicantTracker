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
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  CheckCircle, 
  Sparkles,
  Clock,
  Brain
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
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      
      // Initialize messages with first question
      if (data.questions && data.questions.length > 0) {
        setMessages([{
          type: 'question',
          content: data.questions[0].question,
          timestamp: new Date(),
        }]);
        setCurrentQuestionIndex(0);
      }
      
      setIsStarting(false);
      toast({
        title: "Interview Started",
        description: "Let's begin your AI interview!",
      });
    },
    onError: (error) => {
      setIsStarting(false);
      if (isUnauthorizedError(error)) {
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
        title: "Failed to Start Interview",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ question, answer }: { question: string; answer: string }) => {
      const response = await apiRequest("POST", "/api/interview/respond", {
        sessionId: currentSession?.id,
        question,
        answer,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.isComplete) {
        // Interview completed
        setCurrentSession(prev => prev ? {
          ...prev,
          isCompleted: true,
          generatedProfile: data.profile,
        } : null);
        
        toast({
          title: "Interview Completed!",
          description: "Your profile has been generated successfully.",
        });
        
        // Refresh profile and job matches
        queryClient.invalidateQueries({ queryKey: ["/api/candidate/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/job-matches"] });
      } else if (data.nextQuestion) {
        // Add next question to messages
        setMessages(prev => [...prev, {
          type: 'question',
          content: data.nextQuestion.question,
          timestamp: new Date(),
        }]);
        setCurrentQuestionIndex(prev => prev + 1);
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        title: "Failed to Submit Response",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleStartInterview = async () => {
    setIsStarting(true);
    startInterviewMutation.mutate();
  };

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim() || !currentSession) return;

    const currentQuestion = messages[messages.length - 1];
    if (currentQuestion.type !== 'question') return;

    // Add user's answer to messages
    setMessages(prev => [...prev, {
      type: 'answer',
      content: currentAnswer,
      timestamp: new Date(),
    }]);

    // Submit response
    respondMutation.mutate({
      question: currentQuestion.content,
      answer: currentAnswer,
    });

    setCurrentAnswer("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (existingSession && !currentSession) {
      setCurrentSession(existingSession);
      
      // Reconstruct messages from session data
      if (existingSession.sessionData?.responses) {
        const reconstructedMessages: InterviewMessage[] = [];
        
        existingSession.sessionData.responses.forEach((response, index) => {
          reconstructedMessages.push({
            type: 'question',
            content: response.question,
            timestamp: new Date(),
          });
          reconstructedMessages.push({
            type: 'answer',
            content: response.answer,
            timestamp: new Date(),
          });
        });
        
        setMessages(reconstructedMessages);
        setCurrentQuestionIndex(existingSession.sessionData.responses.length);
      }
    }
  }, [existingSession, currentSession]);

  const getProgress = () => {
    if (!currentSession) return 0;
    const totalQuestions = 6; // Expected number of questions
    const answeredQuestions = currentSession.sessionData?.responses?.length || 0;
    return Math.min((answeredQuestions / totalQuestions) * 100, 100);
  };

  const isWaitingForResponse = respondMutation.isPending;
  const canSubmitAnswer = currentAnswer.trim() && !isWaitingForResponse && currentSession && !currentSession.isCompleted;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            AI Interview
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Progress Bar */}
          {currentSession && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Interview Progress
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {Math.round(getProgress())}% Complete
                </span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>
          )}

          {!currentSession ? (
            /* Welcome Screen */
            <Card className="glass-card bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Welcome to Your AI Interview
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    I'll ask you a few questions to understand your background, skills, and career goals. 
                    This will help me create a comprehensive profile and match you with the best job opportunities.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    <span>Conversational</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="w-4 h-4 text-green-500" />
                    <span>5-10 minutes</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span>AI-Powered</span>
                  </div>
                </div>

                <Button
                  onClick={handleStartInterview}
                  disabled={isStarting}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3"
                >
                  {isStarting ? "Starting Interview..." : "Start Interview"}
                </Button>
              </CardContent>
            </Card>
          ) : currentSession.isCompleted ? (
            /* Completion Screen */
            <Card className="glass-card bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Interview Completed!
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Thank you for completing the interview. Your profile has been generated and you should now see personalized job matches.
                  </p>
                </div>

                {currentSession.generatedProfile && (
                  <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 text-left max-w-2xl mx-auto">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                      Generated Profile Summary:
                    </h4>
                    <div className="space-y-2 text-sm">
                      {currentSession.generatedProfile.summary && (
                        <p className="text-slate-600 dark:text-slate-400">
                          {currentSession.generatedProfile.summary}
                        </p>
                      )}
                      {currentSession.generatedProfile.skills && currentSession.generatedProfile.skills.length > 0 && (
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Key Skills: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {currentSession.generatedProfile.skills.slice(0, 6).map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  Close Interview
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Chat Interface */
            <div className="space-y-4">
              {/* Messages */}
              <div className="max-h-[50vh] overflow-y-auto space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.type === 'answer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${
                        message.type === 'answer' 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                          : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      } rounded-lg p-4 shadow-sm`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.type === 'answer' 
                              ? 'bg-white/20' 
                              : 'bg-gradient-to-r from-purple-500 to-blue-500'
                          }`}>
                            {message.type === 'answer' ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isWaitingForResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer here... (Press Enter to send, Shift+Enter for new line)"
                  rows={3}
                  disabled={isWaitingForResponse || currentSession.isCompleted}
                  className="glass-card resize-none"
                />
                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Be authentic and detailed in your responses for the best matches.
                  </p>
                  
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!canSubmitAnswer}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isWaitingForResponse ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
