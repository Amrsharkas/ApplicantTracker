/**
 * Face-API.js Model Loader
 *
 * Loads face-api.js models from CDN for proctoring detection
 */

import * as faceapi from 'face-api.js';

// CDN URL for face-api models (using vladmandic's maintained fork)
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// Track loading state
let modelsLoaded = false;
let loadingPromise: Promise<boolean> | null = null;

/**
 * Load required face-api.js models from CDN
 *
 * Models loaded:
 * - TinyFaceDetector: Fast, lightweight face detection
 * - FaceLandmark68Net: 68-point facial landmark detection for head pose
 *
 * @returns Promise<boolean> - true if models loaded successfully
 */
export async function loadFaceApiModels(): Promise<boolean> {
  // Return cached result if already loaded
  if (modelsLoaded) {
    console.log('[Proctoring] Face-API models already loaded');
    return true;
  }

  // Return existing promise if already loading
  if (loadingPromise) {
    console.log('[Proctoring] Face-API models already loading, waiting...');
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      console.log('[Proctoring] Loading face-api.js models from CDN...');
      const startTime = performance.now();

      // Load models in parallel
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);

      const loadTime = (performance.now() - startTime).toFixed(0);
      console.log(`[Proctoring] Face-API models loaded successfully in ${loadTime}ms`);

      modelsLoaded = true;
      return true;
    } catch (error) {
      console.error('[Proctoring] Failed to load face-api.js models:', error);
      loadingPromise = null;
      return false;
    }
  })();

  return loadingPromise;
}

/**
 * Check if models are loaded
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Get the face-api instance for direct access
 */
export function getFaceApi() {
  return faceapi;
}

/**
 * Detection options for TinyFaceDetector
 * - inputSize: Size of the input image (smaller = faster, larger = more accurate)
 * - scoreThreshold: Minimum confidence to consider a detection valid
 */
export const DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,      // 320 is a good balance of speed and accuracy
  scoreThreshold: 0.5, // 50% confidence threshold
});

/**
 * Detect faces in a video element
 *
 * @param video - HTMLVideoElement to detect faces in
 * @returns Detection results with face bounds and landmarks
 */
export async function detectFaces(video: HTMLVideoElement) {
  if (!modelsLoaded) {
    throw new Error('Face-API models not loaded. Call loadFaceApiModels() first.');
  }

  return faceapi
    .detectAllFaces(video, DETECTION_OPTIONS)
    .withFaceLandmarks();
}

/**
 * Detect a single face (more efficient when expecting only one face)
 *
 * @param video - HTMLVideoElement to detect face in
 * @returns Single face detection with landmarks, or undefined if no face
 */
export async function detectSingleFace(video: HTMLVideoElement) {
  if (!modelsLoaded) {
    throw new Error('Face-API models not loaded. Call loadFaceApiModels() first.');
  }

  return faceapi
    .detectSingleFace(video, DETECTION_OPTIONS)
    .withFaceLandmarks();
}
