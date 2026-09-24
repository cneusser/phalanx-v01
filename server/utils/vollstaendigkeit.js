// ─────────────────────────────────────────────────────────────────────────────
// Vollständigkeit von Firmen-Stammdaten (v0.405).
//
// Bewusst keine Prozentzahl. „72 Prozent vollständig" sagt niemandem, was zu tun
// ist. Zurück kommt deshalb immer eine Liste mit Namen: Sektor, Ort, Land, und
// zwar in der Sprache, die auch in der Maske steht.
//
// Reine Funktionen, keine Datenbank, damit sie einzeln prüfbar sind und in der
// Firmenakte, in der Datenpflege-Übersicht und im Mailing dasselbe Ergebnis
// liefern. Drei Stellen, eine Wahrheit.
// ─────────────────────────────────────────────────────────────────────────────

// Was ein brauchbarer Firmendatensatz braucht. Reihenfolge ist die Reihenfolge
// in der Anzeige und in der Mail.
const FELDER = [
  { schluessel: 'name', label: 'Firmenname', an: 'firma' },
  { schluessel: 'sektor', label: 'Sektor', an: 'firma' },
  { schluessel: 'region', label: 'Region', an: 'firma' },
  { schluessel: 'employees', label: 'Mitarbeiterzahl', an: 'firma' },
  { schluessel: 'street', label: 'Straße und Hausnummer', an: 'firma' },
  { schluessel: 'postal_code', label: 'Postleitzahl', an: 'firma' },
  { schluessel: 'city', label: 'Ort', an: 'firma' },
  { schluessel: 'country', label: 'Land', an: 'firma' },
  { schluessel: 'ansprechperson', label: 'Ansprechperson', an: 'kontakt' },
  { schluessel: 'ansprechperson_rolle', label: 'Rolle der Ansprechperson', an: 'kontakt' },
  { schluessel: 'ansprechperson_email', label: 'E-Mail der Ansprechperson', an: 'kontakt' },
];

const SCHLUESSEL = FELDER.map((f) => f.schluessel);
const labelVon = (k) => (FELDER.find((f) => f.schluessel === k) || {}).label || k;

// Leer heißt: nicht gesetzt, leerer Text, oder eine Zahl, die keine ist.
function fehlt(wert, schluessel) {
  if (wert === null || wert === undefined) return true;
  if (schluessel === 'employees') {
    const n = Number(wert);
    return !Number.isFinite(n) || n <= 0;
  }
  return String(wert).trim() === '';
}

/**
 * Welche Felder fehlen bei dieser Firma?
 * @param {object} firma      Zeile aus crm_companies
 * @param {Array}  kontakte   zugeordnete Kontakte [{ first_name, last_name, email, responsibility }]
 * @returns {{fehlend: string[], labels: string[], vollstaendig: boolean}}
 */
function pruefe(firma = {}, kontakte = []) {
  const fehlend = [];

  for (const f of FELDER) {
    if (f.an !== 'firma') continue;
    if (fehlt(firma[f.schluessel], f.schluessel)) fehlend.push(f.schluessel);
  }

  // Ansprechperson: Es reicht eine, die vollständig ist. Deshalb wird nicht je
  // Kontakt geprüft, sondern ob mindestens einer die Anforderung erfüllt.
  const liste = Array.isArray(kontakte) ? kontakte : [];
  const hatNamen = liste.some((k) => !fehlt(k.last_name));
  const hatRolle = liste.some((k) => !fehlt(k.last_name) && !fehlt(k.responsibility));
  const hatMail = liste.some((k) => !fehlt(k.last_name) && !fehlt(k.email));
  if (!hatNamen) fehlend.push('ansprechperson');
  if (!hatRolle) fehlend.push('ansprechperson_rolle');
  if (!hatMail) fehlend.push('ansprechperson_email');

  return { fehlend, labels: fehlend.map(labelVon), vollstaendig: fehlend.length === 0 };
}

/**
 * Die fehlenden Felder als Satz für die Mail: „Sektor, Ort und Land".
 * Keine Aufzählungszeichen, weil der Satz mitten im Fließtext steht.
 */
function alsSatz(labels) {
  const l = (labels || []).filter(Boolean);
  if (!l.length) return '';
  if (l.length === 1) return l[0];
  return `${l.slice(0, -1).join(', ')} und ${l[l.length - 1]}`;
}

/** Nur die Felder, die eine Person selbst beantworten kann. */
const SELBST_PFLEGBAR = ['sektor', 'region', 'employees', 'street', 'postal_code', 'city', 'country',
  'ansprechperson_rolle', 'ansprechperson_email'];

function selbstPflegbar(fehlend) {
  return (fehlend || []).filter((f) => SELBST_PFLEGBAR.includes(f));
}

module.exports = { FELDER, SCHLUESSEL, pruefe, alsSatz, labelVon, fehlt, selbstPflegbar, SELBST_PFLEGBAR };
