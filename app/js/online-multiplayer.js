/**
 * 联机功能模块（WebSocket）
 */
class OnlineMultiplayer {
    constructor() {
        this.ws = null;
        this.serverUrl = null;
        this.httpUrl = null;
        this.roomId = null;
        this.playerId = null;
        this.playerName = '';
        this.isConnected = false;
        this.onStateUpdate = null;
        this.onPlayerInput = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onChatMessage = null;
        this.onGameStart = null;
        this.onVoiceSignal = null;
        this.onError = null;
        this.onConnectionChange = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 8;
        this.reconnectTimer = null;
        this.connectTimer = null;
        this.shouldReconnect = true;
        this._notifiedOffline = false;
    }

    connect(serverUrl) {
        if (serverUrl) this.serverUrl = serverUrl;
        if (!this.serverUrl) {
            this.serverUrl = 'wss://ws.onlyforus.online';
        }
        this.httpUrl = this.wsToHttp(this.serverUrl);
        this.shouldReconnect = true;
        return this._open();
    }

    wsToHttp(wsUrl) {
        if (!wsUrl) return null;
        if (wsUrl.indexOf('wss://') === 0) return 'https://' + wsUrl.slice(6);
        if (wsUrl.indexOf('ws://') === 0) return 'http://' + wsUrl.slice(5);
        return wsUrl;
    }

    _cleanupSocket() {
        if (!this.ws) return;
        try {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
        } catch (e) {}
        this.ws = null;
    }

    _open() {
        return new Promise((resolve, reject) => {
            this._cleanupSocket();
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            if (this.connectTimer) {
                clearTimeout(this.connectTimer);
                this.connectTimer = null;
            }

            var settled = false;
            var self = this;

            try {
                this.ws = new WebSocket(this.serverUrl);
            } catch (e) {
                this.isConnected = false;
                this._notifyConnection(false);
                reject(e);
                return;
            }

            this.connectTimer = setTimeout(function() {
                if (settled) return;
                settled = true;
                self._cleanupSocket();
                self.isConnected = false;
                self._notifyConnection(false);
                var err = new Error('连接超时');
                self._scheduleReconnect();
                reject(err);
            }, 10000);

            this.ws.onopen = function() {
                if (self.connectTimer) {
                    clearTimeout(self.connectTimer);
                    self.connectTimer = null;
                }
                settled = true;
                self.isConnected = true;
                self.reconnectAttempts = 0;
                self._notifiedOffline = false;
                self._notifyConnection(true);
                console.log('[online] connected', self.serverUrl);
                resolve();
            };

            this.ws.onmessage = function(event) {
                try {
                    self.handleMessage(JSON.parse(event.data));
                } catch (e) {
                    console.warn('[online] bad message', e);
                }
            };

            this.ws.onerror = function() {
                // onclose 会随后触发，这里只记日志，避免重复弹窗
                console.warn('[online] ws error');
            };

            this.ws.onclose = function() {
                if (self.connectTimer) {
                    clearTimeout(self.connectTimer);
                    self.connectTimer = null;
                }
                self.isConnected = false;
                self._notifyConnection(false);
                console.log('[online] closed');
                if (!settled) {
                    settled = true;
                    var err = new Error('连接失败');
                    self._scheduleReconnect();
                    reject(err);
                    return;
                }
                self._scheduleReconnect();
            };
        });
    }

    _notifyConnection(online) {
        if (this.onConnectionChange) this.onConnectionChange(online);
    }

