// ─────────────────────────────────────────────────────────────────────────────
// Korrespondenz aus Phalanx OS lesen (v0.454).
//
// Die E-Mail-Korrespondenz liegt in Phalanx OS und bleibt dort. CapitalMatch
// holt sie bei jedem Aufruf und speichert sie nicht.
//
// Der Grund ist Löschbarkeit, nicht Bequemlichkeit. Geschäftliche
// Korrespondenz aus laufenden Verkaufsprozessen ist das Vertraulichste in
// diesem Haus. Ein zweiter Bestand müsste jede Löschung nach Artikel 17, jede
// zurückgenommene Zuordnung und jede versehentlich falsch abgelegte Mail
// nachvollziehen, und in der Praxis tut er das nie vollständig. Was nicht
// gespeichert wird, muss auch nicht gelöscht werden.
//
// Daraus folgt der Zwischenspeicher: fünf Minuten, im Arbeitsspeicher, geht
// bei jedem Neustart verloren. Das ist kein Mangel, sondern der Zweck. Eine
// Ablage auf der Platte wäre ein zweiter Bestand mit anderem Namen.
//
// Ist Phalanx OS nicht erreichbar, wird ein Fehler geworfen und nicht eine
// leere Liste zurückgegeben. Eine leere Liste sähe aus wie „keine
// Korrespondenz", und das ist die gefährlichste Antwort, die diese Stelle
// geben kann: Sie führt zu der Aussage, es sei nichts geschrieben worden.
//
// Eigener Token mit ausschliesslich `pool.mails`. Der Kontakt-Sync in
// phalanxpool.js holt `pool.read pool.write`; diesen Token um Korrespondenz zu
// erweitern hiesse, jedem Abruf von Kontakten den Zugriff auf Mails
// mitzugeben. Zwei Zwecke, zwei Token.
// ─────────────────────────────────────────────────────────────────────────────

const STANDARD_BASE_URL = 'https://os.phalanx.de';
const SCOPE = 'pool.mails';
const CACHE_MS = 5 * 60 * 1000;
const ABRUF_TIMEOUT_MS = 12 * 1000;

function config() {
  return {
    baseUrl: (process.env.PHALANX_OS_BASE_URL || STANDARD_BASE_URL).replace(/\/+$/, ''),
    clientId: process.env.PHALANX_OS_CLIENT_ID || '',
    clientSecret: process.env.PHALANX_OS_CLIENT_SECRET || '',
    // Ein Schalter, der die Ansichten abschaltet, ohne Veröffentlichung.
    // Standardmässig an, sobald die Zugangsdaten stehen.
    aus: String(process.env.PHALANX_MAILS_AUS || '').toLowerCase() === 'true',
  };
}

const istKonfiguriert = () => Boolean(config().clientId && config().clientSecret);
const istAktiv = () => istKonfiguriert() && !config().aus;

// ── Zustand, ausschliesslich im Arbeitsspeicher ────────────────────────────
let _token = null;
let _discovery = null;
const _cache = new Map();          // schluessel -> { zeit, daten }
const _stand = { letzterErfolg: null, letzterFehler: null, letzterFehlerAm: null, abrufe: 0 };

/** Abgelaufene Einträge entfernen, damit der Speicher nicht wächst. */
function aufraeumen() {
  const jetzt = Date.now();
  for (const [k, v] of _cache) if (jetzt - v.zeit > CACHE_MS) _cache.delete(k);
}

async function holen(url, optionen = {}) {
  const ab = new AbortController();
  const uhr = setTimeout(() => ab.abort(), ABRUF_TIMEOUT_MS);
  try {
    return await fetch(url, { ...optionen, signal: ab.signal });
  } finally { clearTimeout(uhr); }
}

