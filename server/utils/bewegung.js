// ─────────────────────────────────────────────────────────────────────────────
// Was sich bewegt, und was nicht (v0.514)
//
// Anlass ist die ehrlichste Zahl aus dem Funnel: Bei FARADAY stehen 201 von 240
// Kontakten auf der Stufe Ansprache, viele seit 79 Tagen, einer seit 162. Das ist
// kein Mangel an Reichweite, sondern einer an Bewegung, und bisher war er nur als
// graue Zahl auf einer Karte zu sehen.
//
// Zwei Begriffe, und beide müssen eng sein, sonst zählt die Maschine Rauschen:
//
//   Bewegung    irgendetwas ist an diesem Vorgang passiert, von welcher Seite
//               auch immer. Stufenwechsel, Ansprache, Antwort, Unterschrift,
//               Datenraum.
//   Reaktion    die Gegenseite hat etwas getan. Nur das zählt für die Quote,
//               denn ob wir fleissig schreiben, sagt nichts über den Vorgang.
//
// Die Quote ist bewusst nach dem Vorbild von Axial gebaut, dem einzigen Anbieter
// im Markt, der Reaktionsfreudigkeit formelhaft fasst: Anteil der Ansprachen, auf
// die binnen sieben Tagen etwas zurückkam, über die letzten zwanzig. Nicht über
// alle, weil eine Quote über drei Jahre niemanden mehr erreicht.
//
// Was hier nicht passiert: bewerten. Es gibt keine Note und keine Ampel auf der
// Person. Eine Zahl, die sagt, wie oft jemand geantwortet hat, ist eine Tatsache.
// Eine Note wäre ein Urteil, und das steht einer Maschine nicht zu.
// ─────────────────────────────────────────────────────────────────────────────

/** Nach wie vielen Tagen ohne Bewegung ein Vorgang als hängend gilt. */
const HAENGT_AB_TAGEN = 21;

/** Wie viele Ansprachen in die Quote eingehen. */
const FENSTER = 20;

/** Wie lange eine Antwort als Reaktion auf eine Ansprache zählt. */
const REAKTION_TAGE = 7;

const tageSeit = (wert, jetzt = Date.now()) => {
  if (!wert) return null;
  const t = wert instanceof Date ? wert.getTime() : new Date(wert).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((jetzt - t) / 86400000));
};

/**
 * Die letzte Bewegung je Partei, über alle Quellen.
 *
 * Eine Abfrage statt sechs, weil der Bericht über alle Mandate läuft und je
 * Zeile sechs Unterabfragen bei tausend Zeilen sechstausend wären.
 */
const BEWEGUNG_SQL = `
  SELECT dp.id                AS party_id,
         dp.project_id,
         dp.contact_id,
         dp.funnel_stage,
         dp.party_status,
         dp.party_role,
         p.codename,
         k.first_name, k.last_name, k.email, k.user_id,
         GREATEST(
           COALESCE(dp.stage_changed_at, dp.created_at),
           COALESCE(dp.last_contact::timestamptz, dp.created_at),
           COALESCE((SELECT max(COALESCE(m.sent_at, m.created_at)) FROM crm_messages m
                      WHERE m.contact_id = dp.contact_id AND m.project_id = dp.project_id), dp.created_at),
           COALESCE((SELECT max(e.created_at) FROM email_log e
                      WHERE e.contact_id = dp.contact_id AND e.project_id = dp.project_id), dp.created_at),
           COALESCE((SELECT max(COALESCE(nr.signed_at, nr.online_consent_at, nr.sent_at))
                       FROM nda_requests nr
                      WHERE nr.project_id = dp.project_id AND nr.user_id = k.user_id), dp.created_at),
           COALESCE((SELECT max(sa.created_at) FROM safe_access_log sa
                      WHERE sa.project_id = dp.project_id AND sa.user_id = k.user_id), dp.created_at)
         ) AS letzte_bewegung,
         (SELECT max(COALESCE(m.sent_at, m.created_at)) FROM crm_messages m
           WHERE m.contact_id = dp.contact_id AND m.direction = 'in') AS letzte_antwort,
         (SELECT max(e.created_at) FROM email_log e
           WHERE e.contact_id = dp.contact_id AND e.project_id = dp.project_id) AS letzte_ansprache
    FROM crm_deal_parties dp
    JOIN projects p ON p.id = dp.project_id
    LEFT JOIN crm_contacts k ON k.id = dp.contact_id
   WHERE p.status <> 'archived'`;

/** Was zuletzt geschah, in einem Satz. Ohne Deutung. */
function letztesEreignis(z) {
  const t = (w) => (w ? new Date(w).getTime() : 0);
  const kandidaten = [
    { wann: z.letzte_antwort, text: 'Antwort eingegangen' },
    { wann: z.letzte_ansprache, text: 'von uns angeschrieben' },
  ].filter((x) => x.wann).sort((a, b) => t(b.wann) - t(a.wann));
  if (kandidaten.length) return kandidaten[0].text;
  return 'nur angelegt, sonst nichts';
}

