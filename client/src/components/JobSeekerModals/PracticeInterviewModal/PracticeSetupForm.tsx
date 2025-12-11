import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Briefcase, TrendingUp, Languages, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  PracticeSetupData,
  SeniorityLevel,
  InterviewLanguage,
  SENIORITY_OPTIONS,
  LANGUAGE_OPTIONS
} from './types';

const practiceSetupSchema = z.object({
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  seniorityLevel: z.enum(['internship', 'entry-level', 'junior', 'mid-level', 'senior', 'lead'] as const),
  language: z.enum(['english', 'arabic'] as const),
});

interface PracticeSetupFormProps {
  onSubmit: (data: PracticeSetupData) => void;
  isLoading: boolean;
}

export function PracticeSetupForm({ onSubmit, isLoading }: PracticeSetupFormProps) {
  const { t, language: uiLanguage } = useLanguage();
  const [selectedSeniority, setSelectedSeniority] = useState<SeniorityLevel>('mid-level');
  const [selectedLanguage, setSelectedLanguage] = useState<InterviewLanguage>('english');

  const form = useForm<PracticeSetupData>({
    resolver: zodResolver(practiceSetupSchema),
    defaultValues: {
      jobTitle: '',
      seniorityLevel: 'mid-level',
      language: 'english',
    },
  });

  const handleSubmit = (data: PracticeSetupData) => {
    onSubmit({
      ...data,
      seniorityLevel: selectedSeniority,
      language: selectedLanguage,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full">
            <Mic className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold">
          {uiLanguage === 'ar' ? 'مقابلة تدريبية' : 'Practice Interview'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {uiLanguage === 'ar'
            ? 'تدرب على مقابلات العمل مع ذكاء اصطناعي واحصل على تقييم فوري'
            : 'Practice job interviews with AI and get instant feedback to improve your skills'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Job Title */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            {uiLanguage === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}
          </Label>
          <Input
            {...form.register('jobTitle')}
            placeholder={uiLanguage === 'ar' ? 'مثال: مهندس برمجيات' : 'e.g., Software Engineer'}
            className="w-full"
            disabled={isLoading}
          />
          {form.formState.errors.jobTitle && (
            <p className="text-sm text-red-500">{form.formState.errors.jobTitle.message}</p>
          )}
        </div>

        {/* Seniority Level */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {uiLanguage === 'ar' ? 'المستوى الوظيفي' : 'Seniority Level'}
          </Label>
          <Select
            value={selectedSeniority}
            onValueChange={(value) => setSelectedSeniority(value as SeniorityLevel)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={uiLanguage === 'ar' ? 'اختر المستوى' : 'Select level'} />
            </SelectTrigger>
            <SelectContent>
              {SENIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {uiLanguage === 'ar' ? option.labelAr : option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            {uiLanguage === 'ar' ? 'لغة المقابلة' : 'Interview Language'}
          </Label>
          <Select
            value={selectedLanguage}
            onValueChange={(value) => setSelectedLanguage(value as InterviewLanguage)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={uiLanguage === 'ar' ? 'اختر اللغة' : 'Select language'} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {uiLanguage === 'ar'
              ? 'سيتم إجراء المقابلة باللغة المختارة'
              : 'The interview will be conducted in the selected language'}
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                <Mic className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {uiLanguage === 'ar' ? 'ماذا تتوقع' : 'What to expect'}
                </p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li>{uiLanguage === 'ar' ? '8-10 أسئلة مختلطة (سلوكية وتقنية)' : '8-10 mixed questions (behavioral & technical)'}</li>
                  <li>{uiLanguage === 'ar' ? 'مقابلة صوتية تفاعلية' : 'Interactive voice interview'}</li>
                  <li>{uiLanguage === 'ar' ? 'تقييم فوري بعد الانتهاء' : 'Instant feedback after completion'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          disabled={isLoading || !form.watch('jobTitle')}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uiLanguage === 'ar' ? 'جاري التحضير...' : 'Preparing...'}
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" />
              {uiLanguage === 'ar' ? 'ابدأ المقابلة التدريبية' : 'Start Practice Interview'}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
