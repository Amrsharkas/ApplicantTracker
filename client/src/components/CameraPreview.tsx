import { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CameraPreviewProps {
  stream: MediaStream | null;
  isActive: boolean;
  error?: string | null;
  className?: string;
  connecting?: boolean;
}

export function CameraPreview({ stream, isActive, error, className = '', connecting = false }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

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
            <span className="text-sm">Camera access failed</span>
          </div>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`w-full h-full relative overflow-hidden rounded-lg ${(isActive || stream) ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
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
                  <p className="text-sm text-gray-400">Connecting camera...</p>
                </>
              ) : stream ? (
                <>
                  <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-400">Camera ready...</p>
                </>
              ) : (
                <>
                  <CameraOff className="h-12 w-12 text-gray-600 mx-auto" />
                  <p className="text-sm text-gray-400">Camera inactive</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Camera status indicator */}
        {(isActive || stream) && isVideoReady && (
          <div className="absolute top-4 right-4 flex items-center space-x-1 bg-red-600 text-white px-3 py-1 rounded-full">
            <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-medium">LIVE</span>
          </div>
        )}
      </div>
    </div>
  );
}