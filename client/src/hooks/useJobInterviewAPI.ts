import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';

interface JobInterviewAPIOptions {
  onMessage?: (message: any) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onError?: (error: Error) => void;
  jobTitle?: string;
  jobDescription?: string;
  jobRequirements?: string;
}

export function useJobInterviewAPI(options: JobInterviewAPIOptions = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  const connect = useCallback(async (interviewParams?: { 
    mode: 'voice' | 'text'; 
    language: 'english' | 'arabic'; 
    jobTitle: string;
    jobDescription: string;
    jobRequirements: string;
  }) => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    
    try {
      // Get ephemeral token from server for job interview
      const tokenResponse = await fetch('/api/job-interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(interviewParams)
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get ephemeral token for job interview');
      }
      
      const data = await tokenResponse.json();
      console.log('Job interview ephemeral token response:', data);
      const ephemeralKey = data.client_secret?.value || data.client_secret;
      
      if (!ephemeralKey) {
        console.error('No ephemeral key found in response:', data);
        throw new Error('Invalid ephemeral token response');
      }

      if (interviewParams?.mode === 'voice') {
        // Create peer connection for voice interview
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
          console.log('📨 Job interview event:', serverEvent.type, serverEvent);
          
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
            }, 800);
          } else if (serverEvent.type === 'response.audio_transcript.done' || serverEvent.type === 'response.done') {
            console.log('🎯 AI response complete - ready for next interaction');
            setIsSpeaking(false);
            setIsListening(true);
          }
          
          options.onMessage?.(serverEvent);
        });
        
        // Create offer and get answer from server
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        const sdpResponse = await fetch(`/api/realtime/session/${ephemeralKey}`, {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp'
          },
        });
        
        if (!sdpResponse.ok) {
          throw new Error('Failed to get SDP answer');
        }
        
        const answerSdp = await sdpResponse.text();
        await pc.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp,
        });
        
        setIsConnected(true);
        console.log('✅ Job interview voice connection established');
      } else {
        // For text interviews, just mark as connected
        setIsConnected(true);
        console.log('✅ Job interview text mode ready');
      }
      
    } catch (error) {
      console.error('❌ Job interview connection error:', error);
      options.onError?.(error as Error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to job interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected, options, toast]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting job interview...');
    
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
      audioElementRef.current.srcObject = null;
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
    isConnecting,
    isConnected,
    isSpeaking,
    isListening,
  };
}