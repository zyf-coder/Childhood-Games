/**
 * 联机功能模块
 */
class OnlineMultiplayer {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerId = null;
        this.isConnected = false;
        this.onStateUpdate = null;
        this.onPlayerInput = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onChatMessage = null;
        this.onGameStart = null;
        this.onVoiceSignal = null;
        this.onError = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    // 连接到服务器
    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);
                
                this.ws.onopen = () => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    console.log('已连接到服务器');
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
                
                this.ws.onclose = () => {
                    this.isConnected = false;
                    console.log('与服务器断开连接');
                    this.attemptReconnect(serverUrl);
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket错误:', error);
                    if (this.onError) this.onError('连接失败');
                    reject(error);
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    // 尝试重新连接
    attemptReconnect(serverUrl) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(serverUrl), 2000);
        }
    }

    // 处理接收到的消息
    handleMessage(message) {
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
                if (this.onPlayerLeft) this.onPlayerLeft(message);
                break;
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
                
            case 'error':
                if (this.onError) this.onError(message.message);
                break;
        }
    }

    // 创建房间
    createRoom(gameName, playerName) {
        if (!this.isConnected) return false;
        
        this.send({
            type: 'create_room',
            game: gameName,
            playerName: playerName
        });
        return true;
    }

    // 加入房间
    joinRoom(roomId, playerName) {
        if (!this.isConnected) return false;
        
        this.send({
            type: 'join_room',
            roomId: roomId,
            playerName: playerName
        });
        return true;
    }

    // 发送游戏状态
    sendGameState(state) {
        if (!this.isConnected) return;
        
        this.send({
            type: 'game_state',
            state: state
        });
    }

    // 发送玩家输入
    sendPlayerInput(input) {
        if (!this.isConnected) return;
        
        this.send({
            type: 'player_input',
            input: input
        });
    }

    sendInput(input) { this.sendPlayerInput(input); }

    sendChatMessage(message) {
        if (this.isConnected) this.send({ type: 'chat', message });
    }

    sendGameStart(game) {
        if (this.isConnected) this.send({ type: 'game_start', game });
    }

    sendVoiceSignal(signal) {
        if (this.isConnected) this.send({ type: 'voice_signal', signal });
    }

    async getRoomList() {
        try {
            const response = await fetch(window.REALTIME_HTTP_URL || 'https://ws.onlyforus.online/rooms', { cache: 'no-store' });
            return response.ok ? await response.json() : [];
        } catch (e) { return []; }
    }

    // 发送消息
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // 离开房间
    leaveRoom() {
        if (this.roomId) {
            this.send({ type: 'leave_room' });
            this.roomId = null;
            this.playerId = null;
        }
        return Promise.resolve();
    }

    // 断开连接
    disconnect() {
        this.leaveRoom();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}

// 导出
window.OnlineMultiplayer = OnlineMultiplayer;
