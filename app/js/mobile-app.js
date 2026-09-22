/**
 * 移动端应用 v1.7.12
 */
(function() {
    var APP_VERSION = "1.7.14";
    var DOWNLOAD_CONFIG = {
        primaryDomain: 'https://onlyforus.online',
        fallbackDomain: 'https://raw.githubusercontent.com/zyf-coder/Childhood-Games/main',
        apkPath: '/Childhood-Games.apk'
    };
    var GAMES = [
        { name: '超级玛丽', file: 'Super Mario Bros. (JU) (PRG0) [!].nes', icon: '🍄' },
        { name: '魂斗罗', file: 'hun.nes', icon: '🔫' },
        { name: '忍者龙剑传', file: 'Kage.nes', icon: '🥷' },
        { name: '赤色要塞', file: 'emc.nes', icon: '🚗' },
        { name: '双截龙2', file: 'Double Dragon2.nes', icon: '👊' },
        { name: '沙罗曼蛇', file: 'Life Force [!].nes', icon: '🚀' },
        { name: '坦克大战', file: 'tanke.nes', icon: '🎖️' },
        { name: '冒险岛', file: 'maoxiandao.nes', icon: '🏝️' },
        { name: '忍者蛙', file: 'xueren.nes', icon: '🐸' },
        { name: '忍者神龟', file: 'sg1.nes', icon: '🐢' },
        { name: '忍者神龟格斗', file: 'sg4.nes', icon: '🐢' },
        { name: '淘金者', file: 'lkr.nes', icon: '💎' },
        { name: '雪人兄弟', file: 'ppl2.nes', icon: '⛄' },
        { name: '炸弹人', file: 'zhadan.nes', icon: '💣' },
        { name: '越野摩托', file: 'Motor.nes', icon: '🏍️' },
        { name: '功夫', file: '(J) (V1.2) Yie Ar Kung-Fu [!].nes', icon: '🥋' },
        { name: '中国象棋', file: 'Zhong Guo Xiang Qi.nes', icon: '♟️' },
        { name: '西游记', file: 'xyj1.nes', icon: '🐒' },
        { name: '马戏团', file: 'ma.nes', icon: '🎪' },
        { name: '忍者蛙与双截龙', file: 'rjbq.nes', icon: '🐉' },
        { name: '洛克人', file: '3.nes', icon: '🤖' },
        { name: '火线冲突', file: 'Cross Fire (J).nes', icon: '💥' },
        { name: '淘金者锦标赛', file: 'Championship Lode Runner (J).nes', icon: '⛏️' },
        { name: '沙罗曼蛇U', file: 'Lifeforce (U).nes', icon: '☄️' },
        { name: '机器人快跑', file: 'roborun.nes', icon: '🦾' },
        { name: '坠落方块', file: 'falling.nes', icon: '🧱' },
        { name: '波形实验室', file: 'Waveforms.nes', icon: '🎵' },
        { name: '植物大战僵尸', file: 'web:pvz.html', icon: '🌻', web: true }
    ];

    var nes = null;
    var currentGame = null;
    var isPaused = false;
    var mainBgm = null;
    var onlineMultiplayer = null;
    var gameHeaderTimer = null;
    var onlinePlayerId = null;
    var onlineRoomId = null;
    var voiceStream = null;
    var voicePeer = null;
    var pendingVoiceCandidates = [];
    var roomListRefreshTimer = null;
    var roomListRefreshPending = false;
    var remoteAudioMuted = false;
    var inputFlushTimer = null;
    var pendingNetInputs = [];
    var lastNetInput = {};
    var layoutRaf = 0;
    var playMode = 'solo'; // solo | online
    var onlineReady = false;

    function getDeviceId() {
        var id = localStorage.getItem('device-id');
        if (!id) {
            id = 'dev-' + Math.random().toString(36).substr(2, 12);
            localStorage.setItem('device-id', id);
        }
        return id;
    }
    var DEVICE_ID = getDeviceId();

    function showMessage(text, type) {
        type = type || 'info';
        var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        var msg = document.createElement('div');
        msg.className = 'el-message el-message--' + type;
        msg.innerHTML = '<span class="el-message-icon">' + icons[type] + '</span><span>' + text + '</span>';
        document.body.appendChild(msg);
        setTimeout(function() { msg.remove(); }, 2500);
    }

    document.addEventListener('DOMContentLoaded', function() {
        initDesktopControls();
        initGameGrid();
        initEvents();
        initDpad();
        initOnline();
        initBgm();
        initScreenLayout();
    });

    function initDesktopControls() {
        if (!/Electron/i.test(navigator.userAgent)) return;
        document.documentElement.classList.add('desktop-app');
        var keyMap = {
            w: 'KEY_UP', s: 'KEY_DOWN', a: 'KEY_LEFT', d: 'KEY_RIGHT',
            j: 'KEY_A', k: 'KEY_B',
            u: 'KEY_SELECT', i: 'KEY_START'
        };
        function handleKey(event, value) {
            if (!document.getElementById('gamePage').classList.contains('active')) return;
            if (event.target && /input|textarea|select/i.test(event.target.tagName)) return;
            var keyName = keyMap[String(event.key || '').toLowerCase()];
            if (!keyName) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            setGameInput(keyName, value);
        }
        window.addEventListener('keydown', function(event) { handleKey(event, 0x41); }, true);
        window.addEventListener('keyup', function(event) { handleKey(event, 0x40); }, true);
        window.addEventListener('blur', function() {
            Object.keys(keyMap).forEach(function(key) { setGameInput(keyMap[key], 0x40); });
        });
    }

    function initGameGrid() {
        var grid = document.getElementById('gameGrid');
        if (!grid) return;
        GAMES.forEach(function(game) {
            var card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = '<div class="game-icon">' + game.icon + '</div><div class="game-name">' + game.name + '</div>';
            card.onclick = function() { showModeDialog(game); };
            grid.appendChild(card);
        });
    }

    function showModeDialog(game) {
        var old = document.getElementById('modeDialog');
        if (old) old.remove();
        var overlay = document.createElement('div');
        overlay.id = 'modeDialog';
        overlay.className = 'dialog-overlay visible';
        overlay.innerHTML =
            '<div class="dialog-box">' +
            '<div class="dialog-title">' + game.icon + ' ' + game.name + '</div>' +
            '<p style="text-align:center;color:var(--text-secondary);font-size:13px;margin-bottom:16px;">选择游玩方式</p>' +
            '<button class="menu-btn" id="modeSoloBtn" style="background:#059669;color:#fff;">单机游玩</button>' +
            '<button class="menu-btn" id="modeOnlineBtn">联机对战</button>' +
            '<div class="dialog-actions" style="margin-top:12px;"><button class="dialog-btn dialog-btn-cancel" id="modeCancelBtn">取消</button></div>' +
            '</div>';
        document.body.appendChild(overlay);
        document.getElementById('modeCancelBtn').onclick = function() { overlay.remove(); };
        document.getElementById('modeSoloBtn').onclick = function() {
            overlay.remove();
            playMode = 'solo';
            startGame(game, 'solo');
        };
        document.getElementById('modeOnlineBtn').onclick = function() {
            if (game.web) { showMessage('该游戏仅支持单机', 'warning'); return; }
            overlay.remove();
            playMode = 'online';
            if (!localStorage.getItem('playerNickname')) {
                showNickname();
                return;
            }
            showPage('onlineLobbyPage');
            ensureOnline().then(function() {
                updateLobbyConnStatus(true);
                refreshRooms();
            }).catch(function() {
                updateLobbyConnStatus(false);
                showMessage('联机服务器连接失败', 'error');
            });
        };
    }

    function initEvents() {
        bind('backBtn', goBack);
        bind('pauseBtn', togglePause);
        bind('soundBtn', toggleSound);
        bind('resumeBtn', resumeGame);
        bind('restartBtn', restartGame);
        bind('exitBtn', goBack);

        bind('confirmNicknameBtn', confirmNickname);
        bind('nicknameCancelBtn', function() { hide('nicknameDialog'); });
        bind('lobbyBackBtn', function() { showPage('gameSelectPage'); });
        bind('createRoomBtn', createRoom);
        bind('joinRoomBtn', joinRoom);
        bind('refreshRoomListBtn', refreshRooms);
        bind('roomBackBtn', leaveRoom);
        bind('roomCopyBtn', copyRoomId);
        bind('startGameBtn', startOnlineGame);
        bind('chatSendBtn', sendChat);
        bind('voiceChatBtn', toggleVoiceChat);
        bind('gameVoiceBtn', toggleVoiceChat);
        bind('gameMicBtn', toggleVoiceChat);
        bind('gameSpkBtn', toggleSpeaker);
        bind('changeNicknameBtn', showNickname);
        bind('aboutBtn', showAbout);

        var gamePage = document.getElementById('gamePage');
        if (gamePage) {
            gamePage.addEventListener('pointerdown', function(e) {
                if (e.clientY <= 80) showGameHeader();
            }, true);
        }

        document.querySelectorAll('.tab-item').forEach(function(tab) {
            tab.onclick = function() {
                var page = this.dataset.page;
                if (page === 'onlineLobbyPage' && !localStorage.getItem('playerNickname')) {
                    showNickname();
                    return;
                }
                showPage(page);
            };
        });

        document.querySelectorAll('.online-tab').forEach(function(tab) {
            tab.onclick = function() {
                document.querySelectorAll('.online-tab').forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.online-panel').forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                var id = this.dataset.tab === 'roomList' ? 'roomListPanel' :
                          this.dataset.tab === 'createRoom' ? 'createRoomPanel' : 'joinRoomPanel';
                document.getElementById(id).classList.add('active');
                if (this.dataset.tab === 'roomList') refreshRooms();
            };
        });

        var chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.onkeydown = function(e) { if (e.key === 'Enter') sendChat(); };

        window.addEventListener('resize', scheduleScreenLayout);
        window.addEventListener('orientationchange', scheduleScreenLayout);
    }

    function bind(id, fn) {
        var el = document.getElementById(id);
        if (el) el.onclick = fn;
    }

    function initDpad() {
        var keys = {
            'dpadUp': 'KEY_UP', 'dpadDown': 'KEY_DOWN',
            'dpadLeft': 'KEY_LEFT', 'dpadRight': 'KEY_RIGHT',
            'btnA': 'KEY_A', 'btnB': 'KEY_B',
            'btnSelect': 'KEY_SELECT', 'btnStart': 'KEY_START'
        };

        Object.keys(keys).forEach(function(id) {
            var btn = document.getElementById(id);
            if (!btn) return;
            var key = keys[id];
            var pressed = false;
            var touchId = null;

            function down(e, idOrNull) {
                if (pressed) return;
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                pressed = true;
                touchId = idOrNull;
                setGameInput(key, 0x41);
                btn.classList.add('is-press');
                if (navigator.vibrate) navigator.vibrate(8);
            }
            function up(e) {
                if (!pressed) return;
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                pressed = false;
                touchId = null;
                setGameInput(key, 0x40);
                btn.classList.remove('is-press');
            }

            btn.addEventListener('touchstart', function(e) {
                var t = e.changedTouches[0];
                down(e, t && t.identifier);
            }, { passive: false });
            btn.addEventListener('touchend', function(e) {
                if (touchId !== null) {
                    for (var i = 0; i < e.changedTouches.length; i++) {
                        if (e.changedTouches[i].identifier === touchId) { up(e); return; }
                    }
                    return;
                }
                up(e);
            }, { passive: false });
            btn.addEventListener('touchcancel', up, { passive: false });
            btn.addEventListener('mousedown', function(e) { if (e.button === 0) down(e, null); });
            btn.addEventListener('mouseup', up);
            btn.addEventListener('mouseleave', up);
            btn.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        });
    }

    function applyLocalInput(key, value) {
        if (!nes || !nes.keyboard) return;
        var state = (onlineRoomId && onlinePlayerId === 2) ? nes.keyboard.state2 : nes.keyboard.state1;
        if (Object.prototype.hasOwnProperty.call(nes.keyboard.keys, key)) {
            state[nes.keyboard.keys[key]] = value;
        }
    }

    function setGameInput(key, value) {
        applyLocalInput(key, value);
        // 单机模式：绝不发网络
        if (playMode !== 'online' || !onlineRoomId || !onlineMultiplayer) return;
        if (lastNetInput[key] === value) return;
        lastNetInput[key] = value;
        pendingNetInputs.push({ key: key, value: value });
        if (inputFlushTimer) return;
        inputFlushTimer = setTimeout(flushNetInputs, 0);
    }

    function flushNetInputs() {
        inputFlushTimer = null;
        if (!pendingNetInputs.length || !onlineMultiplayer) return;
        onlineMultiplayer.sendInput({ keys: pendingNetInputs.slice() });
        pendingNetInputs = [];
    }

    function initScreenLayout() {
        scheduleScreenLayout();
    }

    function scheduleScreenLayout() {
        if (layoutRaf) cancelAnimationFrame(layoutRaf);
        layoutRaf = requestAnimationFrame(layoutGameScreen);
    }

    function layoutGameScreen() {
        layoutRaf = 0;
        var page = document.getElementById('gamePage');
        var canvas = document.querySelector('#emulator canvas');
        if (!page || !canvas || !page.classList.contains('active')) return;
        if (document.documentElement.classList.contains('desktop-app')) {
            canvas.style.width = '';
            canvas.style.height = '';
            return;
        }

        var styles = getComputedStyle(page);
        var leftSpace = parseFloat(styles.getPropertyValue('--left-control-space')) || 0;
        var rightSpace = parseFloat(styles.getPropertyValue('--right-control-space')) || 0;
        var bottomSpace = 0;
        if (window.innerHeight > window.innerWidth) bottomSpace = 200;
        var availW = Math.max(160, window.innerWidth - leftSpace - rightSpace - 12);
        var availH = Math.max(160, window.innerHeight - bottomSpace - 12);
        var scale = Math.min(availW / 256, availH / 240);
        if (scale > 1) scale = Math.floor(scale);
        if (scale < 1) scale = Math.max(scale, 0.5);
        canvas.style.width = Math.floor(256 * scale) + 'px';
        canvas.style.height = Math.floor(240 * scale) + 'px';
    }

    function initBgm() {
        mainBgm = document.getElementById('mainBgm');
        if (mainBgm) {
            mainBgm.volume = 0.3;
            mainBgm.play().catch(function() {});
        }
    }

    function initOnline() {
        // 单机启动时不连任何服务器；进入「联机」流程再连
        onlineReady = false;
    }

    function ensureOnline() {
        if (onlineReady && onlineMultiplayer) return Promise.resolve();
        if (!onlineReady) {
            if (typeof OnlineMultiplayer === 'undefined') {
                return Promise.reject(new Error('联机模块未就绪'));
            }
            onlineMultiplayer = new OnlineMultiplayer();
            onlineMultiplayer.onConnectionChange = function(online) {
                console.log('[online] status', online ? 'online' : 'offline');
                updateLobbyConnStatus(online);
                if (online && document.getElementById('onlineLobbyPage').classList.contains('active')) {
                    refreshRooms(true);
                }
            };
            onlineMultiplayer.onRoomCreated = function(id) {
                onlineRoomId = id;
                onlinePlayerId = 1;
                showRoom(id, true);
            };
            onlineMultiplayer.onRoomJoined = function(d) {
                onlineRoomId = d.roomId;
                onlinePlayerId = d.playerId;
                showRoom(d.roomId, false, d.hostName);
            };
            onlineMultiplayer.onPlayerJoined = function(d) {
                document.getElementById('roomPlayer2').textContent = d.playerName || '玩家2';
                var btn = document.getElementById('startGameBtn');
                if (btn) { btn.disabled = false; btn.textContent = '开始游戏'; }
                addChat('系统', d.playerName + ' 加入了房间');
            };
            onlineMultiplayer.onPlayerLeft = function(d) {
                var departedPlayerId = d && d.playerId;
                if (departedPlayerId === 1 && onlinePlayerId === 2) {
                    stopVoiceChat(false);
                    try { onlineMultiplayer.leaveRoom(); } catch (e) {}
                    onlineRoomId = null;
                    onlinePlayerId = null;
                    showMessage('房主已退出，房间已销毁', 'warning');
                    showPage('onlineLobbyPage');
                    return;
                }
                addChat('系统', '对手已离开房间');
                document.getElementById('roomPlayer2').textContent = '等待中...';
                var btn = document.getElementById('startGameBtn');
                if (btn) { btn.disabled = true; btn.textContent = '等待对手加入...'; }
            };
            onlineMultiplayer.onChatMessage = function(d) { addChat(d.playerName, d.message); };
            onlineMultiplayer.onPlayerInput = function(input, playerId) {
                if (!nes || !nes.keyboard || !input) return;
                var state = playerId === 2 ? nes.keyboard.state2 : nes.keyboard.state1;
                var keys = nes.keyboard.keys;
                if (input.keys && input.keys.length) {
                    input.keys.forEach(function(item) {
                        if (item && Object.prototype.hasOwnProperty.call(keys, item.key)) {
                            state[keys[item.key]] = item.value;
                        }
                    });
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(keys, input.key)) {
                    state[keys[input.key]] = input.value;
                }
            };
            onlineMultiplayer.onGameStart = function(d) {
                var game = GAMES.find(function(g) { return g.name === d.game; });
                if (game) startGame(game, 'online');
            };
            onlineMultiplayer.onVoiceSignal = handleVoiceSignal;
            onlineMultiplayer.onError = function(m) { showMessage(m, 'error'); };

            var sel = document.getElementById('gameSelectOnline');
            if (sel && !sel.options.length) {
                sel.innerHTML = '<option value="">请选择游戏</option>';
                GAMES.forEach(function(g) {
                    if (g.web) return;
                    var opt = document.createElement('option');
                    opt.value = g.name;
                    opt.textContent = g.name;
                    sel.appendChild(opt);
                });
            }
            onlineReady = true;
        }
        return onlineMultiplayer.ensureConnected();
    }

    function showPage(id) {
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        document.getElementById(id).classList.add('active');
        document.querySelectorAll('.tab-item').forEach(function(t) {
            t.classList.toggle('active', t.dataset.page === id);
        });
        var tabs = document.getElementById('bottomTabs');
        if (tabs) tabs.style.display = (id === 'gamePage' || id === 'roomPage') ? 'none' : 'flex';

        if (roomListRefreshTimer) {
            clearInterval(roomListRefreshTimer);
            roomListRefreshTimer = null;
        }
        if (id === 'onlineLobbyPage') {
            updateLobbyConnStatus(onlineMultiplayer && onlineMultiplayer.isConnected);
            ensureOnline().then(function() {
                updateLobbyConnStatus(true);
                if (isRoomListVisible()) refreshRooms();
            }).catch(function() {
                updateLobbyConnStatus(false);
                if (isRoomListVisible()) refreshRooms();
            });
            roomListRefreshTimer = setInterval(function() {
                if (isRoomListVisible()) refreshRooms(true);
            }, 3000);
            var nick = document.getElementById('lobbyNickname');
            if (nick) nick.textContent = localStorage.getItem('playerNickname') || '';
        }
        if (id === 'profilePage') {
            var pnick = document.getElementById('profileNickname');
            if (pnick) pnick.textContent = localStorage.getItem('playerNickname') || '未设置';
        }
    }

    function startGame(game, mode) {
        playMode = mode === 'online' ? 'online' : 'solo';
        currentGame = game;
        if (mainBgm) mainBgm.pause();

        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        document.getElementById('gamePage').classList.add('active');
        var escHint = document.getElementById('escHint');
        if (escHint) escHint.style.display = 'block';
        document.getElementById('gameTitle').textContent = game.name + (playMode === 'online' ? ' · 联机' : ' · 单机');
        document.getElementById('bottomTabs').style.display = 'none';
        var micBtn = document.getElementById('gameMicBtn');
        if (micBtn) micBtn.style.display = (playMode === 'online' && !game.web) ? '' : 'none';
        var spkBtn = document.getElementById('gameSpkBtn');
        if (spkBtn) spkBtn.style.display = (playMode === 'online' && !game.web) ? '' : 'none';
        // 网页游戏隐藏虚拟手柄
        var dpad = document.getElementById('dpadArea');
        var right = document.querySelector('.right-controls');
        var hidePad = !!game.web;
        if (dpad) dpad.style.display = hidePad ? 'none' : '';
        if (right) right.style.display = hidePad ? 'none' : '';

        setGameOrientation('landscape');
        showGameHeader();
        lastNetInput = {};
        pendingNetInputs = [];

        setTimeout(function() {
            if (game.web) {
                loadWebGame(game.file.replace(/^web:/, ''));
            } else {
                loadROM(game.file);
            }
            scheduleScreenLayout();
        }, 150);
    }

    function loadWebGame(page) {
        var emulator = document.getElementById('emulator');
        emulator.innerHTML = '';
        var frame = document.createElement('iframe');
        frame.id = 'webGameFrame';
        frame.src = 'games/' + page;
        frame.style.cssText = 'width:100%;height:100%;border:0;background:#000;display:block';
        emulator.appendChild(frame);
        window.addEventListener('message', function onMsg(e) {
            if (e.data && e.data.type === 'pvz-exit') {
                window.removeEventListener('message', onMsg);
                goBack();
            }
        });
    }

    function loadROM(file) {
        try {
            var emulator = document.getElementById('emulator');
            emulator.innerHTML = '<canvas width="256" height="240"></canvas>';
            var canvas = emulator.querySelector('canvas');
            var ctx = canvas.getContext('2d', { alpha: false });

            var canvasImageData = ctx.createImageData(256, 240);
            var data = canvasImageData.data;
            for (var i = 0; i < data.length; i += 4) {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = 0xFF;
            }
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 256, 240);

            var audioContext = null;
            var nextAudioTime = 0;
            try {
                var AudioCtor = window.AudioContext || window.webkitAudioContext;
                audioContext = AudioCtor ? new AudioCtor() : null;
                if (audioContext && audioContext.state === 'suspended') audioContext.resume();
            } catch (audioError) { console.warn('音频初始化失败:', audioError); }

            var GameUI = function(nesInstance) {
                this.nes = nesInstance;
                this.canvasImageData = canvasImageData;
                this.ctx = ctx;

                this.writeFrame = function(buffer, prevBuffer) {
                    var imageData = this.canvasImageData.data;
                    var pixel, i, j;
                    for (i = 0; i < 256 * 240; i++) {
                        pixel = buffer[i];
                        if (pixel !== prevBuffer[i]) {
                            j = i * 4;
                            imageData[j] = pixel & 0xFF;
                            imageData[j + 1] = (pixel >> 8) & 0xFF;
                            imageData[j + 2] = (pixel >> 16) & 0xFF;
                            prevBuffer[i] = pixel;
                        }
                    }
                    this.ctx.putImageData(this.canvasImageData, 0, 0);
                };

                this.writeAudio = function(samples) {
                    if (!audioContext || !samples || !samples.length) return;
                    var frameCount = Math.floor(samples.length / 2);
                    if (frameCount <= 0) return;
                    var buffer = audioContext.createBuffer(2, frameCount, audioContext.sampleRate);
                    var left = buffer.getChannelData(0), right = buffer.getChannelData(1);
                    for (var n = 0, j = 0; n < samples.length; n += 2, j++) {
                        left[j] = Math.max(-1, Math.min(1, samples[n] / 32768));
                        right[j] = Math.max(-1, Math.min(1, samples[n + 1] / 32768));
                    }
                    var source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    nextAudioTime = Math.max(audioContext.currentTime, nextAudioTime);
                    source.start(nextAudioTime);
                    nextAudioTime += buffer.duration;
                    if (nextAudioTime - audioContext.currentTime > 0.08) {
                        nextAudioTime = audioContext.currentTime;
                    }
                };
                this.updateStatus = function(s) { console.log('NES:', s); };
                this.enable = function() {};
            };

            nes = new JSNES({
                ui: GameUI,
                emulateSound: true,
                sampleRate: audioContext ? audioContext.sampleRate : 44100
            });

            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'roms/' + file, true);
            xhr.overrideMimeType('text/plain; charset=x-user-defined');
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        nes.loadRom(xhr.responseText);
                        nes.start();
                        scheduleScreenLayout();
                    } catch(e) {
                        console.error('ROM加载失败:', e);
                    }
                }
            };
            xhr.onerror = function() {};
            xhr.send();
        } catch(e) {
            console.error('初始化失败:', e);
        }
    }

    function setGameOrientation(orientation) {
        if (window.NativeOrientation) {
            window.NativeOrientation.set(orientation);
            return;
        }
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock(orientation).catch(function() {});
            }
        } catch(e) {}
    }

    function goBack() {
        clearTimeout(gameHeaderTimer);
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes) { try { nes.stop(); } catch(e) {} nes = null; }
        currentGame = null;
        isPaused = false;
        lastNetInput = {};
        pendingNetInputs = [];
        if (mainBgm) mainBgm.play().catch(function() {});

        setGameOrientation('portrait');
        showPage(onlineRoomId ? 'roomPage' : 'gameSelectPage');
        var escHint = document.getElementById('escHint');
        if (escHint) escHint.style.display = 'none';
    }

    function isRoomListVisible() {
        var lobby = document.getElementById('onlineLobbyPage');
        var panel = document.getElementById('roomListPanel');
        return !!(lobby && lobby.classList.contains('active') && panel && panel.classList.contains('active'));
    }

    function showGameHeader() {
        var header = document.getElementById('gameHeader');
        if (!header) return;
        header.classList.add('visible');
        clearTimeout(gameHeaderTimer);
        gameHeaderTimer = setTimeout(function() {
            header.classList.remove('visible');
        }, 1500);
    }

    function togglePause() {
        if (!nes) return;
        if (isPaused) {
            nes.start();
            isPaused = false;
            document.getElementById('pauseOverlay').classList.remove('visible');
        } else {
            nes.stop();
            isPaused = true;
            document.getElementById('pauseOverlay').classList.add('visible');
        }
    }

    function resumeGame() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes) { nes.start(); isPaused = false; }
    }

    function restartGame() {
        document.getElementById('pauseOverlay').classList.remove('visible');
        if (nes && currentGame) {
            try { nes.reloadRom(); nes.start(); } catch(e) { loadROM(currentGame.file); }
            isPaused = false;
        }
    }

    function toggleSound() {
        if (!nes) return;
        nes.opts.emulateSound = !nes.opts.emulateSound;
        showMessage(nes.opts.emulateSound ? '声音已开启' : '声音已关闭', 'info');
    }

    function showNickname() {
        document.getElementById('nicknameInput').value = localStorage.getItem('playerNickname') || '';
        show('nicknameDialog');
    }

    function confirmNickname() {
        var name = document.getElementById('nicknameInput').value.trim();
        if (!name) { showMessage('请输入昵称', 'warning'); return; }
        if (name.length < 2) { showMessage('昵称至少2个字符', 'warning'); return; }
        localStorage.setItem('playerNickname', name);
        if (onlineMultiplayer) onlineMultiplayer.playerName = name;
        hide('nicknameDialog');
        showMessage('昵称设置成功', 'success');
        showPage('onlineLobbyPage');
    }

    function createRoom() {
        var button = document.getElementById('createRoomBtn');
        if (button && button.disabled) return;
        var game = document.getElementById('gameSelectOnline').value;
        var name = localStorage.getItem('playerNickname');
        if (!game) { showMessage('请选择游戏', 'warning'); return; }
        if (!name) { showNickname(); return; }

        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = '创建中...';
        }

        function restore() {
            if (!button) return;
            button.disabled = false;
            button.textContent = button.dataset.originalText || '创建房间';
        }

        ensureOnline().then(function() {
            updateLobbyConnStatus(true);
            var ok = onlineMultiplayer.createRoom(game, name);
            if (!ok) {
                showMessage('创建失败，请重试', 'error');
                restore();
            } else {
                setTimeout(restore, 800);
            }
        }).catch(function() {
            updateLobbyConnStatus(false);
            showMessage('实时服务器连接失败，请检查网络后重试', 'error');
            restore();
        });
    }

    function joinRoom() {
        var id = document.getElementById('roomIdInput').value.toUpperCase();
        var name = localStorage.getItem('playerNickname');
        if (!id || id.length !== 6) { showMessage('请输入6位房间号', 'warning'); return; }
        if (!name) { showNickname(); return; }
        ensureOnline().then(function() {
            updateLobbyConnStatus(true);
            var ok = onlineMultiplayer.joinRoom(id, name);
            if (!ok) showMessage('加入失败，请重试', 'error');
        }).catch(function() {
            updateLobbyConnStatus(false);
            showMessage('实时服务器连接失败，请检查网络后重试', 'error');
        });
    }

    function updateLobbyConnStatus(online) {
        var el = document.getElementById('lobbyConnStatus');
        if (!el) return;
        el.classList.remove('online', 'offline');
        if (online === true) {
            el.textContent = '已连接';
            el.classList.add('online');
        } else if (online === false) {
            el.textContent = '服务器断开';
            el.classList.add('offline');
        } else {
            el.textContent = '连接中…';
        }
    }

    async function refreshRooms(silent) {
        var list = document.getElementById('roomList');
        if (!list || roomListRefreshPending || !onlineMultiplayer) return;
        roomListRefreshPending = true;
        if (!silent) list.innerHTML = '<div class="room-list-empty">加载中...</div>';

        try {
            await ensureOnline();
            updateLobbyConnStatus(true);
            var rooms = await onlineMultiplayer.getRoomList();
            if (!rooms || !rooms.length) {
                list.innerHTML = '<div class="room-list-empty">暂无房间，快去创建吧</div>';
                return;
            }
            list.innerHTML = rooms.map(function(r) {
                return '<div class="room-item"><div class="room-item-info"><div class="room-item-game">' + r.game + '</div><div class="room-item-id">房间号: ' + r.id + '</div><div class="room-item-host">' + (r.player1 || '') + '</div></div><button class="room-item-join" onclick="window._join(\'' + r.id + '\')">加入</button></div>';
            }).join('');
        } catch(e) {
            updateLobbyConnStatus(false);
            list.innerHTML = '<div class="room-list-empty">服务器未连接<br><span style="font-size:12px;color:#94a3b8">请检查服务器是否已启动，或稍后点「刷新列表」</span></div>';
            if (!silent) showMessage('实时服务器连接失败', 'error');
        } finally {
            roomListRefreshPending = false;
        }
    }

    window._join = async function(id) {
        var name = localStorage.getItem('playerNickname');
        if (!name) { showNickname(); return; }
        ensureOnline().then(function() {
            onlineMultiplayer.joinRoom(id, name);
        }).catch(function() {
            showMessage('实时服务器连接失败', 'error');
        });
    };

    function showRoom(id, isHost, hostName) {
        document.getElementById('roomIdDisplay').textContent = id;
        document.getElementById('roomPlayer1').textContent = isHost ?
            (localStorage.getItem('playerNickname') || '玩家1') : (hostName || '房主');
        document.getElementById('roomPlayer2').textContent = isHost ? '等待中...' :
            (localStorage.getItem('playerNickname') || '玩家2');
        var btn = document.getElementById('startGameBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = isHost ? '等待对手加入...' : '等待房主开始...';
        }
        showPage('roomPage');
        document.getElementById('chatMessages').innerHTML = '<div class="chat-system">欢迎来到房间</div>';
    }

    function copyRoomId() {
        var id = document.getElementById('roomIdDisplay').textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(id).then(function() { showMessage('已复制', 'success'); });
        } else {
            showMessage('房间号: ' + id, 'info');
        }
    }

    function sendChat() {
        var input = document.getElementById('chatInput');
        var msg = input.value.trim();
        if (!msg || !onlineMultiplayer) return;
        onlineMultiplayer.sendChatMessage(msg);
        addChat(localStorage.getItem('playerNickname'), msg);
        input.value = '';
    }

    function addChat(name, msg) {
        var c = document.getElementById('chatMessages');
        var d = document.createElement('div');
        d.className = 'chat-message';
        var nameEl = document.createElement('div');
        var textEl = document.createElement('div');
        nameEl.className = 'chat-message-name';
        textEl.className = 'chat-message-text';
        nameEl.textContent = name || '玩家';
        textEl.textContent = msg || '';
        d.appendChild(nameEl);
        d.appendChild(textEl);
        c.appendChild(d);
        c.scrollTop = c.scrollHeight;
    }

    function startOnlineGame() {
        if (onlinePlayerId !== 1) return;
        var game = document.getElementById('gameSelectOnline').value || '超级玛丽';
        var g = GAMES.find(function(x) { return x.name === game; });
        if (g && g.web) { showMessage('该游戏仅支持单机', 'warning'); return; }
        if (g) {
            onlineMultiplayer.sendGameStart(g.name);
            startGame(g, 'online');
        }
    }

    function leaveRoom() {
        stopVoiceChat();
        try {
            if (onlineMultiplayer) onlineMultiplayer.leaveRoom();
        } catch (e) {
            console.warn('离开房间清理失败:', e);
        }
        onlineRoomId = null;
        onlinePlayerId = null;
        showPage('onlineLobbyPage');
    }

    async function toggleVoiceChat() {
        if (playMode !== 'online') { showMessage('单机模式无需语音', 'info'); return; }
        if (!onlineRoomId) { showMessage('请先进入联机房间', 'warning'); return; }
        if (voiceStream) { stopVoiceChat(); return; }
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('当前环境不支持麦克风');
            }
            voiceStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            ensureVoicePeer();
            updateVoiceButtons(true);
            await onlineMultiplayer.sendVoiceSignal({ type: 'ready' });
            showMessage('麦克风已开启', 'success');
        } catch (e) {
            console.error('麦克风开启失败:', e);
            voiceStream = null;
            updateVoiceButtons(false);
            showMessage('无法使用麦克风，请检查权限（需 HTTPS）', 'error');
        }
    }

    function toggleSpeaker() {
        var audio = document.getElementById('remoteVoiceAudio');
        if (!audio) return;
        remoteAudioMuted = !remoteAudioMuted;
        audio.muted = remoteAudioMuted;
        var btn = document.getElementById('gameSpkBtn');
        if (btn) {
            btn.classList.toggle('muted', remoteAudioMuted);
            btn.title = remoteAudioMuted ? '开启扬声器' : '关闭扬声器';
        }
        showMessage(remoteAudioMuted ? '对方声音已静音' : '对方声音已开启', 'info');
        if (!remoteAudioMuted && audio.srcObject) {
            audio.play().catch(function() {});
        }
    }

    function ensureVoicePeer() {
        if (voicePeer) return voicePeer;
        voicePeer = new RTCPeerConnection({ iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ] });
        if (voiceStream) {
            voiceStream.getTracks().forEach(function(track) { voicePeer.addTrack(track, voiceStream); });
        }
        voicePeer.onicecandidate = function(e) {
            if (e.candidate) onlineMultiplayer.sendVoiceSignal({ type: 'candidate', candidate: e.candidate });
        };
        voicePeer.ontrack = function(e) {
            var audio = document.getElementById('remoteVoiceAudio');
            if (!audio) return;
            audio.srcObject = e.streams[0];
            audio.muted = remoteAudioMuted;
            audio.play().catch(function() {});
        };
        voicePeer.onconnectionstatechange = function() {
            if (voicePeer && voicePeer.connectionState === 'connected') {
                showMessage('语音通话已连接', 'success');
                var audio = document.getElementById('remoteVoiceAudio');
                if (audio && audio.srcObject) audio.play().catch(function() {});
            }
        };
        return voicePeer;
    }

    async function createVoiceOffer() {
        var peer = ensureVoicePeer();
        if (peer.signalingState !== 'stable') return;
        var offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await onlineMultiplayer.sendVoiceSignal({ type: 'offer', sdp: peer.localDescription });
    }

    async function handleVoiceSignal(signal) {
        if (!signal) return;
        try {
            if (signal.type === 'hangup') { stopVoiceChat(false); return; }
            if (signal.type === 'ready') {
                if (!voiceStream) return;
                if (onlinePlayerId === 1) await createVoiceOffer();
                else await onlineMultiplayer.sendVoiceSignal({ type: 'voice_ack' });
                return;
            }
            if (signal.type === 'voice_ack' && onlinePlayerId === 1 && voiceStream) {
                await createVoiceOffer();
                return;
            }
            var peer = ensureVoicePeer();
            if (signal.type === 'offer') {
                await peer.setRemoteDescription(signal.sdp);
                var answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                await onlineMultiplayer.sendVoiceSignal({ type: 'answer', sdp: peer.localDescription });
            } else if (signal.type === 'answer') {
                await peer.setRemoteDescription(signal.sdp);
            } else if (signal.type === 'candidate') {
                if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate);
                else pendingVoiceCandidates.push(signal.candidate);
            }
            if (peer.remoteDescription && pendingVoiceCandidates.length) {
                var candidates = pendingVoiceCandidates.splice(0);
                for (var i = 0; i < candidates.length; i++) {
                    await peer.addIceCandidate(candidates[i]);
                }
            }
        } catch (e) { console.error('语音连接失败:', e); }
    }

    function stopVoiceChat(notifyPeer) {
        if (notifyPeer !== false && onlineMultiplayer && onlineRoomId) {
            try { onlineMultiplayer.sendVoiceSignal({ type: 'hangup' }); } catch (e) {}
        }
        if (voicePeer) { voicePeer.close(); voicePeer = null; }
        if (voiceStream) voiceStream.getTracks().forEach(function(track) { track.stop(); });
        voiceStream = null;
        pendingVoiceCandidates = [];
        var audio = document.getElementById('remoteVoiceAudio');
        if (audio) audio.srcObject = null;
        updateVoiceButtons(false);
    }

    function updateVoiceButtons(enabled) {
        var roomButton = document.getElementById('voiceChatBtn');
        var gameButton = document.getElementById('gameVoiceBtn');
        var micButton = document.getElementById('gameMicBtn');
        if (roomButton) {
            roomButton.classList.toggle('active', enabled);
            var label = roomButton.querySelector('span');
            if (label) label.textContent = enabled ? '关闭语音' : '开启语音';
        }
        if (gameButton) gameButton.classList.toggle('active', enabled);
        if (micButton) {
            micButton.classList.toggle('active', enabled);
            micButton.title = enabled ? '关闭麦克风' : '开启麦克风';
        }
    }

    function showAbout() {
        var overlay = document.createElement('div');
        overlay.className = 'dialog-overlay visible';
        overlay.innerHTML = '<div class="dialog-box"><div class="dialog-title">关于我们</div><div style="text-align:center;padding:15px 0;"><p style="font-size:16px;font-weight:600;">经典怀旧游戏</p><p style="color:var(--text-secondary);margin-top:8px;">版本: v' + APP_VERSION + '</p><p style="color:var(--text-secondary);margin-top:4px;">FC/NES 经典游戏合集</p></div><div class="dialog-actions"><button class="dialog-btn dialog-btn-confirm" id="checkUpdateBtn">检查更新</button><button class="dialog-btn dialog-btn-cancel" onclick="this.closest(\'.dialog-overlay\').remove()">关闭</button></div></div>';
        document.body.appendChild(overlay);

        document.getElementById('checkUpdateBtn').onclick = function() {
            overlay.remove();
            checkUpdate();
        };
    }

    function checkUpdate() {
        showMessage('正在检查更新...', 'info');
        fetch('https://raw.githubusercontent.com/zyf-coder/Childhood-Games/main/app/version.json?t=' + Date.now())
            .then(function(r) { return r.json(); })
            .then(function(remote) {
                var local = APP_VERSION.split('.').map(Number);
                var rv = remote.version.split('.').map(Number);
                var hasUpdate = false;
                for (var i = 0; i < 3; i++) {
                    if (rv[i] > local[i]) { hasUpdate = true; break; }
                    if (rv[i] < local[i]) break;
                }
                if (hasUpdate) {
                    showMessage('发现新版本 v' + remote.version, 'warning');
                    setTimeout(function() {
                        if (confirm('发现新版本 v' + remote.version + '，是否下载？')) {
                            window.open(DOWNLOAD_CONFIG.fallbackDomain + DOWNLOAD_CONFIG.apkPath);
                        }
                    }, 500);
                } else {
                    showMessage('当前已是最新版本', 'success');
                }
            })
            .catch(function() { showMessage('检查更新失败', 'error'); });
    }

    function show(id) { document.getElementById(id).classList.add('visible'); }
    function hide(id) { document.getElementById(id).classList.remove('visible'); }
})();
