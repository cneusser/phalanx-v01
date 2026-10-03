/**
 * Projektnummer aus Phalanx OS am Mandat (v0.446, Schritt 1 des Auftrags).
 *
 * Phalanx OS ist die führende Akte für Projekte, Nummern, Zeiten und
 * Abrechnung. CapitalMatch führt Mandate mit Codenamen, Datenraum und
 * NDA-Prozess. Dieselbe Sache heißt an zwei Stellen anders. Die Projektnummer
 * ist der gemeinsame Schlüssel, und sie wird in Phalanx OS vergeben, nirgends
 * sonst, auch nicht hier.
 *
 * Deshalb hier nur ein Feld, das sie aufnimmt, und zwei Felder, die den Stand
 * des späteren Abgleichs festhalten. Kein Nummernkreis, keine Vergabe, keine
 * Prüfziffer: Zwei Systeme, die beide Nummern vergeben, vergeben irgendwann
 * dieselbe.
 *
 * Die Eindeutigkeit ist ein partieller Index. Ein gewöhnlicher Unique-Index
 * über eine Spalte mit vielen NULL-Werten funktioniert in PostgreSQL zwar,
 * aber der partielle sagt deutlicher, was gemeint ist: Mandate ohne Nummer
 * sind der Normalfall und stören einander nicht; zwei Mandate mit derselben
 * Nummer sind ein Fehler.
 */
exports.up = async function (knex) {
  const spalten = [
    ['phalanx_projekt_nummer', (t) => t.string('phalanx_projekt_nummer', 5)],
    ['phalanx_projekt_name', (t) => t.text('phalanx_projekt_name')],
    ['phalanx_sync_am', (t) => t.timestamp('phalanx_sync_am', { useTz: true })],
    ['phalanx_sync_fehler', (t) => t.text('phalanx_sync_fehler')],
  ];
  for (const [name, bauen] of spalten) {
    if (!(await knex.schema.hasColumn('projects', name))) {
      await knex.schema.alterTable('projects', bauen);
    }
  }
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS projects_phalanx_nummer_idx
      ON projects (tenant_id, phalanx_projekt_nummer)
      WHERE phalanx_projekt_nummer IS NOT NULL`).catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS projects_phalanx_nummer_idx').catch(() => {});
  for (const name of ['phalanx_sync_fehler', 'phalanx_sync_am', 'phalanx_projekt_name', 'phalanx_projekt_nummer']) {
    if (await knex.schema.hasColumn('projects', name)) {
      await knex.schema.alterTable('projects', (t) => t.dropColumn(name));
    }
  }
};
