<!DOCTYPE html>
<html>

<head>
    <title>Отправитель с ГОСТ шифрованием</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
        }

        .header {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            border-left: 5px solid #4CAF50;
        }

        textarea {
            width: 100%;
            height: 120px;
            padding: 15px;
            font-size: 16px;
            border: 2px solid #ddd;
            border-radius: 8px;
            resize: vertical;
            font-family: monospace;
            margin: 10px 0;
        }

        .crypto-status {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-family: monospace;
            font-size: 14px;
        }

        .status-connected {
            color: #4CAF50;
            font-weight: bold;
        }

        .status-disconnected {
            color: #f44336;
            font-weight: bold;
        }

        .key-display {
            background: #e8f5e9;
            padding: 10px;
            border-radius: 5px;
            margin: 5px 0;
            font-size: 12px;
            overflow-x: auto;
            font-family: monospace;
        }

        button {
            padding: 15px 30px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 16px;
            border-radius: 8px;
            margin-top: 15px;
            font-weight: bold;
            transition: transform 0.2s;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
        }

        .message-log {
            margin-top: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
            max-height: 200px;
            overflow-y: auto;
        }

        .message-item {
            padding: 8px;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
        }

        .timestamp {
            color: #666;
            font-size: 12px;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Отправитель с ГОСТ шифрованием</h1>
            <p>Порт: 8080 | Алгоритмы: ГОСТ Р 34.10-2012, ГОСТ Р 34.11-2012, ГОСТ Р 34.13-2015</p>
        </div>

        <div class="crypto-status">
            Статус: <span id="cryptoStatus" class="status-disconnected">❌ Криптография не инициализирована</span>
        </div>

        <div id="keyInfo" style="display: none;">
            <h3>🔑 Криптографические ключи:</h3>
            <div class="key-display">
                <strong>ID клиента:</strong> <span id="clientId"></span>
            </div>
            <div class="key-display">
                <strong>Публичный ключ:</strong> <span id="publicKey"></span>
            </div>
            <div class="key-display">
                <strong>Приватный ключ:</strong> <span id="sessionKey"></span>
            </div>
        </div>

        <h3>✉️ Введите сообщение:</h3>
        <textarea id="message" placeholder="Введите секретное сообщение для шифрования..."></textarea>

        <div style="display: flex; gap: 10px;">
            <button onclick="encryptAndSend()">🔒 Зашифровать и отправить</button>
            <button onclick="showEncryptionInfo()" style="background: #2196F3;">ℹ️ Инфо о шифровании</button>
        </div>

        <div class="message-log" id="messageLog">
            <h4>📋 Журнал сообщений:</h4>
        </div>
    </div>

    <!-- Подключаем криптографию -->
    <script src="js/crypto.js"></script>

    <script>
        let ws = null;
        let cryptoInitialized = false;

        // Получаем адрес WebSocket сервера из переменной
        // Внутри Docker сети используем имя сервиса, снаружи - localhost
        const wsHost = window.location.hostname === 'localhost' ? 'localhost' : 'websocket';
        const wsUrl = `ws://${wsHost}:8082`;

        console.log('Попытка подключения к:', wsUrl);

        function connectWebSocket() {
            console.log('🔄 Подключение к WebSocket...');

            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('✅ Подключено к WebSocket серверу:', wsUrl);
                updateStatus('Подключено к серверу шифрования');
            };

            ws.onmessage = (event) => {
                console.log('📨 Получено сообщение от сервера');
                try {
                    const data = JSON.parse(event.data);
                    console.log('Тип сообщения:', data.type);

                    if (data.type === 'init') {
                        console.log('🔑 Инициализация криптографии с ключами');

                        if (typeof window.CryptoManager !== 'undefined') {
                            window.CryptoManager.init(data);
                            cryptoInitialized = true;

                            document.getElementById('cryptoStatus').className = 'status-connected';
                            document.getElementById('cryptoStatus').textContent = '✅ Криптография инициализирована';

                            document.getElementById('keyInfo').style.display = 'block';
                            document.getElementById('clientId').textContent = data.clientId.substring(0, 20) + '...';
                            document.getElementById('publicKey').textContent = data.publicKey.substring(0, 20) + '...';
                            document.getElementById('sessionKey').textContent = data.sessionKey.substring(0, 20) + '...';

                            updateStatus('Криптографические ключи получены');
                            console.log('✅ Криптография успешно инициализирована');
                        } else {
                            console.error('❌ CryptoManager не найден');
                            updateStatus('Ошибка: CryptoManager не загружен');
                        }

                    } else if (data.type === 'encrypted_message') {
                        console.log('📦 Получено зашифрованное сообщение');
                        if (cryptoInitialized) {
                            try {
                                const decrypted = window.CryptoManager.decryptMessage(data.payload);
                                const messageObj = JSON.parse(decrypted);

                                updateStatus(`Получено: ${messageObj.text.substring(0, 30)}...`);
                                console.log('✅ Сообщение расшифровано:', messageObj);
                            } catch (error) {
                                console.error('❌ Ошибка расшифровки:', error);
                            }
                        }
                    } else if (data.type === 'pong') {
                        console.log('❤️ Heartbeat получен');
                    } else if (data.type === 'error') {
                        console.error('❌ Ошибка от сервера:', data.error);
                        updateStatus(`Ошибка сервера: ${data.error}`);
                    }

                } catch (error) {
                    console.error('❌ Ошибка парсинга JSON:', error);
                    console.log('Полученные данные:', event.data.substring(0, 100));
                }
            };

            ws.onerror = (error) => {
                console.error('❌ WebSocket ошибка:', error);
                document.getElementById('cryptoStatus').className = 'status-disconnected';
                document.getElementById('cryptoStatus').textContent = '❌ Ошибка подключения';
                updateStatus(`Ошибка подключения к ${wsUrl}`);
            };

            ws.onclose = (event) => {
                console.log('🔌 WebSocket соединение закрыто, код:', event.code, 'причина:', event.reason);
                cryptoInitialized = false;
                document.getElementById('cryptoStatus').className = 'status-disconnected';
                document.getElementById('cryptoStatus').textContent = '❌ Соединение закрыто';
                updateStatus('Соединение закрыто, переподключение через 5 секунд...');

                // Автопереподключение через 5 секунд
                setTimeout(connectWebSocket, 5000);
            };
        }

        function encryptAndSend() {
            const message = document.getElementById('message').value.trim();
            if (!message) {
                alert('Введите сообщение!');
                return;
            }

            if (!cryptoInitialized) {
                alert('Криптография не инициализирована. Подождите подключения...');
                return;
            }

            if (!ws || ws.readyState !== WebSocket.OPEN) {
                alert('Нет подключения к серверу');
                return;
            }

            try {
                const encrypted = window.CryptoManager.encryptMessage(message);

                ws.send(JSON.stringify({
                    type: 'encrypted_message',
                    payload: encrypted,
                    timestamp: Date.now()
                }));

                updateStatus(`Отправлено зашифрованное сообщение`);
                console.log('✅ Сообщение отправлено:', encrypted);

                document.getElementById('message').value = '';

            } catch (error) {
                console.error('❌ Ошибка шифрования:', error);
                alert('Ошибка шифрования сообщения: ' + error.message);
            }
        }

        function updateStatus(text) {
            const log = document.getElementById('messageLog');
            const item = document.createElement('div');
            item.className = 'message-item';

            const time = new Date().toLocaleTimeString();
            item.innerHTML = `<span class="timestamp">[${time}]</span> ${text}`;

            log.appendChild(item);
            log.scrollTop = log.scrollHeight;
        }

        // Проверяем загружен ли CryptoManager
        function checkCryptoManager() {
            if (typeof window.CryptoManager === 'undefined') {
                console.error('❌ CryptoManager не загружен!');
                updateStatus('Ошибка: файл crypto.js не загружен');
                return false;
            }
            console.log('✅ CryptoManager загружен');
            return true;
        }

        // Запускаем при загрузке
        window.onload = function () {
            console.log('🚀 Страница загружена');

            if (checkCryptoManager()) {
                connectWebSocket();
            }
        };
    </script>
</body>

</html>