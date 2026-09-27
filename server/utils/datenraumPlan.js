// ─────────────────────────────────────────────────────────────────────────────
// Datenraum aufräumen: Vorschlag statt Eingriff.
//
// Der Safe hat seit v0.393 eine Standardgliederung mit neun Oberordnern, aber
// die Dokumente eines gewachsenen Mandats liegen selten sauber darin. Dieses
// Modul schlägt für jede Datei einen Ordner und eine Vertraulichkeitsstufe vor
// und sagt, was in der Gliederung fehlt.
//
// Es bewegt nichts. Der Vorschlag geht als Liste an den Berater, der ihn Zeile
// für Zeile annehmen oder verwerfen kann. Bei einem Datenraum ist das kein
// übertriebener Vorsichtsschritt: eine Datei im falschen Ordner ist ein
// Vertraulichkeitsvorfall, keine Unordnung.
//
// Zugeordnet wird nach dem Dateinamen, weil nur der zuverlässig da ist.
// Ein Name, der auf nichts passt, wird nicht geraten, sondern als "unklar"
// gemeldet.
// ─────────────────────────────────────────────────────────────────────────────

const ORDNER = [
  'Teaser und Investment Memorandum',
  'Rechtliche Situation im Unternehmen',
  'Entwicklung und Übersicht des Unternehmens',
  'Mitarbeiter und Management',
  'Finanzierung',
  'Wirtschaftliche Entwicklung (GuV, Bilanz, Cash Flow)',
  'Leistungswirtschaftliche Entwicklung (Produkte, Kunden, Markt, Wettbewerb, Fertigung)',
  'Organisation und Steuerung',
  'Finanz- und Rechnungswesen, IT',
];

/**
 * Regeln, von der engsten zur weitesten. Die erste passende gewinnt, deshalb
 * stehen eindeutige Begriffe oben und allgemeine unten.
 *
 * stufe: 'offen'      ohne Vertraulichkeitsvereinbarung sichtbar
 *        'nda'        nach unterzeichneter Vereinbarung
 *        'vertraulich' nur mit ausdrücklicher Einzelfreigabe (Clean Team)
 */
const REGELN = [
  // Was den Interessenten überhaupt erst anlockt
  { muster: /\bteaser\b|kurzprofil|anonym/i, ordner: ORDNER[0], stufe: 'offen',
    grund: 'Anonymes Kurzprofil, bewusst ohne Vereinbarung sichtbar' },
  { muster: /\bim\b|information\s*memorandum|\bcim\b|expos[eé]|pitch\s*deck/i, ordner: ORDNER[0], stufe: 'nda',
    grund: 'Informationsmemorandum, erst nach Vereinbarung' },

  // Clean Team: alles, was einem Wettbewerber unmittelbar nützt
  { muster: /kundenliste|kundenname|einzelkunde|top\s*\d+\s*kunden|preisliste|kalkulation|marge(n)?liste/i,
    ordner: ORDNER[6], stufe: 'vertraulich',
    grund: 'Kunden- und Preisdetails, für einen Wettbewerber unmittelbar verwertbar' },
  { muster: /gehalt|lohn|verg[üu]tung|personalliste|mitarbeiterliste|arbeitsvertrag/i,
    ordner: ORDNER[3], stufe: 'vertraulich',
    grund: 'Personenbezogene Entgeltdaten' },
  { muster: /patent|rezeptur|quellcode|source|konstruktionszeichnung|\bknow[\s-]?how\b/i,
    ordner: ORDNER[6], stufe: 'vertraulich',
    grund: 'Schutzrechte und technisches Wissen' },

  // Recht
  { muster: /gesellschaftsvertrag|satzung|handelsregister|\bhrb\b|gesellschafterliste|gesellschafterbeschlu/i,
    ordner: ORDNER[1], stufe: 'nda', grund: 'Gesellschaftsrechtliche Grundlagen' },
  { muster: /mietvertrag|pachtvertrag|versicherung|rechtsstreit|prozess|abmahnung|genehmigung|lizenzvertrag/i,
    ordner: ORDNER[1], stufe: 'nda', grund: 'Verträge und rechtliche Lage' },

  // Zahlen
  { muster: /jahresabschlu|\bja\s*20\d\d|bilanz|\bguv\b|gewinn.?und.?verlust|\bbwa\b|\bsusa\b|summen.?und.?salden/i,
    ordner: ORDNER[5], stufe: 'nda', grund: 'Jahresabschluss und laufende Zahlen' },
  { muster: /cash.?flow|liquidit[äa]t|planung|forecast|budget|businessplan/i,
    ordner: ORDNER[5], stufe: 'nda', grund: 'Finanzplanung' },
  { muster: /darlehen|kredit|finanzierung|bank|leasing|b[üu]rgschaft|tilgung/i,
    ordner: ORDNER[4], stufe: 'nda', grund: 'Finanzierungsunterlagen' },
  { muster: /steuer|betriebspr[üu]fung|umsatzsteuer|\belster\b/i,
    ordner: ORDNER[8], stufe: 'nda', grund: 'Steuerliche Unterlagen' },

  // Menschen und Organisation
  { muster: /organigramm|organisation|stellenbeschreibung|nachfolge|gesch[äa]ftsf[üu]hr/i,
    ordner: ORDNER[3], stufe: 'nda', grund: 'Organisation und Leitung' },
  { muster: /prozess|qualit[äa]t|\biso\b|zertifikat|handbuch|richtlinie/i,
    ordner: ORDNER[7], stufe: 'nda', grund: 'Steuerung und Qualität' },
  { muster: /\bit\b|software|erp|\bdsgvo\b|datenschutz|server|lizenz/i,
    ordner: ORDNER[8], stufe: 'nda', grund: 'IT und Datenschutz' },

  // Markt
  { muster: /produkt|sortiment|markt|wettbewerb|kunde|lieferant|fertigung|produktion|standort|maschine/i,
    ordner: ORDNER[6], stufe: 'nda', grund: 'Leistungswirtschaftliche Unterlagen' },
  { muster: /historie|unternehmensentwicklung|chronik|[üu]bersicht|pr[äa]sentation/i,
    ordner: ORDNER[2], stufe: 'nda', grund: 'Überblick über das Unternehmen' },
];

