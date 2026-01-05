import express from 'express';
import { addSubscriber, removeSubscriber } from '../sse/index.js';

const router = express.Router();

router.get('/stream', (req, res) => {
  const channelsParam = req.query.channels as string;
  const channels = channelsParam
    ? (channelsParam.split(',') as Array<'logs' | 'metrics' | 'events' | 'all'>)
    : ['all' as const];

  const subscriberId = addSubscriber(res, channels);

  req.on('close', () => {
    removeSubscriber(subscriberId);
  });
});

router.get('/logs/stream', (req, res) => {
  const subscriberId = addSubscriber(res, ['logs']);

  req.on('close', () => {
    removeSubscriber(subscriberId);
  });
});

export default router;
