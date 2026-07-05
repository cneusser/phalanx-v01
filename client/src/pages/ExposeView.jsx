import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getToken } from '../api/client';
import { ChevronLeft, Download, Lock } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const eur = (n) => (Math.round(Number(n) || 0)).toLocaleString('de-DE') + ' €';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const KF = [['country', 'Land'], ['region', 'Region'], ['industries', 'Branche(n)'], ['founding_year', 'Gründungsjahr'], ['legal_form', 'Rechtsform'], ['employees', 'Mitarbeiter'], ['locations', 'Standorte'], ['revenue_band', 'Umsatzband'], ['ebit_band', 'Operatives Ergebnis'], ['gf_availability', 'GF-Verfügbarkeit'], ['stake_offered', 'Abzugebender Anteil'], ['participation_type', 'Beteiligungsart'], ['price_band', 'Preisvorstellung'], ['purchase_modalities', 'Kaufpreismodalitäten']];

function GalleryImg({ pid, safeId }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { let u, alive = true; fetch(`/api/exposes/${pid}/image/${safeId}`, { headers: authHeaders() }).then(r => r.ok ? r.blob() : null).then(b => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u); } }).catch(() => {}); return () => { alive = false; if (u) URL.revokeObjectURL(u); }; }, [pid, safeId]);
  return url ? <img src={url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}` }} /> : <div style={{ height: 160, background: C.bg, borderRadius: 8 }} />;
}

export default function ExposeView() {
  const { id: pid } = useParams();
  const [data, setData] = useState(null);
  const [hero, setHero] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | locked | error
  const [err, setErr] = useState('');
  const [pdfMsg, setPdfMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api.get(`/exposes/${pid}`);
      setData(d);
      if (d.expose.hero_image_id) { fetch(`/api/exposes/${pid}/image/${d.expose.hero_image_id}`, { headers: authHeaders() }).then(r => r.ok ? r.blob() : null).then(b => { if (b) setHero(URL.createObjectURL(b)); }).catch(() => {}); }
      setState('ok');
    } catch (e) { if ((e.message || '').includes('NDA') || (e.message || '').includes('Zugriff')) setState('locked'); else { setErr(e.message); setState('error'); } }
  }, [pid]);
  useEffect(() => { load(); }, [load]);

  async function downloadPdf() {
    setPdfMsg('PDF wird erstellt…');
    try {
      const res = await fetch(`/api/exposes/${pid}/pdf`, { headers: authHeaders() });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `Fehler ${res.status}`); }
      const b = await res.blob(); const u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = u; a.download = `Expose_${data?.project?.codename || pid}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
      setPdfMsg('');
    } catch (e) { setPdfMsg('PDF-Fehler: ' + e.message); }
  }

  if (state === 'loading') return <div style={{ padding: '4rem', textAlign: 'center', color: C.muted }}>Wird geladen…</div>;
  if (state === 'locked') return (
    <div style={{ maxWidth: 620, margin: '4rem auto', padding: '2rem', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <Lock size={28} color={C.muted} style={{ marginBottom: 12 }} />
      <h2 style={{ color: C.navy, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Exposé erst nach NDA verfügbar</h2>
      <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: '1.25rem' }}>Das vollständige Exposé wird nach unterzeichneter Vertraulichkeitsvereinbarung freigeschaltet.</p>
      <Link to={`/projekte/${pid}`} style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>Zum Mandat & NDA anfordern →</Link>
    </div>
  );
  if (state === 'error') return <div style={{ padding: '4rem', textAlign: 'center', color: '#991b1b' }}>Fehler: {err}</div>;

  const { expose, project, corridor, can_manage } = data;
  const facts = KF.filter(([k]) => expose.keyfacts && String(expose.keyfacts[k] || '').trim() !== '');
  const activeSections = (expose.sections || []).filter(s => s.enabled && String(s.body || '').trim());
  const gallery = expose.gallery || [];

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to={`/projekte/${pid}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={14} /> Zum Mandat</Link>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {can_manage && expose.status !== 'published' && <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>VORSCHAU (ENTWURF)</span>}
              <button onClick={downloadPdf} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.steel, color: C.navy, border: 'none', borderRadius: 7, padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}><Download size={14} /> PDF</button>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: '1rem' }}>Vertrauliches Unternehmens-Exposé</div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: 4 }}>{project?.codename}</h1>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.5rem 4rem' }}>
        {pdfMsg && <div style={{ background: pdfMsg.includes('Fehler') ? '#fee2e2' : '#eff6ff', border: `1px solid ${pdfMsg.includes('Fehler') ? '#fca5a5' : '#bfdbfe'}`, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: pdfMsg.includes('Fehler') ? '#991b1b' : C.accent }}>{pdfMsg}</div>}

        {facts.length === 0 && activeSections.length === 0 && gallery.length === 0 && !(corridor && corridor.base) ? (
          <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>Dieses Exposé hat noch keine Inhalte</div>
            {can_manage
              ? <div style={{ fontSize: '0.88rem', color: C.muted }}>Befüllen Sie Eckdaten, Sektionen und Bilder im <Link to={`/mandat/${pid}/expose`} style={{ color: C.accent, fontWeight: 600 }}>Exposé-Editor</Link>.</div>
              : <div style={{ fontSize: '0.88rem', color: C.muted }}>Das Exposé wird derzeit vorbereitet und in Kürze verfügbar sein.</div>}
          </div>
        ) : null}

        {hero && <img src={hero} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 12, marginBottom: '1.5rem', border: `1px solid ${C.border}` }} />}

        {/* Keyfacts */}
        {facts.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.9rem' }}>Eckdaten</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
              {facts.map(([k, l]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', background: C.bg, borderRadius: 7, padding: '0.5rem 0.7rem' }}>
                  <span style={{ fontSize: '0.72rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{l}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, textAlign: 'right' }}>{expose.keyfacts[k]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {corridor && corridor.base && (
          <div style={{ background: C.navy, color: '#fff', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Indikative Kaufpreisvorstellung (Enterprise Value)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{eur(corridor.conservative)} – {eur(corridor.optimistic)}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Basis {eur(corridor.base)} · indikativ, kein IDW-S1-Gutachten</div>
          </div>
        )}

        {/* Sektionen */}
        {activeSections.map(s => (
          <div key={s.key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, color: C.navy, fontSize: '1.02rem', marginBottom: '0.5rem' }}>{s.title}</div>
            <div style={{ fontSize: '0.9rem', color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.body}</div>
          </div>
        ))}

        {/* Galerie */}
        {gallery.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.9rem' }}>Impressionen</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {gallery.map(sid => <GalleryImg key={sid} pid={pid} safeId={sid} />)}
            </div>
          </div>
        )}

        <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '1.5rem', lineHeight: 1.5 }}>
          Vertraulich — ausschließlich für den benannten Empfänger. Weitergabe an Dritte ohne schriftliche Zustimmung untersagt. Angaben ohne Gewähr; keine Anlage-, Rechts- oder Steuerberatung.
        </div>
      </div>
    </div>
  );
}
