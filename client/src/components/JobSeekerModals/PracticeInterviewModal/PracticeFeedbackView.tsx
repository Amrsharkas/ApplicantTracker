import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  MessageSquare,
  RefreshCw,
  X,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PracticeFeedback, PracticeSetupData } from './types';

interface PracticeFeedbackViewProps {
  feedback: PracticeFeedback;
  practiceConfig: PracticeSetupData | null;
  onPracticeAgain: () => void;
  onClose: () => void;
}

export function PracticeFeedbackView({
  feedback,
  practiceConfig,
  onPracticeAgain,
  onClose
}: PracticeFeedbackViewProps) {
  const { language: uiLanguage } = useLanguage();
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);

  // Determine score color and message
  const getScoreStyle = (score: number) => {
    if (score >= 80) return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' };
    if (score >= 60) return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' };
    if (score >= 40) return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' };
    return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' };
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return uiLanguage === 'ar' ? 'ممتاز!' : 'Excellent!';
    if (score >= 60) return uiLanguage === 'ar' ? 'جيد' : 'Good';
    if (score >= 40) return uiLanguage === 'ar' ? 'يحتاج تحسين' : 'Needs Improvement';
    return uiLanguage === 'ar' ? 'يحتاج مزيد من التدريب' : 'Keep Practicing';
  };

  const scoreStyle = getScoreStyle(feedback.overallScore);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-1">
        {/* Header with Score */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className={`relative p-6 rounded-full ${scoreStyle.bg} ${scoreStyle.border} border-2`}>
              <div className="text-center">
                <div className={`text-4xl font-bold ${scoreStyle.color}`}>
                  {feedback.overallScore}
                </div>
                <div className="text-xs text-muted-foreground">/100</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className={`text-xl font-semibold ${scoreStyle.color}`}>
              {getScoreLabel(feedback.overallScore)}
            </h3>
            {practiceConfig && (
              <p className="text-sm text-muted-foreground mt-1">
                {practiceConfig.jobTitle} ({practiceConfig.seniorityLevel})
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{feedback.summary}</p>
            </div>
          </CardContent>
        </Card>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {uiLanguage === 'ar' ? 'نقاط القوة' : 'Strengths'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <TrendingUp className="h-4 w-4" />
                {uiLanguage === 'ar' ? 'مجالات التحسين' : 'Areas for Improvement'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {feedback.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Question-by-Question Feedback */}
        {feedback.questionFeedback && feedback.questionFeedback.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                {uiLanguage === 'ar' ? 'تحليل الأسئلة' : 'Question Analysis'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion
                type="multiple"
                value={expandedQuestions}
                onValueChange={setExpandedQuestions}
                className="space-y-2"
              >
                {feedback.questionFeedback.map((qf, index) => {
                  const qScoreStyle = getScoreStyle(qf.score);
                  return (
                    <AccordionItem
                      key={index}
                      value={`question-${index}`}
                      className={`border rounded-lg px-4 ${qScoreStyle.border}`}
                    >
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="text-sm font-medium text-left line-clamp-1 flex-1">
                            Q{index + 1}: {qf.question.slice(0, 50)}...
                          </span>
                          <Badge
                            variant="outline"
                            className={`ml-2 ${qScoreStyle.color} ${qScoreStyle.bg}`}
                          >
                            {qf.score}/100
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 space-y-3">
                        {/* Question */}
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm font-medium mb-1">
                            {uiLanguage === 'ar' ? 'السؤال:' : 'Question:'}
                          </p>
                          <p className="text-sm text-muted-foreground">{qf.question}</p>
                        </div>

                        {/* User's Answer Summary */}
                        {qf.userAnswer && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <p className="text-sm font-medium mb-1">
                              {uiLanguage === 'ar' ? 'ملخص إجابتك:' : 'Your Answer Summary:'}
                            </p>
                            <p className="text-sm text-muted-foreground">{qf.userAnswer}</p>
                          </div>
                        )}

                        {/* Feedback */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                          <p className="text-sm font-medium mb-1 text-green-700 dark:text-green-400">
                            {uiLanguage === 'ar' ? 'ما قمت به بشكل جيد:' : 'What You Did Well:'}
                          </p>
                          <p className="text-sm">{qf.feedback}</p>
                        </div>

                        {/* Suggestion */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                          <p className="text-sm font-medium mb-1 text-amber-700 dark:text-amber-400">
                            {uiLanguage === 'ar' ? 'اقتراح للتحسين:' : 'Suggestion for Improvement:'}
                          </p>
                          <p className="text-sm">{qf.suggestion}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={onPracticeAgain}
            className="flex-1 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {uiLanguage === 'ar' ? 'تدرب مرة أخرى' : 'Practice Again'}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            {uiLanguage === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
