const http = require('http');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();

function send(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(message)); } catch (e) {}
  }
}

function broadcast(room, message, excluded) {
  if (!room) return;
  room.players.forEach((player) => {
    if (player.ws !== excluded) send(player.ws, message);
  });
}

function generateRoomId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  if (rooms.has(id)) return generateRoomId();
  return id;
}

function removePlayer(ws, roomId, playerId) {
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;
  room.players = room.players.filter((player) => player.ws !== ws);
  if (playerId === 1) {
    broadcast(room, { type: 'host_left', playerId: 1 });
    rooms.delete(roomId);
  } else {
    broadcast(room, { type: 'player_left', playerId });
    if (!room.players.length) rooms.delete(roomId);
  }
}

function roomList() {
  const list = [];
  for (const [id, room] of rooms) {
    if (room.players.length < 2 && room.players.length > 0) {
      list.push({
        id,
        game: room.game || '',
        player1: room.players[0] && room.players[0].name ? room.players[0].name : '玩家1'
      });
    }
  }
  return list;
}

const server = http.createServer((request, response) => {
  const url = (request.url || '/').split('?')[0];

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    response.end();
    return;
  }

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  };

  if (url === '/health' || url === '/') {
    response.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    response.end(JSON.stringify({
      ok: true,
      service: 'classic-fc-games',
      rooms: rooms.size,
      time: Date.now()
    }));
    return;
  }

  if (url === '/rooms') {
    response.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    response.end(JSON.stringify(roomList()));
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json', ...cors });
  response.end(JSON.stringify({ ok: false, error: 'not_found' }));
});

const websocketServer = new WebSocket.Server({ server });

websocketServer.on('connection', (ws) => {
  let roomId = null;
  let playerId = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'ping') {
      send(ws, { type: 'pong', t: Date.now() });
      return;
    }

    if (message.type === 'create_room') {
      if (roomId) removePlayer(ws, roomId, playerId);
      roomId = generateRoomId();
      playerId = 1;
      rooms.set(roomId, {
        game: message.game || '',
        createdAt: Date.now(),
        players: [{ ws, id: 1, name: String(message.playerName || '玩家1').slice(0, 16) }]
      });
      send(ws, { type: 'room_created', roomId, playerId });
      return;
    }

    if (message.type === 'join_room') {
      const requestedId = String(message.roomId || '').trim().toUpperCase();
      const room = rooms.get(requestedId);
      if (!room) return send(ws, { type: 'error', message: '房间不存在' });
      if (room.players.length >= 2) return send(ws, { type: 'error', message: '房间已满' });
      if (room.players.some((p) => p.ws === ws)) return send(ws, { type: 'error', message: '已在房间中' });
      roomId = requestedId;
      playerId = 2;
      const name = String(message.playerName || '玩家2').slice(0, 16);
      room.players.push({ ws, id: 2, name });
      send(ws, { type: 'room_joined', roomId, playerId, game: room.game, hostName: room.players[0].name });
      broadcast(room, { type: 'player_joined', playerId: 2, playerName: name }, ws);
      return;
    }

    const room = roomId ? rooms.get(roomId) : null;
    if (!room) return;

    if (message.type === 'leave_room') {
      removePlayer(ws, roomId, playerId);
      roomId = null;
      playerId = null;
      return;
    }

    if (['player_input', 'game_state', 'chat', 'voice_signal', 'game_start'].includes(message.type)) {
      broadcast(room, { ...message, fromPlayer: playerId }, ws);
    }
  });

  ws.on('close', () => removePlayer(ws, roomId, playerId));
  ws.on('error', () => removePlayer(ws, roomId, playerId));
});

// 心跳，清理死连接
const heartbeat = setInterval(() => {
  websocketServer.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch (e) {}
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 30000);

// 超时房间清理（1 小时）
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > 3600000) {
      broadcast(room, { type: 'host_left', playerId: 1 });
      rooms.delete(id);
    }
  }
}, 300000);

websocketServer.on('close', () => {
  clearInterval(heartbeat);
  clearInterval(sweeper);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`FC server listening on ${PORT}`);
});
