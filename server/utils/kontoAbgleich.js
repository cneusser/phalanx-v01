// ─────────────────────────────────────────────────────────────────────────────
// Konten und CRM-Kontakte abgleichen (v0.403).
//
// Der Anlass: Ein Käufer hatte den NDA unterschrieben, stand in der Liste auf
// „Freigegeben" und kam trotzdem nicht in den Datenraum. Grund war eine fehlende
// Verknüpfung zwischen dem CRM-Kontakt und seinem Plattform-Konto. Rechte hängen
// am Konto, nicht am CRM-Eintrag.
//
// Die Verknüpfung entsteht automatisch über die E-Mail-Adresse. Sie bleibt genau
// dann aus, wenn sich jemand mit einer anderen Adresse anmeldet als der, die im
// CRM steht, oder wenn am Kontakt gar keine Adresse hinterlegt ist. Beides
// passiert im Alltag regelmäßig: Der Marktplatz liefert info@firma.de, angemeldet
// wird sich mit vorname.nachname@firma.de.
//
// Diese Datei findet solche Fälle im gesamten Bestand und schlägt das passende
// Konto vor. Die reinen Vergleichsfunktionen stehen oben, ohne Datenbank, damit
// sie einzeln prüfbar sind.
// ─────────────────────────────────────────────────────────────────────────────

const normal = (s) => String(s || '').trim().toLowerCase();
const domain = (email) => normal(email).split('@')[1] || '';
const lokal = (email) => normal(email).split('@')[0] || '';

// Namen vergleichbar machen: Umlaute auflösen, Satzzeichen weg, sortierte Wörter.
function namensschluessel(vorname, nachname) {
  const roh = `${vorname || ''} ${nachname || ''}`.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, ' ');
  return roh.split(/\s+/).filter((w) => w.length > 1).sort().join(' ');
}

// Firmenbezeichnungen, die für den Vergleich nichts beitragen.
const RECHTSFORMEN = /\b(gmbh|ag|kg|ohg|ug|se|mbh|co|holding|gruppe|group|ltd|limited|bv|sarl|inc)\b/g;
function firmenschluessel(name) {
  return String(name || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, ' ').replace(RECHTSFORMEN, ' ')
    .split(/\s+/).filter((w) => w.length > 2).sort().join(' ');
}

/**
 * Wie sicher gehören Kontakt und Konto zusammen? 0 bis 100, mit Begründung.
 * Bewusst konservativ: Nur was oberhalb von 60 liegt, wird überhaupt vorgeschlagen,
 * und vorgeschlagen heißt nicht verknüpft. Eine falsche Verknüpfung würde einem
 * Fremden den Datenraum öffnen, deshalb entscheidet am Ende ein Mensch.
 */
function bewerte(kontakt, konto) {
  const gruende = [];
  let punkte = 0;

  const kMail = normal(kontakt.email);
  const uMail = normal(konto.email);
  if (kMail && uMail && kMail === uMail) return { punkte: 100, gruende: ['gleiche E-Mail-Adresse'] };

  const nameGleich = namensschluessel(kontakt.first_name, kontakt.last_name) &&
    namensschluessel(kontakt.first_name, kontakt.last_name) === namensschluessel(konto.first_name, konto.last_name);
  if (nameGleich) { punkte += 55; gruende.push('gleicher Name'); }

  if (kMail && uMail && domain(kMail) === domain(uMail) && domain(kMail)) {
    // Freemail-Domains sagen nichts aus: Millionen Menschen teilen sie sich.
    const frei = /^(gmail|googlemail|web|gmx|yahoo|hotmail|outlook|t-online|icloud|aol|freenet|mail)\./.test(domain(kMail) + '.');
    if (!frei) { punkte += 35; gruende.push(`gleiche Firmendomain (${domain(kMail)})`); }
  }

  const firma = firmenschluessel(kontakt.company);
  if (firma && firma === firmenschluessel(konto.company)) { punkte += 25; gruende.push('gleiche Firma'); }

  // „info@kernwerk-gruppe.de" gegen den Firmennamen: Der lokale Teil ist oft
  // unpersoenlich, die Domain traegt dann die Information.
  if (firma && domain(uMail) && firmenschluessel(domain(uMail).replace(/\.[a-z.]+$/, '')) === firma) {
    punkte += 20; gruende.push('Firmenname steckt in der Konto-Domain');
  }

  // Nachname im lokalen Teil der Konto-Adresse, etwa „helm@…" oder „c.helm@…".
  const nach = normal(kontakt.last_name).replace(/[^a-z]/g, '');
  if (nach.length > 3 && lokal(uMail).includes(nach)) { punkte += 30; gruende.push('Nachname steckt in der Konto-Adresse'); }

  // Häufiger Fall aus dem Marktplatz-Import: Der Kontakt trägt den Firmennamen
  // statt eines Personennamens („Kernwerk Gruppe"). Dann ist kein Namensvergleich
  // möglich, und die Firma ist alles, was wir haben. Gehört das Konto erkennbar
  // zu derselben Firma, ist das ein tragfähiger Vorschlag. Entschieden wird er
  // trotzdem von Hand.
  const kontaktIstFirma = firma && firma === firmenschluessel(`${kontakt.first_name || ''} ${kontakt.last_name || ''}`);
  if (kontaktIstFirma && gruende.some((g) => /Firma|Domain/.test(g))) {
    punkte += 20;
    gruende.push('Kontakt trägt den Firmennamen, das Konto gehört zu dieser Firma');
  }

  return { punkte: Math.min(100, punkte), gruende };
}

