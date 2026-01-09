/**
 * Client WebSocket Temps Réel - Tribeat
 * 
 * Client WebSocket RÉEL (pas de simulation)
 * Se connecte au serveur WebSocket natif sur port 3001
 */

'use client';

// ========================================
// CONFIGURATION
// ========================================

const WS_URL = typeof window !== 'undefined' 
  ? `ws://${window.location.hostname}:3001`
  : 'ws://localhost:3001';

// ========================================
// TYPES
// ========================================

export const WS_EVENTS = {
  // Client -> Server
  JOIN: 'join',
  LEAVE: 'leave',
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK: 'seek',
  VOLUME: 'volume',
  END: 'end',
  
  // Server -> Client
  STATE: 'state',
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  ERROR: 'error',
  PONG: 'pong',
} as const;

export interface WSMessage {
  event: string;
  data: any;
}

export interface SessionState {
  sessionId: string;
  status: 'LIVE' | 'PAUSED' | 'ENDED';
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  participants: Array<{
    userId: string;
    userName: string;
    role: string;
    joinedAt: number;
  }>;
  coachId: string | null;
  timestamp: number;
  yourRole?: string;
  latencyTest?: number;
}

type EventCallback = (data: any) => void;

// ========================================
// WEBSOCKET CLIENT CLASS
// ========================================

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  
  // Métriques
  private connectionTime = 0;
  private lastLatency = 0;
  
  constructor() {
    // Initialisation des handlers d'événements
    Object.values(WS_EVENTS).forEach(event => {
      this.eventHandlers.set(event, new Set());
    });
  }
  
  // ========================================
  // CONNECTION
  // ========================================
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }
      
      this.isConnecting = true;
      const startTime = Date.now();
      
      console.log(`[WS] Connecting to ${WS_URL}...`);
      
      try {
        this.ws = new WebSocket(WS_URL);
        
        this.ws.onopen = () => {
          this.connectionTime = Date.now() - startTime;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          console.log(`[WS] Connected in ${this.connectionTime}ms`);
          resolve();
        };
        
        this.ws.onclose = (event) => {
          this.isConnecting = false;
          console.log(`[WS] Disconnected (code: ${event.code})`);
          this.handleDisconnect();
        };
        
        this.ws.onerror = (error) => {
          this.isConnecting = false;
          console.error('[WS] Error:', error);
          reject(error);
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect().catch(() => {}), delay);
    }
  }
  
  // ========================================
  // MESSAGE HANDLING
  // ========================================
  
  private handleMessage(rawData: string): void {
    try {
      const message: WSMessage = JSON.parse(rawData);
      const { event, data } = message;
      
      // Mesurer la latence pour les pongs
      if (event === WS_EVENTS.PONG && data.serverTime) {
        this.lastLatency = Date.now() - data.serverTime;
        console.log(`[WS] Latency: ${this.lastLatency}ms`);
      }
      
      // Log avec timestamp
      const receiveTime = Date.now();
      console.log(`[WS] Received: ${event}`, { 
        ...data, 
        _receiveTime: receiveTime,
        _latency: data.timestamp ? receiveTime - data.timestamp : 'N/A'
      });
      
      // Appeler les handlers
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (err) {
            console.error(`[WS] Handler error for ${event}:`, err);
          }
        });
      }
      
    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
    }
  }
  
  // ========================================
  // SEND MESSAGES
  // ========================================
  
  send(event: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WS] Cannot send - not connected');
      return;
    }
    
    const message = JSON.stringify({ event, data });
    const sendTime = Date.now();
    
    console.log(`[WS] Sending: ${event}`, { ...data, _sendTime: sendTime });
    this.ws.send(message);
  }
  
  // ========================================
  // EVENT SUBSCRIPTION
  // ========================================
  
  on(event: string, callback: EventCallback): () => void {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(callback);
    
    // Return unsubscribe function
    return () => {
      handlers?.delete(callback);
    };
  }
  
  off(event: string, callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }
  
  // ========================================
  // SESSION METHODS
  // ========================================
  
  joinSession(sessionId: string, userId: string, userName: string, role: string): void {
    this.send(WS_EVENTS.JOIN, { sessionId, userId, userName, role });
  }
  
  leaveSession(): void {
    this.send(WS_EVENTS.LEAVE, {});
  }
  
  play(currentTime: number): void {
    this.send(WS_EVENTS.PLAY, { currentTime });
  }
  
  pause(currentTime: number): void {
    this.send(WS_EVENTS.PAUSE, { currentTime });
  }
  
  seek(currentTime: number): void {
    this.send(WS_EVENTS.SEEK, { currentTime });
  }
  
  setVolume(volume: number): void {
    this.send(WS_EVENTS.VOLUME, { volume });
  }
  
  endSession(): void {
    this.send(WS_EVENTS.END, {});
  }
  
  // ========================================
  // UTILITIES
  // ========================================
  
  ping(): void {
    this.send('ping', { clientTime: Date.now() });
  }
  
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  get latency(): number {
    return this.lastLatency;
  }
  
  get connectionDuration(): number {
    return this.connectionTime;
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let _client: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (typeof window === 'undefined') {
    throw new Error('RealtimeClient can only be used on client side');
  }
  
  if (!_client) {
    _client = new RealtimeClient();
  }
  
  return _client;
}
