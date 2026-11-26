// ─────────────────────────────────────────────────────────────────────────────
// Zu welcher Firma gehört diese Person vermutlich? (v0.509)
//
// Anlass, wörtlich: „ich habe zum Beispiel einen Kontakt, die Fabri-Gruppe, da
// ist aktuell ein Herr Zübert, aber ich habe jetzt noch eine Frau Halbig,
// glaube ich, Habrich mit dazu bekommen, die ist eigentlich auch Fabri-Gruppe."
//
// Die Zuordnung von Hand gibt es längst. Was fehlte, ist der Hinweis: Zwei
// Personen teilen sich eine Mail-Domäne, und niemand sagt es.
//
// Drei Regeln, und die erste ist die wichtigste:
//
//   1. Es wird vorgeschlagen, nicht zugeordnet. „Nichts raten, nichts löschen,
//      nichts zusammenführen" gilt hier genauso wie beim Import. Ein falsch
//      zugeordneter Kontakt in einem anonymen Verkaufsprozess ist kein
//      Schönheitsfehler.
//   2. Freimail-Domänen zählen nicht. Zwei Leute bei gmx.de haben nichts
//      miteinander zu tun, und ein Vorschlag, der bei jedem Zweiten anschlägt,
//      wird nach einer Woche weggeklickt statt gelesen.
//   3. Der Grund steht dabei. Wer einen Vorschlag annimmt, soll sehen, worauf
//      er beruht, und ihn deshalb auch ablehnen können.
// ─────────────────────────────────────────────────────────────────────────────

// Anbieter von Postfächern. Eine Übereinstimmung hier sagt nichts.
const FREIMAIL = new Set([
  'gmail.com', 'googlemail.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch',
  'web.de', 't-online.de', 'outlook.com', 'outlook.de', 'hotmail.com', 'hotmail.de',
  'live.de', 'live.com', 'yahoo.com', 'yahoo.de', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'posteo.de', 'mailbox.org', 'protonmail.com', 'proton.me', 'freenet.de',
  'arcor.de', 'online.de', 'mail.de', 'firemail.de', 'gmx.com',
]);

/** Die Domäne einer Adresse, klein geschrieben. Leer, wenn es keine gibt. */
function domaene(email) {
  const m = String(email || '').toLowerCase().match(/@([^@\s]+)$/);
  return m ? m[1].replace(/^www\./, '') : '';
}

/** Taugt diese Domäne als Hinweis auf eine Firma? */
const aussagekraeftig = (d) => !!d && !FREIMAIL.has(d) && d.includes('.');

/** Firmennamen auf das reduzieren, was den Namen ausmacht. */
function kern(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\b(gmbh|mbh|ag|kg|ohg|gbr|se|co|kgaa|ug|ltd|inc|holding|gruppe|group|beteiligungen|verwaltung)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Die Vorschläge für einen Kontakt.
 *
 * @param db         Datenbankzugriff mit get() und all()
 * @param contactId  der Kontakt
 * @returns [{ company_id, name, grund, staerke }]
 */
async function fuerKontakt(db, contactId) {
  const k = await db.get('SELECT * FROM crm_contacts WHERE id = ? AND anonymized_at IS NULL', [contactId]).catch(() => null);
  if (!k) return [];

  // Wer schon zugeordnet ist, braucht keinen Vorschlag.
  const da = await db.get('SELECT count(*)::int AS n FROM crm_company_contacts WHERE contact_id = ?', [contactId])
    .catch(() => ({ n: 0 }));
  if (Number(da && da.n) > 0) return [];

  const treffer = new Map();
  const merke = (zeile, grund, staerke) => {
    if (!zeile || !zeile.id) return;
    const vorhanden = treffer.get(zeile.id);
    if (vorhanden && vorhanden.staerke >= staerke) return;
    treffer.set(zeile.id, { company_id: zeile.id, name: zeile.name, grund, staerke });
  };

  // 1. Die Domäne der Adresse. Der stärkste Hinweis, den wir haben.
  const d = domaene(k.email || k.pool_email);
  if (aussagekraeftig(d)) {
    // a) Eine Firma, deren Webseite auf dieselbe Domäne zeigt.
    const ueberWebseite = await db.get(
      `SELECT id, name FROM crm_companies
        WHERE website IS NOT NULL
          AND lower(regexp_replace(regexp_replace(website, '^https?://', ''), '^www\\.', '')) LIKE ?
        LIMIT 1`, [`${d}%`]).catch(() => null);
    merke(ueberWebseite, `Die Webseite der Firma läuft auf ${d}`, 3);

    // b) Ein anderer Kontakt mit derselben Domäne, der bereits zugeordnet ist.
    const ueberKollegen = await db.get(
      `SELECT co.id, co.name, k2.first_name, k2.last_name
         FROM crm_contacts k2
         JOIN crm_company_contacts cc ON cc.contact_id = k2.id
         JOIN crm_companies co ON co.id = cc.company_id
        WHERE k2.id <> ? AND k2.anonymized_at IS NULL
          AND lower(k2.email) LIKE ?
        ORDER BY cc.ended_on NULLS FIRST, k2.id DESC
        LIMIT 1`, [contactId, `%@${d}`]).catch(() => null);
    if (ueberKollegen) {
      const wer = `${ueberKollegen.first_name || ''} ${ueberKollegen.last_name || ''}`.trim();
      merke(ueberKollegen, `${wer || 'Eine andere Person'} mit derselben Adressdomäne ${d} gehört dort hin`, 2);
    }
  }

  // 2. Der Firmenname steht im Freitext des Kontakts. Schwächer, aber oft
  //    die einzige Spur bei einer Adresse von einem Freimail-Anbieter.
  const text = kern([k.notes, k.responsibility, k.lead_ref].filter(Boolean).join(' '));
  if (text.length >= 4) {
    const firmen = await db.all('SELECT id, name FROM crm_companies LIMIT 2000').catch(() => []);
    for (const f of (firmen || [])) {
      const kf = kern(f.name);
      if (kf.length >= 4 && text.includes(kf)) {
        merke(f, `„${f.name}" steht in den Notizen dieses Kontakts`, 1);
        break;
      }
    }
  }

  return [...treffer.values()].sort((a, b) => b.staerke - a.staerke).slice(0, 3);
}

module.exports = { fuerKontakt, domaene, aussagekraeftig, kern, FREIMAIL };
