/** Changelog v0.353 (Datenraum direkt freigeben, doppelte Ordner bereinigen). */
const ENTRY = {
  version: 'v0.353', released_on: '2026-07-21',
  title: 'Datenraum direkt freigeben, doppelte Ordner bereinigen',
  items: [
    'Im Kontakt-Fenster gibt es je Mandat jetzt „Datenraum freigeben" und „Zugang entziehen". Das setzt den echten serverseitigen Zugang (Lesen, Download, Q&A) und informiert den Käufer, ganz ohne den NDA-Umweg',
    'Klarstellung: Der Versand einer Prozess-Mail und das CRM-Kennzeichen „Zugang" allein erteilen keinen Datenraum-Zugang. Der echte Zugang kommt über „Datenraum freigeben" oder die NDA-Freigabe',
    'Neuer Button „Bereinigen" im Safe entfernt doppelte, leere Ordner (z. B. nach mehrfachem Anlegen der Standardstruktur) und vergibt die Nummerierung neu',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
