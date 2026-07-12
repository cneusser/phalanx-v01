/**
 * Sprint 20 — Import des ersten Schwungs echter Phalanx-Kontakte.
 *
 * Quelle: seed-data/ma_funnel_contacts.json (Auswertung des Exchange-Mailverkehrs,
 * 233 Zeilen über 5 Mandate). Angelegt werden:
 *   • crm_companies  (aus der Spalte „Firma", dubletten-bereinigt)
 *   • crm_contacts   (aus Name/E-Mail; Einwilligung bewusst 'unknown' → DSGVO:
 *                     Kontaktaufnahme über die Plattform erst nach Double-Opt-in)
 *   • crm_company_contacts (Zuordnung)
 *   • projects       für RENOVAPRESS / FARADAY / Defacto als ENTWURF (nicht im
 *                     Marktplatz sichtbar) — Betongold und Cudd existieren bereits
 *   • crm_deal_parties  mit Rolle, Funnel-Stufe, Status, Mailhistorie, nächstem Schritt
 *
 * Idempotent: läuft die Migration erneut, werden vorhandene Datensätze übersprungen.
 */
const fs = require('fs');
const path = require('path');

const LEGAL_FORMS = /\b(gmbh|ag|kg|ohg|gbr|ug|se|mbh|co|kgaa|ek|ltd|inc|llc|bv|nv|sa|sarl|spa|srl|plc|holding)\b/g;
const normalizeName = (n) => String(n || '')
  .toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[&+]/g, ' und ')
  .replace(/\./g, '')
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(LEGAL_FORMS, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Namen wie „Nick Herbig / Lukas Stukenborg u.a." → erster Name; Vor-/Nachname trennen
function splitName(raw) {
  const first = String(raw || '').split('/')[0].replace(/\su\.a\.?$/i, '').trim();
  const parts = first.split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: null, last_name: 'Unbekannt' };
  if (parts.length === 1) return { first_name: null, last_name: parts[0] };
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] };
}

// Mandate, die es auf der Plattform noch nicht gibt → als Entwurf anlegen
const MISSING_PROJECTS = {
  RENOVAPRESS: {
    industry: 'Industrie / Verarbeitung', region: 'Deutschland (bundesweit)', deal_type: 'Mehrheitsverkauf',
    short_description: 'Sell-Side-Mandat (Entwurf, aus dem Bestand übernommen). Details siehe interne Unterlagen.',
  },
  FARADAY: {
    industry: 'Elektro- / Energietechnik', region: 'Bayern', deal_type: 'Nachfolge',
    short_description: 'Sell-Side-Mandat: Elektro-/Energietechnik, ~11 Mitarbeitende, hoher Anteil wiederkehrender Umsätze, Ladeinfrastruktur. Altersnachfolge. (Entwurf)',
  },
  Defacto: {
    industry: 'IT / Software-Dienstleistung', region: 'Bayern', deal_type: 'Mehrheitsverkauf',
    short_description: 'Sell-Side-/Finanzierungsmandat: Spezialist für Service-Management- und CRM-Plattformen. (Entwurf)',
  },
};

