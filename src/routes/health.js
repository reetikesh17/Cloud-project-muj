import express from 'express';

const router = express.Router();

const startTime = new Date();

router.get('/', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    status: 'healthy',
    service: 'library-management-system',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    startedAt: startTime.toISOString(),
    memory: {
      rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
      heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
    }
  });
});

router.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready', ready: true });
});

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', live: true });
});

export default router;
