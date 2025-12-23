<!DOCTYPE html>
<html>

<head>
    <title>Отправитель GOST</title>
    <link rel="stylesheet" href="style.css">


</head>

<body>
    <div class="app-container">
        <div class="container sender">
            <div class="header">
                <h1>🔐 Отправитель </h1>
                <div class="status-bar">
                    <div>Статус подключения:</div>
                    <div id="status" class="status-disconnected">Не подключено</div>
                </div>
                <div id="myInfo" class="key-display">Информация о пользователе появится после подключения...</div>
            </div>

            <div class="online-panel">
                <h3>👥 Онлайн пользователи</h3>
                <div class="user-list" id="onlineList">
                    <div class="user-badge">Загрузка...</div>
                </div>
            </div>

            <div class="panel">
                <h3>📨 Отправить сообщение</h3>
                <!-- <select id="receiver">
                    <option value="">Выберите получателя</option>
                </select> -->
                <textarea id="message" placeholder="Введите ваше сообщение здесь..."></textarea>
                <div class="button-group">
                    <button class="btn-primary" onclick="sendMessage()">📤 Отправить открыто</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let ws = null;
        let myId = null;
        let myPublicKey = null;
        let onlineUsers = [];
        let isConnected = false;

        connectWebSocket();

        function connectWebSocket() {
            ws = new WebSocket('ws://localhost:8082');

            ws.onopen = () => {
                document.getElementById('status').innerHTML =
                    '<span style="color:green">✅ Подключено</span>';
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Получено:', data);

                    switch (data.type) {
                        case 'system':
                            if (data.event === 'connected') {
                                myId = data.clientId;
                                myPublicKey = data.publicKey;
                                document.getElementById('myInfo').innerHTML =
                                    `ID: ${myId}<br>Ключ: ${myPublicKey.substring(0, 50)}...`;
                            }
                            break;

                        case 'online_list':
                            onlineUsers = data.users;
                            updateOnlineList();
                            break;

       

                        case 'encrypted_message':
                            showEncryptedMessage(data);
                            break;

    
                    }
                } catch (e) {
                    console.error('Ошибка парсинга:', e);
                }
            };

            ws.onclose = () => {
                document.getElementById('status').innerHTML =
                    '<span style="color:red">❌ Отключено</span>';
            };
        }

        function updateOnlineList() {
            const list = document.getElementById('onlineList');
            const select = document.getElementById('receiver');

            list.innerHTML = '';
            select.innerHTML = '<option value="">Выберите получателя</option>';

            onlineUsers.forEach(user => {
                if (user.id !== myId) {
                    // Список
                    const div = document.createElement('div');
                    div.innerHTML = `👤 ${user.name} (${user.id})`;
                    list.appendChild(div);

                    // Select
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.name} (${user.id})`;
                    select.appendChild(option);
                }
            });
        }

        function sendMessage() {
            const messageInput = document.getElementById('message');
            const message = messageInput.value;

            if (!message.trim()) {
                alert('Введите сообщение');
                return;
            }

            // Отправляем ПРАВИЛЬНЫЙ JSON
            ws.send(JSON.stringify({
                type: 'text',
                content: message
            }));

            messageInput.value = '';
        }

        function showEncryptedMessage(data) {
            const output = document.getElementById('output');
            output.innerHTML = `
                🔒 Зашифрованное сообщение от ${data.fromName}:<br>
                <small>${JSON.stringify(data.encrypted, null, 2)}</small><br><br>
                <button onclick="decryptMessage('${data.from}', '${escape(JSON.stringify(data.encrypted))}')">
                    🔓 Расшифровать
                </button>
            `;
        }

        function decryptMessage(fromId, encryptedJson) {
            const encryptedData = JSON.parse(unescape(encryptedJson));

            ws.send(JSON.stringify({
                type: 'command',
                command: 'decrypt',
                from: fromId,
                encryptedData: encryptedData
            }));
        }

        // Экранирование строк для JSON
        function escape(str) {
            return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
        }
    </script>
</body>

</html>