/**
 * Was hängt: Vorgänge ohne Bewegung, über alle Mandate.
 *
 * Nicht gemeldet wird, was ohnehin ruht: abgesagte Interessenten und Vorgänge
 * auf Stufe null, die noch auf die Freigabe warten.
 */
async function wasHaengt(db, { tage = HAENGT_AB_TAGEN, projectId = null, grenze = 300 } = {}) {
  const wo = projectId ? ' AND dp.project_id = ?' : '';
  const zeilen = await db.all(`${BEWEGUNG_SQL}${wo} ORDER BY p.codename`, projectId ? [projectId] : [])
    .catch(() => []);

  const jetzt = Date.now();
  const alle = (zeilen || []).map((z) => ({
    party_id: z.party_id,
    project_id: z.project_id,
    codename: z.codename,
    contact_id: z.contact_id,
    user_id: z.user_id || null,
    name: `${z.first_name || ''} ${z.last_name || ''}`.trim() || z.email || '(ohne Namen)',
    email: z.email || null,
    stufe: Number(z.funnel_stage),
    status: z.party_status,
    rolle: z.party_role,
    ruht: z.party_status === 'dropped',
    tage_ohne_bewegung: tageSeit(z.letzte_bewegung, jetzt),
    letztes_ereignis: letztesEreignis(z),
    hat_geantwortet: !!z.letzte_antwort,
  }));

  const haengend = alle
    .filter((z) => !z.ruht && z.stufe > 0 && (z.tage_ohne_bewegung || 0) >= tage)
    .sort((a, b) => (b.tage_ohne_bewegung || 0) - (a.tage_ohne_bewegung || 0));

  // Je Mandat gebündelt, damit die Zahl neben dem Namen steht.
  const mandate = [];
  for (const z of haengend) {
    let m = mandate.find((x) => x.project_id === z.project_id);
    if (!m) { m = { project_id: z.project_id, codename: z.codename, personen: [] }; mandate.push(m); }
    if (m.personen.length < grenze) m.personen.push(z);
  }
  mandate.sort((a, b) => b.personen.length - a.personen.length);

  const beweglich = alle.filter((z) => !z.ruht && z.stufe > 0);
  return {
    mandate,
    gesamt: haengend.length,
    beobachtet: beweglich.length,
    anteil: beweglich.length ? Math.round((haengend.length / beweglich.length) * 100) : 0,
    nie_geantwortet: haengend.filter((z) => !z.hat_geantwortet).length,
    schwelle: tage,
  };
}

/**
 * Die Reaktionsquote einer Person, über alle Mandate.
 *
 * Gezählt wird je Ansprache, ob binnen sieben Tagen etwas von der Gegenseite kam.
 * Als Reaktion gilt eine eingegangene Nachricht, eine Unterschrift oder ein
 * Besuch im Datenraum. Nicht als Reaktion gilt, dass wir noch einmal geschrieben
 * haben.
 *
 * @returns {{quote: number|null, ansprachen: number, reaktionen: number, letzte: string|null}}
 */
async function quoteFuer(db, contactId) {
  const k = await db.get('SELECT id, user_id FROM crm_contacts WHERE id = ?', [contactId]).catch(() => null);
  if (!k) return { quote: null, ansprachen: 0, reaktionen: 0, letzte: null };

  const ansprachen = await db.all(
    `SELECT created_at FROM email_log
      WHERE contact_id = ? AND status = 'sent' AND mail_type IN ('campaign', 'process', 'invite', 'message')
      ORDER BY created_at DESC LIMIT ?`, [contactId, FENSTER]).catch(() => []);
  if (!ansprachen.length) return { quote: null, ansprachen: 0, reaktionen: 0, letzte: null };

  const rueck = await db.all(
    `SELECT COALESCE(sent_at, created_at) AS wann FROM crm_messages WHERE contact_id = ? AND direction = 'in'
      UNION ALL
     SELECT COALESCE(signed_at, online_consent_at) AS wann FROM nda_requests
      WHERE user_id = ? AND COALESCE(signed_at, online_consent_at) IS NOT NULL
      UNION ALL
     SELECT created_at AS wann FROM safe_access_log WHERE user_id = ?`,
    [contactId, k.user_id || 0, k.user_id || 0]).catch(() => []);
  const zeiten = (rueck || []).map((r) => new Date(r.wann).getTime()).filter((t) => !Number.isNaN(t));

  let reaktionen = 0;
  for (const a of ansprachen) {
    const von = new Date(a.created_at).getTime();
    const bis = von + REAKTION_TAGE * 86400000;
    if (zeiten.some((t) => t >= von && t <= bis)) reaktionen += 1;
  }

  return {
    quote: Math.round((reaktionen / ansprachen.length) * 100),
    ansprachen: ansprachen.length,
    reaktionen,
    letzte: zeiten.length ? new Date(Math.max(...zeiten)).toISOString() : null,
  };
}

module.exports = {
  HAENGT_AB_TAGEN, FENSTER, REAKTION_TAGE,
  wasHaengt, quoteFuer, tageSeit, letztesEreignis, BEWEGUNG_SQL,
};
