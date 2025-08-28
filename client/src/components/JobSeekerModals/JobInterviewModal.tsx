import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useJobInterviewAPI } from "@/hooks/useJobInterviewAPI";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Loader2,
  AlertCircle
} from "lucide-react";

interface JobInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  companyName: string;
  jobRecordId: string;
  mode: 'voice' | 'text';
  language: 'english' | 'arabic';
}

export function JobInterviewModal({ 
  isOpen, 
  onClose, 
  jobTitle, 
  companyName, 
  jobRecordId,
  mode,
  language 
}: JobInterviewModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionCount, setQuestionCount] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'interviewer' | 'candidate';
    content: string;
    timestamp: Date;
  }>>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  
  const conversationRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch job details
  const fetchJobDetails = async () => {
    try {
      const details = await apiRequest(`/api/job/${jobRecordId}/details`);
      setJobDetails(details);
      return details;
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch job details. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const { 
    connect, 
    disconnect, 
    sendMessage,
    isConnecting, 
    isConnected, 
    isSpeaking, 
    isListening 
  } = useJobInterviewAPI({
    onMessage: (message: any) => {
      console.log('📨 Interview message received:', message);
      
      if (message.type === 'response.text.delta') {
        setCurrentQuestion(prev => prev + (message.delta || ''));
      } else if (message.type === 'response.text.done') {
        const fullQuestion = message.text;
        if (fullQuestion && fullQuestion.trim()) {
          setConversationHistory(prev => [...prev, {
            role: 'interviewer',
            content: fullQuestion,
            timestamp: new Date()
          }]);
          
          // Check if this is the final question (contains "10" or completion indicators)
          if (fullQuestion.toLowerCase().includes('question 10') || 
              fullQuestion.toLowerCase().includes('final question') ||
              fullQuestion.toLowerCase().includes('conclude') ||
              fullQuestion.toLowerCase().includes('thank you for your time')) {
            setQuestionCount(10);
          } else {
            // Extract question number if possible
            const questionMatch = fullQuestion.match(/question\s+(\d+)/i);
            if (questionMatch) {
              setQuestionCount(parseInt(questionMatch[1]));
            } else {
              setQuestionCount(prev => Math.min(prev + 1, 10));
            }
          }
        }
        setCurrentQuestion("");
      } else if (message.type === 'input_audio_buffer.speech_started') {
        // User started speaking
      } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
        if (message.transcript && message.transcript.trim()) {
          setConversationHistory(prev => [...prev, {
            role: 'candidate',
            content: message.transcript,
            timestamp: new Date()
          }]);
        }
      }
    },
    onError: (error) => {
      console.error('Interview connection error:', error);
      toast({
        title: "Connection Error",
        description: "Interview connection failed. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Submit interview results
  const submitInterviewMutation = useMutation({
    mutationFn: async ({ transcript, analysis }: { transcript: string; analysis: string }) => {
      return await apiRequest('/api/job-interview/submit', {
        method: 'POST',
        body: JSON.stringify({
          jobRecordId,
          jobTitle,
          companyName,
          jobDescription: jobDetails?.jobDescription || '',
          interviewTranscript: transcript,
          interviewAnalysis: analysis
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Interview Submitted",
        description: "Your job interview has been submitted successfully!",
        variant: "default",
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error('Error submitting interview:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit interview. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Start interview
  const startInterview = async () => {
    try {
      const details = await fetchJobDetails();
      setInterviewStarted(true);
      
      await connect({
        mode,
        language,
        jobTitle,
        jobDescription: details.jobDescription,
        jobRequirements: details.jobRequirements
      });
    } catch (error) {
      console.error('Failed to start interview:', error);
      setInterviewStarted(false);
    }
  };

  // Send text response
  const sendTextResponse = () => {
    if (!currentResponse.trim()) return;
    
    // Add user response to conversation
    setConversationHistory(prev => [...prev, {
      role: 'candidate',
      content: currentResponse,
      timestamp: new Date()
    }]);
    
    // For text mode, we'll need to implement text-based interview logic
    // This would involve sending the response to the server and getting the next question
    
    setCurrentResponse("");
  };

  // Complete interview
  const completeInterview = () => {
    const transcript = conversationHistory
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
    
    const analysis = `Job-specific interview completed for ${jobTitle} at ${companyName}. 
Total questions: ${questionCount}/10. 
Interview conducted in ${language} via ${mode} mode.
Candidate responses were recorded and analyzed for job fit assessment.`;
    
    submitInterviewMutation.mutate({ transcript, analysis });
  };

  // Auto-scroll conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversationHistory, currentQuestion]);

  // Check if interview is complete
  useEffect(() => {
    if (questionCount >= 10 && conversationHistory.length > 0) {
      setIsInterviewComplete(true);
    }
  }, [questionCount, conversationHistory]);

  const handleClose = () => {
    disconnect();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div>
              Job Interview - {jobTitle}
              <p className="text-sm font-normal text-gray-600 mt-1">{companyName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{mode === 'voice' ? 'Voice' : 'Text'}</Badge>
              <Badge variant="outline">{language === 'arabic' ? 'العربية' : 'English'}</Badge>
              <Badge variant="outline">Question {questionCount}/10</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {!interviewStarted ? (
            // Start screen
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="max-w-md w-full">
                <CardContent className="p-6 text-center space-y-4">
                  <MessageSquare className="h-12 w-12 text-blue-600 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Ready to Start?</h3>
                    <p className="text-gray-600 text-sm">
                      This interview will assess your fit for the {jobTitle} position with 10 tailored questions.
                    </p>
                  </div>
                  <Button 
                    onClick={startInterview}
                    disabled={isConnecting}
                    className="w-full"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Start Interview
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Conversation Area */}
              <div 
                ref={conversationRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
              >
                <AnimatePresence>
                  {conversationHistory.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-lg ${
                          msg.role === 'interviewer'
                            ? 'bg-white border border-gray-200 text-gray-900'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">
                          {msg.role === 'interviewer' ? 'Interviewer' : 'You'}
                        </p>
                        <p>{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Current question being typed */}
                {currentQuestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] p-4 rounded-lg bg-white border border-gray-200">
                      <p className="text-sm font-medium mb-1">Interviewer</p>
                      <p>{currentQuestion}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100" />
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Interview Controls */}
              <div className="border-t bg-white p-4">
                {mode === 'voice' ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      {isListening ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Mic className="h-5 w-5" />
                          <span className="text-sm font-medium">Listening...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <MicOff className="h-5 w-5" />
                          <span className="text-sm">Mic Off</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="h-4 w-px bg-gray-300" />
                    
                    <div className="flex items-center gap-2">
                      {isSpeaking ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Volume2 className="h-5 w-5" />
                          <span className="text-sm font-medium">AI Speaking...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <VolumeX className="h-5 w-5" />
                          <span className="text-sm">AI Silent</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Textarea
                      value={currentResponse}
                      onChange={(e) => setCurrentResponse(e.target.value)}
                      placeholder="Type your response here..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendTextResponse();
                        }
                      }}
                    />
                    <Button
                      onClick={sendTextResponse}
                      disabled={!currentResponse.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {isInterviewComplete && (
                  <div className="flex items-center justify-center mt-4">
                    <Button
                      onClick={completeInterview}
                      disabled={submitInterviewMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {submitInterviewMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Complete Interview
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}