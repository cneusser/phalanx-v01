/**
 * v0.282: NDA und Zugang pro Deal-Partei manuell führen.
 *
 * Bisher ließ sich der NDA-Stand nur aus der Online-Signatur ableiten (nur für
 * registrierte Nutzer). Wird eine NDA offline unterzeichnet oder der Zugang von
 * Hand vergeben, fehlte die Möglichkeit, das im CRM festzuhalten.
 *
 *   nda_status      manuell: null (kein) | 'open' (angefragt) | 'signed' (liegt vor)
 *   nda_signed_at   Zeitpunkt, wenn als „liegt vor" markiert
 *   access_granted  1 = Kontakt hat Zugang zum Mandat (Unterlagen/Datenraum)
 */
exports.up = async function (knex) {
  const add = async (col, build) => {
    const has = await knex.schema.hasColumn('crm_deal_parties', col).catch(() => false);
    if (!has) await knex.schema.alterTable('crm_deal_parties', build);
  };
  await add('nda_status', (t) => t.text('nda_status'));
  await add('nda_signed_at', (t) => t.timestamp('nda_signed_at', { useTz: true }));
  await add('access_granted', (t) => t.integer('access_granted').notNullable().defaultTo(0));

  const ENTRY = {
    version: 'v0.282', released_on: '2026-08-09',
    title: 'NDA und Projekt-Zugang pro Kontakt manuell führen',
    items: [
      'NDA-Status je Mandat manuell setzbar (kein / angefragt / liegt vor), auch für Kontakte ohne Plattform-Konto',
      'Der Projekt-Zugang eines Kontakts ist im Kontakt sichtbar und manuell setzbar',
      'Das NDA-Badge auf der Funnel-Karte berücksichtigt jetzt beides: die Online-Signatur und die manuelle Angabe',
    ],
  };
  const hasCl = await knex.schema.hasTable('changelog').catch(() => false);
  if (hasCl) {
    const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
    if (!exists) await knex('changelog').insert({
      tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on,
      title: ENTRY.title, items_json: JSON.stringify(ENTRY.items),
    }).catch(() => {});
  }
};

exports.down = async function (knex) {
  await knex('changelog').where({ version: 'v0.282' }).del().catch(() => {});
  for (const col of ['nda_status', 'nda_signed_at', 'access_granted']) {
    const has = await knex.schema.hasColumn('crm_deal_parties', col).catch(() => false);
    if (has) await knex.schema.alterTable('crm_deal_parties', (t) => t.dropColumn(col)).catch(() => {});
  }
};
