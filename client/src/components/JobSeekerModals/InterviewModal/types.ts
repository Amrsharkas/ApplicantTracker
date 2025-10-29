export interface InterviewQuestion {
  question: string;
  text?: string; // Alternative property for question text
  context?: string;
}

export interface InterviewMessage {
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

export interface InterviewSession {
  id: number;
  sessionData: {
    questions: InterviewQuestion[];
    responses: Array<{ question: string; answer: string }>;
    currentQuestionIndex: number;
    isComplete?: boolean;
    mode?: 'voice' | 'text'; // Added mode property
  };
  isCompleted: boolean;
  generatedProfile?: any;
  interviewType?: string;
}

export interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllInterviewsCompleted?: () => void;
}