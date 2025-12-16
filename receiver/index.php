<!DOCTYPE html>
<html>
<head>
    <title>Получатель (8081)</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        #messages { 
            border: 1px solid #ccc; 
            padding: 20px; 
            height: 300px; 
            overflow-y: auto;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>📥 Получатель</h1>
    <div>Сообщения появляются здесь в реальном времени:</div>
    <div id="messages"></div>
    
    <script>
        const messagesDiv = document.getElementById('messages');
        
        // Подключаемся к WebSocket серверу
        const ws = new WebSocket('ws://localhost:8082');
        
        ws.onopen = () => {
            console.log('Получатель подключен к WebSocket');
            addMessage('✅ Подключено к серверу');
        };
        
        ws.onmessage = (event) => {
            addMessage(`📨 ${event.data}`);
        };
        
        function addMessage(text) {
            const msg = document.createElement('div');
            msg.textContent = text;
            msg.style.padding = '10px';
            msg.style.borderBottom = '1px solid #eee';
            messagesDiv.appendChild(msg);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    </script>
</body>
</html>