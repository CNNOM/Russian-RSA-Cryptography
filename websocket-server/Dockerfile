FROM node:18-alpine

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем ВСЕ файлы сервера
COPY . .

EXPOSE 8082

CMD ["node", "server.js"]