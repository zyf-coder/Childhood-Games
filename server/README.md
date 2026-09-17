# FC Games Online Server

FC游戏联机服务器，支持双人在线对战。

## 功能

- 创建/加入房间
- 房间列表 `/rooms`
- 健康检查 `/health`
- 实时输入 / 聊天 / 语音信令同步
- WebSocket 心跳保活

## 本地自检

```powershell
cd server
npm install
node self-check.js
```

全部 `PASS` 即协议正常。

## 启动

```powershell
cd server
npm install
npm start
# 默认端口 3000，可用 $env:PORT 指定
```

Windows 也可执行 `./start-windows.ps1`。

## 线上故障排查（重要）

客户端默认连 `wss://ws.onlyforus.online`。

若出现「实时服务器连接失败」，按下面顺序检查：

1. **443 是否监听**（必须有 TLS，否则浏览器/App 无法用 wss）
   ```powershell
   Test-NetConnection ws.onlyforus.online -Port 443
   ```
2. **HTTP 是否返回 JSON**，而不是备案拦截页
   ```powershell
   Invoke-WebRequest https://ws.onlyforus.online/health
   Invoke-WebRequest https://ws.onlyforus.online/rooms
   ```
   正确应返回 `{"ok":true,...}` / `[]`。
3. 若打开是腾讯云「备案/温馨提示」页：域名未备案或 EdgeOne/CDN 拦截了源站。
   - 完成 `onlyforus.online` / `ws.onlyforus.online` 的 ICP 备案
   - 或把该子域改为**仅 DNS 指向源站**，不要套 CDN/EdgeOne 七层拦截
   - 在宝塔/Nginx 为 `ws.onlyforus.online` 配置 SSL，并反向代理到 `127.0.0.1:3000`，开启 WebSocket 升级
4. Nginx 反代示例：
   ```nginx
   server {
     listen 443 ssl http2;
     server_name ws.onlyforus.online;
     ssl_certificate     /path/fullchain.pem;
     ssl_certificate_key /path/privkey.pem;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_read_timeout 3600s;
     }
   }
   ```

## 部署到 Glitch（备选）

1. 访问 https://glitch.com
2. 创建新项目，上传 `server.js` 和 `package.json`
3. 用 Glitch 给的 HTTPS 域名覆盖客户端：
   ```html
   <script>window.REALTIME_SERVER_URL='wss://你的项目.glitch.me';window.REALTIME_HTTP_URL='https://你的项目.glitch.me';</script>
   ```

## 环境变量

- `PORT`: 服务器端口（默认 3000）
