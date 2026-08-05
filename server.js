/**
 * RawenChat Bridge Server
 *
 * Ports:
 *   3003  HTTP  — REST endpoints (scene, settings, avatar, obs-component)
 *   3002  WS    — overlay scene bus (editor ↔ OBS live page)
 *   3004  WS    — binary camera relay (publisher → viewers, no browser perms needed)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// ─── Persistence ──────────────────────────────────────────────────────────────

const DATA_DIR            = path.join(__dirname, '.bridge');
const SCENE_FILE          = path.join(DATA_DIR, 'overlay-scene.json');
const SETTINGS_FILE       = path.join(DATA_DIR, 'overlay-settings.json');
const AVATAR_FILE         = path.join(DATA_DIR, 'avatar-settings.json');
const OBS_COMPONENT_FILE  = path.join(DATA_DIR, 'obs-component.json');
const NOW_PLAYING_FILE    = path.join(DATA_DIR, 'now-playing.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readJsonFile(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function writeJsonFile(p, data) {
  ensureDataDir();
  fs.writeFileSync(p, JSON.stringify(data), 'utf8');
}

ensureDataDir();
let sceneRecord     = readJsonFile(SCENE_FILE);
let overlaySettings = readJsonFile(SETTINGS_FILE);
let avatarSettings  = readJsonFile(AVATAR_FILE);
let obsComponent    = readJsonFile(OBS_COMPONENT_FILE);
let nowPlaying      = readJsonFile(NOW_PLAYING_FILE); // { track: {...} | null }

console.log(sceneRecord
  ? `📂 Escena cargada: "${sceneRecord.scene?.name}" (rev ${sceneRecord.revision})`
  : '📂 Sin escena guardada aún');

// ─── CORS helpers ─────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

function sendJson(res, data, status = 200) {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', c => { body += c; });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON inválido')); } });
    req.on('error', reject);
  });
}

function broadcastScene(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

// ─── HTTP server :3003 ────────────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];

  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }

  // GET /overlay-scene?id=<sceneId>  — returns a specific scene from overlaySettings
  // GET /overlay-scene               — returns the last broadcast sceneRecord (legacy)
  if (pathname === '/overlay-scene' && req.method === 'GET') {
    const qs    = new URL(req.url, 'http://localhost').searchParams;
    const wantId = qs.get('id');
    if (wantId && overlaySettings?.scenes?.length) {
      const found = overlaySettings.scenes.find(s => s.id === wantId);
      if (found) { sendJson(res, { revision: 0, scene: found }); return; }
    }
    sendJson(res, sceneRecord); return;
  }
  // POST /overlay-scene
  if (pathname === '/overlay-scene' && req.method === 'POST') {
    readBody(req).then(scene => {
      if (!scene?.widgets) throw new Error('Escena inválida');
      const revision = (sceneRecord?.revision ?? 0) + 1;
      sceneRecord = { revision, scene };
      writeJsonFile(SCENE_FILE, sceneRecord);
      // Keep overlaySettings in sync so GET ?id= always returns fresh data
      if (overlaySettings?.scenes?.length) {
        overlaySettings.scenes = overlaySettings.scenes.map(s =>
          s.id === scene.id ? scene : s
        );
        writeJsonFile(SETTINGS_FILE, overlaySettings);
      }
      broadcastScene({ type: 'OVERLAY_SCENE_UPDATED', revision, scene });
      sendJson(res, sceneRecord);
    }).catch(e => sendJson(res, { error: e.message }, 400));
    return;
  }

  // GET /overlay-settings
  if (pathname === '/overlay-settings' && req.method === 'GET') {
    sendJson(res, overlaySettings); return;
  }
  // POST /overlay-settings
  if (pathname === '/overlay-settings' && req.method === 'POST') {
    readBody(req).then(s => {
      overlaySettings = s; writeJsonFile(SETTINGS_FILE, s); sendJson(res, s);
    }).catch(e => sendJson(res, { error: e.message }, 400));
    return;
  }

  // GET /avatar-settings
  if (pathname === '/avatar-settings' && req.method === 'GET') {
    sendJson(res, avatarSettings); return;
  }
  // POST /avatar-settings
  if (pathname === '/avatar-settings' && req.method === 'POST') {
    readBody(req).then(s => {
      avatarSettings = s; writeJsonFile(AVATAR_FILE, s);
      broadcastScene({ type: 'AVATAR_SETTINGS_UPDATED', settings: s });
      sendJson(res, s);
    }).catch(e => sendJson(res, { error: e.message }, 400));
    return;
  }

  // GET /obs-component
  if (pathname === '/obs-component' && req.method === 'GET') {
    sendJson(res, obsComponent); return;
  }
  // POST /obs-component
  if (pathname === '/obs-component' && req.method === 'POST') {
    readBody(req).then(d => {
      if (typeof d?.componentCode !== 'string') throw new Error('componentCode requerido');
      obsComponent = d; writeJsonFile(OBS_COMPONENT_FILE, d); sendJson(res, d);
    }).catch(e => sendJson(res, { error: e.message }, 400));
    return;
  }

  // GET /now-playing
  if (pathname === '/now-playing' && req.method === 'GET') {
    sendJson(res, nowPlaying ?? { track: null }); return;
  }
  // POST /now-playing  (called by Electron process every 3s)
  if (pathname === '/now-playing' && req.method === 'POST') {
    readBody(req).then(d => {
      nowPlaying = d;
      writeJsonFile(NOW_PLAYING_FILE, d);
      sendJson(res, d);
    }).catch(e => sendJson(res, { error: e.message }, 400));
    return;
  }

  res.writeHead(404, CORS); res.end('Not Found');
});

httpServer.on('error', e => console.error('❌ HTTP error:', e.message));
httpServer.listen(3003, '127.0.0.1', () =>
  console.log('🌐 HTTP bridge  →  http://127.0.0.1:3003'));

// ─── WS :3002 — overlay scene bus ────────────────────────────────────────────

const wss = new WebSocketServer({ port: 3002 });

wss.on('connection', ws => {
  // Send latest scene immediately on connect
  if (sceneRecord) {
    ws.send(JSON.stringify({
      type: 'OVERLAY_SCENE_UPDATED',
      revision: sceneRecord.revision,
      scene: sceneRecord.scene,
    }));
  }

  ws.on('message', raw => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'UPDATE_THRESHOLD') {
        broadcastScene({ type: 'NEW_THRESHOLD', value: data.value });
      }
      if (data.type === 'UPDATE_OVERLAY_SCENE' && data.scene) {
        const revision = (sceneRecord?.revision ?? 0) + 1;
        sceneRecord = { revision, scene: data.scene };
        writeJsonFile(SCENE_FILE, sceneRecord);
        // Also update this scene inside overlaySettings so GET ?id= returns fresh data
        if (overlaySettings?.scenes?.length) {
          overlaySettings.scenes = overlaySettings.scenes.map(s =>
            s.id === data.scene.id ? data.scene : s
          );
          writeJsonFile(SETTINGS_FILE, overlaySettings);
        }
        broadcastScene({ type: 'OVERLAY_SCENE_UPDATED', revision, scene: data.scene });
      }
    } catch (e) { console.error('WS parse error:', e.message); }
  });

  ws.on('close', () => {});
});

wss.on('error', e => console.error('❌ WS error:', e.message));
console.log('📡 WebSocket bridge  →  ws://127.0.0.1:3002');

// ─── WS :3004 — WebRTC signaling ─────────────────────────────────────────────
//
// Simple 1-to-many signaling relay.
// The app (offerer) connects to /publish, sends SDP offer + ICE candidates.
// Each live page / OBS browser (answerer) connects to /view, receives the offer,
// sends back SDP answer + ICE candidates.
// The server just relays messages — no media passes through it.
//
// Message protocol (JSON):
//   { type: "offer",     sdp: "..."  }   offerer  → server → all viewers
//   { type: "answer",    sdp: "...", viewerId: "..." }  viewer → server → offerer
//   { type: "ice",       candidate: {...}, viewerId?: "..." }  both directions
//   { type: "ping" }     keepalive
//   { type: "viewers",   count: N }   server → offerer (info only)

let offererWs = null;  // only one offerer at a time
const viewerWsMap = new Map(); // viewerId → ws
let viewerSeq = 0;

const wssSig = new WebSocketServer({ port: 3004 });

wssSig.on('connection', (ws, req) => {
  const url = (req.url || '/').split('?')[0];

  // ── Offerer (RawenChat app) ────────────────────────────────────────────────
  if (url === '/publish') {
    // Replace previous offerer
    if (offererWs && offererWs.readyState === 1) {
      try { offererWs.close(); } catch {}
    }
    offererWs = ws;
    console.log('📡 WebRTC offerer connected');

    // Tell offerer about all waiting viewers so it creates an offer for each
    ws.send(JSON.stringify({ type: 'viewers', count: viewerWsMap.size }));
    for (const [waitingId] of viewerWsMap) {
      ws.send(JSON.stringify({ type: 'new-viewer', viewerId: waitingId }));
    }

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') return;

        if (msg.type === 'offer') {
          // Broadcast offer to all current viewers
          for (const [, vws] of viewerWsMap) {
            if (vws.readyState === 1) vws.send(raw.toString());
          }
          return;
        }

        if (msg.type === 'ice' && msg.viewerId) {
          // Targeted ICE to a specific viewer
          const vws = viewerWsMap.get(msg.viewerId);
          if (vws && vws.readyState === 1) vws.send(raw.toString());
          return;
        }

        // Untargeted ICE — broadcast to all viewers
        if (msg.type === 'ice') {
          for (const [, vws] of viewerWsMap) {
            if (vws.readyState === 1) vws.send(raw.toString());
          }
        }
      } catch {}
    });

    ws.on('close', () => {
      if (offererWs === ws) offererWs = null;
      console.log('📡 WebRTC offerer disconnected');
    });
    return;
  }

  // ── Viewer (OBS live page / browser) ──────────────────────────────────────
  const viewerId = `v${++viewerSeq}`;
  viewerWsMap.set(viewerId, ws);
  console.log(`📡 WebRTC viewer connected: ${viewerId} (${viewerWsMap.size} total)`);

  // Send viewerId so viewer can include it in answer/ice messages
  ws.send(JSON.stringify({ type: 'connected', viewerId }));

  // If offerer is present, tell it to send a fresh offer to this new viewer
  if (offererWs && offererWs.readyState === 1) {
    offererWs.send(JSON.stringify({ type: 'viewers', count: viewerWsMap.size }));
    offererWs.send(JSON.stringify({ type: 'new-viewer', viewerId }));
  }

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ping') return;
      // answer and ice go back to the offerer
      if (offererWs && offererWs.readyState === 1) {
        offererWs.send(raw.toString());
      }
    } catch {}
  });

  ws.on('close', () => {
    viewerWsMap.delete(viewerId);
    console.log(`📡 WebRTC viewer disconnected: ${viewerId} (${viewerWsMap.size} remaining)`);
    if (offererWs && offererWs.readyState === 1) {
      offererWs.send(JSON.stringify({ type: 'viewers', count: viewerWsMap.size }));
    }
  });
});

wssSig.on('error', e => console.error('❌ Signaling WS error:', e.message));
console.log('📡 WebRTC signaling  →  ws://127.0.0.1:3004  (/publish | /view)');
