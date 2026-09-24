// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsames Vokabular für Auswahlfelder (v0.400).
//
// Die Wahrheit steht auf dem Server in server/utils/vokabular.js und kommt über
// GET /api/crm/vokabular hierher. Damit pflegt man Käufertypen an genau einer
// Stelle, und wenn CapitalMatch später im Phalanx OS aufgeht, ändert sich nur
// die Quelle hinter der Route.
//
// Die Liste unten ist eine Notfassung für den Fall, dass der Abruf scheitert,
// damit ein Auswahlfeld nie leer bleibt. Sie darf nicht auseinanderlaufen:
// server/tests/vokabular.test.js vergleicht beide Listen Zeichen für Zeichen
// und schlägt fehl, sobald sie sich unterscheiden.
// ─────────────────────────────────────────────────────────────────────────────
import { api } from '../api/client';

export const KAEUFERTYPEN_FALLBACK = [
  { wert: 'strategic', label: 'Strategischer Käufer' },
  { wert: 'financial', label: 'Finanzinvestor' },
  { wert: 'business_angel', label: 'Business Angel' },
  { wert: 'venture_capital', label: 'Venture Capital' },
  { wert: 'family_office', label: 'Family Office' },
  { wert: 'successor', label: 'Nachfolger (MBO/MBI)' },
  { wert: 'private', label: 'Privatperson' },
  { wert: 'advisor_mandate', label: 'M&A-Berater mit Suchmandat' },
];

export const LAENDER_FALLBACK = ['Deutschland', 'Österreich', 'Schweiz', 'Luxemburg', 'Liechtenstein',
  'Niederlande', 'Belgien', 'Frankreich', 'Italien', 'Polen', 'Tschechien', 'Vereinigtes Königreich', 'USA'];

const LEER = { kaeufertypen: KAEUFERTYPEN_FALLBACK, firmentypen: [], laender: LAENDER_FALLBACK };

let gespeichert = null;   // einmal geladen, danach aus dem Speicher
let laeuft = null;        // mehrfache Aufrufe teilen sich eine Abfrage

export async function ladeVokabular() {
  if (gespeichert) return gespeichert;
  if (!laeuft) {
    laeuft = api.get('/crm/vokabular')
      .then((d) => { gespeichert = { ...LEER, ...(d || {}) }; return gespeichert; })
      .catch(() => LEER)
      .finally(() => { laeuft = null; });
  }
  return laeuft;
}

/** Anzeigename zu einem Käufertyp, auch ohne geladenes Vokabular. */
export function kaeufertypLabel(wert, liste = (gespeichert || LEER).kaeufertypen) {
  const t = (liste || []).find((k) => k.wert === wert);
  return t ? t.label : '';
}
