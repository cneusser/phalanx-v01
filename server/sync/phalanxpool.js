// ─────────────────────────────────────────────────────────────────────────────
// Phalanx-OS-Datenpool-Anbindung (Lesen: Sync, Schreiben: Rückmeldung).
//
// Trennung wie beim LinkedIn-Import: die reine Zuordnungs- und Abbildungslogik
// (testbar, ohne Datenbank und ohne Netz) steht hier als Funktionen; die DB- und
// HTTP-Anbindung wird als „deps" (client, store) hineingereicht. Der Produktions-
// pfad baut client und store aus ENV und Datenbank, die Tests aus Attrappen.
//
// Wichtige Regeln (UWG § 7, Vorgabe des Auftrags):
//   • Adressen ohne Werbeeinwilligung wandern in pool_email, NIE in email. Da alle
//     Massenversände `email IS NOT NULL` verlangen, sind sie damit automatisch aus
//     Newsletter und Kampagnen ausgeschlossen. Einzelkorrespondenz bleibt möglich.
//   • consent_status neu angelegter Kontakte bleibt 'unknown'.
//   • Der Sync legt KEINE Funnel-Einträge an Mandaten an (der store bietet dafür
//     bewusst keine Methode).
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../db/database');
const li = require('../utils/linkedinImport');

// ── ENV / Konfiguration ──────────────────────────────────────────────────────
const DEFAULT_TAGS = ['LI:Investor/Kapital', 'LI:Unternehmer/GF', 'LI:StB/WP/RA/Insolvenz'];

function config() {
  return {
    baseUrl: (process.env.PHALANX_OS_BASE_URL || '').replace(/\/+$/, ''),
    clientId: process.env.PHALANX_OS_CLIENT_ID || '',
    clientSecret: process.env.PHALANX_OS_CLIENT_SECRET || '',
    tags: (process.env.PHALANX_SYNC_TAGS
      ? String(process.env.PHALANX_SYNC_TAGS).split(',').map((s) => s.trim()).filter(Boolean)
      : DEFAULT_TAGS),
    intervalMin: process.env.PHALANX_SYNC_INTERVALL_MIN != null
      ? Number(process.env.PHALANX_SYNC_INTERVALL_MIN) : 30,
  };
}
function isConfigured() {
  const c = config();
  return !!(c.baseUrl && c.clientId && c.clientSecret);
}

// ── Segment-Heuristik → plattform-gültiger buyer_type ────────────────────────
// Hinweis: Der Auftrag nannte 'investor_generisch' und 'bank'. Die Plattform
// kennt diese Werte nicht (gültig: strategic, financial, business_angel,
// venture_capital, family_office, successor, private, advisor_mandate). Daher
// generischer Investor → leer (wie investor_generisch → null beim Listen-Import),
// Bank/Finanzierer → financial. Das Rohsegment bleibt als Tag erhalten.
function segmentBuyerType(segmentTag) {
  const t = String(segmentTag || '');
  if (/Investor\/Kapital/i.test(t)) return null;
  if (/Bank\/Finanzierer/i.test(t)) return 'financial';
  if (/StB\/WP\/RA/i.test(t)) return 'advisor_mandate';
  return null; // Unternehmer/GF und Sonstige: leer
}
function segmentShort(segmentTag) {
  const t = String(segmentTag || '');
  if (/Investor\/Kapital/i.test(t)) return 'investor';
  if (/Bank\/Finanzierer/i.test(t)) return 'bank';
  if (/StB\/WP\/RA/i.test(t)) return 'berater';
  if (/Unternehmer\/GF/i.test(t)) return 'unternehmer';
  return '';
}
// Prio-Buchstabe aus den Pool-Tags (LI:Prio-A .. LI:Prio-C) lesen.
function prioFromTags(tags) {
  for (const raw of (tags || [])) {
    const m = String(raw).match(/Prio-([ABC])/i);
    if (m) return m[1].toUpperCase();
  }
  return '';
}

