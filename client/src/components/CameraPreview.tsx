import { useRef, useEffect, useState } from 'react';
import { CameraOff, AlertCircle, Video, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface CameraPreviewProps {
  stream: MediaStream | null;
  isActive: boolean;
  isRecording?: boolean;
  error?: string | null;
  className?: string;
  connecting?: boolean;
}

export function CameraPreview({ stream, isActive, isRecording = false, error, className = '', connecting = false }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      const handleVideoLoad = () => {
        setIsVideoReady(true);
      };

      videoRef.current.onloadedmetadata = handleVideoLoad;
      videoRef.current.play().catch(err => {
        console.error('Video play error:', err);
      });

      return () => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = null;
        }
      };
    } else if (videoRef.current && !stream) {
      videoRef.current.srcObject = null;
      setIsVideoReady(false);
    }
  }, [stream]);

  if (error) {
    return (
      <Card className={`bg-red-50 border-red-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{t("cameraPreview.errorTitle")}</span>
          </div>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`w-full h-full relative overflow-hidden rounded-lg bg-gray-900 ${(isActive || stream) ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${
            isVideoReady ? 'block' : 'hidden'
          }`}
          style={{ transform: 'scaleX(-1)' }} // Mirror effect for natural feel
        />

        {!isVideoReady && !error && (
          <div className="w-full h-full min-h-32 bg-gray-900 flex items-center justify-center">
            <div className="text-center space-y-2">
              {connecting ? (
                <>
                  <div className="h-12 w-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-400">{t("cameraPreview.connecting")}</p>
                </>
              ) : stream ? (
                <>
                  <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-400">{t("cameraPreview.ready")}</p>
                </>
              ) : (
                <>
                  <CameraOff className="h-12 w-12 text-gray-600 mx-auto" />
                  <p className="text-sm text-gray-400">{t("cameraPreview.inactive")}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Camera status indicator */}
        {(isActive || stream) && isVideoReady && (
          <>
            {isRecording ? (
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
                <Video className="h-4 w-4" />
                <span className="text-xs font-medium">{t("cameraPreview.rec")}</span>
                <Circle className="h-2 w-2 bg-red-800 rounded-full animate-pulse" />
              </div>
            ) : (
              <div className="absolute top-4 right-4 flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded-full">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-medium">{t("cameraPreview.live")}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}