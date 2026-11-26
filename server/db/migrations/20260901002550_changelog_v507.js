/** Changelog v0.507 (Härtung: Webhook-Geheimnis, Suchtreffer, Schriften, Build). */
const ENTRY = {
  version: 'v0.507', released_on: '2026-11-26',
  title: 'Weniger Angriffsfläche, nichts Neues zu bedienen',
  items: [
    'Die Trefferausschnitte der Datenraumsuche wurden als HTML eingesetzt. Ein Dokument mit präpariertem Text hätte so Code in die Ansicht eines Interessenten bringen können. Die Hervorhebung wird jetzt aus reinem Text gebaut, Datenraum und Dokumentbrowser nutzen dieselbe Funktion',
    'Das Geheimnis des Mail-Eingangs stand in der Adresse des Webhooks und damit in jedem Zugriffsprotokoll. Es kann jetzt als Kopfzeile oder als Basic Auth kommen. Die alte Adresse funktioniert übergangsweise weiter und meldet sich einmal im Log, mit INBOUND_SECRET_IN_ADRESSE=0 wird sie abgeschaltet',
    'Die Meldezeilen in CRM, Funnel und Verwaltung wurden bei jedem Neuzeichnen neu erzeugt und konnten abhängige Ladevorgänge erneut auslösen. Sie sind jetzt stabil',
    'Die Seite lädt keine Schriften mehr von Google. Das spart eine Verbindung zu einem Dritten beim ersten Aufruf und passt zur Aussage, dass nichts nachgeladen wird',
    'Das Build-Ergebnis des Frontends liegt nicht mehr im Repository. Railway baut ohnehin selbst, die eingecheckte Fassung war nur eine Quelle für veraltete Stände',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