// ── E-Mail-/Feld-Extraktion aus einem Pool-Kontakt ───────────────────────────
function asEmail(x) {
  if (!x) return null;
  if (typeof x === 'string') return x.trim() || null;
  return String(x.email || x.address || x.value || '').trim() || null;
}
function pickEmails(pc) {
  const consented = (pc.emails || []).map(asEmail).filter(Boolean);
  const nonConsented = (pc.emails_ohne_werbeeinwilligung || []).map(asEmail).filter(Boolean);
  return { consented, nonConsented };
}
function firstPhone(pc) {
  const p = (pc.phones || [])[0];
  if (!p) return null;
  if (typeof p === 'string') return p.trim() || null;
  return String(p.number || p.value || '').trim() || null;
}
function firstPosition(pc) {
  const pos = (pc.positions || [])[0] || {};
  return { title: pos.title || null, company: pos.company || null, companyId: pos.company_id || null };
}
function linkedinUrl(pc) {
  const f = pc.fields || {};
  return li.normalizeLinkedin(f['LinkedIn-Profil'] || f['LinkedIn'] || '');
}

// ── Neuanlage-Felder aus einem Pool-Kontakt ──────────────────────────────────
function buildCreateFields(pc, segmentTag) {
  const { consented, nonConsented } = pickEmails(pc);
  const pos = firstPosition(pc);
  const tags = li.buildTags({
    prio: prioFromTags(pc.tags),
    buyerTypeRaw: segmentShort(segmentTag),
    existing: [],
  });
  return {
    salutation: pc.salutation || null,
    title: pc.title || null,
    first_name: pc.first_name || null,
    last_name: pc.last_name || '(unbekannt)',
    email: consented[0] || null,                 // NIE eine Nicht-Einwilligungs-Adresse
    pool_email: consented[0] ? null : (nonConsented[0] || null),
    phone: firstPhone(pc),
    linkedin_url: linkedinUrl(pc),
    location: null,
    responsibility: pos.title || null,
    relationship: 'LinkedIn-Kontakt',
    source: 'phalanx-pool',
    buyer_type: segmentBuyerType(segmentTag),
    consent_status: 'unknown',
    contact_status: 'active',
    tags_json: JSON.stringify(tags),
    pool_contact_id: String(pc.id),
    company_name: pos.company || null,
    notes: pos.company ? `Phalanx-Netzwerk: ${pos.company}${pos.title ? ' · ' + pos.title : ''}` : 'Phalanx-Netzwerk',
  };
}

// ── Anreicherungs-Patch für einen bestehenden Kontakt ────────────────────────
// Grundsatz: nichts überschreiben, was manuell gepflegt ist. Nur Leerstellen
// füllen, Tags ergänzen, pool_contact_id/pool_email setzen. consent bleibt.
function buildEnrichPatch(pc, existing, segmentTag) {
  const patch = {};
  const { consented, nonConsented } = pickEmails(pc);
  const pos = firstPosition(pc);
  const url = linkedinUrl(pc);

  if (url && !existing.linkedin_url) patch.linkedin_url = url;
  if (pos.title && !existing.responsibility) patch.responsibility = pos.title;
  if (!existing.buyer_type) { const bt = segmentBuyerType(segmentTag); if (bt) patch.buyer_type = bt; }
  if (!existing.pool_contact_id) patch.pool_contact_id = String(pc.id);
  // Nicht-Einwilligungs-Adresse nur ergänzen, wenn weder email noch pool_email da.
  if (!existing.email && !existing.pool_email && !consented[0] && nonConsented[0]) patch.pool_email = nonConsented[0];

  // Tags zusammenführen (bestehende behalten, Herkunfts- und Prio-Tags ergänzen).
  let existingTags = [];
  try { existingTags = JSON.parse(existing.tags_json || '[]'); } catch { existingTags = []; }
  const mergedTags = li.buildTags({ prio: prioFromTags(pc.tags), buyerTypeRaw: segmentShort(segmentTag), existing: existingTags });
  patch.tags_json = JSON.stringify(mergedTags);
  return patch;
}

function reviewEntry(pc) {
  const { consented, nonConsented } = pickEmails(pc);
  return {
    pool_contact_id: String(pc.id),
    display_name: `${pc.first_name || ''} ${pc.last_name || ''}`.trim(),
    email: consented[0] || nonConsented[0] || null,
    linkedin_url: linkedinUrl(pc),
    reason: 'ambiguous_name',
  };
}

