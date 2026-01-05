import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = express.Router();

router.use(createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: { '^/api/grafana': '' },
}));

router.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Grafana proxy error:', err);
  res.status(502).json({ error: 'Analytics engine offline' });
});

export default router;
