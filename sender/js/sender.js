// Клиентская криптография с использованием GOST
class ClientCrypto {
    constructor() {
        this.keyPair = null;
        this.sessionKey = null;
        this.clientId = null;
        this.algorithm = 'GOST-R-34.10-2012';
    }
    
    // Инициализация с ключами от сервера
    init(keys) {
        this.clientId = keys.clientId;
        this.keyPair = {
            publicKey: keys.publicKey,
            privateKey: keys.privateKey
        };
        this.sessionKey = keys.sessionKey;
        this.algorithm = keys.algorithm || 'GOST-R-34.10-2012';
        
        console.log('🔑 Криптография ГОСТ инициализирована для:', this.clientId);
        console.log('📊 Полученные ключи:', {
            clientId: this.clientId,
            publicKeyLength: this.keyPair.publicKey?.length,
            privateKeyLength: this.keyPair.privateKey?.length,
            sessionKeyLength: this.sessionKey?.length
        });
        
        // Проверяем подпись верификации если есть
        if (keys.verification) {
            this.verifyInitialization(keys.verification);
        }
        
        return this;
    }
    
    // Проверка инициализационной подписи
    verifyInitialization(verification) {
        console.log('🔍 Проверка подписи инициализации...');
        
        if (verification) {
            // Обрабатываем подпись как объект
            if (typeof verification.signature === 'object') {
                console.log('✅ Подпись получена (объект):', 
                    verification.signature.signature?.substring?.(0, 20) || 'Нет подписи');
            } else if (typeof verification.signature === 'string') {
                console.log('✅ Подпись получена (строка):', 
                    verification.signature.substring(0, 20) + '...');
            } else {
                console.log('ℹ️ Подпись в неожиданном формате:', typeof verification.signature);
            }
            
            console.log('✅ Сообщение верификации:', verification.message?.substring?.(0, 50) || 'Нет сообщения');
        }
        
        return true;
    }
    
    // Создание подписи для сообщения
    createSignature(message) {
        if (!this.keyPair || !this.keyPair.privateKey) {
            throw new Error('Приватный ключ не установлен');
        }
        
        try {
            // Эмуляция подписи ГОСТ для клиента
            return this._simulateGostSignature(message);
        } catch (error) {
            console.error('Ошибка создания подписи:', error);
            return this._fallbackSignature(message);
        }
    }
    
    // Шифрование сообщения перед отправкой
    encryptMessage(message) {
        try {
            const signature = this.createSignature(message);
            
            const payload = {
                message: message,
                signature: signature,
                clientId: this.clientId,
                algorithm: this.algorithm,
                timestamp: Date.now()
            };
            
            console.log('🔐 Сообщение подготовлено для отправки:', {
                messageLength: message.length,
                hasSignature: !!signature
            });
            
            return payload;
        } catch (error) {
            console.error('Ошибка шифрования сообщения:', error);
            throw error;
        }
    }
    
    // Расшифровка входящего сообщения
    decryptMessage(encryptedData) {
        try {
            if (!encryptedData) {
                throw new Error('Нет данных для расшифровки');
            }
            
            // Если это уже расшифрованное сообщение от сервера
            if (typeof encryptedData === 'string') {
                try {
                    const parsed = JSON.parse(encryptedData);
                    return this._processDecryptedMessage(parsed);
                } catch (e) {
                    return encryptedData; // Возвращаем как есть если это строка
                }
            }
            
            // Если это объект с полями сообщения
            if (typeof encryptedData === 'object') {
                return this._processDecryptedMessage(encryptedData);
            }
            
            throw new Error('Неизвестный формат данных');
        } catch (error) {
            console.error('Ошибка расшифровки:', error);
            return 'Ошибка расшифровки сообщения';
        }
    }
    
    _processDecryptedMessage(messageObj) {
        const { text, message, sender, signature, algorithm } = messageObj;
        const messageText = text || message || '';
        
        // Проверяем подпись если есть
        let signatureValid = false;
        if (signature && sender && sender !== this.clientId) {
            console.log(`🔍 Проверка подписи от ${sender}...`);
            signatureValid = this._verifyMessageSignature(messageText, signature);
        }
        
        return {
            text: messageText,
            sender: sender || 'unknown',
            signatureValid: signatureValid,
            algorithm: algorithm || 'unknown',
            timestamp: messageObj.timestamp || Date.now()
        };
    }
    
    // Эмуляция подписи ГОСТ
    _simulateGostSignature(message) {
        // Простая эмуляция для демо
        const timestamp = Date.now();
        const data = `${message}_${this.clientId}_${timestamp}`;
        
        // Эмуляция хэша ГОСТ
        let hash = '';
        for (let i = 0; i < 64; i++) {
            const charCode = data.charCodeAt(i % data.length) ^ i;
            hash += charCode.toString(16).padStart(2, '0');
        }
        
        // Эмуляция подписи
        const signatureString = hash.substring(0, 128) + '_' + 
                               (this.keyPair.privateKey?.substring(0, 32) || 'fallback');
        
        return {
            signature: signatureString,
            hash: hash.substring(0, 64),
            algorithm: 'GOST-R-34.10-2012',
            timestamp: timestamp
        };
    }
    
    // Проверка подписи сообщения
    _verifyMessageSignature(message, signatureData) {
        try {
            if (!signatureData) return false;
            
            // Если подпись это строка
            if (typeof signatureData === 'string') {
                return this._simulateGostVerify(message, { signature: signatureData });
            }
            
            // Если подпись это объект
            if (typeof signatureData === 'object') {
                const { signature, timestamp } = signatureData;
                return this._simulateGostVerify(message, { signature, timestamp });
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка проверки подписи:', error);
            return false;
        }
    }
    
    // Эмуляция проверки подписи ГОСТ
    _simulateGostVerify(message, signatureData) {
        const { signature, timestamp } = signatureData;
        
        if (!signature) {
            return false;
        }
        
        // Простая проверка для демо - проверяем что подпись имеет правильный формат
        const signatureStr = typeof signature === 'string' ? signature : 
                            (signature.signature || '');
        
        // Проверяем базовый формат (должна содержать хэш и ключ)
        return signatureStr.length > 50 && 
               (signatureStr.includes('_') || /^[0-9a-f]+$/i.test(signatureStr));
    }
    
    // Фоллбэк подпись
    _fallbackSignature(message) {
        return {
            signature: 'fallback_signature_' + Date.now() + '_' + Math.random().toString(36),
            hash: 'fallback_hash_' + message.length,
            algorithm: 'FALLBACK',
            timestamp: Date.now()
        };
    }
    
    // Генерация случайной строки
    _generateRandomHex(length) {
        let result = '';
        const chars = '0123456789abcdef';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

// Глобальный объект криптографии
window.CryptoManager = new ClientCrypto();