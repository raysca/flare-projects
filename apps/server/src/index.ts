import { serve } from 'bun';
import index from './index.html';
import devPage from './dev.html';
import api from './api';
import { deleteExpiredSessions } from './services/session';
import { handleWebSocketUpgrade, websocketHandlers, setServer } from './realtime';

const server = serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,

  routes: {
    // API routes handled by Hono - must be before the catch-all
    '/api/v1/*': async (req) => {
      // Strip /api/v1 prefix before passing to Hono
      const url = new URL(req.url);
      const newUrl = new URL(req.url);
      newUrl.pathname = url.pathname.replace('/api/v1', '') || '/';
      const newReq = new Request(newUrl.toString(), req);
      return api.fetch(newReq);
    },

    // WebSocket upgrade requests
    '/ws/*': async (req, server) => {
      const response = await handleWebSocketUpgrade(req, server);
      // If upgrade was successful, response is undefined
      // If upgrade failed, return the error response
      return response ?? new Response(null, { status: 101 });
    },

    // Dev tools UI (development only)
    '/dev': devPage,

    // Serve index.html for all unmatched routes (SPA fallback)
    '/*': index,
  },

  // WebSocket handlers for Bun.serve()
  websocket: {
    ...websocketHandlers,
    // Bun automatically sends and responds to pings to keep connections alive
    sendPings: true,
    // Close idle connections after 2 minutes of no activity
    idleTimeout: 120,
    // Enable compression for large messages
    perMessageDeflate: true,
    // Max message size: 1MB
    maxPayloadLength: 1024 * 1024,
  },

  development: process.env.NODE_ENV !== 'production' && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

// Initialize broadcast system with server instance
setServer(server);

// Session cleanup interval - run every hour to delete expired sessions
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

setInterval(() => {
  deleteExpiredSessions()
    .then(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Cleaned up expired sessions');
      }
    })
    .catch((error) => {
      console.error('Failed to clean up expired sessions:', error);
    });
}, SESSION_CLEANUP_INTERVAL);

// Run initial cleanup on startup
deleteExpiredSessions().catch(console.error);

console.log(`🚀 Server running at ${server.url}`);
console.log(`📡 API available at ${server.url}api/v1`);
console.log(`🔌 WebSocket available at ws://${server.hostname}:${server.port}/ws/`);
console.log(`🛠️  Dev tools at ${server.url}dev`);
