import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  User,
  Loader2,
  Signal,
  SignalHigh
} from 'lucide-react';

interface HeyGenVideoProps {
  videoElement: HTMLVideoElement | null;
  audioElement: HTMLAudioElement | null;
  isConnected: boolean;
  isAvatarSpeaking: boolean;
  isSessionActive: boolean;
  volume: number;
  isMuted: boolean;
  isConnecting: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onDisconnect?: () => void;
  className?: string;
}

export function HeyGenVideo({
  videoElement,
  audioElement,
  isConnected,
  isAvatarSpeaking,
  isSessionActive,
  volume,
  isMuted,
  isConnecting,
  onVolumeChange,
  onToggleMute,
  onDisconnect,
  className = ''
}: HeyGenVideoProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef<number[]>([]);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Append video element to container when it changes
  useEffect(() => {
    if (videoElement && videoContainerRef.current) {
      videoContainerRef.current.appendChild(videoElement);
      videoElement.className = 'w-full h-full object-cover';
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = isMuted;
    }
  }, [videoElement, isMuted]);

  // Update video element muted state
  useEffect(() => {
    if (videoElement) {
      videoElement.muted = isMuted;
    }
  }, [videoElement, isMuted]);

  // Update audio element volume
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = volume;
      audioElement.muted = isMuted;
    }
  }, [audioElement, volume, isMuted]);

  // Monitor audio levels based on avatar speaking state
  useEffect(() => {
    const interval = setInterval(() => {
      // Simple audio level calculation based on avatar speaking state
      const level = isAvatarSpeaking ? 0.7 : 0.1;

      // Smooth audio level changes
      audioLevelRef.current.push(level);
      if (audioLevelRef.current.length > 10) {
        audioLevelRef.current.shift();
      }

      const smoothedLevel = audioLevelRef.current.reduce((a, b) => a + b, 0) / audioLevelRef.current.length;
      setAudioLevel(smoothedLevel);
    }, 100);

    return () => clearInterval(interval);
  }, [isAvatarSpeaking]);

  // Get status badge props
  const getStatusBadge = () => {
    if (isConnecting) {
      return {
        variant: 'secondary' as const,
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        text: 'Connecting...'
      };
    }

    if (!isConnected) {
      return {
        variant: 'destructive' as const,
        icon: <VideoOff className="h-3 w-3" />,
        text: 'Disconnected'
      };
    }

    if (isSessionActive) {
      return {
        variant: 'default' as const,
        icon: <SignalHigh className="h-3 w-3" />,
        text: isAvatarSpeaking ? 'Speaking' : 'Listening'
      };
    }

    return {
      variant: 'outline' as const,
      icon: <Signal className="h-3 w-3" />,
      text: 'Ready'
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Status Badge */}
      <div className="absolute top-4 left-4 z-10">
        <Badge
          variant={statusBadge.variant}
          className="flex items-center gap-2 bg-background/90 backdrop-blur-sm"
        >
          {statusBadge.icon}
          {statusBadge.text}
        </Badge>
      </div>

      {/* Video Container */}
      <div className="relative aspect-video bg-gray-900">
        <div
          ref={videoContainerRef}
          className="w-full h-full"
          style={{
            filter: isMuted ? 'grayscale(50%)' : 'none',
            opacity: isAvatarSpeaking ? 1 : 0.9
          }}
        />

        {!videoElement && (
          <div className="absolute inset-0 flex items-center justify-center w-full h-full">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-4 text-gray-400">
                <Loader2 className="h-12 w-12 animate-spin" />
                <span className="text-sm">Connecting to avatar...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-gray-400">
                <User className="h-12 w-12" />
                <span className="text-sm">Avatar not available</span>
              </div>
            )}
          </div>
        )}

        {/* Audio Level Indicator */}
        {isSessionActive && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
              <div className="flex items-center gap-1">
                {isAvatarSpeaking ? (
                  <Mic className="h-3 w-3 text-green-400" />
                ) : (
                  <MicOff className="h-3 w-3 text-gray-400" />
                )}
                <div className="w-16 h-1 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 transition-all duration-100 rounded-full"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center justify-between">
          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMute}
              className="h-8 w-8 p-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>

            <div className="w-24">
              <Slider
                value={[volume * 100]}
                onValueChange={([value]) => onVolumeChange(value / 100)}
                max={100}
                step={1}
                disabled={isMuted}
                className="w-full"
              />
            </div>
          </div>

          {/* Disconnect Button */}
          {onDisconnect && isConnected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDisconnect}
              className="flex items-center gap-2"
            >
              <VideoOff className="h-4 w-4" />
              End Interview
            </Button>
          )}
        </div>

        {/* Session Info */}
        {isConnected && (
          <div className="mt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Status: Connected</span>
              <span>Session: {isSessionActive ? 'Active' : 'Ready'}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}