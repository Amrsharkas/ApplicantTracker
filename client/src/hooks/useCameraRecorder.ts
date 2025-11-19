
import { useState, useRef, useCallback } from 'react';

export interface ChunkReadyCallback {
  (chunk: Blob, chunkIndex: number): void;
}

export function useCameraRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const chunkCallbackRef = useRef<ChunkReadyCallback | null>(null);
  const currentChunkDataRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('video/webm');

  const startRecording = useCallback((stream: MediaStream, onChunkReady?: ChunkReadyCallback) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.warn('Recording is already active');
      return;
    }

    try {
      chunkIndexRef.current = 0;
      currentChunkDataRef.current = [];
      chunkCallbackRef.current = onChunkReady || null;

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

      mimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      console.log('Using MediaRecorder with MIME type:', mimeType);

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available - this fires every 5 seconds (timeslice)
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          currentChunkDataRef.current.push(event.data);

          // Check if we have enough data for a chunk (happens at each timeslice interval)
          // Create a blob from accumulated data and emit it
          const chunkBlob = new Blob(currentChunkDataRef.current, { type: mimeType });
          const currentIndex = chunkIndexRef.current;

          console.log(`[HLS Chunk] Chunk ${currentIndex} ready:`, chunkBlob.size, 'bytes');

          // Call the callback if provided
          if (chunkCallbackRef.current) {
            chunkCallbackRef.current(chunkBlob, currentIndex);
          }

          // Increment chunk index and clear current data for next chunk
          chunkIndexRef.current++;
          currentChunkDataRef.current = [];
        } else {
          console.log('Received empty chunk');
        }
      });

      mediaRecorder.addEventListener('stop', () => {
        console.log('MediaRecorder stopped, total chunks emitted:', chunkIndexRef.current);

        // Handle any remaining data
        if (currentChunkDataRef.current.length > 0) {
          const finalChunkBlob = new Blob(currentChunkDataRef.current, { type: mimeType });
          console.log(`[HLS Chunk] Final chunk ${chunkIndexRef.current} ready:`, finalChunkBlob.size, 'bytes');

          if (chunkCallbackRef.current) {
            chunkCallbackRef.current(finalChunkBlob, chunkIndexRef.current);
          }
        }

        currentChunkDataRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);
      });

      mediaRecorder.addEventListener('error', (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
        mediaRecorderRef.current = null;
        currentChunkDataRef.current = [];
      });

      // Start recording with 5-second timeslice (chunks every 5 seconds)
      mediaRecorder.start(5000);
      setIsRecording(true);
      console.log('Recording started with mimeType:', mediaRecorder.mimeType, '(5-second chunks for HLS)');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        console.warn('No active recorder to stop');
        resolve();
        return;
      }

      if (mediaRecorderRef.current.state === 'inactive') {
        console.warn('Recorder is already stopped');
        resolve();
        return;
      }

      // Add stop listener that resolves the promise
      const handleStop = () => {
        console.log('Recording stopped successfully');
        resolve();
      };

      mediaRecorderRef.current.addEventListener('stop', handleStop, { once: true });

      try {
        mediaRecorderRef.current.stop();
        console.log('Recording stop requested');
      } catch (error) {
        console.error('Error stopping recorder:', error);
        setIsRecording(false);
        mediaRecorderRef.current = null;
        resolve();
      }
    });
  }, []);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Error stopping recorder during cleanup:', error);
      }
    }

    mediaRecorderRef.current = null;
    currentChunkDataRef.current = [];
    chunkCallbackRef.current = null;
    chunkIndexRef.current = 0;
    setIsRecording(false);
    console.log('Recorder cleanup completed');
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    cleanup,
  };
}
