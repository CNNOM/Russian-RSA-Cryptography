// server.js - Исправленная версия
const WebSocket = require('ws');

// Для gost-crypto нам нужен другой подход
let gost;
try {
    // Пытаемся использовать gost-crypto напрямую
    const gostCrypto = require('gost-crypto');
    console.log('✅ gost-crypto загружен, subtle доступен:', !!gostCrypto.subtle);
    gost = gostCrypto;
} catch (error) {
    console.log('❌ gost-crypto не загружен:', error.message);
    gost = null;
}

const wss = new WebSocket.Server({ port: 8082 });

console.log('=== WebSocket Сервер с поддержкой ГОСТ ===');
console.log('Режим:', gost ? 'gost-crypto доступен' : 'только маршрутизация');
console.log('Порт: 8082');

const clients = new Map();

// Функция для генерации клиентских инструкций по ГОСТ
function getGOSTInstructions() {
    return {
        forBrowser: `
            // Добавьте в HTML:
            <script src="https://unpkg.com/gost-crypto/dist/gostCrypto.min.js"></script>
            
            // Использование в браузере:
            async function generateGOSTKeys() {
                // Убедитесь, что gostCrypto доступен
                if (window.gostCrypto) {
                    const subtle = window.gostCrypto.subtle;
                    const keyPair = await subtle.generateKey(
                        {
                            name: "GOST R 34.10-2012",
                            namedCurve: "S-256-A"
                        },
                        true,
                        ["sign", "verify"]
                    );
                    return keyPair;
                }
                return null;
            }
        `,
        serverNote: "Сервер только пересылает зашифрованные данные",
        clientNote: "Шифруйте данные в браузере с помощью gost-crypto"
    };
}

