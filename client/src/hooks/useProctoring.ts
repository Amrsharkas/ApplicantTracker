/**
 * useProctoring Hook
 *
 * React hook for real-time proctoring detection using face-api.js
 * Detects: no face, multiple faces, head pose violations, gaze direction
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import {
  loadFaceApiModels,
  areModelsLoaded,
  DETECTION_OPTIONS,
} from '@/lib/faceApiLoader';
import {
  ProctoringConfig,
  ProctoringStatus,
  ProctoringViolation,
  ViolationType,
  HeadPose,
  DEFAULT_PROCTORING_CONFIG,
  getViolationSeverity,
  getViolationDescription,
} from '@/types/proctoring';

/**
 * Return type of the useProctoring hook
 */
export interface UseProctoringReturn {
  /** Current proctoring status */
  status: ProctoringStatus;
  /** List of all violations detected this session */
  violations: ProctoringViolation[];
  /** Start proctoring detection with a video element */
  startProctoring: (videoElement: HTMLVideoElement) => void;
  /** Stop proctoring detection */
  stopProctoring: () => void;
  /** Clear all recorded violations */
  clearViolations: () => void;
  /** Load face-api models (called automatically, but can be called manually) */
  loadModels: () => Promise<boolean>;
  /** Check if models are loaded */
  isModelLoaded: boolean;
}

/**
 * Initial status state
 */
const initialStatus: ProctoringStatus = {
  isModelLoaded: false,
  isDetecting: false,
  currentFaceCount: 0,
  currentHeadPose: null,
  consecutiveViolationFrames: {
    no_face: 0,
    multiple_faces: 0,
    head_pose: 0,
    gaze_away: 0,
    tab_switch: 0,
  },
  totalViolations: 0,
  error: null,
};

/**
 * Calculate head pose from face landmarks
 *
 * Uses the nose, eyes, and jaw landmarks to estimate 3D head rotation
 */
function calculateHeadPose(landmarks: faceapi.FaceLandmarks68): HeadPose {
  const positions = landmarks.positions;

  // Key landmark points
  const noseTip = positions[30];      // Tip of nose
  const noseBase = positions[27];     // Bridge of nose (between eyes)
  const leftEyeOuter = positions[36]; // Left eye outer corner
  const rightEyeOuter = positions[45];// Right eye outer corner
  const chin = positions[8];          // Bottom of chin

  // Calculate eye center (midpoint between eyes)
  const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;

  // Calculate face width (distance between outer eye corners)
  const faceWidth = Math.sqrt(
    Math.pow(rightEyeOuter.x - leftEyeOuter.x, 2) +
    Math.pow(rightEyeOuter.y - leftEyeOuter.y, 2)
  );

  // Calculate face height (eye center to chin)
  const faceHeight = Math.sqrt(
    Math.pow(chin.x - eyeCenterX, 2) +
    Math.pow(chin.y - eyeCenterY, 2)
  );

  // YAW (left-right rotation)
  // Based on nose tip horizontal offset from eye center
  const noseOffsetX = noseTip.x - eyeCenterX;
  const yawRatio = noseOffsetX / (faceWidth / 2);
  const yaw = Math.asin(Math.max(-1, Math.min(1, yawRatio))) * (180 / Math.PI);

  // PITCH (up-down rotation)
  // Based on nose vertical position relative to expected position
  const expectedNoseY = eyeCenterY + faceHeight * 0.35;
  const noseOffsetY = noseTip.y - expectedNoseY;
  const pitchRatio = noseOffsetY / (faceHeight * 0.3);
  const pitch = Math.asin(Math.max(-1, Math.min(1, pitchRatio))) * (180 / Math.PI);

  // ROLL (head tilt)
  // Based on angle of line connecting outer eye corners
  const eyeAngle = Math.atan2(
    rightEyeOuter.y - leftEyeOuter.y,
    rightEyeOuter.x - leftEyeOuter.x
  );
  const roll = eyeAngle * (180 / Math.PI);

  return { yaw, pitch, roll };
}

/**
 * Estimate gaze direction from eye landmarks
 * Note: This is a simplified estimation without iris detection
 */
function estimateGazeDirection(landmarks: faceapi.FaceLandmarks68): { x: number; y: number } {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  // Get eye centers
  const leftCenter = {
    x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
    y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length,
  };
  const rightCenter = {
    x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
    y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length,
  };

  // Get eye widths
  const leftWidth = Math.abs(leftEye[3].x - leftEye[0].x);
  const rightWidth = Math.abs(rightEye[3].x - rightEye[0].x);

  // Without iris detection, we can only estimate based on head pose
  // This is a simplified approximation - returns 0,0 (center) as baseline
  // Real gaze tracking would require iris detection (MediaPipe or WebGazer)

  return { x: 0, y: 0 };
}

/**
 * Capture a snapshot from video element
 */
function captureSnapshot(video: HTMLVideoElement, quality: number = 0.7): string | undefined {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', quality);
  } catch (error) {
    console.error('[Proctoring] Failed to capture snapshot:', error);
    return undefined;
  }
}

/**
 * Main proctoring hook
 */
