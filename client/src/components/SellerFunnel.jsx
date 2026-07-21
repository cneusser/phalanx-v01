import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

// Reduzierter, nur-lesender Funnel für den Mandanten (Verkäufer). Zeigt je Mandat,
// wie weit die interessierten Parteien im Prozess sind, aber bewusst OHNE
// Kontaktdaten und ohne Bezug zu anderen Mandaten. Mehrere Projekte als Reiter.
const C = { navy: '#1A4D8A', steel: '#29ABE2', lightBg: '#EBF7FC', gray: '#64748B', border: '#C8E4F4', bg: '#F8FAFC', card: '#FFFFFF' };

export default function SellerFunnel({ projects = [], show }) {
  const active = projects.filter(p => p.status === 'active');
  const [pid, setPid] = useState(null);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!pid && active.length) setPid(active[0].id); }, [active, pid]);
  useEffect(() => {
    if (!pid) return;
    let alive = true; setBusy(true);
    api.get(`/projects/${pid}/funnel-preview`)
      .then(d => { if (alive) setData(d); })
      .catch(e => show && show('Prozessstand nicht verfügbar: ' + e.message))
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [pid, show]);

  if (!active.length) return null;

  const stages = data?.stages || [];
  const parties = data?.parties || [];
  const counts = data?.counts || {};
  const reached = {}; stages.forEach(s => { reached[s.key] = parties.filter(p => p.funnel_stage >= s.key).length; });

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ fontWeight: 800, color: C.navy, fontSize: '1.15rem', marginBottom: '0.3rem' }}>Prozessstand Ihrer Mandate</h2>
      <p style={{ fontSize: '0.82rem', color: C.gray, marginBottom: '1rem' }}>
        Sie sehen die interessierten Parteien und wie weit sie im Prozess sind. Aus Vertraulichkeitsgründen zeigen wir keine Kontaktdaten.
      </p>

      {/* Mandats-Reiter */}
      {active.length > 1 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {active.map(p => (
            <button key={p.id} onClick={() => setPid(p.id)} style={{
              padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${pid === p.id ? C.navy : C.border}`, background: pid === p.id ? C.navy : '#fff', color: pid === p.id ? '#fff' : C.gray,
            }}>{p.codename}</button>
          ))}
        </div>
      )}

      {busy && !data && <div style={{ color: C.gray, fontSize: '0.85rem' }}>Wird geladen…</div>}

      {data && (
        <>
          {/* Kennzahlen je Stufe: die ganze Prozesskette bleibt in EINER Zeile.
              Auf schmalen Bildschirmen wird die Zeile waagerecht scrollbar, statt
              umzubrechen: so bleibt die Reihenfolge der Stufen immer lesbar. */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${stages.length || 1}, minmax(78px, 1fr))`,
            gap: '0.35rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.2rem',
          }}>
            {stages.map(s => {
              const r = reached[s.key] || 0;
              const prev = s.key > 0 ? (reached[s.key - 1] || 0) : null;
              const conv = prev ? Math.round((r / Math.max(prev, 1)) * 100) : null;
              return (
                <div key={s.key} title={s.label}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.45rem 0.3rem', textAlign: 'center', minWidth: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: r > 0 ? C.navy : C.gray, lineHeight: 1.2 }}>{r}</div>
                  <div style={{ fontSize: '0.58rem', color: C.gray, fontWeight: 600, lineHeight: 1.25, hyphens: 'auto', overflowWrap: 'anywhere' }}>{s.label}</div>
                  {conv !== null && <div style={{ fontSize: '0.58rem', color: conv >= 50 ? '#059669' : conv >= 25 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{conv}%</div>}
                </div>
              );
            })}
          </div>

          {/* Spalten (nur lesen, nur Namen) */}
          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {stages.map(s => {
              const cards = parties.filter(p => p.funnel_stage === s.key);
              return (
                <div key={s.key} style={{ minWidth: 190, flex: '1 0 190px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.navy }}>{s.label}</span>
                    <span style={{ fontSize: '0.72rem', color: C.gray }}>{counts[s.key] || 0}</span>
                  </div>
                  {!cards.length && <div style={{ fontSize: '0.68rem', color: '#cbd5e1', textAlign: 'center', padding: '0.6rem 0' }}>k. A.</div>}
                  {cards.map((p, i) => (
                    <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.45rem 0.55rem', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.active ? '#10b981' : '#cbd5e1', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: C.navy }}>{p.name}</span>
                      </div>
                      {p.company && <div style={{ fontSize: '0.68rem', color: C.gray, marginLeft: 13 }}>{p.company}</div>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
