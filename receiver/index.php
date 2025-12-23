<!DOCTYPE html>
<html>

<head>
    <title>Получатель ГОСТ</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }

        .app-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            max-width: 1800px;
            margin: 0 auto;
        }

        .container {
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            height: calc(100vh - 40px);
            display: flex;
            flex-direction: column;
        }

        .header {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 30px;
            border-left: 6px solid;
        }

        .sender .header {
            border-left-color: #4CAF50;
        }

        .receiver .header {
            border-left-color: #2196F3;
        }

        h1 {
            font-size: 28px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-bar {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }

        .status-connected {
            color: #4CAF50;
            font-weight: bold;
            padding: 5px 15px;
            background: #e8f5e9;
            border-radius: 20px;
        }

        .status-disconnected {
            color: #f44336;
            font-weight: bold;
            padding: 5px 15px;
            background: #ffebee;
            border-radius: 20px;
        }

        /* Панель онлайн пользователей */
        .online-panel {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }

        .user-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
        }

        .user-badge {
            background: white;
            padding: 8px 15px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        /* Сообщения */
        .messages-container {
            flex: 1;
            overflow-y: auto;
            background: #f9f9f9;
            border-radius: 15px;
            padding: 20px;
            margin-top: 20px;
        }

        .message-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
            transition: transform 0.2s;
        }

        .message-card:hover {
            transform: translateY(-2px);
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }

        .sender {
            font-weight: bold;
            font-size: 16px;
        }

        .sender-you {
            color: #4CAF50;
        }

        .sender-other {
            color: #2196F3;
        }

        .timestamp {
            color: #666;
            font-size: 12px;
            background: #f5f5f5;
            padding: 3px 8px;
            border-radius: 10px;
        }

        .message-text {
            padding: 15px;
            background: #f9f9f9;
            border-radius: 10px;
            margin: 15px 0;
            font-size: 16px;
            line-height: 1.5;
        }

        .message-encrypted {
            border-left: 5px solid #ff9800;
            background: #fff3e0;
        }

        .message-system {
            border-left: 5px solid #9c27b0;
            background: #f3e5f5;
        }

        /* Кнопки */
        .button-group {
            display: flex;
            gap: 15px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        button {
            padding: 15px 30px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            border-radius: 10px;
            font-weight: bold;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 200px;
            justify-content: center;
        }

        .btn-primary {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(76, 175, 80, 0.3);
        }

        .btn-secondary {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
        }

        .btn-secondary:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(33, 150, 243, 0.3);
        }

        .btn-warning {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            color: white;
        }

        .btn-danger {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            color: white;
        }

        /* Форма ввода */
        textarea {
            width: 100%;
            min-height: 120px;
            padding: 20px;
            font-size: 16px;
            border: 2px solid #ddd;
            border-radius: 12px;
            resize: vertical;
            font-family: inherit;
            margin: 15px 0;
            transition: border-color 0.3s;
        }

        textarea:focus {
            outline: none;
            border-color: #4CAF50;
        }

        select {
            width: 100%;
            padding: 15px;
            font-size: 16px;
            border: 2px solid #ddd;
            border-radius: 10px;
            margin: 10px 0;
            background: white;
        }

        /* Ключи */
        .key-display {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 10px;
            margin: 10px 0;
            font-size: 13px;
            overflow-x: auto;
            font-family: monospace;
            word-break: break-all;
        }

        /* Анимации */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message-card {
            animation: fadeIn 0.3s ease-out;
        }

        /* Скроллбар */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #555;
        }

        /* Адаптивность */
        @media (max-width: 1200px) {
            .app-container {
                grid-template-columns: 1fr;
                gap: 20px;
            }

            .container {
                height: auto;
                min-height: 700px;
            }
        }
    </style>
</head>

