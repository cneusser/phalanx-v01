/** Changelog v0.476 (React Router 7, Oberfläche ohne Meldung). */
const ENTRY = {
  version: 'v0.476', released_on: '2026-11-15',
  title: 'Die Oberfläche meldet nichts mehr',
  items: [
    'React Router von 6 auf 7. Damit sind die letzten beiden Meldungen in der Oberfläche weg; sie zählt jetzt null Schwachstellen',
    'Der Wechsel war klein, und der Grund steht im Code: Benutzt werden nur BrowserRouter, Routes, Route, Navigate, Link und die vier Haken useNavigate, useParams, useLocation und useSearchParams. Genau diese Hälfte hat sich zwischen 6 und 7 nicht geändert',
    'Teuer wäre der Wechsel dort geworden, wo createBrowserRouter, Loader und Actions im Einsatz sind. Davon steht bei uns nichts, und ein Test hält das von nun an fest: Taucht eines dieser Mittel auf, schlägt er an',
    'Keine Zeile Anwendungscode war anzupassen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
