import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X } from 'lucide-react';

const C = { navy: '#0D1B36', border: '#E2E8F0', bg: '#F8FAFC', muted: '#64748B', text: '#0F172A' };
const INPUT = { padding: '0.45rem 0.6rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' };

export const DEAL_STATUS_LABELS = {
  draft: 'Entwurf', teaser_live: 'Teaser live', outreach: 'Ansprache',
  in_diligence: 'In Diligence', loi: 'LoI', closed: 'Closed', withdrawn: 'Zurückgezogen',
};
// Muss den serverseitigen Übergängen entsprechen (dealStateMachine.js) —
// der Server validiert ohnehin jede Transition.
export const DEAL_TRANSITIONS = {
  draft: ['teaser_live', 'withdrawn'],
  teaser_live: ['outreach', 'in_diligence', 'draft', 'withdrawn'],
  outreach: ['in_diligence', 'teaser_live', 'withdrawn'],
  in_diligence: ['loi', 'outreach', 'teaser_live', 'withdrawn'],
  loi: ['closed', 'in_diligence', 'withdrawn'],
  closed: [],
  withdrawn: ['draft'],
};

const STAGE_LABELS = {
  requested: 'Interesse', nda_pending: 'NDA versendet', nda_signed: 'NDA signiert',
  im_granted: 'IM freigeschaltet', dataroom_granted: 'Datenraum', loi: 'LoI', rejected: 'Abgelehnt',
};

const Section = ({ title, children }) => (
  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
    <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.75rem', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>{title}</div>
    {children}
  </div>
);

/**
 * Sprint 4 — Deal-Detail im Admin-CRM: Interessenten-Funnel mit granularen
 * Datenraum-Rechten, Q&A, Aufgaben, Aktivitätslog und Deal-Status-Übergängen.
 * Der CRM-Status wird AUS dem Zustandsautomaten gelesen — kein Doppelpflegen.
 */
