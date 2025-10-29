import { User } from 'lucide-react';

interface VideoOverlayProps {
  isConnected: boolean;
  isStartingInterview: boolean;
  isAiSpeaking: boolean;
  voiceTranscript: string;
}

export function VideoOverlay({
  isConnected,
  isStartingInterview,
  isAiSpeaking,
  voiceTranscript
}: VideoOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Top overlay */}
      <div className="bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
              You
            </div>
            {isConnected && (
              <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">Speaking</span>
              </div>
            )}
          </div>

          {/* AI Interviewer status */}
          <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                isStartingInterview ? 'bg-yellow-500' :
                isAiSpeaking ? 'bg-blue-500 animate-pulse' :
                isConnected ? 'bg-green-500' : 'bg-gray-500'
              }`}>
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Interviewer</p>
                <p className="text-xs opacity-75">
                  {isStartingInterview ? 'Setting up...' :
                   isAiSpeaking ? 'Speaking...' :
                   isConnected ? 'Listening' : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom overlay with current AI text */}
      {isAiSpeaking && voiceTranscript && (
        <div className="mt-auto bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-lg max-w-2xl">
            <p className="text-sm font-medium mb-1">AI Interviewer is saying:</p>
            <p className="text-sm">{voiceTranscript}</p>
          </div>
        </div>
      )}
    </div>
  );
}