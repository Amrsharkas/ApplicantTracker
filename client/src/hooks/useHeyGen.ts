import { useState, useRef, useCallback } from 'react';
import { useToast } from './use-toast';
import { Room, RoomEvent, RemoteTrack } from 'livekit-client';

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
  onWebSocketMessage?: (message: any) => void;
  onAudioSessionReady?: () => void;
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
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isAudioSessionReady, setIsAudioSessionReady] = useState(false);
  const [isAvatarListening, setIsAvatarListening] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const webSocketRef = useRef<WebSocket | null>(null);
  const eventIdRef = useRef(0);
  const audioQueueRef = useRef<Array<{data: ArrayBuffer, isFinal: boolean}>>([]);
  const isProcessingAudioRef = useRef(false);
  const isAudioSessionReadyRef = useRef(false);

  const { toast } = useToast();

  // Generate unique event IDs for HeyGen WebSocket messages
  const generateEventId = useCallback(() => {
    return `event_${++eventIdRef.current}_${Date.now()}`;
  }, []);

  // Convert PCM audio data to Base64 (HeyGen requires Base64 encoded PCM 16-bit 24kHz)
  const pcmToBase64 = useCallback((audioData: ArrayBuffer): string => {
    const bytes = new Uint8Array(audioData);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  // Process audio queue with proper sequencing
  const processAudioQueue = useCallback(async () => {
    if (isProcessingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('HeyGen WebSocket not ready, deferring audio processing');
      // Retry processing after a short delay
      setTimeout(() => processAudioQueue(), 1000);
      return;
    }

    if (!isAudioSessionReadyRef.current) {
      console.log('HeyGen audio session not ready, waiting to process queue');
      // Retry processing after a short delay
      setTimeout(() => processAudioQueue(), 500);
      return;
    }

    isProcessingAudioRef.current = true;

    try {
      while (audioQueueRef.current.length > 0) {
        const audioChunk = audioQueueRef.current.shift();
        if (!audioChunk) break;

        const { data, isFinal } = audioChunk;

        // Skip empty chunks that aren't final
        if (data.byteLength === 0 && !isFinal) {
          continue;
        }

        // Convert to base64
        const base64Audio = data.byteLength > 0 ? pcmToBase64(data) : '';
        const eventId = generateEventId();

        const message = {
          type: isFinal ? 'agent.speak_end' : 'agent.speak',
          event_id: eventId,
          audio: base64Audio
        };

        // Send to WebSocket with error handling
        try {
          webSocketRef.current.send(JSON.stringify(message));
          console.log(`📤 Sent ${isFinal ? 'final' : 'audio chunk'} to HeyGen:`, eventId,
            isFinal ? '(final)' : `(${data.byteLength} bytes)`);
        } catch (sendError) {
          console.error('Error sending audio chunk to WebSocket:', sendError);
          // Put the chunk back in the queue to retry later
          audioQueueRef.current.unshift(audioChunk);
          break;
        }

        // Small delay between chunks to prevent overwhelming
        if (!isFinal && data.byteLength > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      console.error('Error processing audio queue:', error);
    } finally {
      isProcessingAudioRef.current = false;
    }
  }, [pcmToBase64, generateEventId, isAudioSessionReady]);

  // Get current audio session ready status (using ref to avoid closure issues)
  const getAudioSessionReady = useCallback(() => {
    return isAudioSessionReadyRef.current;
  }, []);

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

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
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

  // Connect to HeyGen WebSocket for audio streaming
  const connectWebSocket = useCallback(async (session: HeyGenSession, retryCount: number = 0): Promise<void> => {
    if (!session.realtimeEndpoint) {
      throw new Error('Missing realtime endpoint for WebSocket connection');
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to HeyGen WebSocket (attempt ${retryCount + 1}):`, session.realtimeEndpoint);
        console.log('🔍 Session details:', {
          sessionId: session.sessionId,
          realtimeEndpoint: session.realtimeEndpoint,
          hasEndpoint: !!session.realtimeEndpoint
        });

        const ws = new WebSocket(session.realtimeEndpoint);
        webSocketRef.current = ws;

        ws.onopen = () => {
          console.log('✅ HeyGen WebSocket connected successfully');
          console.log('🔍 WebSocket state:', ws.readyState, 'OPEN?', ws.readyState === WebSocket.OPEN);
          setIsWebSocketConnected(true);

          // Initialize the session for audio streaming
          setTimeout(() => {
            console.log('🔍 WebSocket delayed check - state:', ws.readyState, 'OPEN?', ws.readyState === WebSocket.OPEN);
            if (ws.readyState === WebSocket.OPEN) {
              // Mark audio session as ready and notify parent
              console.log('🚀 Setting audio session ready to TRUE');
              setIsAudioSessionReady(true);
              isAudioSessionReadyRef.current = true;
              options.onAudioSessionReady?.();
              console.log('🎵 HeyGen audio session is now ready for streaming');
            } else {
              console.error('❌ WebSocket closed before audio session could be ready');
            }
          }, 1000);

          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Received HeyGen WebSocket message:', message.type, message);

            // Handle server events
            switch (message.type) {
              case 'session.started':
                console.log('🚀 HeyGen session started successfully');
                break;

              case 'session.state_updated':
                console.log('🔄 HeyGen session state:', message.state);
                break;

              case 'agent.audio_buffer_appended':
                console.log('📢 Audio buffer appended for task:', message.task?.id);
                break;

              case 'agent.audio_buffer_committed':
                console.log('✅ Audio buffer committed for task:', message.task?.id);
                break;

              case 'agent.speak_started':
                console.log('🗣️ Avatar started speaking for task:', message.task?.id);
                setIsAvatarSpeaking(true);
                options.onAvatarSpeaking?.(true);
                break;

              case 'agent.speak_ended':
                console.log('🤫 Avatar stopped speaking for task:', message.task?.id);
                setIsAvatarSpeaking(false);
                options.onAvatarSpeaking?.(false);
                break;

              case 'agent.speak_interrupted':
                console.log('⏹️ Avatar speech interrupted for task:', message.task?.id);
                setIsAvatarSpeaking(false);
                options.onAvatarSpeaking?.(false);
                break;

              case 'agent.idle_started':
                console.log('😴 Avatar entered idle state');
                break;

              case 'agent.idle_ended':
                console.log('👋 Avatar left idle state');
                break;

              case 'error':
                console.error('❌ HeyGen WebSocket error:', message.error);
                options.onError?.(new Error(message.error.message));
                break;

              default:
                console.log('❓ Unhandled HeyGen WebSocket event:', message.type, message);
            }

            options.onWebSocketMessage?.(message);
          } catch (error) {
            console.error('Error parsing HeyGen WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ HeyGen WebSocket error:', error);
          console.log('🔍 WebSocket error details:', {
            readyState: ws.readyState,
            url: ws.url,
            retryCount
          });
          setIsWebSocketConnected(false);
          setIsAudioSessionReady(false);
          isAudioSessionReadyRef.current = false;

          // Retry logic
          if (retryCount < 3) {
            console.log(`🔄 Retrying WebSocket connection (${retryCount + 1}/3)...`);
            setTimeout(() => {
              connectWebSocket(session, retryCount + 1).then(resolve).catch(reject);
            }, 2000 * (retryCount + 1)); // Exponential backoff
          } else {
            console.error('❌ Max retry attempts reached for WebSocket connection');
            reject(new Error('WebSocket connection failed after 3 attempts'));
          }
        };

        ws.onclose = () => {
          console.log('HeyGen WebSocket disconnected');
          setIsWebSocketConnected(false);
          setIsAudioSessionReady(false);
          isAudioSessionReadyRef.current = false;
          setIsAvatarListening(false);
          webSocketRef.current = null;
          // Clear audio queue on disconnect
          audioQueueRef.current = [];
          isProcessingAudioRef.current = false;
        };

      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }, [options]);

  // Stream audio to HeyGen avatar
  const streamAudioToAvatar = useCallback((audioData: ArrayBuffer, isFinal: boolean = false) => {
    // Add to queue for processing
    audioQueueRef.current.push({ data: audioData, isFinal });

    // Start processing if session is ready
    if (isAudioSessionReadyRef.current) {
      // Process asynchronously to avoid blocking
      setTimeout(() => processAudioQueue(), 0);
    } else {
      console.log('🎵 Audio queued - HeyGen session not ready yet');
    }
  }, [processAudioQueue]);

  // Start avatar listening animation
  const startAvatarListening = useCallback(() => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot start listening - WebSocket not ready');
      return;
    }

    const message = {
      type: 'agent.start_listening',
      event_id: generateEventId()
    };

    webSocketRef.current.send(JSON.stringify(message));
    setIsAvatarListening(true);
    console.log('Started avatar listening animation');
  }, [generateEventId]);

  // Stop avatar listening animation
  const stopAvatarListening = useCallback(() => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot stop listening - WebSocket not ready');
      return;
    }

    const message = {
      type: 'agent.stop_listening',
      event_id: generateEventId()
    };

    webSocketRef.current.send(JSON.stringify(message));
    setIsAvatarListening(false);
    console.log('Stopped avatar listening animation');
  }, [generateEventId]);

  // Interrupt avatar speech
  const interruptAvatar = useCallback(() => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'agent.interrupt',
      event_id: generateEventId()
    };

    webSocketRef.current.send(JSON.stringify(message));
    console.log('Interrupted avatar speech');
  }, [generateEventId]);

  // Test function - send a simple test audio chunk
  const testAvatarAudio = useCallback(() => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected for test');
      return;
    }

    console.log('🧪 Starting avatar audio test...');

    // First, start listening animation
    startAvatarListening();

    // Wait a moment, then send a test audio buffer
    setTimeout(() => {
      // Create a small test audio buffer (0.5 seconds of low-volume noise at 24kHz)
      const sampleRate = 24000;
      const duration = 0.5; // 0.5 second
      const samples = sampleRate * duration;
      const testBuffer = new ArrayBuffer(samples * 2); // 16-bit samples = 2 bytes each
      const testView = new Int16Array(testBuffer);

      // Fill with low-amplitude noise to simulate speech
      for (let i = 0; i < testView.length; i++) {
        testView[i] = Math.floor((Math.random() - 0.5) * 1000); // Small amplitude noise
      }

      console.log('🧪 Sending test audio chunk to HeyGen:', testBuffer.byteLength, 'bytes');
      streamAudioToAvatar(testBuffer, false);

      // Send final chunk after a short delay
      setTimeout(() => {
        streamAudioToAvatar(new ArrayBuffer(0), true);
        console.log('🧪 Sent final audio chunk');
      }, 100);

      // Stop listening after test
      setTimeout(() => {
        stopAvatarListening();
        console.log('🧪 Test completed');
      }, 2000);
    }, 500);
  }, [startAvatarListening, stopAvatarListening, streamAudioToAvatar]);

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
      // Close WebSocket connection
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      setIsWebSocketConnected(false);
      setIsAudioSessionReady(false);
      isAudioSessionReadyRef.current = false;

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

  // Start interview with HeyGen (text-based)
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

  // Start avatar interview with OpenAI realtime integration
  const startAvatarInterview = useCallback(async (interviewType: string, questions: any[] = [], language?: string) => {
    try {
      console.log('Starting HeyGen avatar interview with OpenAI realtime:', {
        interviewType,
        questionCount: questions.length,
        language
      });

      // Create session
      const session = await createSession();

      // Connect to LiveKit and wait for session to be fully active
      await connectToRoom(session);

      // Connect to HeyGen WebSocket for audio streaming
      console.log('🔌 Connecting to HeyGen WebSocket for audio control...');
      await connectWebSocket(session);

      // Wait for audio session to be ready with timeout
      const audioSessionReadyPromise = new Promise<void>((resolve) => {
        const checkReady = () => {
          if (isAudioSessionReady) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });

      await Promise.race([
        audioSessionReadyPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('HeyGen audio session ready timeout')), 15000)
        )
      ]);

      console.log('✅ HeyGen audio session ready - avatar can now speak');

      toast({
        title: "HeyGen Avatar Connected",
        description: "Your AI interviewer is ready. The interview will begin shortly.",
      });

      return session;

    } catch (error) {
      console.error('Error starting HeyGen avatar interview:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to start avatar interview';
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
  }, [createSession, connectToRoom, connectWebSocket, isAudioSessionReady, disconnect, toast, options]);

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
    isWebSocketConnected,
    isAudioSessionReady,
    isAvatarListening,

    // Actions
    createSession,
    connectToRoom,
    connectWebSocket,
    disconnect,
    sendMessage,
    startInterview,
    startAvatarInterview,
    setAudioVolume,
    toggleMute,
    streamAudioToAvatar,
    startAvatarListening,
    stopAvatarListening,
    interruptAvatar,
    testAvatarAudio,

    // Utility
    checkHeyGenAvailability,
    getAudioSessionReady,

    // Media elements for video component
    videoElement: videoElementRef.current,
    audioElement: audioElementRef.current,

    // Room reference for video component
    room: roomRef.current
  };
}