/**
 * Zwei editierbare System-Mailvorlagen für den mandatsübergreifenden Newsletter.
 *   • newsletter_mandate     : an eingewilligte Kontakte, Hinweis auf aktuelle Mandate.
 *   • newsletter_reregister  : an alle ohne Widerspruch, Bitte um Bestätigung des Zugangs.
 *
 * Der Versand ergänzt die Liste der aktuellen Mandate und den passenden Button
 * automatisch. Betreff und Einleitungstext sind hier hinterlegt und im Admin
 * jederzeit änderbar (updated_by gesetzt = bleibt bei erneuter Migration unangetastet).
 * cta_target = 'none', weil Ziel und Beschriftung im Versand je Zielgruppe gesetzt werden.
 */
const TEMPLATES = [
  {
    key: 'newsletter_mandate',
    name: 'Newsletter: aktuelle Mandate (eingewilligte Kontakte)',
    stage: null,
    subject: '[CapitalMatch] Aktuelle Mandate im Überblick',
    body:
      'auf CapitalMatch sind in den vergangenen Wochen mehrere Mandate dazugekommen. ' +
      'Weil Sie eingewilligt und freigeschaltet sind, bekommen Sie den Überblick aus erster Hand.\n\n' +
      'Passt eines der Mandate in Ihr Suchraster, sehen Sie sich das anonyme Kurzprofil an und fordern Sie mit einem Klick die vertraulichen Unterlagen an.',
    cta_label: 'Alle Mandate im Marktplatz ansehen',
    cta_target: 'none',
    sort: 200,
  },
  {
    key: 'newsletter_reregister',
    name: 'Newsletter: Zugang bestätigen (alle Kontakte)',
    stage: null,
    subject: '[CapitalMatch] Bitte bestätigen Sie kurz Ihren Zugang',
    body:
      'wir haben CapitalMatch, unsere Plattform für Unternehmensnachfolge und M&A, technisch erneuert und die Sicherheit erhöht. ' +
      'Damit Sie weiterhin Mandate sehen und Unterlagen anfordern können, bitten wir Sie um eine kurze Bestätigung Ihres Zugangs. Das dauert eine Minute.\n\n' +
      'Ein Auszug, was aktuell auf der Plattform liegt:',
    cta_label: 'Zugang bestätigen und Registrierung abschließen',
    cta_target: 'consent',
    sort: 210,
  },
];

exports.up = async function (knex) {
  for (const t of TEMPLATES) {
    const exists = await knex('mail_templates').where({ key: t.key }).first().catch(() => null);
    if (exists) continue;
    await knex('mail_templates').insert({
      tenant_id: 1, key: t.key, name: t.name, stage: t.stage,
      subject: t.subject, body: t.body, cta_label: t.cta_label, cta_target: t.cta_target,
      is_active: 1, is_system: 1, sort: t.sort,
    }).catch(() => {});
  }
};

exports.down = async function (knex) {
  await knex('mail_templates').whereIn('key', TEMPLATES.map((t) => t.key)).del().catch(() => {});
};
