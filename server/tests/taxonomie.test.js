// ─────────────────────────────────────────────────────────────────────────────
// Branchen und Regionen: Code, Beschriftung, Treffer.
//
// Der wichtigste Fall steht ganz oben: ein Käufer kreuzt "Maschinenbau" an,
// das Mandat trägt "C28 – Maschinenbau". Vor v0.416 verglich profileMatch das
// mit Zeichengleichheit, also nie ein Treffer. Wer filterte, bekam nichts.
// ─────────────────────────────────────────────────────────────────────────────
const t = require('../utils/taxonomie');

let fail = 0;
const ok = (name, cond) => { console.log((cond ? '✓' : '✗ FEHLER') + ' ' + name); if (!cond) fail++; };

// ── Der Ausfall, um den es geht ────────────────────────────────────────────
ok('Maschinenbau trifft C28', t.brancheTrifft('maschinenbau', 'C28 – Maschinenbau'));
ok('Maschinenbau trifft nicht C10', !t.brancheTrifft('maschinenbau', 'C10 – Nahrungs- & Futtermittel'));
ok('IT trifft J62', t.brancheTrifft('it', 'J62 – Software-Entwicklung & IT-Dienstleistungen'));
ok('Handel trifft G47', t.brancheTrifft('handel', 'G47 – Einzelhandel & E-Commerce'));
ok('Sonstige Industrie trifft den Bereich C13–15', t.brancheTrifft('sonstige_industrie', 'C13–15 – Textilien, Bekleidung, Leder'));
ok('C13–15 gehört nicht zum Maschinenbau', !t.brancheTrifft('maschinenbau', 'C13–15 – Textilien, Bekleidung, Leder'));
ok('C2 trifft nicht alles mit C2', !t.brancheTrifft('chemie', 'C28 – Maschinenbau'));
ok('Bau trifft F41–43', t.brancheTrifft('bau', 'F41–43 – Baugewerbe'));

// ── Alte Schreibweisen aus den vier Listen finden ihren Code ───────────────
const alt = {
  'Maschinenbau': 'maschinenbau',
  'Industrie & Maschinenbau': 'maschinenbau',
  'Software & IT': 'it',
  'IT & Software': 'it',
  'Handel & E-Commerce': 'handel',
  'Handel & Konsumgüter': 'handel',
  'Healthcare & Medizintechnik': 'gesundheit',
  'Baugewerbe': 'bau',
  'Bau & Baustoffe': 'bau',
  'Lebensmittel & Getränke': 'lebensmittel',
  'Business Services': 'dienstleistung',
  'Energie & Umwelt': 'energie',
  'Automotive & Zulieferer': 'automotive',
  'Chemie & Pharma': 'chemie',
};
const falsch = Object.entries(alt).filter(([text, wert]) => t.brancheAus(text) !== wert)
  .map(([text, wert]) => `${text} → ${t.brancheAus(text)} statt ${wert}`);
ok(`alle ${Object.keys(alt).length} alten Branchentexte finden ihren Code`
  + (falsch.length ? `  (${falsch.join(', ')})` : ''), falsch.length === 0);

// ── Jeder Wert aus den vier alten Listen muss seinen Code finden ──────────
// Diese Zeichenketten stehen in Bestandsprofilen. Findet einer keinen Code,
// verliert der Nutzer beim nächsten Speichern still seinen Filter.
const HISTORISCH = {
  branche: [
    // Käufer-Suchprofil (Profile.jsx bis v0.415)
    'Maschinenbau', 'Software & IT', 'Healthcare & Medizintechnik', 'Automotive & Zulieferer',
    'Business Services', 'Lebensmittel & Getränke', 'Chemie & Pharma', 'Baugewerbe',
    'Handel & E-Commerce', 'Energie & Umwelt',
    // Selbstauskunft (ContactSelfService.jsx bis v0.415)
    'Bau & Baustoffe', 'Industrie & Maschinenbau', 'Handel & Konsumgüter', 'IT & Software',
    'Dienstleistung', 'Gesundheit & Pflege', 'Logistik & Transport', 'Lebensmittel',
    'Handwerk', 'Immobilien', 'Medien & Marketing',
  ],
  region: [
    // Käufer-Suchprofil
    'Bayern', 'Baden-Württemberg', 'NRW', 'Hessen', 'Norddeutschland', 'Berlin / Brandenburg',
    'Sachsen / Thüringen', 'Süddeutschland', 'DACH', 'DACH+',
    // Selbstauskunft und Nachfolge-Profil
    'Berlin/Brandenburg', 'Niedersachsen', 'Sachsen', 'Ostdeutschland',
    'Deutschland (bundesweit)', 'Österreich', 'Schweiz',
    'Mecklenburg-Vorpommern', 'Rheinland-Pfalz', 'Saarland', 'Sachsen-Anhalt',
    'Schleswig-Holstein', 'Hamburg', 'Bremen', 'Brandenburg', 'Berlin', 'Thüringen',
    'Nordrhein-Westfalen',
  ],
};
const verloren = [];
for (const b of HISTORISCH.branche) if (!t.brancheAus(b)) verloren.push(`Branche: ${b}`);
for (const r of HISTORISCH.region) if (!t.regionAus(r)) verloren.push(`Region: ${r}`);
ok(`alle ${HISTORISCH.branche.length + HISTORISCH.region.length} Bestandswerte finden einen Code`
  + (verloren.length ? `  (${verloren.join(', ')})` : ''), verloren.length === 0);