/**
 * Die Prüfliste: was in einem Nachfolge- oder Verkaufsprozess üblicherweise
 * vorliegen sollte. Fehlt eine Zeile, heißt das nicht automatisch, dass etwas
 * fehlt, sondern dass Sie prüfen sollten, ob Sie es anfordern.
 */
const PRUEFLISTE = [
  { was: 'Jahresabschlüsse der letzten drei Jahre', muster: /jahresabschlu|bilanz|\bguv\b/i },
  { was: 'Aktuelle BWA oder Summen- und Saldenliste', muster: /\bbwa\b|\bsusa\b|summen.?und.?salden/i },
  { was: 'Planung oder Budget für das laufende Jahr', muster: /planung|budget|forecast|businessplan/i },
  { was: 'Gesellschaftsvertrag oder Satzung', muster: /gesellschaftsvertrag|satzung/i },
  { was: 'Aktueller Handelsregisterauszug', muster: /handelsregister|\bhrb\b/i },
  { was: 'Gesellschafterliste', muster: /gesellschafterliste/i },
  { was: 'Miet- oder Pachtverträge der Standorte', muster: /mietvertrag|pachtvertrag/i },
  { was: 'Organigramm', muster: /organigramm/i },
  { was: 'Personalübersicht (anonymisiert)', muster: /personal|mitarbeiter/i },
  { was: 'Kunden- oder Umsatzstruktur', muster: /kunde|umsatzstruktur|abc.?analyse/i },
  { was: 'Lieferantenübersicht', muster: /lieferant|einkauf/i },
  { was: 'Anlagen- oder Maschinenverzeichnis', muster: /anlagenverzeichnis|maschine|inventar/i },
  { was: 'Finanzierungs- und Darlehensübersicht', muster: /darlehen|kredit|finanzierung/i },
  { was: 'Versicherungsübersicht', muster: /versicherung/i },
  { was: 'Teaser (anonymes Kurzprofil)', muster: /teaser|kurzprofil/i },
  { was: 'Informationsmemorandum', muster: /information\s*memorandum|\bcim\b|expos[eé]/i },
];

/** Findet die erste passende Regel, oder null. Rät nicht. */
function regelFuer(dateiname) {
  const name = String(dateiname || '');
  if (!name.trim()) return null;
  return REGELN.find((r) => r.muster.test(name)) || null;
}

/**
 * Plant die Umsortierung.
 *
 * @param dateien [{ id, name, parent_name, confidential }]
 * @returns { verschieben, stufen, unklar, pruefliste }
 */
function planen(dateien) {
  const verschieben = [];
  const stufen = [];
  const unklar = [];

  for (const d of dateien || []) {
    const regel = regelFuer(d.name);
    if (!regel) { unklar.push({ id: d.id, name: d.name, jetzt: d.parent_name || '(oberste Ebene)' }); continue; }

    if ((d.parent_name || null) !== regel.ordner) {
      verschieben.push({ id: d.id, name: d.name, von: d.parent_name || '(oberste Ebene)', nach: regel.ordner, grund: regel.grund });
    }
    const istJetzt = Number(d.confidential) === 1 ? 'vertraulich' : 'nda';
    if (regel.stufe !== istJetzt) {
      stufen.push({ id: d.id, name: d.name, von: istJetzt, nach: regel.stufe, grund: regel.grund });
    }
  }

  const namen = (dateien || []).map((d) => String(d.name || '')).join(' \n ');
  const pruefliste = PRUEFLISTE.map((e) => ({ was: e.was, vorhanden: e.muster.test(namen) }));

  return { verschieben, stufen, unklar, pruefliste };
}

module.exports = { ORDNER, REGELN, PRUEFLISTE, regelFuer, planen };
