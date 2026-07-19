/**
 * v0.297: Fehlende Brücke zwischen CRM-Kontakt und Plattform-Konto schließen.
 *
 * Bisher wurde crm_contacts.user_id nur bei der Registrierung über eine Einladung
 * gesetzt. Kontakte, die schon vorher existierten oder deren Konto anders angelegt
 * wurde, blieben unverknüpft. Dadurch fehlten am Kontakt das Kennzeichen
 * „Plattform-Konto" und der Birdview.
 *
 * Hier verknüpfen wir nachträglich über die E-Mail-Adresse, aber nur dort, wo die
 * Zuordnung eindeutig ist (genau ein Konto zu dieser Adresse).
 */
exports.up = async function (knex) {
  await knex.raw(`
    UPDATE crm_contacts k
       SET user_id = u.id
      FROM users u
     WHERE k.user_id IS NULL
       AND k.email IS NOT NULL
       AND lower(k.email) = lower(u.email)
       AND (SELECT COUNT(*) FROM users u2 WHERE lower(u2.email) = lower(k.email)) = 1
  `).catch(() => {});
};

exports.down = async function () {
  // Bewusst ohne Rücknahme: die Verknüpfung ist eine Korrektur, kein Feature.
};
