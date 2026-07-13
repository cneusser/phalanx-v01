// ─────────────────────────────────────────────────────────────────────────────
// Rollen & Rechte — wer darf was.
//
// Die Matrix liegt bewusst im Code (nicht in der Datenbank): Sie ist Teil des
// Audits und soll nicht still per SQL veränderbar sein. Hier wird sie sichtbar
// gemacht — damit man beim Verteilen von Rollen genau weiß, was man verteilt.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Check, Minus } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };

export default function RoleMatrix({ show }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/roles').then(setData).catch(e => show && show('Fehler: ' + e.message, 'error'));
  }, [show]);

  if (!data) return <div style={{ padding: '2rem', color: C.muted }}>Laden…</div>;

  const has = (role, perm) => role.permissions.includes(perm);

  return (
    <div>
      <div style={{ background: '#EDF4FA', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
        Ihre Rolle: <strong>{data.roles.find(r => r.key === data.my_role)?.label || data.my_role}</strong>.
        Die Rechte-Matrix ist im Code hinterlegt und Teil des Audits — sie lässt sich nicht still per Datenbank ändern.
        Rollen weisen Sie im Tab „Nutzer" zu.
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 720 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th style={{ padding: '0.7rem 1rem', textAlign: 'left', color: C.navy, fontSize: '0.72rem', textTransform: 'uppercase' }}>Recht</th>
              {data.roles.map(r => (
                <th key={r.key} style={{ padding: '0.7rem 0.5rem', textAlign: 'center', color: C.navy, fontSize: '0.72rem' }}>
                  <div style={{ fontWeight: 800 }}>{r.label}</div>
                  <div style={{ fontWeight: 400, color: C.muted, fontSize: '0.68rem' }}>{r.users} Nutzer</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.permissions.map(p => (
              <tr key={p.key} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '0.55rem 1rem', color: C.text }}>
                  {p.label}
                  <div style={{ fontSize: '0.68rem', color: C.muted, fontFamily: 'monospace' }}>{p.key}</div>
                </td>
                {data.roles.map(r => (
                  <td key={r.key} style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                    {has(r, p.key)
                      ? <Check size={15} color="#059669" />
                      : <Minus size={14} color="#cbd5e1" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: '0.8rem', lineHeight: 1.6 }}>
        <strong>Sichtbarkeit:</strong> Administrator und Mandanten-Eigentümer sehen alle Mandate. Berater, Assistenz und
        Analyst sehen nur Mandate, die sie angelegt haben oder in denen sie Mitglied sind.
        <strong> Assistenz</strong> darf pflegen, aber nichts versenden und nichts löschen. <strong>Analyst</strong> darf nur lesen.
      </div>
    </div>
  );
}
