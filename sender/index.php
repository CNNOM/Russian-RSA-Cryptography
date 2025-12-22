<!DOCTYPE html>
<html>

<head>
    <title>Отправитель GOST</title>
    <style>
        body {
            font-family: Arial;
            padding: 20px;
        }

        .panel {
            border: 1px solid #ccc;
            padding: 15px;
            margin: 10px 0;
        }

        input,
        textarea,
        button {
            margin: 5px;
            padding: 8px;
        }

        textarea {
            width: 100%;
            height: 80px;
        }

        #output {
            background: #f5f5f5;
            padding: 10px;
            white-space: pre-wrap;
        }
    </style>
</head>

<body>
    <h1>🔐 Отправитель (WebCrypto GOST)</h1>

    <div class="panel">
        <h3>Подключение</h3>
        <div id="status">Подключение к WS...</div>
        <div id="myInfo"></div>
    </div>

    <div class="panel">
        <h3>Онлайн пользователи</h3>
        <div id="onlineList">Загрузка...</div>
    </div>

    <div class="panel">
        <h3>Отправить сообщение</h3>
        <select id="receiver"></select>
        <br>
        <textarea id="message" placeholder="Введите сообщение..."></textarea>
        <br>
        <button onclick="sendMessage()">📤 Отправить открыто</button>
        <button onclick="sendEncrypted()">🔐 Зашифровать и отправить</button>
    </div>

    <div class="panel">
        <h3>Журнал</h3>
        <div id="log"></div>
    </div>

    <div class="panel">
        <h3>Отладка</h3>
        <button onclick="testGOST()">🧪 Тест ГОСТ функций</button>
        <button onclick="getMyKey()">🔑 Показать мой публичный ключ</button>
        <div id="output"></div>
    </div>

    <script>
        let ws = null;
        let myId = null;
        let myPublicKey = null;
        let onlineUsers = [];

        connectWebSocket();

        function connectWebSocket() {
            ws = new WebSocket('ws://localhost:8082');

            ws.onopen = () => {
                log('✅ Подключено к серверу ГОСТ');
                document.getElementById('status').innerHTML =
                    '<span style="color:green">✅ Подключено</span>';
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Получено:', data);

                    switch (data.type) {
                        case 'system':
                            log(`📢 ${data.message}`);
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

                        case 'message':
                            log(`💬 ${data.fromName}: ${data.text}`);
                            break;

                        case 'encrypted_message':
                            log(`🔒 Зашифрованное от ${data.fromName}`);
                            showEncryptedMessage(data);
                            break;

                        case 'encryption_done':
                            log(`✅ Сообщение зашифровано для ${data.toName}`);
                            break;
                    }
                } catch (e) {
                    console.error('Ошибка парсинга:', e);
                }
            };

            ws.onclose = () => {
                log('❌ Соединение закрыто');
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

            log(`📤 Вы: ${message}`);
            messageInput.value = '';
        }

        function sendEncrypted() {
            const messageInput = document.getElementById('message');
            const message = messageInput.value;
            const receiverSelect = document.getElementById('receiver');
            const receiverId = receiverSelect.value;

            if (!message.trim() || !receiverId) {
                alert('Выберите получателя и введите сообщение');
                return;
            }

            ws.send(JSON.stringify({
                type: 'encrypt_message',
                to: receiverId,
                text: message
            }));

            log(`🔐 Вы шифруете для ${receiverSelect.options[receiverSelect.selectedIndex].text}`);
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

        function testGOST() {
            ws.send(JSON.stringify({
                type: 'command',
                command: 'test_gost'
            }));
        }

        function getMyKey() {
            const output = document.getElementById('output');
            output.innerHTML = `<small>${myPublicKey}</small>`;
        }

        function log(text) {
            const logDiv = document.getElementById('log');
            const entry = document.createElement('div');
            entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${text}`;
            logDiv.appendChild(entry);
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        // Экранирование строк для JSON
        function escape(str) {
            return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
        }
    </script>
</body>

</html>