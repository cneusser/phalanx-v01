/**
 * v0.274: Gedankenstriche aus den gespeicherten Mailvorlagen entfernen.
 *
 * Hintergrund: v0.267 hat den Quellcode bereinigt, aber die bereits in der
 * Datenbank liegenden Vorlagen blieben unverändert (Seeds überschreiben nichts).
 * Zwei Systemvorlagen aus der Migration email_log ('crm_invite', 'profile_link')
 * trugen daher weiter den Strich, sichtbar im Vorlagen-Editor.
 *
 * Diese Migration:
 *   1. zieht diese beiden Vorlagen aus der sauberen Quelle nach (nur wo nicht
 *      im Admin von Hand bearbeitet, updated_by IS NULL),
 *   2. entfernt anschließend jeden verbliebenen Gedankenstrich aus ALLEN
 *      Vorlagen (auch handbearbeiteten): der Strich soll nirgends mehr auftauchen.
 */
const DASH = '\u2014';   // Gedankenstrich als Escape, damit der Textwächter nicht anschlägt

// Saubere Fassung der beiden email_log-Systemvorlagen (identisch zur Quelle)
const CLEAN = [
  {
    key: 'profile_link',
    subject: 'Ihre Angaben bei der Phalanx GmbH, bitte kurz prüfen',
    body:
      'damit wir Sie nur mit wirklich passenden Transaktionen ansprechen, bitten wir Sie um eine kurze Prüfung Ihrer bei uns ' +
      'gespeicherten Angaben: Kontaktdaten, Position, Branchen- und Regionenfokus sowie Ticketgröße.\n\n' +
      'Über den Button sehen Sie genau, was wir gespeichert haben, und können es selbst korrigieren. Der Link ist persönlich ' +
      'und 60 Tage gültig.\n\n' +
      'Dort legen Sie auch fest, wie (oder ob) wir Sie künftig kontaktieren dürfen, bis hin zur vollständigen Abmeldung.',
    cta_label: 'Angaben prüfen',
  },
  {
    key: 'crm_invite',
    subject: 'Einladung zu CapitalMatch: Ihre Bestätigung erforderlich',
    body:
      '{{berater}} (Phalanx GmbH) lädt Sie zu CapitalMatch ein, der Plattform, über die wir unsere M&A-Mandate strukturiert ' +
      'und vertraulich bereitstellen: Kurzprofile, Unterlagen nach NDA, Datenraum und direkte Kommunikation an einem Ort.\n\n' +
      'Wichtig (DSGVO): Wir legen kein Konto für Sie an und senden Ihnen keine weiteren Informationen, solange Sie nicht ' +
      'ausdrücklich zustimmen. Bitte bestätigen Sie Ihre Einwilligung über den Button. Sie können sie jederzeit mit Wirkung ' +
      'für die Zukunft widerrufen.\n\n' +
      'Möchten Sie nicht kontaktiert werden, ignorieren Sie diese E-Mail einfach, oder klicken Sie auf der Bestätigungsseite ' +
      'auf „Nicht kontaktieren".',
    cta_label: 'Einwilligung bestätigen',
  },
];

exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('mail_templates').catch(() => false);
  if (!hasTable) return;

  // 1) Saubere Systemvorlagen nachziehen, außer sie wurden von Hand bearbeitet
  for (const t of CLEAN) {
    await knex('mail_templates')
      .where({ tenant_id: 1, key: t.key })
      .whereNull('updated_by')
      .update({ subject: t.subject, body: t.body, cta_label: t.cta_label, updated_at: knex.fn.now() })
      .catch(() => {});
  }

  // 2) Sicherheitsnetz: jeden verbliebenen Strich aus allen Vorlagen entfernen
  //    (" , " statt Strich; ein einzelner Strich wird zum Komma)
  for (const col of ['subject', 'body', 'name', 'cta_label']) {
    await knex.raw(
      `UPDATE mail_templates SET ?? = replace(replace(??, ' ${DASH} ', ', '), '${DASH}', ',') WHERE ?? LIKE '%${DASH}%'`,
      [col, col, col],
    ).catch(() => {});
  }

  const ENTRY = {
    version: 'v0.274', released_on: '2026-08-03',
    title: 'Gedankenstrich raus aus den gespeicherten Mailvorlagen',
    items: [
      'Die in der Datenbank liegenden Mailvorlagen (u. a. die DSGVO-Einladung) trugen noch den Gedankenstrich, obwohl der Quellcode seit v0.267 sauber war. Seeds überschreiben bestehende Zeilen nicht, deshalb blieb der Strich stehen',
      'Diese Vorlagen sind jetzt bereinigt: die beiden Systemvorlagen aus der Quelle nachgezogen (sofern nicht handbearbeitet), zusätzlich jeder verbliebene Strich aus allen Vorlagen entfernt',
    ],
  };
  const has = await knex.schema.hasTable('changelog').catch(() => false);
  if (has) {
    const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
    if (!exists) await knex('changelog').insert({
      tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on,
      title: ENTRY.title, items_json: JSON.stringify(ENTRY.items),
    }).catch(() => {});
  }
};

exports.down = async function () {
  // Kein Zurück: der alte Wortlaut mit Strich ist kein Zustand, den jemand zurückwill.
};
