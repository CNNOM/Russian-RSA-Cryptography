const RussianCrypto = require('./gost');

class KeyManager {
    constructor() {
        this.crypto = new RussianCrypto();
        this.clients = new Map(); // clientId -> {publicKey, sessionKey}
    }

    // Регистрация нового клиента
    registerClient(clientId, publicKey) {
        // Генерация сессионного ключа
        const sessionKey = this.crypto.generateRandomKey(32);

        this.clients.set(clientId, {
            publicKey,
            sessionKey,
            registeredAt: Date.now()
        });

        console.log(`🔑 Клиент ${clientId} зарегистрирован`);
        return sessionKey;
    }

    // Получение публичного ключа клиента
    getClientPublicKey(clientId) {
        const client = this.clients.get(clientId);
        return client ? client.publicKey : null;
    }

    // Шифрование сообщения для конкретного клиента
    // Шифрование сообщения для конкретного клиента
    encryptForClient(message, clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error(`Клиент ${clientId} не найден`);
        }

        // Если message уже объект, сериализуем его
        const messageToSend = typeof message === 'object' ? JSON.stringify(message) : message;

        // Создаем подпись
        const signature = this.crypto.sign(messageToSend, 'server_private_key_fallback');

        return {
            message: messageToSend, // Теперь это JSON строка со всеми полями
            signature: signature,
            clientId: clientId,
            timestamp: Date.now(),
            algorithm: 'GOST-R-34.10-2012'
        };
    }

    // Расшифровка сообщения от клиента
    decryptFromClient(encryptedData, clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error(`Клиент ${clientId} не найден`);
        }

        const { message, signature } = encryptedData;

        // Проверяем подпись если есть
        if (signature) {
            try {
                const isValid = this.crypto.verify(
                    message,
                    signature,
                    client.publicKey
                );
                if (!isValid) {
                    console.warn(`⚠️ Недействительная подпись от ${clientId}`);
                }
            } catch (error) {
                console.error(`❌ Ошибка проверки подписи:`, error.message);
            }
        }

        return message;
    }

    // Проверка подлинности клиента
    authenticate(clientId, signatureData, challenge) {
        const client = this.clients.get(clientId);
        if (!client) return false;

        try {
            return this.crypto.verify(challenge, signatureData, client.publicKey);
        } catch (error) {
            console.error('Ошибка аутентификации:', error);
            return false;
        }
    }

    // Удаление клиента (при отключении)
    removeClient(clientId) {
        this.clients.delete(clientId);
        console.log(`🗑️  Клиент ${clientId} удален`);
    }
}

module.exports = KeyManager;