wss.on('connection', (ws, req) => {
    const clientId = generateId();
    const ip = req.socket.remoteAddress;
    
    console.log(`\n📡 Новый клиент: ${clientId} (${ip})`);
    
    // Создаем клиента
    clients.set(clientId, {
        ws: ws,
        id: clientId,
        name: `User_${clientId.slice(0, 4)}`,
        ip: ip,
        connectedAt: new Date().toISOString(),
        publicKey: null, // Будет установлен клиентом
        hasGost: false
    });
    
    const client = clients.get(clientId);
    
    // Отправляем приветствие
    ws.send(JSON.stringify({
        type: 'system',
        event: 'connected',
        clientId: clientId,
        timestamp: Date.now(),
        message: 'Добро пожаловать!',
        gostAvailable: !!gost,
        instructions: gost ? getGOSTInstructions() : null,
        yourName: client.name
    }));
    
    // Уведомляем всех
    broadcast({
        type: 'user_joined',
        clientId: clientId,
        name: client.name,
        timestamp: Date.now()
    }, clientId);
    
    // Обновляем список онлайн
    updateOnlineList();
    
    ws.on('message', async (message) => {
        try {
            const text = message.toString();
            console.log(`📨 ${client.name}:`, text.substring(0, 100));
            
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = { type: 'text', content: text };
            }
            
            // Обработка разных типов сообщений
            switch(data.type) {
                case 'set_name':
                    if (data.name && data.name.trim()) {
                        const oldName = client.name;
                        client.name = data.name.trim();
                        console.log(`🔄 ${clientId}: ${oldName} → ${client.name}`);
                        
                        broadcast({
                            type: 'name_changed',
                            clientId: clientId,
                            oldName: oldName,
                            newName: client.name,
                            timestamp: Date.now()
                        });
                    }
                    break;
                    
                case 'set_public_key':
                    // Клиент отправляет свой публичный ключ
                    if (data.publicKey) {
                        client.publicKey = data.publicKey;
                        client.hasGost = data.hasGost || false;
                        console.log(`🔑 ${client.name} установил публичный ключ`);
                    }
                    break;
                    
                case 'encrypted_message':
                    // Зашифрованное сообщение
                    await handleEncryptedMessage(clientId, data);
                    break;
                    
                case 'get_online':
                    // Запрос списка онлайн
                    sendOnlineList(clientId);
                    break;
                    
                case 'get_public_key':
                    // Запрос публичного ключа другого клиента
                    if (data.targetId) {
                        const target = clients.get(data.targetId);
                        if (target && target.publicKey) {
                            ws.send(JSON.stringify({
                                type: 'public_key',
                                targetId: data.targetId,
                                targetName: target.name,
                                publicKey: target.publicKey,
                                hasGost: target.hasGost
                            }));
                        }
                    }
                    break;
                    
                case 'command':
                    // Команды
                    await handleCommand(clientId, data);
                    break;
                    
                default:
                    // Обычное текстовое сообщение
                    if (data.content || data.text) {
                        broadcast({
                            type: 'message',
                            from: clientId,
                            fromName: client.name,
                            text: data.content || data.text,
                            timestamp: Date.now(),
                            encrypted: false
                        }, clientId);
                    }
            }
            
        } catch (error) {
            console.error(`❌ Ошибка у ${clientId}:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    });
    
    ws.on('close', () => {
        console.log(`🔌 Отключение: ${client.name} (${clientId})`);
        
        broadcast({
            type: 'user_left',
            clientId: clientId,
            name: client.name,
            timestamp: Date.now()
        });
        
        clients.delete(clientId);
        updateOnlineList();
    });
    
    ws.on('error', (error) => {
        console.error(`⚠️ WebSocket ошибка у ${clientId}:`, error);
    });
});

// Обработка зашифрованных сообщений
async function handleEncryptedMessage(senderId, data) {
    const sender = clients.get(senderId);
    if (!sender) return;
    
    console.log(`🔐 ${sender.name} отправил зашифрованное сообщение`);
    
    // Если указан получатель
    if (data.to && data.to !== 'all') {
        const recipient = clients.get(data.to);
        if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
            // Пересылаем зашифрованные данные получателю
            recipient.ws.send(JSON.stringify({
                type: 'encrypted_message',
                from: senderId,
                fromName: sender.name,
                data: data.data,
                signature: data.signature,
                algorithm: data.algorithm,
                timestamp: Date.now(),
                note: 'Используйте gost-crypto в браузере для расшифровки'
            }));
            
            // Подтверждение отправителю
            sender.ws.send(JSON.stringify({
                type: 'encryption_sent',
                to: data.to,
                toName: recipient.name,
                timestamp: Date.now()
            }));
        }
    } else {
        // Шифрованное сообщение всем (для демо)
        broadcast({
            type: 'encrypted_broadcast',
            from: senderId,
            fromName: sender.name,
            hasEncryptedData: true,
            algorithm: data.algorithm,
            timestamp: Date.now()
        }, senderId);
    }
}

// Обработка команд
async function handleCommand(clientId, data) {
    const client = clients.get(clientId);
    if (!client) return;
    
    switch(data.command) {
        case 'test_gost':
            // Тестирование доступности ГОСТ
            const testResult = {
                serverHasGost: !!gost,
                clientHasGost: client.hasGost,
                message: gost ? 
                    'gost-crypto доступен (subtle API)' : 
                    'gost-crypto не доступен на сервере',
                recommendation: 'Используйте gost-crypto в браузере'
            };
            
            client.ws.send(JSON.stringify({
                type: 'test_result',
                ...testResult,
                timestamp: Date.now()
            }));
            break;
            
        case 'generate_demo_keys':
            // Генерация демо-ключей
            const demoKeys = {
                publicKey: JSON.stringify({
                    kty: "EC-GOST-DEMO",
                    id: `demo_${Date.now()}`,
                    crv: "S-256-A",
                    note: "Это демо-ключ. В реальности используйте gost-crypto в браузере"
                }),
                algorithm: "GOST-R-34.10-2012 (демо)",
                created: new Date().toISOString()
            };
            
            client.ws.send(JSON.stringify({
                type: 'demo_keys',
                keys: demoKeys,
                timestamp: Date.now()
            }));
            break;
    }
}

// Вспомогательные функции
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function broadcast(message, excludeId = null) {
    const json = JSON.stringify(message);
    
    clients.forEach((client, id) => {
        if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(json);
        }
    });
}

function updateOnlineList() {
    const onlineList = Array.from(clients.entries()).map(([id, client]) => ({
        id: id,
        name: client.name,
        hasPublicKey: !!client.publicKey,
        hasGost: client.hasGost
    }));
    
    broadcast({
        type: 'online_list',
        users: onlineList,
        count: clients.size,
        timestamp: Date.now()
    });
}

function sendOnlineList(clientId) {
    const client = clients.get(clientId);
    if (!client) return;
    
    const onlineList = Array.from(clients.entries()).map(([id, c]) => ({
        id: id,
        name: c.name,
        hasPublicKey: !!c.publicKey,
        hasGost: c.hasGost
    }));
    
    client.ws.send(JSON.stringify({
        type: 'online_list',
        users: onlineList,
        count: clients.size,
        timestamp: Date.now()
    }));
}

// Информация о системе
console.log('\n📋 Инструкции для клиентов:');
console.log('1. В браузере подключите gost-crypto:');
console.log('   <script src="https://unpkg.com/gost-crypto/dist/gostCrypto.min.js"></script>');
console.log('2. Генерируйте ключи в браузере');
console.log('3. Шифруйте сообщения в браузере');
console.log('4. Сервер только пересылает зашифрованные данные\n');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔻 Остановка сервера...');
    broadcast({
        type: 'system',
        message: 'Сервер останавливается',
        timestamp: Date.now()
    });
    
    wss.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});