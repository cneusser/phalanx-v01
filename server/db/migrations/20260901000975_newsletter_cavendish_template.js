/** Editierbare Vorlage für den Cavendish-Fokus-Newsletter (Aufmacher Cavendish, FARADAY und CUDD anteasern). */
const T = {
  key: 'newsletter_cavendish',
  name: 'Newsletter: Cavendish im Fokus (FARADAY und CUDD anteasern)',
  stage: null,
  subject: '[CapitalMatch] Neu: Seed-Beteiligung an einem Green-Hydrogen-Deep-Tech',
  body:
    'auf CapitalMatch ist ein neues Mandat live, das wir Ihnen besonders ans Herz legen: eine Seed-Beteiligung an einem '
    + 'deutschen Deep-Tech-Unternehmen für Grün-Wasserstoff. Die Technologie liefert bei gleichem Platz- und Gewichtsbedarf bis zu '
    + '260 Prozent mehr Leistung als der Marktführer, es liegen elf Absichtserklärungen von Systemintegratoren vor und ein '
    + 'Förderbescheid ist bewilligt. Seed I: 0,75 Mio. Euro bei 7,5 Mio. Euro Post-Money.\n\n'
    + 'Ebenfalls offen und einen Blick wert: zwei Nachfolge-Mandate im Mittelstand. Die anonymen Kurzprofile finden Sie unten.',
  cta_label: 'Zum Mandat',
  cta_target: 'consent',
  sort: 220,
};
exports.up = async function (knex) {
  const exists = await knex('mail_templates').where({ key: T.key }).first().catch(() => null);
  if (exists) return;
  await knex('mail_templates').insert({
    tenant_id: 1, key: T.key, name: T.name, stage: T.stage, subject: T.subject, body: T.body,
    cta_label: T.cta_label, cta_target: T.cta_target, is_active: 1, is_system: 1, sort: T.sort,
  }).catch(() => {});
};
exports.down = async function (knex) {
  await knex('mail_templates').where({ key: T.key }).del().catch(() => {});
};