async function discovery() {
  if (_discovery) return _discovery;
  const res = await holen(`${config().baseUrl}/oidc/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`Konfiguration von Phalanx OS nicht lesbar (HTTP ${res.status}).`);
  _discovery = await res.json();
  return _discovery;
}

async function token() {
  if (_token && _token.exp > Date.now() + 60 * 1000) return _token.access_token;
  const c = config();
  if (!istKonfiguriert()) throw new Error('Die Anbindung an Phalanx OS ist nicht konfiguriert.');
  const disc = await discovery().catch(() => null);
  const ziel = (disc && disc.token_endpoint) || `${c.baseUrl}/oidc/token`;

  const res = await holen(ziel, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: c.clientId,
      client_secret: c.clientSecret,
      scope: SCOPE,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    // Der Schlüssel steht nirgends in der Meldung, nur der Status und die
    // Antwort der Gegenstelle.
    throw new Error(res.status === 400 || res.status === 401
      ? `Der Zugriff auf die Korrespondenz wurde abgelehnt (HTTP ${res.status}). `
        + `Vermutlich ist der Scope "${SCOPE}" für diesen Client noch nicht freigeschaltet.`
      : `Token-Abruf fehlgeschlagen (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }
  const daten = await res.json();
  _token = {
    access_token: daten.access_token,
    exp: Date.now() + (Number(daten.expires_in || 300) * 1000),
  };
  return _token.access_token;
}

/**
 * Eine Liste abrufen, mit kurzem Zwischenspeicher.
 *
 * Geworfen wird bei jedem Fehler. Der Aufrufer entscheidet, was er anzeigt,
 * und zeigt in keinem Fall eine leere Liste.
 */
async function liste(pfad, { limit = 100, offset = 0 } = {}) {
  if (!istAktiv()) {
    throw new Error(config().aus
      ? 'Die Korrespondenzansicht ist in der Verwaltung abgeschaltet.'
      : 'Die Anbindung an Phalanx OS ist nicht konfiguriert.');
  }
  aufraeumen();
  const schluessel = `${pfad}|${limit}|${offset}`;
  const da = _cache.get(schluessel);
  if (da && Date.now() - da.zeit < CACHE_MS) return { ...da.daten, aus_zwischenspeicher: true };

  const url = `${config().baseUrl}${pfad}?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;
  let res;
  try {
    res = await holen(url, { headers: { Authorization: `Bearer ${await token()}`, Accept: 'application/json' } });
  } catch (e) {
    _stand.letzterFehler = e.name === 'AbortError'
      ? 'Phalanx OS hat nicht rechtzeitig geantwortet.' : String(e.message || e);
    _stand.letzterFehlerAm = new Date().toISOString();
    throw new Error(_stand.letzterFehler);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    _stand.letzterFehler = `HTTP ${res.status}${txt ? `: ${txt.slice(0, 160)}` : ''}`;
    _stand.letzterFehlerAm = new Date().toISOString();
    if (res.status === 403) throw new Error(`Phalanx OS verweigert den Zugriff. Ist der Scope "${SCOPE}" freigeschaltet?`);
    if (res.status === 404) throw new Error('Phalanx OS kennt diesen Vorgang nicht.');
    throw new Error(`Abruf fehlgeschlagen (${_stand.letzterFehler}).`);
  }

  const daten = await res.json();
  const sauber = {
    total: Number(daten.total || 0),
    items: Array.isArray(daten.items) ? daten.items.map(normalisieren) : [],
  };
  _cache.set(schluessel, { zeit: Date.now(), daten: sauber });
  _stand.letzterErfolg = new Date().toISOString();
  _stand.letzterFehler = null;
  _stand.abrufe += 1;
  return { ...sauber, aus_zwischenspeicher: false };
}

/**
 * Einen Eintrag auf die Felder bringen, die angezeigt werden.
 *
 * Bewusst eine feste Auswahl: Was die Gegenstelle eines Tages zusätzlich
 * liefert, erscheint hier nicht von selbst. Anhänge werden auf Namen und
 * Grösse reduziert, Inhalte gibt die Schnittstelle ohnehin nicht heraus.
 */
function normalisieren(m) {
  const p = m || {};
  return {
    id: p.id,
    richtung: p.richtung === 'ausgehend' ? 'ausgehend' : 'eingehend',
    wann: p.wann || null,
    betreff: String(p.betreff || '').slice(0, 300),
    text: String(p.text || '').slice(0, 20000),
    von: p.von ? { name: p.von.name || null, email: p.von.email || null } : null,
    an: Array.isArray(p.an) ? p.an.slice(0, 50) : [],
    kontakt_id: p.kontakt_id != null ? p.kontakt_id : null,
    mandat_nummer: p.mandat_nummer || null,
    anhaenge: Array.isArray(p.anhaenge)
      ? p.anhaenge.map((a) => ({ name: String((a && a.name) || ''), groesse: Number((a && a.groesse) || 0) }))
      : [],
  };
}

const zumMandat = (nummer, opt) =>
  liste(`/api/pool/v1/mandate/${encodeURIComponent(nummer)}/korrespondenz`, opt);

const zumKontakt = (poolContactId, opt) =>
  liste(`/api/pool/v1/contacts/${encodeURIComponent(poolContactId)}/korrespondenz`, opt);

/** Für die Verwaltung: was ist konfiguriert, wann lief es zuletzt. */
function stand() {
  return {
    konfiguriert: istKonfiguriert(),
    aktiv: istAktiv(),
    abgeschaltet: config().aus,
    scope: SCOPE,
    basis: config().baseUrl,
    letzter_erfolg: _stand.letzterErfolg,
    letzter_fehler: _stand.letzterFehler,
    letzter_fehler_am: _stand.letzterFehlerAm,
    abrufe_seit_start: _stand.abrufe,
    zwischenspeicher_eintraege: _cache.size,
    zwischenspeicher_minuten: CACHE_MS / 60000,
  };
}

/** Nur für Tests: Zwischenspeicher und Token vergessen. */
function zuruecksetzen() {
  _cache.clear(); _token = null; _discovery = null;
  _stand.letzterErfolg = null; _stand.letzterFehler = null; _stand.letzterFehlerAm = null; _stand.abrufe = 0;
}

module.exports = {
  zumMandat, zumKontakt, stand, config, istKonfiguriert, istAktiv,
  normalisieren, zuruecksetzen, SCOPE, CACHE_MS,
};
