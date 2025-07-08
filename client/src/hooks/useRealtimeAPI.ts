import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';

interface RealtimeAPIOptions {
  onMessage?: (message: any) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onError?: (error: Error) => void;
  userProfile?: any;
  jobData?: any; // For job-specific interviews
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
        } else if (serverEvent.type === 'response.audio.delta') {
          setIsSpeaking(true);
          options.onAudioStart?.();
        } else if (serverEvent.type === 'input_audio_buffer.speech_started') {
          setIsListening(true);
        } else if (serverEvent.type === 'input_audio_buffer.speech_stopped') {
          setIsListening(false);
          // Trigger AI response after user stops speaking
          setTimeout(() => {
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
              const responseCreate = {
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio']
                }
              };
              dataChannelRef.current.send(JSON.stringify(responseCreate));
            }
          }, 500); // Small delay to ensure audio buffer is processed
        }
        
        options.onMessage?.(serverEvent);
      });
      
      dc.addEventListener('open', () => {
        setIsConnected(true);
        setIsConnecting(false);
        
        // Generate dynamic instructions based on user profile and job context
        const buildInstructions = (userProfile: any, jobData: any) => {
          const profileContext = userProfile ? `

CANDIDATE BACKGROUND:
${userProfile.firstName ? `Name: ${userProfile.firstName} ${userProfile.lastName || ''}` : ''}
${userProfile.currentRole ? `Current Role: ${userProfile.currentRole}${userProfile.company ? ` at ${userProfile.company}` : ''}` : ''}
${userProfile.yearsOfExperience ? `Experience: ${userProfile.yearsOfExperience} years` : ''}
${userProfile.education ? `Education: ${userProfile.education}${userProfile.university ? ` from ${userProfile.university}` : ''}` : ''}
${userProfile.location ? `Location: ${userProfile.location}` : ''}
${userProfile.summary ? `Profile Summary: ${userProfile.summary}` : ''}
${userProfile.resumeUrl ? `NOTE: The candidate has uploaded a resume. Use this background information to ask more personalized and relevant follow-up questions.` : ''}

Use this information to tailor your questions and make them more specific to their background. Reference their experience and current situation when appropriate.` : '';

          const jobContext = jobData ? `

JOB DETAILS:
Position: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location || 'Not specified'}
Job Description: ${jobData.description}

This is a JOB-SPECIFIC INTERVIEW. Focus on evaluating how well the candidate fits this specific role and company.` : '';

          if (jobData) {
            // Job-specific interview (2 questions)
            return `You are an AI interviewer conducting a job-specific interview for the position of ${jobData.title} at ${jobData.company}. Your goal is to assess the candidate's fit for this specific role through exactly 2 focused questions.${profileContext}${jobContext}

The 2 questions to ask in order:
1. "I'd like to understand why you're interested in this ${jobData.title} role at ${jobData.company}. What draws you to this position and how does it align with your career goals?"
2. "Based on the job requirements, can you tell me about your relevant experience and skills that make you a strong candidate for this ${jobData.title} position?"

Key guidelines:
- Start with a warm greeting mentioning the specific role and company
- Be conversational and encouraging, not robotic
- Listen carefully to their responses and show genuine interest
- Reference their background information to make questions more relevant
- Keep the conversation focused on job fit and role suitability
- After each answer, acknowledge what they shared before moving to the next question
- Speak clearly and at a natural pace
- ALWAYS respond after the user speaks - never stay silent
- After question 2, thank them warmly and use the word "conclude" ONLY in your final response to signal the interview is complete. For example: "Thank you for sharing your thoughts about this ${jobData.title} role. This concludes our interview today, and I have everything I need to evaluate your application."
- IMPORTANT: Only use the word "conclude" in your very last response when the interview is finished. Never use this word at any other time during the conversation.

This focused approach ensures we understand their fit for this specific role while respecting their time.`;
          } else {
            // Regular profile interview (5 questions)
            return `You are an AI interviewer conducting a focused professional interview. Your goal is to understand the candidate on both a personal and professional level through exactly 5 structured questions.${profileContext}

The 5 questions to ask in order:
1. "Let's start with you as a person - tell me about your background and what led you to your current career path?"
2. "What does a typical day or week look like in your current role, and what aspects do you find most fulfilling?"
3. "When you think about your key strengths and skills, which ones make you stand out in your field?"
4. "Tell me about a challenge or project you're particularly proud of - what made it meaningful to you?"
5. "Looking ahead, what kind of role or environment would be your ideal next step, and what drives that vision?"

Key guidelines:
- Start with a warm greeting, then proceed through each question in order
- Be conversational and encouraging, not robotic
- Listen carefully to their responses and show genuine interest
- If you have background information about them, reference it naturally to make questions more relevant
- Keep the conversation moving toward the goal of understanding them deeply
- After each answer, acknowledge what they shared before moving to the next question
- Speak clearly and at a natural pace
- ALWAYS respond after the user speaks - never stay silent
- After question 5, thank them warmly and use the word "conclude" ONLY in your final response to signal the interview is complete. For example: "Thank you so much for sharing all of that with me. This concludes our interview today, and I have everything I need to create your professional profile."
- IMPORTANT: Only use the word "conclude" in your very last response when the interview is finished. Never use this word at any other time during the conversation.

This focused approach ensures we understand them comprehensively while respecting their time.`;
          }
        };

        // Initialize session with interview-specific settings
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: buildInstructions(options.userProfile, options.jobData),
            voice: 'verse',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 2500
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