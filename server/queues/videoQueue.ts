import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection configuration
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Job data interface
export interface VideoProcessingJobData {
  sessionId: string;
  userId: string;
}

// Create video processing queue
export const videoQueue = new Queue<VideoProcessingJobData>('video-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

console.log('✅ Video processing queue initialized');
