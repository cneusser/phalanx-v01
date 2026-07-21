/**
 * v0.267: Sprache aufgeräumt.
 *
 * Drei Dinge passieren hier:
 *   1. Die Systemvorlagen für die Käuferansprache bekommen die neuen Texte. Nur die,
 *      die niemand im Admin angefasst hat (updated_by IS NULL). Handarbeit bleibt.
 *   2. Der Gedankenstrich verschwindet aus den gespeicherten Texten. Als Platzhalter
 *      für „kein Wert" stand bisher ein Strich in den Bändern, jetzt steht dort „k. A.".
 *   3. Changelog-Eintrag.
 */
const { TEMPLATES } = require('../mailTemplateSeed');

const ENTRY = {
  version: 'v0.267', released_on: '2026-07-21',
  title: 'Sprache aufgeräumt: menschliche Texte, kein Gedankenstrich',
  items: [
    'Alle Mailvorlagen neu geschrieben: kürzere Sätze, klare Ansage, keine Textbaustein-Floskeln',
    'Einladung, Erinnerung, Prozess-Update und die Systemmails (Registrierung, Freischaltung, Passwort) sprechen jetzt wie ein Mensch',
    'Der Gedankenstrich ist raus, aus der Oberfläche, aus den Mails, aus den Rechtstexten',
    'Fehlende Bandangaben zeigen „k. A." statt eines Strichs',
    'Ein Prüfskript (npm run check:texts) findet Gedankenstriche und Floskeln, bevor sie in eine Release rutschen',
  ],
};

// Spalten, in denen Freitext steckt, der Kunden zu Gesicht bekommen
const TEXT_COLUMNS = [
  ['projects', 'short_description'],
  ['projects', 'description'],
  ['crm_campaigns', 'intro'],
  ['crm_campaigns', 'subject'],
];

exports.up = async function (knex) {
  // 1) Systemvorlagen nachziehen, außer sie wurden von Hand bearbeitet
  for (const t of TEMPLATES) {
    await knex('mail_templates')
      .where({ tenant_id: 1, key: t.key, is_system: 1 })
      .whereNull('updated_by')
      .update({
        name: t.name, subject: t.subject, body: t.body,
        cta_label: t.cta_label, cta_target: t.cta_target,
        updated_at: knex.fn.now(),
      })
      .catch(() => {});
  }

  // 2) Platzhalter in den Bändern: der Strich (U+2014) wird zu „k. A."
  await knex.raw(`UPDATE projects SET revenue_band = 'k. A.' WHERE revenue_band = '\u2014'`).catch(() => {});
  await knex.raw(`UPDATE projects SET ebitda_band  = 'k. A.' WHERE ebitda_band  = '\u2014'`).catch(() => {});
  await knex.raw(`ALTER TABLE projects ALTER COLUMN revenue_band SET DEFAULT 'k. A.'`).catch(() => {});
  await knex.raw(`ALTER TABLE projects ALTER COLUMN ebitda_band  SET DEFAULT 'k. A.'`).catch(() => {});

  // 3) Gedankenstriche aus gespeicherten Freitexten entfernen
  for (const [table, col] of TEXT_COLUMNS) {
    const has = await knex.schema.hasColumn(table, col).catch(() => false);
    if (!has) continue;
    await knex.raw(
      `UPDATE ?? SET ?? = replace(replace(??, ' \u2014 ', ', '), '\u2014', ',') WHERE ?? LIKE '%\u2014%'`,
      [table, col, col, col],
    ).catch(() => {});
  }

  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) {
    await knex('changelog').insert({
      tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on,
      title: ENTRY.title, items_json: JSON.stringify(ENTRY.items),
    });
  }
};

exports.down = async function (knex) {
  await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {});
  // Die Texte selbst werden nicht zurückgedreht: der alte Wortlaut ist kein Zustand,
  // den irgendjemand zurückhaben will.
};
