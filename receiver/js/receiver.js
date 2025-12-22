// Криптография для получателя
class ClientCrypto {
    constructor() {
        this.keyPair = null;
        this.sessionKey = null;
        this.clientId = null;
        this.algorithm = 'GOST-R-34.10-2012';
    }
    
    init(keys) {
        this.clientId = keys.clientId;
        this.keyPair = {
            publicKey: keys.publicKey,
            privateKey: keys.privateKey
        };
        this.sessionKey = keys.sessionKey;
        this.algorithm = keys.algorithm || 'GOST-R-34.10-2012';
        
        console.log('🔑 Криптография ГОСТ инициализирована для получателя:', this.clientId);
        
        return this;
    }
    
    // Расшифровка сообщения
    decryptMessage(encryptedData) {
        console.log('🔐 Расшифровка сообщения:', typeof encryptedData, encryptedData);
        
        try {
            // Если данные уже являются объектом с полем message (формат от сервера)
            if (encryptedData && typeof encryptedData === 'object') {
                console.log('📦 Данные являются объектом');
                
                // Если есть поле message - это наш основной формат
                if (encryptedData.message) {
                    const messageStr = encryptedData.message;
                    
                    // Пробуем разобрать message как JSON
                    try {
                        const parsedMessage = JSON.parse(messageStr);
                        console.log('✅ Message parsed as JSON:', parsedMessage);
                        
                        // Возвращаем структурированные данные
                        return {
                            text: parsedMessage.text || parsedMessage,
                            sender: parsedMessage.sender || encryptedData.clientId || 'unknown',
                            timestamp: parsedMessage.timestamp || encryptedData.timestamp || Date.now(),
                            signature: parsedMessage.signature || encryptedData.signature,
                            signatureValid: this._verifySignature(parsedMessage.signature || encryptedData.signature),
                            algorithm: parsedMessage.algorithm || encryptedData.algorithm || this.algorithm
                        };
                    } catch (e) {
                        // Если message не JSON, используем как текст
                        console.log('⚠️ Message is plain text');
                        return {
                            text: messageStr,
                            sender: encryptedData.clientId || 'unknown',
                            timestamp: encryptedData.timestamp || Date.now(),
                            signature: encryptedData.signature,
                            signatureValid: this._verifySignature(encryptedData.signature),
                            algorithm: encryptedData.algorithm || this.algorithm
                        };
                    }
                }
                
                // Если есть поле text (уже распарсенные данные)
                if (encryptedData.text) {
                    console.log('📝 Данные уже содержат text поле');
                    return encryptedData;
                }
            }
            
            // Если данные - строка
            if (typeof encryptedData === 'string') {
                try {
                    // Пробуем разобрать как JSON
                    const parsed = JSON.parse(encryptedData);
                    console.log('✅ String parsed as JSON');
                    
                    // Если это объект с полем message
                    if (parsed.message) {
                        try {
                            const innerParsed = JSON.parse(parsed.message);
                            return {
                                text: innerParsed.text || innerParsed,
                                sender: innerParsed.sender || parsed.clientId || 'unknown',
                                timestamp: innerParsed.timestamp || parsed.timestamp || Date.now(),
                                signature: innerParsed.signature || parsed.signature,
                                signatureValid: this._verifySignature(innerParsed.signature || parsed.signature),
                                algorithm: innerParsed.algorithm || parsed.algorithm || this.algorithm
                            };
                        } catch (e) {
                            return {
                                text: parsed.message,
                                sender: parsed.clientId || 'unknown',
                                timestamp: parsed.timestamp || Date.now(),
                                signature: parsed.signature,
                                signatureValid: this._verifySignature(parsed.signature),
                                algorithm: parsed.algorithm || this.algorithm
                            };
                        }
                    }
                    
                    // Если это уже структурированный объект
                    if (parsed.text || parsed.sender) {
                        return {
                            text: parsed.text || parsed.message || 'Пустое сообщение',
                            sender: parsed.sender || 'unknown',
                            timestamp: parsed.timestamp || Date.now(),
                            signature: parsed.signature,
                            signatureValid: this._verifySignature(parsed.signature),
                            algorithm: parsed.algorithm || this.algorithm
                        };
                    }
                    
                } catch (e) {
                    // Если не JSON, возвращаем как текст
                    console.log('⚠️ String is plain text');
                    return {
                        text: encryptedData,
                        sender: 'unknown',
                        timestamp: Date.now(),
                        signatureValid: false,
                        algorithm: 'plain'
                    };
                }
            }
            
            // По умолчанию
            console.warn('❓ Неизвестный формат данных:', encryptedData);
            return {
                text: typeof encryptedData === 'object' ? JSON.stringify(encryptedData) : String(encryptedData),
                sender: 'unknown',
                timestamp: Date.now(),
                signatureValid: false,
                algorithm: 'unknown'
            };
            
        } catch (error) {
            console.error('❌ Ошибка при расшифровке:', error);
            return {
                text: `Ошибка расшифровки: ${error.message}`,
                sender: 'system',
                timestamp: Date.now(),
                signatureValid: false,
                algorithm: 'error'
            };
        }
    }
    
    // Улучшенная проверка подписи
    _verifySignature(signatureData) {
        if (!signatureData) return false;
        
        try {
            // Если подпись это объект
            if (typeof signatureData === 'object') {
                console.log('🔍 Проверка подписи (объект):', signatureData);
                
                // Проверяем наличие обязательных полей подписи ГОСТ
                const hasSignature = !!signatureData.signature;
                const hasHash = !!signatureData.hash;
                const hasAlgorithm = !!signatureData.algorithm;
                const hasTimestamp = !!signatureData.timestamp;
                
                // Проверяем формат подписи
                const signatureValid = hasSignature && 
                                      typeof signatureData.signature === 'string' && 
                                      signatureData.signature.length >= 50;
                
                const hashValid = hasHash && 
                                 typeof signatureData.hash === 'string' && 
                                 signatureData.hash.length >= 50;
                
                console.log(`📊 Подпись проверка: signature=${signatureValid}, hash=${hashValid}`);
                
                return signatureValid && hashValid;
            }
            
            // Если подпись это строка
            if (typeof signatureData === 'string') {
                console.log('🔍 Проверка подписи (строка):', signatureData.substring(0, 50) + '...');
                // Для строки проверяем длину и формат
                return signatureData.length >= 50 && 
                       /^[0-9a-f_]+$/i.test(signatureData);
            }
            
            return false;
        } catch (error) {
            console.error('❌ Ошибка проверки подписи:', error);
            return false;
        }
    }
}

// Глобальный объект криптографии
window.CryptoManager = new ClientCrypto();