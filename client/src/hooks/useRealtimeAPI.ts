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
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  const connect = useCallback(async (interviewParams?: { interviewType?: string; questions?: any[]; interviewSet?: any }) => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    
    try {
      // Get ephemeral token from server
      const tokenResponse = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
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
        const buildInstructions = (userProfile: any, interviewParams?: { interviewType?: string; questions?: any[]; interviewSet?: any }) => {
          const profileContext = userProfile ? `

CANDIDATE BACKGROUND:
${userProfile.firstName ? `Name: ${userProfile.firstName} ${userProfile.lastName || ''}` : ''}
${userProfile.currentRole ? `Current Role: ${userProfile.currentRole}${userProfile.company ? ` at ${userProfile.company}` : ''}` : ''}
${userProfile.yearsOfExperience ? `Experience: ${userProfile.yearsOfExperience} years` : ''}
${userProfile.education ? `Education: ${userProfile.education}${userProfile.university ? ` from ${userProfile.university}` : ''}` : ''}
${userProfile.location ? `Location: ${userProfile.location}` : ''}
${userProfile.summary ? `Profile Summary: ${userProfile.summary}` : ''}
${userProfile.resumeUrl ? `NOTE: The candidate has uploaded a resume. Use this background information to ask more personalized and relevant follow-up questions.` : ''}

WORK EXPERIENCE CONTEXT:
${userProfile.workExperiences && Array.isArray(userProfile.workExperiences) ? 
  userProfile.workExperiences.map((exp: any) => {
    const isCurrent = exp.current || exp.endDate === '' || !exp.endDate;
    return `- ${isCurrent ? 'CURRENT POSITION' : 'PAST POSITION'}: ${exp.position || exp.jobTitle || 'Position'} at ${exp.company || 'Company'} (${exp.startDate || 'Start date'} - ${isCurrent ? 'Present' : (exp.endDate || 'End date')})`;
  }).join('\n') : 
  userProfile.company ? `- CURRENT POSITION: ${userProfile.currentRole || 'Current role'} at ${userProfile.company}` : ''
}

IMPORTANT EMPLOYMENT GUIDELINES:
- When discussing work experiences, clearly distinguish between CURRENT and PAST positions
- For current positions, use present tense: "What are your main responsibilities in your current role at [company]?"
- For past positions, use past tense: "What were your key achievements during your time at [previous company]?"
- Reference specific companies and roles from their background when asking questions

Use this information to tailor your questions and make them more specific to their background. Reference their experience and current situation when appropriate.` : '';

          // Get interview type and questions from parameters
          const interviewType = interviewParams?.interviewType || 'personal';
          const questions = interviewParams?.questions || [];
          const interviewSet = interviewParams?.interviewSet;
          
          const questionCount = questions.length;
          const questionList = questions.map((q, index) => `${index + 1}. "${q.question}"`).join('\n');

          return `You are an AI interviewer conducting a focused ${interviewType} interview. Your goal is to understand the candidate through exactly ${questionCount} structured questions.${profileContext}

${interviewSet ? `
INTERVIEW TYPE: ${interviewSet.title}
INTERVIEW DESCRIPTION: ${interviewSet.description}
` : ''}

The ${questionCount} questions to ask in order:
${questionList}

Key guidelines:
- Start with a professional greeting, then proceed through each question in order
- Be professional and neutral - never overly positive, flattering, or emotional
- Use real interviewer language - neutral, grounded, professionally curious
- Never provide emotional reactions or value judgments about their answers
- Don't evaluate how "good" an answer was - ask the next smart question
- Maintain a calm, consistent tone - focused, observant, and neutral
- If you have background information about them, reference it naturally to make questions more relevant
- Keep the conversation moving toward the goal of understanding them deeply
- CRITICAL: Ask ONE question at a time and WAIT for the user's complete response before asking the next question
- Never send multiple questions in sequence without waiting for answers
- Always pause and listen after asking each question
- After each answer, acknowledge what they shared with neutral responses like "Understood" or "Got it" before moving to the next question
- Speak clearly and at a natural pace
- ALWAYS respond after the user speaks - never stay silent
- Examples of good responses: "Thank you. Could you clarify how you prioritized tasks in that situation?" or "What outcome did that lead to?" or "How did the team respond?"
- AVOID: "That's amazing!" "Fantastic answer!" "Wow, very impressive!" "You must be great at that!" "You handled that perfectly!"
- After the final question (question ${questionCount}), thank them professionally and use the word "conclude" ONLY in your final response to signal the interview is complete. For example: "Thank you for your responses. This concludes our ${interviewType} interview today."
- IMPORTANT: Only use the word "conclude" in your very last response when the interview is finished. Never use this word at any other time during the conversation.

This focused approach ensures we understand them comprehensively while respecting their time.`;
        };

        // Initialize session with interview-specific settings
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: buildInstructions(options.userProfile, interviewParams),
            voice: 'verse',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
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
  
  const disconnect = useCallback((conversationHistory: any[]) => {
    if (peerConnectionRef.current) {
      // Send completion event before closing
      fetch('/api/interview/complete-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interviewType: options.interviewType,
          conversationHistory,
        }),
      });

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
      disconnect([]);
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