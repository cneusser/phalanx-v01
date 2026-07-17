// ─────────────────────────────────────────────────────────────────────────────
// v0.278: Recherche-Listen (Excel/CSV) in das CRM einlesen.
//
// Reine Hilfsfunktionen, testbar ohne DB:
//   · detectHeaderRow  findet die Kopfzeile (Recherche-Dateien haben oft Titel-
//                      zeilen darüber)
//   · guessMapping     ordnet Spalten den CRM-Feldern zu (nach Überschrift)
//   · buildContacts    baut aus den Datenzeilen normalisierte Kontakt-Objekte
//
// Besonderheit Investoren-/Fondslisten: Es gibt oft keinen Personennamen, sondern
// nur den Fonds und eine allgemeine Adresse (pitch@, info@). Dann dient der Fonds-
// name zugleich als Nachname UND als Firma.
// ─────────────────────────────────────────────────────────────────────────────

const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const low = (v) => clean(v).toLowerCase();

// Kandidaten je CRM-Feld (Teilstring der Überschrift, klein geschrieben)
const FIELD_KEYS = {
  email:      ['e-mail', 'email', 'mail', 'kontakt-e-mail'],
  first_name: ['vorname', 'first name', 'first'],
  last_name:  ['nachname', 'last name', 'name', 'ansprechpartner', 'kontaktname'],
  company:    ['investor', 'firma', 'unternehmen', 'company', 'organisation', 'fonds', 'kapitalgeber'],
  salutation: ['anrede'],
  title:      ['titel', 'title'],
  position:   ['position', 'funktion', 'rolle', 'title/role'],
  phone:      ['telefon', 'phone', 'tel', 'mobil'],
  location:   ['ort', 'stadt', 'standort', 'city', 'sitz'],
  notes:      ['begründung', 'begruendung', 'fokus', 'notiz', 'kommentar', 'hinweis', 'bemerkung'],
  source:     ['quelle', 'source', 'herkunft'],
};

// Kopfzeile = erste Zeile mit einer Mail-Überschrift ODER >= 3 sinnvollen Textzellen
function detectHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = (rows[i] || []).map(low);
    const hasMail = cells.some(c => c.includes('mail'));
    const textish = cells.filter(c => c && c.length <= 40 && /[a-zäöü]/i.test(c)).length;
    const looksHeader = cells.some(c => ['investor', 'name', 'firma', 'unternehmen', 'vorname'].some(k => c.includes(k)));
    if ((hasMail && textish >= 2) || (looksHeader && textish >= 3)) return i;
  }
  return 0;
}

// headers: Array der Spaltenüberschriften. Gibt { feld: spaltenindex, … }.
// Jede Spalte wird höchstens einem Feld zugeordnet. Wichtig: der Nachname darf
// nicht die Vorname-Spalte greifen (beide enthalten „name").
function guessMapping(headers) {
  const H = (headers || []).map(low);
  const used = new Set();
  const find = (keys, exclude = []) => {
    const i = H.findIndex((h, idx) => h && !used.has(idx)
      && keys.some(k => h.includes(k)) && !exclude.some(e => h.includes(e)));
    if (i >= 0) used.add(i);
    return i;
  };
  const map = {};
  const set = (field, idx) => { if (idx >= 0) map[field] = idx; };

  set('email', find(FIELD_KEYS.email));
  set('first_name', find(FIELD_KEYS.first_name));
  // Nachname: zuerst eindeutige Begriffe, sonst „Name" (aber nicht die Vorname-/Firmenspalte)
  let last = find(['nachname', 'last name', 'familienname', 'surname']);
  if (last < 0) last = find(['name', 'ansprechpartner', 'kontaktname'], ['vorname', 'first', 'e-mail', 'email', 'mail', 'firma', 'unternehmen', 'firmenname', 'company']);
  set('last_name', last);
  set('company', find(FIELD_KEYS.company));
  for (const f of ['salutation', 'title', 'position', 'phone', 'location', 'notes', 'source']) {
    set(f, find(FIELD_KEYS[f]));
  }
  return map;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Aus Datenzeilen normalisierte Kontakte. mapping wie von guessMapping (überschreibbar).
function buildContacts(rows, headerIdx, mapping) {
  const out = [];
  const get = (row, field) => (mapping[field] != null ? clean(row[mapping[field]]) : '');
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const company = get(row, 'company');
    let last = get(row, 'last_name');
    const first = get(row, 'first_name');
    let email = low(get(row, 'email'));
    if (email && !EMAIL_RE.test(email)) {
      const m = clean(get(row, 'email')).match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      email = m ? m[0].toLowerCase() : '';
    }
    // Fonds-/Firmenliste ohne Personennamen: Firma zugleich als Nachname
    if (!last && company) last = company;
    if (!last && !email) continue;   // leere Zeile
    out.push({
      salutation: get(row, 'salutation') || '',
      title: get(row, 'title') || '',
      first_name: first,
      last_name: last || (email ? email.split('@')[0] : ''),
      email,
      company: company || '',
      location: get(row, 'location') || '',
      position: get(row, 'position') || '',
      phone: get(row, 'phone') || '',
      notes: get(row, 'notes') || '',
      source: get(row, 'source') || '',
    });
  }
  return out;
}

module.exports = { detectHeaderRow, guessMapping, buildContacts, FIELD_KEYS, clean };