<body>
   <div class="app-container">
        <div class="container receiver">
            <div class="header">
                <h1>📥 Получатель (Демо ГОСТ)</h1>
                <div class="status-bar">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div>
                            <strong>Статус:</strong> 
                            <span id="status" class="status-disconnected">Подключение...</span>
                        </div>
                        <!-- <div>
                            <strong>Онлайн:</strong> 
                            <span id="onlineCount">0</span>
                        </div>
                        <div>
                            <strong>Режим:</strong> 
                            <span id="mode">демо</span>
                        </div> -->
                    </div>
                </div>
            </div>

            <div class="panel">
                <h3>👥 Онлайн пользователи</h3>
                <!-- <div class="user-list" id="onlineUsers">
                    <div class="user-badge">Загрузка...</div>
                </div> -->
            </div>

            <div class="messages-container" id="messages">

            </div>
        </div>
    </div>


    <script>
        let ws = null;
        let myId = null;
        let onlineCount = 0;

        connectWebSocket();

        function connectWebSocket() {
            ws = new WebSocket('ws://localhost:8082');

            ws.onopen = () => {
                setStatus('✅ Подключено', 'green');
                addMessage('✅ Подключено к серверу ГОСТ', 'system');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Получено от сервера:', data);

                    // Обработка разных типов сообщений
                    switch (data.type) {
                        case 'system':
                            handleSystemMessage(data);
                            break;

                        case 'message':
                            // Обычное текстовое сообщение
                            addMessage(`👤 ${data.fromName}: ${data.text}`,
                                data.encrypted ? 'encrypted' : 'message');
                            break;

                        case 'encrypted_message':
                            handleEncryptedMessage(data);
                            break;

                        case 'online_list':
                            onlineCount = data.count;
                            document.getElementById('onlineCount').textContent = onlineCount;
                            break;

                        case 'decryption_result':
                            addMessage(`🔓 ${data.fromName}: ${data.message}`, 'encrypted');
                            break;

                        case 'error':
                            addMessage(`❌ Ошибка: ${data.message}`, 'error');
                            break;

                        case 'test_result':
                            addMessage(`🧪 Тест ГОСТ: ${data.message}`, 'system');
                            break;

                        default:
                            // Если неизвестный тип, показываем как есть
                            addMessage(`📨 ${JSON.stringify(data)}`, 'system');
                    }

                } catch (e) {
                    console.error('Ошибка парсинга:', e);
                    // Если не JSON, показываем сырой текст
                    addMessage(`📨 ${event.data.substring(0, 100)}`, 'system');
                }
            };

            ws.onclose = () => {
                setStatus('❌ Отключено', 'red');
                addMessage('❌ Соединение с сервером закрыто', 'system');
            };
        }

        function handleSystemMessage(data) {
            if (data.event === 'connected') {
                myId = data.clientId;
                const mode = data.mode || 'демо';
                document.getElementById('mode').textContent = mode;

                addMessage(`✅ Подключено как ${data.clientId} (режим: ${mode})`, 'system');
            }

            if (data.message) {
                addMessage(`📢 ${data.message}`, 'system');
            }
        }

        function handleEncryptedMessage(data) {
            // Показываем зашифрованное сообщение с кнопкой расшифровки
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message encrypted';
            msgDiv.innerHTML = `
                <strong>🔒 Зашифрованное от ${data.fromName}</strong>
                <div class="info">ID: ${data.from} | Время: ${new Date(data.timestamp).toLocaleTimeString()}</div>
                <button onclick="decryptMessage('${data.from}', '${escape(JSON.stringify(data.encrypted))}')"
                        style="margin-top: 5px; padding: 3px 8px; background: #dc3545; color: white; border: none; border-radius: 3px;">
                    🔓 Расшифровать
                </button>
            `;

            document.getElementById('messages').appendChild(msgDiv);
            scrollToBottom();
        }

        function decryptMessage(fromId, encryptedJson) {
            try {
                const encryptedData = JSON.parse(unescape(encryptedJson));

                ws.send(JSON.stringify({
                    type: 'command',
                    command: 'decrypt',
                    from: fromId,
                    encryptedData: encryptedData
                }));

                addMessage('⏳ Отправлен запрос на расшифровку...', 'system');
            } catch (e) {
                addMessage(`❌ Ошибка расшифровки: ${e.message}`, 'error');
            }
        }

        function testGOST() {
            ws.send(JSON.stringify({
                type: 'command',
                command: 'test_gost'
            }));
        }

        function setName() {
            const name = document.getElementById('myName').value.trim();
            if (name) {
                ws.send(JSON.stringify({
                    type: 'set_name',
                    name: name
                }));
                addMessage(`🔄 Запрос на смену имени отправлен...`, 'system');
            }
        }

        function clearMessages() {
            document.getElementById('messages').innerHTML = '';
            addMessage('🧹 Сообщения очищены', 'system');
        }

        function addMessage(text, type = 'message') {
            const messagesDiv = document.getElementById('messages');
            const msgDiv = document.createElement('div');

            msgDiv.className = `message ${type}`;
            msgDiv.innerHTML = `
                <div>${text}</div>
                <div class="info">${new Date().toLocaleTimeString()}</div>
            `;

            messagesDiv.appendChild(msgDiv);
            scrollToBottom();
        }

        function setStatus(text, color) {
            const statusEl = document.getElementById('status');
            statusEl.textContent = text;
            statusEl.style.color = color;
        }

        function scrollToBottom() {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Экранирование для безопасной передачи JSON в атрибутах
        function escape(str) {
            return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
        }

        // Авто-подключение при ошибке
        setInterval(() => {
            if (!ws || ws.readyState === WebSocket.CLOSED) {
                console.log('Попытка переподключения...');
                connectWebSocket();
            }
        }, 5000);
    </script>
</body>

</html>