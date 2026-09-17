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
    Write-Host ''
    Write-Host '公网地址（手机可连）:' -ForegroundColor Green
    Write-Host "  WebSocket: wss://$($tunnel -replace '^https://','')"
    Write-Host "  HTTP:      $tunnel"
    Write-Host "  健康检查:  $tunnel/health"
    Write-Host ''
    Write-Host '把上面地址填进 app/index.html 的 REALTIME_SERVER_URL 后重打 APK。' -ForegroundColor Yellow
} else {
    Write-Host '隧道启动超时，请查看 scripts/start-tunnel.js 输出' -ForegroundColor Red
}