// ── Kern: einen Pool-Kontakt zuordnen (Dubletten-Reihenfolge) ────────────────
// (0) pool_contact_id (Idempotenz eigener Herkunft), dann wie der LinkedIn-Import:
// (1) E-Mail, (2) normalisierte LinkedIn-URL, (3) Namensschlüssel (nur bei genau
// einem Treffer). Kein Treffer → Neuanlage. Mehrdeutig → Warteliste.
async function reconcileOne(pc, segmentTag, store, stats) {
  let contact = await store.findByPoolId(String(pc.id));
  if (!contact) {
    const { consented, nonConsented } = pickEmails(pc);
    for (const em of [...consented, ...nonConsented]) {
      contact = await store.findByEmail(em);
      if (contact) break;
    }
  }
  if (!contact) {
    const url = linkedinUrl(pc);
    if (url) contact = await store.findByLinkedin(url);
  }
  let ambiguous = false;
  if (!contact) {
    const key = li.nameKey(pc.first_name, pc.last_name);
    if (key) {
      const matches = await store.findByNameKey(key);
      if (matches.length === 1) contact = matches[0];
      else if (matches.length > 1) ambiguous = true;
    }
  }

  if (contact) {
    await store.enrich(contact.id, buildEnrichPatch(pc, contact, segmentTag));
    stats.enriched++;
  } else if (ambiguous) {
    await store.addReview(reviewEntry(pc));
    stats.ambiguous++;
  } else {
    await store.create(buildCreateFields(pc, segmentTag));
    stats.created++;
  }
}

// ── Orchestrierung eines Laufs (client + store injizierbar) ──────────────────
async function runSync({ client, store, tags, updatedSince }) {
  const stats = { read: 0, created: 0, enriched: 0, ambiguous: 0, errors: 0 };
  for (const tag of tags) {
    let offset = 0;
    const LIMIT = 200;
    // Schutzgrenze gegen Endlosschleifen
    for (let guard = 0; guard < 1000; guard++) {
      const page = await client.getContacts({ tag, updated_since: updatedSince, limit: LIMIT, offset });
      if (!page || !page.length) break;
      for (const pc of page) {
        stats.read++;
        try { await reconcileOne(pc, tag, store, stats); }
        catch (e) { stats.errors++; if (store.logError) await store.logError(pc, e); }
      }
      if (page.length < LIMIT) break;
      offset += page.length;
    }
  }
  return stats;
}

// ── Produktions-Client (HTTP gegen Phalanx OS) ───────────────────────────────
let _token = null; // { access_token, exp }
let _discovery = null;

async function discovery() {
  if (_discovery) return _discovery;
  const c = config();
  try {
    const res = await fetch(`${c.baseUrl}/.well-known/openid-configuration`, { method: 'GET' });
    if (res.ok) _discovery = await res.json();
  } catch { /* Fallbacks unten */ }
  if (!_discovery) _discovery = {};
  // Vernünftige Fallbacks, falls Discovery Felder fehlen
  _discovery.token_endpoint = _discovery.token_endpoint || `${c.baseUrl}/oidc/token`;
  _discovery.authorization_endpoint = _discovery.authorization_endpoint || `${c.baseUrl}/oidc/auth`;
  _discovery.jwks_uri = _discovery.jwks_uri || `${c.baseUrl}/oidc/jwks`;
  _discovery.issuer = _discovery.issuer || c.baseUrl;
  return _discovery;
}