ok('unbekannter Text wird nicht geraten', t.brancheAus('Irgendwas Erfundenes') === null);
ok('leerer Text wird nicht geraten', t.brancheAus('') === null && t.brancheAus(null) === null);

// ── Regionen ───────────────────────────────────────────────────────────────
ok('NRW findet seinen Code', t.regionAus('NRW') === 'nrw');
ok('Nordrhein-Westfalen findet denselben Code', t.regionAus('Nordrhein-Westfalen') === 'nrw');
ok('Umlaute sind egal', t.regionAus('Baden-Wuerttemberg') === 'bw' && t.regionAus('Baden-Württemberg') === 'bw');
ok('Berlin und Berlin / Brandenburg sind dieselbe Region', t.regionAus('Berlin') === t.regionAus('Berlin / Brandenburg'));
ok('Bayern trifft ein Mandat in Bayern', t.regionTrifft('by', 'Bayern'));
ok('Bayern trifft ein DACH-Mandat', t.regionTrifft('by', 'DACH'));
ok('DACH trifft ein Mandat in Österreich', t.regionTrifft('dach', 'Österreich'));
ok('bundesweit trifft ein Mandat in Hessen', t.regionTrifft('de', 'Hessen'));
ok('Hessen trifft ein bundesweites Mandat', t.regionTrifft('he', 'Deutschland (bundesweit)'));
ok('Bayern trifft nicht die Schweiz', !t.regionTrifft('by', 'Schweiz'));
ok('Österreich trifft nicht Hessen', !t.regionTrifft('at', 'Hessen'));

// ── Beschriftung ───────────────────────────────────────────────────────────
ok('Beschriftung deutsch', t.brancheLabel('maschinenbau', 'de') === 'Industrie & Maschinenbau');
ok('Beschriftung englisch', t.brancheLabel('maschinenbau', 'en') === 'Industry and mechanical engineering');
ok('Region englisch', t.regionLabel('bw', 'en') === 'Baden-Wuerttemberg');
ok('unbekannter Code liefert sich selbst zurück', t.brancheLabel('gibtsnicht', 'de') === 'gibtsnicht');

// ── Die Tabelle selbst ist sauber ──────────────────────────────────────────
const werte = t.BRANCHEN.map((b) => b.wert).concat(t.REGIONEN.map((r) => r.wert));
ok('keine doppelten Codes', new Set(werte).size === werte.length);
const ohneEnglisch = t.BRANCHEN.concat(t.REGIONEN).filter((e) => !e.en);
ok('jeder Eintrag hat eine englische Beschriftung', ohneEnglisch.length === 0);
const ohneNace = t.BRANCHEN.filter((b) => !Array.isArray(b.nace) || b.nace.length === 0);
ok('jede Branche nennt ihre NACE-Kennungen', ohneNace.length === 0);

// Keine NACE-Kennung darf zwei Branchen gehören, sonst wird ein Mandat doppelt
// zugeordnet und der Abgleich ist nicht mehr vorhersagbar.
const naceZu = new Map();
const doppelt = [];
for (const b of t.BRANCHEN) {
  for (const n of b.nace) {
    if (naceZu.has(n)) doppelt.push(`${n}: ${naceZu.get(n)} und ${b.wert}`);
    naceZu.set(n, b.wert);
  }
}
ok('keine NACE-Kennung in zwei Branchen' + (doppelt.length ? `  (${doppelt.join(', ')})` : ''), doppelt.length === 0);

process.exit(fail ? 1 : 0);
