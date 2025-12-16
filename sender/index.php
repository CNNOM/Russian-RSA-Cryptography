<!DOCTYPE html>
<html>
<head>
    <title>Отправитель (8080)</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        textarea { width: 100%; height: 100px; }
        button { padding: 10px 20px; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>📤 Отправитель</h1>
    <textarea id="message" placeholder="Введите сообщение..."></textarea>
    <br>
    <button onclick="sendMessage()">Отправить</button>
    
    <script>
        // Подключаемся к WebSocket серверу
        const ws = new WebSocket('ws://localhost:8082');
        
        ws.onopen = () => {
            console.log('Подключено к WebSocket серверу');
        };
        
        function sendMessage() {
            const message = document.getElementById('message').value;
            if (message.trim()) {
                ws.send(message);
                document.getElementById('message').value = '';
                alert('Сообщение отправлено в реальном времени!');
            }
        }
    </script>
</body>
</html>