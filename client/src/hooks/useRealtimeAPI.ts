import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';

interface RealtimeAPIOptions {
  onMessage?: (message: any) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onError?: (error: Error) => void;
  userProfile?: any;
  interviewType?: string;
  questions?: any[];
  interviewSet?: any;
}

export function useRealtimeAPI(options: RealtimeAPIOptions = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  
  const { toast } = useToast();

  // Initialize audio context
  const initializeAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  // Play audio from base64 data (PCM16 format)
  const playAudio = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) return;
    
    try {
      // Decode base64 to raw PCM16 data
      const binaryString = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      // Convert PCM16 to AudioBuffer
      const int16Array = new Int16Array(arrayBuffer);
      const audioBuffer = audioContextRef.current.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      
      // Convert int16 to float32 and normalize
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        options.onAudioEnd?.();
      };
      
      setIsSpeaking(true);
      options.onAudioStart?.();
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
    }
  }, [options]);

  // Start recording audio in PCM16 format
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      mediaStreamRef.current = stream;
      setIsListening(true);
      
      if (!audioContextRef.current) {
        await initializeAudio();
      }
      
      // Use AudioContext for real-time PCM16 processing
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert float32 to int16 PCM
          const pcm16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          // Convert to base64
          const uint8Array = new Uint8Array(pcm16Data.buffer);
          const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
          
          // Send to OpenAI
          websocketRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64
          }));
        }
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current!.destination);
      
      // Store the processor for cleanup
      (mediaStreamRef.current as any).audioProcessor = processor;
      
    } catch (error) {
      console.error('Error starting recording:', error);
      options.onError?.(error as Error);
    }
  }, [options, initializeAudio]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaStreamRef.current) {
      // Clean up audio processor if it exists
      const processor = (mediaStreamRef.current as any).audioProcessor;
      if (processor) {
        processor.disconnect();
      }
      
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    setIsListening(false);
  }, []);

  const connect = useCallback(async (interviewParams?: { interviewType?: string; questions?: any[]; interviewSet?: any }) => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    console.log('🎤 Starting voice interview connection...');
    
    try {
      await initializeAudio();
      
      // Get ephemeral token from server
      console.log('📡 Requesting OpenAI ephemeral token...');
      const tokenResponse = await fetch('/api/openai/ephemeral-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewType: interviewParams?.interviewType,
          userProfile: options.userProfile
        }),
        credentials: 'include'
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('❌ Token request failed:', tokenResponse.status, errorText);
        throw new Error(`Authentication failed: ${tokenResponse.status}`);
      }
      
      const data = await tokenResponse.json();
      console.log('✅ Token received successfully');
      
      if (!data.client_secret?.value) {
        throw new Error('No ephemeral token in response');
      }
      
      const ephemeralKey = data.client_secret.value;
      
      // Connect to OpenAI Realtime API
      console.log('🔗 Connecting to OpenAI Realtime API...');
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        ['realtime', `openai-insecure-api-key.${ephemeralKey}`]
      );
      
      websocketRef.current = ws;
      
      ws.onopen = () => {
        console.log('🎉 WebSocket connection opened successfully!');
        console.log('🔄 Setting connected state and starting recording...');
        
        setIsConnecting(false);
        setIsConnected(true);
        
        // Start recording immediately when connected
        startRecording();
        
        // Build enhanced instructions with user profile
        const profileContext = options.userProfile ? `
CANDIDATE PROFILE:
${options.userProfile.firstName ? `Name: ${options.userProfile.firstName} ${options.userProfile.lastName || ''}` : ''}
${options.userProfile.currentRole ? `Current Role: ${options.userProfile.currentRole}${options.userProfile.company ? ` at ${options.userProfile.company}` : ''}` : ''}
${options.userProfile.yearsOfExperience ? `Experience: ${options.userProfile.yearsOfExperience} years` : ''}
${options.userProfile.education ? `Education: ${options.userProfile.education}` : ''}
${options.userProfile.skills ? `Skills: ${options.userProfile.skills.join(', ')}` : ''}
${options.userProfile.careerGoals ? `Career Goals: ${options.userProfile.careerGoals}` : ''}
${options.userProfile.targetRole ? `Target Role: ${options.userProfile.targetRole}` : ''}
` : '';

        const interviewTypeDesc: { [key: string]: string } = {
          personal: 'background and personal journey',
          professional: 'career experience and achievements', 
          technical: 'technical abilities and problem-solving skills'
        };

        const instructions = `You are conducting a ${interviewParams?.interviewType || 'personal'} interview focusing on ${interviewTypeDesc[interviewParams?.interviewType || 'personal'] || 'general background'}.

${profileContext}

INTERVIEW GUIDELINES:
- Use the candidate's profile information to ask personalized, contextual questions
- Reference their background naturally in your questions
- Ask follow-up questions based on their responses
- Keep questions conversational and engaging
- When you're ready to conclude the interview, include the word "conclude" in your response
- Speak naturally and professionally

Begin by greeting the candidate warmly and asking your first question based on their profile.`;

        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: instructions,
            voice: 'shimmer',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            },
            tools: [],
            tool_choice: 'none',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        }));
        
        setIsConnected(true);
        setIsConnecting(false);
        
        // Start recording immediately
        startRecording();
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'response.audio.delta') {
            // Play audio chunk
            if (message.delta) {
              playAudio(message.delta);
            }
          } else if (message.type === 'response.audio.done') {
            setIsSpeaking(false);
            options.onAudioEnd?.();
          } else if (message.type === 'response.audio_transcript.delta') {
            // Handle transcript if needed
            options.onMessage?.(message);
          } else if (message.type === 'response.audio_transcript.done') {
            // Full transcript available
            options.onMessage?.(message);
          } else if (message.type === 'input_audio_buffer.speech_started') {
            setIsListening(true);
          } else if (message.type === 'input_audio_buffer.speech_stopped') {
            setIsListening(false);
          } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
            // User's speech transcription
            options.onMessage?.(message);
          }
          
          // Pass all messages to the callback for further processing
          options.onMessage?.(message);
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        options.onError?.(new Error('Voice connection failed - please try text interview'));
        setIsConnecting(false);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('🔒 WebSocket connection closed');
        setIsConnected(false);
        setIsConnecting(false);
        stopRecording();
      };
      
    } catch (error) {
      console.error('❌ Connection error:', error);
      setIsConnecting(false);
      options.onError?.(error as Error);
    }
  }, [isConnecting, isConnected, initializeAudio, startRecording, stopRecording, playAudio, options]);

  const disconnect = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    stopRecording();
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnecting,
    isConnected,
    isSpeaking,
    isListening
  };
}