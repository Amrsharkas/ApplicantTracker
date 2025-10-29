import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InterviewMessage } from '../types';

interface TextInterviewComponentProps {
  messages: InterviewMessage[];
  currentAnswer: string;
  onAnswerChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onSubmitInterview: () => void;
  isInterviewConcluded: boolean;
  isProcessingInterview: boolean;
  isRespondPending: boolean;
  isStartPending: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  sessionCompleted: boolean;
}

export function TextInterviewComponent({
  messages,
  currentAnswer,
  onAnswerChange,
  onSubmitAnswer,
  onSubmitInterview,
  isInterviewConcluded,
  isProcessingInterview,
  isRespondPending,
  isStartPending,
  currentQuestionIndex,
  totalQuestions,
  sessionCompleted
}: TextInterviewComponentProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Text Interview</h3>
        <Badge variant="outline">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </Badge>
      </div>

      <div className="max-h-[32rem] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.type === 'question'
                ? 'bg-blue-50 border-l-4 border-blue-400'
                : 'bg-green-50 border-l-4 border-green-400 ml-8'
            }`}
          >
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
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
        {(isRespondPending || isStartPending) && (
          <div className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-400">
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <div className="h-4 w-4 mt-1 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  {isStartPending ? t('interview.preparingQuestions') || 'Preparing questions...' : t('interview.processingYourResponse') || 'Processing your response...'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
      </div>

      {sessionCompleted ? (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-700">Interview Complete!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                {t('interview.interviewSectionCompletedSuccessfully') || 'Interview section completed successfully! Continue with remaining interviews to complete your profile.'}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            placeholder="Type your answer here..."
            value={currentAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="min-h-24"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmitAnswer();
              }
            }}
          />
          <div className="flex justify-between">
            <div className="flex space-x-2 rtl:space-x-reverse">
              {isInterviewConcluded ? (
                <Button
                  onClick={onSubmitInterview}
                  disabled={isProcessingInterview}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessingInterview ? t('interview.submitting') || 'Submitting...' : t('interview.submitInterview') || 'Submit Interview'}
                </Button>
              ) : (
                <Button
                  onClick={onSubmitAnswer}
                  disabled={!currentAnswer.trim() || isRespondPending}
                >
                  {isRespondPending ? t('interview.processing') || 'Processing...' : t('interview.submitAnswer') || 'Submit Answer'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}