// Vorlage: freundliche Erinnerung an bereits registrierte Nachfolge-Interessenten,
// ihr Nachfolge-Profil (Fragebogen) auszufüllen. Der Mailrahmen setzt Begrüßung
// und Unterschrift, daher steht beides nicht im Text.
const TPL = {
  tenant_id: 1,
  key: 'nachfolge_profil_erinnerung',
  name: 'Erinnerung: Nachfolge-Profil ausfüllen',
  stage: null,
  subject: 'Ihr Nachfolge-Profil bei CapitalMatch, damit wir passende Unternehmen finden',
  body: [
    'schön, dass Sie im Nachfolge-Netzwerk von CapitalMatch dabei sind. Damit wir Ihnen wirklich passende Unternehmen vorschlagen können, fehlt noch ein kurzer Schritt: Ihr Nachfolge-Profil.',
    'In wenigen Minuten sagen Sie uns, aus welchen Branchen Sie kommen, welche Region für Sie infrage kommt, welche Unternehmensgröße Sie sich vorstellen und ob Sie als Geschäftsführer mit Beteiligung oder als Nachfolger mit eigenem Kapital einsteigen möchten. Je klarer das Bild, desto genauer die Vorschläge.',
    'So finden Sie den Fragebogen: Melden Sie sich an, öffnen Sie oben rechts „Mein Bereich" und klicken Sie auf „Fragebogen ausfüllen". Alle Angaben sind freiwillig, jederzeit änderbar und werden vertraulich behandelt.',
    'Wenn Sie mögen, schaue ich mir Ihre Angaben danach persönlich an und melde mich mit ersten passenden Mandaten bei Ihnen.',
    'Für Rückfragen bin ich jederzeit erreichbar. Ich freue mich, von Ihnen zu hören.',
  ].join('\n\n'),
  cta_label: null,
  cta_target: 'none',
  is_active: 1,
  is_system: 1,
  sort: 61,
};

exports.up = async function (knex) {
  const exists = await knex('mail_templates').where({ tenant_id: 1, key: TPL.key }).first().catch(() => null);
  if (!exists) await knex('mail_templates').insert(TPL).catch(() => {});
};

exports.down = async function (knex) {
  await knex('mail_templates').where({ tenant_id: 1, key: TPL.key }).del().catch(() => {});
};
