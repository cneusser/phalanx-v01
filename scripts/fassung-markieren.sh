#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Die Fassung als Git-Tag markieren (v0.483)
#
# Anlass: „Bei Github Desktop bekomme ich seit einiger Zeit nicht mehr die
# Version angezeigt."
#
# Die Version, die GitHub Desktop neben einem Commit zeigt, ist das Git-Tag.
# Nach v0.473 habe ich neun Fassungen committet und kein einziges Tag gesetzt,
# deshalb verschwand die Anzeige. Das war meine Nachlaessigkeit, kein Fehler
# des Programms.
#
# Dieses Skript nimmt die Nummer aus package.json und setzt das Tag auf den
# aktuellen Commit. Es gehoert in jeden Release, direkt nach dem Commit und vor
# dem Push.
#
#     ./scripts/fassung-markieren.sh
#     git push origin main --follow-tags
#
# Es weigert sich, wenn das Tag schon da ist oder wenn der Commit nicht mit
# derselben Nummer beginnt. Ein Tag auf dem falschen Commit waere schlechter
# als keines, weil man ihm glaubt.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

# package.json führt 0.482.0, Tag und Commit heissen v0.482. Die dritte Stelle
# ist in diesem Projekt immer 0 und bleibt deshalb weg. Steht dort doch einmal
# etwas anderes, kommt sie mit.
fassung="v$(node -p "require('./package.json').version.replace(/\.0$/, '')")"
betreff="$(git log -1 --format=%s)"

if git rev-parse "$fassung" >/dev/null 2>&1; then
  echo "⏭  $fassung ist bereits markiert, auf $(git log -1 --format=%h "$fassung")."
  exit 0
fi

if [[ "$betreff" != "$fassung"* ]]; then
  echo "❌ Der letzte Commit heisst „$betreff\"."
  echo "   Erwartet war ein Betreff, der mit $fassung beginnt."
  echo "   Entweder fehlt der Commit zu dieser Fassung, oder die Nummer in"
  echo "   package.json passt nicht zum Commit. Nichts markiert."
  exit 1
fi

git tag -a "$fassung" -m "$betreff"
echo "🏷  $fassung gesetzt auf $(git log -1 --format=%h)."
echo "   Mitschicken beim Push:  git push origin main --follow-tags"
