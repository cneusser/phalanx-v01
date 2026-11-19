// ─────────────────────────────────────────────────────────────────────────────
// Eine Vertraulichkeitsvereinbarung zur Unterschrift freigeben (v0.480)
//
// Anlass, wörtlich: „Ich habe beim letzten den Fall, dass er FARADAY angefragt
// hat und jetzt nochmal hier ein separater Prozessschritt notwendig ist."
//
// So war es gebaut. Wer ein Mandat anfragt und sich dabei registriert, legt
// zwei Dinge an: ein Konto, das freigeschaltet werden muss, und eine
// Anfrage nach der Vertraulichkeitsvereinbarung, die versendet werden muss.
// Beides sind getrennte Knöpfe an getrennten Stellen, und zwischen ihnen
// wartet jemand.
//
// Diese Datei ist der eine Vorgang, den beide Stellen aufrufen: die
// Kontofreigabe in der Verwaltung und der bisherige Knopf im Mandat. Es gibt
// also keine zweite Fassung der Regeln, die beim nächsten Mal anders
// entscheidet.
//
// Drei Festlegungen:
//
//   1. Freigegeben wird nur, was den Stand „angefordert" hat. Eine bereits
//      versendete Vereinbarung wird nicht erneut versendet, eine
//      unterzeichnete schon gar nicht.
//   2. Die Mail geht raus, aber ihr Scheitern hält den Vorgang nicht auf.
//      Der Stand in der Akte ist die Wahrheit, nicht der Postausgang.
//   3. Gemeldet wird je Mandat einzeln, mit Codenamen. Wer freigibt, soll
//      lesen können, wofür.
// ─────────────────────────────────────────────────────────────────────────────

/** Die offenen Anfragen eines Nutzers, also die mit Stand „angefordert". */
async function offeneAnfragen(userId, db) {
  return db.all(
    `SELECT nr.id, nr.project_id, p.codename
       FROM nda_requests nr
       JOIN projects p ON p.id = nr.project_id
      WHERE nr.user_id = ? AND nr.status = 'requested'
      ORDER BY nr.requested_at`, [userId]).catch(() => []);
}

/**
 * Eine einzelne Anfrage freigeben.
 *
 * @returns {Promise<{ok: boolean, grund?: string, codename?: string}>}
 */
async function eineFreigeben({ anfrage, actorId, ip, db, setStage }) {
  const nda = await db.get('SELECT * FROM nda_requests WHERE id = ?', [anfrage.id]);
  if (!nda) return { ok: false, grund: 'Die Anfrage gibt es nicht mehr.' };
  if (nda.status !== 'requested') return { ok: false, grund: `Stand ist bereits „${nda.status}".` };

  await db.run("UPDATE nda_requests SET status = 'sent', sent_at = now() WHERE id = ?", [nda.id]);
  await setStage(nda.user_id, nda.project_id, 'nda_pending', actorId, ip);
  db.auditLog(actorId, 'NDA_SENT', 'nda_request', nda.id, anfrage.codename || null, ip);

  // Der Hinweis an den Interessenten. Scheitert er, bleibt die Freigabe.
  try {
    const buyer = await db.get('SELECT email, first_name, last_name FROM users WHERE id = ?', [nda.user_id]);
    if (buyer) {
      const { sendProcessUpdateEmail } = require('./email');
      sendProcessUpdateEmail({
        to: buyer.email, firstName: buyer.first_name, person: buyer,
        title: `Vertraulichkeitsvereinbarung bereit: ${anfrage.codename || 'Mandat'}`,
        message: 'Ihr Zugang ist freigeschaltet, und Ihre Vertraulichkeitsvereinbarung für das Mandat '
          + `<strong>${anfrage.codename || ''}</strong> liegt bereit. Sie können sie jetzt online unterzeichnen.`,
        ctaLabel: 'Jetzt unterzeichnen', ctaPath: `/projekte/${nda.project_id}`,
        meta: { type: 'process', projectId: nda.project_id, userId: nda.user_id, actorId },
      }).catch(() => {});
    }
  } catch { /* der Postausgang entscheidet nicht über den Stand */ }

  return { ok: true, codename: anfrage.codename || null, project_id: nda.project_id };
}

/**
 * Alle offenen Anfragen eines Nutzers freigeben.
 *
 * @returns {Promise<{freigegeben: Array, uebersprungen: Array}>}
 */
async function alleFreigeben({ userId, actorId, ip, db, setStage }) {
  const offen = await offeneAnfragen(userId, db);
  const freigegeben = [];
  const uebersprungen = [];
  for (const a of offen) {
    // eslint-disable-next-line no-await-in-loop
    const r = await eineFreigeben({ anfrage: a, actorId, ip, db, setStage });
    if (r.ok) freigegeben.push({ codename: r.codename, project_id: r.project_id });
    else uebersprungen.push({ codename: a.codename, grund: r.grund });
  }
  return { freigegeben, uebersprungen };
}

module.exports = { offeneAnfragen, eineFreigeben, alleFreigeben };
