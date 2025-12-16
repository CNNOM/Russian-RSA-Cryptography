const WebSocket = require('ws');
const KeyManager = require('./crypto/key-manager');
const RussianCrypto = require('./crypto/gost');

// Получаем хост из переменных окружения или используем 0.0.0.0
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 8082;

const wss = new WebSocket.Server({ 
    host: HOST,
    port: PORT
});

console.log(`🚀 WebSocket сервер запущен на ws://${HOST}:${PORT}`);

const keyManager = new KeyManager();
const crypto = new RussianCrypto();
const clients = new Map();

wss.on('connection', (ws, req) => {
    console.log(`🔗 Новое подключение с IP: ${req.socket.remoteAddress}`);
    
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 Присвоен ID: ${clientId}`);
    
    try {
        // Генерируем ключи
        const keyPair = crypto.generateKeyPair();
        const sessionKey = keyManager.registerClient(clientId, keyPair.publicKey);
        
        const clientData = {
            id: clientId,
            keyPair,
            sessionKey,
            ws: ws,
            ip: req.socket.remoteAddress,
            connectedAt: Date.now()
        };
        
        clients.set(ws, clientData);
        
        // Отправляем инициализацию клиенту
        const initMessage = {
            type: 'init',
            clientId: clientId,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            sessionKey: sessionKey,
            serverPublicKey: 'server_key_' + crypto._generateRandomHex(32),
            algorithm: 'GOST-R-34.10-2012',
            timestamp: Date.now(),
            message: 'Криптография инициализирована успешно'
        };
        
        ws.send(JSON.stringify(initMessage));
        console.log(`🔑 Ключи отправлены клиенту ${clientId}`);
        
    } catch (error) {
        console.error(`❌ Ошибка инициализации клиента:`, error);
        ws.close(1011, 'Internal Server Error');
        return;
    }
    
    ws.on('message', async (rawData) => {
        const clientData = clients.get(ws);
        if (!clientData) return;
        
        try {
            const data = JSON.parse(rawData.toString());
            
            switch (data.type) {
                case 'ping':
                    // Heartbeat
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;
                    
                case 'encrypted_message':
                    if (!data.payload) {
                        throw new Error('Нет payload в сообщении');
                    }
                    
                    const decrypted = keyManager.decryptFromClient(
                        data.payload,
                        clientData.id
                    );
                    
                    console.log(`📨 Сообщение от ${clientData.id}: ${decrypted.substring(0, 50)}...`);
                    
                    // Рассылаем всем
                    broadcastMessage(decrypted, clientData.id);
                    break;
                    
                default:
                    console.log(`❓ Неизвестный тип от ${clientData.id}: ${data.type}`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка обработки сообщения от ${clientData.id}:`, error.message);
            
            try {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: error.message,
                    timestamp: Date.now()
                }));
            } catch (e) {
                // Игнорируем ошибки отправки
            }
        }
    });
    
    ws.on('close', (code, reason) => {
        const clientData = clients.get(ws);
        if (clientData) {
            console.log(`🔌 Отключение: ${clientData.id}, код: ${code}, причина: ${reason || 'нет'}`);
            keyManager.removeClient(clientData.id);
            clients.delete(ws);
        }
    });
    
    ws.on('error', (error) => {
        console.error(`💥 WebSocket ошибка:`, error);
    });
    
    // Heartbeat каждые 30 секунд
    const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            } catch (error) {
                clearInterval(heartbeatInterval);
            }
        } else {
            clearInterval(heartbeatInterval);
        }
    }, 30000);
    
    ws.on('close', () => clearInterval(heartbeatInterval));
});

function broadcastMessage(message, senderId) {
    const senderData = Array.from(clients.values()).find(c => c.id === senderId);
    if (!senderData) return;
    
    const messageObj = {
        text: message,
        sender: senderId,
        timestamp: Date.now(),
        signature: crypto.sign(message, senderData.keyPair.privateKey)
    };
    
    const messageJson = JSON.stringify(messageObj);
    
    clients.forEach((clientData, ws) => {
        if (clientData.id !== senderId && ws.readyState === WebSocket.OPEN) {
            try {
                const encrypted = keyManager.encryptForClient(messageJson, clientData.id);
                
                ws.send(JSON.stringify({
                    type: 'encrypted_message',
                    payload: encrypted,
                    sender: senderId,
                    timestamp: Date.now()
                }));
                
            } catch (error) {
                console.error(`❌ Ошибка шифрования для ${clientData.id}:`, error);
            }
        }
    });
    
    console.log(`📤 Сообщение от ${senderId} отправлено ${clients.size - 1} клиентам`);
}

// Обработка завершения
process.on('SIGINT', () => {
    console.log('\n🛑 Получен SIGINT, завершаем...');
    wss.close(() => {
        console.log('✅ WebSocket сервер остановлен');
        process.exit(0);
    });
});

console.log(`✅ Сервер готов, ожидание подключений...`);