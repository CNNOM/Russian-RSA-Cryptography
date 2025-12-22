// Использование реальной библиотеки gost-crypto
const gostcrypto = require('gost-crypto');

class RussianCrypto {
    constructor() {
        // Используем ГОСТ Р 34.10-2012 (256-512 бит)
        this.algorithm = {
            name: 'GOST R 34.10',
            version: 2012,
            mode: '512/256'
        };
    }

    // Генерация пары ключей по ГОСТ Р 34.10-2012
    generateKeyPair() {
        try {
            // Генерация ключевой пары
            const keyPair = gostcrypto.gostsignature.generateKey(
                'GOST R 34.10',
                'GOST R 34.10-2012-256',
                'Derived' // или 'Random' для случайной генерации
            );
            
            // Экспорт приватного ключа
            const privateKeyHex = gostcrypto.utils.hexToArray(
                keyPair.privateKey
            ).toString('hex');
            
            // Экспорт публичного ключа
            const publicKeyHex = gostcrypto.utils.hexToArray(
                keyPair.publicKey
            ).toString('hex');
            
            return {
                privateKey: privateKeyHex,
                publicKey: publicKeyHex,
                algorithm: 'GOST-R-34.10-2012-256'
            };
        } catch (error) {
            console.error('Ошибка генерации ключей:', error);
            // Фоллбэк для демо
            return this._generateFallbackKeyPair();
        }
    }

    // Хэширование по ГОСТ Р 34.11-2012 "Стрибог"
    hash(data, outputSize = 256) {
        try {
            // Конвертируем данные в ArrayBuffer
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            
            // Вычисляем хэш
            const hashArray = gostcrypto.gosthash.GOSTR3411_2012_256(dataBuffer);
            
            // Конвертируем в hex
            return Array.from(new Uint8Array(hashArray))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (error) {
            console.error('Ошибка хэширования:', error);
            // Фоллбэк
            return this._fallbackHash(data);
        }
    }

    // Подпись сообщения по ГОСТ Р 34.10-2012
    sign(message, privateKeyHex) {
        try {
            // Получаем хэш сообщения
            const hash = this.hash(message);
            
            // Конвертируем ключ
            const privateKeyArray = new Uint8Array(
                privateKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
            );
            
            // Создаем подпись
            const signature = gostcrypto.gostsignature.sign(
                'GOST R 34.10-2012-256',
                privateKeyArray,
                new TextEncoder().encode(message)
            );
            
            // Конвертируем в hex
            const signatureHex = Array.from(new Uint8Array(signature))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            
            return {
                signature: signatureHex,
                hash: hash,
                algorithm: 'GOST-R-34.10-2012',
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Ошибка создания подписи:', error);
            return this._fallbackSign(message, privateKeyHex);
        }
    }

    // Проверка подписи по ГОСТ Р 34.10-2012
    verify(message, signatureData, publicKeyHex) {
        try {
            const { signature, algorithm } = signatureData;
            
            // Конвертируем ключи
            const publicKeyArray = new Uint8Array(
                publicKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
            );
            
            const signatureArray = new Uint8Array(
                signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
            );
            
            const messageArray = new TextEncoder().encode(message);
            
            // Проверяем подпись
            const isValid = gostcrypto.gostsignature.verify(
                'GOST R 34.10-2012-256',
                publicKeyArray,
                signatureArray,
                messageArray
            );
            
            return isValid;
        } catch (error) {
            console.error('Ошибка проверки подписи:', error);
            return this._fallbackVerify(message, signatureData, publicKeyHex);
        }
    }

    // Генерация случайной строки для сессионных ключей
    generateRandomKey(length = 32) {
        try {
            const array = new Uint8Array(length);
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                crypto.getRandomValues(array);
            } else {
                // Фоллбэк для Node.js
                const crypto = require('crypto');
                const buffer = crypto.randomBytes(length);
                array.set(buffer);
            }
            
            return Array.from(array)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (error) {
            console.error('Ошибка генерации ключа:', error);
            return this._generateRandomHex(length);
        }
    }

    // Фоллбэк методы (на случай ошибок библиотеки)
    _generateFallbackKeyPair() {
        const privateKey = this._generateRandomHex(64);
        const publicKey = this.hash(privateKey).substring(0, 64);
        
        return {
            privateKey,
            publicKey,
            algorithm: 'GOST-R-34.10-2012-FALLBACK'
        };
    }

    _fallbackHash(data) {
        // Простая эмуляция хэша для демо
        let hash = '';
        for (let i = 0; i < 64; i++) {
            const charCode = data.charCodeAt(i % data.length) ^ i;
            hash += charCode.toString(16).padStart(2, '0');
        }
        return hash;
    }

    _fallbackSign(message, privateKey) {
        const hash = this._fallbackHash(message);
        const signature = this._fallbackHash(hash + privateKey).substring(0, 128);
        
        return {
            signature,
            hash,
            algorithm: 'GOST-FALLBACK',
            timestamp: Date.now()
        };
    }

    _fallbackVerify(message, signatureData, publicKey) {
        const { signature } = signatureData;
        const hash = this._fallbackHash(message);
        const expected = this._fallbackHash(hash + publicKey).substring(0, 128);
        return signature === expected;
    }

    _generateRandomHex(length) {
        let result = '';
        const chars = '0123456789abcdef';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

module.exports = RussianCrypto;