async function getPoolToken() {
  if (_token && _token.exp > Date.now() + 60 * 1000) return _token.access_token;
  const c = config();
  const disc = await discovery();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: c.clientId,
    client_secret: c.clientSecret,
    scope: 'pool.read pool.write',
  });
  const res = await fetch(disc.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Token-Abruf fehlgeschlagen (${res.status}): ${txt.slice(0, 200)}`);
  }
  const j = await res.json();
  _token = { access_token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) * 1000) };
  return _token.access_token;
}

function httpClient() {
  const c = config();
  const authed = async (path, opts = {}) => {
    const token = await getPoolToken();
    const res = await fetch(`${c.baseUrl}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(opts.headers || {}) },
    });
    return res;
  };
  return {
    async getContacts({ tag, updated_since, limit = 200, offset = 0 }) {
      const qs = new URLSearchParams();
      qs.set('limit', String(limit));
      qs.set('offset', String(offset));
      if (tag) qs.set('tag', tag);
      if (updated_since) qs.set('updated_since', updated_since);
      const res = await authed(`/api/pool/v1/contacts?${qs.toString()}`);
      if (!res.ok) throw new Error(`Pool-Lesen fehlgeschlagen (${res.status})`);
      const j = await res.json();
      // Antwort kann Array oder { data:[], total } sein
      return Array.isArray(j) ? j : (j.data || j.contacts || []);
    },
    async putContact(bodyObj) {
      const res = await authed('/api/pool/v1/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Pool-Rückmeldung fehlgeschlagen (${res.status}): ${txt.slice(0, 200)}`);
      }
      return res.json().catch(() => ({}));
    },
    async probe(tag) {
      const res = await authed(`/api/pool/v1/contacts?limit=1${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`);
      if (!res.ok) throw new Error(`Ping fehlgeschlagen (${res.status})`);
      const total = res.headers.get('x-total-count');
      const j = await res.json().catch(() => ({}));
      const arr = Array.isArray(j) ? j : (j.data || j.contacts || []);
      return { ok: true, total: total != null ? Number(total) : (j.total != null ? Number(j.total) : null), sample: arr[0] || null };
    },
  };
}

// ── Produktions-Store (Datenbank, Tenant 1) ──────────────────────────────────
function dbStore() {
  return {
    async findByPoolId(poolId) {
      return db.get('SELECT * FROM crm_contacts WHERE pool_contact_id = ? AND anonymized_at IS NULL', [poolId]).catch(() => null);
    },
    async findByEmail(email) {
      if (!email) return null;
      return db.get('SELECT * FROM crm_contacts WHERE lower(email) = lower(?) AND anonymized_at IS NULL', [email]).catch(() => null);
    },
    async findByLinkedin(url) {
      if (!url) return null;
      return db.get('SELECT * FROM crm_contacts WHERE lower(linkedin_url) = lower(?) AND anonymized_at IS NULL', [url]).catch(() => null);
    },
    async findByNameKey(key) {
      const rows = await db.all('SELECT * FROM crm_contacts WHERE anonymized_at IS NULL').catch(() => []);
      return rows.filter((r) => li.nameKey(r.first_name, r.last_name) === key);
    },
    async enrich(id, patch) {
      const sets = [];
      const params = [];
      for (const [k, v] of Object.entries(patch)) { sets.push(`${k} = ?`); params.push(v); }
      if (!sets.length) return;
      sets.push('updated_at = now()');
      params.push(id);
      await db.run(`UPDATE crm_contacts SET ${sets.join(', ')} WHERE id = ?`, params).catch(() => {});
    },
    async create(fields) {
      const company = fields.company_name;
      const cols = ['tenant_id', 'salutation', 'title', 'first_name', 'last_name', 'email', 'pool_email', 'phone',
        'linkedin_url', 'location', 'responsibility', 'relationship', 'source', 'buyer_type', 'consent_status',
        'contact_status', 'tags_json', 'pool_contact_id', 'notes', 'is_decision_maker'];
      const vals = [1, fields.salutation, fields.title, fields.first_name, fields.last_name, fields.email, fields.pool_email,
        fields.phone, fields.linkedin_url, fields.location, fields.responsibility, fields.relationship, fields.source,
        fields.buyer_type, fields.consent_status, fields.contact_status, fields.tags_json, fields.pool_contact_id,
        fields.notes, 0];
      const ph = cols.map(() => '?').join(', ');
      const id = await db.insert(`INSERT INTO crm_contacts (${cols.join(', ')}) VALUES (${ph})`, vals).catch(() => null);
      if (id && company) {
        // Firma anlegen/verknüpfen, ohne Funnel zu berühren.
        try {
          const norm = String(company).trim().toLowerCase();
          let comp = await db.get('SELECT id FROM crm_companies WHERE name_normalized = ?', [norm]).catch(() => null);
          if (!comp) {
            const cid = await db.insert('INSERT INTO crm_companies (tenant_id, name, name_normalized) VALUES (?, ?, ?)', [1, company, norm]).catch(() => null);
            if (cid) comp = { id: cid };
          }
          if (comp) await db.run('INSERT INTO crm_company_contacts (tenant_id, company_id, contact_id, position) VALUES (?, ?, ?, ?)', [1, comp.id, id, fields.responsibility || null]).catch(() => {});
        } catch { /* Firma optional */ }
      }
      return id;
    },
    async addReview(entry) {
      await db.run(
        `INSERT INTO phalanx_pool_review (tenant_id, pool_contact_id, display_name, email, linkedin_url, reason)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (tenant_id, pool_contact_id) DO NOTHING`,
        [1, entry.pool_contact_id, entry.display_name, entry.email, entry.linkedin_url, entry.reason]
      ).catch(() => {});
    },
  };
}