exports.up = async function (knex) {
  const file = path.join(__dirname, '..', 'seed-data', 'ma_funnel_contacts.json');
  if (!fs.existsSync(file)) { console.warn('[import] Seed-Datei fehlt — übersprungen'); return; }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));

  const admin = await knex('users').where({ email: 'neusser@phalanx.de' }).first().catch(() => null);
  const adminId = admin ? admin.id : null;

  // 1) Fehlende Mandate als Entwurf anlegen
  const projectIds = {};
  for (const [codename, meta] of Object.entries(MISSING_PROJECTS)) {
    let p = await knex('projects').where({ codename }).first().catch(() => null);
    if (!p) {
      const [ins] = await knex('projects').insert({
        tenant_id: 1, codename,
        industry: meta.industry, region: meta.region, deal_type: meta.deal_type,
        revenue_band: '—', ebitda_band: '—',
        short_description: meta.short_description,
        highlights: JSON.stringify([]),
        status: 'draft', mandate_type: 'ma', created_by: adminId,
      }).returning('id');
      p = { id: typeof ins === 'object' ? ins.id : ins };
    }
    projectIds[codename] = p.id;
  }
  for (const codename of ['Betongold', 'Cudd']) {
    const p = await knex('projects').where({ codename }).first().catch(() => null);
    if (p) projectIds[codename] = p.id;
  }

  // 2) Unternehmen + Kontakte + Funnel-Einträge
  const companyCache = new Map();
  let companies = 0, contacts = 0, parties = 0, skipped = 0;

  for (const r of rows) {
    const projectId = projectIds[r.project];
    if (!projectId) { skipped++; continue; }

    // ── Unternehmen (dubletten-bereinigt) ──
    let companyId = null;
    if (r.company) {
      const norm = normalizeName(r.company);
      if (norm) {
        if (companyCache.has(norm)) companyId = companyCache.get(norm);
        else {
          let c = await knex('crm_companies').where({ name_normalized: norm }).first().catch(() => null);
          if (!c) {
            const [ins] = await knex('crm_companies').insert({
              tenant_id: 1, name: r.company, name_normalized: norm,
              company_type: r.role === 'advisor' ? 'Berater' : (r.role === 'seller' ? 'Zielunternehmen' : 'Stratege'),
              created_by: adminId,
            }).returning('id');
            c = { id: typeof ins === 'object' ? ins.id : ins };
            companies++;
          }
          companyId = c.id;
          companyCache.set(norm, companyId);
        }
      }
    }

    // ── Kontakt (eindeutig über E-Mail) ──
    let contact = await knex('crm_contacts').whereRaw('lower(email) = ?', [r.email]).first().catch(() => null);
    if (!contact) {
      const { first_name, last_name } = splitName(r.name);
      const [ins] = await knex('crm_contacts').insert({
        tenant_id: 1, first_name, last_name, email: r.email,
        notes: r.name && r.name.includes('/') ? `Weitere Ansprechpartner laut Mailverkehr: ${r.name}` : null,
        // DSGVO: Bestandskontakte aus dem Mailverkehr — Einwilligung für die
        // Plattform-Ansprache liegt NICHT vor. Erst nach Double-Opt-in kontaktieren.
        consent_status: 'unknown',
        contact_status: 'active',
        created_by: adminId,
      }).returning('id');
      contact = { id: typeof ins === 'object' ? ins.id : ins };
      contacts++;
    }

    // ── Zuordnung Kontakt ↔ Unternehmen ──
    if (companyId) {
      const link = await knex('crm_company_contacts')
        .where({ company_id: companyId, contact_id: contact.id }).first().catch(() => null);
      if (!link) {
        await knex('crm_company_contacts').insert({
          tenant_id: 1, company_id: companyId, contact_id: contact.id,
        }).catch(() => {});
      }
    }

    // ── Funnel-Eintrag am Mandat ──
    const existing = await knex('crm_deal_parties')
      .where({ project_id: projectId, contact_id: contact.id }).first().catch(() => null);
    if (!existing) {
      await knex('crm_deal_parties').insert({
        tenant_id: 1, project_id: projectId, company_id: companyId, contact_id: contact.id,
        party_role: r.role || 'buyer',
        funnel_stage: Number.isInteger(r.stage) ? r.stage : 0,
        party_status: r.status || 'open',
        replied: r.replied ? 1 : 0,
        first_contact: r.first_contact || null,
        last_contact: r.last_contact || null,
        mails_sent: r.mails || 0,
        next_step: r.next_step || null,
        // Verweildauer wird ab dem letzten bekannten Kontakt gerechnet
        stage_changed_at: r.last_contact ? new Date(r.last_contact) : knex.fn.now(),
        created_by: adminId,
      }).catch(() => {});
      parties++;
    }
  }

  console.log(`📇 Phalanx-Funnel-Import: ${companies} Unternehmen, ${contacts} Kontakte, ${parties} Funnel-Einträge (${skipped} ohne Mandat übersprungen)`);
};

exports.down = async function (knex) {
  // Nur die importierten Funnel-Einträge lösen; Stammdaten bleiben erhalten.
  await knex('crm_deal_parties').del().catch(() => {});
};
