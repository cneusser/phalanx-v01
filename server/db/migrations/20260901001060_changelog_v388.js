/** Changelog v0.388 (Phalanx-OS-Anbindung: SSO + Datenpool-Sync). */
const ENTRY = {
  version: 'v0.388', released_on: '2026-07-24',
  title: 'Phalanx-OS-Anbindung: SSO und Datenpool-Sync',
  items: [
    'SSO „Mit Phalanx OS anmelden" auf der Anmeldung: Admin- und Staff-Konten melden sich über Phalanx OS an (OpenID Connect mit PKCE, Verknüpfung über die stabile OIDC-Kennung, kein automatisches Anlegen neuer Konten)',
    'Datenpool-Sync: zieht Investoren-, Unternehmer- und Multiplikatoren-Kontakte aus dem Phalanx-OS-CRM und gleicht sie dublettenfrei gegen die Kontakte ab (E-Mail, LinkedIn, eindeutiger Name), reichert Treffer an und legt fehlende neu an; alle 30 Minuten und auf Knopfdruck',
    'Rückmeldung: sobald ein Kontakt ein Plattformkonto erhält, meldet die Plattform das an den Pool zurück',
    'UWG-konform: Adressen ohne Werbeeinwilligung bleiben von Newsletter und Kampagnen ausgenommen; der Sync legt keine Funnel-Einträge an Mandaten an',
    'Neuer Verwaltungsbereich „Phalanx OS" mit Verbindungsstatus, Sync-Zahlen, Segmenten und der Warteliste „Zuordnung prüfen"; Pool-Kontakte tragen in der Kontaktliste das Kennzeichen „Phalanx-Netzwerk"',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
