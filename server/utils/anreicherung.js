// ─────────────────────────────────────────────────────────────────────────────
// Maschinelle Vorschläge für fehlende Stammdaten (v0.509)
//
// Anlass, wörtlich: „vielleicht entsprechend eine KI-Funktion habe, wo Daten
// nachgetragen werden, sei es Branche, sei es Umsatzgröße etc."
//
// Gebaut nach demselben Muster wie die Übersetzung (utils/uebersetzung.js),
// aus denselben Gründen:
//
//   1. Nichts wird geraten. Ist kein Dienst eingerichtet, kommt kein
//      Vorschlag. Eine halbe Auskunft ist schlimmer als gar keine.
//   2. Maschinelles bleibt Vorschlag. Ins Feld kommt es erst, wenn ein Mensch
//      es übernimmt, und dann steht im Protokoll, wer.
//   3. Der Dienst ist austauschbar. Diese Datei kennt „schlage Werte für diese
//      Firma vor", nicht den Anbieter.
//
// Eingerichtet wird über:
//   ANREICHERUNG_SCHLUESSEL   ohne ihn passiert nichts
//   ANREICHERUNG_ART          openai oder anthropic; ohne Angabe erkannt am
//                             Schlüssel (sk-ant- heisst Anthropic)
//   ANREICHERUNG_MODELL       Standard: gpt-4o-mini oder claude-haiku-5-5
//   ANREICHERUNG_URL          nur bei einem abweichenden Endpunkt
//
// Eine vierte Regel, die hier besonders zählt: Das Modell darf sagen, dass es
// etwas nicht weiss. Ein Feld ohne Antwort ist ein gutes Ergebnis, und die
// Aufforderung dazu steht ausdrücklich im Auftrag. Ein Modell, das bei einer
// unbekannten Firma eine Umsatzgrösse nennt, hat sie erfunden.
// ─────────────────────────────────────────────────────────────────────────────

const SCHLUESSEL = () => process.env.ANREICHERUNG_SCHLUESSEL || '';

/**
 * Welcher Anbieter? (v0.510)
 *
 * Wird nichts gesetzt, entscheidet der Schlüssel. Die Schlüssel von Anthropic
 * beginnen mit `sk-ant-`, und daran lässt sich der Anbieter ohne eine zweite
 * Variable erkennen. Eine Einstellung, die man vergessen kann, ist eine
 * Fehlerquelle; eine, die sich von selbst ergibt, nicht.
 */
function ART() {
  const gesetzt = String(process.env.ANREICHERUNG_ART || '').toLowerCase();
  if (gesetzt) return gesetzt;
  return SCHLUESSEL().startsWith('sk-ant-') ? 'anthropic' : 'openai';
}

const MODELL = () => process.env.ANREICHERUNG_MODELL
  || (ART() === 'anthropic' ? 'claude-haiku-5-5' : 'gpt-4o-mini');

