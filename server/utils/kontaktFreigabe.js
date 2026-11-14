// ─────────────────────────────────────────────────────────────────────────────
// Wann darf eine Seite die Kontaktdaten der anderen sehen? (v0.468)
//
// Die Regel in einem Satz: Zwischen den beiden Seiten eines Mandats werden
// Kontaktdaten erst offengelegt, wenn die Verwaltung das ausdrücklich
// freigegeben hat, und das frühestens, wenn die Vertraulichkeitsvereinbarung
// von allen Seiten unterzeichnet ist.
//
// Zwei Dinge, die diese Datei bewusst NICHT tut:
//
//   · Sie sperrt nicht das ganze Netzwerk. Zwei Investoren, die sich im
//     Gemeinschaftsbereich verbinden, stehen sich nicht als Parteien eines
//     Mandats gegenüber. Für sie gilt weiter: angenommene Kontaktanfrage
//     genügt. Alles andere wäre eine Antwort auf eine Frage, die niemand
//     gestellt hat.
//   · Sie verlässt sich nicht darauf, dass die Oberfläche einen Knopf
//     ausblendet. Die Prüfung liegt hier, und die Routen fragen hier nach.
//
// Alle Funktionen laden `db` erst beim Aufruf. So lässt sich die Logik
// prüfen, ohne eine Datenbank zu starten.
// ─────────────────────────────────────────────────────────────────────────────

const VERWALTUNG = ['super_admin', 'advisor', 'tenant_owner'];

/** Paar immer in derselben Reihenfolge, damit es nur eine Zeile gibt. */
function paar(a, b) {
  const x = Number(a); const y = Number(b);
  return x <= y ? [x, y] : [y, x];
}

/**
 * Stehen sich diese beiden als Parteien eines Mandats gegenüber?
 *
 * Gegenpartei heisst: Einer pflegt das Mandat (Ersteller oder Mitglied), der
 * andere ist als Interessent erfasst oder hat eine Vertraulichkeits-
 * vereinbarung angefragt. Die Richtung spielt keine Rolle.
 *
 * @returns {Promise<number[]>} die Mandats-Ids, in denen das zutrifft
 */
async function gemeinsameMandate(aId, bId) {
  const db = require('../db/database');
  const rows = await db.all(`
    SELECT p.id FROM projects p
     WHERE (
             (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))
         AND (EXISTS (SELECT 1 FROM interests i WHERE i.project_id = p.id AND i.buyer_id = ?)
              OR EXISTS (SELECT 1 FROM nda_requests nr WHERE nr.project_id = p.id AND nr.user_id = ?))
           )
        OR (
             (p.created_by = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))
         AND (EXISTS (SELECT 1 FROM interests i WHERE i.project_id = p.id AND i.buyer_id = ?)
              OR EXISTS (SELECT 1 FROM nda_requests nr WHERE nr.project_id = p.id AND nr.user_id = ?))
           )
  `, [aId, aId, bId, bId, bId, bId, aId, aId]).catch(() => []);
  return rows.map((r) => r.id);
}

/**
 * Was fehlt noch, bevor für dieses Mandat freigegeben werden darf?
 *
 * Geprüft wird die Unterschrift beider Seiten. In der Datenbank steht das als
 * Status der Anfrage: `signed` ist die Unterschrift des Interessenten,
 * `approved` ist die Gegenzeichnung durch uns. Erst `approved` heisst
 * „von allen Seiten".
 *
 * Startup-Finanzierungen sind die bekannte Ausnahme: Dort zeichnen
 * institutionelle Investoren regelmässig keine Vereinbarung, und die
 * ausdrückliche Freigabe tritt an die Stelle der Unterschrift. Das steht
 * schon so in der Datenraum-Freigabe, und es wäre verwirrend, wenn hier
 * eine zweite Regel gälte.
 *
 * @returns {Promise<{erfuellt: boolean, fehlend: string[], nda_status: string|null}>}
 */
async function voraussetzungen(projectId, interessentId) {
  const db = require('../db/database');
  const p = await db.get('SELECT id, status, mandate_type FROM projects WHERE id = ?', [projectId]);
  const fehlend = [];
  if (!p) return { erfuellt: false, fehlend: ['Das Mandat gibt es nicht.'], nda_status: null };
  if (p.status !== 'active') fehlend.push('Das Mandat ist noch nicht freigeschaltet.');

  const nda = await db.get(
    'SELECT status, signed_at, approved_at FROM nda_requests WHERE project_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1',
    [projectId, interessentId]).catch(() => null);
  const status = nda ? nda.status : null;
  const beidseitig = status === 'approved';
  const istFinanzierung = p.mandate_type === 'fundraising';

  if (!beidseitig && !istFinanzierung) {
    if (!nda) fehlend.push('Es liegt keine Vertraulichkeitsvereinbarung vor.');
    else if (status === 'signed') fehlend.push('Die Gegenzeichnung durch Phalanx fehlt noch.');
    else fehlend.push('Die Vertraulichkeitsvereinbarung ist noch nicht unterzeichnet.');
  }
  return { erfuellt: fehlend.length === 0, fehlend, nda_status: status };
}

