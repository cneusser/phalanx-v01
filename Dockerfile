FROM node:20-alpine

WORKDIR /app

# Gemeinsame Daten. Muss VOR dem Client-Build stehen: Die Oberfläche bindet
# shared/taxonomie.json ein, und ohne diese Zeile bricht der Build im Container
# ab, während er auf dem eigenen Rechner durchläuft, weil dort das ganze
# Verzeichnis liegt. Wer hier eine weitere Datei außerhalb von client/ einbindet,
# muss sie auch hier eintragen. dockerfile.test.js prüft das.
COPY shared/ ./shared/

# Client: Abhängigkeiten installieren & bauen
COPY client/package*.json ./client/
RUN cd client && npm ci --include=dev

COPY client/ ./client/
RUN cd client && npm run build

# Server: nur Produktions-Abhängigkeiten.
# --omit=optional: pdfjs-dist zieht sonst das native „canvas" mit, das auf
# alpine (musl) kompiliert werden müsste und den Build bricht. Für die reine
# Textextraktion (getTextContent) wird canvas nicht benötigt.
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev --omit=optional

COPY server/ ./server/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/index.js"]
