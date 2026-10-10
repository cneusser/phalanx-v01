// ─────────────────────────────────────────────────────────────────────────────
// Korrespondenz aus Phalanx OS (v0.454).
//
// Geprüft wird gegen eine gemockte Schnittstelle. Die eigentlichen Zusagen
// sind nicht, dass eine Liste erscheint, sondern was in den Randfällen
// passiert:
//
//   · Phalanx OS antwortet nicht  → Fehler, NICHT eine leere Liste. Eine leere
//     Liste sähe aus wie „keine Korrespondenz" und führte zu der Aussage, es
//     sei nichts geschrieben worden. Das ist an dieser Stelle die
//     gefährlichste Auskunft überhaupt.
//   · Keine Verknüpfung vorhanden → Hinweis, nicht Fehler.
//   · Kein Verwaltungskonto       → 403, und zwar serverseitig. Eine Prüfung
//     in der Oberfläche schützt gegen Verwechslung, nicht gegen Absicht.
//   · Nichts landet in der Datenbank.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

process.env.PHALANX_OS_CLIENT_ID = 'test';
process.env.PHALANX_OS_CLIENT_SECRET = 'geheim';
process.env.PHALANX_OS_BASE_URL = 'https://os.example';
delete process.env.PHALANX_MAILS_AUS;

const mails = require('../sync/phalanxmail');

// ── Eine Antwort, wie die Schnittstelle sie laut Auftrag liefert ──────────
const FIXTURE = {
  total: 2,
  items: [
    {
      id: 4711, richtung: 'ausgehend', wann: '2026-10-10T06:43:00Z',
      betreff: 'Aw: [CapitalMatch] Datenraum freigeschaltet: FARADAY',
      text: 'Dear Mr Juhasz, thank you for your interest ...',
      von: { name: 'Dr. Christian Neusser', email: 'neusser@phalanx.de' },
      an: ['s.juhasz@example.com'],
      kontakt_id: 883, mandat_nummer: '30345',
      anhaenge: [{ name: 'Teaser_FARADAY.pdf', groesse: 184320 }],
      // Felder, die es laut Beschreibung nicht gibt. Sie duerfen nicht
      // durchrutschen, nur weil die Gegenstelle sie eines Tages mitschickt.
      interne_notiz: 'nicht anzeigen', anhang_inhalt: 'BASE64...',
    },
    {
      id: 4712, richtung: 'eingehend', wann: '2026-10-09T15:02:00Z',
      betreff: 'Preisvorstellung', text: 'Die Spanne erscheint mir hoch.',
      von: { name: 'Szabolcs Juhasz', email: 's.juhasz@example.com' },
      an: ['neusser@phalanx.de'], kontakt_id: 883, mandat_nummer: '30345', anhaenge: [],
    },
  ],
};

function mockFetch(plan) {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('openid-configuration')) {
      return { ok: true, json: async () => ({ token_endpoint: 'https://os.example/oidc/token' }) };
    }
    if (u.includes('/oidc/token')) {
      if (plan.tokenStatus && plan.tokenStatus !== 200) {
        return { ok: false, status: plan.tokenStatus, text: async () => 'nope' };
      }
      return { ok: true, json: async () => ({ access_token: 'tok', expires_in: 300 }) };
    }
    if (plan.werfen) throw Object.assign(new Error('network'), { name: plan.werfen });
    if (plan.status && plan.status !== 200) {
      return { ok: false, status: plan.status, text: async () => 'fehler' };
    }
    plan.aufrufe = (plan.aufrufe || 0) + 1;
    return { ok: true, status: 200, json: async () => FIXTURE };
  };
  return plan;
}

