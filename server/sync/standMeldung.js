// ─────────────────────────────────────────────────────────────────────────────
// Was CapitalMatch zu einem Kontakt nach Phalanx OS meldet (v0.509)
//
// Anlass, wörtlich: „damit quasi ich jederzeit die Historie komplett auch in
// Phalanx OS sehe und auch zu welchen Projekten die jeweilige Person sich
// interessiert hat. Und wichtig wäre mir noch auch zu erkennen, ob das zum
// Beispiel ein Nachfolgekontakt ist."
//
// Die Aufteilung zwischen beiden Häusern bleibt, wie sie ist: Mandatsnummer,
// Phase und Kategorie gehören Phalanx OS, Datenraum, Vereinbarung und
// Interessenten gehören CapitalMatch. Gemeldet wird deshalb keine Wahrheit
// über das Mandat, sondern der Stand aus Sicht dieses Satelliten.
//
// Drei Festlegungen:
//
//   1. Nichts wird geraten. Was CapitalMatch nicht weiss, bleibt leer. Eine
//      Rolle „vermutlich Nachfolger" wäre in einer Adressdatenbank, die Jahre
//      hält, der Anfang eines Irrtums.
//   2. Die Urkunde bleibt hier. Gemeldet wird, dass sie vorliegt, mit Mandat,
//      Datum, Herkunft, Prüfsumme und einem Link dorthin. Dieselbe Datei an
//      zwei Orten ist eine Datei, die auseinanderlaufen kann.
//   3. Die Notiz ist kurz. Phalanx OS nimmt 500 Zeichen, und was länger wäre,
//      liest ohnehin niemand im Vorbeigehen.
// ─────────────────────────────────────────────────────────────────────────────

// Die Stufen des Funnels, in Worten. Dieselbe Reihenfolge wie in der
// Oberfläche (client/src/components/ContactDrawer.jsx).
const STUFEN = [
  'Longlist zur Freigabe', 'Shortlist freigegeben', 'Ansprache', 'NDA',
  'Datenraum-Zugang', 'LOI', 'Verhandlung', 'Closing', 'Abschluss',
];

// Der Käufertyp aus CapitalMatch, übersetzt in eine Rolle, die in Phalanx OS
// jemand lesen kann, der die Plattform nicht kennt. Die Frage „ist das ein
// Nachfolgekontakt?" soll ohne Nachschlagen beantwortet sein.
const ROLLEN = {
  successor: 'Nachfolger',
  strategic: 'Strategischer Käufer',
  financial: 'Finanzinvestor',
  business_angel: 'Business Angel',
  venture_capital: 'Wagniskapital',
  family_office: 'Family Office',
  private: 'Privater Käufer',
  advisor_mandate: 'Beratungsmandat',
};

const kurz = (s, n) => {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
};

