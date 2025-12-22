// gost-utils.js - Упрощенная версия без реального ГОСТ
class GOSTCrypto {
    constructor() {
        console.log('📦 Демо-режим ГОСТ криптографии');
        this.mode = 'demo';
    }

    // Генерация тестовых ключей
    async generateKeyPair() {
        console.log('🔑 Генерация тестовых ключей ГОСТ...');
        
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 8);
        
        // Создаем тестовые ключи в формате JWK
        const keyPair = {
            publicKey: JSON.stringify({
                kty: "EC",
                crv: "S-256-A",
                x: this.stringToBase64(`demo_pub_x_${timestamp}_${randomId}`),
                y: this.stringToBase64(`demo_pub_y_${timestamp}_${randomId}`),
                key_ops: ["verify"],
                ext: true,
                demo: true
            }),
            privateKey: JSON.stringify({
                kty: "EC",
                crv: "S-256-A",
                x: this.stringToBase64(`demo_priv_x_${timestamp}_${randomId}`),
                y: this.stringToBase64(`demo_priv_y_${timestamp}_${randomId}`),
                d: this.stringToBase64(`demo_priv_d_${timestamp}_${randomId}`),
                key_ops: ["sign"],
                ext: true,
                demo: true
            }),
            isTest: true,
            demo: true
        };
        
        return keyPair;
    }

    // Демо-шифрование
    async encryptForReceiver(message, myPrivateKeyJwk, receiverPublicKeyJwk) {
        console.log('🔐 Демо-шифрование сообщения...');
        
        try {
            // Простое "шифрование" для демо
            const demoKey = `demo_key_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            
            return {
                encrypted: {
                    iv: this.stringToBase64(`demo_iv_${Date.now()}`),
                    data: this.stringToBase64(`[ЗАШИФРОВАНО] ${message}`),
                    algorithm: 'GOST-28147-89 (DEMO)',
                    demo: true
                },
                signature: this.stringToBase64(`demo_signature_${Date.now()}_${message.substring(0, 10)}`),
                sharedSecret: this.stringToBase64(demoKey),
                demo: true,
                timestamp: Date.now(),
                originalLength: message.length
            };
            
        } catch (error) {
            console.error('Ошибка демо-шифрования:', error);
            
            return {
                encrypted: {
                    iv: this.stringToBase64('demo_fallback'),
                    data: this.stringToBase64(message),
                    algorithm: 'DEMO-FALLBACK'
                },
                signature: this.stringToBase64('demo_signature'),
                demo: true,
                error: error.message
            };
        }
    }

    // Демо-расшифровка
    async decryptAndVerify(encryptedData, senderPublicKeyJwk, myPrivateKeyJwk) {
        console.log('🔓 Демо-расшифровка...');
        
        try {
            // Извлекаем сообщение из демо-данных
            let decrypted;
            if (encryptedData.encrypted && encryptedData.encrypted.data) {
                const dataStr = this.base64ToString(encryptedData.encrypted.data);
                if (dataStr.startsWith('[ЗАШИФРОВАНО] ')) {
                    decrypted = dataStr.substring('[ЗАШИФРОВАНО] '.length);
                } else {
                    decrypted = dataStr;
                }
            } else {
                decrypted = '[Не удалось расшифровать]';
            }
            
            return {
                decrypted: decrypted,
                isValid: true, // В демо-режиме всегда валидно
                demo: true,
                note: 'Демо-режим: используется имитация ГОСТ шифрования'
            };
            
        } catch (error) {
            console.error('Ошибка демо-расшифровки:', error);
            
            return {
                decrypted: '[Ошибка расшифровки]',
                isValid: false,
                error: error.message
            };
        }
    }

    // Тестирование
    async test() {
        console.log('🧪 Тест демо-системы ГОСТ...');
        
        // Генерируем тестовые ключи
        const keys = await this.generateKeyPair();
        
        // Тестовое шифрование
        const testMessage = 'Тестовое сообщение';
        const encrypted = await this.encryptForReceiver(
            testMessage,
            keys.privateKey,
            keys.publicKey
        );
        
        // Тестовая расшифровка
        const decrypted = await this.decryptAndVerify(
            encrypted,
            keys.publicKey,
            keys.privateKey
        );
        
        const success = decrypted.decrypted === testMessage || 
                       decrypted.decrypted === `[ЗАШИФРОВАНО] ${testMessage}`;
        
        return {
            success: success,
            message: success ? 'Демо-система ГОСТ работает' : 'Демо-система не работает',
            demo: true,
            features: {
                keyGeneration: true,
                encryption: true,
                decryption: true,
                signature: true,
                verification: true
            },
            warning: '⚠️  Это ДЕМО-режим. Для реального ГОСТ шифрования нужна настройка Node.js с поддержкой ГОСТ алгоритмов.',
            recommendations: [
                'Для production используйте КриптоПро CSP',
                'Или настройте Node.js с ГОСТ патчами',
                'Или используйте браузер с поддержкой WebCrypto ГОСТ'
            ]
        };
    }

    // Вспомогательные методы
    stringToBase64(str) {
        return Buffer.from(str, 'utf8').toString('base64');
    }

    base64ToString(base64) {
        return Buffer.from(base64, 'base64').toString('utf8');
    }

    arrayBufferToBase64(buffer) {
        return Buffer.from(buffer).toString('base64');
    }

    base64ToArrayBuffer(base64) {
        return Buffer.from(base64, 'base64');
    }
}

module.exports = GOSTCrypto;