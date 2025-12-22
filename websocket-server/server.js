const WebSocket = require('ws');
const GOSTCrypto = require('./gost-utils');

const wss = new WebSocket.Server({ port: 8082 });
const gost = new GOSTCrypto();

console.log('=== Russian GOST Crypto WebSocket Server ===');
console.log('Используется демо-режим ГОСТ криптографии');

// Запускаем тест асинхронно
gost.test().then(result => {
    console.log('Результат теста ГОСТ:', result.message);
    if (result.note) console.log('Примечание:', result.note);
}).catch(err => {
    console.log('Тест ГОСТ пропущен:', err.message);
});

const clients = new Map();

wss.on('connection', (ws, req) => {
    const clientId = generateId();
    const ip = req.socket.remoteAddress;

    console.log(`\n📡 Новое подключение: ${clientId} (${ip})`);

    // Генерируем ключи асинхронно
    gost.generateKeyPair().then(keys => {
        // Сохраняем клиента
        clients.set(clientId, {
            ws: ws,
            publicKey: keys.publicKey,
            privateKey: keys.privateKey,
            name: `User_${clientId.slice(0, 4)}`,
            ip: ip,
            connectedAt: new Date().toISOString(),
            isTestKey: keys.isTest || false
        });

        console.log(`✅ Ключи для ${clientId}: ${keys.isTest ? 'тестовые' : 'реальные'}`);

        // Отправляем приветствие
        ws.send(JSON.stringify({
            type: 'system',
            event: 'connected',
            clientId: clientId,
            publicKey: keys.publicKey,
            timestamp: Date.now(),
            message: 'Добро пожаловать в демо систему ГОСТ-шифрования',
            mode: keys.isTest ? 'demo' : 'real'
        }));

        // Уведомляем других
        broadcastSystemMessage(`👤 ${clients.get(clientId).name} подключился`, clientId);

        // Отправляем список онлайн
        sendOnlineListToAll();

    }).catch(error => {
        console.error(`❌ Ошибка генерации ключей для ${clientId}:`, error);

        // Создаем клиента без ключей
        clients.set(clientId, {
            ws: ws,
            publicKey: null,
            privateKey: null,
            name: `User_${clientId.slice(0, 4)}`,
            ip: ip,
            connectedAt: new Date().toISOString(),
            isTestKey: true
        });

        ws.send(JSON.stringify({
            type: 'system',
            event: 'connected',
            clientId: clientId,
            timestamp: Date.now(),
            message: 'Подключено (режим без шифрования)',
            mode: 'no-crypto'
        }));
    });

    // Обработчик сообщений
    // В обработчике сообщений в server.js исправьте:
    ws.on('message', async (message) => {
        try {
            const text = message.toString();
            const client = clients.get(clientId);

            console.log(`✉️  RAW от ${client.name}:`, text);

            let data;
            try {
                data = JSON.parse(text);
                console.log(`   Парсинг: тип=${data.type}, длина=${JSON.stringify(data).length}`);
            } catch (parseError) {
                console.log(`   Не JSON, отправляем как текст: ${text.substring(0, 50)}`);
                data = { type: 'text', content: text };
            }

            // Обработка сообщений
            if (data.type === 'text' && data.content) {
                // Обычное текстовое сообщение
                const messageObj = {
                    type: 'message',
                    from: clientId,
                    fromName: client.name,
                    text: data.content,
                    timestamp: Date.now(),
                    encrypted: false
                };

                console.log(`   📨 Отправляем всем: ${data.content.substring(0, 30)}...`);

                // Отправляем всем, кроме отправителя
                clients.forEach((recipient, id) => {
                    if (id !== clientId && recipient.ws.readyState === WebSocket.OPEN) {
                        recipient.ws.send(JSON.stringify(messageObj));
                    }
                });

            } else if (data.type === 'encrypt_message') {
                await handleEncryptMessage(clientId, data, client);

            } else if (data.type === 'set_name') {
                if (data.name && data.name.trim()) {
                    const oldName = client.name;
                    client.name = data.name.trim();
                    console.log(`🔄 ${clientId}: ${oldName} → ${client.name}`);

                    broadcastSystemMessage(`${oldName} сменил имя на ${client.name}`);
                    sendOnlineListToAll();
                }

            } else if (data.type === 'command') {
                await handleCommand(clientId, data, client);

            } else {
                // Любое другое сообщение пересылаем как есть
                console.log(`   🔄 Пересылаем сырое сообщение`);
                clients.forEach((recipient, id) => {
                    if (id !== clientId && recipient.ws.readyState === WebSocket.OPEN) {
                        recipient.ws.send(text);
                    }
                });
            }

        } catch (error) {
            console.error(`❌ Ошибка у ${clientId}:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Ошибка обработки: ' + error.message
            }));
        }
    });

    ws.on('close', () => {
        const client = clients.get(clientId);
        if (client) {
            console.log(`🔌 Отключение: ${client.name}`);
            broadcastSystemMessage(`👋 ${client.name} вышел`);
            clients.delete(clientId);
            sendOnlineListToAll();
        }
    });

    ws.on('error', (error) => {
        console.error(`⚠️  Ошибка WS у ${clientId}:`, error);
    });
});

// Обработчики команд
async function handleEncryptMessage(senderId, data, sender) {
    if (!sender.publicKey || !sender.privateKey) {
        sender.ws.send(JSON.stringify({
            type: 'error',
            message: 'У вас нет ключей для шифрования'
        }));
        return;
    }

    const receiver = clients.get(data.to);
    if (!receiver) {
        sender.ws.send(JSON.stringify({
            type: 'error',
            message: 'Получатель не найден'
        }));
        return;
    }

    if (!receiver.publicKey) {
        sender.ws.send(JSON.stringify({
            type: 'error',
            message: 'У получателя нет публичного ключа'
        }));
        return;
    }

    try {
        console.log(`🔐 ${sender.name} шифрует для ${receiver.name}`);

        const encrypted = await gost.encryptForReceiver(
            data.text,
            sender.privateKey,
            receiver.publicKey
        );

        // Отправляем отправителю подтверждение
        sender.ws.send(JSON.stringify({
            type: 'encryption_done',
            to: data.to,
            toName: receiver.name,
            originalLength: data.text.length,
            encryptedLength: encrypted.encrypted.data.length,
            isFallback: encrypted.isFallback || false,
            timestamp: Date.now()
        }));

        // Отправляем получателю
        receiver.ws.send(JSON.stringify({
            type: 'encrypted_message',
            from: senderId,
            fromName: sender.name,
            encrypted: encrypted,
            timestamp: Date.now(),
            instructions: 'Используйте команду decrypt для расшифровки'
        }));

    } catch (error) {
        console.error('Ошибка шифрования:', error);
        sender.ws.send(JSON.stringify({
            type: 'error',
            message: 'Ошибка шифрования: ' + error.message
        }));
    }
}

async function handleCommand(clientId, data, client) {
    switch (data.command) {
        case 'decrypt':
            if (data.encryptedData) {
                try {
                    const sender = clients.get(data.from);
                    if (!sender) throw new Error('Отправитель не найден');

                    const result = await gost.decryptAndVerify(
                        data.encryptedData,
                        sender.publicKey,
                        client.privateKey
                    );

                    client.ws.send(JSON.stringify({
                        type: 'decryption_result',
                        from: data.from,
                        fromName: sender.name,
                        message: result.decrypted,
                        signatureValid: result.isValid,
                        isFallback: result.isFallback || false,
                        timestamp: Date.now()
                    }));

                } catch (error) {
                    client.ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Ошибка расшифровки: ' + error.message
                    }));
                }
            }
            break;

        case 'test_gost':
            const testResult = await gost.test();
            client.ws.send(JSON.stringify({
                type: 'test_result',
                success: testResult.success,
                message: testResult.message,
                isDemo: testResult.isDemo || false,
                details: testResult.features
            }));
            break;

        case 'generate_keys':
            try {
                const keys = await gost.generateKeyPair();
                client.publicKey = keys.publicKey;
                client.privateKey = keys.privateKey;
                client.isTestKey = keys.isTest || false;

                client.ws.send(JSON.stringify({
                    type: 'keys_generated',
                    publicKey: keys.publicKey,
                    isTest: keys.isTest || false,
                    timestamp: Date.now()
                }));

                sendOnlineListToAll();

            } catch (error) {
                client.ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Ошибка генерации ключей: ' + error.message
                }));
            }
            break;
    }
}

// Вспомогательные функции
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function broadcastMessage(senderId, text) {
    const sender = clients.get(senderId);
    if (!sender) return;

    const message = {
        type: 'message',
        from: senderId,
        fromName: sender.name,
        text: text,
        timestamp: Date.now()
    };

    clients.forEach((client, id) => {
        if (id !== senderId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    });
}

function broadcastSystemMessage(text, excludeId = null) {
    const message = {
        type: 'system',
        message: text,
        timestamp: Date.now()
    };

    clients.forEach((client, id) => {
        if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    });
}

function sendOnlineListToAll() {
    const onlineList = Array.from(clients.entries()).map(([id, client]) => ({
        id: id,
        name: client.name,
        hasPublicKey: !!client.publicKey,
        isTestKey: client.isTestKey || false
    }));

    const message = {
        type: 'online_list',
        users: onlineList,
        count: clients.size,
        timestamp: Date.now()
    };

    clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    });
}

console.log('\n✅ Сервер запущен на порту 8082');
console.log('✅ Sender:   http://localhost:8080');
console.log('✅ Receiver: http://localhost:8081');
console.log('✅ WebSocket: ws://localhost:8082');
console.log('\n=== Демо система ГОСТ готова к работе ===\n');

// Статистика
setInterval(() => {
    console.log(`📊 Статистика: ${clients.size} клиентов онлайн`);
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔻 Остановка сервера...');
    broadcastSystemMessage('Сервер останавливается...');
    wss.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});