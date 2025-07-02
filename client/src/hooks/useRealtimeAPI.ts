import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';

interface RealtimeAPIOptions {
  onMessage?: (message: any) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useRealtimeAPI(options: RealtimeAPIOptions = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    
    try {
      // Get ephemeral token from server
      const tokenResponse = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get ephemeral token');
      }
      
      const data = await tokenResponse.json();
      const ephemeralKey = data.client_secret.value;
      
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      mediaStreamRef.current = mediaStream;
      
      // Add audio track to peer connection
      pc.addTrack(mediaStream.getTracks()[0]);
      setIsListening(true);
      
      // Set up data channel for events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;
      
      dc.addEventListener('message', (e) => {
        const serverEvent = JSON.parse(e.data);
        
        // Handle specific events
        if (serverEvent.type === 'response.audio.done') {
          setIsSpeaking(false);
          options.onAudioEnd?.();
        }
        
        options.onMessage?.(serverEvent);
      });
      
      dc.addEventListener('open', () => {
        setIsConnected(true);
        setIsConnecting(false);
        
        // Initialize session with interview-specific settings
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are an AI interviewer conducting a professional job interview. Your goal is to understand the candidate's skills, experience, and career goals through natural conversation. 

Key guidelines:
- Ask thoughtful, open-ended questions about their background
- Listen carefully and ask follow-up questions based on their responses  
- Be conversational and encouraging, not robotic
- Focus on understanding their skills, experience, work style, and career aspirations
- Keep questions relevant to professional development
- Speak clearly and at a natural pace
- Show genuine interest in their responses

Start by greeting them warmly and asking them to tell you about themselves and their professional background.`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            tools: [],
            tool_choice: 'none',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };
        
        dc.send(JSON.stringify(sessionUpdate));
        
        // Start the conversation
        const responseCreate = {
          type: 'response.create',
          response: {
            modalities: ['text', 'audio']
          }
        };
        
        dc.send(JSON.stringify(responseCreate));
      });
      
      // Create offer and set up connection
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-10-01';
      
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
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
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
    isListening
  };
}