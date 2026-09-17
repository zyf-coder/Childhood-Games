/**
 * 联机服务器本地自检：HTTP + WebSocket 全流程
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const PORT = 3457;
const BASE = `http://127.0.0.1:${PORT}`;
const WS = `ws://127.0.0.1:${PORT}`;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function connectClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS);
    const inbox = [];
    const waiters = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      inbox.push(msg);
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].match(msg)) {
          waiters[i].resolve(msg);
          waiters.splice(i, 1);
        }
      }
    });
    ws.on('open', () => resolve({
      ws,
      send: (obj) => ws.send(JSON.stringify(obj)),
      clear: () => { inbox.length = 0; },
      expect: (type, timeout = 4000) => new Promise((res, rej) => {
        const found = inbox.find(m => m.type === type);
        if (found) {
          inbox.splice(inbox.indexOf(found), 1);
          return res(found);
        }
        const t = setTimeout(() => rej(new Error('timeout waiting ' + type)), timeout);
        waiters.push({
          match: (m) => m.type === type,
          resolve: (m) => { clearTimeout(t); res(m); }
        });
      }),
      close: () => ws.close()
    }));
    ws.on('error', reject);
  });
}

async function main() {
  const results = [];
  const ok = (name) => { results.push(['PASS', name]); console.log('PASS', name); };
  const fail = (name, err) => { results.push(['FAIL', name, String(err)]); console.log('FAIL', name, err); };

  const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverLog = '';
  server.stdout.on('data', d => serverLog += d.toString());
  server.stderr.on('data', d => serverLog += d.toString());

  try {
    await wait(500);

    // 1. health
    try {
      const h = await httpGet(BASE + '/health');
      const j = JSON.parse(h.body);
      if (h.status === 200 && j.ok === true) ok('GET /health');
      else fail('GET /health', h.body);
    } catch (e) { fail('GET /health', e.message); }

    // 2. rooms empty
    try {
      const r = await httpGet(BASE + '/rooms');
      const j = JSON.parse(r.body);
      if (r.status === 200 && Array.isArray(j) && j.length === 0) ok('GET /rooms empty');
      else fail('GET /rooms empty', r.body);
    } catch (e) { fail('GET /rooms empty', e.message); }

    // 3. create + list
    const host = await connectClient();
    host.send({ type: 'create_room', game: '超级玛丽', playerName: '甲' });
    const created = await host.expect('room_created');
    if (created.roomId && created.roomId.length === 6 && created.playerId === 1) ok('create_room');
    else fail('create_room', JSON.stringify(created));

    try {
      const r = await httpGet(BASE + '/rooms');
      const j = JSON.parse(r.body);
      if (j.length === 1 && j[0].id === created.roomId && j[0].player1 === '甲') ok('rooms list has host room');
      else fail('rooms list has host room', r.body);
    } catch (e) { fail('rooms list has host room', e.message); }

    // 4. join
    const guest = await connectClient();
    const joinedPromise = host.expect('player_joined');
    guest.send({ type: 'join_room', roomId: created.roomId, playerName: '乙' });
    const joined = await guest.expect('room_joined');
    const hostSawJoin = await joinedPromise;
    if (joined.playerId === 2 && hostSawJoin.playerName === '乙') ok('join_room + notify host');
    else fail('join_room', JSON.stringify({ joined, hostSawJoin }));

    // 5. full room not listed
    try {
      const r = await httpGet(BASE + '/rooms');
      const j = JSON.parse(r.body);
      if (j.length === 0) ok('full room hidden from list');
      else fail('full room hidden from list', r.body);
    } catch (e) { fail('full room hidden from list', e.message); }

    // 6. chat relay
    const chatPromise = host.expect('chat');
    guest.send({ type: 'chat', message: '你好' });
    const chat = await chatPromise;
    if (chat.message === '你好' && chat.fromPlayer === 2) ok('chat relay');
    else fail('chat relay', JSON.stringify(chat));

    // 7. input batch relay
    const inputPromise = guest.expect('player_input');
    host.send({ type: 'player_input', input: { keys: [{ key: 'KEY_A', value: 0x41 }, { key: 'KEY_RIGHT', value: 0x41 }] } });
    const input = await inputPromise;
    if (input.fromPlayer === 1 && input.input.keys.length === 2) ok('player_input batch relay');
    else fail('player_input', JSON.stringify(input));

    // 8. voice signal relay
    const voicePromise = host.expect('voice_signal');
    guest.send({ type: 'voice_signal', signal: { type: 'ready' } });
    const voice = await voicePromise;
    if (voice.signal && voice.signal.type === 'ready' && voice.fromPlayer === 2) ok('voice_signal relay');
    else fail('voice_signal', JSON.stringify(voice));

    // 9. game_start relay
    const startPromise = guest.expect('game_start');
    host.send({ type: 'game_start', game: '魂斗罗' });
    const start = await startPromise;
    if (start.game === '魂斗罗') ok('game_start relay');
    else fail('game_start', JSON.stringify(start));

    // 10. join nonexistent
    const stranger = await connectClient();
    stranger.send({ type: 'join_room', roomId: 'ZZZZZZ', playerName: '丙' });
    const err = await stranger.expect('error');
    if (err.message === '房间不存在') ok('join missing room errors');
    else fail('join missing room', JSON.stringify(err));
    stranger.close();

    // 11. guest leave, host notified
    const leftPromise = host.expect('player_left');
    guest.send({ type: 'leave_room' });
    const left = await leftPromise;
    if (left.playerId === 2) ok('leave_room notifies host');
    else fail('leave_room', JSON.stringify(left));

    // 12. guest can rejoin after leave
    guest.clear();
    guest.send({ type: 'join_room', roomId: created.roomId, playerName: '乙2' });
    const rejoined = await guest.expect('room_joined');
    if (rejoined.playerId === 2) ok('rejoin after leave');
    else fail('rejoin', JSON.stringify(rejoined));

    // 13. host leave destroys room
    host.send({ type: 'leave_room' });
    await wait(200);
    try {
      const r = await httpGet(BASE + '/rooms');
      const j = JSON.parse(r.body);
      if (j.length === 0) ok('host leave destroys room');
      else fail('host leave destroys room', r.body);
    } catch (e) { fail('host leave destroys room', e.message); }

    guest.close();
    host.close();

  } catch (e) {
    fail('unexpected', e.stack || e.message);
  } finally {
    server.kill();
  }

  const failed = results.filter(r => r[0] === 'FAIL');
  console.log('\n==== SELF-CHECK SUMMARY ====');
  console.log(`total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);
  if (failed.length) {
    failed.forEach(f => console.log(' -', f[1], f[2] || ''));
    process.exit(1);
  }
  process.exit(0);
}

main();