export default function DealCrmModal({ project, onClose, onChanged }) {
  const [dealStatus, setDealStatus] = useState(project.deal_status || 'teaser_live');
  const [interests, setInterests] = useState([]);
  const [perms, setPerms] = useState({});       // buyer_id → { dataroom, qa }
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});   // qId → Text
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', due_date: '' });
  const [activity, setActivity] = useState([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [ints, qs, ts, act] = await Promise.all([
        api.get(`/admin/projects/${project.id}/interests`),
        api.get(`/projects/${project.id}/questions`),
        api.get(`/admin/tasks?project_id=${project.id}`),
        api.get(`/admin/projects/${project.id}/activity`),
      ]);
      setInterests(ints); setQuestions(qs); setTasks(ts); setActivity(act);
      // Rechte je Datenraum-Interessent laden
      const permEntries = {};
      for (const i of ints.filter(i => ['dataroom_granted', 'loi'].includes(i.stage))) {
        try { permEntries[i.buyer_id] = await api.get(`/admin/projects/${project.id}/permissions/${i.buyer_id}`); } catch { /* ignore */ }
      }
      setPerms(permEntries);
    } catch (e) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, [project.id]);

  const changeStatus = async (to) => {
    try {
      await api.put(`/admin/projects/${project.id}/deal-status`, { deal_status: to });
      setDealStatus(to);
      onChanged && onChanged();
    } catch (e) { setMsg(e.message); }
  };

  const changePerm = async (buyerId, field, value) => {
    const current = perms[buyerId] || { dataroom: 'download', qa: true };
    const next = { ...current, [field]: value };
    setPerms(prev => ({ ...prev, [buyerId]: next }));
    try { await api.put(`/admin/projects/${project.id}/permissions/${buyerId}`, next); }
    catch (e) { setMsg(e.message); }
  };

  const answerQuestion = async (qId) => {
    const text = answers[qId];
    if (!text || !text.trim()) return;
    try {
      await api.put(`/admin/questions/${qId}/answer`, { answer: text });
      setAnswers(prev => ({ ...prev, [qId]: '' }));
      setQuestions(await api.get(`/projects/${project.id}/questions`));
    } catch (e) { setMsg(e.message); }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      await api.post('/admin/tasks', { ...newTask, project_id: project.id });
      setNewTask({ title: '', due_date: '' });
      setTasks(await api.get(`/admin/tasks?project_id=${project.id}`));
    } catch (e) { setMsg(e.message); }
  };

  const toggleTask = async (t) => {
    try {
      await api.put(`/admin/tasks/${t.id}`, { status: t.status === 'open' ? 'done' : 'open' });
      setTasks(await api.get(`/admin/tasks?project_id=${project.id}`));
    } catch (e) { setMsg(e.message); }
  };

  const isOverdue = (t) => t.status === 'open' && t.due_date && new Date(t.due_date) <= new Date();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.75rem', width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, color: C.text, margin: 0, fontSize: '1.1rem' }}>Deal-CRM: {project.codename}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>

        {msg && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.5rem 0.8rem', marginBottom: '0.9rem', fontSize: '0.8rem', color: '#991b1b' }}>{msg}</div>}

        {/* Deal-Status (Zustandsautomat) */}
        <Section title="DEAL-STATUS (ZUSTANDSAUTOMAT)">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ background: C.navy, color: '#fff', padding: '0.3rem 0.8rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
              {DEAL_STATUS_LABELS[dealStatus] || dealStatus}
            </span>
            <span style={{ color: C.muted, fontSize: '0.75rem' }}>→</span>
            {(DEAL_TRANSITIONS[dealStatus] || []).map(to => (
              <button key={to} onClick={() => changeStatus(to)} style={{ padding: '0.3rem 0.7rem', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: C.navy }}>
                {DEAL_STATUS_LABELS[to]}
              </button>
            ))}
            {(DEAL_TRANSITIONS[dealStatus] || []).length === 0 && <span style={{ color: C.muted, fontSize: '0.75rem' }}>Endzustand</span>}
          </div>
        </Section>

        {/* Interessenten + granulare Rechte */}
        <Section title={`INTERESSENTEN (${interests.length})`}>
          {interests.length === 0 && <div style={{ fontSize: '0.8rem', color: C.muted }}>Noch keine Interessenten.</div>}
          {interests.map(i => (
            <div key={i.id} style={{ padding: '0.5rem 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
                <span><strong>{i.buyer_name}</strong> <span style={{ color: C.muted }}>({i.buyer_company || i.buyer_email})</span></span>
                <span style={{ background: i.stage === 'rejected' ? '#fee2e2' : '#EDF4FA', color: i.stage === 'rejected' ? '#991b1b' : C.navy, padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                  {STAGE_LABELS[i.stage] || i.stage}
                </span>
              </div>
              {['dataroom_granted', 'loi'].includes(i.stage) && perms[i.buyer_id] && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.75rem', color: C.muted }}>
                  <span>Datenraum:</span>
                  <select value={perms[i.buyer_id].dataroom} onChange={e => changePerm(i.buyer_id, 'dataroom', e.target.value)} style={{ ...INPUT, padding: '0.25rem 0.4rem' }}>
                    <option value="download">Lesen + Download</option>
                    <option value="read">Nur lesen</option>
                    <option value="none">Gesperrt</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!perms[i.buyer_id].qa} onChange={e => changePerm(i.buyer_id, 'qa', e.target.checked)} />
                    Q&A erlaubt
                  </label>
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* Q&A */}
        <Section title={`Q&A (${questions.filter(q => q.status === 'open').length} offen)`}>
          {questions.length === 0 && <div style={{ fontSize: '0.8rem', color: C.muted }}>Noch keine Fragen.</div>}
          {questions.map(q => (
            <div key={q.id} style={{ padding: '0.5rem 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '0.82rem' }}>
                <strong>{q.buyer_name}</strong> <span style={{ color: C.muted, fontSize: '0.72rem' }}>{new Date(q.asked_at).toLocaleString('de-DE')}</span>
                <div style={{ margin: '0.25rem 0' }}>{q.question}</div>
              </div>
              {q.status === 'answered' ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#166534' }}>
                  {q.answer}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                  <input value={answers[q.id] || ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} placeholder="Antwort verfassen…" style={{ ...INPUT, flex: 1 }} />
                  <button onClick={() => answerQuestion(q.id)} style={{ padding: '0.4rem 0.9rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                    Antworten
                  </button>
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* Aufgaben */}
        <Section title={`AUFGABEN (${tasks.filter(t => t.status === 'open').length} offen)`}>
          {tasks.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.82rem' }}>
              <input type="checkbox" checked={t.status === 'done'} onChange={() => toggleTask(t)} style={{ cursor: 'pointer' }} />
              <span style={{ flex: 1, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? C.muted : C.text }}>
                {t.title}
              </span>
              {t.due_date && (
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isOverdue(t) ? '#c00' : C.muted }}>
                  fällig {new Date(t.due_date).toLocaleDateString('de-DE')}{isOverdue(t) ? ' ⚠' : ''}
                </span>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Neue Aufgabe…" style={{ ...INPUT, flex: 1 }} />
            <input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} style={INPUT} />
            <button onClick={addTask} style={{ padding: '0.4rem 0.9rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>+</button>
          </div>
        </Section>

        {/* Aktivität */}
        <Section title="LETZTE AKTIVITÄTEN">
          {activity.slice(0, 12).map((a, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.2rem 0', color: C.muted }}>
              <span><strong style={{ color: C.text }}>{a.actor_name || 'System'}</strong> · {a.action}</span>
              <span>{new Date(a.ts).toLocaleString('de-DE')}</span>
            </div>
          ))}
          {activity.length === 0 && <div style={{ fontSize: '0.8rem', color: C.muted }}>Keine Einträge.</div>}
        </Section>
      </div>
    </div>
  );
}
