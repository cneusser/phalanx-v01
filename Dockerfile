FROM node:20-alpine

WORKDIR /app

# Client: Abhängigkeiten installieren & bauen
COPY client/package*.json ./client/
RUN cd client && npm ci --include=dev

COPY client/ ./client/
RUN cd client && npm run build

# Server: nur Produktions-Abhängigkeiten
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/index.js"]
