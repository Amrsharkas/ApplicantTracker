import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';

interface RealtimeAPIOptions {
  onMessage?: (message: any) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onError?: (error: Error) => void;
  onLanguageWarning?: (language: string) => void;
  userProfile?: any;
  interviewType?: string;
  questions?: any[];
  interviewSet?: any;
  language?: string;
  onVideoStream?: (stream: MediaStream) => void;
  requireCamera?: boolean;
}

export function useRealtimeAPI(options: RealtimeAPIOptions = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  const connect = useCallback(async (interviewParams?: { interviewType?: string; questions?: any[]; interviewSet?: any; language?: string }) => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    
    try {
      const model = 'gpt-realtime';
      const voice = 'marin';

      // Get ephemeral token from server
      const tokenResponse = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ model, voice })
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get ephemeral token');
      }
      
      const data = await tokenResponse.json();
      console.log('Ephemeral token response:', data);
      const ephemeralKey = data.client_secret?.value || data.client_secret;
      
      if (!ephemeralKey) {
        console.error('No ephemeral key found in response:', data);
        throw new Error('Invalid ephemeral token response');
      }
      
      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;
      
      // Set up audio element for model output
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.controls = false;
      audioElementRef.current = audioEl;
      
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        setIsSpeaking(true);
        options.onAudioStart?.();
      };
      
      // Get user media for microphone input
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };

      // Add video constraint if camera is required
      if (options.requireCamera) {
        constraints.video = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        };
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = mediaStream;

        // Extract video stream if camera is enabled
        if (options.requireCamera && mediaStream.getVideoTracks().length > 0) {
          const videoStream = new MediaStream(mediaStream.getVideoTracks());
          videoStreamRef.current = videoStream;
          options.onVideoStream?.(videoStream);
        }
      } catch (error) {
        console.error('Media access error:', error);
        if (options.requireCamera) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
          setCameraError(errorMessage);

          // Try again with just audio if camera fails
          try {
            const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            });
            mediaStreamRef.current = audioOnlyStream;

            toast({
              title: 'Camera Access Failed',
              description: 'Could not access camera. Continuing with audio only.',
              variant: 'destructive'
            });
          } catch (audioError) {
            throw new Error('Failed to access both camera and microphone');
          }
        } else {
          throw error;
        }
      }
      
      // Add audio track to peer connection
      if (mediaStreamRef.current && mediaStreamRef.current.getAudioTracks().length > 0) {
        pc.addTrack(mediaStreamRef.current.getAudioTracks()[0]);
        setIsListening(true);
      }
      
      // Set up data channel for events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;
      
      dc.addEventListener('message', (e) => {
        const serverEvent = JSON.parse(e.data);
        console.log('📨 Voice interview event:', serverEvent.type, serverEvent);

        // Handle specific events
        if (serverEvent.type === 'response.audio.done') {
          setIsSpeaking(false);
          options.onAudioEnd?.();
        } else if (serverEvent.type === 'response.audio.delta') {
          setIsSpeaking(true);
          options.onAudioStart?.();
        } else if (serverEvent.type === 'input_audio_buffer.speech_started') {
          console.log('👂 User started speaking');
          setIsListening(true);
        } else if (serverEvent.type === 'input_audio_buffer.speech_stopped') {
          console.log('👂 User stopped speaking - triggering AI response');
          setIsListening(false);
          // Trigger AI response after user stops speaking
          setTimeout(() => {
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
              console.log('🤖 Sending response trigger to AI');
              const responseCreate = {
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio']
                }
              };
              dataChannelRef.current.send(JSON.stringify(responseCreate));
            }
          }, 800); // Optimized delay to ensure audio buffer is processed
        } else if (serverEvent.type === 'response.audio_transcript.done' || serverEvent.type === 'response.done') {
          console.log('🎯 AI response complete - ready for next interaction');
          // Ensure we're ready to listen again
          setIsSpeaking(false);
          setIsListening(true);
        } else if (serverEvent.type === 'output_audio_buffer.stopped') {
          console.log('🔊 Audio output stopped - conversation ready for user');
          setIsSpeaking(false);
          setIsListening(true);
        }

        options.onMessage?.(serverEvent);
      });
      
      dc.addEventListener('open', () => {
        console.log('🎤 Voice interview connection established - AI ready to talk');
        setIsConnected(true);
        setIsConnecting(false);
        
        // Generate dynamic instructions based on user profile
        const buildInstructions = (userProfile: any, interviewParams?: { interviewType?: string; questions?: any[]; interviewSet?: any; language?: string }) => {
          const isArabic = interviewParams?.language === 'arabic';

          // Get interview type and questions from parameters
          const questions = interviewParams?.questions || [];
          const questionList = questions.map((q, index) => `${index + 1}. "${q.question}"`).join('\n');

          let instructions = `You are an interviewer conducting a professional interview. Start with a natural greeting, then ask these questions one by one:

${questionList}

Have a natural conversation - listen to their answers, ask brief follow-ups if needed, then move to the next question. Keep it conversational and professional. End by thanking them for their time.

IMPORTANT LANGUAGE REQUIREMENT: This interview must be conducted${isArabic ? ' ONLY in Egyptian Arabic' : ' ONLY in English'}. If the candidate responds in a different language, gently remind them to respond${isArabic ? ' in Arabic' : ' in English'} before proceeding with the conversation.`;

          if (isArabic) {
            instructions = `Speak in Egyptian Arabic. ${instructions}`;
          }

          return instructions;
        };

        // Initialize session with interview-specific settings
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: buildInstructions(options.userProfile, interviewParams),
            voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
              language: interviewParams?.language === 'arabic' ? 'ar' : 'en'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,
              prefix_padding_ms: 500,
              silence_duration_ms: 1800
            },
            tools: [],
            tool_choice: 'none',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };
        
        dc.send(JSON.stringify(sessionUpdate));
        
        // Start the conversation
        console.log('🚀 Sending initial conversation start command to AI');
        const responseCreate = {
          type: 'response.create',
          response: {
            modalities: ['text', 'audio']
          }
        };
        
        dc.send(JSON.stringify(responseCreate));
        
        // Don't send automatic keepalive - let the conversation flow naturally
        // The AI should wait for user responses before continuing
      });
      
      // Create offer and set up connection
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const baseUrl = 'https://api.openai.com/v1/realtime';
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        }
      });
      
      if (!sdpResponse.ok) {
        throw new Error('Failed to establish WebRTC connection');
      }
      
      const answer = {
        type: 'answer' as const,
        sdp: await sdpResponse.text()
      };
      
      await pc.setRemoteDescription(answer);
      
    } catch (error) {
      console.error('Realtime API connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Connection Error',
        description: `Failed to connect to voice interview: ${errorMessage}`,
        variant: 'destructive'
      });
      
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [isConnecting, isConnected, options, toast]);
  
  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
    setCameraError(null);
  }, []);
  
  const sendMessage = useCallback((message: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsListening(audioTrack.enabled);
      }
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  return {
    connect,
    disconnect,
    sendMessage,
    toggleMute,
    isConnecting,
    isConnected,
    isSpeaking,
    isListening,
    cameraError
  };
}