# 一键启动本机联机服务 + 公网隧道
# 用法：在项目根目录执行  .\start-online.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = if ($env:MIMO_NODE) { $env:MIMO_NODE } else { 'node' }
$cloudflared = Join-Path $env:TEMP 'cloudflared.exe'

if (-not (Test-Path $cloudflared)) {
    Write-Host '下载 cloudflared...' -ForegroundColor Yellow
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cloudflared -UseBasicParsing
}

# 停旧进程
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host '[1/2] 启动联机服务 :3000' -ForegroundColor Cyan
Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory (Join-Path $root 'server') -WindowStyle Hidden
Start-Sleep -Seconds 1
try {
    $h = Invoke-WebRequest 'http://127.0.0.1:3000/health' -UseBasicParsing -TimeoutSec 5
    Write-Host "  health: $($h.Content)" -ForegroundColor Green
} catch {
    Write-Host '  health 失败，请检查端口 3000' -ForegroundColor Red
}

Write-Host '[2/2] 启动公网隧道' -ForegroundColor Cyan
$urlFile = Join-Path $env:TEMP 'cf-tunnel-url.txt'
Remove-Item $urlFile -ErrorAction SilentlyContinue
Start-Process -FilePath $node -ArgumentList (Join-Path $root 'scripts\start-tunnel.js') -WorkingDirectory $root -WindowStyle Hidden

for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $urlFile) { break }
}

if (Test-Path $urlFile) {
    $tunnel = (Get-Content $urlFile).Trim()
    $ws = 'wss://' + ($tunnel -replace '^https://','')
    Write-Host ''
    Write-Host '公网地址（手机可连）:' -ForegroundColor Green
    Write-Host "  WebSocket: $ws"
    Write-Host "  HTTP:      $tunnel"
    Write-Host "  健康检查:  $tunnel/health"
    Write-Host ''

    # 自动写回客户端配置
    $html = Join-Path $root 'app\index.html'
    $js = Join-Path $root 'app\js\online-multiplayer.js'
    $txt = Get-Content $html -Raw
    $txt = $txt -replace "window\.REALTIME_SERVER_URL = '[^']+'", "window.REALTIME_SERVER_URL = '$ws'"
    $txt = $txt -replace "window\.REALTIME_HTTP_URL = '[^']+'", "window.REALTIME_HTTP_URL = '$tunnel'"
    Set-Content -Path $html -Value $txt -Encoding UTF8
    $txt2 = Get-Content $js -Raw
    $txt2 = $txt2 -replace "wss://[a-z0-9-]+\.trycloudflare\.com", $ws
    $txt2 = $txt2 -replace "https://[a-z0-9-]+\.trycloudflare\.com/rooms", "$tunnel/rooms"
    Set-Content -Path $js -Value $txt2 -Encoding UTF8
    Write-Host '已自动更新 app/index.html 与 online-multiplayer.js 中的服务器地址。' -ForegroundColor Green
    Write-Host '请重新打 APK 后安装到手机。' -ForegroundColor Yellow
} else {
    Write-Host '隧道启动超时，请查看 scripts/start-tunnel.js 输出' -ForegroundColor Red
}
