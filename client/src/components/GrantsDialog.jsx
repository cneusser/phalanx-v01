// Einzelfreigaben für ein Safe-Objekt (v0.393).
//
// Damit werden vertrauliche Bereiche (Clean Team) gezielt geöffnet: für eine
// bestimmte Person, für einen Käufertyp, für eine Gruppe oder für alle
// Beteiligten, wahlweise nur zum Ansehen oder mit Download. Eine Freigabe auf
// einen Ordner gilt auch für alles darunter.
import React, { useCallback, useEffect, useState } from 'react';
import { X, Trash2, Lock, Eye, Download } from 'lucide-react';
import { api } from '../api/client';

const TYPEN = [
  ['user', 'Einzelne Person'],
  ['buyer_group', 'Käufertyp'],
  ['group', 'Gruppe'],
  ['party_all', 'Alle Beteiligten des Mandats'],
];

export default function GrantsDialog({ projectId, item, C, onClose, onChanged }) {
  const [daten, setDaten] = useState(null);
  const [typ, setTyp] = useState('user');
  const [ref, setRef] = useState('');
  const [stufe, setStufe] = useState('read');
  const [msg, setMsg] = useState(null);
  const [fehler, setFehler] = useState(null);
  const [busy, setBusy] = useState(false);

  const laden = useCallback(async () => {
    setFehler(null);
    try { setDaten(await api.get(`/safe/${projectId}/item/${item.id}/grants`)); }
    catch (e) { setFehler(e.message); }
  }, [projectId, item.id]);
  useEffect(() => { laden(); }, [laden]);

  // Beim Wechsel des Empfängertyps die Auswahl zurücksetzen.
  useEffect(() => { setRef(''); }, [typ]);

  async function hinzufuegen() {
    if (typ !== 'party_all' && !ref) { setFehler('Bitte einen Empfänger auswählen.'); return; }
    setBusy(true); setFehler(null); setMsg(null);
    try {
      await api.post(`/safe/${projectId}/item/${item.id}/grants`, { subject_type: typ, subject_ref: ref || null, level: stufe });
      setMsg('Freigabe gesetzt.');
      setRef('');
      await laden();
      if (onChanged) onChanged();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  }

  async function entfernen(g) {
    if (!window.confirm('Diese Freigabe entfernen?')) return;
    try {
      await api.del(`/safe/${projectId}/item/${item.id}/grants/${g.id}`);
      await laden();
      if (onChanged) onChanged();
    } catch (e) { setFehler(e.message); }
  }

  const bezeichnung = (g) => {
    if (g.subject_type === 'party_all') return 'Alle Beteiligten des Mandats';
    if (g.subject_type === 'user') return g.user_name ? `${g.user_name} (${g.user_email})` : `Person #${g.subject_ref}`;
    if (g.subject_type === 'group') return g.group_name ? `Gruppe „${g.group_name}"` : `Gruppe #${g.subject_ref}`;
    if (g.subject_type === 'buyer_group') {
      const t = (daten?.buyer_groups || []).find((b) => b[0] === g.subject_ref);
      return `Käufertyp: ${t ? t[1] : g.subject_ref}`;
    }
    return g.subject_type;
  };

  const auswahl = () => {
    if (typ === 'party_all') return <p style={{ fontSize: '0.78rem', color: C.muted, margin: 0 }}>Gilt für alle Interessenten dieses Mandats, die nicht abgelehnt wurden.</p>;
    const opts = typ === 'user' ? (daten?.parties || []).map((p) => [String(p.id), `${p.name} (${p.email})`])
      : typ === 'group' ? (daten?.groups || []).map((g) => [String(g.id), `${g.name} (${g.members} Mitglied(er))`])
        : (daten?.buyer_groups || []).map((b) => [b[0], b[1]]);
    if (!opts.length) {
      return <p style={{ fontSize: '0.78rem', color: '#b45309', margin: 0 }}>
        {typ === 'user' ? 'Für dieses Mandat sind noch keine Interessenten erfasst.' : 'Noch keine Gruppen angelegt.'}
      </p>;
    }
    return (
      <select value={ref} onChange={(e) => setRef(e.target.value)} style={{ width: '100%', padding: '0.45rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.83rem' }}>
        <option value="">Bitte wählen …</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 620, maxHeight: '86vh', overflowY: 'auto', padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.9rem' }}>
          <div>
            <strong style={{ color: C.navy, fontSize: '1rem' }}>Freigaben für „{item.name}"</strong>
            <div style={{ fontSize: '0.78rem', color: C.muted, marginTop: 2 }}>
              {item.is_folder ? 'Ordner' : 'Datei'}
              {item.confidential && <span style={{ marginLeft: 8, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>Clean Team</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={20} /></button>
        </div>

        {!item.confidential && (
          <p style={{ background: '#eff6ff', color: '#1e40af', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.79rem', margin: '0 0 0.9rem' }}>
            Dieses Objekt ist nicht als vertraulich gekennzeichnet. Freigegebene Käufer sehen es ohnehin. Einzelfreigaben wirken vor allem bei vertraulichen Bereichen.
          </p>
        )}

        {fehler && <p style={{ background: '#fef2f2', color: '#991b1b', borderRadius: 8, padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>{fehler}</p>}
        {msg && <p style={{ background: '#f0fdf4', color: '#166534', borderRadius: 8, padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>{msg}</p>}

        {/* Bestehende Freigaben */}
        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ fontSize: '0.74rem', color: C.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Bestehende Freigaben</div>
          {!daten ? <p style={{ fontSize: '0.82rem', color: C.muted }}>Laden…</p>
            : daten.grants.length === 0 ? <p style={{ fontSize: '0.82rem', color: C.muted }}>Noch keine Freigabe erteilt.</p>
              : (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  {daten.grants.map((g) => (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ flex: 1, fontSize: '0.83rem', color: C.text }}>{bezeichnung(g)}</div>
                      <span title={g.level === 'download' ? 'Ansehen und herunterladen' : 'Nur ansehen'}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: g.level === 'download' ? '#dcfce7' : '#e0f2fe', color: g.level === 'download' ? '#166534' : '#0369a1', borderRadius: 20, padding: '2px 9px', fontSize: '0.7rem', fontWeight: 700 }}>
                        {g.level === 'download' ? <Download size={10} /> : <Eye size={10} />}
                        {g.level === 'download' ? 'laden' : 'ansehen'}
                      </span>
                      <button onClick={() => entfernen(g)} title="Freigabe entfernen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', display: 'flex' }}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
        </div>

        {/* Neue Freigabe */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.8rem' }}>
          <div style={{ fontSize: '0.74rem', color: C.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.6rem' }}>Freigabe erteilen</div>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: C.muted, marginBottom: 3 }}>Empfänger</label>
              <select value={typ} onChange={(e) => setTyp(e.target.value)} style={{ width: '100%', padding: '0.45rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.83rem' }}>
                {TYPEN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>{auswahl()}</div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: C.muted, marginBottom: 3 }}>Umfang</label>
              <select value={stufe} onChange={(e) => setStufe(e.target.value)} style={{ width: '100%', padding: '0.45rem', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: '0.83rem' }}>
                <option value="read">Nur ansehen (Vorschau mit Wasserzeichen)</option>
                <option value="download">Ansehen und herunterladen</option>
              </select>
            </div>
            <button onClick={hinzufuegen} disabled={busy}
              style={{ background: busy ? '#9ca3af' : C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Bitte warten…' : 'Freigabe erteilen'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.73rem', color: C.muted, marginTop: '0.9rem', marginBottom: 0 }}>
          <Lock size={11} style={{ verticalAlign: -1 }} /> Eine Freigabe auf einen Ordner gilt auch für alles darunter. Wird nur eine einzelne Datei tief im vertraulichen Bereich freigegeben, öffnet sich genau der Weg dorthin, die übrigen Objekte bleiben verborgen.
        </p>
      </div>
    </div>
  );
}
