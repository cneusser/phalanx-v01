#!/bin/bash
# Dieses Skript startet die Phalanx M&A Plattform
# Doppelklick auf diese Datei öffnet Terminal und startet die App

# Zum Skript-Verzeichnis wechseln
cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════════╗"
echo "║    🏛  Phalanx M&A Plattform V0.1            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Node.js prüfen
if ! command -v node &> /dev/null; then
  echo "❌ Node.js nicht gefunden!"
  echo ""
  echo "Bitte Node.js installieren:"
  echo "→ https://nodejs.org/de  (LTS-Version herunterladen)"
  echo ""
  read -p "Nach der Installation diese Datei erneut doppelklicken. Enter zum Beenden..."
  exit 1
fi

echo "✅ Node.js $(node --version) gefunden"

# npm install falls node_modules fehlen
if [ ! -f "server/node_modules/express/package.json" ]; then
  echo "📦 Abhängigkeiten werden installiert (einmalig)..."
  cd server && npm install && cd ..
fi

# Datenbank erstellen falls nicht vorhanden
if [ ! -f "server/db/phalanx.db" ]; then
  echo "🌱 Datenbank wird initialisiert..."
  cd server && node db/seed.js && cd ..
  echo ""
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Phalanx startet...                       ║"
echo "║                                              ║"
echo "║  🌐 http://localhost:3001                    ║"
echo "║                                              ║"
echo "║  Demo-Zugänge:                               ║"
echo "║  Admin:  admin@phalanx.de / Admin1234!       ║"
echo "║  Käufer: max.mueller@example.de              ║"
echo "║          / Buyer1234!                        ║"
echo "║                                              ║"
echo "║  Fenster schließen = App beenden             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Browser nach 2 Sekunden öffnen
sleep 2 && open "http://localhost:3001" &

# Server starten
cd server
NODE_ENV=production node index.js