const ADRESSE = () => process.env.ANREICHERUNG_URL
  || (ART() === 'anthropic' ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions');

/** Ist ein Dienst eingerichtet? Wird auch in der Oberfläche angezeigt. */
const eingerichtet = () => !!SCHLUESSEL();

// Welche Felder vorgeschlagen werden dürfen, und was ein zulässiger Wert ist.
// Alles, was hier nicht steht, wird verworfen, auch wenn das Modell es liefert.
const FELDER = {
  sektor: { label: 'Branche oder Sektor', pruefe: (v) => String(v).length >= 3 && String(v).length <= 80 },
  // v0.512: Grosszuegiger geprueft. Die erste Fassung verwarf „unter 5 Mio.
  // EUR" und „ca. 12 Mio. EUR", also genau die vorsichtigen Formulierungen,
  // die bei einer Groessenordnung die ehrlichsten sind. Verlangt wird jetzt
  // eine Zahl und eine Einheit, mehr nicht.
  revenue_band: { label: 'Umsatzgrößenordnung',
    pruefe: (v) => String(v).length <= 60 && /\d/.test(String(v)) && /(mio|mrd|million|milliarde|tsd|eur|€)/i.test(String(v)) },
  employees: { label: 'Mitarbeiterzahl', pruefe: (v) => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < 2000000 },
  region: { label: 'Region', pruefe: (v) => String(v).length >= 2 && String(v).length <= 60 },
  // Eine Adresse ohne Vorsatz ist keine falsche Adresse. Sie wird ergaenzt,
  // statt den Vorschlag wegzuwerfen.
  website: { label: 'Webseite',
    pruefe: (v) => /^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}/.test(String(v)),
    normal: (v) => (/^https?:\/\//i.test(String(v)) ? String(v) : `https://${String(v).replace(/^\/+/, '')}`) },
};

const AUFTRAG = `Du ergänzt Stammdaten in einer Datenbank für Unternehmensnachfolge und M&A.

Dir wird eine Firma genannt, mit dem, was bereits bekannt ist. Schlage ausschließlich für die
angefragten Felder Werte vor.

Die wichtigste Regel: Wenn du eine Angabe nicht sicher weißt, lass das Feld weg. Ein fehlendes
Feld ist ein gutes Ergebnis. Eine plausible, aber erfundene Umsatzgröße ist ein Schaden, weil sie
in der Datenbank später nicht mehr von einer recherchierten zu unterscheiden ist.

Antworte als JSON-Objekt mit genau dieser Form:
{"felder": {"<feldname>": {"wert": "...", "begruendung": "woran du es festmachst", "sicherheit": 0-100}}}

Halte die Begründung kurz, höchstens fünfzehn Wörter. Die Antwort muss vollständig in das
Antwortfenster passen; lieber weniger Felder als eine abgeschnittene Antwort.

Zulässige Feldnamen: sektor, revenue_band, employees, region, website.
Werte: sektor als kurze Branchenbezeichnung auf Deutsch. revenue_band als Spanne mit Einheit,
etwa "10 bis 25 Mio. EUR". employees als ganze Zahl. region als Land oder Bundesland.
website als vollständige Adresse mit https.
Keine Vorbemerkung, kein Text außerhalb des JSON.`;

/**
 * Das Modell fragen.
 *
 * @returns {{felder: object, fehler: string|null}}
 */
/**
 * Was an den Anbieter geht. Zwei Formate, eine Absicht (v0.510).
 *
 * Die beiden Häuser sprechen verschieden: OpenAI nimmt den Auftrag als erste
 * Nachricht und kann ein JSON-Format erzwingen, Anthropic hat ein eigenes
 * Feld für den Auftrag und erzwingt nichts. Deshalb unten das Abschälen von
 * Code-Zäunen: Ein Modell, das um JSON gebeten wird, legt gern noch drei
 * Rückstriche darum.
 */
function anfrage(beschreibung, gesucht) {
  const nutzertext = `${beschreibung}\n\nGesucht: ${gesucht.join(', ')}`;
  if (ART() === 'anthropic') {
    return {
      kopf: {
        'x-api-key': SCHLUESSEL(),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      koerper: {
        model: MODELL(),
        max_tokens: 2048,
        // Kein `temperature` (v0.511). Die neueren Modelle von Anthropic
        // weisen die Anfrage damit rundweg ab: „temperature is deprecated for
        // this model". Auf der Teststufe war das die erste echte Anfrage und
        // sofort ein Fehler 400. Für diese Aufgabe ist das ohne Verlust: Es
        // wird nach Tatsachen gefragt, nicht nach Formulierungen.
        system: AUFTRAG,
        messages: [{ role: 'user', content: nutzertext }],
      },
    };
  }
  return {
    kopf: { Authorization: `Bearer ${SCHLUESSEL()}`, 'Content-Type': 'application/json' },
    koerper: {
      model: MODELL(),
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AUFTRAG },
        { role: 'user', content: nutzertext },
      ],
    },
  };
}

/** Den Text aus der Antwort holen, egal von welchem Anbieter sie kommt. */
function textAus(j) {
  if (!j) return null;
  // OpenAI und alles, was dessen Format spricht.
  const openai = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (openai) return String(openai);
  // Anthropic: eine Liste von Blöcken, der erste mit Text zählt.
  if (Array.isArray(j.content)) {
    const block = j.content.find((b) => b && b.type === 'text' && b.text);
    if (block) return String(block.text);
  }
  return null;
}

/** Drei Rückstriche und ein „json" davor sind kein JSON, aber umschliessen es. */
function ohneZaun(text) {
  const t = String(text || '').trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

/**
 * Das Modell fragen.
 *
 * @returns {{felder: object, fehler: string|null}}
 */
async function frage(beschreibung, gesucht) {
  if (!eingerichtet()) return { felder: {}, fehler: 'Es ist kein Dienst für Vorschläge eingerichtet.' };
  const { kopf, koerper } = anfrage(beschreibung, gesucht);
  let res;
  try {
    res = await fetch(ADRESSE(), { method: 'POST', headers: kopf, body: JSON.stringify(koerper) });
  } catch (e) {
    return { felder: {}, fehler: `Der Dienst war nicht erreichbar: ${e.message}` };
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return { felder: {}, fehler: `Der Dienst antwortete mit ${res.status}: ${txt.slice(0, 120)}` };
  }
  const j = await res.json().catch(() => null);
  const roh = textAus(j);
  if (!roh) return { felder: {}, fehler: 'Der Dienst hat nichts zurückgegeben.' };
  let geparst;
  try {
    geparst = JSON.parse(ohneZaun(roh));
  } catch {
    // v0.512: „kein lesbares JSON" allein ist keine Auskunft. Der häufigste
    // Grund ist eine abgeschnittene Antwort, und das steht in der Antwort
    // selbst. Bei Philip Morris International ist genau das passiert: Das
    // Modell weiss viel, schreibt lange Begründungen und läuft in die
    // Obergrenze.
    const abgeschnitten = j && (j.stop_reason === 'max_tokens'
      || (j.choices && j.choices[0] && j.choices[0].finish_reason === 'length'));
    console.warn('Anreicherung: unlesbare Antwort', { abgeschnitten: !!abgeschnitten, anfang: String(roh).slice(0, 160) });
    return {
      felder: {},
      fehler: abgeschnitten
        ? 'Die Antwort des Modells war abgeschnitten. Ein kürzeres Modell oder weniger gesuchte Felder helfen.'
        : 'Die Antwort war kein lesbares JSON.',
    };
  }
  return { felder: (geparst && geparst.felder) || {}, fehler: null };
}

/**
 * Vorschläge für eine Firma holen und ablegen.
 *
 * Geschrieben wird ausschließlich in die Vorschlagstabelle, nie in den
 * Datensatz. Felder, die schon gefüllt sind, werden gar nicht erst gefragt.
 *
 * @returns {{vorschlaege: Array, gefragt: Array, fehler: string|null}}
 */
async function fuerFirma(db, companyId, { actorId = null } = {}) {
  const f = await db.get('SELECT * FROM crm_companies WHERE id = ?', [companyId]).catch(() => null);
  if (!f) return { vorschlaege: [], gefragt: [], beantwortet: 0, verworfen: [], schweigen: false, fehler: 'Diese Firma gibt es nicht.' };

  const fehltWert = (k) => {
    if (k === 'employees') return !(Number(f.employees) > 0);
    if (k === 'sektor') return !(f.sektor || f.industry);
    return !f[k] || !String(f[k]).trim();
  };
  const gesucht = Object.keys(FELDER).filter(fehltWert);
  if (!gesucht.length) return { vorschlaege: [], gefragt: [], beantwortet: 0, verworfen: [], schweigen: false, fehler: null };

  const bekannt = [
    `Firma: ${f.name}`,
    f.website ? `Webseite: ${f.website}` : null,
    f.city ? `Ort: ${f.city}` : null,
    f.country ? `Land: ${f.country}` : null,
    f.sektor || f.industry ? `Branche: ${f.sektor || f.industry}` : null,
    f.description ? `Beschreibung: ${String(f.description).slice(0, 400)}` : null,
  ].filter(Boolean).join('\n');

  const { felder, fehler } = await frage(bekannt, gesucht);
  if (fehler) return { vorschlaege: [], gefragt: gesucht, beantwortet: 0, verworfen: [], schweigen: false, fehler };

  const abgelegt = [];
  // v0.512: Was das Modell geantwortet hat und was davon verworfen wurde,
  // steht jetzt in der Antwort. Vorher kam bei einer verworfenen Angabe eine
  // leere Liste zurück, ununterscheidbar von „das Modell wusste nichts".
  const verworfen = [];
  let beantwortet = 0;
  for (const [feld, angabe] of Object.entries(felder)) {
    const wert = angabe && angabe.wert;
    if (wert != null && String(wert).trim() !== '') beantwortet += 1;
    if (!FELDER[feld] || !gesucht.includes(feld)) {
      if (wert) verworfen.push({ feld, wert: String(wert).slice(0, 60), grund: 'Dieses Feld wird nicht ergänzt.' });
      continue;
    }
    if (wert == null || String(wert).trim() === '') continue;
    if (!FELDER[feld].pruefe(wert)) {
      verworfen.push({ feld, wert: String(wert).slice(0, 60), grund: 'Das Format passt nicht zum Feld.' });
      continue;
    }
    const sicherheit = Number.isFinite(Number(angabe.sicherheit)) ? Math.max(0, Math.min(100, Number(angabe.sicherheit))) : null;
    // Eine Adresse ohne Vorsatz wird ergänzt statt verworfen.
    const sauber = FELDER[feld].normal ? FELDER[feld].normal(wert) : wert;

    // Ein einmal abgelehnter Vorschlag kommt nicht wieder. Sonst steht morgen
    // dasselbe da, und die Liste verliert ihren Wert.
    const alt = await db.get(
      'SELECT id, stand FROM anreicherung_vorschlaege WHERE objekt = ? AND objekt_id = ? AND feld = ?',
      ['firma', companyId, feld]).catch(() => null);
    if (alt && alt.stand !== 'offen') {
      verworfen.push({ feld, wert: String(sauber).slice(0, 60), grund: `Zu diesem Feld wurde bereits entschieden (${alt.stand}).` });
      continue;
    }

    if (alt) {
      await db.run(
        `UPDATE anreicherung_vorschlaege SET wert = ?, begruendung = ?, quelle = ?, sicherheit = ?, erstellt_am = now()
          WHERE id = ?`,
        [String(sauber), String(angabe.begruendung || '').slice(0, 500) || null, MODELL(), sicherheit, alt.id]).catch(() => {});
      abgelegt.push({ id: alt.id, feld, wert: String(sauber), sicherheit });
    } else {
      const id = await db.insert(
        `INSERT INTO anreicherung_vorschlaege (objekt, objekt_id, feld, wert, begruendung, quelle, sicherheit)
         VALUES ('firma', ?, ?, ?, ?, ?, ?) RETURNING id`,
        [companyId, feld, String(sauber), String(angabe.begruendung || '').slice(0, 500) || null, MODELL(), sicherheit]).catch(() => null);
      if (id) abgelegt.push({ id, feld, wert: String(sauber), sicherheit });
    }
  }

  if (actorId) {
    require('../db/database').auditLog(actorId, 'ANREICHERUNG_GEFRAGT', 'crm_company', companyId,
      `${abgelegt.length} Vorschlag/Vorschläge für ${gesucht.join(', ')} (${MODELL()})`, null);
  }
  return {
    vorschlaege: abgelegt,
    gefragt: gesucht,
    beantwortet,
    verworfen,
    // Das Modell hat geantwortet, aber zu nichts Brauchbarem. Das ist eine
    // Auskunft und kein Nichts, und sie gehört in die Oberfläche.
    schweigen: beantwortet === 0,
    fehler: null,
  };
}

/**
 * Einen Vorschlag übernehmen.
 *
 * Übernommen wird nur in ein Feld, das noch leer ist. Was ein Mensch
 * geschrieben hat, ersetzt keine Maschine, auch nicht auf Klick.
 */
async function uebernehmen(db, vorschlagId, actorId) {
  const v = await db.get('SELECT * FROM anreicherung_vorschlaege WHERE id = ?', [vorschlagId]).catch(() => null);
  if (!v) return { ok: false, grund: 'Diesen Vorschlag gibt es nicht.' };
  if (v.stand !== 'offen') return { ok: false, grund: `Dieser Vorschlag ist bereits ${v.stand}.` };
  if (v.objekt !== 'firma' || !FELDER[v.feld]) return { ok: false, grund: 'Dieses Feld lässt sich nicht übernehmen.' };

  const f = await db.get('SELECT * FROM crm_companies WHERE id = ?', [v.objekt_id]).catch(() => null);
  if (!f) return { ok: false, grund: 'Die Firma gibt es nicht mehr.' };
  const belegt = v.feld === 'employees' ? Number(f.employees) > 0 : !!(f[v.feld] && String(f[v.feld]).trim());
  if (belegt) return { ok: false, grund: 'In diesem Feld steht bereits etwas. Es wird nicht überschrieben.' };

  const wert = v.feld === 'employees' ? Number(v.wert) : v.wert;
  await db.run(`UPDATE crm_companies SET ${v.feld} = ?, updated_at = now() WHERE id = ?`, [wert, v.objekt_id]);
  await db.run(
    `UPDATE anreicherung_vorschlaege SET stand = 'uebernommen', entschieden_von = ?, entschieden_am = now() WHERE id = ?`,
    [actorId, vorschlagId]);
  require('../db/database').auditLog(actorId, 'ANREICHERUNG_UEBERNOMMEN', 'crm_company', v.objekt_id,
    `${v.feld} = ${String(v.wert).slice(0, 80)} (${v.quelle})`, null);
  return { ok: true, feld: v.feld, wert };
}

/** Einen Vorschlag ablehnen. Gelöscht wird nichts. */
async function ablehnen(db, vorschlagId, actorId) {
  const v = await db.get('SELECT * FROM anreicherung_vorschlaege WHERE id = ?', [vorschlagId]).catch(() => null);
  if (!v) return { ok: false, grund: 'Diesen Vorschlag gibt es nicht.' };
  await db.run(
    `UPDATE anreicherung_vorschlaege SET stand = 'abgelehnt', entschieden_von = ?, entschieden_am = now() WHERE id = ?`,
    [actorId, vorschlagId]);
  return { ok: true };
}

module.exports = { eingerichtet, FELDER, fuerFirma, uebernehmen, ablehnen, frage, anfrage, textAus, ohneZaun, ART, MODELL, ADRESSE };
