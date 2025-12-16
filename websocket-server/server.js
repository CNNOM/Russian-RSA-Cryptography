const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8082 });

// Храним подключения всех клиентов
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Новое подключение');

    ws.on('message', (message) => {
        console.log('Получено сообщение:', message);
        
        // Отправляем сообщение ВСЕМ подключенным клиентам
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Подключение закрыто');
    });
});

console.log('WebSocket сервер запущен на порту 8082');