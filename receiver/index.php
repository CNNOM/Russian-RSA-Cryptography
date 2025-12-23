<!DOCTYPE html>
<html>

<head>
    <title>Получатель ГОСТ</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <div class="app-container">
        <div class="container receiver">
            <div class="header">
                <h1>📥 Получатель</h1>
                <div class="status-bar">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div>
                            <strong>Статус:</strong>
                            <span id="status" class="status-disconnected">Подключение...</span>
                        </div>
                        <div>
                            <strong>Онлайн:</strong>
                            <span id="onlineCount">0</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="panel">
                <h3>👥 Онлайн пользователь</h3>
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

                    // Сначала обрабатываем системные сообщения (type: system)
                    if (data.type === 'system') {
                        handleSystemMessage(data);
                        return;
                    }

                    // Затем обрабатываем остальные типы
                    switch (data.type) {
                        case 'message':
                            // Обычное текстовое сообщение
                            addMessage(`👤 ${data.fromName || data.from}: ${data.text}`,
                                data.encrypted ? 'encrypted' : 'message');
                            break;

                        case 'encrypted_message':
                            handleEncryptedMessage(data);
                            break;

                        case 'online_list':
                            onlineCount = data.count || 0;
                            document.getElementById('onlineCount').textContent = onlineCount;
                            updateOnlineUsers(data.users || []);
                            break;

                        case 'decryption_result':
                            addMessage(`🔓 ${data.fromName || data.from}: ${data.message || data.text}`, 'decrypted');
                            break;

                        case 'error':
                            addMessage(`❌ Ошибка: ${data.message || 'Неизвестная ошибка'}`, 'error');
                            break;

                        case 'test_result':
                            addMessage(`🧪 Тест ГОСТ: ${data.message || data.result}`, 'system');
                            break;

                        case 'user_joined':
                            addMessage(`🟢 Пользователь ${data.name || data.clientId} присоединился`, 'system');
                            break;

                        case 'user_left':
                            addMessage(`🔴 Пользователь ${data.name || data.clientId} вышел`, 'system');
                            break;

                        default:
                            // Если пришло что-то неизвестное, показываем в улучшенном формате
                            if (data.type && data.message) {
                                addMessage(`📨 ${data.type}: ${data.message}`, 'system');
                            } else if (data.message) {
                                addMessage(`📨 ${data.message}`, 'system');
                            } else {
                                // Только в крайнем случае показываем JSON
                                const shortJson = JSON.stringify(data).substring(0, 150);
                                addMessage(`📨 Неизвестный формат данных`, 'system');
                            }
                    }

                } catch (e) {
                    console.error('Ошибка парсинга:', e);
                    // Если не JSON, показываем сырой текст
                    const text = event.data.substring(0, 100);
                    addMessage(`📨 Неизвестное сообщение: ${text}`, 'system');
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

                addMessage(`✅ Успешное подключение к серверу`, 'system');
                addMessage(`👤 Ваш ID: ${data.clientId}`, 'system');
                // addMessage(`⚙️ Режим работы: ${mode}`, 'system');

                // Обновляем статистику, если есть
                if (data.online) {
                    onlineCount = data.online;
                    document.getElementById('onlineCount').textContent = onlineCount;
                }
            }
            else if (data.event === 'disconnected') {
                addMessage(`⚠️ ${data.message || 'Соединение разорвано'}`, 'system');
            }
            else if (data.message) {
                addMessage(`📢 ${data.message}`, 'system');
            }
            else if (data.clientId) {
                // Сообщения о других пользователях
                if (data.event === 'user_connected') {
                    addMessage(`🟢 Пользователь ${data.clientId} подключился`, 'system');
                }
                else if (data.event === 'user_disconnected') {
                    addMessage(`🔴 Пользователь ${data.clientId} отключился`, 'system');
                }
            }
        }

        function updateOnlineUsers(users) {
            const panel = document.querySelector('.panel');
            // if (panel) {
            //     let usersHtml = '<h3>👥 Онлайн пользователи</h3>';
            //     if (users.length > 0) {
            //         usersHtml += '<div class="user-list">';
            //         users.forEach(user => {
            //             const isYou = user.id === myId;
            //             usersHtml += `
            //         <div class="user-badge ${isYou ? 'you' : ''}">
            //             <span>👤</span>
            //             ${user.name || user.id} 
            //             ${isYou ? '(Вы)' : ''}
            //         </div>
            //     `;
            //         });
            //         usersHtml += '</div>';
            //     } else {
            //         usersHtml += '<p style="color: #666; padding: 10px;">Нет других пользователей онлайн</p>';
            //     }
            //     panel.innerHTML = usersHtml;
            // }
        }

        function handleEncryptedMessage(data) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message-card message-encrypted';

            const senderName = data.fromName || data.from || 'Неизвестный';
            const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

            messageElement.innerHTML = `
        <div class="message-header">
            <div class="sender sender-other">🔒 ${senderName}</div>
            <div class="timestamp">${timestamp}</div>
        </div>
        <div class="message-text">
            <p><strong>Зашифрованное сообщение</strong></p>
            <p style="font-family: monospace; font-size: 12px; color: #666; margin-top: 5px;">
                ID отправителя: ${data.from || 'неизвестно'}
            </p>
        </div>
        <div style="margin-top: 10px;">
            <button class="btn-secondary" onclick="decryptMessage('${data.from}', '${escape(JSON.stringify(data.encrypted))}')">
                🔓 Расшифровать сообщение
            </button>
        </div>
    `;

            document.getElementById('messages').appendChild(messageElement);
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

                addMessage('⏳ Запрос на расшифровку отправлен...', 'system');
            } catch (e) {
                addMessage(`❌ Ошибка при подготовке расшифровки: ${e.message}`, 'error');
            }
        }

        function addMessage(text, type = 'message') {
            const messagesDiv = document.getElementById('messages');
            const messageElement = document.createElement('div');

            // Определяем иконку и стиль в зависимости от типа
            let icon = '💬';
            let messageClass = 'message-card';

            switch (type) {
                case 'system':
                    icon = '📢';
                    messageClass += ' message-system';
                    break;
                case 'encrypted':
                    icon = '🔒';
                    messageClass += ' message-encrypted';
                    break;
                case 'decrypted':
                    icon = '🔓';
                    messageClass += ' message-decrypted';
                    break;
                case 'error':
                    icon = '❌';
                    messageClass += ' message-error';
                    break;
                default:
                    messageClass += ' message-regular';
            }

            messageElement.className = messageClass;
            messageElement.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <div style="font-size: 20px;">${icon}</div>
            <div style="flex: 1;">
                <div style="margin-bottom: 5px;">${text}</div>
                <div class="info">${new Date().toLocaleTimeString()}</div>
            </div>
        </div>
    `;

            messagesDiv.appendChild(messageElement);
            scrollToBottom();
        }

        function setStatus(text, color) {
            const statusEl = document.getElementById('status');
            statusEl.textContent = text;
            statusEl.className = color === 'green' ? 'status-connected' : 'status-disconnected';
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