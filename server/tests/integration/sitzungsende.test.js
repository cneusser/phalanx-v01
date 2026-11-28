// ─────────────────────────────────────────────────────────────────────────────
// Eine abgelaufene Sitzung sagt, dass sie abgelaufen ist (v0.515)
//
// Anlass, wörtlich: „wenn ich NDA freigeben möchte kommt diese Fehlermeldung."
// Oben auf dem Dashboard stand „Fehler: Ungültiges Token", darunter lagen die
// Kennzahlen einer Sitzung, die es nicht mehr gab. Das Fenster war tagelang
// offen, die Anmeldung läuft nach sieben Tagen ab, und von da an scheiterte
// jeder Klick mit einem Satz, der nichts erklärt und nichts anbietet.
//
// Geprüft wird die Unterscheidung, auf die sich die Oberfläche verlässt:
//
//   abgelaufen   SITZUNG_ABGELAUFEN  → neu anmelden, mehr ist nicht passiert
//   gefälscht    TOKEN_UNGUELTIG     → ein Token, das so nie ausgegeben wurde
//   abgemeldet   SITZUNG_ABGELAUFEN  → Token-Version hochgezählt
//
// Und der Fall, der nicht zum Abmelden führen darf: gar kein Token. Sonst
// würde ein Besucher des Marktplatzes auf die Anmeldung geworfen.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

const PORT = 5611;

(async () => {
  const { db, ruf, alsNutzer, kaeufer } = await hochfahren({ port: PORT });
  const { ok, schluss } = zaehler();

  const jwt = require(`${__dirname}/../../node_modules/jsonwebtoken`);
  const u = await kaeufer('pruef.sitzung@pruefstand.invalid', { vorname: 'Sonja', nachname: 'Sitzung' });

  console.log('\n══ Abgelaufen heisst abgelaufen ══');
  {
    const alt = jwt.sign({ userId: u.id, tv: u.token_version || 0 }, process.env.JWT_SECRET, { expiresIn: '-1h' });
    const r = await ruf('/api/auth/me', { token: alt });
    ok('abgewiesen', r.status === 401, String(r.status));
    ok('mit eigenem Kennzeichen', r.json && r.json.code === 'SITZUNG_ABGELAUFEN', JSON.stringify(r.json));
    ok('und einem Satz, den man versteht', /abgelaufen/i.test((r.json || {}).error || ''), String((r.json || {}).error));
    ok('ohne das Wort Token', !/Token/.test((r.json || {}).error || ''), String((r.json || {}).error));
  }

  console.log('\n══ Ein fremd signiertes Token ist etwas anderes ══');
  {
    const falsch = jwt.sign({ userId: u.id, tv: 0 }, 'ein-voellig-anderer-schluessel-der-lang-genug-ist', { expiresIn: '1h' });
    const r = await ruf('/api/auth/me', { token: falsch });
    ok('abgewiesen', r.status === 401, String(r.status));
    ok('und als ungueltig gekennzeichnet', r.json && r.json.code === 'TOKEN_UNGUELTIG', JSON.stringify(r.json));
  }

  console.log('\n══ Abmelden auf allen Geraeten zaehlt als Sitzungsende ══');
  {
    const gueltig = alsNutzer(u);
    const vorher = await ruf('/api/auth/me', { token: gueltig });
    ok('vorher geht es', vorher.status === 200, String(vorher.status));

    await db.run('UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = ?', [u.id]);
    const r = await ruf('/api/auth/me', { token: gueltig });
    ok('danach nicht mehr', r.status === 401, String(r.status));
    ok('mit demselben Kennzeichen wie beim Ablauf', r.json && r.json.code === 'SITZUNG_ABGELAUFEN', JSON.stringify(r.json));
  }

  console.log('\n══ Ohne Token wird niemand abgemeldet ══');
  {
    const r = await ruf('/api/auth/me');
    ok('es bleibt bei nicht authentifiziert', r.status === 401, String(r.status));
    ok('und ohne Sitzungsende-Kennzeichen', !r.json || !r.json.code, JSON.stringify(r.json));
  }

  console.log('\n══ Die Oberflaeche handelt danach ══');
  {
    const fs = require('fs');
    const client = fs.readFileSync(`${__dirname}/../../../client/src/api/client.js`, 'utf8');
    const login = fs.readFileSync(`${__dirname}/../../../client/src/pages/Login.jsx`, 'utf8');
    ok('die drei Kennzeichen sind bekannt', /SITZUNG_ABGELAUFEN/.test(client) && /TOKEN_UNGUELTIG/.test(client) && /KONTO_NICHT_AKTIV/.test(client));
    ok('nur mit Token wird abgemeldet', /401 && token &&/.test(client));
    ok('die Anmeldeseite loest keine Schleife aus', /startsWith\('\/login'\)/.test(client));
    ok('die Pruefung beim Laden bleibt unberuehrt', /auth\/me/.test(client));
    ok('ein Birdview faellt auf das eigene Konto zurueck', /phalanx_admin_token/.test(client));
    ok('und die Anmeldeseite erklaert es', /Ihre Sitzung ist abgelaufen/.test(login) && /grund/.test(login));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
