// ─────────────────────────────────────────────────────────────────────────────
// Die Gegenzeichnung der Phalanx GmbH (v0.491)
//
// § 8 der Vereinbarung: Sie tritt „mit Unterzeichnung durch beide Parteien" in
// Kraft. Bis v0.490 trug die Urkunde nur die Unterschrift des Interessenten.
//
// Diese Migration legt zwei Felder an, in denen festgehalten wird, wer wann
// gegengezeichnet hat, und ergänzt die aktive Vorlage um den Unterzeichner der
// Beratung. Beides ist nachvollziehbar und nicht geraten: Das Dokument nennt
// Name, Funktion, Ort und Zeitpunkt, die Datenbank hält denselben Zeitpunkt.
//
// Bereits unterzeichnete Vereinbarungen bekommen keine nachträgliche
// Gegenzeichnung. Eine Unterschrift, die damals nicht geleistet wurde, wird
// nicht rückwirkend eingetragen; ihre PDF bleibt, wie sie ist.
// ─────────────────────────────────────────────────────────────────────────────

const VORLAGE = require('../ndaVorlagePhalanx');

exports.up = async function (knex) {
  const addColumn = async (table, name, build) => {
    const has = await knex.schema.hasColumn(table, name).catch(() => false);
    if (!has) await knex.schema.alterTable(table, build);
  };

  await addColumn('nda_requests', 'countersigned_at', (t) => t.timestamp('countersigned_at', { useTz: true }));
  await addColumn('nda_requests', 'countersigned_by', (t) => t.text('countersigned_by'));

  // Der Unterzeichner der Beratung kommt in die hinterlegte Vorlage, damit er
  // dort gepflegt werden kann und nicht im Quelltext festhängt.
  const zeile = await knex('nda_templates').where({ version: VORLAGE.version, name: VORLAGE.name }).first().catch(() => null);
  if (zeile) {
    let berater = {};
    try { berater = JSON.parse(zeile.advisor_json || '{}'); } catch { berater = {}; }
    if (!berater.signer) {
      berater.signer = VORLAGE.advisor.signer;
      await knex('nda_templates').where({ id: zeile.id }).update({ advisor_json: JSON.stringify(berater) });
    }
  }
};

exports.down = async function (knex) {
  // Die Felder bleiben: Wer gegengezeichnet hat, ist ein Nachweis und wird
  // nicht gelöscht, nur weil eine Fassung zurückgenommen wird.
};
