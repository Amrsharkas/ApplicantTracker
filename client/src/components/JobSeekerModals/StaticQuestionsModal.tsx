import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";

interface StaticQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

// Static profile questions
const STATIC_QUESTIONS = [
  "Walk me through a typical day in your life. How does it usually go?",
  "What skills are you most confident in? Which skills do you feel less confident about? Please explain why for both.",
  "What are your non-negotiables when it comes to a job? (Location, salary, work conditions, etc.)",
  "Why are you currently looking for a new job? If you are already employed, what is making you consider leaving? (Salary, work environment, lack of growth, etc.)",
  "What projects are you most proud of? What was your role, and how did you accomplish them?"
];

export function StaticQuestionsModal({
  isOpen,
  onClose,
  onComplete
}: StaticQuestionsModalProps) {
  const [answers, setAnswers] = useState<string[]>(new Array(5).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAnswers(new Array(5).fill(''));
      setCurrentQuestionIndex(0);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const getAnsweredCount = () => {
    return answers.filter(answer => answer.trim() !== '').length;
  };

  const isAllAnswered = () => {
    return answers.every(answer => answer.trim() !== '');
  };

  const handleNext = () => {
    if (currentQuestionIndex < STATIC_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!isAllAnswered()) {
      toast({
        title: t.error || "Error",
        description: "Please answer all 5 questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare answers object
      const answersObject = {
        question1: answers[0],
        question2: answers[1],
        question3: answers[2],
        question4: answers[3],
        question5: answers[4],
      };

      console.log('[StaticQuestions] Submitting answers:', answersObject);

      // Submit to API
      const response = await apiRequest('/api/profile/submit-static-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: answersObject }),
      });

      console.log('[StaticQuestions] Response:', response);

      toast({
        title: t.success || "Success",
        description: "Your answers have been saved and your AI profile has been generated!",
        variant: "default",
      });

      // Call completion callback
      if (onComplete) {
        onComplete();
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('[StaticQuestions] Error submitting:', error);
      toast({
        title: t.error || "Error",
        description: error.message || "Failed to submit answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (getAnsweredCount() / STATIC_QUESTIONS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            {t.completeProfileQuestions || "Complete Your Profile Questions"}
          </DialogTitle>
          <DialogDescription>
            Answer these 5 questions to help us create your AI-powered professional profile.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{getAnsweredCount()} of {STATIC_QUESTIONS.length} questions answered</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Questions - All visible in scroll view */}
        <div className="space-y-6 mt-6">
          {STATIC_QUESTIONS.map((question, index) => (
            <Card
              key={index}
              className={`transition-all ${
                answers[index].trim() !== '' ? 'border-green-500 bg-green-50/50' : ''
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-start gap-2 text-lg">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="flex-1">{question}</span>
                  {answers[index].trim() !== '' && (
                    <CheckCircle className="flex-shrink-0 h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={answers[index]}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder={t.typeYourAnswer || "Type your answer here..."}
                  className="min-h-[120px] resize-none"
                  disabled={isSubmitting}
                />
                <div className="mt-2 text-xs text-muted-foreground text-right">
                  {answers[index].length} characters
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t sticky bottom-0 bg-background">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.cancel || "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isAllAnswered() || isSubmitting}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.submitting || "Submitting..."}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t.submitAnswers || "Submit Answers"}
              </>
            )}
          </Button>
        </div>

        {/* Info Note */}
        {!isAllAnswered() && (
          <div className="text-sm text-muted-foreground text-center mt-2">
            Please answer all questions to continue. Your responses will be used to generate your AI profile.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
