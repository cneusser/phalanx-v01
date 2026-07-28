/**
 * Nachfolge-Netzwerk, Schritt 1: Nachfolgeinteressierte auf die Plattform holen.
 *
 *  1. Neue Spalte succession_type auf users und crm_contacts. Sie hält bei einem
 *     Nachfolge-Interessenten (buyer_type = 'successor') fest, ob mit oder ohne
 *     Kapitalbeteiligung gesucht wird ('mit_beteiligung' | 'ohne_beteiligung').
 *  2. Eine ansprechende, menschlich geschriebene Einladungsvorlage für das
 *     Nachfolge-Netzwerk (Double-Opt-in, führt auf die Einwilligungsseite).
 */
const NACHFOLGE_INVITE = {
  tenant_id: 1,
  key: 'nachfolge_invite',
  name: 'Einladung Nachfolge-Netzwerk (DSGVO, Double-Opt-in)',
  stage: null,
  subject: 'Ihre Einladung ins Nachfolge-Netzwerk von CapitalMatch',
  // Ohne eigene Begrüßung und ohne Signatur: der Mailrahmen setzt „Guten Tag ...,"
  // davor und die Unterschrift dahinter. Sonst stünde der Name doppelt.
  body: [
    'manche Menschen wollen nicht die nächste Stelle antreten, sondern etwas Eigenes führen. Ein Unternehmen mit Substanz, mit einem eingespielten Team und mit einer Geschichte, die weitergehen soll. Wenn Sie das anspricht, sind Sie bei CapitalMatch genau richtig.',
    'Wir bauen ein Netzwerk für Menschen, die ein Unternehmen übernehmen möchten, ob als Geschäftsführer mit Beteiligung oder als Nachfolger, der selbst investiert. Sie treffen dort auf Übergeber, die einen Nachfolger suchen, auf andere Nachfolgeinteressierte und auf Begleiter, die den Weg schon kennen.',
    'Was Sie erwartet: passende Vorschläge auf der Plattform, Matching-Events, bei denen Sie Übergeber persönlich kennenlernen, und Veranstaltungen rund um die Unternehmensnachfolge. Für Nachfolgeinteressierte ist die Teilnahme kostenfrei.',
    'Der erste Schritt kostet Sie zwei Minuten. Sie bestätigen kurz Ihre Einwilligung, legen Ihr Profil an und sagen uns, in welche Richtung Sie suchen. Um den Rest kümmern wir uns.',
    'Ich freue mich darauf, Sie im Netzwerk zu begrüßen.',
  ].join('\n\n'),
  cta_label: 'Jetzt kostenfrei dabei sein',
  cta_target: 'consent',
  is_active: 1,
  is_system: 1,
  sort: 60,
};

exports.up = async function (knex) {
  for (const table of ['users', 'crm_contacts']) {
    const has = await knex.schema.hasColumn(table, 'succession_type').catch(() => false);
    if (!has) await knex.schema.alterTable(table, (t) => { t.text('succession_type'); });
  }
  const exists = await knex('mail_templates').where({ tenant_id: 1, key: NACHFOLGE_INVITE.key }).first().catch(() => null);
  if (!exists) await knex('mail_templates').insert(NACHFOLGE_INVITE).catch(() => {});
};

exports.down = async function (knex) {
  await knex('mail_templates').where({ tenant_id: 1, key: NACHFOLGE_INVITE.key }).del().catch(() => {});
  for (const table of ['users', 'crm_contacts']) {
    const has = await knex.schema.hasColumn(table, 'succession_type').catch(() => false);
    if (has) await knex.schema.alterTable(table, (t) => { t.dropColumn('succession_type'); }).catch(() => {});
  }
};
