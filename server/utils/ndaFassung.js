// ─────────────────────────────────────────────────────────────────────────────
// Die eine Fassung einer Vertraulichkeitsvereinbarung (v0.466).
//
// ── Was vorgefallen ist ─────────────────────────────────────────────────────
//
// Ein Interessent hat online unterzeichnet und danach das signierte PDF mit
// dem verglichen, was ihm im Unterzeichnungsdialog angezeigt worden war. Es
// waren zwei verschiedene Texte:
//
//   · Der Dialog nannte als Vertragspartei eine „Phalanx M&A Advisory GmbH,
//     München". Diese Gesellschaft gibt es nicht. Im PDF steht richtig die
//     Phalanx GmbH, Helene-Lange-Straße 28, 91056 Erlangen.
//   · Die Präambel im PDF schliesst „zugunsten des Eigentümers und des
//     Zielunternehmens" ab. Im Dialog fehlte das.
//   · § 1.3 (Weitergabe an Berater, Gutachter, verbundene Gesellschaften und
//     Finanzierungspartner) und § 7 (Haftung) standen im PDF ausführlicher.
//
// Die Ursache war kein Tippfehler. Der Dialog trug seinen eigenen, von Hand
// gepflegten Vertragstext im Quelltext der Oberfläche, das PDF entstand aus
// der Vorlage in der Datenbank. Zwei Texte, zwei Pflegewege, und sie sind
// auseinandergelaufen. Dass es auffiel, verdanken wir einem Interessenten,
// der nachgelesen hat.
//
// ── Was diese Datei macht ───────────────────────────────────────────────────
//
// Sie erzeugt aus der Vorlage genau eine Fassung: Vertragsparteien, Präambel
// und nummerierte Paragraphen, Platzhalter gefüllt. Der Dialog zeigt sie, das
// PDF druckt sie, und beide bekommen denselben Fingerabdruck. Wo nur eine
// Fassung entsteht, kann keine zweite abweichen.
//
// Der Fingerabdruck ist kein Beiwerk. Er beantwortet die Frage, die der
// Interessent gestellt hat und die wir bisher nicht beantworten konnten:
// Welcher Text war das, dem ich zugestimmt habe?
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

/** Platzhalter der Form {{name}} füllen. Unbekannte bleiben sichtbar stehen. */
function fuellen(text, werte) {
  return String(text == null ? '' : text)
    .replace(/\{\{(\w+)\}\}/g, (_, k) => (werte[k] != null ? String(werte[k]) : `{{${k}}}`));
}

/**
 * Die Fassung aufbauen.
 *
 * @param {object} vorlage  aus nda_templates oder der Standardvorlage
 * @param {object} kaeufer  { first_name, last_name, company, email, ... }
 * @param {object} mandat   { codename }
 * @returns {object} { parteien, praeambel, paragraphen, gerichtsstand, vorlage_id, version, hash }
 */
function fassung({ vorlage, kaeufer = {}, mandat = {} }) {
  const berater = vorlage.advisor || {};
  const gerichtsstand = vorlage.court_venue || 'München';
  const werte = {
    project_codename: mandat.codename || '',
    buyer_name: [kaeufer.first_name, kaeufer.last_name].filter(Boolean).join(' '),
    buyer_company: kaeufer.company || '',
    court_venue: gerichtsstand,
    advisor_name: berater.name || '',
  };

  const paragraphen = (vorlage.sections || []).map((s, i) => ({
    nummer: `§ ${i + 1}`,
    titel: fuellen(s.title, werte),
    absaetze: (s.paragraphs || []).map((p) => fuellen(p, werte)),
    punkte: (s.bullets || []).map((b) => fuellen(b, werte)),
  }));

  const ergebnis = {
    vorlage_id: vorlage.id || null,
    vorlage_name: vorlage.name || null,
    version: vorlage.version || null,
    gerichtsstand,
    parteien: {
      // Die Reihenfolge und die Felder sind festgelegt, damit der
      // Fingerabdruck reproduzierbar bleibt.
      interessent: {
        name: werte.buyer_name,
        firma: kaeufer.company || null,
        email: kaeufer.email || null,
        rolle: 'Interessent',
      },
      berater: {
        name: berater.name || null,
        ansprechpartner: berater.contact || null,
        strasse: berater.address || null,
        ort: berater.city || null,
        land: berater.country || null,
        rolle: 'Transaktionsberater',
      },
    },
    praeambel: fuellen(vorlage.preamble, werte),
    paragraphen,
  };
  ergebnis.hash = fingerabdruck(ergebnis);
  return ergebnis;
}

/**
 * Der Fingerabdruck einer Fassung.
 *
 * Gebildet wird er über den reinen Text, nicht über das JSON: Eine andere
 * Feldreihenfolge oder ein zusätzliches Anzeigefeld darf den Abdruck nicht
 * ändern, eine geänderte Vertragsklausel muss es.
 */
function fingerabdruck(f) {
  const teile = [
    f.parteien.interessent.name, f.parteien.interessent.firma || '',
    f.parteien.berater.name || '', f.parteien.berater.strasse || '', f.parteien.berater.ort || '',
    f.gerichtsstand,
    f.praeambel,
    ...f.paragraphen.flatMap((p) => [p.nummer, p.titel, ...p.absaetze, ...p.punkte]),
  ];
  const text = teile.join('\n').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Dieselbe Fassung als fortlaufender Text, für Protokoll und Vergleich. */
function alsText(f) {
  const zeilen = [
    `Vertraulichkeitsvereinbarung${f.vorlage_name ? ` (${f.vorlage_name}` : ''}${f.version ? `, Fassung ${f.version})` : f.vorlage_name ? ')' : ''}`,
    '',
    'Vertragsparteien',
    `${f.parteien.interessent.name}${f.parteien.interessent.firma ? `, ${f.parteien.interessent.firma}` : ''} (Interessent)`,
    [f.parteien.berater.name, f.parteien.berater.strasse, f.parteien.berater.ort]
      .filter(Boolean).join(', ') + ' (Transaktionsberater)',
    '',
    'Präambel',
    f.praeambel,
    '',
  ];
  for (const p of f.paragraphen) {
    zeilen.push(`${p.nummer} ${p.titel}`);
    for (const a of p.absaetze) zeilen.push(a);
    for (const b of p.punkte) zeilen.push(`· ${b}`);
    zeilen.push('');
  }
  return zeilen.join('\n').trim();
}

module.exports = { fassung, fingerabdruck, alsText, fuellen };
