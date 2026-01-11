import express from 'express';
import {
  getLogs,
  getAggregatedMetrics,
  getTimeSeries,
  getEvents,
  clearAnalytics,
} from '../db/index.js';
import {
  startConsumer as startKinesisConsumer,
  stopConsumer as stopKinesisConsumer,
  isConsumerRunning,
  getConsumerStats,
} from '../kinesis/index.js';
import { getSubscriberCount } from '../sse/index.js';

const router = express.Router();

router.get('/metrics', async (req, res) => {
  try {
    const range = parseInt(req.query.range as string) || 300;
    const since = Math.floor(Date.now() / 1000) - range;

    const metrics = getAggregatedMetrics(since);

    res.json({
      hitRate: metrics.hitRate,
      requestsPerSec: metrics.requestsPerSecond,
      avgLatency: metrics.avgLatency / 1000,
      totalRequests: metrics.totalRequests,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/metrics/timeseries', async (req, res) => {
  try {
    const range = parseInt(req.query.range as string) || 300;
    const bucketSize = parseInt(req.query.bucket as string) || 1;
    const since = Math.floor(Date.now() / 1000) - range;

    const timeSeries = getTimeSeries(since, undefined, bucketSize);

    res.json({
      data: timeSeries,
      range,
      bucketSize,
    });
  } catch (error) {
    console.error('Error fetching time series:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const since = parseInt(req.query.since as string) || Date.now() - 3600000;
    const limit = Math.min(parseInt(req.query.limit as string) || 1000, 5000);

    const logs = getLogs(since, limit);

    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/events', async (req, res) => {
  try {
    const since = parseInt(req.query.since as string) || Date.now() - 86400000;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

    const events = getEvents(since, limit);

    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/observability/status', async (_req, res) => {
  try {
    const consumerStats = getConsumerStats();

    res.json({
      kinesis: {
        running: isConsumerRunning(),
        recordsProcessed: consumerStats.recordsProcessed,
        errors: consumerStats.errors,
        lastPollTime: consumerStats.lastPollTime,
        lastRecordTime: consumerStats.lastRecordTime,
      },
      sse: {
        subscribers: getSubscriberCount(),
      },
    });
  } catch (error) {
    console.error('Error fetching observability status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/observability/kinesis/start', async (_req, res) => {
  try {
    const started = await startKinesisConsumer();
    res.json({ success: started });
  } catch (error) {
    console.error('Error starting Kinesis consumer:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/observability/kinesis/stop', async (_req, res) => {
  try {
    stopKinesisConsumer();
    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping Kinesis consumer:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/observability/analytics/clear', async (_req, res) => {
  try {
    clearAnalytics();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing analytics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
