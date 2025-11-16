import { Button } from '@/components/ui/button';
import { Video, Circle, CheckCircle, PhoneOff } from 'lucide-react';
import { CameraPreview } from '@/components/CameraPreview';
import { VideoOverlay } from './VideoOverlay';
import { TranscriptionPanel } from './TranscriptionPanel';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceInterviewComponentProps {
  cameraStream: MediaStream | null;
  isRecording: boolean;
  isConnected: boolean;
  isStartingInterview: boolean;
  isAiSpeaking: boolean;
  isProcessingInterview: boolean;
  isUploading: boolean;
  voiceTranscript: string;
  conversationHistory: Array<{ role: string; content: string }>;
  sessionTerminated: boolean;
  windowBlurCount: number;
  maxBlurCount: number;
  showTranscription: boolean;
  selectedInterviewLanguage: string;
  realtimeAPI: any;
  processVoiceInterviewMutation: any;
  onExitInterview: () => void;
  onToggleTranscription: () => void;
  onSubmitOrEndInterview: () => void;
  cameraError?: string;
}

export function VoiceInterviewComponent({
  cameraStream,
  isRecording,
  isConnected,
  isStartingInterview,
  isAiSpeaking,
  isProcessingInterview,
  isUploading,
  voiceTranscript,
  conversationHistory,
  sessionTerminated,
  windowBlurCount,
  maxBlurCount,
  showTranscription,
  selectedInterviewLanguage,
  realtimeAPI,
  processVoiceInterviewMutation,
  onExitInterview,
  onToggleTranscription,
  onSubmitOrEndInterview,
  cameraError
}: VoiceInterviewComponentProps) {
  const { t } = useLanguage();
  const languageLabel = selectedInterviewLanguage === 'arabic' ? t('arabic') : t('english');
  const violationLabel = t('interview.violationCountLabel')
    .replace('{{count}}', windowBlurCount.toString())
    .replace('{{max}}', maxBlurCount.toString());
  const statusText = sessionTerminated
    ? t('interview.sessionTerminatedStatus')
    : windowBlurCount > 0
      ? violationLabel
      : isConnected
        ? (isRecording ? t('interview.recordingStatusLive') : t('interview.liveStatus'))
        : t('interview.connectingStatus');
  const languageIndicator = t('interview.languageIndicator').replace('{{language}}', languageLabel);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Main content area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0 overflow-hidden relative">
        {/* Video section - takes full width when transcription is hidden */}
        <div className={`${showTranscription ? 'lg:col-span-1' : 'lg:col-span-2'} relative bg-gray-900 overflow-hidden`}>
          <CameraPreview
            stream={cameraStream}
            isActive={isConnected}
            isRecording={isRecording}
            error={cameraError}
            connecting={isStartingInterview}
            className="h-full"
          />

          {/* Video overlay with status and AI info */}
          <VideoOverlay
            isConnected={isConnected}
            isStartingInterview={isStartingInterview}
            isAiSpeaking={isAiSpeaking}
            voiceTranscript={voiceTranscript}
          />
        </div>

        {/* Transcription panel */}
        <TranscriptionPanel
          conversationHistory={conversationHistory}
          isAiSpeaking={isAiSpeaking}
          showTranscription={showTranscription}
        />
      </div>

      {/* Meeting controls */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Recording status indicator */}
            {isRecording && (
              <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
                <Video className="h-4 w-4" />
                <span className="text-xs font-medium">{t('interview.recordingBadge')}</span>
                <Circle className="h-2 w-2 bg-red-800 rounded-full animate-pulse" />
              </div>
            )}

            <div className={`h-3 w-3 rounded-full ${
              sessionTerminated ? 'bg-red-500' : windowBlurCount > 0 ? 'bg-yellow-500' : 'bg-green-500'
            } animate-pulse`} />
            <span className="text-gray-400 text-sm">{statusText}</span>

            {showTranscription && (
              <span className="text-gray-500 text-xs">
                • {t('interview.transcriptionEnabled')}
              </span>
            )}

            {/* Language indicator */}
            <span className="text-gray-500 text-xs">
              • {languageIndicator}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
                onClick={onExitInterview}
                className="text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
                disabled={isAiSpeaking || isProcessingInterview || isUploading}
              >
                ← {t('interview.exitInterview')}
              </button>

            {isConnected && (
              <button
                onClick={onSubmitOrEndInterview}
                disabled={isProcessingInterview || processVoiceInterviewMutation.isPending}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  realtimeAPI.isInterviewComplete
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isProcessingInterview || processVoiceInterviewMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>{t('interview.processing')}</span>
                  </>
                ) : realtimeAPI.isInterviewComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{t('interview.submitInterview')}</span>
                  </>
                ) : (
                  <>
                    <PhoneOff className="h-4 w-4" />
                    <span>{t('interview.endInterview')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}