(async () => {
  // ── Der gute Fall ────────────────────────────────────────────────────────
  {
    mails.zuruecksetzen();
    const plan = mockFetch({});
    const d = await mails.zumMandat('30345', { limit: 100 });
    ok('die Liste kommt an', d.total === 2 && d.items.length === 2);
    ok('die Richtung wird uebernommen', d.items[0].richtung === 'ausgehend' && d.items[1].richtung === 'eingehend');
    ok('Anhaenge nur mit Name und Groesse',
      d.items[0].anhaenge[0].name === 'Teaser_FARADAY.pdf' && d.items[0].anhaenge[0].groesse === 184320);
    ok('kein Anhangsinhalt', !('anhang_inhalt' in d.items[0]));
    ok('kein unbekanntes Feld rutscht durch', !('interne_notiz' in d.items[0]));
    ok('der Text wird begrenzt', d.items[0].text.length <= 20000);

    // Zwischenspeicher: der zweite Abruf fragt nicht noch einmal.
    const d2 = await mails.zumMandat('30345', { limit: 100 });
    ok('der zweite Abruf kommt aus dem Zwischenspeicher', d2.aus_zwischenspeicher === true);
    ok('und loest keine neue Anfrage aus', plan.aufrufe === 1);
    ok('der Zwischenspeicher gilt fuenf Minuten', mails.CACHE_MS === 5 * 60 * 1000);
  }

  // ── Phalanx OS antwortet nicht ──────────────────────────────────────────
  {
    mails.zuruecksetzen();
    mockFetch({ werfen: 'AbortError' });
    let geworfen = null;
    try { await mails.zumMandat('30345'); } catch (e) { geworfen = e; }
    ok('ein Zeitablauf wirft, statt leer zurueckzugeben', !!geworfen);
    ok('und sagt, was los war', /nicht rechtzeitig/.test(geworfen.message));
    ok('der Stand merkt sich den Fehler', !!mails.stand().letzter_fehler);
  }
  {
    mails.zuruecksetzen();
    mockFetch({ status: 503 });
    let geworfen = null;
    try { await mails.zumKontakt(883); } catch (e) { geworfen = e; }
    ok('ein Serverfehler wirft ebenfalls', !!geworfen && /503/.test(geworfen.message));
  }

  // ── Fehlender Scope ─────────────────────────────────────────────────────
  {
    mails.zuruecksetzen();
    mockFetch({ tokenStatus: 400 });
    let geworfen = null;
    try { await mails.zumMandat('30345'); } catch (e) { geworfen = e; }
    ok('ein fehlender Scope wird benannt', !!geworfen && /pool\.mails/.test(geworfen.message));
    ok('und der Schluessel steht nicht in der Meldung', !/geheim/.test(geworfen.message));
  }

  // ── Der Schalter ────────────────────────────────────────────────────────
  {
    mails.zuruecksetzen();
    process.env.PHALANX_MAILS_AUS = 'true';
    let geworfen = null;
    try { await mails.zumMandat('30345'); } catch (e) { geworfen = e; }
    ok('abgeschaltet heisst abgeschaltet', !!geworfen && /abgeschaltet/.test(geworfen.message));
    ok('und der Stand sagt es auch', mails.stand().abgeschaltet === true && mails.stand().aktiv === false);
    delete process.env.PHALANX_MAILS_AUS;
  }

  // ── Der eigene Scope ────────────────────────────────────────────────────
  {
    const quelle = fs.readFileSync(path.join(__dirname, '..', 'sync', 'phalanxmail.js'), 'utf8');
    ok('der Token holt nur pool.mails', /scope: SCOPE/.test(quelle) && mails.SCOPE === 'pool.mails');
    const pool = fs.readFileSync(path.join(__dirname, '..', 'sync', 'phalanxpool.js'), 'utf8');
    ok('der Kontakt-Sync bleibt bei seinen Scopes', /scope: 'pool\.read pool\.write'/.test(pool));
    ok('und bekommt pool.mails nicht dazu', !/pool\.mails/.test(pool));
    ok('es wird nichts in die Datenbank geschrieben', !/INSERT |UPDATE |require\('\.\.\/db/.test(quelle));
    ok('der Zwischenspeicher liegt im Arbeitsspeicher', /new Map\(\)/.test(quelle) && !/localStorage|fs\.write/.test(quelle));
  }

  // ── Die Routen ──────────────────────────────────────────────────────────
  {
    const admin = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
    ok('das Mandat ist der Verwaltung vorbehalten',
      /'\/projects\/:id\/korrespondenz', \.\.\.nurVerwaltung/.test(admin));
    ok('die enge Wache prueft die Rolle serverseitig',
      /NUR_VERWALTUNG\.includes\(req\.user\.role\)/.test(admin));
    ok('ein abgewiesener Versuch wird protokolliert', /ZUGRIFF_ABGEWIESEN/.test(admin));
    ok('ohne Projektnummer gibt es einen Grund statt einer leeren Liste',
      /keine Projektnummer aus Phalanx OS zugeordnet/.test(admin));
    ok('ohne Pool-Verknuepfung ebenso', /Mit dem Phalanx-Netzwerk nicht verknüpft/.test(admin));
    ok('ein Fehler kommt als 502 und nicht als leere Liste', /status\(502\)/.test(admin));
    ok('protokolliert wird der Abruf, nicht sein Inhalt',
      /KORRESPONDENZ_GELESEN/.test(admin) && !/betreff|\.text\b/.test(admin.slice(admin.indexOf('function abrufProtokollieren'), admin.indexOf('function abrufProtokollieren') + 400)));
    ok('die Warnung steht in der Antwort', /Nicht für Käufer oder Verkäufer sichtbar/.test(admin));

    // Die bestehende Wache heisst isAdmin und laesst Staff durch. Das ist
    // dokumentiert, nicht stillschweigend hingenommen.
    ok('der Unterschied zwischen isAdmin und nurVerwaltung ist erklaert',
      /heisst isAdmin, prueft aber perms\.isStaff/.test(admin));
  }

  // ── Die Oberflaeche ─────────────────────────────────────────────────────
  {
    const komp = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src', 'components', 'Korrespondenz.jsx'), 'utf8');
    ok('ein Fehler wird als Fehler gezeigt', /Es wird deshalb\s*\n?\s*auch kein älterer Stand angezeigt/.test(komp));
    ok('Anhaenge werden nur benannt', /Die Dateien selbst liegen in Phalanx OS/.test(komp));
    ok('es gibt einen Filter auf eine Person', /nurPerson/.test(komp));
    // Die Reihenfolge kommt von der Gegenstelle. Hier wird nur die Liste der
    // Filterknoepfe sortiert, nicht der Schriftwechsel: Eine eigene Sortierung
    // waere eine zweite Meinung darueber, was aktuell ist.
    ok('der Schriftwechsel wird hier nicht umsortiert',
      !/sichtbar[\s\S]{0,40}\.sort\(/.test(komp) && !/items[\s\S]{0,40}\.sort\(/.test(komp));
    ok('sortiert wird nur die Filterliste', /personen = \[\.\.\.new Set\([\s\S]{0,40}\.sort\(\)/.test(komp));

    const detail = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'ProjectDetail.jsx'), 'utf8');
    ok('der Reiter erscheint nur fuer die Verwaltung',
      /VERWALTUNGS_ROLLEN\.includes\(user\.role\) \? \[KORRESPONDENZ_TAB\]/.test(detail));
    ok('und der Inhalt prueft es noch einmal',
      /activeTab === 'korrespondenz'[\s\S]{0,300}VERWALTUNGS_ROLLEN\.includes\(user\.role\)/.test(detail));
    ok('die Mandatsansicht traegt die Warnung', /mitWarnung/.test(detail));

    const drawer = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src', 'components', 'ContactDrawer.jsx'), 'utf8');
    ok('die Kontaktakte zeigt sie ohne Warnung', /admin\/contacts\/\$\{contactId\}\/korrespondenz/.test(drawer));
  }

  process.exit(fail ? 1 : 0);
})();
