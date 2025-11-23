import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { hlsService } from '../services/hlsService.js';
import { db } from '../db.js';
import { interviewSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { VideoProcessingJobData } from '../queues/videoQueue.js';

// Redis connection configuration
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Create worker to process video transcoding jobs
export const videoWorker = new Worker<VideoProcessingJobData>(
  'video-processing',
  async (job: Job<VideoProcessingJobData>) => {
    const { sessionId, userId } = job.data;

    console.log(`🎬 [Worker] Starting video processing for session ${sessionId}`);

    try {
      // Update job progress
      await job.updateProgress(10);

      // Update session status to processing
      const parsedSessionId = parseInt(sessionId);
      if (!isNaN(parsedSessionId)) {
        await db
          .update(interviewSessions)
          .set({
            interviewVideoUrl: 'processing' // Indicate processing state
          })
          .where(eq(interviewSessions.id, parsedSessionId));
      }

      await job.updateProgress(20);

      // Generate HLS playlist from all chunks
      console.log(`🎬 [Worker] Generating HLS playlist for session ${sessionId}`);
      const result = await hlsService.generateM3U8Playlist(sessionId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate HLS playlist');
      }

      await job.updateProgress(90);

      // Verify the database was updated correctly
      if (!isNaN(parsedSessionId)) {
        const updatedSession = await db.query.interviewSessions.findFirst({
          where: eq(interviewSessions.id, parsedSessionId)
        });

        if (updatedSession?.interviewVideoUrl !== result.playlistUrl) {
          console.warn(`⚠️ [Worker] Database may not have been updated. Expected: ${result.playlistUrl}, Got: ${updatedSession?.interviewVideoUrl}`);
        } else {
          console.log(`✅ [Worker] Database verified - URL saved: ${updatedSession.interviewVideoUrl}`);
        }
      }

      console.log(`✅ [Worker] Video processing completed for session ${sessionId}`);
      console.log(`   Playlist URL: ${result.playlistUrl}`);
      console.log(`   Total segments: ${result.totalSegments}`);

      await job.updateProgress(100);

      // Return result
      return {
        success: true,
        playlistUrl: result.playlistUrl,
        totalSegments: result.totalSegments,
        sessionId,
      };
    } catch (error: any) {
      console.error(`❌ [Worker] Video processing failed for session ${sessionId}:`, error);

      // Update session to indicate failure
      const parsedSessionId = parseInt(sessionId);
      if (!isNaN(parsedSessionId)) {
        await db
          .update(interviewSessions)
          .set({
            interviewVideoUrl: 'failed' // Indicate failure state
          })
          .where(eq(interviewSessions.id, parsedSessionId));
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 videos at a time
    limiter: {
      max: 5, // Maximum 5 jobs
      duration: 60000, // Per minute
    },
  }
);

// Event listeners for monitoring
videoWorker.on('completed', (job) => {
  console.log(`✅ [Worker] Job ${job.id} completed successfully`);
});

videoWorker.on('failed', (job, error) => {
  console.error(`❌ [Worker] Job ${job?.id} failed:`, error.message);
});

videoWorker.on('error', (error) => {
  console.error('❌ [Worker] Worker error:', error);
});

console.log('✅ Video processing worker started');
