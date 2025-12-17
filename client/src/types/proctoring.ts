/**
 * Proctoring Detection Types
 *
 * Types for the client-side proctoring detection system using face-api.js
 */

/**
 * Types of violations that can be detected during proctoring
 */
export type ViolationType =
  | 'no_face'        // No face detected in frame
  | 'multiple_faces' // More than one face detected
  | 'head_pose'      // Head turned away (excessive yaw/pitch/roll)
  | 'gaze_away'      // Eyes looking away from screen
  | 'tab_switch';    // Browser tab/window switch (handled separately)

/**
 * Severity levels for violations
 */
export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Head pose angles in degrees
 */
export interface HeadPose {
  /** Left/right rotation (-90 to +90, 0 = facing camera) */
  yaw: number;
  /** Up/down tilt (-90 to +90, 0 = level) */
  pitch: number;
  /** Head tilt/roll (-180 to +180, 0 = upright) */
  roll: number;
}

/**
 * Gaze direction estimation
 */
export interface GazeDirection {
  /** Horizontal gaze (-1 = left, 0 = center, 1 = right) */
  x: number;
  /** Vertical gaze (-1 = up, 0 = center, 1 = down) */
  y: number;
}

/**
 * Face bounding box coordinates
 */
export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Details about a detected violation
 */
export interface ViolationDetails {
  /** Number of faces detected (0 for no_face, >1 for multiple_faces) */
  faceCount?: number;
  /** Head pose angles when violation was detected */
  headPose?: HeadPose;
  /** Estimated gaze direction */
  gazeDirection?: GazeDirection;
  /** Bounding boxes of detected faces */
  faceBounds?: FaceBounds[];
  /** Human-readable description of the violation */
  description?: string;
}

/**
 * A single proctoring violation event
 */
export interface ProctoringViolation {
  /** Type of violation detected */
  type: ViolationType;
  /** When the violation was detected */
  timestamp: Date;
  /** Confidence level of the detection (0 to 1) */
  confidence: number;
  /** Severity of the violation */
  severity: ViolationSeverity;
  /** Additional details about the violation */
  details: ViolationDetails;
  /** Base64 encoded snapshot at time of violation (optional) */
  snapshot?: string;
}

/**
 * Current status of the proctoring system
 */
export interface ProctoringStatus {
  /** Whether face-api models have been loaded */
  isModelLoaded: boolean;
  /** Whether detection is currently running */
  isDetecting: boolean;
  /** Number of faces currently detected */
  currentFaceCount: number;
  /** Current head pose (if face detected) */
  currentHeadPose: HeadPose | null;
  /** Number of consecutive frames with same violation type */
  consecutiveViolationFrames: Record<ViolationType, number>;
  /** Total violations recorded this session */
  totalViolations: number;
  /** Last error message (if any) */
  error: string | null;
}

/**
 * Thresholds for head pose violation detection
 */
export interface HeadPoseThresholds {
  /** Maximum allowed yaw (left/right) in degrees */
  yaw: number;
  /** Maximum allowed pitch (up/down) in degrees */
  pitch: number;
  /** Maximum allowed roll (tilt) in degrees */
  roll: number;
}

/**
 * Configuration options for the proctoring hook
 */
export interface ProctoringConfig {
  /** Interval between detection runs in milliseconds (default: 500) */
  detectionInterval?: number;
  /** Number of consecutive frames before triggering a violation (default: 3) */
  consecutiveFrameThreshold?: number;
  /** Head pose thresholds for violations */
  headPoseThresholds?: HeadPoseThresholds;
  /** Gaze threshold for looking away (0 to 1, default: 0.3) */
  gazeThreshold?: number;
  /** Whether to capture snapshots on violation (default: true) */
  captureSnapshots?: boolean;
  /** Callback when a violation is confirmed */
  onViolation?: (violation: ProctoringViolation) => void;
  /** Callback when proctoring status changes */
  onStatusChange?: (status: ProctoringStatus) => void;
}

/**
 * Default configuration values
 */
export const DEFAULT_PROCTORING_CONFIG: Required<Omit<ProctoringConfig, 'onViolation' | 'onStatusChange'>> = {
  detectionInterval: 500,
  consecutiveFrameThreshold: 3,
  headPoseThresholds: {
    yaw: 30,    // 30 degrees left/right
    pitch: 25,  // 25 degrees up/down
    roll: 20,   // 20 degrees tilt
  },
  gazeThreshold: 0.3,
  captureSnapshots: true,
};

/**
 * Violation severity weights for risk scoring
 */
export const VIOLATION_WEIGHTS: Record<ViolationType, number> = {
  multiple_faces: 15,
  no_face: 10,
  head_pose: 5,
  gaze_away: 4,
  tab_switch: 8,
};

/**
 * Map violation types to their severity
 */
export function getViolationSeverity(type: ViolationType, confidence: number): ViolationSeverity {
  if (type === 'multiple_faces' && confidence > 0.9) return 'critical';
  if (type === 'multiple_faces' || type === 'no_face') return 'high';
  if (type === 'tab_switch') return 'medium';
  if (type === 'head_pose' || type === 'gaze_away') {
    return confidence > 0.8 ? 'medium' : 'low';
  }
  return 'low';
}

/**
 * Get human-readable description for a violation type
 */
export function getViolationDescription(type: ViolationType, details?: ViolationDetails): string {
  switch (type) {
    case 'no_face':
      return 'No face detected in camera view';
    case 'multiple_faces':
      return `Multiple faces detected (${details?.faceCount || 'unknown'} faces)`;
    case 'head_pose':
      if (details?.headPose) {
        const { yaw, pitch } = details.headPose;
        if (Math.abs(yaw) > Math.abs(pitch)) {
          return `Head turned ${yaw > 0 ? 'right' : 'left'} (${Math.abs(yaw).toFixed(0)}°)`;
        }
        return `Head tilted ${pitch > 0 ? 'down' : 'up'} (${Math.abs(pitch).toFixed(0)}°)`;
      }
      return 'Excessive head movement detected';
    case 'gaze_away':
      return 'Looking away from screen';
    case 'tab_switch':
      return 'Browser tab or window switch detected';
    default:
      return 'Unknown violation';
  }
}
