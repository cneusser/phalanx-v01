import React, { useState, useEffect, useCallback } from 'react';
import { api, getToken } from '../api/client';
import {
  Building2, Users, Search, Plus, X, Upload, Download, Trash2, Star,
  Mail, Phone, Linkedin, AlertCircle, ChevronRight, KanbanSquare, Send,
} from 'lucide-react';
import DealFunnelBoard from '../components/DealFunnelBoard';
import ContactDrawer from '../components/ContactDrawer';
import ImportListModal from '../components/ImportListModal';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.55rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', background: '#fff' };
const LABEL = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: C.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' };

const COMPANY_TYPES = ['Stratege', 'Private Equity', 'Family Office', 'MBI/MBO-Kandidat', 'Bank/Finanzierer', 'Berater', 'Zielunternehmen', 'Sonstige'];
const CONSENT = { unknown: { label: 'Unbekannt', bg: '#f1f5f9', color: '#475569' }, opt_in: { label: 'Einwilligung', bg: '#d1fae5', color: '#065f46' }, opt_out: { label: 'Widerspruch', bg: '#fee2e2', color: '#991b1b' } };
const STATUS = { active: { label: 'Aktiv', bg: '#e0f2fe', color: '#0369a1' }, do_not_contact: { label: 'Nicht kontaktieren', bg: '#fee2e2', color: '#991b1b' }, bounced: { label: 'Unzustellbar', bg: '#fef3c7', color: '#92400e' } };
// Käufertyp (v0.291, DUB-Benchmark): Label, Kurzform und Farbe
const BUYER_TYPE = {
  strategic: { label: 'Strategischer Käufer', short: 'Strategisch', bg: '#ede9fe', color: '#5b21b6' },
  financial: { label: 'Finanzinvestor', short: 'Finanzinvestor', bg: '#dbeafe', color: '#1e40af' },
  private: { label: 'Privatperson', short: 'Privat', bg: '#dcfce7', color: '#166534' },
  advisor_mandate: { label: 'M&A-Berater mit Suchmandat', short: 'M&A-Suchmandat', bg: '#fef3c7', color: '#92400e' },
};

