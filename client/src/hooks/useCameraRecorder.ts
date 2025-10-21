
import { useState, useRef, useCallback } from 'react';

export function useCameraRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const stopResolveRef = useRef<((blob: Blob) => void) | null>(null);

  const startRecording = useCallback((stream: MediaStream) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.warn('Recording is already active');
      return;
    }

    try {
      recordedChunksRef.current = [];

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

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('Received recording chunk:', event.data.size, 'bytes, total chunks:', recordedChunksRef.current.length);
        } else {
          console.log('Received empty chunk');
        }
      });

      mediaRecorder.addEventListener('stop', () => {
        console.log('MediaRecorder stopped, chunks collected:', recordedChunksRef.current.length);

        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: mimeType,
        });

        console.log('Created blob with MIME type:', mimeType, 'size:', recordedBlob.size, 'bytes');

        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);

        if (stopResolveRef.current) {
          stopResolveRef.current(recordedBlob);
          stopResolveRef.current = null;
        }
      });

      mediaRecorder.addEventListener('error', (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
        mediaRecorderRef.current = null;

        if (stopResolveRef.current) {
          stopResolveRef.current(new Blob([], { type: 'video/webm' }));
          stopResolveRef.current = null;
        }
      });

      mediaRecorder.start(1000); // Collect data every 1 second
      setIsRecording(true);
      console.log('Recording started with mimeType:', mediaRecorder.mimeType);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise<Blob>((resolve) => {
      if (!mediaRecorderRef.current) {
        console.warn('No active recorder to stop');
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }

      if (mediaRecorderRef.current.state === 'inactive') {
        console.warn('Recorder is already stopped');
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }

      stopResolveRef.current = resolve;

      try {
        mediaRecorderRef.current.stop();
        console.log('Recording stop requested');
      } catch (error) {
        console.error('Error stopping recorder:', error);
        setIsRecording(false);
        mediaRecorderRef.current = null;
        const emptyBlob = new Blob([], { type: 'video/webm' });
        resolve(emptyBlob);
        stopResolveRef.current = null;
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
    recordedChunksRef.current = [];
    stopResolveRef.current = null;
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
