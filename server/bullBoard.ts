import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { videoQueue } from './queues/videoQueue';

// Create Express adapter for Bull Board
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board with video queue
createBullBoard({
  queues: [
    new BullMQAdapter(videoQueue)
  ],
  serverAdapter: serverAdapter,
});

console.log('✅ Bull Board dashboard initialized at /admin/queues');
