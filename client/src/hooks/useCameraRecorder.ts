import { useState, useRef, useCallback } from 'react';

export interface ChunkUploadProgress {
  chunkIndex: number;
  uploaded: number;
  total: number;
  totalChunks: number;
  failedChunks: number;
}

interface FailedChunk {
  blob: Blob;
  chunkIndex: number;
  sessionId: string;
  retryCount: number;
}

// Configuration for upload optimization
const CHUNK_INTERVAL_MS = 10000; // 10 seconds (reduced HTTP overhead)
const MAX_CONCURRENT_UPLOADS = 2; // Light parallelization (memory efficient)
const MAX_RETRY_ATTEMPTS = 3; // Retry failed chunks
const INITIAL_RETRY_DELAY_MS = 1000; // Initial retry delay (exponential backoff)

export function useCameraRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ChunkUploadProgress | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeUploadsRef = useRef<number>(0);
  const failedChunksRef = useRef<FailedChunk[]>([]);
  const totalChunksRef = useRef<number>(0);

  /**
   * Sleep helper for retry delays
   */
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Mix multiple audio streams into one using Web Audio API
   * This allows recording both user and AI audio together
   */
  const mixAudioStreams = useCallback((userStream: MediaStream, aiStream: MediaStream | null): MediaStream => {
    if (!aiStream) {
      // If no AI audio stream, return user stream as-is
      return userStream;
    }

    try {
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Add user audio
      const userAudioTracks = userStream.getAudioTracks();
      if (userAudioTracks.length > 0) {
        const userSource = audioContext.createMediaStreamSource(new MediaStream([userAudioTracks[0]]));
        userSource.connect(destination);
        console.log('✅ User audio connected to mixer');
      }

      // Add AI audio
      const aiAudioTracks = aiStream.getAudioTracks();
      if (aiAudioTracks.length > 0) {
        const aiSource = audioContext.createMediaStreamSource(new MediaStream([aiAudioTracks[0]]));
        aiSource.connect(destination);
        console.log('✅ AI audio connected to mixer');
      }

      // Add video tracks from user stream (if any)
      const videoTracks = userStream.getVideoTracks();
      if (videoTracks.length > 0) {
        destination.stream.addTrack(videoTracks[0]);
        console.log('✅ Video track added to mixed stream');
      }

      console.log('🎵 Audio mixing complete - recording both sides');
      return destination.stream;
    } catch (error) {
      console.error('❌ Error mixing audio streams:', error);
      console.log('⚠️ Falling back to user audio only');
      return userStream;
    }
  }, []);

  /**
   * Upload a single chunk to the server with retry logic
   */
  const uploadChunk = useCallback(async (blob: Blob, chunkIndex: number, sessionId: string, retryCount = 0): Promise<any> => {
    try {
      console.log(`📤 Uploading chunk ${chunkIndex}, size: ${blob.size} bytes (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

      const formData = new FormData();
      formData.append('chunk', blob, `chunk-${chunkIndex}.webm`);
      formData.append('sessionId', sessionId);
      formData.append('chunkIndex', chunkIndex.toString());

      setUploadProgress({
        chunkIndex,
        uploaded: 0,
        total: blob.size,
        totalChunks: totalChunksRef.current,
        failedChunks: failedChunksRef.current.length
      });

      const response = await fetch('/api/interview/upload-chunk', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Chunk upload failed');
      }

      const result = await response.json();
      console.log(`✅ Chunk ${chunkIndex} uploaded successfully:`, result);

      setUploadProgress({
        chunkIndex,
        uploaded: blob.size,
        total: blob.size,
        totalChunks: totalChunksRef.current,
        failedChunks: failedChunksRef.current.length
      });

      return result;
    } catch (error) {
      console.error(`❌ Error uploading chunk ${chunkIndex}:`, error);

      // Retry logic with exponential backoff
      if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`⏳ Retrying chunk ${chunkIndex} in ${delay}ms...`);
        await sleep(delay);
        return uploadChunk(blob, chunkIndex, sessionId, retryCount + 1);
      }

      // Max retries reached, add to failed chunks
      console.error(`❌ Chunk ${chunkIndex} failed after ${MAX_RETRY_ATTEMPTS} attempts`);
      failedChunksRef.current.push({ blob, chunkIndex, sessionId, retryCount: 0 });
      setUploadProgress(prev => prev ? {
        ...prev,
        failedChunks: failedChunksRef.current.length
      } : null);

      throw error;
    }
  }, []);

  /**
   * Start recording with automatic chunk upload
   * @param stream - User's media stream (video + audio)
   * @param sessionId - Session ID for upload
   * @param aiAudioStream - Optional AI audio stream to mix with user audio
   */
  const startRecording = useCallback((stream: MediaStream, sessionId: string, aiAudioStream?: MediaStream | null) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.warn('Recording is already active');
      return;
    }

    try {
      // Reset chunk index
      chunkIndexRef.current = 0;
      sessionIdRef.current = sessionId;

      // Mix audio streams (user + AI) if AI audio is provided
      const recordingStream = aiAudioStream ? mixAudioStreams(stream, aiAudioStream) : stream;

      if (aiAudioStream) {
        console.log('🎙️ Recording BOTH user and AI audio (two-way conversation)');
      } else {
        console.log('🎙️ Recording user audio only (AI audio not available)');
      }

      // Try to get supported MIME type
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else {
        console.warn('No supported WebM MIME types found, trying default');
      }

      // Configure MediaRecorder with optimized quality settings for low bandwidth
      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 200000, // 200 kbps (reduced from default ~2.5 Mbps)
        audioBitsPerSecond: 32000,  // 32 kbps (reduced from default 128 kbps)
      });

      console.log('Using MediaRecorder with MIME type:', mimeType);
      console.log('Video bitrate: 200 kbps, Audio bitrate: 32 kbps (optimized for low bandwidth)');

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available event - upload chunk with concurrency control
      mediaRecorder.addEventListener('dataavailable', async (event) => {
        if (event.data.size > 0) {
          const currentChunkIndex = chunkIndexRef.current;
          const currentSessionId = sessionIdRef.current;
          totalChunksRef.current = currentChunkIndex + 1;

          console.log(`📥 Received chunk ${currentChunkIndex}:`, event.data.size, 'bytes');

          // Light parallel upload with concurrency limit (memory efficient)
          const uploadPromise = (async () => {
            // Wait if we have too many concurrent uploads
            while (activeUploadsRef.current >= MAX_CONCURRENT_UPLOADS) {
              await sleep(100);
            }

            activeUploadsRef.current++;
            try {
              if (currentSessionId) {
                await uploadChunk(event.data, currentChunkIndex, currentSessionId);
              }
            } catch (error) {
              console.error(`Failed to upload chunk ${currentChunkIndex}, continuing...`, error);
              // Continue recording even if chunk upload fails
            } finally {
              activeUploadsRef.current--;
            }
          })();

          // Chain promise to track completion
          uploadQueueRef.current = uploadQueueRef.current
            .then(() => uploadPromise)
            .catch(error => {
              console.error('Upload queue error:', error);
            });

          chunkIndexRef.current++;
        } else {
          console.log('Received empty chunk');
        }
      });

      mediaRecorder.addEventListener('stop', async () => {
        console.log('MediaRecorder stopped, waiting for pending uploads...');

        // Wait for all pending uploads to complete
        await uploadQueueRef.current;

        console.log('All chunks uploaded, total chunks:', chunkIndexRef.current);

        mediaRecorderRef.current = null;
        setIsRecording(false);
        setUploadProgress(null);
      });

      mediaRecorder.addEventListener('error', (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
        mediaRecorderRef.current = null;
        setUploadProgress(null);
      });

      // Collect data every 10 seconds (reduced HTTP overhead for low bandwidth)
      mediaRecorder.start(CHUNK_INTERVAL_MS);
      setIsRecording(true);
      console.log('Recording started with mimeType:', mediaRecorder.mimeType);
      console.log(`Chunks will be uploaded every ${CHUNK_INTERVAL_MS / 1000} seconds during the interview (optimized for low bandwidth)`);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  }, [uploadChunk, mixAudioStreams]);

  /**
   * Stop recording and finalize (generate HLS playlist)
   */
  const stopRecording = useCallback(async () => {
    return new Promise<{ success: boolean; playlistUrl?: string; error?: string }>(async (resolve) => {
      if (!mediaRecorderRef.current) {
        console.warn('No active recorder to stop');
        resolve({ success: false, error: 'No active recorder' });
        return;
      }

      if (mediaRecorderRef.current.state === 'inactive') {
        console.warn('Recorder is already stopped');
        resolve({ success: false, error: 'Recorder already stopped' });
        return;
      }

      const currentSessionId = sessionIdRef.current;

      try {
        // Stop the recorder
        mediaRecorderRef.current.stop();
        console.log('Recording stop requested');

        // Wait for all chunks to upload
        await uploadQueueRef.current;
        console.log('All chunks uploaded successfully');

        // Finalize the recording (generate HLS playlist)
        if (currentSessionId) {
          console.log('🎬 Finalizing recording...');
          const finalizeResponse = await fetch('/api/interview/finalize-recording', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: currentSessionId
            }),
            credentials: 'include',
          });

          if (!finalizeResponse.ok) {
            const errorData = await finalizeResponse.json();
            throw new Error(errorData.message || 'Failed to finalize recording');
          }

          const finalizeResult = await finalizeResponse.json();
          console.log('✅ Recording finalized:', finalizeResult);

          resolve({
            success: true,
            playlistUrl: finalizeResult.playlistUrl
          });
        } else {
          resolve({
            success: false,
            error: 'No session ID available'
          });
        }
      } catch (error: any) {
        console.error('Error stopping/finalizing recorder:', error);
        setIsRecording(false);
        mediaRecorderRef.current = null;
        resolve({
          success: false,
          error: error.message || 'Failed to stop recording'
        });
      }
    });
  }, []);

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Error stopping recorder during cleanup:', error);
      }
    }

    // Ensure any recorder stream tracks are stopped
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    mediaRecorderRef.current = null;
    chunkIndexRef.current = 0;
    sessionIdRef.current = null;
    uploadQueueRef.current = Promise.resolve();
    activeUploadsRef.current = 0;
    failedChunksRef.current = [];
    totalChunksRef.current = 0;
    setIsRecording(false);
    setUploadProgress(null);
    console.log('Recorder cleanup completed');
  }, []);

  return {
    isRecording,
    uploadProgress,
    startRecording,
    stopRecording,
    cleanup,
  };
}