// ── Öffentliche Produktions-Funktionen ───────────────────────────────────────
async function lastSuccessfulSyncIso() {
  const row = await db.get(`SELECT finished_at FROM phalanx_sync_log WHERE status = 'ok' ORDER BY finished_at DESC LIMIT 1`).catch(() => null);
  return row && row.finished_at ? new Date(row.finished_at).toISOString() : null;
}

async function syncNow(trigger = 'manual') {
  if (!isConfigured()) throw new Error('Phalanx OS ist nicht konfiguriert (ENV fehlt).');
  const c = config();
  const logId = await db.insert(
    `INSERT INTO phalanx_sync_log (tenant_id, trigger, status) VALUES (?, ?, 'running')`, [1, trigger]
  ).catch(() => null);
  try {
    const updatedSince = await lastSuccessfulSyncIso();
    const stats = await runSync({ client: httpClient(), store: dbStore(), tags: c.tags, updatedSince });
    if (logId) await db.run(
      `UPDATE phalanx_sync_log SET status='ok', read_count=?, new_count=?, enriched_count=?, ambiguous_count=?, error_count=?, finished_at=now() WHERE id=?`,
      [stats.read, stats.created, stats.enriched, stats.ambiguous, stats.errors, logId]
    ).catch(() => {});
    // Nach dem Lesen die Rückmeldungs-Warteschlange leeren.
    await drainOutbox().catch(() => {});
    return stats;
  } catch (e) {
    if (logId) await db.run(
      `UPDATE phalanx_sync_log SET status='error', error_text=?, finished_at=now() WHERE id=?`,
      [String(e.message).slice(0, 500), logId]
    ).catch(() => {});
    throw e;
  }
}

// ── A3: Rückmeldung an den Pool (Upsert, Warteschlange mit Wiederholung) ──────
async function enqueueWriteback(contactId) {
  if (!contactId) return;
  await db.run(
    `INSERT INTO phalanx_pool_outbox (tenant_id, contact_id, source_id, status, updated_at)
     VALUES (?, ?, ?, 'pending', now())
     ON CONFLICT (tenant_id, contact_id) DO UPDATE SET status='pending', updated_at=now()`,
    [1, contactId, `crm-${contactId}`]
  ).catch(() => {});
}

function buildWritebackBody(contact, user, company) {
  return {
    source_id: `crm-${contact.id}`,
    salutation: contact.salutation || user?.salutation || null,
    first_name: contact.first_name || user?.first_name || null,
    last_name: contact.last_name || user?.last_name || null,
    email: contact.email || user?.email || null,
    phone: contact.phone || contact.mobile || null,
    title: contact.responsibility || user?.position || null,
    company: company ? { source_id: `crmco-${company.id}`, name: company.name } : undefined,
  };
}

