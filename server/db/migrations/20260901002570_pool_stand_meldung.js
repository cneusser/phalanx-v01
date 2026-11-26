// ─────────────────────────────────────────────────────────────────────────────
// Der Ausgangskorb lernt eine zweite Art von Meldung (v0.509)
//
// Anlass, wörtlich: „ich würde natürlich ganz gern den NDA nicht nur in
// CapitalMatch sehen wollen. Ich würde diesen gerne auch in einer Aufstellung
// in Phalanx OS haben wollen … damit quasi ich jederzeit die Historie komplett
// auch in Phalanx OS sehe und auch zu welchen Projekten die jeweilige Person
// sich interessiert hat. Und wichtig wäre mir noch auch zu erkennen, ob das
// zum Beispiel ein Nachfolgekontakt ist."
//
// Bis hierher meldete CapitalMatch nur Stammdaten zurück: Name, Adresse,
// Telefon, Position, Firma. Das ist ein Adressbuchabgleich, keine Historie.
//
// Phalanx OS hat für genau diese Frage längst einen eigenen Weg, den wir nicht
// benutzt haben: `PUT /api/pool/v1/contacts/:id/stand` nimmt Rolle, Stufe,
// eine Projektliste und eine Notiz entgegen, und zwar je Satellit getrennt.
// Phalanx OS muss dafür nicht angefasst werden.
//
// Der Ausgangskorb hielt bisher genau eine Zeile je Kontakt. Mit zwei Arten
// von Meldung würde die eine die andere verdrängen, deshalb die Spalte `art`
// und ein Schlüssel über drei Felder statt über zwei.
//
// Die Datei selbst bleibt in CapitalMatch. Eine Urkunde an zwei Orten ist eine
// Urkunde, die auseinanderlaufen kann; gemeldet wird, dass sie vorliegt, mit
// Datum, Herkunft, Prüfsumme und einem Link dorthin.
// ─────────────────────────────────────────────────────────────────────────────

exports.up = async function (knex) {
  const da = await knex.schema.hasTable('phalanx_pool_outbox');
  if (!da) return;

  const hatArt = await knex.schema.hasColumn('phalanx_pool_outbox', 'art');
  if (!hatArt) {
    await knex.schema.alterTable('phalanx_pool_outbox', (t) => {
      t.text('art').notNullable().defaultTo('kontakt');   // kontakt | stand
    });
  }

  // Der alte Schlüssel über (tenant_id, contact_id) ließe nur eine Meldung je
  // Kontakt zu. Namen von Bedingungen sind in PostgreSQL vorhersagbar, hier
  // wird trotzdem nachgesehen, statt zu raten.
  const alt = await knex.raw(`
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'phalanx_pool_outbox'::regclass AND contype = 'u'`).catch(() => ({ rows: [] }));
  for (const r of (alt.rows || [])) {
    await knex.raw(`ALTER TABLE phalanx_pool_outbox DROP CONSTRAINT IF EXISTS "${r.conname}"`).catch(() => {});
  }
  await knex.raw(`
    ALTER TABLE phalanx_pool_outbox
      ADD CONSTRAINT phalanx_pool_outbox_tenant_contact_art_unique
      UNIQUE (tenant_id, contact_id, art)`).catch(() => {});

  await knex.raw(`
    ALTER TABLE phalanx_pool_outbox ADD CONSTRAINT phalanx_pool_outbox_art_check
    CHECK (art IN ('kontakt', 'stand'))`).catch(() => {});
};

exports.down = async function (knex) {
  const da = await knex.schema.hasTable('phalanx_pool_outbox');
  if (!da) return;
  await knex.raw('ALTER TABLE phalanx_pool_outbox DROP CONSTRAINT IF EXISTS phalanx_pool_outbox_art_check').catch(() => {});
  await knex.raw('ALTER TABLE phalanx_pool_outbox DROP CONSTRAINT IF EXISTS phalanx_pool_outbox_tenant_contact_art_unique').catch(() => {});
  const hatArt = await knex.schema.hasColumn('phalanx_pool_outbox', 'art');
  if (hatArt) await knex.schema.alterTable('phalanx_pool_outbox', (t) => { t.dropColumn('art'); });
};
