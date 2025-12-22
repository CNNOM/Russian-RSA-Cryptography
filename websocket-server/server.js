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
        // Генерируем ключи с использованием ГОСТ
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

        // Создаем подпись для верификации
        const verificationMessage = `init_${clientId}_${Date.now()}`;
        const signature = crypto.sign(verificationMessage, keyPair.privateKey);

        // Отправляем инициализацию клиенту
        const initMessage = {
            type: 'init',
            clientId: clientId,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            sessionKey: sessionKey,
            algorithm: 'GOST-R-34.10-2012',
            hashAlgorithm: 'GOST-R-34.11-2012',
            timestamp: Date.now(),
            verification: {
                message: verificationMessage,
                signature: signature.signature || signature, // Исправление здесь
                hash: signature.hash,
                algorithm: signature.algorithm
            },
            message: 'Криптография ГОСТ инициализирована успешно'
        };

        ws.send(JSON.stringify(initMessage));
        console.log(`🔑 Ключи ГОСТ отправлены клиенту ${clientId}`);

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

                    // Создаем подпись для сообщения
                    const messageSignature = crypto.sign(
                        decrypted,
                        clientData.keyPair.privateKey
                    );

                    // Рассылаем всем
                    broadcastMessage(decrypted, clientData.id, messageSignature);
                    break;

                case 'verify':
                    // Верификация подписи клиента
                    if (data.challenge && data.signature) {
                        const isValid = keyManager.authenticate(
                            clientData.id,
                            data.signature,
                            data.challenge
                        );

                        ws.send(JSON.stringify({
                            type: 'verification_result',
                            valid: isValid,
                            timestamp: Date.now()
                        }));
                    }
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

// ... в функции broadcastMessage:

function broadcastMessage(message, senderId, signature) {
    const senderData = Array.from(clients.values()).find(c => c.id === senderId);
    if (!senderData) return;

    // Создаем структурированное сообщение
    const messageObj = {
        text: message,
        sender: senderId,
        timestamp: Date.now(),
        signature: signature,
        algorithm: 'GOST-R-34.10-2012',
        verified: true
    };

    console.log(`📤 Подготовка сообщения от ${senderId}:`, messageObj);

    clients.forEach((clientData, ws) => {
        if (clientData.id !== senderId && ws.readyState === WebSocket.OPEN) {
            try {
                // Шифруем для клиента
                const encrypted = keyManager.encryptForClient(
                    JSON.stringify(messageObj), // Отправляем JSON строку с ВСЕМИ полями
                    clientData.id
                );

                console.log(`📨 Отправка клиенту ${clientData.id}`, encrypted);

                ws.send(JSON.stringify({
                    type: 'encrypted_message',
                    payload: encrypted, // Отправляем зашифрованный объект
                    sender: senderId,
                    timestamp: Date.now(),
                    originalMessage: messageObj // Для отладки
                }));

            } catch (error) {
                console.error(`❌ Ошибка отправки для ${clientData.id}:`, error);
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