// ─────────────────────────────────────────────────────────────────────────────
// Übersetzung der Mandatstexte (v0.410).
//
// Drei Grundsätze, alle drei aus demselben Grund: Bei einem Unternehmensverkauf
// ist ein schiefer Satz kein Schönheitsfehler, sondern ein Sachfehler.
//
//   1. Nichts wird geraten. Ist kein Dienst eingerichtet, bleibt die zweite
//      Fassung leer und wird als fehlend ausgewiesen. Eine halbe Übersetzung
//      ist schlimmer als gar keine.
//   2. Maschinelles bleibt Entwurf. Nach außen geht nur, was ein Mensch
//      freigegeben hat.
//   3. Der Dienst ist austauschbar. Die Plattform kennt nur „übersetze diesen
//      Text", nicht den Anbieter.
//
// Eingerichtet wird über zwei Variablen:
//   UEBERSETZER_URL      Adresse der Schnittstelle
//   UEBERSETZER_SCHLUESSEL
//   UEBERSETZER_ART      deepl (Standard) oder openai
//
// Ohne diese Variablen läuft alles weiter, nur eben ohne Vorbelegung.
// ─────────────────────────────────────────────────────────────────────────────

const ART = () => String(process.env.UEBERSETZER_ART || 'deepl').toLowerCase();
const SCHLUESSEL = () => process.env.UEBERSETZER_SCHLUESSEL || '';

/** Ist ein Dienst eingerichtet? Wird auch in der Oberfläche angezeigt. */
function eingerichtet() {
  return !!SCHLUESSEL();
}

function adresse() {
  if (process.env.UEBERSETZER_URL) return process.env.UEBERSETZER_URL;
  if (ART() === 'openai') return 'https://api.openai.com/v1/chat/completions';
  // DeepL trennt zwischen kostenfreiem und kostenpflichtigem Zugang am Schlüssel.
  return SCHLUESSEL().endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
}

/**
 * Einen Text übersetzen.
 *
 * @returns {Promise<{text: string|null, grund: string|null}>}
 *   text bleibt null, wenn nichts Verlässliches herauskommt. Der Grund steht
 *   dann im Klartext, damit in der Oberfläche nicht nur „Fehler" erscheint.
 */
async function uebersetze(text, { von = 'DE', nach = 'EN' } = {}) {
  const roh = String(text == null ? '' : text).trim();
  if (!roh) return { text: null, grund: 'kein Text vorhanden' };
  if (!eingerichtet()) return { text: null, grund: 'kein Übersetzungsdienst eingerichtet' };

  try {
    if (ART() === 'openai') return await ueberOpenAi(roh, von, nach);
    return await ueberDeepl(roh, von, nach);
  } catch (e) {
    return { text: null, grund: String(e.message).slice(0, 200) };
  }
}

async function ueberDeepl(text, von, nach) {
  const res = await fetch(adresse(), {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${SCHLUESSEL()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: von.toUpperCase(),
      target_lang: nach.toUpperCase() === 'EN' ? 'EN-GB' : nach.toUpperCase(),
      // Der Ton der Mandatstexte ist förmlich, das soll er bleiben.
      formality: 'prefer_more',
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Übersetzung fehlgeschlagen (${res.status}): ${txt.slice(0, 120)}`);
  }
  const j = await res.json();
  const ergebnis = j && j.translations && j.translations[0] && j.translations[0].text;
  return ergebnis ? { text: ergebnis, grund: null } : { text: null, grund: 'leere Antwort des Dienstes' };
}

async function ueberOpenAi(text, von, nach) {
  const auftrag = `Übersetze den folgenden Text aus dem ${von === 'DE' ? 'Deutschen' : 'Englischen'} `
    + `ins ${nach === 'EN' ? 'britische Englisch' : 'Deutsche'}. Es handelt sich um einen `
    + 'Mandatstext aus dem Bereich Unternehmensnachfolge und M&A. Behalte den förmlichen Ton, '
    + 'die Zahlen, die Einheiten und die Absätze unverändert bei. Gib ausschließlich die '
    + 'Übersetzung zurück, ohne Vorbemerkung.';
  const res = await fetch(adresse(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${SCHLUESSEL()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.UEBERSETZER_MODELL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [{ role: 'system', content: auftrag }, { role: 'user', content: text }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Übersetzung fehlgeschlagen (${res.status}): ${txt.slice(0, 120)}`);
  }
  const j = await res.json();
  const ergebnis = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  return ergebnis ? { text: String(ergebnis).trim(), grund: null } : { text: null, grund: 'leere Antwort des Dienstes' };
}

/**
 * Mehrere Felder eines Mandats vorbelegen.
 * Schon vorhandene Fassungen werden nicht überschrieben: Was ein Mensch
 * geschrieben hat, ersetzt keine Maschine.
 *
 * @returns {{werte: object, status: string, fehler: Array}}
 */
async function felderVorbelegen(zeile, felder, { von = 'DE', nach = 'EN' } = {}) {
  const werte = {};
  const fehler = [];
  let erfolg = 0;
  for (const feld of felder) {
    const ziel = `${feld}_en`;
    if (zeile[ziel] && String(zeile[ziel]).trim()) continue;   // schon vorhanden
    const quelle = zeile[feld];
    if (!quelle || !String(quelle).trim()) continue;
    const r = await uebersetze(quelle, { von, nach });
    if (r.text) { werte[ziel] = r.text; erfolg += 1; }
    else fehler.push({ feld, grund: r.grund });
  }
  return {
    werte,
    status: erfolg ? 'entwurf' : 'fehlt',
    fehler,
  };
}

/**
 * Die Fassung in der gewünschten Sprache wählen.
 *
 * Es gilt die eine Regel: Grundspalte Deutsch, Spalte mit _en Englisch. Das
 * Feld `sprache` sagt nur, in welcher Sprache ein Mandat erfasst wurde, und ist
 * eine Information über die Herkunft, keine Weiche. Ein früherer Stand hat das
 * verwechselt und einem englischen Leser bei einem englisch erfassten Mandat
 * den deutschen Text gezeigt.
 *
 * Gezeigt wird die englische Fassung nur, wenn sie freigegeben ist. Fehlt sie
 * oder ist sie nur ein Entwurf, bleibt es beim deutschen Text, und
 * `text_sprache` sagt, was der Leser tatsächlich vor sich hat. Lieber ein
 * ehrlich gekennzeichneter deutscher Text als ein ungeprüfter englischer.
 */
function inSprache(zeile, felder, sprache) {
  const z = { ...zeile };
  z.text_sprache = 'de';                       // die Grundspalte führt Deutsch
  if (sprache !== 'en') return z;
  if (z.uebersetzung_status !== 'freigegeben') return z;
  for (const f of felder) {
    const en = z[`${f}_en`];
    if (en && String(en).trim()) { z[f] = en; z.text_sprache = 'en'; }
  }
  return z;
}

module.exports = { eingerichtet, uebersetze, felderVorbelegen, inSprache };
