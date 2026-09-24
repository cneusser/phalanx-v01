// ─────────────────────────────────────────────────────────────────────────────
// Einheitliche Datenraum-Struktur (v0.404).
//
// Bis hierher hatte jedes Mandat seine eigene Gliederung, und die erste Ebene
// war lang und unübersichtlich („Leistungswirtschaftliche Entwicklung (Produkte,
// Kunden, Markt, Wettbewerb, Fertigung)"). Käufer finden sich darin schlecht
// zurecht, und wir selbst müssen bei jedem Mandat neu überlegen.
//
// Jetzt gilt überall dasselbe: sieben Bereiche auf der ersten Ebene, darunter
// je drei bis fünf Unterordner. Mehr als zwei Ebenen gibt es nicht. Die Namen
// sind kurz und sagen, was drin ist.
//
// Diese Datei enthält drei Dinge, alle ohne Datenbank und damit einzeln prüfbar:
//   1. die Struktur selbst
//   2. eine Zuordnung, die einen beliebigen Ordner- oder Dateinamen dem
//      richtigen Platz zuweist
//   3. einen Leser für eingefügte Verzeichnislisten aus fremden Datenräumen
// ─────────────────────────────────────────────────────────────────────────────

// Bereich → Unterordner. Reihenfolge ist die Reihenfolge im Datenraum.
const STRUKTUR = [
  ['Transaktion', [
    'Teaser und Informationsmemorandum',
    'Prozess und Zeitplan',
  ]],
  ['Unternehmen und Recht', [
    'Gesellschaftsvertrag und Register',
    'Gesellschafter und Beteiligungen',
    'Verträge und Vollmachten',
    'Genehmigungen, Umwelt, Rechtsstreitigkeiten',
  ]],
  ['Finanzen und Steuern', [
    'Jahresabschlüsse',
    'Laufendes Jahr',
    'Planung',
    'Banken und Finanzierung',
    'Steuern',
  ]],
  ['Markt und Geschäft', [
    'Produkte und Leistungen',
    'Kunden und Umsatz',
    'Lieferanten und Einkauf',
    'Markt und Wettbewerb',
  ]],
  ['Personal', [
    'Belegschaft und Verträge',
    'Vergütung und Altersversorgung',
    'Mitbestimmung',
  ]],
  ['Betrieb und IT', [
    'Standorte und Immobilien',
    'Anlagen und Technik',
    'IT und Systeme',
    'Versicherungen',
  ]],
  // Bleibt bewusst ohne Unterordner und wird als vertraulich angelegt: Hier
  // liegen Unterlagen, die nur mit Einzelfreigabe sichtbar sind.
  ['Clean Team', []],
];

const CLEAN_TEAM = 'Clean Team';

// Alle gültigen Pfade als „Bereich/Unterordner".
function allePfade() {
  const out = [];
  for (const [bereich, unter] of STRUKTUR) {
    out.push(bereich);
    for (const u of unter) out.push(`${bereich}/${u}`);
  }
  return out;
}