    _scheduleReconnect() {
        if (!this.shouldReconnect || !this.serverUrl) return;
        if (this.reconnectTimer) return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (!this._notifiedOffline) {
                this._notifiedOffline = true;
                if (this.onError) this.onError('实时服务器暂不可用，请稍后在房间页重试');
            }
            return;
        }
        this.reconnectAttempts++;
        var delay = Math.min(1000 * this.reconnectAttempts, 8000);
        var self = this;
        console.log('[online] reconnect', this.reconnectAttempts + '/' + this.maxReconnectAttempts, 'in', delay + 'ms');
        this.reconnectTimer = setTimeout(function() {
            self.reconnectTimer = null;
            self._open().catch(function() {});
        }, delay);
    }

    ensureConnected() {
        if (this.isConnected) return Promise.resolve();
        return this._open();
    }

    handleMessage(message) {
        if (!message || !message.type) return;
        switch (message.type) {
            case 'room_created':
                this.roomId = message.roomId;
                this.playerId = message.playerId;
                if (this.onRoomCreated) this.onRoomCreated(message.roomId);
                break;
            case 'room_joined':
                this.roomId = message.roomId;
                this.playerId = message.playerId;
                if (this.onRoomJoined) this.onRoomJoined(message);
                break;
            case 'player_joined':
                if (this.onPlayerJoined) this.onPlayerJoined(message);
                break;
            case 'player_left':
            case 'host_left':
                if (this.onPlayerLeft) this.onPlayerLeft(message);
                break;
            case 'chat':
                if (this.onChatMessage) this.onChatMessage(message);
                break;
            case 'game_start':
                if (this.onGameStart) this.onGameStart(message);
                break;
            case 'voice_signal':
                if (this.onVoiceSignal) this.onVoiceSignal(message.signal, message.fromPlayer);
                break;
            case 'game_state':
                if (this.onStateUpdate) this.onStateUpdate(message.state, message.fromPlayer);
                break;
            case 'player_input':
                if (this.onPlayerInput) this.onPlayerInput(message.input, message.fromPlayer);
                break;
            case 'pong':
                break;
            case 'error':
                if (this.onError) this.onError(message.message || '服务器错误');
                break;
        }
    }

    createRoom(gameName, playerName) {
        if (!this.isConnected) return false;
        this.playerName = playerName || this.playerName;
        this.send({
            type: 'create_room',
            game: gameName,
            playerName: this.playerName
        });
        return true;
    }

    joinRoom(roomId, playerName) {
        if (!this.isConnected) return false;
        this.playerName = playerName || this.playerName;
        this.send({
            type: 'join_room',
            roomId: roomId,
            playerName: this.playerName
        });
        return true;
    }

    sendGameState(state) {
        if (!this.isConnected) return;
        this.send({ type: 'game_state', state: state });
    }

    sendPlayerInput(input) {
        if (!this.isConnected) return;
        this.send({ type: 'player_input', input: input });
    }

    sendInput(input) { this.sendPlayerInput(input); }

    sendChatMessage(message) {
        if (this.isConnected) this.send({ type: 'chat', message: message });
    }

    sendGameStart(game) {
        if (this.isConnected) this.send({ type: 'game_start', game: game });
    }

    sendVoiceSignal(signal) {
        if (!this.isConnected) return Promise.resolve(false);
        this.send({ type: 'voice_signal', signal: signal });
        return Promise.resolve(true);
    }

    async getRoomList() {
        var url = window.REALTIME_HTTP_URL || (this.httpUrl ? this.httpUrl + '/rooms' : 'https://ws.onlyforus.online/rooms');
        try {
            var response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var data = await response.json();
            if (!Array.isArray(data)) throw new Error('bad payload');
            return data;
        } catch (e) {
            console.warn('[online] getRoomList failed', e);
            throw e;
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(data));
            } catch (e) {
                console.warn('[online] send failed', e);
            }
        }
    }

    leaveRoom() {
        if (this.roomId) {
            this.send({ type: 'leave_room' });
            this.roomId = null;
            this.playerId = null;
        }
        return Promise.resolve();
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.leaveRoom();
        this._cleanupSocket();
        this.isConnected = false;
        this._notifyConnection(false);
    }
}

window.OnlineMultiplayer = OnlineMultiplayer;