/**
 * Den gesamten Bestand durchgehen.
 * @param {object} q  DB-Handle mit all()
 * @returns {Promise<{faelle: Array, geprueft: number}>}
 */
async function pruefe(q) {
  // Kontakte, die in einem Mandat stehen und noch kein Konto haben. Nur die sind
  // interessant: Wer in keinem Funnel steht, braucht auch keinen Datenraum.
  const kontakte = await q.all(`
    SELECT k.id, k.first_name, k.last_name, k.email, k.company, k.user_id,
           dp.project_id, dp.funnel_stage, dp.nda_status, p.codename
      FROM crm_contacts k
      JOIN crm_deal_parties dp ON dp.contact_id = k.id
      JOIN projects p ON p.id = dp.project_id
     WHERE k.user_id IS NULL AND k.is_deleted IS NOT TRUE
     ORDER BY dp.funnel_stage DESC, k.id DESC
     LIMIT 500`).catch(() => []);

  if (!kontakte.length) return { faelle: [], geprueft: 0 };

  const konten = await q.all(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.company, u.role, u.created_at,
           (SELECT k2.id FROM crm_contacts k2 WHERE k2.user_id = u.id LIMIT 1) AS schon_verknuepft
      FROM users u
     WHERE u.is_active = 1 AND u.role = 'buyer'
     LIMIT 5000`).catch(() => []);

  // Welche Konten haben in welchem Mandat einen NDA unterschrieben? Das ist das
  // staerkste Signal ueberhaupt: Wer fuer FARADAY unterschrieben hat, ist der
  // Interessent, der im FARADAY-Funnel steht.
  const ndas = await q.all(`
    SELECT nr.user_id, nr.project_id FROM nda_requests nr
     WHERE nr.signed_at IS NOT NULL OR nr.status IN ('signed', 'approved')`).catch(() => []);
  const ndaJeProjekt = new Map();
  for (const n of ndas) {
    const s = ndaJeProjekt.get(Number(n.project_id)) || new Set();
    s.add(Number(n.user_id));
    ndaJeProjekt.set(Number(n.project_id), s);
  }

  const faelle = [];
  for (const k of kontakte) {
    const kandidaten = [];
    for (const u of konten) {
      if (u.schon_verknuepft) continue;
      const { punkte, gruende } = bewerte(k, u);
      if (punkte < 60) continue;
      let p = punkte;
      const mitNda = (ndaJeProjekt.get(Number(k.project_id)) || new Set()).has(Number(u.id));
      if (mitNda) { p = Math.min(100, p + 25); gruende.push(`hat für ${k.codename} den NDA unterschrieben`); }
      kandidaten.push({ id: u.id, email: u.email, name: [u.first_name, u.last_name].filter(Boolean).join(' '), company: u.company, punkte: p, gruende });
    }
    if (!kandidaten.length) continue;
    kandidaten.sort((a, b) => b.punkte - a.punkte);
    faelle.push({
      kontakt_id: k.id,
      name: [k.first_name, k.last_name].filter(Boolean).join(' ') || '(ohne Namen)',
      email: k.email || null,
      company: k.company || null,
      mandat: k.codename,
      project_id: k.project_id,
      funnel_stage: k.funnel_stage,
      nda_status: k.nda_status,
      kandidaten: kandidaten.slice(0, 3),
    });
  }
  // Die dringendsten zuerst: je weiter im Funnel, desto mehr stört die Lücke.
  faelle.sort((a, b) => (b.funnel_stage - a.funnel_stage) || (b.kandidaten[0].punkte - a.kandidaten[0].punkte));
  return { faelle, geprueft: kontakte.length };
}

module.exports = { pruefe, bewerte, namensschluessel, firmenschluessel };
