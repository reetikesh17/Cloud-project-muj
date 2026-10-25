import { createApp } from './app.js';

let targetPort = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const app = createApp();

function startServer(port, maxRetries = 5) {
  const server = app.listen(port, HOST)
    .on('listening', () => {
      console.log('====================================================');
      console.log(` 📚 Library Management System is running!`);
      console.log(` 🚀 Local URL:    http://localhost:${port}`);
      console.log(` 🩺 Health Check: http://localhost:${port}/health`);
      console.log(` 📦 Environment:  ${process.env.NODE_ENV || 'production'}`);
      console.log('====================================================');
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${port} is currently in use.`);
        if (maxRetries > 0) {
          const nextPort = port + 1;
          console.log(`🔄 Automatically attempting fallback port ${nextPort}...`);
          startServer(nextPort, maxRetries - 1);
        } else {
          console.error(`❌ Could not bind to any open port between ${targetPort} and ${port}.`);
          console.error(`👉 Tip: Stop the process using port 3000 with 'npm run clean-port' or specify PORT=<number> npm start`);
          process.exit(1);
        }
      } else {
        console.error('❌ Server startup error:', err);
        process.exit(1);
      }
    });

  // Graceful shutdown handlers for Docker and Kubernetes signals
  function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down server gracefully...`);
    server.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forcefully terminating process after 10s timeout.');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
}

const serverInstance = startServer(targetPort);

export default serverInstance;