/** Besteht für dieses Paar eine gültige, nicht widerrufene Freigabe? */
async function istFrei(projectId, aId, bId) {
  const db = require('../db/database');
  const [a, b] = paar(aId, bId);
  const r = await db.get(
    'SELECT id FROM kontakt_freigaben WHERE project_id = ? AND a_user_id = ? AND b_user_id = ? AND widerrufen_am IS NULL',
    [projectId, a, b]).catch(() => null);
  return !!r;
}

/**
 * Die Frage, die die Routen stellen: Darf dieser Betrachter die Kontaktdaten
 * jener Person sehen?
 *
 * @returns {Promise<{frei: boolean, grund: string}>}
 */
async function darfSehen(betrachter, anderemId) {
  if (!betrachter || !anderemId) return { frei: false, grund: 'unbekannt' };
  if (Number(betrachter.id) === Number(anderemId)) return { frei: true, grund: 'eigene_daten' };
  if (VERWALTUNG.includes(betrachter.role)) return { frei: true, grund: 'verwaltung' };

  const mandate = await gemeinsameMandate(betrachter.id, anderemId);
  if (!mandate.length) return { frei: true, grund: 'keine_gegenpartei' };

  for (const projectId of mandate) {
    if (await istFrei(projectId, betrachter.id, anderemId)) {
      return { frei: true, grund: 'freigegeben' };
    }
  }
  return { frei: false, grund: 'gegenpartei_ohne_freigabe' };
}

/** Freigeben. Prüft die Voraussetzungen selbst und schreibt ins Protokoll. */
async function freigeben({ projectId, interessentId, gegenseiteId, actorId, grund = null, ip = null }) {
  const db = require('../db/database');
  const v = await voraussetzungen(projectId, interessentId);
  if (!v.erfuellt) return { ok: false, fehlend: v.fehlend };

  const [a, b] = paar(interessentId, gegenseiteId);
  const vorhanden = await db.get(
    'SELECT id FROM kontakt_freigaben WHERE project_id = ? AND a_user_id = ? AND b_user_id = ?', [projectId, a, b]).catch(() => null);
  if (vorhanden) {
    await db.run(
      'UPDATE kontakt_freigaben SET widerrufen_am = NULL, widerrufen_von = NULL, freigegeben_am = now(), freigegeben_von = ?, grund = ? WHERE id = ?',
      [actorId, grund, vorhanden.id]);
  } else {
    await db.insert(
      'INSERT INTO kontakt_freigaben (project_id, a_user_id, b_user_id, freigegeben_von, grund) VALUES (?, ?, ?, ?, ?)',
      [projectId, a, b, actorId, grund]);
  }
  db.auditLog(actorId, 'KONTAKT_FREIGEGEBEN', 'project', projectId, `Nutzer ${a} und ${b}`, ip);
  return { ok: true };
}

/** Widerrufen. Die Zeile bleibt stehen, damit nachvollziehbar bleibt, dass es
 *  die Freigabe gab. Gelöscht wird hier nichts. */
async function widerrufen({ projectId, aId, bId, actorId, ip = null }) {
  const db = require('../db/database');
  const [a, b] = paar(aId, bId);
  const r = await db.get(
    'SELECT id FROM kontakt_freigaben WHERE project_id = ? AND a_user_id = ? AND b_user_id = ? AND widerrufen_am IS NULL',
    [projectId, a, b]).catch(() => null);
  if (!r) return { ok: false, hinweis: 'Für dieses Paar besteht keine offene Freigabe. Es wurde nichts verändert.' };
  await db.run('UPDATE kontakt_freigaben SET widerrufen_am = now(), widerrufen_von = ? WHERE id = ?', [actorId, r.id]);
  db.auditLog(actorId, 'KONTAKT_WIDERRUFEN', 'project', projectId, `Nutzer ${a} und ${b}`, ip);
  return { ok: true };
}

module.exports = {
  VERWALTUNG, paar, gemeinsameMandate, voraussetzungen, istFrei, darfSehen, freigeben, widerrufen,
};
