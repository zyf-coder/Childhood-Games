const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const bin = path.join(process.env.TEMP || process.env.TMP || '.', 'cloudflared.exe');
const log = path.join(process.env.TEMP || process.env.TMP || '.', 'cf-tunnel-url.txt');
const child = spawn(bin, ['tunnel', '--url', 'http://127.0.0.1:3000', '--no-autoupdate'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});

let buf = '';
function onChunk(chunk) {
  const s = chunk.toString();
  process.stdout.write(s);
  buf += s;
  const m = buf.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m) {
    fs.writeFileSync(log, m[0] + '\n');
    console.log('\n[SAVED]', m[0]);
  }
}
child.stdout.on('data', onChunk);
child.stderr.on('data', onChunk);
child.on('exit', (code) => console.log('cloudflared exit', code));

// keep process alive
setInterval(() => {}, 1 << 30);
