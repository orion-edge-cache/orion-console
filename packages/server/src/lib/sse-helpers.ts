/**
 * SSE Helpers for Infrastructure Operations
 */

import type { Response } from 'express';
import type { ProgressEvent } from '@orion/infra';
import { redactCredentials } from './state.js';

type DeploymentProgress = ProgressEvent;

export function setSSEHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
}

export function handleSSEProgress(
  progress: DeploymentProgress,
  res: Response,
): void {
  const redactedProgress = {
    ...progress,
    message: progress.message
      ? redactCredentials(progress.message)
      : progress.message,
  };
  res.write(`data: ${JSON.stringify(redactedProgress)}\n\n`);
}

export async function handleSSESuccess(
  res: Response,
  message: string,
  cleanup?: () => Promise<void>,
): Promise<void> {
  if (cleanup) {
    await cleanup();
  }
  res.write(
    `data: ${JSON.stringify({ step: 'done', message, progress: 100 })}\n\n`,
  );
  res.end();
}

export async function handleSSEError(
  res: Response,
  error: Error,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  res.write(
    `data: ${JSON.stringify({
      step: 'error',
      message: redactCredentials(message),
      progress: 0,
      error: redactCredentials(message),
    })}\n\n`,
  );
  res.end();
}
