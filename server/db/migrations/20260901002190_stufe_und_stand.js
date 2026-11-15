/**
 * Sichtbarkeitsstufe und Veröffentlichungsstand je Datei
 * (v0.478, Datenraum 2.0 Sprint 1, Teil 2)
 *
 * Die Roadmap verlangt zweierlei an jeder Datei:
 *
 *   sichtbar_ab   ab welcher Stufe der Käufer sie sieht:
 *                 public (Teaser), nda (Memorandum), dataroom (Datenraum)
 *   stand         entwurf, geprueft, freigegeben, zurueckgezogen
 *
 * Dazu eine feste Fassungsnummer, damit ein Käufer nie das Arbeitsdokument
 * sieht, sondern immer die Fassung, die freigegeben wurde.
 *
 * ── Die Rückfüllung ist die eigentliche Entscheidung ─────────────────────
 *
 * Bestehende Objekte bekommen `dataroom` und `freigegeben`. Das ist genau
 * das heutige Verhalten: Der Safe öffnet sich für einen Käufer erst mit der
 * Datenraum-Freigabe, und was darin steht, sieht er dann.
 *
 * Jede andere Rückfüllung wäre ein Eingriff. `entwurf` würde über Nacht
 * jeden laufenden Datenraum leeren; `public` würde vertrauliche Unterlagen
 * auf die Teaser-Stufe heben. Eine Wanderung, die den Bestand neu bewertet,
 * ist keine Wanderung, sondern eine Freigabe ohne Beschluss.
 */
exports.up = async function (knex) {
  const spalten = [
    ['sichtbar_ab', (t) => t.text('sichtbar_ab')],
    ['stand', (t) => t.text('stand')],
    ['fassung', (t) => t.integer('fassung')],
  ];
  for (const [name, bauen] of spalten) {
    if (!(await knex.schema.hasColumn('safe_items', name))) {
      await knex.schema.alterTable('safe_items', bauen);
    }
  }

  // Bestand so belassen, wie er sich heute verhält.
  await knex('safe_items').whereNull('sichtbar_ab').update({ sichtbar_ab: 'dataroom' });
  await knex('safe_items').whereNull('stand').update({ stand: 'freigegeben' });
  await knex('safe_items').whereNull('fassung').update({ fassung: 1 });

  // Erst danach Vorgaben setzen: Neues beginnt als Entwurf auf der
  // Datenraum-Stufe. Wer weiter nach vorn will, sagt es ausdrücklich.
  await knex.raw("ALTER TABLE safe_items ALTER COLUMN sichtbar_ab SET DEFAULT 'dataroom'").catch(() => {});
  await knex.raw("ALTER TABLE safe_items ALTER COLUMN stand SET DEFAULT 'entwurf'").catch(() => {});
  await knex.raw('ALTER TABLE safe_items ALTER COLUMN fassung SET DEFAULT 1').catch(() => {});

  await knex.raw(`ALTER TABLE safe_items DROP CONSTRAINT IF EXISTS safe_items_sichtbar_ab_chk`).catch(() => {});
  await knex.raw(`ALTER TABLE safe_items ADD CONSTRAINT safe_items_sichtbar_ab_chk
    CHECK (sichtbar_ab IN ('public','nda','dataroom'))`).catch(() => {});
  await knex.raw(`ALTER TABLE safe_items DROP CONSTRAINT IF EXISTS safe_items_stand_chk`).catch(() => {});
  await knex.raw(`ALTER TABLE safe_items ADD CONSTRAINT safe_items_stand_chk
    CHECK (stand IN ('entwurf','geprueft','freigegeben','zurueckgezogen'))`).catch(() => {});

  await knex.raw('CREATE INDEX IF NOT EXISTS safe_items_stufe_idx ON safe_items (project_id, sichtbar_ab, stand)').catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS safe_items_stufe_idx').catch(() => {});
  await knex.raw('ALTER TABLE safe_items DROP CONSTRAINT IF EXISTS safe_items_stand_chk').catch(() => {});
  await knex.raw('ALTER TABLE safe_items DROP CONSTRAINT IF EXISTS safe_items_sichtbar_ab_chk').catch(() => {});
  for (const name of ['fassung', 'stand', 'sichtbar_ab']) {
    if (await knex.schema.hasColumn('safe_items', name)) {
      await knex.schema.alterTable('safe_items', (t) => t.dropColumn(name));
    }
  }
};
