import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAPI } from '@/hooks/useRealtimeAPI';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Mic, 
  MicOff, 
  MessageSquare, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock,
  Send,
  Volume2,
  VolumeX,
  ArrowRight,
  Briefcase,
  Building2,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface JobPosting {
  recordId: string;
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  location?: string;
  skills?: string[];
}

interface JobInterviewQuestion {
  question: string;
  context: string;
  expectedSkills: string[];
}

interface JobInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobPosting | null;
}

interface InterviewResponse {
  question: string;
  answer: string;
}

export default function JobInterviewModal({ isOpen, onClose, job }: JobInterviewModalProps) {
  const [step, setStep] = useState<'setup' | 'interview' | 'analysis' | 'results'>('setup');
  const [interviewMethod, setInterviewMethod] = useState<'voice' | 'text'>('text');
  const [language, setLanguage] = useState<'english' | 'arabic'>('english');
  const [questions, setQuestions] = useState<JobInterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interviewStartTime, setInterviewStartTime] = useState<Date | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time API integration for voice interviews
  const realtimeAPI = useRealtimeAPI({
    onMessage: (message) => {
      if (message.type === 'response.audio_transcript.done') {
        // Handle voice response
        const transcript = message.transcript;
        if (transcript && currentQuestionIndex < questions.length) {
          handleAnswerSubmit(transcript);
        }
      }
    },
    onError: (error) => {
      console.error('Real-time API error:', error);
      toast({
        title: "Voice Interview Error",
        description: "There was an issue with the voice interview. Please try text mode.",
        variant: "destructive",
      });
    }
  });

  // Generate questions mutation
  const generateQuestionsMutation = useMutation({
    mutationFn: async () => {
      if (!job) throw new Error('No job selected');
      
      const response = await fetch('/api/job-interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          jobId: job.recordId, 
          language 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setQuestions(data.questions || []);
      setStep('interview');
      setInterviewStartTime(new Date());
      
      if (interviewMethod === 'voice') {
        startVoiceInterview();
      }
    },
    onError: (error) => {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate interview questions. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Analyze responses mutation
  const analyzeResponsesMutation = useMutation({
    mutationFn: async () => {
      if (!job || responses.length === 0) throw new Error('No responses to analyze');
      
      const response = await fetch('/api/job-interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          jobId: job.recordId, 
          responses,
          language 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze responses');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      setStep('results');
    },
    onError: (error) => {
      console.error('Error analyzing responses:', error);
      toast({
        title: "Error",
        description: "Failed to analyze interview responses. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Submit interview mutation
  const submitInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!job || !analysis) throw new Error('No analysis to submit');
      
      const response = await fetch('/api/job-interview/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          jobId: job.recordId, 
          analysis,
          responses 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit interview');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Interview Submitted",
        description: "Your job interview has been submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      onClose();
    },
    onError: (error) => {
      console.error('Error submitting interview:', error);
      toast({
        title: "Error",
        description: "Failed to submit interview. Please try again.",
        variant: "destructive",
      });
    }
  });

  const startVoiceInterview = async () => {
    try {
      await realtimeAPI.connect({ 
        interviewType: 'job-specific',
        jobId: job?.recordId,
        language
      });
    } catch (error) {
      console.error('Failed to start voice interview:', error);
      toast({
        title: "Voice Error",
        description: "Could not start voice interview. Falling back to text mode.",
        variant: "destructive",
      });
      setInterviewMethod('text');
    }
  };

  const handleStartInterview = () => {
    if (!job) return;
    
    setIsGeneratingQuestions(true);
    generateQuestionsMutation.mutate();
    setIsGeneratingQuestions(false);
  };

  const handleAnswerSubmit = (answer?: string) => {
    const finalAnswer = answer || currentAnswer.trim();
    
    if (!finalAnswer) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer before proceeding.",
        variant: "destructive",
      });
      return;
    }

    const newResponse: InterviewResponse = {
      question: questions[currentQuestionIndex].question,
      answer: finalAnswer
    };

    const updatedResponses = [...responses, newResponse];
    setResponses(updatedResponses);
    setCurrentAnswer('');

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Interview completed, analyze responses
      setStep('analysis');
      setIsAnalyzing(true);
      analyzeResponsesMutation.mutate();
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    // Clean up any ongoing voice interview
    if (realtimeAPI.isConnected) {
      realtimeAPI.disconnect();
    }
    
    // Reset state
    setStep('setup');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setResponses([]);
    setCurrentAnswer('');
    setAnalysis(null);
    setInterviewStartTime(null);
    
    onClose();
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
        <Brain className="h-6 w-6 text-blue-600" />
        <div>
          <h3 className="font-semibold text-blue-900">Job-Specific AI Interview</h3>
          <p className="text-sm text-blue-700">
            Get personalized questions based on the job requirements and demonstrate your fit for the role.
          </p>
        </div>
      </div>

      {job && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">{job.jobTitle}</CardTitle>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {job.companyName}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-4">{job.jobDescription}</p>
            {job.skills && job.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">Interview Method</Label>
          <RadioGroup value={interviewMethod} onValueChange={(value) => setInterviewMethod(value as 'voice' | 'text')} className="mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="voice" id="voice" />
              <Label htmlFor="voice" className="flex items-center gap-2 cursor-pointer">
                <Mic className="h-4 w-4" />
                Voice Interview (Real-time conversation)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id="text" />
              <Label htmlFor="text" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="h-4 w-4" />
                Text Interview (Type your answers)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label className="text-base font-medium">Language</Label>
          <RadioGroup value={language} onValueChange={(value) => setLanguage(value as 'english' | 'arabic')} className="mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="english" id="english" />
              <Label htmlFor="english" className="cursor-pointer">English</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="arabic" id="arabic" />
              <Label htmlFor="arabic" className="cursor-pointer">Arabic (Egyptian)</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleStartInterview} 
          disabled={isGeneratingQuestions}
          className="flex items-center gap-2"
        >
          {isGeneratingQuestions ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Preparing...
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />
              Start Interview
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderInterviewStep = () => {
    if (questions.length === 0) return null;

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {interviewStartTime && `Started ${interviewStartTime.toLocaleTimeString()}`}
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Interview Question
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium">{currentQuestion.question}</p>
            
            <div className="text-sm text-gray-600">
              <strong>Focus Areas:</strong> {currentQuestion.expectedSkills.join(', ')}
            </div>

            {interviewMethod === 'text' ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Type your answer here..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex justify-between">
                  <div className="text-sm text-gray-500">
                    {currentAnswer.length} characters
                  </div>
                  <Button 
                    onClick={() => handleAnswerSubmit()}
                    disabled={!currentAnswer.trim()}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {currentQuestionIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant={realtimeAPI.isConnected ? "destructive" : "default"}
                    onClick={realtimeAPI.isConnected ? realtimeAPI.disconnect : startVoiceInterview}
                    className="flex items-center gap-2"
                  >
                    {realtimeAPI.isConnected ? (
                      <>
                        <MicOff className="h-4 w-4" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        Start Recording
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => realtimeAPI.isConnected ? realtimeAPI.mute() : realtimeAPI.unmute()}
                  >
                    {realtimeAPI.isSpeaking ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {realtimeAPI.isConnected && (
                  <div className="text-center text-sm text-gray-600">
                    {realtimeAPI.isListening ? 'Listening...' : 'Ready to listen'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {responses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Previous Responses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-32 overflow-y-auto">
              {responses.map((response, index) => (
                <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                  <div className="font-medium text-gray-700">Q{index + 1}</div>
                  <div className="text-gray-600 truncate">{response.answer}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderAnalysisStep = () => (
    <div className="space-y-6 text-center">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Analyzing Your Responses</h3>
        <p className="text-gray-600 mt-2">
          Our AI is evaluating your answers against the job requirements...
        </p>
      </div>
      <div className="text-sm text-gray-500">
        This may take a few moments
      </div>
    </div>
  );

  const renderResultsStep = () => {
    if (!analysis) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
            analysis.recommendation.qualified 
              ? 'bg-green-100 text-green-800' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            {analysis.recommendation.qualified ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <span className="font-semibold">
              {analysis.recommendation.qualified ? 'Qualified' : 'Needs Improvement'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-600" />
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-center">
                {analysis.overallScore}/100
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Role Compatibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-center">
                {analysis.roleCompatibility.score}/100
              </div>
            </CardContent>
          </Card>
        </div>

        {analysis.skillsAssessment?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Skills Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.skillsAssessment.map((skill: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{skill.skill}</span>
                  <Badge variant={skill.score >= 7 ? "default" : skill.score >= 5 ? "secondary" : "destructive"}>
                    {skill.score}/10
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Detailed Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {analysis.detailedFeedback}
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button 
            onClick={() => submitInterviewMutation.mutate()}
            disabled={submitInterviewMutation.isPending}
            className="flex items-center gap-2"
          >
            {submitInterviewMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Application
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const getStepTitle = () => {
    switch (step) {
      case 'setup': return 'Interview Setup';
      case 'interview': return 'Job Interview';
      case 'analysis': return 'Analyzing Responses';
      case 'results': return 'Interview Results';
      default: return 'Job Interview';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            {getStepTitle()}
            {job && step !== 'setup' && (
              <span className="text-sm font-normal text-gray-600">
                - {job.jobTitle} at {job.companyName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'setup' && renderSetupStep()}
            {step === 'interview' && renderInterviewStep()}
            {step === 'analysis' && renderAnalysisStep()}
            {step === 'results' && renderResultsStep()}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}