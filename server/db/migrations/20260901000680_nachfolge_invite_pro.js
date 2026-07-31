// Einladung ins Nachfolge-Netzwerk mit Reaktivierungs-Ansprache: Phalanx hat sich
// weiter professionalisiert und das Verfahren auf eine neue Ebene gebracht.
// Double-Opt-in (cta_target 'consent'); der Mailrahmen setzt Begrüßung + Signatur.
// Auf der verlinkten Seite kann der Empfänger auch die Löschung seiner Daten wählen.
const TPL = {
  tenant_id: 1,
  key: 'nachfolge_invite_pro',
  name: 'Einladung Nachfolge-Netzwerk (Reaktivierung, DSGVO)',
  stage: null,
  subject: 'Suchen Sie weiterhin ein Unternehmen zur Nachfolge?',
  body: [
    'vor einiger Zeit ging es bei uns schon einmal um das Thema Unternehmensnachfolge. Ich wollte mich kurz bei Ihnen melden und fragen, ob das für Sie noch aktuell ist.',
    'Bei Phalanx hat sich seither einiges getan. Wir haben unsere Nachfolgebegleitung deutlich weiter professionalisiert und das ganze Verfahren auf eine neue Ebene gebracht: über unsere Plattform CapitalMatch schlagen wir Ihnen passende Nachfolge-Mandate vor, Sie sehen die wichtigsten Eckdaten anonymisiert vorab, und der weitere Weg vom ersten Gespräch über den Datenraum bis zur Übernahme läuft strukturiert und begleitet.',
    'Ich möchte Sie herzlich in unser Nachfolge-Netzwerk einladen. Dort treffen Sie auf Übergeber, die einen Nachfolger suchen, auf andere Nachfolgeinteressierte und auf Begleiter, die den Weg kennen. Für Nachfolgeinteressierte ist die Teilnahme kostenfrei.',
    'Der erste Schritt kostet Sie zwei Minuten: Sie bestätigen kurz Ihre Einwilligung und legen Ihr Profil an. Um den Rest kümmere ich mich. Falls das Thema für Sie erledigt ist, sagen Sie mir auf derselben Seite mit einem Klick Bescheid, dann löschen wir Ihre Daten und Sie hören nichts mehr von uns.',
    'Ich würde mich freuen, wieder von Ihnen zu hören.',
  ].join('\n\n'),
  cta_label: 'Ja, ich bin interessiert',
  cta_target: 'consent',
  is_active: 1,
  is_system: 1,
  sort: 62,
};

exports.up = async function (knex) {
  const exists = await knex('mail_templates').where({ tenant_id: 1, key: TPL.key }).first().catch(() => null);
  if (!exists) await knex('mail_templates').insert(TPL).catch(() => {});
};

exports.down = async function (knex) {
  await knex('mail_templates').where({ tenant_id: 1, key: TPL.key }).del().catch(() => {});
};