const Badge = ({ map, value }) => {
  const s = map[value] || map.unknown || { label: value, bg: '#f1f5f9', color: '#475569' };
  return <span style={{ background: s.bg, color: s.color, padding: '0.1rem 0.5rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.label}</span>;
};

export default function Crm() {
  const [tab, setTab] = useState('companies');
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [detail, setDetail] = useState(null);        // Unternehmens-Detail
  const [editCompany, setEditCompany] = useState(null);
  const [editContact, setEditContact] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importListOpen, setImportListOpen] = useState(false);
  const [drawerContact, setDrawerContact] = useState(null); // Kontakt-360°-Ansicht
  const [assign, setAssign] = useState(null);        // Kontakt, der einem Mandat zugeordnet wird
  const [projects, setProjects] = useState([]);      // Mandate für die Zuordnung
  const [stages, setStages] = useState([]);
  const [changes, setChanges] = useState([]);        // offene Selbstpflege-Änderungen
  // Listen (Kontakte UND Unternehmen): A-Z-Filter + Seiten (Standard 10)
  const [letter, setLetter] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [buyerType, setBuyerType] = useState('');   // Käufertyp-Filter (Kontakte)
  // Deeplink aus dem Admin: /crm?contact=123 öffnet den Kontakt direkt
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('contact');
    if (id) { setTab('contacts'); setDrawerContact(Number(id)); }
  }, []);
  useEffect(() => { setPage(1); setLetter(''); }, [tab]);
  useEffect(() => { setPage(1); }, [letter, q, pageSize, buyerType]);
  const initialLetter = (s) => (String(s || '').trim()[0] || '#').toUpperCase();
  const byLetter = (arr, keyFn) => letter
    ? arr.filter(x => (letter === '#' ? !/[A-Z]/.test(initialLetter(keyFn(x))) : initialLetter(keyFn(x)) === letter))
    : arr;
  const paginate = (arr) => pageSize === 'all' ? arr : arr.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = (arr) => pageSize === 'all' ? 1 : Math.max(1, Math.ceil(arr.length / pageSize));

  const contactsFiltered = buyerType ? contacts.filter(k => k.buyer_type === buyerType) : contacts;
  const contactsByLetter = byLetter(contactsFiltered, k => k.last_name || k.first_name || k.companies);
  const pageContacts = paginate(contactsByLetter);
  const totalPages = pageCount(contactsByLetter);

  const companiesByLetter = byLetter(companies, c => c.name);
  const pageCompanies = paginate(companiesByLetter);
  const totalPagesCompanies = pageCount(companiesByLetter);

  const azBtn = (a) => ({ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.45rem', borderRadius: 6, cursor: 'pointer', border: `1px solid ${a ? C.navy : C.border}`, background: a ? C.navy : '#fff', color: a ? '#fff' : C.muted });
  const AZBar = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: '0.6rem', alignItems: 'center' }}>
      <button onClick={() => setLetter('')} style={azBtn(!letter)}>Alle</button>
      {'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(L => (
        <button key={L} onClick={() => setLetter(L)} style={azBtn(letter === L)}>{L}</button>
      ))}
    </div>
  );
  const Pager = ({ total, count, word }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.7rem', fontSize: '0.8rem', color: C.muted }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Pro Seite:</span>
        {[10, 25, 50, 'all'].map(n => (
          <button key={n} onClick={() => setPageSize(n)} style={{ fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 6, cursor: 'pointer', border: `1px solid ${pageSize === n ? C.navy : C.border}`, background: pageSize === n ? C.navy : '#fff', color: pageSize === n ? '#fff' : C.muted }}>{n === 'all' ? 'Alle' : n}</button>
        ))}
        <span style={{ marginLeft: 8 }}>{count} {word}{letter ? ` mit „${letter}"` : ''}</span>
      </div>
      {pageSize !== 'all' && total > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '0.25rem 0.7rem', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: page <= 1 ? 'default' : 'pointer', color: page <= 1 ? '#cbd5e1' : C.navy, fontWeight: 700 }}>Zurück</button>
          <span>Seite {page} / {total}</span>
          <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page >= total} style={{ padding: '0.25rem 0.7rem', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: page >= total ? 'default' : 'pointer', color: page >= total ? '#cbd5e1' : C.navy, fontWeight: 700 }}>Weiter</button>
        </div>
      )}
    </div>
  );

  const load = useCallback(async () => {
    try {
      const [s, c, k] = await Promise.all([
        api.get('/crm/stats'),
        api.get(`/crm/companies${q ? `?q=${encodeURIComponent(q)}` : ''}`),
        api.get(`/crm/contacts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
      ]);
      setStats(s); setCompanies(c); setContacts(k);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }, [q]);
  useEffect(() => { load(); }, [load]);

  // Mandate + Funnel-Stufen einmalig laden (für die Zuordnung)
  useEffect(() => {
    api.get('/crm/deals').then(d => { setProjects(d.deals || []); setStages(d.stages || []); }).catch(() => {});
  }, []);

  // CRM IV: offene Selbstpflege-Änderungen (Freigabe-Workflow)
  const loadChanges = useCallback(() => {
    api.get('/crm/profile-changes').then(setChanges).catch(() => {});
  }, []);
  useEffect(() => { loadChanges(); }, [loadChanges]);

  // Selbstpflege-Link an einen Kontakt senden
  async function sendProfileLink(k) {
    if (!window.confirm(
      `Selbstpflege-Link an ${[k.first_name, k.last_name].filter(Boolean).join(' ')} (${k.email}) senden?\n\n` +
      `Der Kontakt sieht dann, welche Daten wir gespeichert haben, und kann sie selbst korrigieren, ` +
      `inklusive Branchen-/Regionenfokus, Ticketgröße und Kommunikationswunsch.`)) return;
    try {
      await api.post(`/crm/contacts/${k.id}/profile-link`, { requires_approval: false });
      show('Selbstpflege-Link versendet ✓');
    } catch (e) {
      if (e.code === 'PROFILE_LINK_RECENT' && window.confirm(`${e.message}\n\nTrotzdem erneut senden?`)) {
        try { await api.post(`/crm/contacts/${k.id}/profile-link`, { requires_approval: false, force: true }); show('Pflege-Link erneut versendet ✓'); }
        catch (e2) { show('Fehler: ' + e2.message); }
        return;
      }
      show('Fehler: ' + e.message);
    }
  }

  async function decideChange(id, action) {
    try {
      await api.post(`/crm/profile-changes/${id}/${action}`, {});
      show(action === 'approve' ? 'Änderung übernommen ✓' : 'Änderung abgelehnt');
      loadChanges(); load();
    } catch (e) { show('Fehler: ' + e.message); }
  }

  const show = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  async function openCompany(id) {
    try { setDetail(await api.get(`/crm/companies/${id}/detail`)); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  function exportCsv(kind) {
    fetch(`/api/crm/export/${kind}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.blob() : Promise.reject(new Error('Export fehlgeschlagen')))
      .then(b => {
        const u = URL.createObjectURL(b); const a = document.createElement('a');
        a.href = u; a.download = kind === 'companies' ? 'CRM_Unternehmen.csv' : 'CRM_Kontakte.csv'; a.click();
        URL.revokeObjectURL(u);
      })
      .catch(e => show('Fehler: ' + e.message));
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem', background: C.bg, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: C.text, margin: 0 }}>CRM</h1>
          <p style={{ color: C.muted, fontSize: '0.875rem', margin: 0 }}>Unternehmen, Kontakte & Beziehungen</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setImportListOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
            <Upload size={14} /> Liste importieren (Excel)
          </button>
          <button onClick={() => setImportOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.card, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={14} /> Import (CSV)
          </button>
          <button onClick={() => exportCsv(tab === 'contacts' ? 'contacts' : 'companies')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.card, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.55rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
          {tab !== 'funnel' && (
            <button onClick={() => (tab === 'companies' ? setEditCompany({}) : setEditContact({}))} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> {tab === 'companies' ? 'Unternehmen' : 'Kontakt'}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('Fehler') ? '#fee2e2' : '#d1fae5', color: msg.startsWith('Fehler') ? '#991b1b' : '#065f46', borderRadius: 8, padding: '0.7rem 1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>{msg}</div>
      )}

      {/* Kennzahlen */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
          {[
            ['Unternehmen', stats.companies, C.navy],
            ['Kontakte', stats.contacts, C.accent],
            ['Entscheider', stats.decision_makers, '#8b5cf6'],
            ['Einwilligung', stats.opt_in, '#10b981'],
            ['Nicht kontaktieren', stats.blocked, '#ef4444'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.9rem 1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Suche */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.15rem', borderBottom: `1px solid ${C.border}`, flex: 1, minWidth: 240 }}>
          {[['companies', 'Unternehmen', Building2], ['contacts', 'Kontakte', Users], ['funnel', 'Deal-Funnel', KanbanSquare]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => { setTab(key); setDetail(null); }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.6rem 1.1rem', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: tab === key ? 700 : 400,
              color: tab === key ? C.navy : C.muted, borderBottom: tab === key ? `2px solid ${C.navy}` : '2px solid transparent',
            }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', minWidth: 240 }}>
          <Search size={14} color={C.muted} style={{ position: 'absolute', left: 10, top: 11 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Suchen…" style={{ ...INPUT, paddingLeft: 30 }} />
        </div>
      </div>

      {/* Unternehmen */}
      {tab === 'companies' && (
        <>
        {AZBar()}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ color: C.muted, textAlign: 'left' }}>
                <th style={{ padding: '0.7rem 1rem' }}>Unternehmen</th>
                <th style={{ padding: '0.7rem 0.5rem' }}>Art</th>
                <th style={{ padding: '0.7rem 0.5rem' }}>Branche / Region</th>
                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Kontakte</th>
                <th style={{ padding: '0.7rem 1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {pageCompanies.map(c => (
                <tr key={c.id} onClick={() => openCompany(c.id)} style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: C.navy }}>{c.name}</div>
                    <div style={{ fontSize: '0.72rem', color: C.muted }}>
                      {[c.city, c.website].filter(Boolean).join(' · ')}
                      {c.parent_name && <> · Teil von <strong>{c.parent_name}</strong></>}
                    </div>
                  </td>
                  <td style={{ padding: '0.7rem 0.5rem', color: C.text }}>{c.company_type || 'k. A.'}</td>
                  <td style={{ padding: '0.7rem 0.5rem', color: C.muted }}>{[c.industry, c.region].filter(Boolean).join(' · ') || 'k. A.'}</td>
                  <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>{c.contact_count}</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right' }}><ChevronRight size={14} color={C.muted} /></td>
                </tr>
              ))}
              {!pageCompanies.length && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>{companies.length ? 'Keine Unternehmen für diesen Filter.' : 'Noch keine Unternehmen. Legen Sie eines an oder importieren Sie eine CSV-Datei.'}</td></tr>}
            </tbody>
          </table>
        </div>
        {Pager({ total: totalPagesCompanies, count: companiesByLetter.length, word: 'Unternehmen' })}
        </>
      )}

      {/* CRM IV: Offene Selbstpflege-Änderungen zur Freigabe */}
      {tab === 'contacts' && changes.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            {changes.length} SELBSTPFLEGE-ÄNDERUNG(EN) WARTEN AUF FREIGABE
          </div>
          {changes.map(ch => {
            const diffs = Object.keys(ch.after || {}).filter(k => JSON.stringify(ch.after[k]) !== JSON.stringify((ch.before || {})[k]));
            return (
              <div key={ch.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.85rem', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.navy }}>
                      {[ch.first_name, ch.last_name].filter(Boolean).join(' ')} <span style={{ fontWeight: 400, color: C.muted }}>{ch.email}</span>
                    </div>
                    {diffs.map(k => (
                      <div key={k} style={{ fontSize: '0.74rem', color: C.text, marginTop: 2 }}>
                        <strong>{k}:</strong>{' '}
                        <span style={{ color: '#991b1b', textDecoration: 'line-through' }}>{JSON.stringify((ch.before || {})[k]) || 'k. A.'}</span>{' → '}
                        <span style={{ color: '#065f46', fontWeight: 700 }}>{JSON.stringify(ch.after[k])}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button onClick={() => decideChange(ch.id, 'approve')} style={{ background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Übernehmen</button>
                    <button onClick={() => decideChange(ch.id, 'reject')} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Ablehnen</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kontakte */}
      {tab === 'contacts' && (
        <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Käufertyp</span>
          <button onClick={() => setBuyerType('')} style={azBtn(!buyerType)}>Alle</button>
          {Object.entries(BUYER_TYPE).map(([v, m]) => (
            <button key={v} onClick={() => setBuyerType(v)} style={azBtn(buyerType === v)}>{m.short}</button>
          ))}
        </div>
        {AZBar()}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ color: C.muted, textAlign: 'left' }}>
                <th style={{ padding: '0.7rem 1rem' }}>Name</th>
                <th style={{ padding: '0.7rem 0.5rem' }}>Unternehmen</th>
                <th style={{ padding: '0.7rem 0.5rem' }}>Kontakt</th>
                <th style={{ padding: '0.7rem 0.5rem' }}>DSGVO</th>
                <th style={{ padding: '0.7rem 0.5rem' }}>Mandat</th>
                <th style={{ padding: '0.7rem 1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {pageContacts.map(k => (
                <tr key={k.id} onClick={() => setDrawerContact(k.id)} style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: C.navy, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {k.is_decision_maker === 1 && <Star size={12} color="#f59e0b" fill="#f59e0b" />}
                      {[k.title, k.first_name, k.last_name].filter(Boolean).join(' ')}
                    </div>
                    {k.responsibility && <div style={{ fontSize: '0.72rem', color: C.muted }}>{k.responsibility}</div>}
                    {k.buyer_type && BUYER_TYPE[k.buyer_type] && (
                      <span style={{ display: 'inline-block', marginTop: 3, background: BUYER_TYPE[k.buyer_type].bg, color: BUYER_TYPE[k.buyer_type].color, padding: '0.05rem 0.45rem', borderRadius: 20, fontSize: '0.66rem', fontWeight: 700 }}>{BUYER_TYPE[k.buyer_type].short}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.7rem 0.5rem', color: C.text }}>{k.companies || 'k. A.'}</td>
                  <td style={{ padding: '0.7rem 0.5rem', color: C.muted, fontSize: '0.76rem' }}>
                    {k.email && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} /> {k.email}</div>}
                    {(k.mobile || k.phone) && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} /> {k.mobile || k.phone}</div>}
                  </td>
                  <td style={{ padding: '0.7rem 0.5rem' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Badge map={CONSENT} value={k.consent_status} />
                      {k.contact_status !== 'active' && <Badge map={STATUS} value={k.contact_status} />}
                    </div>
                  </td>
                  {/* Sprint 20: Kontakt einem Mandat mit Rolle & Funnel-Stufe zuordnen */}
                  <td style={{ padding: '0.7rem 0.5rem' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAssign(k); }}
                        title="Diesem Kontakt ein Mandat zuordnen (Rolle & Funnel-Stufe)"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF4FB', color: C.accent, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.28rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <KanbanSquare size={12} /> Zuordnen
                      </button>
                      {/* CRM IV: Kontakt seine Daten selbst pflegen lassen */}
                      <button
                        onClick={(e) => { e.stopPropagation(); sendProfileLink(k); }}
                        title="Selbstpflege-Link senden: der Kontakt prüft und aktualisiert seine Daten selbst"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, padding: '0.28rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <Send size={12} /> Pflege-Link
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right' }}><ChevronRight size={14} color={C.muted} /></td>
                </tr>
              ))}
              {!pageContacts.length && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>{contacts.length ? 'Keine Kontakte für diesen Filter.' : 'Noch keine Kontakte.'}</td></tr>}
            </tbody>
          </table>
        </div>
        {Pager({ total: totalPages, count: contactsByLetter.length, word: 'Kontakt(e)' })}
        </>
      )}

      {/* Sprint 20: Sell-Side-Funnel je Mandat (Longlist → Closing) */}
      {tab === 'funnel' && <DealFunnelBoard show={show} />}

      {detail && (
        <CompanyDetail
          data={detail}
          companies={companies}
          onClose={() => setDetail(null)}
          onChanged={() => { openCompany(detail.company.id); load(); }}
          onMerged={() => { setDetail(null); load(); }}
          onEdit={() => setEditCompany(detail.company)}
          onEditContact={(k) => setEditContact(k)}
          contactsAll={contacts}
          show={show}
        />
      )}
      {drawerContact && (
        <ContactDrawer contactId={drawerContact} onClose={() => setDrawerContact(null)} onChanged={load} show={show} />
      )}
      {editCompany && <CompanyForm company={editCompany} companies={companies} onClose={() => setEditCompany(null)} onSaved={() => { setEditCompany(null); load(); show('Gespeichert ✓'); }} />}
      {editContact && <ContactForm contact={editContact} companies={companies} onClose={() => setEditContact(null)} onSaved={() => { setEditContact(null); load(); show('Gespeichert ✓'); }} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onDone={(r) => { setImportOpen(false); load(); show(`Import: ${r.created} angelegt, ${r.skipped} übersprungen (Dubletten)`); }} />}
      {importListOpen && <ImportListModal onClose={() => setImportListOpen(false)} onDone={() => load()} show={show} />}
      {assign && <AssignDealModal contact={assign} projects={projects} stages={stages} onClose={() => setAssign(null)} show={show} />}
    </div>
  );
}

// ── Kontakt einem Mandat zuordnen (Rolle + Funnel-Stufe) ─────────────────────
const PARTY_ROLES = [
  ['buyer', 'Käufer / Investor'],
  ['advisor', 'Berater / Intermediär'],
  ['seller', 'Verkäufer / Mandant'],
  ['process', 'Prozessbeteiligter (Steuerberater, WP, Consultant …)'],
  ['bank', 'Bank / Finanzierer'],
  ['lawyer', 'Rechtsanwalt'],
  ['target', 'Zielunternehmen'],
  ['other', 'Sonstige'],
];
const PARTY_STATUS_LABEL = { open: 'offen', active: 'aktiv', unclear: 'unklar', dropped: 'ausgestiegen' };

function AssignDealModal({ contact, projects, stages, onClose, show }) {
  const [detail, setDetail] = useState(null);
  const [projectId, setProjectId] = useState('');
  const [role, setRole] = useState('buyer');
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setDetail(await api.get(`/crm/contacts/${contact.id}/detail`)); }
    catch (e) { setErr(e.message); }
  }, [contact.id]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!projectId) { setErr('Bitte ein Mandat wählen.'); return; }
    setBusy(true); setErr('');
    try {
      await api.post(`/crm/deals/${projectId}/parties`, {
        contact_id: contact.id,
        company_id: detail?.current?.[0]?.company_id || null,
        party_role: role,
        funnel_stage: Number(stage),
      });
      setProjectId('');
      await load();
      show('Kontakt dem Mandat zugeordnet ✓');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(partyId) {
    if (!window.confirm('Zuordnung zu diesem Mandat entfernen?')) return;
    try { await api.delete(`/crm/parties/${partyId}`); await load(); show('Zuordnung entfernt ✓'); }
    catch (e) { setErr(e.message); }
  }

  const name = [contact.title, contact.first_name, contact.last_name].filter(Boolean).join(' ');
  const stageLabel = (k) => (stages.find(s => s.key === k) || {}).label || k;

  return (
    <Modal title={`Mandats-Zuordnung: ${name}`} onClose={onClose}>
      {err && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.83rem', marginBottom: '0.75rem' }}>{err}</div>}

      {/* Bestehende Zuordnungen */}
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: '0.5rem' }}>AKTUELLE MANDATE</div>
      {detail?.deals?.length ? detail.deals.map(d => (
        <div key={d.party_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: '0.35rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.navy }}>
              {d.codename}
              {d.project_status === 'draft' && <span style={{ fontSize: '0.65rem', color: C.muted, marginLeft: 5 }}>(Entwurf)</span>}
            </div>
            <div style={{ fontSize: '0.72rem', color: C.muted }}>
              {(PARTY_ROLES.find(r => r[0] === d.party_role) || [, d.party_role])[1]} · {stageLabel(d.funnel_stage)} · {PARTY_STATUS_LABEL[d.party_status] || d.party_status}
            </div>
          </div>
          <button onClick={() => remove(d.party_id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '0.3rem 0.45rem', cursor: 'pointer' }}>
            <Trash2 size={13} />
          </button>
        </div>
      )) : <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.5rem' }}>Dieser Kontakt ist noch keinem Mandat zugeordnet.</div>}

      {/* Neue Zuordnung */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: '0.6rem' }}>MANDAT ZUORDNEN</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL}>Mandat *</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} style={INPUT}>
              <option value="">Bitte wählen…</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.codename}{p.status === 'draft' ? ' (Entwurf)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LABEL}>Rolle im Mandat</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={INPUT}>
              {PARTY_ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>Funnel-Stufe</label>
            <select value={stage} onChange={e => setStage(e.target.value)} style={INPUT}>
              {stages.map(s => <option key={s.key} value={s.key}>{s.key}: {s.label}</option>)}
            </select>
          </div>
        </div>
        <button onClick={add} disabled={busy || !projectId} style={{ marginTop: '0.75rem', width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
          {busy ? 'Wird zugeordnet…' : 'Zum Mandat hinzufügen'}
        </button>
      </div>
    </Modal>
  );
}

// ── Unternehmens-Detail: Kontakte, Konzern, Historie ─────────────────────────
function CompanyDetail({ data, companies, onClose, onChanged, onMerged, onEdit, onEditContact, contactsAll, show }) {
  const { company, contacts, history, subsidiaries } = data;
  const [addId, setAddId] = useState('');
  const [pos, setPos] = useState('');
  const [mergeId, setMergeId] = useState('');
  const [merging, setMerging] = useState(false);

  async function link() {
    if (!addId) return;
    try {
      await api.post(`/crm/companies/${company.id}/contacts`, { contact_id: Number(addId), position: pos });
      setAddId(''); setPos(''); onChanged();
    } catch (e) { show('Fehler: ' + e.message); }
  }

  // Dublette in dieses Unternehmen zusammenführen
  async function merge() {
    if (!mergeId) return;
    const src = companies.find(c => String(c.id) === String(mergeId));
    if (!window.confirm(
      `„${src?.name}" in „${company.name}" zusammenführen?\n\n` +
      `• Alle Kontakte und Funnel-Einträge wandern zu „${company.name}".\n` +
      `• Leere Felder werden aus der Dublette aufgefüllt, Notizen zusammengeführt.\n` +
      `• „${src?.name}" wird danach gelöscht.\n\nDas lässt sich nicht rückgängig machen.`)) return;
    setMerging(true);
    try {
      const r = await api.post(`/crm/companies/${company.id}/merge`, { source_id: Number(mergeId) });
      show(`Zusammengeführt ✓ (${r.moved_contacts} Kontakt(e) übernommen)`);
      onMerged();
    } catch (e) { show('Fehler: ' + e.message); }
    finally { setMerging(false); }
  }
  async function endPosition(linkId) {
    if (!window.confirm('Position beenden? Der Eintrag wandert in die Historie (Unternehmenswechsel).')) return;
    try { await api.put(`/crm/links/${linkId}`, { ended_on: new Date().toISOString().slice(0, 10) }); onChanged(); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,54,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 12, width: '100%', maxWidth: 760, maxHeight: '88vh', overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.navy, margin: 0 }}>{company.name}</h2>
            <div style={{ fontSize: '0.8rem', color: C.muted }}>
              {[company.company_type, company.industry, company.region, company.city].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={onEdit} style={{ background: C.bg, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Bearbeiten</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={20} /></button>
          </div>
        </div>

        {/* Kontaktdaten des Unternehmens */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.8rem 1rem', margin: '0.75rem 0' }}>
          {[
            ['Anschrift', [company.street, [company.postal_code, company.city].filter(Boolean).join(' '), company.country].filter(Boolean).join(', ')],
            ['Website', company.website],
            ['Umsatz', company.revenue_band],
            ['Mitarbeiter', company.employees],
            ['Käuferkategorie', company.buyer_category],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '0.64rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              {label === 'Website' && value ? (
                <a href={String(value).startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: C.accent, wordBreak: 'break-all' }}>{value}</a>
              ) : (
                <div style={{ fontSize: '0.8rem', color: value ? C.text : '#cbd5e1' }}>{value || 'k. A.'}</div>
              )}
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <button onClick={onEdit} style={{ background: 'none', border: 'none', color: C.accent, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              ✎ Unternehmensdaten ergänzen
            </button>
          </div>
        </div>
        {company.investment_criteria && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.75rem 1rem', margin: '0.75rem 0', fontSize: '0.83rem' }}>
            <strong style={{ color: C.navy }}>Investitionskriterien: </strong>{company.investment_criteria}
          </div>
        )}
        {company.notes && <p style={{ fontSize: '0.83rem', color: C.text, lineHeight: 1.6 }}>{company.notes}</p>}

        {/* Konzernstruktur */}
        {(company.parent_name || subsidiaries.length > 0) && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: '0.4rem' }}>KONZERNSTRUKTUR</div>
            {company.parent_name && <div style={{ fontSize: '0.83rem' }}>Mutter: <strong>{company.parent_name}</strong>{company.relation_to_parent ? ` (${company.relation_to_parent})` : ''}</div>}
            {subsidiaries.map(s => <div key={s.id} style={{ fontSize: '0.83rem', color: C.text }}>↳ {s.name}{s.relation_to_parent ? ` (${s.relation_to_parent})` : ''}</div>)}
          </div>
        )}

        {/* Kontakte */}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', margin: '1.25rem 0 0.5rem' }}>ANSPRECHPARTNER</div>
        {contacts.map(k => (
          <div key={k.link_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: '0.35rem' }}>
            {k.is_decision_maker === 1 && <Star size={13} color="#f59e0b" fill="#f59e0b" />}
            {/* Klick → Kontakt direkt aus der Unternehmensansicht pflegen */}
            <div
              onClick={() => onEditContact({ ...k, id: k.id })}
              title="Kontakt bearbeiten"
              style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.navy }}>{[k.title, k.first_name, k.last_name].filter(Boolean).join(' ')}</div>
              <div style={{ fontSize: '0.72rem', color: C.muted }}>
                {[k.position, k.email, k.mobile || k.phone].filter(Boolean).join(' · ') || 'Keine Kontaktdaten, klicken zum Ergänzen'}
              </div>
            </div>
            <Badge map={CONSENT} value={k.consent_status} />
            <button onClick={() => onEditContact({ ...k, id: k.id })} title="Kontakt bearbeiten" style={{ background: '#EEF4FB', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', color: C.accent, fontWeight: 700 }}>✎</button>
            <button onClick={() => endPosition(k.link_id)} title="Position beenden (Historie)" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', color: C.muted }}>beenden</button>
          </div>
        ))}
        {!contacts.length && <div style={{ fontSize: '0.82rem', color: C.muted }}>Noch keine Ansprechpartner zugeordnet.</div>}

        {/* Kontakt zuordnen */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '0.4rem', marginTop: '0.6rem' }}>
          <select value={addId} onChange={e => setAddId(e.target.value)} style={INPUT}>
            <option value="">Kontakt zuordnen…</option>
            {contactsAll.map(k => <option key={k.id} value={k.id}>{[k.first_name, k.last_name].filter(Boolean).join(' ')}</option>)}
          </select>
          <input value={pos} onChange={e => setPos(e.target.value)} placeholder="Position" style={INPUT} />
          <button onClick={link} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0 0.9rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>+</button>
        </div>

        {/* Dublette zusammenführen */}
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '0.9rem 1rem', marginTop: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>DUBLETTE ZUSAMMENFÜHREN</div>
          <p style={{ fontSize: '0.75rem', color: '#92400e', margin: '0 0 0.6rem', lineHeight: 1.5 }}>
            Wählen Sie das doppelte Unternehmen: dessen Kontakte, Funnel-Einträge und Angaben wandern
            in <strong>{company.name}</strong>, danach wird es gelöscht.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.4rem' }}>
            <select value={mergeId} onChange={e => setMergeId(e.target.value)} style={INPUT}>
              <option value="">Doppeltes Unternehmen wählen…</option>
              {companies.filter(c => c.id !== company.id).map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.city ? ` · ${c.city}` : ''} ({c.contact_count} Kontakte)</option>
              ))}
            </select>
            <button onClick={merge} disabled={!mergeId || merging} style={{
              background: mergeId ? '#92400e' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8,
              padding: '0 1rem', fontWeight: 700, fontSize: '0.8rem', cursor: mergeId ? 'pointer' : 'default', whiteSpace: 'nowrap',
            }}>
              {merging ? 'Führe zusammen…' : 'Zusammenführen'}
            </button>
          </div>
        </div>

        {/* Historie */}
        {history.length > 0 && (
          <>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', margin: '1.25rem 0 0.5rem' }}>FRÜHERE ANSPRECHPARTNER (HISTORIE)</div>
            {history.map(k => (
              <div key={k.link_id} style={{ fontSize: '0.8rem', color: C.muted, padding: '0.35rem 0.75rem', borderLeft: `2px solid ${C.border}` }}>
                {[k.first_name, k.last_name].filter(Boolean).join(' ')}, {k.position || 'Position unbekannt'} (bis {new Date(k.ended_on).toLocaleDateString('de-DE')})
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Unternehmens-Formular ────────────────────────────────────────────────────
function CompanyForm({ company, companies, onClose, onSaved }) {
  const isNew = !company.id;
  const [f, setF] = useState({
    name: '', street: '', postal_code: '', city: '', country: '', website: '', industry: '', region: '',
    revenue_band: '', employees: '', company_type: '', buyer_category: '', investment_criteria: '',
    description: '', notes: '', parent_company_id: '', relation_to_parent: '', ...company,
  });
  const [dupes, setDupes] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));

  async function save(force = false) {
    setBusy(true); setErr(''); setDupes([]);
    try {
      const body = { ...f, employees: f.employees || null, parent_company_id: f.parent_company_id || null, force };
      if (isNew) await api.post('/crm/companies', body);
      else await api.put(`/crm/companies/${company.id}`, body);
      onSaved();
    } catch (e) {
      // Dubletten-Warnung des Servers auswerten
      if (e.message?.includes('Dublette')) {
        try { const d = await api.get(`/crm/companies/duplicates?name=${encodeURIComponent(f.name)}`); setDupes(d); } catch { /* egal */ }
        setErr('Mögliche Dublette gefunden: bitte prüfen.');
      } else setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={isNew ? 'Unternehmen anlegen' : 'Unternehmen bearbeiten'} onClose={onClose}>
      {err && <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
        <AlertCircle size={14} style={{ verticalAlign: -2 }} /> {err}
      </div>}
      {dupes.length > 0 && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem' }}>
          {dupes.map(d => <div key={d.id} style={{ fontSize: '0.82rem', color: C.text }}>• <strong>{d.name}</strong>{d.city ? ` · ${d.city}` : ''}</div>)}
          <button onClick={() => save(true)} style={{ marginTop: '0.5rem', background: '#92400e', color: '#fff', border: 'none', borderRadius: 7, padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
            Trotzdem als neues Unternehmen anlegen
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <div style={{ gridColumn: '1 / -1' }}><label style={LABEL}>Firmenname *</label><input value={f.name} onChange={set('name')} style={INPUT} /></div>
        <div><label style={LABEL}>Unternehmensart</label>
          <select value={f.company_type || ''} onChange={set('company_type')} style={INPUT}>
            <option value="">k. A.</option>{COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label style={LABEL}>Käuferkategorie</label><input value={f.buyer_category || ''} onChange={set('buyer_category')} style={INPUT} /></div>
        <div><label style={LABEL}>Branche</label><input value={f.industry || ''} onChange={set('industry')} style={INPUT} /></div>
        <div><label style={LABEL}>Region</label><input value={f.region || ''} onChange={set('region')} style={INPUT} /></div>
        <div><label style={LABEL}>Umsatz</label><input value={f.revenue_band || ''} onChange={set('revenue_band')} placeholder="z. B. € 10–20 Mio." style={INPUT} /></div>
        <div><label style={LABEL}>Mitarbeiter</label><input type="number" value={f.employees || ''} onChange={set('employees')} style={INPUT} /></div>
        <div><label style={LABEL}>Website</label><input value={f.website || ''} onChange={set('website')} style={INPUT} /></div>
        <div><label style={LABEL}>Straße</label><input value={f.street || ''} onChange={set('street')} style={INPUT} /></div>
        <div><label style={LABEL}>PLZ</label><input value={f.postal_code || ''} onChange={set('postal_code')} style={INPUT} /></div>
        <div><label style={LABEL}>Ort</label><input value={f.city || ''} onChange={set('city')} style={INPUT} /></div>
        <div><label style={LABEL}>Land</label><input value={f.country || ''} onChange={set('country')} style={INPUT} /></div>
        <div><label style={LABEL}>Muttergesellschaft</label>
          <select value={f.parent_company_id || ''} onChange={set('parent_company_id')} style={INPUT}>
            <option value="">k. A.</option>
            {companies.filter(c => c.id !== company.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}><label style={LABEL}>Investitionskriterien</label><textarea value={f.investment_criteria || ''} onChange={set('investment_criteria')} rows={2} style={{ ...INPUT, resize: 'vertical' }} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={LABEL}>Notizen</label><textarea value={f.notes || ''} onChange={set('notes')} rows={3} style={{ ...INPUT, resize: 'vertical' }} /></div>
      </div>

      <button onClick={() => save(false)} disabled={busy || !f.name} style={{ marginTop: '1rem', width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
        {busy ? 'Speichert…' : 'Speichern'}
      </button>
    </Modal>
  );
}

// ── Kontakt-Formular ─────────────────────────────────────────────────────────
function ContactForm({ contact, companies, onClose, onSaved }) {
  const isNew = !contact.id;
  const [f, setF] = useState({
    salutation: '', title: '', first_name: '', last_name: '', email: '', phone: '', mobile: '',
    linkedin_url: '', location: '', responsibility: '', relationship: '', notes: '',
    is_decision_maker: 0, consent_status: 'unknown', contact_status: 'active', buyer_type: '',
    company_id: '', position: '', ...contact,
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value }));

  async function save(force = false) {
    setBusy(true); setErr('');
    try {
      if (isNew) await api.post('/crm/contacts', { ...f, force });
      else await api.put(`/crm/contacts/${contact.id}`, f);
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function remove() {
    if (!window.confirm('Kontakt endgültig löschen?')) return;
    try { await api.delete(`/crm/contacts/${contact.id}`); onSaved(); } catch (e) { setErr(e.message); }
  }

  return (
    <Modal title={isNew ? 'Kontakt anlegen' : 'Kontakt bearbeiten'} onClose={onClose}>
      {err && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
        {err}
        {err.includes('existiert bereits') && (
          <button onClick={() => save(true)} style={{ marginLeft: 8, background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Trotzdem anlegen</button>
        )}
      </div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <div><label style={LABEL}>Anrede</label>
          <select value={f.salutation || ''} onChange={set('salutation')} style={INPUT}>
            <option value="">k. A.</option><option>Herr</option><option>Frau</option><option>Divers</option>
          </select>
        </div>
        <div><label style={LABEL}>Titel</label><input value={f.title || ''} onChange={set('title')} style={INPUT} /></div>
        <div><label style={LABEL}>Vorname</label><input value={f.first_name || ''} onChange={set('first_name')} style={INPUT} /></div>
        <div><label style={LABEL}>Nachname *</label><input value={f.last_name || ''} onChange={set('last_name')} style={INPUT} /></div>
        <div><label style={LABEL}>E-Mail</label><input value={f.email || ''} onChange={set('email')} style={INPUT} /></div>
        <div><label style={LABEL}>Mobil</label><input value={f.mobile || ''} onChange={set('mobile')} style={INPUT} /></div>
        <div><label style={LABEL}>Telefon</label><input value={f.phone || ''} onChange={set('phone')} style={INPUT} /></div>
        <div><label style={LABEL}>LinkedIn</label><input value={f.linkedin_url || ''} onChange={set('linkedin_url')} style={INPUT} /></div>
        <div><label style={LABEL}>Standort</label><input value={f.location || ''} onChange={set('location')} style={INPUT} /></div>
        <div><label style={LABEL}>Verantwortungsbereich</label><input value={f.responsibility || ''} onChange={set('responsibility')} style={INPUT} /></div>
        <div><label style={LABEL}>Beziehung</label><input value={f.relationship || ''} onChange={set('relationship')} placeholder="persönlich bekannt / kalt …" style={INPUT} /></div>
        <div><label style={LABEL}>Käufertyp</label>
          <select value={f.buyer_type || ''} onChange={set('buyer_type')} style={INPUT}>
            <option value="">ohne Angabe</option>
            {Object.entries(BUYER_TYPE).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
        </div>

        {isNew && (
          <>
            <div><label style={LABEL}>Unternehmen</label>
              <select value={f.company_id || ''} onChange={set('company_id')} style={INPUT}>
                <option value="">k. A.</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Position</label><input value={f.position || ''} onChange={set('position')} style={INPUT} /></div>
          </>
        )}

        {/* DSGVO */}
        <div><label style={LABEL}>Einwilligung (DSGVO)</label>
          <select value={f.consent_status} onChange={set('consent_status')} style={INPUT}>
            <option value="unknown">Unbekannt</option>
            <option value="opt_in">Einwilligung erteilt</option>
            <option value="opt_out">Widerspruch</option>
          </select>
        </div>
        <div><label style={LABEL}>Kontaktstatus</label>
          <select value={f.contact_status} onChange={set('contact_status')} style={INPUT}>
            <option value="active">Aktiv</option>
            <option value="do_not_contact">Nicht kontaktieren</option>
            <option value="bounced">Unzustellbar</option>
          </select>
        </div>

        <label style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', color: C.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!f.is_decision_maker} onChange={set('is_decision_maker')} />
          <Star size={13} color="#f59e0b" fill={f.is_decision_maker ? '#f59e0b' : 'none'} /> Entscheider
        </label>
        <div style={{ gridColumn: '1 / -1' }}><label style={LABEL}>Notizen</label><textarea value={f.notes || ''} onChange={set('notes')} rows={3} style={{ ...INPUT, resize: 'vertical' }} /></div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={() => save(false)} disabled={busy || !f.last_name} style={{ flex: 1, background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
          {busy ? 'Speichert…' : 'Speichern'}
        </button>
        {!isNew && (
          <button onClick={remove} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer' }}><Trash2 size={15} /></button>
        )}
      </div>
    </Modal>
  );
}

// ── CSV-Import ───────────────────────────────────────────────────────────────
function ImportModal({ onClose, onDone }) {
  const [kind, setKind] = useState('companies');
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setCsv(String(r.result || ''));
    r.readAsText(file, 'utf-8');
  }
  async function run() {
    setBusy(true); setErr('');
    try { onDone(await api.post(`/crm/import/${kind}`, { csv })); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal title="CSV-Import" onClose={onClose}>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
        {[['companies', 'Unternehmen'], ['contacts', 'Kontakte']].map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} style={{
            flex: 1, padding: '0.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
            border: `1.5px solid ${kind === k ? C.navy : C.border}`, background: kind === k ? C.navy : '#fff', color: kind === k ? '#fff' : C.muted,
          }}>{l}</button>
        ))}
      </div>
      <p style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.6, marginBottom: '0.75rem' }}>
        Erste Zeile = Spaltenüberschriften (Semikolon oder Komma). Erkannt werden u. a.:{' '}
        {kind === 'companies'
          ? <code>Name, Strasse, PLZ, Ort, Land, Website, Branche, Region, Umsatz, Mitarbeiter, Unternehmensart, Notizen</code>
          : <code>Anrede, Titel, Vorname, Nachname, Email, Telefon, Mobil, LinkedIn, Unternehmen, Position, Entscheider, Notizen</code>}
        . <strong>Dubletten werden automatisch übersprungen.</strong>
        {kind === 'contacts' && ' Genannte Unternehmen werden bei Bedarf angelegt und verknüpft.'}
      </p>
      <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }} />
      <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={8} placeholder="…oder CSV-Inhalt hier einfügen" style={{ ...INPUT, fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical' }} />
      {err && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>{err}</div>}
      <button onClick={run} disabled={busy || !csv.trim()} style={{ marginTop: '0.75rem', width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
        {busy ? 'Importiert…' : 'Import starten'}
      </button>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,54,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.navy, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