export function useProctoring(config: ProctoringConfig = {}): UseProctoringReturn {
  // Merge config with defaults
  const {
    detectionInterval,
    consecutiveFrameThreshold,
    headPoseThresholds,
    gazeThreshold,
    captureSnapshots,
    onViolation,
    onStatusChange,
  } = { ...DEFAULT_PROCTORING_CONFIG, ...config };

  // State
  const [status, setStatus] = useState<ProctoringStatus>(initialStatus);
  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(areModelsLoaded());

  // Refs for detection loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const consecutiveFramesRef = useRef<Record<ViolationType, number>>({
    no_face: 0,
    multiple_faces: 0,
    head_pose: 0,
    gaze_away: 0,
    tab_switch: 0,
  });

  /**
   * Update status and notify callback
   */
  const updateStatus = useCallback((updates: Partial<ProctoringStatus>) => {
    setStatus(prev => {
      const newStatus = { ...prev, ...updates };
      onStatusChange?.(newStatus);
      return newStatus;
    });
  }, [onStatusChange]);

  /**
   * Record a confirmed violation
   */
  const recordViolation = useCallback((
    type: ViolationType,
    confidence: number,
    details: ProctoringViolation['details'],
    video?: HTMLVideoElement
  ) => {
    const violation: ProctoringViolation = {
      type,
      timestamp: new Date(),
      confidence,
      severity: getViolationSeverity(type, confidence),
      details: {
        ...details,
        description: getViolationDescription(type, details),
      },
      snapshot: video && captureSnapshots ? captureSnapshot(video) : undefined,
    };

    // Log to console for testing
    console.log(`[Proctoring] 🚨 VIOLATION: ${type}`, {
      confidence: `${(confidence * 100).toFixed(0)}%`,
      severity: violation.severity,
      details: violation.details,
      timestamp: violation.timestamp.toISOString(),
    });

    setViolations(prev => [...prev, violation]);
    updateStatus({ totalViolations: status.totalViolations + 1 });

    // Call callback
    onViolation?.(violation);
  }, [captureSnapshots, onViolation, status.totalViolations, updateStatus]);

  /**
   * Handle potential violation (with consecutive frame aggregation)
   */
  const handlePotentialViolation = useCallback((
    type: ViolationType,
    confidence: number,
    details: ProctoringViolation['details'],
    video?: HTMLVideoElement
  ) => {
    consecutiveFramesRef.current[type]++;

    console.log(`[Proctoring] Potential ${type} (frame ${consecutiveFramesRef.current[type]}/${consecutiveFrameThreshold})`);

    if (consecutiveFramesRef.current[type] >= consecutiveFrameThreshold) {
      // Confirmed violation
      recordViolation(type, confidence, details, video);
      // Reset counter after recording
      consecutiveFramesRef.current[type] = 0;
    }

    // Update status with current consecutive frames
    updateStatus({
      consecutiveViolationFrames: { ...consecutiveFramesRef.current },
    });
  }, [consecutiveFrameThreshold, recordViolation, updateStatus]);

  /**
   * Reset consecutive frames for a violation type (when condition clears)
   */
  const clearViolationType = useCallback((type: ViolationType) => {
    if (consecutiveFramesRef.current[type] > 0) {
      consecutiveFramesRef.current[type] = 0;
      updateStatus({
        consecutiveViolationFrames: { ...consecutiveFramesRef.current },
      });
    }
  }, [updateStatus]);

  /**
   * Run a single detection cycle
   */
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || !isRunningRef.current) {
      return;
    }

    try {
      // Detect all faces with landmarks
      const detections = await faceapi
        .detectAllFaces(video, DETECTION_OPTIONS)
        .withFaceLandmarks();

      const faceCount = detections.length;

      // Update current face count
      updateStatus({ currentFaceCount: faceCount });

      // Check: No face detected
      if (faceCount === 0) {
        handlePotentialViolation('no_face', 1.0, { faceCount: 0 }, video);
        clearViolationType('multiple_faces');
        clearViolationType('head_pose');
        clearViolationType('gaze_away');
        updateStatus({ currentHeadPose: null });
        return;
      }

      // Clear no_face since we have at least one face
      clearViolationType('no_face');

      // Check: Multiple faces detected
      if (faceCount > 1) {
        handlePotentialViolation(
          'multiple_faces',
          0.95,
          {
            faceCount,
            faceBounds: detections.map(d => ({
              x: d.detection.box.x,
              y: d.detection.box.y,
              width: d.detection.box.width,
              height: d.detection.box.height,
            })),
          },
          video
        );
        // Still check head pose of first face
      } else {
        clearViolationType('multiple_faces');
      }

      // Analyze primary face (first detected)
      const primaryFace = detections[0];
      const landmarks = primaryFace.landmarks;

      // Calculate head pose
      const headPose = calculateHeadPose(landmarks);
      updateStatus({ currentHeadPose: headPose });

      // Log current head pose (verbose, can be disabled)
      // console.log(`[Proctoring] Head pose: yaw=${headPose.yaw.toFixed(1)}° pitch=${headPose.pitch.toFixed(1)}° roll=${headPose.roll.toFixed(1)}°`);

      // Check: Head pose violation
      const isHeadPoseViolation =
        Math.abs(headPose.yaw) > headPoseThresholds.yaw ||
        Math.abs(headPose.pitch) > headPoseThresholds.pitch ||
        Math.abs(headPose.roll) > headPoseThresholds.roll;

      if (isHeadPoseViolation) {
        // Calculate confidence based on how much over threshold
        const yawExcess = Math.abs(headPose.yaw) - headPoseThresholds.yaw;
        const pitchExcess = Math.abs(headPose.pitch) - headPoseThresholds.pitch;
        const rollExcess = Math.abs(headPose.roll) - headPoseThresholds.roll;
        const maxExcess = Math.max(yawExcess, pitchExcess, rollExcess);
        const confidence = Math.min(0.5 + (maxExcess / 30), 1.0);

        handlePotentialViolation(
          'head_pose',
          confidence,
          { headPose },
          video
        );
      } else {
        clearViolationType('head_pose');
      }

      // Estimate gaze direction (simplified)
      const gazeDirection = estimateGazeDirection(landmarks);

      // Check: Gaze away violation
      // Note: Without iris detection, this is limited
      // We primarily rely on head pose for now
      const isGazeAway =
        Math.abs(gazeDirection.x) > gazeThreshold ||
        Math.abs(gazeDirection.y) > gazeThreshold;

      if (isGazeAway) {
        const confidence = Math.min(
          (Math.abs(gazeDirection.x) + Math.abs(gazeDirection.y)) / 2,
          1.0
        );
        handlePotentialViolation(
          'gaze_away',
          confidence,
          { gazeDirection },
          video
        );
      } else {
        clearViolationType('gaze_away');
      }

    } catch (error) {
      console.error('[Proctoring] Detection error:', error);
      updateStatus({ error: error instanceof Error ? error.message : 'Detection failed' });
    }
  }, [
    handlePotentialViolation,
    clearViolationType,
    updateStatus,
    headPoseThresholds,
    gazeThreshold,
  ]);

  /**
   * Start the detection loop
   */
  const startDetectionLoop = useCallback(() => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
    }

    let lastDetectionTime = 0;

    const loop = async (timestamp: number) => {
      if (!isRunningRef.current) return;

      // Run detection at specified interval
      if (timestamp - lastDetectionTime >= detectionInterval) {
        await runDetection();
        lastDetectionTime = timestamp;
      }

      detectionLoopRef.current = requestAnimationFrame(loop);
    };

    detectionLoopRef.current = requestAnimationFrame(loop);
    console.log(`[Proctoring] Detection loop started (interval: ${detectionInterval}ms)`);
  }, [detectionInterval, runDetection]);

  /**
   * Load face-api models
   */
  const loadModels = useCallback(async (): Promise<boolean> => {
    console.log('[Proctoring] Loading models...');
    const success = await loadFaceApiModels();
    setIsModelLoaded(success);
    updateStatus({ isModelLoaded: success });

    if (!success) {
      updateStatus({ error: 'Failed to load face detection models' });
    }

    return success;
  }, [updateStatus]);

  /**
   * Start proctoring detection
   */
  const startProctoring = useCallback((videoElement: HTMLVideoElement) => {
    if (!isModelLoaded) {
      console.error('[Proctoring] Cannot start: models not loaded');
      updateStatus({ error: 'Models not loaded. Call loadModels() first.' });
      return;
    }

    if (isRunningRef.current) {
      console.warn('[Proctoring] Already running');
      return;
    }

    console.log('[Proctoring] Starting proctoring detection...');
    videoRef.current = videoElement;
    isRunningRef.current = true;

    // Reset consecutive frames
    consecutiveFramesRef.current = {
      no_face: 0,
      multiple_faces: 0,
      head_pose: 0,
      gaze_away: 0,
      tab_switch: 0,
    };

    updateStatus({
      isDetecting: true,
      error: null,
      consecutiveViolationFrames: { ...consecutiveFramesRef.current },
    });

    startDetectionLoop();
  }, [isModelLoaded, startDetectionLoop, updateStatus]);

  /**
   * Stop proctoring detection
   */
  const stopProctoring = useCallback(() => {
    console.log('[Proctoring] Stopping proctoring detection...');

    isRunningRef.current = false;

    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }

    videoRef.current = null;

    updateStatus({
      isDetecting: false,
      currentFaceCount: 0,
      currentHeadPose: null,
    });
  }, [updateStatus]);

  /**
   * Clear all recorded violations
   */
  const clearViolations = useCallback(() => {
    setViolations([]);
    updateStatus({ totalViolations: 0 });
    console.log('[Proctoring] Violations cleared');
  }, [updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionLoopRef.current) {
        cancelAnimationFrame(detectionLoopRef.current);
      }
      isRunningRef.current = false;
    };
  }, []);

  return {
    status,
    violations,
    startProctoring,
    stopProctoring,
    clearViolations,
    loadModels,
    isModelLoaded,
  };
}

export default useProctoring;
