/**
 * Serveur WebSocket Temps Réel - Tribeat
 * 
 * Serveur WebSocket RÉEL (pas de simulation)
 * Gère les sessions live avec synchronisation < 300ms
 * 
 * Usage: node src/server/websocket.js
 * Port: 3001
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// ========================================
// CONFIGURATION
// ========================================

const PORT = process.env.WS_PORT || 3001;

// Stockage en mémoire des sessions actives
const sessions = new Map(); // sessionId -> SessionState
const clients = new Map();  // ws -> { sessionId, userId, role }

// ========================================
// TYPES D'ÉVÉNEMENTS
// ========================================

const EVENTS = {
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
};

// ========================================
// HELPERS
// ========================================

function log(msg, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${msg}`, JSON.stringify(data));
  } else {
    console.log(`[${timestamp}] ${msg}`);
  }
}

function getSessionState(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sessionId,
      status: 'LIVE',
      isPlaying: false,
      currentTime: 0,
      volume: 80,
      participants: [],
      coachId: null,
      lastUpdate: Date.now(),
    });
  }
  return sessions.get(sessionId);
}

function broadcast(sessionId, event, data, excludeWs = null) {
  const message = JSON.stringify({
    event,
    data: {
      ...data,
      sessionId,
      timestamp: Date.now(),
    },
  });
  
  let count = 0;
  clients.forEach((clientInfo, ws) => {
    if (clientInfo.sessionId === sessionId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      count++;
    }
  });
  
  log(`[BROADCAST] ${event} to ${count} clients in session ${sessionId}`);
  return count;
}

function sendToClient(ws, event, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      event,
      data: {
        ...data,
        timestamp: Date.now(),
      },
    }));
  }
}

// ========================================
// SERVEUR HTTP + WEBSOCKET
// ========================================

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      sessions: sessions.size,
      clients: clients.size,
      uptime: process.uptime(),
    }));
    return;
  }
  
  // Stats endpoint
  if (req.url === '/stats') {
    const stats = [];
    sessions.forEach((state, id) => {
      stats.push({
        sessionId: id,
        participants: state.participants.length,
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
      });
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sessions: stats }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocket.Server({ server });

// ========================================
// WEBSOCKET HANDLERS
// ========================================

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  log(`[CONNECT] New client from ${clientIp}`);
  
  ws.isAlive = true;
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());
      const { event, data } = message;
      
      const receiveTime = Date.now();
      log(`[RECEIVE] ${event}`, { ...data, receiveTime });
      
      switch (event) {
        case EVENTS.JOIN:
          handleJoin(ws, data);
          break;
        case EVENTS.LEAVE:
          handleLeave(ws);
          break;
        case EVENTS.PLAY:
          handlePlay(ws, data);
          break;
        case EVENTS.PAUSE:
          handlePause(ws, data);
          break;
        case EVENTS.SEEK:
          handleSeek(ws, data);
          break;
        case EVENTS.VOLUME:
          handleVolume(ws, data);
          break;
        case EVENTS.END:
          handleEnd(ws, data);
          break;
        case 'ping':
          sendToClient(ws, EVENTS.PONG, { serverTime: Date.now() });
          break;
        default:
          log(`[WARN] Unknown event: ${event}`);
      }
    } catch (err) {
      log(`[ERROR] Failed to parse message: ${err.message}`);
      sendToClient(ws, EVENTS.ERROR, { message: 'Invalid message format' });
    }
  });
  
  ws.on('close', () => {
    handleLeave(ws);
    log(`[DISCONNECT] Client disconnected`);
  });
  
  ws.on('error', (err) => {
    log(`[ERROR] WebSocket error: ${err.message}`);
  });
});

// ========================================
// EVENT HANDLERS
// ========================================

function handleJoin(ws, data) {
  const { sessionId, userId, userName, role } = data;
  
  if (!sessionId || !userId) {
    sendToClient(ws, EVENTS.ERROR, { message: 'sessionId and userId required' });
    return;
  }
  
  // Stocker les infos client
  clients.set(ws, { sessionId, userId, userName, role: role || 'PARTICIPANT' });
  
  // Mettre à jour la session
  const state = getSessionState(sessionId);
  
  // Ajouter le participant s'il n'existe pas déjà
  if (!state.participants.find(p => p.userId === userId)) {
    state.participants.push({ userId, userName, role: role || 'PARTICIPANT', joinedAt: Date.now() });
  }
  
  // Si c'est le coach, enregistrer
  if (role === 'COACH' || role === 'SUPER_ADMIN') {
    state.coachId = userId;
  }
  
  state.lastUpdate = Date.now();
  
  log(`[JOIN] ${userName} (${role}) joined session ${sessionId}`, {
    participantCount: state.participants.length,
  });
  
  // Envoyer l'état actuel au nouveau participant
  sendToClient(ws, EVENTS.STATE, {
    ...state,
    yourRole: role || 'PARTICIPANT',
    latencyTest: Date.now(),
  });
  
  // Notifier les autres participants
  broadcast(sessionId, EVENTS.PARTICIPANT_JOINED, {
    userId,
    userName,
    role: role || 'PARTICIPANT',
    participantCount: state.participants.length,
  }, ws);
}

function handleLeave(ws) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const { sessionId, userId, userName } = clientInfo;
  const state = sessions.get(sessionId);
  
  if (state) {
    // Retirer le participant
    state.participants = state.participants.filter(p => p.userId !== userId);
    state.lastUpdate = Date.now();
    
    log(`[LEAVE] ${userName} left session ${sessionId}`, {
      participantCount: state.participants.length,
    });
    
    // Notifier les autres
    broadcast(sessionId, EVENTS.PARTICIPANT_LEFT, {
      userId,
      userName,
      participantCount: state.participants.length,
    });
    
    // Nettoyer si plus personne
    if (state.participants.length === 0) {
      sessions.delete(sessionId);
      log(`[CLEANUP] Session ${sessionId} deleted (no participants)`);
    }
  }
  
  clients.delete(ws);
}

function handlePlay(ws, data) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const { role } = clientInfo;
  if (role !== 'COACH' && role !== 'SUPER_ADMIN') {
    sendToClient(ws, EVENTS.ERROR, { message: 'Only coach can control playback' });
    return;
  }
  
  const { sessionId } = clientInfo;
  const state = getSessionState(sessionId);
  const { currentTime } = data;
  
  state.isPlaying = true;
  state.currentTime = currentTime || state.currentTime;
  state.lastUpdate = Date.now();
  
  log(`[PLAY] Session ${sessionId} at ${state.currentTime}s`);
  
  // Broadcast à TOUS (y compris le coach pour confirmation)
  broadcast(sessionId, EVENTS.PLAY, {
    currentTime: state.currentTime,
    isPlaying: true,
  });
}

function handlePause(ws, data) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const { role } = clientInfo;
  if (role !== 'COACH' && role !== 'SUPER_ADMIN') {
    sendToClient(ws, EVENTS.ERROR, { message: 'Only coach can control playback' });
    return;
  }
  
  const { sessionId } = clientInfo;
  const state = getSessionState(sessionId);
  const { currentTime } = data;
  
  state.isPlaying = false;
  state.currentTime = currentTime || state.currentTime;
  state.lastUpdate = Date.now();
  
  log(`[PAUSE] Session ${sessionId} at ${state.currentTime}s`);
  
  broadcast(sessionId, EVENTS.PAUSE, {
    currentTime: state.currentTime,
    isPlaying: false,
  });
}

function handleSeek(ws, data) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const { role } = clientInfo;
  if (role !== 'COACH' && role !== 'SUPER_ADMIN') {
    sendToClient(ws, EVENTS.ERROR, { message: 'Only coach can control playback' });
    return;
  }
  
  const { sessionId } = clientInfo;
  const state = getSessionState(sessionId);
  const { currentTime } = data;
  
  state.currentTime = currentTime;
  state.lastUpdate = Date.now();
  
  log(`[SEEK] Session ${sessionId} to ${currentTime}s`);
  
  broadcast(sessionId, EVENTS.SEEK, {
    currentTime: state.currentTime,
  });
}

function handleVolume(ws, data) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const { role } = clientInfo;
  if (role !== 'COACH' && role !== 'SUPER_ADMIN') {
    sendToClient(ws, EVENTS.ERROR, { message: 'Only coach can control volume' });
    return;
  }
  
  const { sessionId } = clientInfo;
  const state = getSessionState(sessionId);
  const { volume } = data;
  
  state.volume = volume;
  state.lastUpdate = Date.now();
  
  log(`[VOLUME] Session ${sessionId} to ${volume}%`);
  
  broadcast(sessionId, EVENTS.VOLUME, {
    volume: state.volume,
  });
}

function handleEnd(ws, data) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const { role } = clientInfo;
  if (role !== 'COACH' && role !== 'SUPER_ADMIN') {
    sendToClient(ws, EVENTS.ERROR, { message: 'Only coach can end session' });
    return;
  }
  
  const { sessionId } = clientInfo;
  const state = getSessionState(sessionId);
  
  state.status = 'ENDED';
  state.isPlaying = false;
  state.lastUpdate = Date.now();
  
  log(`[END] Session ${sessionId} ended by coach`);
  
  broadcast(sessionId, EVENTS.END, {
    status: 'ENDED',
  });
}

// ========================================
// HEARTBEAT (Keep connections alive)
// ========================================

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      handleLeave(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// ========================================
// START SERVER
// ========================================

server.listen(PORT, '0.0.0.0', () => {
  log(`===========================================`);
  log(`🚀 WebSocket Server RUNNING on port ${PORT}`);
  log(`   Health: http://localhost:${PORT}/health`);
  log(`   Stats:  http://localhost:${PORT}/stats`);
  log(`   WS:     ws://localhost:${PORT}`);
  log(`===========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Shutting down...');
  wss.close();
  server.close();
  process.exit(0);
});
