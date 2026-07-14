// ─────────────────────────────────────────────────────────────────────────────
// Wiedervorlagen: was liegt an, was ist überfällig.
// Aufgaben entstehen automatisch (eingegangene Antwort) oder manuell.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Plus, Check, Trash2, AlertTriangle } from 'lucide-react';
import ContactDrawer from './ContactDrawer';

const C = { navy: '#0D1B36', accent: '#1D4E89', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };
const IN = { padding: '0.5rem 0.65rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.83rem', outline: 'none', background: '#fff', boxSizing: 'border-box' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('de-DE') : 'k. A.';

export default function TaskBoard({ show }) {
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({ open: 0, overdue: 0, today: 0 });
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [drawer, setDrawer] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get(`/crm/tasks?status=${showDone ? 'done' : 'open'}`);
      setTasks(d.tasks || []); setCounts(d.counts || {});
    } catch (e) { show('Fehler: ' + e.message); }
  }, [showDone, show]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!title.trim()) return;
    try { await api.post('/crm/tasks', { title, due_on: due || null }); setTitle(''); setDue(''); load(); }
    catch (e) { show('Fehler: ' + e.message); }
  }
  async function done(id) {
    try { await api.put(`/crm/tasks/${id}`, { status: 'done' }); load(); }
    catch (e) { show('Fehler: ' + e.message); }
  }
  async function remove(id) {
    try { await api.delete(`/crm/tasks/${id}`); load(); }
    catch (e) { show('Fehler: ' + e.message); }
  }
  async function reschedule(id, due_on) {
    try { await api.put(`/crm/tasks/${id}`, { due_on }); load(); }
    catch (e) { show('Fehler: ' + e.message); }
  }

  return (
    <div>
      {/* Kennzahlen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.7rem', marginBottom: '1rem' }}>
        {[['Offen', counts.open, C.navy], ['Heute fällig', counts.today, '#0891b2'], ['Überfällig', counts.overdue, counts.overdue ? '#dc2626' : C.muted]].map(([l, v, col]) => (
          <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.8rem 1rem' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: col }}>{v || 0}</div>
            <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Neue Wiedervorlage */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Neue Wiedervorlage…" style={{ ...IN, flex: 1, minWidth: 220 }} />
        <input type="date" value={due} onChange={e => setDue(e.target.value)} style={IN} />
        <button onClick={add} disabled={!title.trim()} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: title.trim() ? C.navy : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8,
          padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default',
        }}>
          <Plus size={14} /> Anlegen
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: C.muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
          Erledigte zeigen
        </label>
      </div>

      {/* Liste */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {tasks.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 1rem',
            borderTop: `1px solid ${C.border}`, background: t.overdue ? '#FFF7F7' : '#fff',
          }}>
            {t.status === 'open' && (
              <button onClick={() => done(t.id)} title="Erledigt" style={{
                width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${C.border}`, background: '#fff',
                cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Check size={12} color={C.muted} /></button>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.text, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                {t.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 1 }}>
                {t.codename && <>Mandat {t.codename} · </>}
                {(t.first_name || t.last_name) && (
                  <span onClick={() => setDrawer(t.contact_id)} style={{ color: C.accent, cursor: 'pointer', fontWeight: 600 }}>
                    {[t.first_name, t.last_name].filter(Boolean).join(' ')}
                  </span>
                )}
                {t.source === 'reply' && <> · aus eingegangener Antwort</>}
                {t.notes && <> · {String(t.notes).slice(0, 60)}</>}
              </div>
            </div>
            {t.overdue && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <AlertTriangle size={12} /> überfällig
              </span>
            )}
            {t.status === 'open' ? (
              <input type="date" value={t.due_on ? String(t.due_on).slice(0, 10) : ''}
                onChange={e => reschedule(t.id, e.target.value)}
                style={{ ...IN, padding: '0.3rem 0.4rem', fontSize: '0.75rem' }} />
            ) : (
              <span style={{ fontSize: '0.75rem', color: C.muted, whiteSpace: 'nowrap' }}>erledigt {fmtDate(t.done_at)}</span>
            )}
            <button onClick={() => remove(t.id)} title="Löschen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!tasks.length && (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: C.muted, fontSize: '0.88rem' }}>
            {showDone ? 'Noch nichts erledigt.' : 'Keine offenen Wiedervorlagen, alles im Griff.'}
          </div>
        )}
      </div>

      {drawer && <ContactDrawer contactId={drawer} onClose={() => setDrawer(null)} onChanged={load} show={show} />}
    </div>
  );
}
