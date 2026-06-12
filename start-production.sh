#!/bin/bash
echo "🏛  Phalanx M&A Platform V0.1 – Production Build"
echo ""

cd client && npm run build && cd ..

if [ ! -f "server/db/phalanx.db" ]; then
  cd server && node db/seed.js && cd ..
fi

export NODE_ENV=production
cd server && node index.js
