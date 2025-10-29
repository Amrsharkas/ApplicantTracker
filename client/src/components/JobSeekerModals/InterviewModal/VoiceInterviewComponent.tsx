import { Button } from '@/components/ui/button';
import { Mic, MessageCircle, Video, Circle, CheckCircle, PhoneOff, User } from 'lucide-react';
import { CameraPreview } from '@/components/CameraPreview';
import { VideoOverlay } from './VideoOverlay';
import { TranscriptionPanel } from './TranscriptionPanel';

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
  selectedInterviewType: string;
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
  selectedInterviewType,
  selectedInterviewLanguage,
  realtimeAPI,
  processVoiceInterviewMutation,
  onExitInterview,
  onToggleTranscription,
  onSubmitOrEndInterview,
  cameraError
}: VoiceInterviewComponentProps) {
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
                <span className="text-xs font-medium">Recording</span>
                <Circle className="h-2 w-2 bg-red-800 rounded-full animate-pulse" />
              </div>
            )}

            <div className={`h-3 w-3 rounded-full ${
              sessionTerminated ? 'bg-red-500' : windowBlurCount > 0 ? 'bg-yellow-500' : 'bg-green-500'
            } animate-pulse`} />
            <span className="text-gray-400 text-sm">
              {sessionTerminated ? 'Session Terminated' :
               windowBlurCount > 0 ? `${windowBlurCount}/${maxBlurCount} violations` :
               isConnected ? (isRecording ? '🔴 Recording' : '🟢 Live') : '🟡 Connecting...'}
            </span>

            {showTranscription && (
              <span className="text-gray-500 text-xs">
                • Transcription enabled
              </span>
            )}

            {/* Language indicator */}
            <span className="text-gray-500 text-xs">
              • Language: {selectedInterviewLanguage === 'arabic' ? 'العربية' : 'English'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {selectedInterviewType !== 'job-practice' && (
              <button
                onClick={onExitInterview}
                className="text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
                disabled={isAiSpeaking || isProcessingInterview || isUploading}
              >
                ← Exit Interview
              </button>
            )}

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
                    <span>Processing...</span>
                  </>
                ) : realtimeAPI.isInterviewComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Submit Interview</span>
                  </>
                ) : (
                  <>
                    <PhoneOff className="h-4 w-4" />
                    <span>End Interview</span>
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