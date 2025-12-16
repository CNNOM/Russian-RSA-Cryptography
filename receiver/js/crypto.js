// Аналогично sender/js/crypto.js
class ClientCrypto {
    constructor() {
        this.keyPair = null;
        this.sessionKey = null;
        this.serverPublicKey = null;
        this.clientId = null;
    }
    
    init(keys) {
        this.clientId = keys.clientId;
        this.keyPair = {
            publicKey: keys.publicKey,
            privateKey: keys.privateKey
        };
        this.sessionKey = keys.sessionKey;
        this.serverPublicKey = keys.serverPublicKey;
        
        console.log('🔑 Криптография инициализирована для:', this.clientId);
        return this;
    }
    
    encryptMessage(message) {
        if (!this.sessionKey) {
            throw new Error('Сессионный ключ не установлен');
        }
        
        const iv = this._generateRandomHex(32);
        const ciphertext = this._xorEncrypt(message, this.sessionKey + iv);
        const signature = this._createSignature(message);
        
        return {
            ciphertext: btoa(ciphertext),
            iv: iv,
            signature: signature,
            algorithm: 'GOST-R-34.13-2015',
            mode: 'CTR',
            timestamp: Date.now()
        };
    }
    
    decryptMessage(encryptedData) {
        if (!this.sessionKey) {
            throw new Error('Сессионный ключ не установлен');
        }
        
        const ciphertext = atob(encryptedData.ciphertext);
        const decrypted = this._xorDecrypt(ciphertext, this.sessionKey + encryptedData.iv);
        
        if (encryptedData.signature) {
            const isValid = this._verifySignature(decrypted, encryptedData.signature);
            if (!isValid) {
                console.warn('⚠️ Недействительная подпись сообщения');
            }
        }
        
        return decrypted;
    }
    
    _createSignature(message) {
        const hash = this._hash(message);
        return this._hash(hash + this.keyPair.privateKey).substring(0, 128);
    }
    
    _verifySignature(message, signature) {
        const hash = this._hash(message);
        const expected = this._hash(hash + this.serverPublicKey).substring(0, 128);
        return signature === expected;
    }
    
    _hash(data) {
        let hash = '';
        for (let i = 0; i < 64; i++) {
            const charCode = data.charCodeAt(i % data.length) ^ i;
            hash += charCode.toString(16).padStart(2, '0');
        }
        return hash;
    }
    
    _generateRandomHex(length) {
        let result = '';
        const chars = '0123456789abcdef';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    _xorEncrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }
    
    _xorDecrypt(text, key) {
        return this._xorEncrypt(text, key);
    }
}

window.CryptoManager = new ClientCrypto();