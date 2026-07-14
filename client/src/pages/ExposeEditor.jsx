import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getToken } from '../api/client';
import { ChevronLeft, Save, Eye, Download, Upload as UploadIcon, CheckCircle, Image as ImageIcon, Globe } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.5rem 0.65rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' };
const LABEL = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: C.muted, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' };
const eur = (n) => (Math.round(Number(n) || 0)).toLocaleString('de-DE') + ' €';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const KEYFACTS = [
  ['country', 'Land'], ['region', 'Region'], ['industries', 'Branche(n)'], ['founding_year', 'Gründungsjahr'],
  ['legal_form', 'Rechtsform'], ['employees', 'Mitarbeiter'], ['locations', 'Standorte'], ['revenue_band', 'Umsatzband'],
  ['ebit_band', 'Operatives Ergebnis'], ['gf_availability', 'GF-Verfügbarkeit'], ['stake_offered', 'Abzugebender Anteil'],
  ['participation_type', 'Beteiligungsart'], ['price_band', 'Preisvorstellung'], ['purchase_modalities', 'Kaufpreismodalitäten'],
];
const ANON_CHECKS = [
  'Keine Firmennamen, Marken oder Logos in Texten und Bildern',
  'Keine Klarnamen von Personen',
  'Keine exakte Adresse (nur Region/Bundesland)',
  'Keine eindeutig identifizierenden Alleinstellungsmerkmale',
];

function SafeThumb({ pid, safeId, size = 64, selected }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { let u, alive = true; fetch(`/api/exposes/${pid}/image/${safeId}`, { headers: authHeaders() }).then(r => r.ok ? r.blob() : null).then(b => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u); } }).catch(() => {}); return () => { alive = false; if (u) URL.revokeObjectURL(u); }; }, [pid, safeId]);
  return <div style={{ width: size, height: size, borderRadius: 6, border: `2px solid ${selected ? C.steel : C.border}`, overflow: 'hidden', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={18} color={C.muted} />}</div>;
}

