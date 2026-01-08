import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// ========================================
// SERVER-SIDE PUSHER (API Routes)
// ========================================
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'placeholder-app-id',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'placeholder-key',
  secret: process.env.PUSHER_SECRET || 'placeholder-secret',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

// ========================================
// CLIENT-SIDE PUSHER (Components)
// ========================================
export const getPusherClient = () => {
  return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || 'placeholder-key', {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    authEndpoint: '/api/pusher/auth',
  });
};