const datum = (d) => {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return String(d).slice(0, 10);
  return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`;
};

const HERKUNFT = { mail: 'per E-Mail', papier: 'auf Papier', anbieter: 'über einen Signaturanbieter', sonstiges: 'auf anderem Weg' };

/**
 * Die Meldung bauen.
 *
 * Reine Funktion, damit sie ohne Datenbank und ohne Netz prüfbar ist.
 *
 * @param kontakt  { buyer_type }
 * @param mandate  [{ codename, project_id, funnel_stage, nda_online_am, nda_datei_am,
 *                    nda_herkunft, nda_pruefsumme, datenraum }]
 * @param basis    Adresse der Plattform, für die Links
 * @returns {{rolle: string|null, stufe: string|null, projekte: Array, notiz: string|null}}
 */
function baueStand({ kontakt = {}, mandate = [], basis = 'https://www.capitalmatch.de' } = {}) {
  const rolle = ROLLEN[kontakt.buyer_type] || null;

  const projekte = (mandate || []).map((m) => {
    const stufeNr = Number(m.funnel_stage);
    const unterschrieben = m.nda_online_am || m.nda_datei_am || null;
    const teile = [];
    if (Number.isFinite(stufeNr) && STUFEN[stufeNr]) teile.push(STUFEN[stufeNr]);
    if (unterschrieben) {
      teile.push(`NDA ${datum(unterschrieben)}${m.nda_datei_am && !m.nda_online_am
        ? ` (${HERKUNFT[m.nda_herkunft] || HERKUNFT.sonstiges})` : ' (online)'}`);
    }
    if (m.datenraum) teile.push('Datenraum offen');
    return {
      kennung: `cm-${m.project_id}`,
      name: m.codename,
      stand: kurz(teile.join(', ') || 'vorgemerkt', 120),
    };
  });

  // Die höchste erreichte Stufe über alle Mandate. Eine Person, die an einem
  // Mandat im Datenraum sitzt und an einem anderen auf der Longlist steht, ist
  // für Phalanx OS die erste von beiden.
  const hoechste = projekte.length
    ? Math.max(...mandate.map((m) => (Number.isFinite(Number(m.funnel_stage)) ? Number(m.funnel_stage) : -1)))
    : -1;
  const stufe = hoechste >= 0 && STUFEN[hoechste] ? STUFEN[hoechste] : null;

  // Die Notiz: nur Urkunden, und nur solche, die wirklich vorliegen.
  const mitNda = (mandate || []).filter((m) => m.nda_online_am || m.nda_datei_am);
  let notiz = null;
  if (mitNda.length) {
    const zeilen = mitNda.map((m) => {
      const am = datum(m.nda_online_am || m.nda_datei_am);
      const woher = m.nda_online_am ? 'online unterzeichnet' : (HERKUNFT[m.nda_herkunft] || HERKUNFT.sonstiges);
      const pruef = m.nda_pruefsumme ? `, Prüfsumme ${String(m.nda_pruefsumme).slice(0, 12)}` : '';
      return `${m.codename}: NDA ${am}, ${woher}${pruef}`;
    });
    notiz = kurz(`${zeilen.join('. ')}. Urkunde in CapitalMatch: ${basis}/verwaltung`, 500);
  }

  return { rolle, stufe, projekte, notiz };
}

/**
 * Die Meldung für einen Kontakt aus der Datenbank zusammentragen.
 *
 * @param db         Datenbankzugriff mit get() und all()
 * @param contactId  CRM-Kontakt
 * @returns {Promise<{pool_contact_id: string|null, stand: object}|null>}
 */
async function standFuer(db, contactId) {
  const kontakt = await db.get('SELECT * FROM crm_contacts WHERE id = ?', [contactId]).catch(() => null);
  if (!kontakt) return null;

  const userId = kontakt.user_id || null;
  const zeilen = await db.all(
    `SELECT dp.project_id, dp.funnel_stage, p.codename,
            (SELECT max(COALESCE(nr.signed_at, nr.online_consent_at)) FROM nda_requests nr
              WHERE nr.project_id = dp.project_id AND nr.user_id = ?) AS nda_online_am,
            (SELECT nd.unterzeichnet_am FROM nda_dokumente nd
              WHERE nd.project_id = dp.project_id AND nd.contact_id = dp.contact_id AND nd.ersetzt_am IS NULL
              ORDER BY nd.id DESC LIMIT 1) AS nda_datei_am,
            (SELECT nd.herkunft FROM nda_dokumente nd
              WHERE nd.project_id = dp.project_id AND nd.contact_id = dp.contact_id AND nd.ersetzt_am IS NULL
              ORDER BY nd.id DESC LIMIT 1) AS nda_herkunft,
            (SELECT nd.pruefsumme FROM nda_dokumente nd
              WHERE nd.project_id = dp.project_id AND nd.contact_id = dp.contact_id AND nd.ersetzt_am IS NULL
              ORDER BY nd.id DESC LIMIT 1) AS nda_pruefsumme,
            (SELECT CASE WHEN i.stage IN ('dataroom_granted', 'loi') THEN 1 ELSE 0 END FROM interests i
              WHERE i.project_id = dp.project_id AND i.buyer_id = ? LIMIT 1) AS datenraum
       FROM crm_deal_parties dp JOIN projects p ON p.id = dp.project_id
      WHERE dp.contact_id = ?
      ORDER BY dp.funnel_stage DESC`,
    [userId || 0, userId || 0, contactId]).catch(() => []);

  const basis = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  return {
    pool_contact_id: kontakt.pool_contact_id || null,
    stand: baueStand({ kontakt, mandate: zeilen || [], basis }),
  };
}

module.exports = { baueStand, standFuer, STUFEN, ROLLEN };
