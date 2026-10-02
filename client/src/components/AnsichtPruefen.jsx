/**
 * Ansicht prüfen: Was sehen andere auf dem Marktplatz? (v0.444)
 *
 * Anlass: „Ich möchte sehen, was die wirklich sehen."
 *
 * Zwei Wege, und der Unterschied zwischen ihnen ist der Kern dieser Datei:
 *
 *   1. Als nicht angemeldeter Besucher. Das ist für alle gleich, deshalb lässt
 *      es sich ohne Umweg zeigen: Das Token bleibt liegen, wird aber nicht
 *      mitgeschickt, und der Server antwortet wie einem fremden Besucher.
 *
 *   2. Als eine bestimmte Person. Dafür gibt es die Birdview.
 *
 * Was es bewusst NICHT gibt: eine Ansicht „als Käufer". Was ein Käufer sieht,
 * hängt nicht an seiner Rolle, sondern daran, ob er die Vertraulichkeits-
 * vereinbarung unterschrieben hat, ob sein Datenraum freigegeben ist und
 * welche Einzelfreigaben er hat. Zwei Käufer sehen Verschiedenes. Eine
 * gespielte Rolle würde also eine Auskunft geben, die niemandem entspricht,
 * und das Gegenteil dessen leisten, wozu diese Funktion da ist.
 */
import React, { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ROLLEN = [
  ['', 'Alle Rollen'],
  ['buyer', 'Käufer'],
  ['seller', 'Verkäufer'],
  ['advisor', 'Berater'],
  ['assistant', 'Assistenz'],
  ['analyst', 'Analyst'],
];

const ROLLE_TEXT = {
  buyer: 'Käufer', seller: 'Verkäufer', advisor: 'Berater',
  assistant: 'Assistenz', analyst: 'Analyst', tenant_owner: 'Inhaber',
  super_admin: 'Administrator',
};

export default function AnsichtPruefen({ C }) {
  const { user, startBirdview, starteGastansicht } = useAuth();
  const [offen, setOffen] = useState(false);
  const [rolle, setRolle] = useState('buyer');
  const [leute, setLeute] = useState(null);
  const [fehler, setFehler] = useState('');

  const istAdmin = user && ['super_admin', 'advisor', 'tenant_owner'].includes(user.role);
  if (!istAdmin) return null;

  async function lade(r) {
    setRolle(r); setLeute(null); setFehler('');
    try { setLeute(await api.get(`/admin/birdview/nutzer${r ? `?rolle=${r}` : ''}`) || []); }
    catch (e) { setFehler(e.message); }
  }

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: offen ? '0.9rem 1.1rem' : '0.5rem 0.9rem', marginBottom: '1rem', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: C.navy }}>
          <Eye size={15} /> Ansicht prüfen
        </span>
        <button onClick={() => { setOffen((v) => !v); if (!offen && !leute) lade(rolle); }}
          style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.3rem 0.8rem', fontSize: '0.76rem', fontWeight: 600, color: C.navy, cursor: 'pointer' }}>
          {offen ? 'Schließen' : 'Öffnen'}
        </button>
      </div>

      {offen && (
        <div style={{ marginTop: '0.8rem' }}>
          <p style={{ fontSize: '0.8rem', color: C.muted, lineHeight: 1.6, margin: '0 0 0.8rem' }}>
            Hier sehen Sie den Marktplatz mit fremden Augen. Es wird nichts nachgebaut: In beiden Fällen
            antwortet der Server so, wie er es dem anderen gegenüber täte.
          </p>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.85rem', marginBottom: '0.8rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: 3 }}>Als nicht angemeldeter Besucher</div>
            <div style={{ fontSize: '0.76rem', color: C.muted, lineHeight: 1.55, marginBottom: '0.5rem' }}>
              Ihr Zugang bleibt bestehen, wird aber nicht mitgeschickt. Die Ansicht endet, sobald Sie sie
              beenden oder das Fenster schließen.
            </div>
            <button onClick={starteGastansicht}
              style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 7, padding: '0.35rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
              Als Besucher ansehen
            </button>
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.7rem 0.85rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: 3 }}>Als eine bestimmte Person</div>
            <div style={{ fontSize: '0.76rem', color: C.muted, lineHeight: 1.55, marginBottom: '0.6rem' }}>
              Eine Ansicht „als Käufer" gibt es bewusst nicht. Was ein Käufer sieht, hängt nicht an seiner
              Rolle, sondern an unterschriebener Vereinbarung, Datenraum-Freigabe und Einzelfreigaben. Zwei
              Käufer sehen Verschiedenes, deshalb wird hier eine Person gewählt.
            </div>
            <select value={rolle} onChange={(e) => lade(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              {ROLLEN.map(([w, l]) => <option key={w} value={w}>{l}</option>)}
            </select>

            {fehler && <div style={{ fontSize: '0.78rem', color: '#991b1b' }}>{fehler}</div>}
            {!leute && !fehler && <div style={{ fontSize: '0.78rem', color: C.muted }}>Wird geladen…</div>}
            {leute && leute.length === 0 && <div style={{ fontSize: '0.78rem', color: C.muted }}>Niemand mit dieser Rolle.</div>}

            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {(leute || []).map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderTop: `1px solid ${C.border}`, padding: '0.45rem 0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.navy }}>
                      {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}
                      <span style={{ fontWeight: 400, color: C.muted }}> · {ROLLE_TEXT[p.role] || p.role}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: C.muted }}>
                      {p.company ? `${p.company} · ` : ''}
                      {p.mandate} Mandat{p.mandate === 1 ? '' : 'e'}
                      {p.datenraeume > 0 ? `, davon ${p.datenraeume} mit Datenraum` : ''}
                    </div>
                  </div>
                  <button onClick={() => startBirdview(p.id)}
                    style={{ flexShrink: 0, background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    Ansehen
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Der Hinweisbalken während einer Gastansicht, samt Weg zurück. */
export function GastBalken() {
  const { gastansicht, beendeGastansicht } = useAuth();
  if (!gastansicht) return null;
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 1300, background: '#92400e', color: '#fff',
      padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap',
    }}>
      <span>Sie sehen die Seite gerade so, wie sie ein nicht angemeldeter Besucher sieht.</span>
      <button onClick={beendeGastansicht}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 7, padding: '0.2rem 0.7rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
        <X size={12} /> Ansicht beenden
      </button>
    </div>
  );
}
