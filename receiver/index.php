<!DOCTYPE html>
<html>

<head>
    <title>Получатель с ГОСТ шифрованием</title>
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
            border-left: 5px solid #2196F3;
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

        .messages-container {
            max-height: 500px;
            overflow-y: auto;
            margin-top: 20px;
        }

        .message-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .sender {
            font-weight: bold;
            color: #2196F3;
        }

        .timestamp {
            color: #666;
            font-size: 12px;
        }

        .message-text {
            padding: 10px;
            background: #f9f9f9;
            border-radius: 5px;
            margin: 10px 0;
            font-size: 16px;
        }

        .crypto-info {
            background: #e3f2fd;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 12px;
            font-family: monospace;
        }

        .signature-valid {
            color: #4CAF50;
            font-weight: bold;
        }

        .signature-invalid {
            color: #f44336;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>🔓 Получатель с ГОСТ шифрованием</h1>
            <p>Порт: 8081 | Режим: Расшифровка и проверка подписей</p>
        </div>

        <div class="crypto-status">
            Статус: <span id="cryptoStatus" class="status-disconnected">❌ Ожидание инициализации...</span>
        </div>

        <h3>📨 Полученные сообщения:</h3>
        <div class="messages-container" id="messagesContainer">
            <div style="text-align: center; padding: 20px; color: #666;">
                Ожидание зашифрованных сообщений...
            </div>
        </div>
    </div>

    <script src="js/receiver.js"></script>

    <script>
        let ws = null;
        let cryptoInitialized = false;

        // Определяем адрес WebSocket сервера
        const wsHost = window.location.hostname === 'localhost' ? 'localhost' : 'websocket';
        const wsUrl = `ws://${wsHost}:8082`;

        console.log('Подключение к:', wsUrl);

        function connectWebSocket() {
            console.log('🔄 Подключение к WebSocket...');

            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('✅ Подключено к WebSocket серверу');
                updateStatus('Подключено к серверу шифрования');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 Получено сообщение от сервера:', data.type);

                    if (data.type === 'init') {
                        if (typeof window.CryptoManager !== 'undefined') {
                            window.CryptoManager.init(data);
                            cryptoInitialized = true;

                            document.getElementById('cryptoStatus').className = 'status-connected';
                            document.getElementById('cryptoStatus').textContent = '✅ Криптография инициализирована';

                            updateStatus('Криптографические ключи получены');
                            console.log('✅ Криптография инициализирована');

                            // Отправляем статус подключения
                            displayMessage({
                                text: 'Подключено к серверу шифрования. Ключи ГОСТ получены.',
                                sender: 'system',
                                timestamp: Date.now(),
                                signatureValid: true,
                                algorithm: 'GOST-R-34.10-2012'
                            });
                        }

                    } else if (data.type === 'encrypted_message') {
                        console.log('📦 Получено зашифрованное сообщение от:', data.sender);
                        processEncryptedMessage(data);

                    } else if (data.type === 'pong') {
                        console.log('❤️ Heartbeat получен');

                    } else if (data.type === 'error') {
                        console.error('❌ Ошибка от сервера:', data.error);
                        updateStatus(`Ошибка сервера: ${data.error}`);

                        displayMessage({
                            text: `Ошибка сервера: ${data.error}`,
                            sender: 'server',
                            timestamp: data.timestamp || Date.now(),
                            signatureValid: false,
                            algorithm: 'error'
                        });
                    }

                } catch (error) {
                    console.error('❌ Ошибка обработки сообщения:', error);
                    console.log('Полученные данные:', event.data);

                    // Показываем сырое сообщение при ошибке парсинга
                    displayMessage({
                        text: `Сырые данные: ${event.data.substring(0, 100)}...`,
                        sender: 'system',
                        timestamp: Date.now(),
                        signatureValid: false,
                        algorithm: 'raw'
                    });
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                document.getElementById('cryptoStatus').className = 'status-disconnected';
                document.getElementById('cryptoStatus').textContent = '❌ Ошибка подключения';
                updateStatus('Ошибка подключения к серверу шифрования');
            };

            ws.onclose = () => {
                console.log('WebSocket соединение закрыто');
                cryptoInitialized = false;
                document.getElementById('cryptoStatus').className = 'status-disconnected';
                document.getElementById('cryptoStatus').textContent = '❌ Соединение закрыто';
                updateStatus('Соединение закрыто, переподключение...');

                setTimeout(connectWebSocket, 5000);
            };
        }

        function processEncryptedMessage(data) {
            try {
                console.log('📨 Получено зашифрованное сообщение:', data);

                if (!cryptoInitialized) {
                    console.warn('Криптография не инициализирована');
                    updateStatus('❌ Криптография не инициализирована');
                    return;
                }

                if (!data.payload) {
                    console.warn('Нет payload в сообщении');
                    updateStatus('❌ Нет данных в сообщении');
                    return;
                }

                // Расшифровываем сообщение
                const decrypted = window.CryptoManager.decryptMessage(data.payload);
                console.log('✅ Расшифрованное сообщение:', decrypted);

                // Создаем объект сообщения для отображения
                const messageObj = {
                    text: decrypted.text || 'Пустое сообщение',
                    sender: decrypted.sender || data.sender || 'unknown',
                    timestamp: decrypted.timestamp || data.timestamp || Date.now(),
                    signatureValid: decrypted.signatureValid || false,
                    algorithm: decrypted.algorithm || 'GOST-R-34.10-2012',
                    // Добавляем информацию о подписи для отображения
                    signatureInfo: decrypted.signature ?
                        `Подпись: ${decrypted.signature.signature?.substring?.(0, 20) || decrypted.signature.substring?.(0, 20) || 'нет'}...` :
                        'Нет подписи'
                };

                // Отображаем сообщение
                displayMessage(messageObj);

            } catch (error) {
                console.error('❌ Ошибка обработки сообщения:', error);
                updateStatus(`❌ Ошибка обработки: ${error.message}`);

                // Показываем сырое сообщение при ошибке
                displayMessage({
                    text: `Ошибка обработки: ${error.message}`,
                    sender: 'system',
                    timestamp: Date.now(),
                    signatureValid: false,
                    algorithm: 'error'
                });
            }
        }

        // Обновляем функцию displayMessage для отображения информации о подписи
        function displayMessage(messageObj) {
            const messagesContainer = document.getElementById('messagesContainer');

            // Определяем статус подписи
            let signatureStatus = '❓ Не проверена';
            let signatureClass = '';

            if (messageObj.signatureValid === true) {
                signatureStatus = '✓ Проверена (ГОСТ)';
                signatureClass = 'signature-valid';
            } else if (messageObj.signatureValid === false) {
                signatureStatus = '✗ Недействительна';
                signatureClass = 'signature-invalid';
            }

            const messageCard = document.createElement('div');
            messageCard.className = 'message-card';
            messageCard.innerHTML = `
        <div class="message-header">
            <span class="sender">👤 ${escapeHtml(messageObj.sender)}</span>
            <span class="timestamp">${new Date(messageObj.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-text">${escapeHtml(messageObj.text)}</div>
        <div class="crypto-info">
            🔐 <strong>Шифрование ${escapeHtml(messageObj.algorithm)}:</strong><br>
            Подпись: <span class="${signatureClass}">${signatureStatus}</span>
            ${messageObj.signatureInfo ? `<br>ℹ️ ${escapeHtml(messageObj.signatureInfo)}` : ''}
        </div>
    `;

            // Очищаем placeholder если есть
            if (messagesContainer.firstChild &&
                messagesContainer.firstChild.style &&
                messagesContainer.firstChild.style.textAlign === 'center') {
                messagesContainer.innerHTML = '';
            }

            messagesContainer.insertBefore(messageCard, messagesContainer.firstChild);

            // Ограничиваем количество сообщений
            if (messagesContainer.children.length > 10) {
                messagesContainer.removeChild(messagesContainer.lastChild);
            }

            console.log('📄 Сообщение отображено:', messageObj);
        }
        
        // Обновляем функцию escapeHtml
        function escapeHtml(text) {
            if (text === null || text === undefined) return '';
            const div = document.createElement('div');
            div.textContent = text.toString();
            return div.innerHTML;
        }

        function updateStatus(text) {
            const messagesContainer = document.getElementById('messagesContainer');
            const statusDiv = document.createElement('div');
            statusDiv.className = 'message-card';
            statusDiv.innerHTML = `<div style="color: #666; text-align: center;">ℹ️ ${text}</div>`;

            if (messagesContainer.firstChild &&
                messagesContainer.firstChild.style &&
                messagesContainer.firstChild.style.textAlign === 'center') {
                messagesContainer.innerHTML = '';
            }

            messagesContainer.insertBefore(statusDiv, messagesContainer.firstChild);
        }

        // Запускаем
        window.onload = function () {
            console.log('Страница получателя загружена');

            if (typeof window.CryptoManager !== 'undefined') {
                connectWebSocket();
            } else {
                console.error('CryptoManager не загружен!');
                updateStatus('Ошибка: crypto.js не загружен');
            }
        };
    </script>
</body>

</html>