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

  // Play audio from base64 data (PCM16 format) with TTS logging
  const playAudio = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) {
      console.warn('⚠️ AudioContext not available for TTS playback');
      return;
    }
    
    try {
      console.log('🗣️ Playing TTS audio, data length:', base64Audio.length);
      
      // Handle browser autoplay policy
      if (audioContextRef.current.state === 'suspended') {
        console.log('🔊 Resuming AudioContext for TTS playback');
        await audioContextRef.current.resume();
      }
      
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
        console.log('✅ TTS audio playback completed');
        setIsSpeaking(false);
        options.onAudioEnd?.();
      };
      
      console.log('▶️ Starting TTS audio playback');
      setIsSpeaking(true);
      options.onAudioStart?.();
      source.start();
      
    } catch (error) {
      console.error('❌ Error playing TTS audio:', error);
      setIsSpeaking(false);
    }
  }, [options]);

  // Start recording audio in PCM16 format with proper microphone access
  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      
      // Request microphone access with proper constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      console.log('✅ Microphone access granted, stream active:', stream.active);
      console.log('📊 Audio tracks:', stream.getAudioTracks().map(track => ({
        enabled: track.enabled,
        kind: track.kind,
        label: track.label,
        readyState: track.readyState
      })));
      
      mediaStreamRef.current = stream;
      setIsListening(true);
      
      if (!audioContextRef.current) {
        await initializeAudio();
      }
      
      // Use modern AudioWorklet or fallback to ScriptProcessor
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      
      // Try AudioWorklet first (preferred), fallback to ScriptProcessor
      let processor: AudioNode;
      
      try {
        // Modern approach with AudioWorklet (if supported)
        processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
        
        (processor as ScriptProcessorNode).onaudioprocess = (event) => {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0);
            
            // Log audio level for debugging
            const audioLevel = Math.max(...inputData.map(Math.abs));
            if (audioLevel > 0.01) { // Only log when there's actual audio
              console.log('🔊 Audio input detected, level:', audioLevel.toFixed(4));
            }
            
            // Convert float32 to int16 PCM
            const pcm16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcm16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }
            
            // Convert to base64
            const uint8Array = new Uint8Array(pcm16Data.buffer);
            const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
            
            // Send to OpenAI Realtime API
            websocketRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64
            }));
          }
        };
        
      } catch (workletError) {
        console.warn('AudioWorklet not supported, using ScriptProcessor fallback');
        processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
      }
      
      source.connect(processor);
      processor.connect(audioContextRef.current!.destination);
      
      // Store the processor for cleanup
      (mediaStreamRef.current as any).audioProcessor = processor;
      
      console.log('🎙️ Audio recording pipeline established');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        console.error('🚫 Microphone access denied by user');
        options.onError?.(new Error('Microphone access denied. Please allow microphone access and try again.'));
      } else if (error.name === 'NotFoundError') {
        console.error('🚫 No microphone found');
        options.onError?.(new Error('No microphone found. Please connect a microphone and try again.'));
      } else {
        options.onError?.(error as Error);
      }
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
      console.log('🔗 Connecting to OpenAI Realtime API with key length:', ephemeralKey.length);
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        ['realtime', `openai-insecure-api-key.${ephemeralKey}`]
      );
      
      websocketRef.current = ws;
      
      // Add timeout to catch connection issues
      const connectionTimeout = setTimeout(() => {
        if (isConnecting) {
          console.error('⏰ WebSocket connection timeout');
          setIsConnecting(false);
          options.onError?.(new Error('Connection timeout - please try again'));
        }
      }, 15000); // 15 second timeout
      
      ws.onopen = () => {
        console.log('🎉 WebSocket connection opened successfully!');
        console.log('🔄 Setting connected state...');
        
        clearTimeout(connectionTimeout);
        setIsConnecting(false);
        setIsConnected(true);
        
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
        
        // Send initial message to trigger interview start
        setTimeout(() => {
          const initialMessage = {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [{
                type: 'input_text',
                text: 'Hello, I\'m ready to start my interview. Please introduce yourself and begin with the first question.'
              }]
            }
          };
          
          console.log('💬 Sending initial interview trigger...');
          ws.send(JSON.stringify(initialMessage));
          
          // Request AI response
          const responseConfig = {
            type: 'response.create'
          };
          
          console.log('🤖 Requesting AI to start interview...');
          ws.send(JSON.stringify(responseConfig));
        }, 1000);
        
        console.log('🔄 Session configured, starting recording...');
        // Start recording after session is configured
        startRecording();
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 OpenAI Realtime message:', message.type, message);
          
          if (message.type === 'response.audio.delta') {
            // Play TTS audio chunk
            console.log('🎵 Received TTS audio delta, size:', message.delta?.length || 0);
            if (message.delta) {
              playAudio(message.delta);
            }
          } else if (message.type === 'response.audio.done') {
            console.log('✅ TTS audio response completed');
            setIsSpeaking(false);
            options.onAudioEnd?.();
          } else if (message.type === 'response.audio_transcript.delta') {
            // Handle live transcript
            console.log('📝 TTS transcript delta:', message.delta);
            options.onMessage?.(message);
          } else if (message.type === 'response.audio_transcript.done') {
            // Full AI response transcript available
            console.log('📝 Complete TTS transcript:', message.transcript);
            options.onMessage?.(message);
          } else if (message.type === 'input_audio_buffer.speech_started') {
            console.log('🎙️ User speech detected - started');
            setIsListening(true);
          } else if (message.type === 'input_audio_buffer.speech_stopped') {
            console.log('🎙️ User speech detected - stopped');
            setIsListening(false);
          } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
            // User's speech transcription (STT result)
            console.log('📝 User STT transcript:', message.transcript);
            options.onMessage?.(message);
          } else if (message.type === 'session.created') {
            console.log('🎉 OpenAI Realtime session created successfully');
          } else if (message.type === 'response.created') {
            console.log('🧠 AI response generation started');
          } else if (message.type === 'response.done') {
            console.log('✅ AI response generation completed');
          }
          
          // Pass all messages to the callback for further processing
          options.onMessage?.(message);
          
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        clearTimeout(connectionTimeout);
        options.onError?.(new Error('Voice connection failed - please try text interview'));
        setIsConnecting(false);
        setIsConnected(false);
      };
      
      ws.onclose = (event) => {
        console.log('🔒 WebSocket connection closed', { code: event.code, reason: event.reason });
        clearTimeout(connectionTimeout);
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