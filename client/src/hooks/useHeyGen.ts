import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';

interface HeyGenSession {
  session_id: string;
  sdp: any;
  access_token: string;
  livekit_agent_token: string;
  url: string;
  ice_servers: any;
  ice_servers2: any;
  is_paid: boolean;
  session_duration_limit: number;
  realtime_endpoint: string;
  // Include additional fields that are mapped
  sessionId: string;
  accessToken: string;
  durationLimit: number;
  realtimeEndpoint: string;
}

interface UseHeyGenOptions {
  onMessage?: (message: any) => void;
  onAvatarSpeaking?: (isSpeaking: boolean) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onError?: (error: Error) => void;
  userProfile?: any;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useHeyGen(options: UseHeyGenOptions = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<HeyGenSession | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const { toast } = useToast();

  // Check HeyGen availability
  const checkHeyGenAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/heygen/status', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to check HeyGen status');
      }

      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Error checking HeyGen availability:', error);
      return false;
    }
  }, []);

  // Create HeyGen session
  const createSession = useCallback(async () => {
    if (!checkHeyGenAvailability()) {
      throw new Error('HeyGen service is not available');
    }

    setIsConnecting(true);

    try {
      const response = await fetch('/api/heygen/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          quality: 'medium',
          videoEncoding: 'VP8'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create session: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.session) {
        throw new Error('Invalid session response');
      }

      const session: HeyGenSession = data.session;
      setCurrentSession(session);

      console.log('HeyGen session created:', {
        sessionId: session.sessionId,
        url: session.url,
        realtimeEndpoint: session.realtimeEndpoint,
        hasLiveKitToken: !!session.livekit_agent_token,
        durationLimit: session.durationLimit,
        isPaid: session.is_paid,
        allFields: Object.keys(session)
      });

      return session;
    } catch (error) {
      console.error('Error creating HeyGen session:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [checkHeyGenAvailability]);

  // Start HeyGen session
  const startSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch('/api/heygen/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to start session: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to start HeyGen session');
      }

      console.log('HeyGen session started:', data.status);
    } catch (error) {
      console.error('Error starting HeyGen session:', error);
      throw error;
    }
  }, []);

  // Connect to LiveKit room
  const connectToRoom = useCallback(async (session: HeyGenSession): Promise<void> => {
    if (!session.access_token || !session.url) {
      throw new Error('Missing LiveKit access token or URL');
    }

    return new Promise(async (resolve, reject) => {
      try {
        console.log('Setting up LiveKit connection:', {
          url: session.url,
          sessionId: session.sessionId,
          hasToken: !!session.access_token
        });

        // Create LiveKit room
        const room = new Room();
        roomRef.current = room;

        // Set up event listeners
        room.on(RoomEvent.Connected, () => {
          console.log('Connected to HeyGen LiveKit room');
          setIsConnected(true);
          options.onConnectionChange?.(true);
        });

        room.on(RoomEvent.Disconnected, () => {
          console.log('Disconnected from HeyGen LiveKit room');
          setIsConnected(false);
          setIsSessionActive(false);
          options.onConnectionChange?.(false);

          // Clean up video element
          if (videoElementRef.current) {
            videoElementRef.current.srcObject = null;
          }
          if (audioElementRef.current) {
            audioElementRef.current.srcObject = null;
          }
        });

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication) => {
          console.log('Track subscribed:', track.kind, track.sid);

          if (track.kind === 'video') {
            const stream = new MediaStream();
            stream.addTrack(track.mediaStreamTrack);

            // Store video element reference for the video component
            const videoElement = document.createElement('video');
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.muted = true;
            videoElementRef.current = videoElement;

            videoElement.srcObject = stream;
            console.log('Video stream connected');
          }

          if (track.kind === 'audio') {
            const stream = new MediaStream();
            stream.addTrack(track.mediaStreamTrack);

            const audioElement = document.createElement('audio');
            audioElement.autoplay = true;
            audioElement.controls = false;
            audioElement.volume = volume;
            audioElementRef.current = audioElement;

            audioElement.srcObject = stream;
            console.log('Audio stream connected');

            // Track avatar speaking state
            setIsAvatarSpeaking(true);
            options.onAvatarSpeaking?.(true);

            // Reset speaking state when audio ends
            setTimeout(() => {
              setIsAvatarSpeaking(false);
              options.onAvatarSpeaking?.(false);
            }, 2000);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          console.log('Track unsubscribed:', track.kind);
          if (track.kind === 'audio') {
            setIsAvatarSpeaking(false);
            options.onAvatarSpeaking?.(false);
          }
        });

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log('Participant connected:', participant.identity);
        });

        // Connect to LiveKit using the provided URL and token
        await room.connect(session.url, session.access_token);

        // Start the HeyGen session
        await startSession(session.sessionId || '');

        // Set session active and resolve promise
        setIsSessionActive(true);

        // Use a small timeout to ensure React state is updated
        setTimeout(() => {
          resolve();
        }, 100);

      } catch (error) {
        console.error('Error connecting to LiveKit room:', error);
        setIsConnected(false);
        setIsSessionActive(false);
        options.onConnectionChange?.(false);
        reject(error);
      }
    });
  }, [volume, options, startSession]);

  // Send text to HeyGen session
  const sendMessage = useCallback(async (text: string, session?: HeyGenSession, forceActive?: boolean) => {
    const sessionToUse = session || currentSession;
    const shouldCheckActive = forceActive !== undefined ? forceActive : isSessionActive;

    console.log({
      sessionToUse,
      currentSession,
      shouldCheckActive,
      isSessionActive
    });

    if (!sessionToUse || !shouldCheckActive) {
      throw new Error('No active HeyGen session');
    }

    try {
      // Add user message to conversation history
      const userMessage: ConversationMessage = {
        role: 'user',
        content: text,
        timestamp: new Date()
      };
      setConversationHistory(prev => [...prev, userMessage]);

      const response = await fetch('/api/heygen/send-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: sessionToUse.sessionId,
          text
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send message: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to send message to HeyGen');
      }

      console.log('Message sent to HeyGen:', {
        taskId: data.taskId,
        durationMs: data.durationMs
      });

    } catch (error) {
      console.error('Error sending message to HeyGen:', error);
      throw error;
    }
  }, [currentSession, isSessionActive]);

  // Disconnect from session
  const disconnect = useCallback(async () => {
    try {
      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
      }

      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
        audioElementRef.current = null;
      }

      if (videoElementRef.current) {
        videoElementRef.current.pause();
        videoElementRef.current.srcObject = null;
        videoElementRef.current = null;
      }

      if (currentSession) {
        
        try {
          const response = await fetch('/api/heygen/stop-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ sessionId: currentSession.sessionId })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('HeyGen session stopped:', data.status);
          }
        } catch (error) {
          console.warn('Error stopping HeyGen session:', error);
        }
      }

      setIsConnected(false);
      setIsSessionActive(false);
      setIsAvatarSpeaking(false);
      setCurrentSession(null);
      reconnectAttemptsRef.current = 0;

      options.onConnectionChange?.(false);
    } catch (error) {
      console.error('Error disconnecting from HeyGen:', error);
      throw error;
    }
  }, [currentSession, options]);

  // Volume control
  const setAudioVolume = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
    if (audioElementRef.current) {
      audioElementRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  }, []);

  // Mute/unmute
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioElementRef.current) {
      audioElementRef.current.muted = newMutedState;
    }
  }, [isMuted]);

  // Start interview with HeyGen
  const startInterview = useCallback(async (interviewType: string, questions: any[] = []) => {
    try {
      console.log('Starting HeyGen interview:', { interviewType, questionCount: questions.length });

      // Create session
      const session = await createSession();

      // Connect to LiveKit and wait for session to be fully active
      await connectToRoom(session);

      // Send initial greeting based on interview type
      const greetingText = buildGreetingMessage(interviewType, questions, options.userProfile);
      await sendMessage(greetingText, session, true);

      toast({
        title: "HeyGen Avatar Connected",
        description: "Your AI interviewer is ready. The interview will begin shortly.",
      });

    } catch (error) {
      console.error('Error starting HeyGen interview:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to start interview';
      toast({
        title: "Connection Failed",
        description: `Could not connect to HeyGen avatar: ${errorMessage}`,
        variant: "destructive"
      });

      options.onError?.(error instanceof Error ? error : new Error(errorMessage));

      // Cleanup on failure
      await disconnect();
      throw error;
    }
  }, [createSession, connectToRoom, sendMessage, disconnect, toast, options]);

  // Build greeting message
  const buildGreetingMessage = (interviewType: string, questions: any[], userProfile?: any): string => {
    const questionCount = questions.length;
    const userName = userProfile?.firstName || 'candidate';

    return `Hello ${userName}, and welcome to your ${interviewType} interview. I'll be your AI interviewer today.

I'll be asking you ${questionCount} structured questions to help us understand you better. The interview should take about 15-20 minutes.

Please speak naturally and take your time with your responses. I'm ready to begin whenever you are.

Let's start with our first question.`;
  };

  return {
    // State
    isConnecting,
    isConnected,
    isAvatarSpeaking,
    isSessionActive,
    currentSession,
    conversationHistory,
    volume,
    isMuted,

    // Actions
    createSession,
    connectToRoom,
    disconnect,
    sendMessage,
    startInterview,
    setAudioVolume,
    toggleMute,

    // Utility
    checkHeyGenAvailability,

    // Media elements for video component
    videoElement: videoElementRef.current,
    audioElement: audioElementRef.current,

    // Room reference for video component
    room: roomRef.current
  };
}