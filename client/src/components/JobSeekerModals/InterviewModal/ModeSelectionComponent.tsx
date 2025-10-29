import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MessageCircle, Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ModeSelectionComponentProps {
  selectedInterviewType: string;
  selectedInterviewLanguage: string;
  onInterviewTypeChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onStartVoiceInterview: () => void;
  onStartTextInterview: () => void;
  isStartingInterview: boolean;
  currentMode: string;
  enableTextInterviews: string;
}

export function ModeSelectionComponent({
  selectedInterviewType,
  selectedInterviewLanguage,
  onInterviewTypeChange,
  onLanguageChange,
  onStartVoiceInterview,
  onStartTextInterview,
  isStartingInterview,
  currentMode,
  enableTextInterviews
}: ModeSelectionComponentProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h3 className="text-lg font-semibold">Professional Interview</h3>
        <p className="text-sm text-muted-foreground">
          Choose how you'd like to complete your professional interview
        </p>
      </div>

      {/* Interview Type Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
          <div className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">Interview Type</label>
        </div>
        <Select
          value={selectedInterviewType}
          onValueChange={onInterviewTypeChange}
        >
          <SelectTrigger className="w-full max-w-xs mx-auto">
            <SelectValue placeholder="Select interview type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional Interview</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Language Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">{t('interview.selectLanguage')}</label>
        </div>
        <Select
          value={selectedInterviewLanguage}
          onValueChange={onLanguageChange}
        >
          <SelectTrigger className="w-full max-w-xs mx-auto">
            <SelectValue placeholder={t('interview.selectLanguage')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="english">{t('languages.english')}</SelectItem>
            <SelectItem value="arabic">{t('languages.arabic')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground text-center">
          {t('interview.languageNote')}
        </p>
      </div>

      <div className={`grid ${enableTextInterviews === 'true' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        <Card
          className={`transition-colors ${
            isStartingInterview
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:bg-accent/50'
          }`}
          onClick={isStartingInterview ? undefined : onStartVoiceInterview}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
            {isStartingInterview && currentMode === 'voice' ? (
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mic className="h-8 w-8 text-primary" />
            )}
            <div className="text-center">
              <h4 className="font-medium">{t('voiceInterview') || 'Voice Interview'}</h4>
              <p className="text-sm text-muted-foreground">
                {isStartingInterview && currentMode === 'voice'
                  ? t('startingVoiceInterview') || 'Starting voice interview...'
                  : t('speakNaturally') || 'Speak naturally with the AI interviewer'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {enableTextInterviews === 'true' && (
          <Card
            className={`transition-colors ${
              isStartingInterview
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:bg-accent/50'
            }`}
            onClick={isStartingInterview ? undefined : onStartTextInterview}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
              {isStartingInterview && currentMode === 'text' ? (
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <MessageCircle className="h-8 w-8 text-primary" />
              )}
              <div className="text-center">
                <h4 className="font-medium">{t('textInterview') || 'Text Interview'}</h4>
                <p className="text-sm text-muted-foreground">
                  {isStartingInterview && currentMode === 'text'
                    ? 'Preparing interview questions...'
                    : 'Type your responses at your own pace'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}