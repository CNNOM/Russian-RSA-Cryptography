// gost-utils.js - Адаптер для gost-crypto
const gostCrypto = require('gost-crypto');

// Это не класс, а набор утилит для работы с gost-crypto
const GOSTUtils = {
    // Проверка доступности
    isAvailable() {
        return !!gostCrypto && !!gostCrypto.subtle;
    },
    
    // Получить subtle API
    get subtle() {
        return gostCrypto.subtle;
    },
    
    // Получить getRandomValues
    getRandomValues(array) {
        return gostCrypto.getRandomValues(array);
    },
    
    // Генерация ключей (возвращает промис)
    async generateKeyPair() {
        if (!this.isAvailable()) {
            throw new Error('gost-crypto не доступен');
        }
        
        try {
            // Пытаемся использовать ГОСТ алгоритмы
            const algorithm = {
                name: 'GOST R 34.10-2012',
                namedCurve: 'S-256-A'
            };
            
            console.log('Попытка генерации ключей ГОСТ...');
            
            const keyPair = await gostCrypto.subtle.generateKey(
                algorithm,
                true, // extractable
                ['sign', 'verify']
            );
            
            // Экспортируем в JWK
            const publicKeyJwk = await gostCrypto.subtle.exportKey('jwk', keyPair.publicKey);
            const privateKeyJwk = await gostCrypto.subtle.exportKey('jwk', keyPair.privateKey);
            
            return {
                success: true,
                publicKey: JSON.stringify(publicKeyJwk),
                privateKey: JSON.stringify(privateKeyJwk),
                keyPair: keyPair
            };
            
        } catch (error) {
            console.error('Ошибка генерации ключей ГОСТ:', error.message);
            
            // Возвращаем демо-ключи
            return {
                success: false,
                demo: true,
                publicKey: JSON.stringify({
                    kty: "EC-GOST-DEMO",
                    error: error.message,
                    note: "Используйте браузер для реальных ГОСТ ключей"
                }),
                privateKey: JSON.stringify({
                    kty: "EC-GOST-DEMO",
                    note: "Приватный ключ должен генерироваться в браузере"
                })
            };
        }
    },
    
    // Хэширование (имитация Стрибог)
    async hash(data, algorithm = 'SHA-256') {
        if (!this.isAvailable()) {
            // Фолбэк
            const buffer = Buffer.from(data);
            const hash = require('crypto').createHash('sha256').update(buffer).digest('hex');
            return {
                hash: hash,
                algorithm: 'SHA-256 (fallback)',
                demo: true
            };
        }
        
        try {
            // Пробуем разные алгоритмы ГОСТ
            const algorithms = [
                'GOST R 34.11-2012',
                'GOST-3411',
                'STRIBOG-256'
            ];
            
            let result;
            for (const alg of algorithms) {
                try {
                    const buffer = typeof data === 'string' ? 
                        Buffer.from(data, 'utf8') : 
                        Buffer.from(data);
                    
                    result = await gostCrypto.subtle.digest(
                        { name: alg, length: 256 },
                        buffer
                    );
                    
                    return {
                        hash: Buffer.from(result).toString('hex'),
                        algorithm: alg,
                        success: true
                    };
                    
                } catch (e) {
                    continue;
                }
            }
            
            throw new Error('Ни один ГОСТ алгоритм хэширования не поддерживается');
            
        } catch (error) {
            console.error('Ошибка хэширования:', error.message);
            throw error;
        }
    },
    
    // Получить информацию о библиотеке
    getInfo() {
        return {
            available: this.isAvailable(),
            hasSubtle: !!gostCrypto.subtle,
            hasGetRandomValues: !!gostCrypto.getRandomValues,
            hasGostEngine: !!gostCrypto.gostEngine,
            version: '1.1.4',
            api: 'WebCrypto',
            note: 'Полная поддержка ГОСТ требует gostEngine или браузера'
        };
    },
    
    // Инструкции для браузера
    getBrowserInstructions() {
        return `
            // 1. Подключите библиотеку в HTML:
            <script src="https://unpkg.com/gost-crypto/dist/gostCrypto.min.js"></script>
            
            // 2. Проверьте доступность:
            if (window.gostCrypto && window.gostCrypto.subtle) {
                console.log('gost-crypto доступен');
            }
            
            // 3. Генерация ключей ГОСТ:
            async function generateKeys() {
                return await window.gostCrypto.subtle.generateKey(
                    {
                        name: "GOST R 34.10-2012",
                        namedCurve: "S-256-A"
                    },
                    true,
                    ["sign", "verify", "deriveKey", "deriveBits"]
                );
            }
            
            // 4. Экспорт ключа:
            async function exportKey(key) {
                return await window.gostCrypto.subtle.exportKey('jwk', key);
            }
        `;
    }
};

// Экспортируем объект, а не класс
module.exports = GOSTUtils;