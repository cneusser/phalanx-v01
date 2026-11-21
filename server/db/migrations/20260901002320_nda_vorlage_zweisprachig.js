// ─────────────────────────────────────────────────────────────────────────────
// Die Vertraulichkeitsvereinbarung aus dem Hausdokument (v0.490)
//
// Drei Dinge auf einmal, weil sie zusammengehören:
//
//   1. users bekommt drei Felder, die der Vertrag nennt und die es bisher
//      nirgends gab: Sitz, Register mit Nummer, vertretungsberechtigte Person.
//      Abgefragt werden sie im Unterschriftsdialog, dort, wo sie im Vertrag
//      stehen, und von dort ins Profil zurückgeschrieben.
//   2. nda_templates bekommt eine Spalte für die englische Präambel. Die
//      englischen Paragraphen liegen in sections_json neben den deutschen.
//   3. Die neue Vorlage wird eingespielt und aktiv gesetzt, die alte inaktiv.
//
// Bereits unterzeichnete Vereinbarungen bleiben unberührt. Sie tragen ihren
// Text als PDF und ihren Fingerabdruck im Nachweis; eine neue Vorlage ändert
// daran nichts und darf es nicht.
// ─────────────────────────────────────────────────────────────────────────────

const VORLAGE = require('../ndaVorlagePhalanx');

exports.up = async function (knex) {
  const addColumn = async (table, name, build) => {
    const has = await knex.schema.hasColumn(table, name).catch(() => false);
    if (!has) await knex.schema.alterTable(table, build);
  };

  await addColumn('users', 'company_seat', (t) => t.text('company_seat'));
  await addColumn('users', 'company_register', (t) => t.text('company_register'));
  await addColumn('users', 'company_representative', (t) => t.text('company_representative'));
  await addColumn('nda_templates', 'preamble_en', (t) => t.text('preamble_en'));
  await addColumn('nda_templates', 'titel', (t) => t.text('titel'));
  await addColumn('nda_templates', 'titel_en', (t) => t.text('titel_en'));

  const vorhanden = await knex('nda_templates').where({ version: VORLAGE.version, name: VORLAGE.name }).first().catch(() => null);
  if (!vorhanden) {
    await knex('nda_templates').where({ is_active: 1 }).update({ is_active: 0 });
    await knex('nda_templates').insert({
      tenant_id: 1,
      name: VORLAGE.name,
      version: VORLAGE.version,
      court_venue: VORLAGE.court_venue,
      advisor_json: JSON.stringify(VORLAGE.advisor),
      preamble: VORLAGE.preamble,
      preamble_en: VORLAGE.preamble_en,
      titel: VORLAGE.titel,
      titel_en: VORLAGE.titel_en,
      sections_json: JSON.stringify(VORLAGE.sections),
      is_active: 1,
    });
  }
};

exports.down = async function (knex) {
  // Die Spalten bleiben stehen: Gepflegte Angaben werden nicht weggeworfen,
  // nur weil eine Fassung zurückgenommen wird. Rückgängig gemacht wird allein
  // die Vorlagenwahl.
  await knex('nda_templates').where({ version: VORLAGE.version, name: VORLAGE.name }).update({ is_active: 0 }).catch(() => {});
  const alt = await knex('nda_templates').where('version', '<', VORLAGE.version).orderBy('version', 'desc').first().catch(() => null);
  if (alt) await knex('nda_templates').where({ id: alt.id }).update({ is_active: 1 });
};
