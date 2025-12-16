const RussianCrypto = require('./gost');

class KeyManager {
    constructor() {
        this.crypto = new RussianCrypto();
        this.clients = new Map(); // clientId -> {publicKey, sessionKey}
        this.sessionKeys = new Map(); // sessionId -> ключ сессии
    }

    // Регистрация нового клиента
    registerClient(clientId, publicKey) {
        // Генерация сессионного ключа (симметричный по ГОСТ)
        const sessionKey = this.crypto._generateRandomHex(32);
        
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
    encryptForClient(message, clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error(`Клиент ${clientId} не найден`);
        }

        // Шифруем сообщение сессионным ключом
        const encrypted = this.crypto.encrypt(message, client.sessionKey);
        
        // Добавляем подпись сервера
        const signature = this.crypto.sign(message, 'server-private-key');
        
        return {
            ...encrypted,
            signature,
            clientId,
            timestamp: Date.now()
        };
    }

    // Расшифровка сообщения от клиента
    decryptFromClient(encryptedData, clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error(`Клиент ${clientId} не найден`);
        }

        // Расшифровываем сессионным ключом
        const decrypted = this.crypto.decrypt(encryptedData, client.sessionKey);
        
        // Проверяем подпись клиента
        if (encryptedData.signature) {
            const isValid = this.crypto.verify(
                decrypted, 
                encryptedData.signature, 
                client.publicKey
            );
            if (!isValid) {
                throw new Error('Недействительная подпись');
            }
        }

        return decrypted;
    }

    // Проверка подлинности клиента
    authenticate(clientId, signature, challenge) {
        const client = this.clients.get(clientId);
        if (!client) return false;

        return this.crypto.verify(challenge, signature, client.publicKey);
    }

    // Удаление клиента (при отключении)
    removeClient(clientId) {
        this.clients.delete(clientId);
        console.log(`🗑️  Клиент ${clientId} удален`);
    }
}

module.exports = KeyManager;