// Nummernpräfix, Endung und Sonderzeichen weg, damit „3.2 Jahresabschlüsse 2023.pdf"
// und „jahresabschluss" vergleichbar werden.
function schluessel(name) {
  return String(name || '')
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .replace(/^\s*[\d._-]*\d[\d._-]*\s*[.)]?\s+/, '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Unsere eigenen alten Ordnernamen. Sie sind Sammelbecken für mehrere Themen
// („Leistungswirtschaftliche Entwicklung (Produkte, Kunden, Markt, Wettbewerb,
// Fertigung)") und lassen sich nicht sinnvoll auf einen Unterordner abbilden.
// Sie wandern deshalb auf die erste Ebene des passenden Bereichs; die Dateien
// darin werden anschließend einzeln nach ihrem eigenen Namen einsortiert.
const ALTBESTAND = [
  [/^teaser und investment memorandum$/, 'Transaktion'],
  [/^rechtliche situation im unternehmen$/, 'Unternehmen und Recht'],
  [/^entwicklung und uebersicht des unternehmens$/, 'Unternehmen und Recht'],
  [/^mitarbeiter und management$/, 'Personal'],
  [/^wirtschaftliche entwicklung/, 'Finanzen und Steuern'],
  [/^leistungswirtschaftliche entwicklung/, 'Markt und Geschäft'],
  [/^organisation und steuerung$/, 'Unternehmen und Recht'],
  [/^finanz und rechnungswesen it$/, 'Finanzen und Steuern'],
];

// Zuordnung: Muster → Zielpfad. Reihenfolge zählt, der erste Treffer gewinnt.
// Deshalb stehen die engen Begriffe oben und die weiten unten.
const REGELN = [
  // Transaktion
  [/\bteaser\b|kurzprofil|expose|expose|anonym/, 'Transaktion/Teaser und Informationsmemorandum'],
  [/investment memorandum|informationsmemorandum|memorandum|factbook/, 'Transaktion/Teaser und Informationsmemorandum'],
  [/prozessbrief|zeitplan|timetable|meilenstein|prozess brief|bieterbrief|angebotsfrist/, 'Transaktion/Prozess und Zeitplan'],
  [/vertraulichkeit|geheimhaltung|\bnda\b|letter of intent|\bloi\b|term sheet/, 'Transaktion/Prozess und Zeitplan'],

  // Clean Team zuerst pruefen: Inhalte sind heikel, im Zweifel dorthin.
  [/clean team|cleanteam|wettbewerbssensibel|kartellrechtlich sensibel/, CLEAN_TEAM],

  // Personal
  [/gehalt|lohn|verguetung|entgelt|bonus|tantieme|gehaltsliste|payroll/, 'Personal/Vergütung und Altersversorgung'],
  [/altersversorgung|pension|betriebsrente|\bbav\b|direktversicherung|unterstuetzungskasse/, 'Personal/Vergütung und Altersversorgung'],
  [/betriebsrat|mitbestimmung|betriebsvereinbarung|tarif|gewerkschaft|schwerbehinderten/, 'Personal/Mitbestimmung'],
  [/personal|mitarbeiter|belegschaft|arbeitsvertrag|anstellungsvertrag|stellenplan|organigramm personal|fluktuation|urlaub|krankenstand|zeugnis|geschaeftsfuehrervertrag/, 'Personal/Belegschaft und Verträge'],

  // Finanzen und Steuern
  [/jahresabschluss|jahresabschluesse|bilanz|guv|gewinn und verlust|\bhgb\b|testat|pruefungsbericht|lagebericht|\bja\s*\d{4}|\bjab\b/, 'Finanzen und Steuern/Jahresabschlüsse'],
  [/\bbwa\b|susa|summen und salden|monatsbericht|zwischenabschluss|laufendes jahr|aktuelle zahlen|offene posten|opos|debitoren|kreditoren/, 'Finanzen und Steuern/Laufendes Jahr'],
  [/planung|budget|forecast|hochrechnung|businessplan|business plan|liquiditaetsplan|mittelfrist/, 'Finanzen und Steuern/Planung'],
  [/bank|darlehen|kredit|finanzierung|leasing|factoring|avale|buergschaft|kontokorrent|covenant|foerdermittel|kfw/, 'Finanzen und Steuern/Banken und Finanzierung'],
  // „Steuerung" ist keine Steuer, deshalb das ausschliessende Vorausschauen.
  [/steuer(?!ung)|betriebspruefung|finanzamt|elster|verrechnungspreis/, 'Finanzen und Steuern/Steuern'],

  // Markt und Geschäft
  [/kunde|umsatz je|abc analyse|auftragsbestand|auftragseingang|debitorenliste kunden|referenzen/, 'Markt und Geschäft/Kunden und Umsatz'],
  [/lieferant|einkauf|beschaffung|bezugsquelle|rahmenvertrag einkauf|materialkosten/, 'Markt und Geschäft/Lieferanten und Einkauf'],
  [/markt|wettbewerb|branche|marktstudie|konkurrenz|positionierung|marketing|vertriebsstrategie/, 'Markt und Geschäft/Markt und Wettbewerb'],
  [/produkt|leistung|sortiment|preisliste|katalog|dienstleistung|rezeptur|entwicklung produkt|patent|marke|schutzrecht/, 'Markt und Geschäft/Produkte und Leistungen'],

  // Rechnungswesen gehoert zu den Finanzen, auch wenn „IT" im Namen steht.
  [/rechnungswesen|buchhaltung|buchfuehrung|controlling/, 'Finanzen und Steuern/Laufendes Jahr'],
  [/rechtlich|rechtsform|juristisch/, 'Unternehmen und Recht/Verträge und Vollmachten'],
  [/organigramm|organisationshandbuch/, 'Unternehmen und Recht/Gesellschafter und Beteiligungen'],

  // Betrieb und IT
  [/\bit\b|edv|software|erp|crm system|server|lizenz|hardware|datenschutz|dsgvo|informationssicherheit|backup/, 'Betrieb und IT/IT und Systeme'],
  [/immobilie|grundstueck|miete|mietvertrag|pacht|standort|gebaeude|grundbuch|lageplan/, 'Betrieb und IT/Standorte und Immobilien'],
  // „Anlage 3" ist ein Anhang, keine Maschine. Deshalb zaehlt nur die Mehrzahl
  // oder ein eindeutiger Fachbegriff, und „Anlage" mit Nummer faellt heraus.
  [/maschine|anlagenverzeichnis|anlagevermoegen|anlagenspiegel|anlagen\b(?!\s*\d)|fuhrpark|fahrzeug|technik|wartung|instandhaltung|produktion|fertigung|kapazitaet/, 'Betrieb und IT/Anlagen und Technik'],
  [/versicherung|police|haftpflicht|betriebsunterbrechung/, 'Betrieb und IT/Versicherungen'],

  // Unternehmen und Recht
  [/gesellschaftsvertrag|satzung|handelsregister|registerauszug|gruendung|umwandlung|verschmelzung/, 'Unternehmen und Recht/Gesellschaftsvertrag und Register'],
  [/gesellschafter|anteil|beteiligung|kapitalerhoehung|stimmrecht|poolvertrag|tochtergesellschaft|konzern/, 'Unternehmen und Recht/Gesellschafter und Beteiligungen'],
  [/genehmigung|erlaubnis|umwelt|altlast|emission|behoerde|rechtsstreit|klage|prozess gericht|mahnbescheid|compliance/, 'Unternehmen und Recht/Genehmigungen, Umwelt, Rechtsstreitigkeiten'],
  [/vertrag|vollmacht|agb|kooperation|lizenzvertrag|geheimhaltungsvereinbarung/, 'Unternehmen und Recht/Verträge und Vollmachten'],
  [/strategie|historie|geschichte|unternehmensdarstellung|ueberblick|uebersicht des unternehmens|organisation|steuerung|fuehrung/, 'Unternehmen und Recht/Gesellschafter und Beteiligungen'],

  // Sehr weite Begriffe ganz zum Schluss, damit sie nichts Enges verdrängen.
  [/recht|legal/, 'Unternehmen und Recht/Verträge und Vollmachten'],
  [/finanz|rechnungswesen|controlling|buchhaltung/, 'Finanzen und Steuern/Laufendes Jahr'],
];

/**
 * Wohin gehört dieser Ordner oder diese Datei?
 * @param {string} name
 * @param {string} [elternName]  Name des übergeordneten Ordners, hilft bei kurzen Dateinamen
 * @returns {{pfad: string|null, sicher: boolean}}  pfad = null heißt: nicht zuzuordnen
 */
function zuordnen(name, elternName = '') {
  const s = schluessel(name);
  if (!s) return { pfad: null, sicher: false };
  for (const [muster, ziel] of ALTBESTAND) if (muster.test(s)) return { pfad: ziel, sicher: true };
  for (const [muster, ziel] of REGELN) if (muster.test(s)) return { pfad: ziel, sicher: true };
  // Nichts gefunden? Dann entscheidet der übergeordnete Ordner, sofern er selbst
  // eindeutig war. So wandert „Anlage 3.pdf" mit seinem Ordner mit.
  if (elternName) {
    const e = zuordnen(elternName);
    if (e.pfad) return { pfad: e.pfad, sicher: false };
  }
  return { pfad: null, sicher: false };
}

/**
 * Eine eingefügte Verzeichnisliste lesen.
 * Erkannt werden Einrückung (Leerzeichen oder Tabulator), Nummerierung
 * („1.", „1.2", „01_") und Pfadangaben mit Schrägstrich oder Backslash.
 * @returns {Array<{name: string, ebene: number, roh: string}>}
 */
function leseListe(text) {
  const zeilen = String(text || '').split(/\r?\n/);
  const out = [];
  for (const roh of zeilen) {
    if (!roh.trim()) continue;
    // Pfadform „Finanzen/Jahresabschluesse/2023.pdf": tiefste Angabe zaehlt.
    if (/[\\/]/.test(roh.trim())) {
      const teile = roh.trim().split(/[\\/]+/).map((t) => t.trim()).filter(Boolean);
      teile.forEach((t, i) => out.push({ name: entferneNummer(t), ebene: i, roh: roh.trim() }));
      continue;
    }
    const einzug = (roh.match(/^[\t ]*/) || [''])[0];
    const ebene = Math.floor(einzug.replace(/\t/g, '    ').length / 2);
    const name = entferneNummer(roh.trim().replace(/^[-*•]\s*/, ''));
    if (name) out.push({ name, ebene, roh: roh.trim() });
  }
  return out;
}

function entferneNummer(s) {
  return String(s || '').replace(/^\s*\d+(\.\d+)*\s*[.)_-]?\s+/, '').trim();
}

/**
 * Aus einer eingefügten Liste einen Zuordnungsplan machen.
 * @returns {Array<{quelle: string, ziel: string|null, sicher: boolean}>}
 */
function planAusListe(text) {
  const zeilen = leseListe(text);
  const plan = [];
  const elternJeEbene = [];
  for (const z of zeilen) {
    elternJeEbene[z.ebene] = z.name;
    const eltern = z.ebene > 0 ? elternJeEbene[z.ebene - 1] || '' : '';
    const { pfad, sicher } = zuordnen(z.name, eltern);
    plan.push({ quelle: z.roh, name: z.name, ebene: z.ebene, ziel: pfad, sicher });
  }
  return plan;
}

module.exports = {
  STRUKTUR, CLEAN_TEAM, ALTBESTAND, allePfade, schluessel, zuordnen, leseListe, planAusListe, entferneNummer, REGELN,
};
