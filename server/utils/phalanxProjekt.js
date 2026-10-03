// ─────────────────────────────────────────────────────────────────────────────
// Die Projektnummer aus Phalanx OS (v0.446).
//
// Reine Funktionen, kein Datenbankzugriff, deshalb prüfbar ohne laufendes
// System. Hier steht alles, was über die Nummer entschieden wird, an einer
// Stelle, damit die Regel nicht in drei Routen verstreut auseinanderläuft.
//
// Die Systematik stammt aus Phalanx OS und wird hier nur gelesen, nie
// fortgeschrieben: fünf Ziffern, Stelle 1 bis 2 die Kategorie, Stelle 3 bis 5
// fortlaufend über alle Kategorien hinweg. CapitalMatch vergibt keine Nummern.
// Zwei Systeme, die beide vergeben, vergeben irgendwann dieselbe.
// ─────────────────────────────────────────────────────────────────────────────

/** Die Kategorien von Phalanx OS, wortgleich. Nicht umformulieren. */
const KATEGORIEN = { 10: 'Kapitalisierung', 20: 'StartUp', 30: 'Beratung', 40: 'Akademie' };

/**
 * Eine Eingabe in eine Nummer verwandeln.
 *
 * @returns {{ nummer }} bei Erfolg, { fehler } mit einem Satz im Klartext sonst,
 *          oder { nummer: null } wenn das Feld geleert wurde.
 */
function nummerLesen(roh) {
  const text = String(roh == null ? '' : roh).trim();
  if (!text) return { nummer: null };
  if (!/^\d{5}$/.test(text)) {
    return { fehler: 'Eine Projektnummer aus Phalanx OS besteht aus genau fünf Ziffern, zum Beispiel 30342.' };
  }
  const code = text.slice(0, 2);
  if (!KATEGORIEN[code]) {
    return { fehler: `Die ersten beiden Ziffern stehen für die Kategorie. "${code}" gibt es nicht; `
      + `möglich sind ${Object.entries(KATEGORIEN).map(([k, v]) => `${k} (${v})`).join(', ')}.` };
  }
  return { nummer: text, kategorie: KATEGORIEN[code] };
}

/**
 * Was CapitalMatch über ein Mandat nach aussen gibt.
 *
 * Die Auswahl ist der Kern dieser Datei, und sie ist bewusst eng. Phalanx OS
 * ist nicht der Datenraum. Es braucht Zahlen und Zustände, um Projekte zu
 * führen und abzurechnen, und es braucht keinen einzigen Namen dafür.
 *
 * Nicht enthalten, und das ist keine Sparsamkeit, sondern eine Zusage an die
 * Verkäufer: Klarnamen von Interessenten, der Firmenname des Verkäufers,
 * Dokumentinhalte, Q&A-Texte, Nachrichten. Wer ein Feld ergänzen will, muss
 * sich fragen, ob es in einer Abrechnung stehen dürfte.
 */
const ERLAUBTE_FELDER = [
  'nummer', 'codename', 'status', 'mandate_type', 'deal_type', 'stand', 'aktualisiert_am',
];
const ERLAUBTE_STANDFELDER = [
  'interessenten', 'nda_unterschrieben', 'datenraum_freigegeben', 'letzte_aktivitaet_am',
];

function mandatNachAussen(p) {
  return {
    nummer: p.phalanx_projekt_nummer || null,
    codename: p.codename || null,
    status: p.status || null,
    mandate_type: p.mandate_type || null,
    deal_type: p.deal_type || null,
    stand: {
      interessenten: Number(p.interessenten || 0),
      nda_unterschrieben: Number(p.nda_unterschrieben || 0),
      datenraum_freigegeben: Number(p.datenraum_freigegeben || 0),
      letzte_aktivitaet_am: p.letzte_aktivitaet_am || null,
    },
    aktualisiert_am: p.updated_at || p.created_at || null,
  };
}

/**
 * Prüfen, dass nichts hinausgeht, was nicht hinausgehen darf.
 *
 * Diese Funktion gibt es, weil eine Zusage, die nur im Kommentar steht, beim
 * nächsten hinzugefügten Feld gebrochen wird, ohne dass es jemand merkt. Sie
 * läuft bei jeder Antwort mit und ist billig: ein Vergleich von Schlüsseln.
 */
function verbotenesGefunden(satz) {
  const raus = [];
  for (const k of Object.keys(satz || {})) {
    if (!ERLAUBTE_FELDER.includes(k)) raus.push(k);
  }
  for (const k of Object.keys((satz && satz.stand) || {})) {
    if (!ERLAUBTE_STANDFELDER.includes(k)) raus.push(`stand.${k}`);
  }
  return raus;
}

/**
 * Was CapitalMatch aus Phalanx OS übernimmt.
 *
 * Nur Felder, die CapitalMatch nicht selbst führt. Der Codename ist nicht
 * dabei und darf es nie sein: Er ist die Anonymisierung gegenüber Käufern, und
 * ein Klarname von aussen hebelte sie aus. Dasselbe gilt für Status und
 * Datenraum, die hier entschieden werden.
 */
function uebernahmeFelder(eingang) {
  const raus = {};
  if (eingang && typeof eingang.name === 'string' && eingang.name.trim()) {
    raus.phalanx_projekt_name = eingang.name.trim().slice(0, 300);
  }
  raus.phalanx_sync_am = new Date().toISOString();
  raus.phalanx_sync_fehler = null;
  return raus;
}

/** Felder, die ein eingehender Satz niemals verändern darf. */
const UNANTASTBAR = ['codename', 'status', 'industry', 'region', 'revenue_band', 'ebitda_band',
  'short_description', 'full_description', 'created_by', 'tenant_id'];

module.exports = {
  KATEGORIEN, nummerLesen, mandatNachAussen, verbotenesGefunden, uebernahmeFelder,
  ERLAUBTE_FELDER, ERLAUBTE_STANDFELDER, UNANTASTBAR,
};