export default function ExposeEditor() {
  const { id: pid } = useParams();
  const [project, setProject] = useState(null);
  const [keyfacts, setKeyfacts] = useState({});
  const [sections, setSections] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [heroId, setHeroId] = useState(null);
  const [safeImages, setSafeImages] = useState([]);
  const [corridor, setCorridor] = useState(null);
  const [status, setStatus] = useState('draft');
  const [ack, setAck] = useState(false);
  const [checks, setChecks] = useState({});
  const [saved, setSaved] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [pdfItemId, setPdfItemId] = useState(null);   // hochgeladenes Exposé-PDF (im Safe)
  const [pdfBusy, setPdfBusy] = useState(false);
  const dirty = useRef(false); const timer = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get(`/exposes/${pid}`);
      setProject(d.project); setCorridor(d.corridor); setStatus(d.expose.status);
      setKeyfacts(d.expose.keyfacts || {}); setSections(d.expose.sections || []);
      setGallery(d.expose.gallery || []); setHeroId(d.expose.hero_image_id || null);
      setAck(!!d.expose.anonymized_ack); setSafeImages(d.safeImages || []);
      setPdfItemId(d.expose.pdf_item_id || null);
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setLoading(false); }
  }, [pid]);
  useEffect(() => { load(); }, [load]);

  // Autosave (debounce)
  const scheduleSave = useCallback((next) => {
    dirty.current = true; setSaved('Ungespeichert…');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await api.put(`/exposes/${pid}`, { keyfacts: next.keyfacts ?? keyfacts, sections: next.sections ?? sections, gallery: next.gallery ?? gallery, hero_image_id: next.heroId !== undefined ? next.heroId : heroId, anonymized_ack: next.ack !== undefined ? next.ack : ack });
        setSaved('Automatisch gespeichert'); dirty.current = false;
      } catch (e) { setSaved('Fehler beim Speichern'); }
    }, 700);
  }, [pid, keyfacts, sections, gallery, heroId, ack]);

  const setKf = (k, v) => { const next = { ...keyfacts, [k]: v }; setKeyfacts(next); scheduleSave({ keyfacts: next }); };
  const setSec = (i, patch) => { const next = sections.map((s, j) => j === i ? { ...s, ...patch } : s); setSections(next); scheduleSave({ sections: next }); };
  const toggleGallery = (sid) => { const next = gallery.includes(sid) ? gallery.filter(x => x !== sid) : [...gallery, sid]; setGallery(next); scheduleSave({ gallery: next }); };
  const setHero = (sid) => { const v = heroId === sid ? null : sid; setHeroId(v); scheduleSave({ heroId: v }); };

  const allChecked = ANON_CHECKS.every((_, i) => checks[i]);

  async function publish() {
    if (!allChecked) { setMsg('Bitte alle Punkte der Anonymisierungs-Checkliste bestätigen.'); return; }
    setMsg('');
    try { await api.put(`/exposes/${pid}`, { anonymized_ack: true }); await api.post(`/exposes/${pid}/publish`, { anonymized_ack: true }); setStatus('published'); setAck(true); setMsg('Exposé veröffentlicht, jetzt für berechtigte Interessenten (nach NDA) sichtbar.'); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }
  async function unpublish() { try { await api.post(`/exposes/${pid}/unpublish`, {}); setStatus('draft'); setMsg('Exposé zurückgezogen (Entwurf).'); } catch (e) { setMsg('Fehler: ' + e.message); } }
  async function deriveTeaser() {
    if (!window.confirm('Aus dem Exposé die öffentliche Teaser-Karte (Branche, Region, Umsatzband, Kurzbeschreibung, Highlights) aktualisieren? Nur anonymisierte Angaben verwenden.')) return;
    setMsg('');
    try { const d = await api.post(`/exposes/${pid}/derive-teaser`, {}); setMsg(d.message + ` (Branche: ${d.fields.industry || 'k. A.'}, ${d.fields.highlights} Highlights).`); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }
  async function downloadPdf() {
    try { const res = await fetch(`/api/exposes/${pid}/pdf`, { headers: authHeaders() }); if (!res.ok) throw new Error('Fehler'); const b = await res.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `Expose_${project?.codename || pid}.pdf`; a.click(); URL.revokeObjectURL(u); }
    catch (e) { setMsg('PDF-Fehler: ' + e.message); }
  }

  // Fertiges Exposé-PDF in den Safe hochladen: wird dann statt der Generierung ausgeliefert
  async function uploadExposePdf(file) {
    if (!file) return;
    setPdfBusy(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const d = await api.upload(`/exposes/${pid}/pdf-upload`, fd);
      setPdfItemId(d.pdf_item_id);
      setMsg(`Exposé-PDF „${d.name}" hochgeladen: es liegt im Safe und wird ab sofort als Exposé-PDF ausgeliefert.`);
    } catch (e) { setMsg('Upload-Fehler: ' + e.message); }
    finally { setPdfBusy(false); }
  }
  async function removeExposePdf() {
    if (!window.confirm('Hochgeladenes Exposé-PDF entfernen? Das PDF wird danach wieder automatisch aus Eckdaten und Sektionen generiert. Die Datei bleibt im Safe erhalten.')) return;
    setPdfBusy(true);
    try { await api.post(`/exposes/${pid}/pdf-remove`, {}); setPdfItemId(null); setMsg('Hochgeladenes PDF entfernt, das Exposé-PDF wird wieder generiert.'); }
    catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setPdfBusy(false); }
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: C.muted }}>Wird geladen…</div>;

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '1.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Link to="/admin" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={14} /> Admin</Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Exposé-Editor</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 2 }}>{project?.codename || `Mandat #${pid}`}</h1>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{saved}</span>
              <span style={{ background: status === 'published' ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>{status === 'published' ? 'VERÖFFENTLICHT' : 'ENTWURF'}</span>
              <Link to={`/projekte/${pid}/expose`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 7, padding: '0.4rem 0.8rem', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 600 }}><Eye size={14} /> Vorschau</Link>
              <button onClick={downloadPdf} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: C.steel, color: C.navy, border: 'none', borderRadius: 7, padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}><Download size={14} /> PDF</button>
              {/* Fertiges Exposé-PDF hochladen (landet im Safe, ersetzt die Generierung) */}
              {pdfItemId ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.22)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 7, padding: '0.35rem 0.7rem', fontSize: '0.74rem', fontWeight: 700 }}>
                  <CheckCircle size={13} /> PDF hinterlegt
                  <button onClick={removeExposePdf} disabled={pdfBusy} title="Hochgeladenes PDF entfernen" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}>entfernen</button>
                </span>
              ) : (
                <label title="Fertiges Exposé als PDF hochladen (wird im Safe abgelegt)" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 7, padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 600, cursor: pdfBusy ? 'default' : 'pointer', color: '#fff' }}>
                  <UploadIcon size={14} /> {pdfBusy ? 'Wird hochgeladen…' : 'Exposé-PDF hochladen'}
                  <input type="file" accept="application/pdf,.pdf" disabled={pdfBusy} style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; uploadExposePdf(f); }} />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
        {msg && <div style={{ background: msg.includes('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: msg.includes('Fehler') ? '#991b1b' : '#065f46' }}>{msg}</div>}

        {corridor && <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: C.accent }}>Aus der geprüften Bewertung übernommen: Werte-Korridor {eur(corridor.conservative)} – {eur(corridor.optimistic)} (Basis {eur(corridor.base)}), erscheint im Exposé als „Indikative Kaufpreisvorstellung".</div>}

        {/* Keyfacts */}
        <Card title="Eckdaten (DUB-Raster)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {KEYFACTS.map(([k, l]) => (
              <div key={k}><label style={LABEL}>{l}</label><input value={keyfacts[k] || ''} onChange={e => setKf(k, e.target.value)} style={INPUT} placeholder="k. A." /></div>
            ))}
          </div>
        </Card>

        {/* Sektionen */}
        <Card title="Inhaltliche Sektionen">
          <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '0.75rem' }}>Sektionen ein-/ausblenden und ausformulieren. Nur aktivierte Sektionen mit Text erscheinen im Exposé.</div>
          {sections.map((s, i) => (
            <div key={s.key} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.75rem', marginBottom: '0.6rem', opacity: s.enabled ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <input type="checkbox" checked={s.enabled} onChange={e => setSec(i, { enabled: e.target.checked })} />
                <input value={s.title} onChange={e => setSec(i, { title: e.target.value })} style={{ ...INPUT, fontWeight: 700, color: C.navy, flex: 1 }} />
              </div>
              <textarea value={s.body || ''} onChange={e => setSec(i, { body: e.target.value })} rows={3} placeholder="Text der Sektion…" style={{ ...INPUT, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          ))}
        </Card>

        {/* Bilder aus dem Safe */}
        <Card title="Bilder aus dem Container-Safe">
          {safeImages.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: C.muted }}>Keine Bilder im Safe. Laden Sie Bilder im <Link to={`/mandat/${pid}/safe`} style={{ color: C.accent }}>Container-Safe</Link> hoch, dann können Sie hier Titelbild und Galerie wählen.</div>
          ) : (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>TITELBILD & GALERIE: Klick wählt Galerie, Stern-Klick setzt Titelbild</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {safeImages.map(img => (
                  <div key={img.id} style={{ textAlign: 'center' }}>
                    <div onClick={() => toggleGallery(img.id)} style={{ cursor: 'pointer', position: 'relative' }}>
                      <SafeThumb pid={pid} safeId={img.id} selected={gallery.includes(img.id) || heroId === img.id} />
                      <button onClick={e => { e.stopPropagation(); setHero(img.id); }} title="Als Titelbild" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: heroId === img.id ? '#f59e0b' : 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>★</button>
                    </div>
                    <div style={{ fontSize: '0.62rem', color: C.muted, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.5rem' }}>Titelbild: {heroId ? '★ gesetzt' : 'keins'} · Galerie: {gallery.length} Bild(er)</div>
            </>
          )}
        </Card>

        {/* Anonymisierung & Publikation */}
        <Card title="Anonymisierung & Veröffentlichung">
          <div style={{ fontSize: '0.8rem', color: C.text, marginBottom: '0.6rem' }}>Vor der Veröffentlichung bitte bestätigen (das Web-Exposé ist nur nach unterschriebenem NDA sichtbar):</div>
          {ANON_CHECKS.map((c, i) => (
            <label key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.82rem', color: C.text, marginBottom: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!checks[i]} onChange={e => setChecks(s => ({ ...s, [i]: e.target.checked }))} style={{ marginTop: 3 }} /><span>{c}</span>
            </label>
          ))}
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {status !== 'published'
              ? <button onClick={publish} disabled={!allChecked} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.3rem', background: allChecked ? '#166534' : C.border, color: allChecked ? '#fff' : C.muted, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: allChecked ? 'pointer' : 'default' }}><Globe size={15} /> Veröffentlichen</button>
              : <button onClick={unpublish} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.3rem', background: '#fff', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Zurückziehen (Entwurf)</button>}
            {status === 'published' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#166534', fontSize: '0.82rem', fontWeight: 600 }}><CheckCircle size={15} /> Veröffentlicht</span>}
          </div>
        </Card>

        {/* Kurzprofil → öffentliche Teaser-Karte */}
        <Card title="Öffentliche Teaser-Karte">
          <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.75rem' }}>Aus den (anonymisierten) Eckdaten und der Unternehmens-/Stärken-Sektion die öffentliche Marktplatz-Karte befüllen: Branche, Region, Umsatzband, Kurzbeschreibung und Investment-Highlights.</div>
          <button onClick={deriveTeaser} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.1rem', background: '#fff', color: C.navy, border: `1px solid ${C.navy}`, borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer' }}><UploadIcon size={14} /> Öffentlichen Teaser aktualisieren</button>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.95rem', marginBottom: '0.9rem' }}>{title}</div>
      {children}
    </div>
  );
}
