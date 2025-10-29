import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ViolationRulesComponentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ViolationRulesComponent({ onAccept, onDecline }: ViolationRulesComponentProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 px-2">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center space-x-2 text-red-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-sm text-red-600 font-medium">
          This interview is fully monitored by advanced AI systems. Any violation ends your session immediately.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800 mb-4">
          Sessions are recorded and reviewed by humans. By continuing you consent to video, audio, and activity recording for fraud prevention.
        </p>

        <div className="space-y-3">
          {[
            "Webcam ON — eye tracking is active. Looking away = flag.",
            "No phones or extra devices — detection = instant disqualification.",
            "Stay on this page — leaving the tab, opening apps, or refreshing ends the interview.",
            "No shortcuts or screenshots — Ctrl/Cmd+Tab, Ctrl+C/Ctrl+V, or screenshots = automatic failure.",
            "Mouse must stay in the window — leaving or prolonged idling triggers termination.",
            "Microphone ON — outside voices or played audio = invalid session.",
            "Face check active — masks, deepfakes, or identity mismatch = termination.",
            "Random verification — follow live instructions immediately when prompted.",
            "Exiting full screen = disqualification",
            "One-strike policy — no warnings, no retries."
          ].map((rule, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <p className="text-sm text-red-700">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          onClick={onDecline}
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          Decline
        </Button>
        <Button
          onClick={onAccept}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          I Agree & Continue
        </Button>
      </div>
    </div>
  );
}