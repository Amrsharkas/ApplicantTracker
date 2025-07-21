import { useState, useRef, useEffect, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { User, MessageCircle, Mic, MicOff, PhoneOff, CheckCircle, ArrowRight } from 'lucide-react';
import { useRealtimeAPI } from '@/hooks/useRealtimeAPI';

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewType?: 'personal' | 'professional' | 'technical';
}

interface InterviewMessage {
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

interface InterviewSession {
  sessionId: number;
  interviewSet?: any;
  questions?: string[];
  isCompleted?: boolean;
}

const INTERVIEW_CONFIGS = {
  personal: {
    title: 'Personal Background Interview',
    description: 'Share your personal background, values, and motivations',
    questionCount: 5,
    color: 'blue'
  },
  professional: {
    title: 'Professional Experience Interview',
    description: 'Discuss your work experience and career journey',
    questionCount: 7,
    color: 'green'
  },
  technical: {
    title: 'Technical Skills Interview',
    description: 'Demonstrate your technical knowledge and problem-solving abilities',
    questionCount: 11,
    color: 'purple'
  }
};

export const InterviewModal = memo(({ isOpen, onClose, interviewType: propInterviewType }: InterviewModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeAPI = useRealtimeAPI();

  // States
  const [selectedInterviewType, setSelectedInterviewType] = useState<'personal' | 'professional' | 'technical'>(
    propInterviewType || 'personal'
  );
  const [mode, setMode] = useState<'types' | 'selection' | 'text' | 'voice'>('types');
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentInterviewSession, setCurrentInterviewSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isInterviewConcluded, setIsInterviewConcluded] = useState(false);

  // Query for user profile and completion status
  const { data: userProfile } = useQuery({
    queryKey: ['/api/candidate/profile'],
    enabled: isOpen && !!user
  });

  // Query for interview completion status
  const { data: interviewStatus } = useQuery({
    queryKey: ['/api/interview/status'],
    enabled: isOpen && !!user
  });

  // Query for welcome message
  const { data: welcomeMessageData } = useQuery({
    queryKey: ['/api/interview/welcome', selectedInterviewType],
    enabled: isOpen && !!user && mode !== 'types'
  });

  // Mutations
  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/interview/start/${selectedInterviewType}`, {
        method: 'POST',
        body: { interviewType: selectedInterviewType }
      });
      return response;
    },
    onSuccess: (data) => {
      setCurrentInterviewSession(data);
      setMessages([]);
      setCurrentQuestionIndex(0);
      
      // Add welcome message if available
      if (welcomeMessageData?.welcomeMessage) {
        setMessages(prev => [...prev, {
          type: 'question',
          content: welcomeMessageData.welcomeMessage,
          timestamp: new Date()
        }]);
      }

      // Add first question
      if (data.questions && data.questions.length > 0) {
        setMessages(prev => [...prev, {
          type: 'question',
          content: data.questions[0],
          timestamp: new Date()
        }]);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Interview Start Failed",
        description: error.message || "Failed to start interview. Please try again.",
        variant: "destructive",
      });
    }
  });

  const respondMutation = useMutation({
    mutationFn: async (answer: string) => {
      if (!currentInterviewSession) throw new Error("No active session");
      
      const response = await apiRequest(`/api/interview/${currentInterviewSession.sessionId}/respond`, {
        method: 'POST',
        body: { 
          answer: answer.trim(),
          currentQuestionIndex 
        }
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.nextQuestion) {
        setMessages(prev => [...prev, {
          type: 'question',
          content: data.nextQuestion,
          timestamp: new Date()
        }]);
        setCurrentQuestionIndex(prev => prev + 1);
      }

      if (data.isCompleted) {
        setIsInterviewConcluded(true);
      }
    }
  });

  const processTextInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!currentInterviewSession) throw new Error("No active session");
      
      const response = await apiRequest(`/api/interview/${currentInterviewSession.sessionId}/process`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interview/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/profile'] });
      
      toast({
        title: "Interview Complete!",
        description: "Your AI profile has been generated successfully.",
      });
      
      onClose();
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle close
  const handleClose = () => {
    if (realtimeAPI.isConnected) {
      realtimeAPI.disconnect();
    }
    setMode('types');
    setMessages([]);
    setCurrentAnswer('');
    setCurrentInterviewSession(null);
    setCurrentQuestionIndex(0);
    setIsInterviewConcluded(false);
    onClose();
  };

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) return;
    
    // Add user's answer to messages
    setMessages(prev => [...prev, {
      type: 'answer',
      content: currentAnswer.trim(),
      timestamp: new Date()
    }]);
    
    respondMutation.mutate(currentAnswer.trim());
    setCurrentAnswer("");
  };

  const getQuestionCount = (type: 'personal' | 'professional' | 'technical') => {
    return INTERVIEW_CONFIGS[type].questionCount;
  };

  const isInterviewCompleted = (type: 'personal' | 'professional' | 'technical') => {
    return interviewStatus?.[type] || false;
  };

  // Render functions
  const renderInterviewTypes = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Complete Your AI Interview</h3>
        <p className="text-sm text-muted-foreground">
          Complete all three interview types to generate your comprehensive AI profile
        </p>
      </div>

      <div className="space-y-3">
        {(Object.keys(INTERVIEW_CONFIGS) as Array<keyof typeof INTERVIEW_CONFIGS>).map((type) => {
          const config = INTERVIEW_CONFIGS[type];
          const completed = isInterviewCompleted(type);
          
          return (
            <Card 
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                completed ? 'border-green-200 bg-green-50' : 'hover:border-blue-200'
              }`}
              onClick={() => {
                if (!completed) {
                  setSelectedInterviewType(type);
                  setMode('selection');
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{config.title}</h4>
                      {completed && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {config.description}
                    </p>
                    <Badge variant="outline">
                      {config.questionCount} questions
                    </Badge>
                  </div>
                  {!completed && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderModeSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {INTERVIEW_CONFIGS[selectedInterviewType].title}
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred interview format
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-blue-200"
          onClick={() => {
            setMode('text');
            startInterviewMutation.mutate();
          }}
        >
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h4 className="font-medium mb-2">Text Interview</h4>
            <p className="text-sm text-muted-foreground">
              Type your responses in a chat-like interface
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-green-200"
          onClick={() => {
            setMode('voice');
            startInterviewMutation.mutate();
          }}
        >
          <CardContent className="p-6 text-center">
            <Mic className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h4 className="font-medium mb-2">Voice Interview</h4>
            <p className="text-sm text-muted-foreground">
              Speak naturally with our AI interviewer
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-4">
        <Button variant="outline" onClick={() => setMode('types')}>
          ← Back to Interview Types
        </Button>
      </div>
    </div>
  );

  const renderTextInterview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {INTERVIEW_CONFIGS[selectedInterviewType].title}
        </h3>
        <Badge variant="outline">
          Question {currentQuestionIndex + 1} of {getQuestionCount(selectedInterviewType)}
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

      {currentInterviewSession?.isCompleted || isInterviewConcluded ? (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-700">Interview Complete!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Your AI profile has been generated successfully. You can now explore job opportunities.
              </p>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setMode('types')}>
              ← Back to Interview Types
            </Button>
            <Button 
              onClick={() => processTextInterviewMutation.mutate()}
              disabled={processTextInterviewMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {processTextInterviewMutation.isPending ? 'Submitting...' : 'Complete Interview'}
            </Button>
          </div>
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
              <Button 
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || respondMutation.isPending}
              >
                {respondMutation.isPending ? 'Processing...' : 'Submit Answer'}
              </Button>
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
        <Badge variant="outline">
          {getQuestionCount(selectedInterviewType)} questions
        </Badge>
      </div>

      {/* Connection Status */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className={`h-20 w-20 mx-auto rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
              realtimeAPI.isConnected 
                ? 'border-green-500 bg-green-100' 
                : 'border-gray-300 bg-gray-100'
            }`}>
              {realtimeAPI.isConnected ? (
                <Mic className="h-8 w-8 text-green-600" />
              ) : (
                <MicOff className="h-8 w-8 text-gray-600" />
              )}
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">
                {realtimeAPI.isConnected ? 'Voice Interview Active' : 
                 realtimeAPI.isConnecting ? 'Connecting...' : 
                 'Ready to Connect'}
              </p>
              <p className="text-sm text-muted-foreground">
                {realtimeAPI.isConnected ? 'Speak naturally with the AI interviewer' :
                 realtimeAPI.isConnecting ? 'Setting up your voice interview...' :
                 'Click connect to start your voice interview'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation History */}
      <div className="h-48 overflow-y-auto space-y-2 p-2 border rounded-lg bg-gray-50">
        {realtimeAPI.conversation.map((item, index) => (
          <Card key={index} className={`${
            item.type === 'assistant' 
              ? 'border-blue-200 bg-blue-50' 
              : 'border-green-200 bg-green-50 ml-8'
          }`}>
            <CardContent className="p-3">
              <div className="flex items-start space-x-2">
                {item.type === 'assistant' ? (
                  <User className="h-4 w-4 mt-1 text-blue-600" />
                ) : (
                  <MessageCircle className="h-4 w-4 mt-1 text-green-600" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.type === 'assistant' ? 'text-blue-800' : 'text-green-800'}`}>
                    {item.type === 'assistant' ? 'AI Interviewer' : 'You'}
                  </p>
                  <p className={`text-sm ${item.type === 'assistant' ? 'text-blue-700' : 'text-green-700'}`}>
                    {item.content}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setMode('types')}>
          ← Back to Interview Types
        </Button>
        <div className="space-x-2">
          {!realtimeAPI.isConnected && !realtimeAPI.isConnecting ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setMode('text');
                  setMessages([]);
                }}
              >
                Switch to Text
              </Button>
              <Button
                onClick={() => {
                  if (currentInterviewSession) {
                    realtimeAPI.connect({
                      interviewType: selectedInterviewType,
                      questions: currentInterviewSession.questions || [],
                      interviewSet: currentInterviewSession.interviewSet
                    });
                  }
                }}
                disabled={!currentInterviewSession || startInterviewMutation.isPending}
              >
                {startInterviewMutation.isPending ? 'Starting...' : 'Connect Voice Interview'}
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={() => {
                realtimeAPI.disconnect();
              }}
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Hang Up
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
          <DialogTitle>AI Interview</DialogTitle>
        </DialogHeader>
        
        {mode === 'types' && renderInterviewTypes()}
        {mode === 'selection' && renderModeSelection()}
        {mode === 'text' && renderTextInterview()}
        {mode === 'voice' && renderVoiceInterview()}
      </DialogContent>
    </Dialog>
  );
});

InterviewModal.displayName = 'InterviewModal';