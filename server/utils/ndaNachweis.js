// ─────────────────────────────────────────────────────────────────────────────
// Liegt für diese Person und dieses Mandat ein Nachweis vor? (v0.506)
//
// Anlass war eine Mail von Alexander Schmidler, Interessent bei FARADAY:
// „Wenn ich dem Link folge erscheint kurz NDA unterzeichnen aber es schaltet
// kurz darauf um auf Zugang freigeschaltet weil ich bereits unterzeichnet
// hatte. Fehlt jetzt noch etwas?"
//
// Er hatte nicht unterschrieben. Seine Ansicht sagte es trotzdem, weil die
// Statusabfrage den Unterschriftsstand aus der Funnel-Stufe ableitete: Wer im
// Datenraum steht, bekam „Zugang freigeschaltet" zu sehen, und daraus schloss
// er das Naheliegende. Elf Stunden zuvor hatte Christian ihm geschrieben, die
// Vereinbarung fehle noch. Beide hatten recht, und beide lasen dieselbe Anlage.
//
// Die Ursache ist, dass es drei verschiedene Dinge gab, die alle „NDA" hießen:
//
//   1. nda_requests.status          der Vorgang, von angefordert bis freigegeben
//   2. interests.stage              was jemand sehen darf
//   3. crm_deal_parties.nda_status  ein Haken, den die Verwaltung setzt
//
// Nur das Erste kann eine Unterschrift belegen, und seit v0.504 zusätzlich
// eine hinterlegte Datei. Die Stufe sagt nur, was offen ist, und der Haken ist
// eine Behauptung ohne Beleg. Diese Datei trennt das ein für alle Mal:
//
//   Nachweis  = online unterzeichnet ODER unterschriebenes Dokument hinterlegt
//   Zugang    = was interests.stage hergibt
//
// Die beiden dürfen auseinanderfallen, aber nie miteinander verwechselt werden.
//
// Die eine Ausnahme ist die bestehende: Bei Finanzierungsmandaten zeichnen
// institutionelle Investoren regelmäßig kein NDA. Dort ersetzt die
// ausdrückliche Freigabe die Unterschrift, und das steht hier einmal.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Der Nachweis für eine Person an einem Mandat.
 *
 * @param db         Datenbankzugriff mit get()
 * @param userId     Konto des Interessenten (darf fehlen)
 * @param projectId  Mandat
 * @param contactId  CRM-Kontakt (darf fehlen; nur für die Datei nötig)
 * @returns {Promise<{belegt: boolean, art: 'online'|'datei'|null, zeitpunkt: string|null, hinweis: string}>}
 */
async function nachweisFuer(db, { userId, projectId, contactId } = {}) {
  const leer = { belegt: false, art: null, zeitpunkt: null, hinweis: 'Es liegt keine unterschriebene Vereinbarung vor.' };
  if (!projectId) return leer;

  // 1. Online unterzeichnet. Maßgeblich ist der Zeitpunkt der Zustimmung oder
  //    der Unterschrift, nicht der Status: `approved` setzt auch, wer von Hand
  //    freigibt, und das ist keine Unterschrift.
  if (userId) {
    const nr = await db.get(
      `SELECT signed_at, online_consent_at FROM nda_requests
        WHERE project_id = ? AND user_id = ? AND (signed_at IS NOT NULL OR online_consent_at IS NOT NULL)
        ORDER BY id DESC LIMIT 1`, [projectId, userId]).catch(() => null);
    if (nr) {
      return { belegt: true, art: 'online', zeitpunkt: nr.signed_at || nr.online_consent_at,
        hinweis: 'Online unterzeichnet.' };
    }
  }

  // 2. Unterschrieben zurückgeschickt und hinterlegt (v0.504).
  if (userId || contactId) {
    const bedingung = [];
    const werte = [projectId];
    if (userId) { bedingung.push('user_id = ?'); werte.push(userId); }
    if (contactId) { bedingung.push('contact_id = ?'); werte.push(contactId); }
    const dok = await db.get(
      `SELECT unterzeichnet_am, herkunft FROM nda_dokumente
        WHERE project_id = ? AND ersetzt_am IS NULL AND (${bedingung.join(' OR ')})
        ORDER BY id DESC LIMIT 1`, werte).catch(() => null);
    if (dok) {
      return { belegt: true, art: 'datei', zeitpunkt: dok.unterzeichnet_am,
        hinweis: 'Unterschrieben hinterlegt.' };
    }
  }

  return leer;
}

/**
 * Darf der Datenraum für diese Person geöffnet werden?
 *
 * Gibt nie von sich aus frei und entzieht nie etwas. Es wird nur beantwortet,
 * ob die Voraussetzung vorliegt, und wenn nicht, warum.
 */
