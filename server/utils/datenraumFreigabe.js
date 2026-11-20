// ─────────────────────────────────────────────────────────────────────────────
// Den Datenraum freigeben, an einer Stelle (v0.481)
//
// Anlass, wörtlich: „Es ist immer noch ein Fehler, dass der NDA quasi, wenn ich
// den über das Chatfenster freigebe, anscheinend den Datenraum nicht
// freigeschalten wird. Ich habe gesehen, dass im Mandat der Datenraum eben
// nicht freigeschalten ist."
//
// Nachgestellt an der laufenden Anlage waren es zwei Fehler, nicht einer:
//
//   1. Der Knopf im Chat gab das Mandat frei, das in der Unterhaltung zuletzt
//      genannt worden war, nicht das, für das eine Vereinbarung offen lag. Wer
//      über zwei Mandate schreibt, gibt das falsche frei. Die Anlage meldet
//      Erfolg, der angefragte Datenraum bleibt zu. Genau das war zu sehen.
//   2. Der Knopf im Chat gab den Datenraum auch dann frei, wenn die
//      Vereinbarung erst angefordert und nie unterschrieben war. Die
//      Mandatsroute weist das ausdrücklich ab. Zwei Fassungen derselben Regel,
//      und die lockerere lag im bequemeren Weg.
//
// Diese Datei ist die eine Regel. Wer freigeben will, fragt zuerst
// `offenFuer(userId)`, bekommt die Mandate mit Stand und Begründung, und gibt
// dann ein benanntes Mandat frei. Es wird nichts geraten.
//
// Die Unterschrift ist Bedingung. Die einzige Ausnahme ist die, die es vorher
// schon gab: Bei Startup-Finanzierungen zeichnen institutionelle Investoren
// regelmäßig kein NDA, dort ersetzt die ausdrückliche Freigabe die
// Unterschrift. Diese Ausnahme steht hier einmal und nicht je Route neu.
// ─────────────────────────────────────────────────────────────────────────────

const { stageRank } = require('./dealStateMachine');

/** Zählt als unterschrieben? Online-Zustimmung gilt wie Unterschrift. */
function istUnterschrieben(nda) {
  if (!nda) return false;
  return nda.status === 'signed' || nda.status === 'approved' || !!nda.online_consent_at;
}

/**
 * Was ist für diesen Nutzer offen, Mandat für Mandat?
 *
 * Gemeldet wird jedes Mandat, in dem der Nutzer eine Vereinbarung oder ein
 * Interesse hat und der Datenraum noch nicht offen ist. Je Eintrag steht dabei,
 * was ein Klick täte und was ihn hindert.
 */
async function offenFuer(userId, db) {
  const zeilen = await db.all(
    `SELECT p.id   AS project_id,
            p.codename,
            p.mandate_type,
            i.stage,
            nr.id   AS nda_id,
            nr.status AS nda_status,
            nr.online_consent_at
       FROM projects p
       LEFT JOIN interests i
              ON i.project_id = p.id AND i.buyer_id = ?
       LEFT JOIN nda_requests nr
              ON nr.project_id = p.id AND nr.user_id = ?
             AND nr.id = (SELECT MAX(id) FROM nda_requests WHERE project_id = p.id AND user_id = ?)
      WHERE i.buyer_id IS NOT NULL OR nr.id IS NOT NULL
      ORDER BY p.codename`,
    [userId, userId, userId]).catch(() => []);

  return (zeilen || []).map((z) => {
    const offen = ['dataroom_granted', 'loi'].includes(z.stage);
    const unterschrieben = istUnterschrieben({ status: z.nda_status, online_consent_at: z.online_consent_at });
    const finanzierung = z.mandate_type === 'fundraising';
    let hindernis = null;
    if (offen) hindernis = 'bereits offen';
    else if (z.stage === 'rejected') hindernis = 'zurückgewiesen';
    else if (!unterschrieben && !finanzierung) hindernis = 'Vereinbarung nicht unterschrieben';
    return {
      project_id: z.project_id,
      codename: z.codename,
      mandate_type: z.mandate_type,
      stage: z.stage || null,
      nda_id: z.nda_id || null,
      nda_status: z.nda_status || null,
      unterschrieben,
      datenraum_offen: offen,
      moeglich: !hindernis,
      hindernis,
    };
  });
}

/**
 * Den Datenraum eines benannten Mandats für einen benannten Nutzer freigeben.
 *
 * Es wird kein Mandat erraten und keines gesucht: Wer aufruft, nennt beides.
 *
 * @returns {Promise<{ok: boolean, grund?: string, codename?: string, nda?: boolean}>}
 */
async function freigeben({ userId, projectId, actorId, ip, db, setStage }) {
  const projekt = await db.get('SELECT id, codename, mandate_type FROM projects WHERE id = ?', [projectId]);
  if (!projekt) return { ok: false, grund: 'Das Mandat gibt es nicht.' };

  const nda = await db.get(
    'SELECT * FROM nda_requests WHERE project_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1',
    [projectId, userId]).catch(() => null);

  const finanzierung = projekt.mandate_type === 'fundraising';
  if (!istUnterschrieben(nda) && !finanzierung) {
    return {
      ok: false,
      codename: projekt.codename,
      grund: 'Die Vertraulichkeitsvereinbarung ist noch nicht unterschrieben. Bitte zuerst versenden '
        + 'und den Interessenten online unterzeichnen lassen; erst danach kann der Datenraum freigegeben werden.',
    };
  }

  const vorher = await db.get('SELECT stage FROM interests WHERE project_id = ? AND buyer_id = ?', [projectId, userId]).catch(() => null);
  if (vorher && stageRank(vorher.stage) > stageRank('dataroom_granted')) {
    return { ok: false, codename: projekt.codename, grund: `Der Stand ist bereits weiter: „${vorher.stage}".` };
  }

  if (nda && nda.status !== 'approved') {
    await db.run('UPDATE nda_requests SET status = \'approved\', approved_at = now(), approved_by = ? WHERE id = ?', [actorId, nda.id]);
  }
  await setStage(userId, projectId, 'dataroom_granted', actorId, ip);
  db.auditLog(actorId, nda ? 'NDA_APPROVED' : 'DATAROOM_GRANTED_DIRECT',
    nda ? 'nda_request' : 'project', nda ? nda.id : projekt.id,
    `Datenraum freigegeben für Nutzer ${userId}, Mandat ${projekt.codename}`, ip);

  return { ok: true, codename: projekt.codename, nda: !!nda, project_id: projekt.id };
}

module.exports = { offenFuer, freigeben, istUnterschrieben };
