import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Send, ArrowRight, Clock } from "lucide-react";

interface ParsedEmployerQuestion {
  question: string;
  expectedAnswer?: string;
}

interface EmployerQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answers: string[]) => void;
  jobTitle: string;
  companyName: string;
  jobId: string;
}

export function EmployerQuestionsModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  jobTitle, 
  companyName, 
  jobId 
}: EmployerQuestionsModalProps) {
  const [questions, setQuestions] = useState<ParsedEmployerQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [rawQuestions, setRawQuestions] = useState<string>('');
  const { toast } = useToast();

  // Fetch real-time questions when modal opens
  useEffect(() => {
    if (isOpen && jobId) {
      fetchRealtimeQuestions();
    } else if (isOpen) {
      setQuestions([]);
      setAnswers([]);
      setRawQuestions('');
    }
  }, [isOpen, jobId]);

  const fetchRealtimeQuestions = async () => {
    setIsParsing(true);
    try {
      console.log('🔄 Fetching real-time employer questions for job:', jobId);
      
      const response = await fetch('/api/employer-questions/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch real-time questions');
      }

      const data = await response.json();
      console.log('📋 Real-time questions response:', data);
      
      setQuestions(data.questions || []);
      setAnswers(new Array(data.questions?.length || 0).fill(''));
      setRawQuestions(data.rawText || '');
      setLastUpdated(data.lastUpdated || new Date().toISOString());
      
      if (data.questions?.length === 0 && data.rawText) {
        toast({
          title: "Questions Updated",
          description: "No valid questions found in the employer text. The employer may need to format their questions properly.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching real-time questions:', error);
      toast({
        title: "Error",
        description: "Failed to load employer questions. Please try again.",
        variant: "destructive",
      });
      onClose();
    } finally {
      setIsParsing(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredQuestions = answers.some(answer => answer.trim() === '');
    
    if (unansweredQuestions) {
      toast({
        title: "Incomplete Answers",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Submit answers and continue with application
      onSubmit(answers);
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast({
        title: "Error",
        description: "Failed to submit answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allAnswered = answers.every(answer => answer.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            Employer Questions
          </DialogTitle>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            <p><strong>{jobTitle}</strong> at <strong>{companyName}</strong></p>
            <p>Please answer the following questions from the employer:</p>
            {lastUpdated && (
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                Questions updated: {new Date(lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {isParsing ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Parsing employer questions...</p>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                No Questions Available
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                The employer has not added any questions for this posting.
              </p>
              {rawQuestions && (
                <div className="text-xs text-slate-400 mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded border">
                  <p className="font-medium mb-1">Raw employer text found:</p>
                  <p className="text-left">{rawQuestions}</p>
                </div>
              )}
              <Button
                variant="outline"
                onClick={fetchRealtimeQuestions}
                disabled={isParsing}
                className="mt-4"
              >
                {isParsing ? 'Refreshing...' : 'Refresh Questions'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((question, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-start gap-3">
                      <Badge variant="outline" className="shrink-0 mt-1">
                        Q{index + 1}
                      </Badge>
                      <span className="leading-relaxed">{question.question}</span>
                    </CardTitle>
                    {question.expectedAnswer && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Tip:</strong> {question.expectedAnswer}
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Type your answer here..."
                      value={answers[index] || ''}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      className="min-h-[100px] resize-none"
                      disabled={isLoading}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {answers[index]?.length || 0} characters
                      </span>
                      {answers[index]?.trim() && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          Answered
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {questions.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>
                  {answers.filter(a => a.trim() !== '').length} of {questions.length} questions answered
                </span>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!allAnswered || isLoading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Answers
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}