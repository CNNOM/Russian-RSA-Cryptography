<!DOCTYPE html>
<html>
<head>
    <title>Получатель ГОСТ</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        #messages { 
            border: 1px solid #ccc; 
            padding: 15px; 
            height: 400px; 
            overflow-y: auto;
            margin-top: 10px;
            background: #f9f9f9;
        }
        .message { 
            padding: 8px; 
            margin: 5px 0; 
            border-left: 3px solid #007bff;
            background: white;
        }
        .system { 
            border-left-color: #28a745; 
            background: #f0fff4;
        }
        .encrypted { 
            border-left-color: #dc3545;
            background: #fff0f0;
        }
        .error { 
            border-left-color: #ffc107;
            background: #fffdf0;
        }
        .info {
            color: #666;
            font-size: 12px;
            margin-top: 3px;
        }
    </style>
</head>
<body>
    <h1>📥 Получатель (Демо ГОСТ)</h1>
    
    <div style="margin-bottom: 15px; padding: 10px; background: #f0f8ff; border-radius: 5px;">
        <strong>Статус:</strong> <span id="status">Подключение...</span> |
        <strong>Онлайн:</strong> <span id="onlineCount">0</span> |
        <strong>Режим:</strong> <span id="mode">демо</span>
    </div>
    
    <h3>💬 Сообщения:</h3>
    <div id="messages"></div>

    
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
                    switch(data.type) {
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