import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const outDir = path.resolve('screenshots');
await mkdir(outDir, { recursive: true });

const selectSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1170" height="2532" viewBox="0 0 390 844">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#bg)"/>
  <text x="195" y="56" fill="#64748b" font-family="Arial, sans-serif" font-size="12">9:41</text>
  <g transform="translate(195,110)">
    <text x="0" y="12" text-anchor="middle" font-size="40">🎮</text>
    <text x="34" y="4" fill="url(#title)" font-family="Arial, sans-serif" font-size="22" font-weight="700">经典怀旧游戏</text>
    <text x="34" y="26" fill="#94a3b8" font-family="Arial, sans-serif" font-size="12">FC/NES 经典合集</text>
  </g>
  ${[
    ['🍄','超级玛丽'],['🔫','魂斗罗'],['🥷','忍者龙剑传'],
    ['🚗','赤色要塞'],['👊','双截龙2'],['🚀','沙罗曼蛇'],
    ['🎖️','坦克大战'],['🏝️','冒险岛'],['🐸','忍者蛙'],
    ['🐢','忍者神龟'],['🐢','神龟格斗'],['💎','淘金者']
  ].map((g,i)=>{
    const col=i%3, row=Math.floor(i/3);
    const x=16+col*124, y=170+row*118;
    return `<g>
      <rect x="${x}" y="${y}" width="110" height="100" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.05)"/>
      <text x="${x+55}" y="${y+42}" text-anchor="middle" font-size="32">${g[0]}</text>
      <text x="${x+55}" y="${y+72}" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="11" font-weight="600">${g[1]}</text>
    </g>`;
  }).join('')}
  <rect x="0" y="769" width="390" height="75" fill="#1e293b"/>
  <rect x="0" y="769" width="390" height="1" fill="rgba(255,255,255,0.1)"/>
  <text x="65" y="800" text-anchor="middle" fill="#6366f1" font-family="Arial, sans-serif" font-size="11">🎮</text>
  <text x="65" y="818" text-anchor="middle" fill="#6366f1" font-family="Arial, sans-serif" font-size="11">游戏</text>
  <text x="195" y="800" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="11">👥</text>
  <text x="195" y="818" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="11">游戏房间</text>
  <text x="325" y="800" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="11">👤</text>
  <text x="325" y="818" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="11">我的</text>
</svg>`;

const gameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2532" height="1170" viewBox="0 0 844 390">
  <rect width="844" height="390" fill="#000"/>
  <!-- center game screen -->
  <rect x="190" y="40" width="464" height="300" fill="#000"/>
  <rect x="200" y="50" width="444" height="280" fill="#1a0a3e"/>
  <!-- fake TMNT-like scene -->
  <rect x="200" y="50" width="444" height="120" fill="#3b0764"/>
  <rect x="200" y="170" width="444" height="40" fill="#1e3a8a"/>
  <rect x="200" y="210" width="444" height="120" fill="#0c4a6e"/>
  <rect x="200" y="280" width="444" height="50" fill="#082f49"/>
  <!-- skyline -->
  <g fill="#0f172a">
    <rect x="220" y="90" width="30" height="80"/><rect x="260" y="70" width="40" height="100"/>
    <rect x="310" y="100" width="25" height="70"/><rect x="350" y="60" width="35" height="110"/>
    <rect x="400" y="85" width="28" height="85"/><rect x="440" y="75" width="45" height="95"/>
    <rect x="500" y="95" width="30" height="75"/><rect x="545" y="65" width="38" height="105"/>
    <rect x="600" y="100" width="32" height="70"/>
  </g>
  <!-- health bars -->
  <rect x="210" y="58" width="180" height="14" fill="#ef4444" stroke="#fff" stroke-width="2"/>
  <rect x="210" y="58" width="120" height="14" fill="#22c55e"/>
  <rect x="454" y="58" width="180" height="14" fill="#ef4444" stroke="#fff" stroke-width="2"/>
  <rect x="490" y="58" width="110" height="14" fill="#22c55e"/>
  <text x="300" y="54" fill="#fff" font-family="Arial" font-size="10" font-weight="700">1P SHREDDER</text>
  <text x="500" y="54" fill="#fff" font-family="Arial" font-size="10" font-weight="700">2P RAPH</text>
  <text x="412" y="56" fill="#fbbf24" font-family="Arial" font-size="16" font-weight="700">02</text>
  <!-- fighters -->
  <ellipse cx="360" cy="250" rx="14" ry="28" fill="#dc2626"/>
  <circle cx="360" cy="218" r="10" fill="#f5d0a9"/>
  <ellipse cx="420" cy="250" rx="14" ry="28" fill="#16a34a"/>
  <circle cx="420" cy="218" r="10" fill="#4ade80"/>
  <!-- voice buttons -->
  <circle cx="790" cy="42" r="18" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
  <text x="790" y="48" text-anchor="middle" fill="#fff" font-size="14">🎤</text>
  <circle cx="790" cy="88" r="18" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
  <text x="790" y="94" text-anchor="middle" fill="#fff" font-size="14">🔊</text>
  <!-- dpad -->
  <g>
    <rect x="28" y="160" width="52" height="52" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <text x="54" y="192" text-anchor="middle" fill="#e2e8f0" font-size="18">▲</text>
    <rect x="28" y="220" width="52" height="52" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <text x="54" y="252" text-anchor="middle" fill="#e2e8f0" font-size="18">◀</text>
    <rect x="88" y="220" width="52" height="52" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <text x="114" y="252" text-anchor="middle" fill="#e2e8f0" font-size="18">▶</text>
    <rect x="58" y="280" width="52" height="52" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <text x="84" y="312" text-anchor="middle" fill="#e2e8f0" font-size="18">▼</text>
  </g>
  <!-- right controls -->
  <rect x="640" y="250" width="68" height="36" rx="8" fill="rgba(15,23,42,0.9)" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
  <text x="674" y="273" text-anchor="middle" fill="#fff" font-family="Arial" font-size="13" font-weight="600">选择</text>
  <rect x="640" y="296" width="68" height="36" rx="8" fill="rgba(15,23,42,0.9)" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
  <text x="674" y="319" text-anchor="middle" fill="#fff" font-family="Arial" font-size="13" font-weight="600">开始</text>
  <circle cx="760" cy="270" r="34" fill="#ef4444"/>
  <text x="760" y="278" text-anchor="middle" fill="#fff" font-family="Arial" font-size="22" font-weight="700">A</text>
  <circle cx="720" cy="330" r="34" fill="#f97316"/>
  <text x="720" y="338" text-anchor="middle" fill="#fff" font-family="Arial" font-size="22" font-weight="700">B</text>
</svg>`;

await writeFile(path.join(outDir, 'select.svg'), selectSvg);
await writeFile(path.join(outDir, 'game.svg'), gameSvg);

await sharp(Buffer.from(selectSvg)).png().toFile(path.join(outDir, 'select.png'));
await sharp(Buffer.from(gameSvg)).png().toFile(path.join(outDir, 'game.png'));

const a = await sharp(path.join(outDir, 'select.png')).metadata();
const b = await sharp(path.join(outDir, 'game.png')).metadata();
console.log('select.png', a.width, a.height);
console.log('game.png', b.width, b.height);
