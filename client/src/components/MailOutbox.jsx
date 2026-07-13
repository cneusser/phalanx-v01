// ─────────────────────────────────────────────────────────────────────────────
// Mail-Ausgang — jede versendete Mail mit Empfänger, Betreff, Art und Original.
// Klick auf eine Zeile zeigt exakt das HTML, das beim Empfänger ankam.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { X, Search } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };

const TYPE_LABEL = {
  invite: 'Einladung (DSGVO)',
  profile_link: 'Pflege-Link',
  campaign: 'Mandats-Mailing',
  template: 'Prozess-Vorlage',
  process: 'Prozess-Nachricht',
  system: 'System',
};
const TYPE_COLOR = {
  invite: { bg: '#fef3c7', color: '#92400e' },
  profile_link: { bg: '#ede9fe', color: '#5b21b6' },
  campaign: { bg: '#dbeafe', color: '#1e40af' },
  template: { bg: '#dbeafe', color: '#1e40af' },
  process: { bg: '#f1f5f9', color: '#475569' },
  system: { bg: '#f1f5f9', color: '#475569' },
};

const fmt = (ts) => ts ? new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default function MailOutbox({ show }) {
  const [emails, setEmails] = useState([]);
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get(`/admin/emails?type=${type}&q=${encodeURIComponent(q)}`);
      setEmails(d.emails || []); setTypes(d.types || []);
    } catch (e) { show('Fehler: ' + e.message, 'error'); }
  }, [type, q, show]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function openMail(id) {
    try { setOpen(await api.get(`/admin/emails/${id}`)); }
    catch (e) { show('Fehler: ' + e.message, 'error'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: C.muted }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Empfänger oder Betreff suchen…"
            style={{ width: '100%', padding: '0.5rem 0.7rem 0.5rem 2rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={type} onChange={e => setType(e.target.value)}
          style={{ padding: '0.5rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.83rem', background: '#fff' }}>
          <option value="all">Alle Arten</option>
          {types.map(t => (
            <option key={t.mail_type} value={t.mail_type}>{TYPE_LABEL[t.mail_type] || t.mail_type} ({t.n})</option>
          ))}
        </select>
        <span style={{ fontSize: '0.78rem', color: C.muted }}>{emails.length} Mail(s) · Klick zeigt das Original</span>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
          <thead>
            <tr style={{ background: C.bg, textAlign: 'left', color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.6rem 1rem' }}>Zeitpunkt</th>
              <th style={{ padding: '0.6rem' }}>Art</th>
              <th style={{ padding: '0.6rem' }}>Empfänger</th>
              <th style={{ padding: '0.6rem' }}>Betreff</th>
              <th style={{ padding: '0.6rem' }}>Mandat</th>
              <th style={{ padding: '0.6rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {emails.map(m => {
              const st = TYPE_COLOR[m.mail_type] || TYPE_COLOR.system;
              return (
                <tr key={m.id} onClick={() => openMail(m.id)} style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  <td style={{ padding: '0.6rem 1rem', color: C.muted, whiteSpace: 'nowrap' }}>{fmt(m.created_at)}</td>
                  <td style={{ padding: '0.6rem' }}>
                    <span style={{ background: st.bg, color: st.color, padding: '0.1rem 0.5rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {TYPE_LABEL[m.mail_type] || m.mail_type}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem', color: C.text }}>{m.to_email}</td>
                  <td style={{ padding: '0.6rem', color: C.navy, fontWeight: 600 }}>{m.subject}</td>
                  <td style={{ padding: '0.6rem', color: C.muted }}>{m.codename || '—'}</td>
                  <td style={{ padding: '0.6rem' }}>
                    {m.status === 'sent'
                      ? <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.75rem' }}>versendet</span>
                      : <span title={m.error} style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.75rem' }}>fehlgeschlagen</span>}
                  </td>
                </tr>
              );
            })}
            {!emails.length && (
              <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: C.muted }}>Noch keine Mails protokolliert.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,54,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(760px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.2rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: C.navy }}>{open.subject}</div>
                <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: 2 }}>
                  An {open.to_email} · {fmt(open.created_at)} · {TYPE_LABEL[open.mail_type] || open.mail_type}
                  {open.template_key && <> · Vorlage „{open.template_key}"</>}
                </div>
              </div>
              <button onClick={() => setOpen(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#F4F8FC', padding: '1rem' }}>
              <iframe
                title="Mail-Original"
                srcDoc={open.body_html || '<p>Kein Inhalt protokolliert.</p>'}
                sandbox=""
                style={{ width: '100%', height: '58vh', border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
