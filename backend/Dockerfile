FROM node:16-slim

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o código da aplicação
COPY . .

COPY .env .env

# Expor a porta que será utilizada pelo servidor
EXPOSE 8080

# Definir a variável de ambiente PORT explicitamente
ENV PORT=8080

# Comando para iniciar a aplicação
CMD ["node", "server.js"]