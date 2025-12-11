// Types for the standalone practice interview feature

export type SeniorityLevel = 'internship' | 'entry-level' | 'junior' | 'mid-level' | 'senior' | 'lead';

export type PracticePhase = 'setup' | 'interview' | 'feedback';

export type InterviewLanguage = 'english' | 'arabic';

export interface PracticeSetupData {
  jobTitle: string;
  seniorityLevel: SeniorityLevel;
  language: InterviewLanguage;
}

export interface InterviewQuestion {
  question: string;
  type?: 'opening' | 'behavioral' | 'technical' | 'closing';
  context?: string;
}

export interface InterviewSet {
  type: string;
  title: string;
  description: string;
  questions: InterviewQuestion[];
}

export interface QuestionFeedback {
  questionIndex: number;
  question: string;
  userAnswer: string;
  score: number;
  feedback: string;
  suggestion: string;
}

export interface PracticeFeedback {
  success: boolean;
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  questionFeedback: QuestionFeedback[];
}

export interface PracticeInterviewStartResponse {
  sessionId: number;
  interviewType: string;
  interviewSet: InterviewSet;
  questions: InterviewQuestion[];
  firstQuestion: string;
  welcomeMessage: string;
  userProfile: any;
  practiceConfig: PracticeSetupData;
}

export interface PracticeInterviewCompleteResponse {
  success: boolean;
  sessionId: number;
  feedback: PracticeFeedback;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface PracticeInterviewState {
  phase: PracticePhase;
  setupData: PracticeSetupData | null;
  sessionId: number | null;
  interviewSet: InterviewSet | null;
  welcomeMessage: string | null;
  conversationHistory: ConversationMessage[];
  feedback: PracticeFeedback | null;
  isLoading: boolean;
  error: string | null;
}

// Seniority level options for the dropdown
export const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string; labelAr: string }[] = [
  { value: 'internship', label: 'Internship', labelAr: 'تدريب' },
  { value: 'entry-level', label: 'Entry Level', labelAr: 'مستوى مبتدئ' },
  { value: 'junior', label: 'Junior', labelAr: 'مبتدئ' },
  { value: 'mid-level', label: 'Mid Level', labelAr: 'متوسط' },
  { value: 'senior', label: 'Senior', labelAr: 'خبير' },
  { value: 'lead', label: 'Lead / Manager', labelAr: 'قائد / مدير' },
];

// Language options
export const LANGUAGE_OPTIONS: { value: InterviewLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'arabic', label: 'العربية (Arabic)' },
];
