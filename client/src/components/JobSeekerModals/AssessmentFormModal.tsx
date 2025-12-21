import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Star, CheckCircle, AlertCircle, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { AssessmentQuestion, AssessmentQuestionType } from "@shared/schema";

interface AssessmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  job: {
    recordId: string;
    jobId: string | number;
    jobTitle: string;
    companyName: string;
    assessmentQuestions: AssessmentQuestion[];
  } | null;
}

interface AssessmentAnswer {
  questionId: string;
  answer: string | number | boolean | string[];
  fileUrl?: string;
}

export function AssessmentFormModal({ isOpen, onClose, onComplete, job }: AssessmentFormModalProps) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Reset state when modal opens with a new job
  useEffect(() => {
    if (isOpen && job) {
      const initialAnswers: Record<string, AssessmentAnswer> = {};
      job.assessmentQuestions.forEach(q => {
        initialAnswers[q.id] = {
          questionId: q.id,
          answer: getDefaultAnswer(q.type),
        };
      });
      setAnswers(initialAnswers);
    }
  }, [isOpen, job?.recordId]);

  const getDefaultAnswer = (type: AssessmentQuestionType): string | number | boolean | string[] => {
    switch (type) {
      case 'yes_no': return '';
      case 'numeric': return '';
      case 'rating': return 0;
      case 'multiple_choice': return '';
      case 'file_upload': return '';
      default: return '';
    }
  };

  const handleAnswerChange = (questionId: string, value: string | number | boolean | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        answer: value,
      }
    }));
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    if (!file) return;

    setUploadingFiles(prev => ({ ...prev, [questionId]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/assessment/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();

      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          questionId,
          answer: data.filename,
          fileUrl: data.fileUrl,
        }
      }));

      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`,
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const removeFile = (questionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer: '',
        fileUrl: undefined,
      }
    }));
    if (fileInputRefs.current[questionId]) {
      fileInputRefs.current[questionId]!.value = '';
    }
  };

  const getAnsweredCount = () => {
    if (!job) return 0;
    return job.assessmentQuestions.filter(q => {
      const answer = answers[q.id]?.answer;
      if (q.type === 'rating') return answer && answer > 0;
      if (q.type === 'file_upload') return answer && answers[q.id]?.fileUrl;
      return answer !== '' && answer !== undefined && answer !== null;
    }).length;
  };

  const validateAnswers = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!job) return { valid: false, errors: ['No job data'] };

    job.assessmentQuestions.forEach(q => {
      const answer = answers[q.id];
      const isRequired = q.validation?.required;

      if (isRequired) {
        if (!answer || answer.answer === '' || answer.answer === undefined || answer.answer === null) {
          errors.push(`"${q.questionText}" is required`);
          return;
        }
        if (q.type === 'rating' && answer.answer === 0) {
          errors.push(`"${q.questionText}" is required`);
          return;
        }
        if (q.type === 'file_upload' && !answer.fileUrl) {
          errors.push(`"${q.questionText}" requires a file upload`);
          return;
        }
      }

      // Additional validation
      if (q.type === 'text' && answer?.answer) {
        const textValue = String(answer.answer);
        if (q.validation?.minLength && textValue.length < q.validation.minLength) {
          errors.push(`"${q.questionText}" must be at least ${q.validation.minLength} characters`);
        }
        if (q.validation?.maxLength && textValue.length > q.validation.maxLength) {
          errors.push(`"${q.questionText}" must be at most ${q.validation.maxLength} characters`);
        }
      }

      if (q.type === 'numeric' && answer?.answer !== '' && answer?.answer !== undefined) {
        const numValue = Number(answer.answer);
        if (q.validation?.minValue !== undefined && numValue < q.validation.minValue) {
          errors.push(`"${q.questionText}" must be at least ${q.validation.minValue}`);
        }
        if (q.validation?.maxValue !== undefined && numValue > q.validation.maxValue) {
          errors.push(`"${q.questionText}" must be at most ${q.validation.maxValue}`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async () => {
    if (!job) return;

    const validation = validateAnswers();
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors[0],
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const responses = Object.values(answers).map(a => ({
        questionId: a.questionId,
        answer: a.answer,
        fileUrl: a.fileUrl,
      }));

      await apiRequest('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobMatchId: job.recordId,
          responses,
        }),
      });

      toast({
        title: "Assessment Submitted",
        description: "Your assessment has been submitted successfully.",
      });

      onComplete();
    } catch (error) {
      console.error('Assessment submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: AssessmentQuestion, index: number) => {
    const answer = answers[question.id];
    const isRequired = question.validation?.required;

    return (
      <div key={question.id} className="space-y-3 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-start gap-2">
          <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium flex items-center justify-center">
            {index + 1}
          </span>
          <div className="flex-1">
            <Label className="text-sm font-medium">
              {question.questionText}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-xs text-slate-500 mt-1">{question.description}</p>
            )}
          </div>
        </div>

        <div className="ml-8">
          {question.type === 'text' && (
            <Textarea
              value={String(answer?.answer || '')}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Enter your answer..."
              rows={3}
              className="resize-none"
              maxLength={question.validation?.maxLength}
            />
          )}

          {question.type === 'multiple_choice' && question.options && (
            <RadioGroup
              value={String(answer?.answer || '')}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="space-y-2"
            >
              {question.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                  <RadioGroupItem value={option.value} id={`${question.id}-${option.id}`} />
                  <Label htmlFor={`${question.id}-${option.id}`} className="cursor-pointer flex-1">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.type === 'yes_no' && (
            <RadioGroup
              value={String(answer?.answer || '')}
              onValueChange={(value) => handleAnswerChange(question.id, value === 'true')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <RadioGroupItem value="true" id={`${question.id}-yes`} />
                <Label htmlFor={`${question.id}-yes`} className="cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <RadioGroupItem value="false" id={`${question.id}-no`} />
                <Label htmlFor={`${question.id}-no`} className="cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          )}

          {question.type === 'numeric' && (
            <Input
              type="number"
              value={answer?.answer === '' || answer?.answer === undefined ? '' : String(answer.answer)}
              onChange={(e) => handleAnswerChange(question.id, e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Enter a number..."
              min={question.validation?.minValue}
              max={question.validation?.maxValue}
              className="max-w-xs"
            />
          )}

          {question.type === 'rating' && (
            <div className="flex items-center gap-1">
              {Array.from({ length: question.ratingScale?.max || 5 }, (_, i) => i + (question.ratingScale?.min || 1)).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAnswerChange(question.id, value)}
                  className={`p-1 transition-colors ${
                    Number(answer?.answer) >= value
                      ? 'text-yellow-500'
                      : 'text-slate-300 hover:text-yellow-400'
                  }`}
                >
                  <Star className="w-6 h-6" fill={Number(answer?.answer) >= value ? 'currentColor' : 'none'} />
                </button>
              ))}
              {answer?.answer > 0 && (
                <span className="ml-2 text-sm text-slate-600">
                  {answer.answer} / {question.ratingScale?.max || 5}
                </span>
              )}
            </div>
          )}

          {question.type === 'file_upload' && (
            <div className="space-y-2">
              {answer?.fileUrl ? (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300 flex-1 truncate">
                    {String(answer.answer)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(question.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={el => fileInputRefs.current[question.id] = el}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(question.id, file);
                    }}
                    accept={question.validation?.allowedFileTypes?.map(t => `.${t}`).join(',') || '.pdf,.doc,.docx,.txt'}
                    className="hidden"
                    id={`file-${question.id}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRefs.current[question.id]?.click()}
                    disabled={uploadingFiles[question.id]}
                    className="gap-2"
                  >
                    {uploadingFiles[question.id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingFiles[question.id] ? 'Uploading...' : 'Choose File'}
                  </Button>
                  <span className="text-xs text-slate-500">
                    {question.validation?.allowedFileTypes?.join(', ').toUpperCase() || 'PDF, DOC, DOCX, TXT'}
                    {question.validation?.maxFileSize && ` (max ${Math.round(question.validation.maxFileSize / 1024 / 1024)}MB)`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!job) return null;

  const totalQuestions = job.assessmentQuestions.length;
  const answeredCount = getAnsweredCount();
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Pre-Interview Assessment
          </DialogTitle>
          <DialogDescription>
            Complete this assessment before starting your interview for {job.jobTitle} at {job.companyName}
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2 pb-4 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Progress: {answeredCount} of {totalQuestions} questions
            </span>
            <span className={`font-medium ${progress === 100 ? 'text-green-600' : 'text-blue-600'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {job.assessmentQuestions
            .sort((a, b) => a.order - b.order)
            .map((question, index) => renderQuestion(question, index))}
        </div>

        <div className="shrink-0 flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Submit Assessment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