async function drainOutbox(limit = 25) {
  if (!isConfigured()) return { sent: 0, failed: 0 };
  const rows = await db.all(`SELECT * FROM phalanx_pool_outbox WHERE status = 'pending' AND attempts < 8 ORDER BY id ASC LIMIT ?`, [limit]).catch(() => []);
  if (!rows.length) return { sent: 0, failed: 0 };
  const client = httpClient();
  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      const contact = await db.get('SELECT * FROM crm_contacts WHERE id = ?', [row.contact_id]).catch(() => null);
      if (!contact) { await db.run(`UPDATE phalanx_pool_outbox SET status='done', updated_at=now() WHERE id=?`, [row.id]).catch(() => {}); continue; }
      const user = contact.user_id ? await db.get('SELECT * FROM users WHERE id = ?', [contact.user_id]).catch(() => null) : null;
      const company = await db.get(
        `SELECT co.id, co.name FROM crm_companies co JOIN crm_company_contacts cc ON cc.company_id = co.id WHERE cc.contact_id = ? LIMIT 1`,
        [row.contact_id]
      ).catch(() => null);
      await client.putContact(buildWritebackBody(contact, user, company));
      await db.run(`UPDATE phalanx_pool_outbox SET status='done', updated_at=now() WHERE id=?`, [row.id]).catch(() => {});
      sent++;
    } catch (e) {
      failed++;
      await db.run(`UPDATE phalanx_pool_outbox SET attempts = attempts + 1, last_error = ?, updated_at = now() WHERE id = ?`, [String(e.message).slice(0, 300), row.id]).catch(() => {});
    }
  }
  return { sent, failed };
}

// ── Verwaltung: Status/Ping ──────────────────────────────────────────────────
async function status() {
  const c = config();
  const last = await db.get(`SELECT * FROM phalanx_sync_log ORDER BY id DESC LIMIT 1`).catch(() => null);
  const pending = await db.get(`SELECT COUNT(*)::int AS n FROM phalanx_pool_outbox WHERE status='pending'`).catch(() => ({ n: 0 }));
  const review = await db.get(`SELECT COUNT(*)::int AS n FROM phalanx_pool_review WHERE resolved_at IS NULL`).catch(() => ({ n: 0 }));
  return {
    configured: isConfigured(),
    base_url: c.baseUrl || null,
    tags: c.tags,
    interval_min: c.intervalMin,
    last_sync: last || null,
    pending_writeback: pending?.n || 0,
    open_reviews: review?.n || 0,
  };
}

async function ping() {
  if (!isConfigured()) return { ok: false, error: 'Nicht konfiguriert (ENV fehlt).' };
  const c = config();
  const client = httpClient();
  const perSegment = [];
  try {
    await getPoolToken(); // erzwingt Token-Abruf
    for (const tag of c.tags) {
      try { const r = await client.probe(tag); perSegment.push({ tag, total: r.total, reachable: true }); }
      catch (e) { perSegment.push({ tag, total: null, reachable: false, error: e.message }); }
    }
    return { ok: true, segments: perSegment };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Scheduler (Muster wie utils/campaigns) ───────────────────────────────────
function startScheduler() {
  const c = config();
  if (!isConfigured()) { console.log('ℹ️  Phalanx-OS-Sync: nicht konfiguriert, Scheduler aus.'); return; }
  if (!c.intervalMin || c.intervalMin <= 0) { console.log('ℹ️  Phalanx-OS-Sync: Intervall 0, Scheduler aus.'); return; }
  const tick = () => syncNow('auto')
    .then((s) => console.log(`🔗 Phalanx-OS-Sync: gelesen ${s.read}, neu ${s.created}, angereichert ${s.enriched}, mehrdeutig ${s.ambiguous}, Fehler ${s.errors}`))
    .catch((e) => console.warn('Phalanx-OS-Sync fehlgeschlagen:', e.message));
  setTimeout(tick, 120 * 1000);
  setInterval(tick, c.intervalMin * 60 * 1000);
}

module.exports = {
  // Produktion
  startScheduler, syncNow, drainOutbox, enqueueWriteback, status, ping, discovery, getPoolToken, config, isConfigured,
  // Kern (für Tests und Wiederverwendung)
  runSync, reconcileOne, buildCreateFields, buildEnrichPatch, buildWritebackBody,
  segmentBuyerType, segmentShort, prioFromTags, pickEmails, linkedinUrl, reviewEntry,
  DEFAULT_TAGS,
};