async function darfGeoeffnetWerden(db, { userId, projectId, contactId } = {}) {
  const projekt = await db.get('SELECT id, codename, mandate_type FROM projects WHERE id = ?', [projectId]).catch(() => null);
  if (!projekt) return { erlaubt: false, grund: 'Das Mandat gibt es nicht.', nachweis: null };

  if (projekt.mandate_type === 'fundraising') {
    return {
      erlaubt: true, ausnahme: 'finanzierung', nachweis: null,
      grund: 'Finanzierungsmandat: Hier ersetzt die ausdrückliche Freigabe die Unterschrift.',
    };
  }

  const nachweis = await nachweisFuer(db, { userId, projectId, contactId });
  if (nachweis.belegt) return { erlaubt: true, nachweis, grund: nachweis.hinweis };

  return {
    erlaubt: false,
    nachweis,
    grund: 'Für diese Person liegt keine unterschriebene Vertraulichkeitsvereinbarung vor, '
      + 'weder online unterzeichnet noch als hinterlegtes Dokument. Entweder zum Unterzeichnen auffordern, '
      + 'oder die zurückgeschickte Vereinbarung am Kontakt hochlegen.',
  };
}

/**
 * Wer hat an diesem Mandat Zugang, ohne dass ein Nachweis vorliegt?
 *
 * Der Bericht zum Fall Schmidler. Gemeldet wird, nicht geändert: Welche
 * Freigabe bleibt und welche nicht, entscheidet ein Mensch je Fall.
 */
async function zugangOhneNachweis(db, projectId = null) {
  const wo = projectId ? 'AND i.project_id = ?' : '';
  const werte = projectId ? [projectId] : [];
  const zeilen = await db.all(
    `SELECT i.project_id, i.buyer_id, i.stage, i.updated_at,
            p.codename, p.mandate_type,
            u.email, u.first_name, u.last_name,
            (SELECT max(COALESCE(nr.signed_at, nr.online_consent_at)) FROM nda_requests nr
              WHERE nr.project_id = i.project_id AND nr.user_id = i.buyer_id) AS online_am,
            (SELECT count(*) FROM nda_dokumente nd
              WHERE nd.project_id = i.project_id AND nd.user_id = i.buyer_id AND nd.ersetzt_am IS NULL) AS dateien,
            (SELECT max(nr.status) FROM nda_requests nr
              WHERE nr.project_id = i.project_id AND nr.user_id = i.buyer_id) AS vorgang,
            -- v0.513: Damit aus dem Bericht heraus gehandelt werden kann, braucht
            -- die Zeile zwei Kennungen mehr: den Vorgang, falls es einen gibt, und
            -- den CRM-Kontakt, an dem die Urkunde hinterlegt wird.
            (SELECT max(nr.id) FROM nda_requests nr
              WHERE nr.project_id = i.project_id AND nr.user_id = i.buyer_id) AS nda_id,
            (SELECT max(k.id) FROM crm_contacts k
              WHERE k.anonymized_at IS NULL
                AND (k.user_id = i.buyer_id OR lower(k.email) = lower(u.email))) AS contact_id
       FROM interests i
       JOIN projects p ON p.id = i.project_id
       JOIN users u ON u.id = i.buyer_id
      WHERE i.stage IN ('dataroom_granted', 'loi') ${wo}
      ORDER BY p.codename, u.last_name`, werte).catch(() => []);

  return (zeilen || [])
    .filter((z) => ohneNachweis(z))
    .map((z) => ({
      project_id: z.project_id,
      codename: z.codename,
      mandate_type: z.mandate_type,
      user_id: z.buyer_id,
      email: z.email,
      name: `${z.first_name || ''} ${z.last_name || ''}`.trim(),
      stage: z.stage,
      seit: z.updated_at || null,
      vorgang: z.vorgang || null,
      nda_id: z.nda_id || null,
      contact_id: z.contact_id || null,
      hinweis: z.vorgang
        ? `Ein Vorgang besteht (Stand „${z.vorgang}"), aber ohne Unterschrift und ohne hinterlegtes Dokument.`
        : 'Es gibt zu dieser Person gar keinen NDA-Vorgang an diesem Mandat.',
    }));
}

/** Eine Zeile ohne Nachweis: keine Unterschrift, keine Datei, kein Finanzierungsmandat. */
function ohneNachweis(z) {
  if (z.mandate_type === 'fundraising') return false;
  if (z.online_am) return false;
  if (Number(z.dateien || 0) > 0) return false;
  return true;
}

module.exports = { nachweisFuer, darfGeoeffnetWerden, zugangOhneNachweis };
