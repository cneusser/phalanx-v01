// ─────────────────────────────────────────────────────────────────────────────
// Rollen & Rechte — pflegbar.
//
// Häkchen setzen oder entfernen, speichern. Eigene Rollen lassen sich anlegen
// (auf Basis der bekannten Rechte) und wieder löschen, solange ihnen niemand
// zugewiesen ist. Zwei Dinge sind bewusst nicht verhandelbar: Der Administrator
// behält immer alle Rechte, und Systemrollen lassen sich nicht löschen.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Check, Minus, Save, Plus, Trash2, Lock } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };

// Rechte nach Bereich gruppieren — sonst ist die Matrix eine Bleiwüste
const GROUP_OF = (key) => key.split('.')[0];
const GROUP_LABEL = {
  crm: 'CRM', mail: 'E-Mail', projects: 'Mandate', valuation: 'Bewertungen',
  users: 'Nutzer', tasks: 'Wiedervorlagen', analytics: 'Auswertungen', audit: 'Audit',
};

export default function RoleMatrix({ show }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});     // key → Set der Rechte
  const [dirty, setDirty] = useState({});     // key → true
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/admin/roles');
      setData(d);
      const dr = {};
      d.roles.forEach(r => { dr[r.key] = new Set(r.permissions); });
      setDraft(dr); setDirty({});
    } catch (e) { show && show('Fehler: ' + e.message, 'error'); }
  }, [show]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div style={{ padding: '2rem', color: C.muted }}>Laden…</div>;

  const editable = (r) => data.can_edit && r.key !== 'super_admin';

  function toggle(roleKey, perm) {
    setDraft(d => {
      const set = new Set(d[roleKey]);
      set.has(perm) ? set.delete(perm) : set.add(perm);
      return { ...d, [roleKey]: set };
    });
    setDirty(x => ({ ...x, [roleKey]: true }));
  }

  async function saveRole(r) {
    setBusy(true);
    try {
      await api.put(`/admin/roles/${r.key}`, { permissions: [...draft[r.key]] });
      show && show(`Rechte für „${r.label}" gespeichert ✓`);
      await load();
    } catch (e) { show && show('Fehler: ' + e.message, 'error'); }
    finally { setBusy(false); }
  }

  async function addRole() {
    const label = window.prompt('Name der neuen Rolle (z. B. „Werkstudent" oder „Externer Berater")');
    if (!label) return;
    try {
      await api.post('/admin/roles', { label, permissions: [] });
      show && show('Rolle angelegt — jetzt Rechte setzen ✓');
      await load();
    } catch (e) { show && show('Fehler: ' + e.message, 'error'); }
  }

  async function removeRole(r) {
    if (!window.confirm(`Rolle „${r.label}" löschen?`)) return;
    try { await api.delete(`/admin/roles/${r.key}`); show && show('Rolle gelöscht'); await load(); }
    catch (e) { show && show('Fehler: ' + e.message, 'error'); }
  }

  // Rechte nach Bereich sortiert
  const groups = {};
  data.permissions.forEach(p => {
    const g = GROUP_OF(p.key);
    (groups[g] = groups[g] || []).push(p);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ background: '#EDF4FA', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.8rem 1rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, flex: 1, minWidth: 300 }}>
          Ihre Rolle: <strong>{data.roles.find(r => r.key === data.my_role)?.label || data.my_role}</strong>.
          Häkchen setzen oder entfernen und je Rolle speichern. Der <strong>Administrator</strong> behält immer alle Rechte
          (Sicherheitsanker), Systemrollen sind änderbar, aber nicht löschbar. Jede Änderung landet im Audit-Trail.
        </div>
        {data.can_edit && (
          <button onClick={addRole} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, color: '#fff', border: 'none',
            borderRadius: 8, padding: '0.6rem 1.1rem', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            <Plus size={15} /> Eigene Rolle
          </button>
        )}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 800 }}>
          <thead>
            <tr style={{ background: C.bg }}>
              <th style={{ padding: '0.7rem 1rem', textAlign: 'left', color: C.navy, fontSize: '0.72rem', textTransform: 'uppercase', position: 'sticky', left: 0, background: C.bg }}>Recht</th>
              {data.roles.map(r => (
                <th key={r.key} style={{ padding: '0.7rem 0.5rem', textAlign: 'center', color: C.navy, fontSize: '0.72rem', minWidth: 105 }}>
                  <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    {r.is_system && <Lock size={9} color={C.muted} />}{r.label}
                  </div>
                  <div style={{ fontWeight: 400, color: C.muted, fontSize: '0.68rem' }}>{r.users} Nutzer</div>
                  {editable(r) && (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                      <button
                        onClick={() => saveRole(r)}
                        disabled={!dirty[r.key] || busy}
                        title="Rechte dieser Rolle speichern"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          background: dirty[r.key] ? C.navy : '#f1f5f9', color: dirty[r.key] ? '#fff' : '#cbd5e1',
                          border: 'none', borderRadius: 5, padding: '0.15rem 0.4rem', fontSize: '0.65rem',
                          fontWeight: 700, cursor: dirty[r.key] ? 'pointer' : 'default',
                        }}>
                        <Save size={10} /> {dirty[r.key] ? 'Speichern' : 'Gespeichert'}
                      </button>
                      {!r.is_system && (
                        <button onClick={() => removeRole(r)} title="Rolle löschen" style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0,
                        }}><Trash2 size={11} /></button>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).map(([g, list]) => (
              <React.Fragment key={g}>
                <tr>
                  <td colSpan={data.roles.length + 1} style={{
                    padding: '0.45rem 1rem', background: '#F1F5F9', color: C.navy,
                    fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{GROUP_LABEL[g] || g}</td>
                </tr>
                {list.map(p => (
                  <tr key={p.key} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '0.5rem 1rem', color: C.text, position: 'sticky', left: 0, background: '#fff' }}>
                      {p.label}
                      <div style={{ fontSize: '0.66rem', color: C.muted, fontFamily: 'monospace' }}>{p.key}</div>
                    </td>
                    {data.roles.map(r => {
                      const on = draft[r.key]?.has(p.key);
                      const locked = !editable(r);
                      return (
                        <td key={r.key} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {locked ? (
                            r.key === 'super_admin' || on
                              ? <Check size={15} color="#059669" />
                              : <Minus size={14} color="#cbd5e1" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={!!on}
                              onChange={() => toggle(r.key, p.key)}
                              title={`${p.label} für ${r.label}`}
                              style={{ cursor: 'pointer', width: 15, height: 15 }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: '0.8rem', lineHeight: 1.6 }}>
        <strong>Sichtbarkeit der Mandate:</strong> Ohne das Recht „Alle Mandate sehen" sieht eine Rolle nur Mandate,
        die sie angelegt hat oder in denen sie Mitglied ist. Rollen weisen Sie im Tab „Nutzer" zu; eine eigene Rolle
        lässt sich nur löschen, wenn ihr niemand mehr zugewiesen ist.
      </div>
    </div>
  );
}
