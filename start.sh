#!/bin/bash
# Zum Verzeichnis dieses Skripts wechseln (wichtig bei Doppelklick)
cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════════╗"
echo "║    🏛  Phalanx M&A Plattform V0.1            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Node.js prüfen
if ! command -v node &> /dev/null; then
  echo "❌ Node.js nicht gefunden!"
  echo "   Bitte installieren: https://nodejs.org/de (LTS)"
  exit 1
fi
echo "✅ Node.js $(node --version)"

# Backend-Abhängigkeiten installieren falls nötig
if [ ! -f "server/node_modules/express/package.json" ]; then
  echo "📦 Installiere Abhängigkeiten (einmalig, ~30 Sekunden)..."
  cd server && npm install 2>&1 | tail -3 && cd ..
fi

# Datenbank befüllen falls nicht vorhanden
if [ ! -f "server/db/phalanx.db" ]; then
  echo "🌱 Datenbank wird initialisiert..."
  cd server && node db/seed.js && cd ..
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  🌐 http://localhost:3001  ← im Browser öffnen ║"
echo "║                                              ║"
echo "║  Admin:  admin@phalanx.de / Admin1234!       ║"
echo "║  Käufer: max.mueller@example.de / Buyer1234! ║"
echo "║                                              ║"
echo "║  Beenden: CTRL+C                             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Browser nach 2 Sekunden automatisch öffnen (macOS)
sleep 2 && open "http://localhost:3001" 2>/dev/null &

# Server starten (serviert Frontend + API auf Port 3001)
cd server && NODE_ENV=production node index.js
