import { useState, useRef, useCallback } from 'react';

export interface ChunkUploadProgress {
  chunkIndex: number;
  uploaded: number;
  total: number;
}

export function useCameraRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ChunkUploadProgress | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());

  /**
   * Upload a single chunk to the server
   */
  const uploadChunk = useCallback(async (blob: Blob, chunkIndex: number, sessionId: string) => {
    try {
      console.log(`📤 Uploading chunk ${chunkIndex}, size: ${blob.size} bytes`);

      const formData = new FormData();
      formData.append('chunk', blob, `chunk-${chunkIndex}.webm`);
      formData.append('sessionId', sessionId);
      formData.append('chunkIndex', chunkIndex.toString());

      setUploadProgress({
        chunkIndex,
        uploaded: 0,
        total: blob.size
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
        total: blob.size
      });

      return result;
    } catch (error) {
      console.error(`❌ Error uploading chunk ${chunkIndex}:`, error);
      throw error;
    }
  }, []);

  /**
   * Start recording with automatic chunk upload
   */
  const startRecording = useCallback((stream: MediaStream, sessionId: string) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.warn('Recording is already active');
      return;
    }

    try {
      // Reset chunk index
      chunkIndexRef.current = 0;
      sessionIdRef.current = sessionId;

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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      console.log('Using MediaRecorder with MIME type:', mimeType);

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available event - upload chunk immediately
      mediaRecorder.addEventListener('dataavailable', async (event) => {
        if (event.data.size > 0) {
          const currentChunkIndex = chunkIndexRef.current;
          const currentSessionId = sessionIdRef.current;

          console.log(`📥 Received chunk ${currentChunkIndex}:`, event.data.size, 'bytes');

          // Queue the upload (chain promises to maintain order)
          uploadQueueRef.current = uploadQueueRef.current
            .then(async () => {
              if (currentSessionId) {
                try {
                  await uploadChunk(event.data, currentChunkIndex, currentSessionId);
                } catch (error) {
                  console.error(`Failed to upload chunk ${currentChunkIndex}, continuing...`, error);
                  // Continue recording even if chunk upload fails
                }
              }
            })
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

      // Collect data every 5 seconds (sends chunks during interview)
      mediaRecorder.start(5000);
      setIsRecording(true);
      console.log('Recording started with mimeType:', mediaRecorder.mimeType);
      console.log('Chunks will be uploaded every 5 seconds during the interview');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  }, [uploadChunk]);

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

    mediaRecorderRef.current = null;
    chunkIndexRef.current = 0;
    sessionIdRef.current = null;
    uploadQueueRef.current = Promise.resolve();
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
