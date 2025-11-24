import { MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranscriptionPanelProps {
  conversationHistory: Array<{ role: string; content: string }>;
  isAiSpeaking: boolean;
  showTranscription: boolean;
}

export function TranscriptionPanel({
  conversationHistory,
  isAiSpeaking,
  showTranscription
}: TranscriptionPanelProps) {
  const { t } = useLanguage();
  if (!showTranscription) return null;
  const messageCountLabel = t('interview.liveTranscriptionMessages').replace('{{count}}', conversationHistory.length.toString());

  return (
    <div className="bg-gray-900 border-l border-gray-800 flex flex-col h-full min-h-0">
      {/* Transcription header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span>{t('interview.liveTranscriptionTitle')}</span>
          </h3>
          <span className="text-gray-400 text-xs">
            {messageCountLabel}
          </span>
        </div>
      </div>

      {/* Transcription content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 min-h-0">
        {conversationHistory.length > 0 ? (
          conversationHistory.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`flex ${
              item.role === 'assistant' ? 'justify-start' : 'justify-end'
            }`}>
              <div className={`max-w-full px-3 py-2 rounded-lg text-sm ${
                item.role === 'assistant'
                  ? 'bg-blue-600/20 text-blue-100 border border-blue-600/30'
                  : 'bg-green-600/20 text-green-100 border border-green-600/30'
              }`}>
                <div className="flex items-center space-x-1 mb-1">
                  <span className="text-xs font-medium opacity-75">
                    {item.role === 'assistant' ? t('interview.conversationAiLabel') : t('interview.conversationYouLabel')}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{item.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('interview.liveTranscriptionEmpty')}</p>
          </div>
        )}

        {/* AI speaking indicator in transcription */}
        {isAiSpeaking && (
          <div className="flex justify-start">
            <div className="bg-blue-600/20 text-blue-100 border border-blue-600/30 px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">{t('interview.aiSpeakingIndicator')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}