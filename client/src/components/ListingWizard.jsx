import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { X, Check, Lock, Cloud, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import GroupedSelect from './GroupedSelect';
import { NACE_INDUSTRIES, BUNDESLAENDER, DEAL_TYPES_MA, DEAL_TYPES_FUNDRAISING } from '../constants/projectOptions';

// Geführtes Erstellen eines Inserats (DUB-Benchmark, Stufe B).
// Der Entwurf wird früh angelegt (nur der Name genügt), danach speichert der
// Wizard automatisch. Am Ende reicht der Verkäufer zur Prüfung ein.

const C = {
  navy: '#1A4D8A', steel: '#29ABE2', lightBg: '#EBF7FC', xLight: '#F3F8FC',
  gray: '#64748B', border: '#C8E4F4', card: '#FFFFFF', text: '#1E293B',
};
const INPUT = {
  width: '100%', padding: '0.65rem 0.9rem', border: `1px solid ${C.border}`,
  borderRadius: 7, fontSize: '0.875rem', outline: 'none', background: C.xLight, boxSizing: 'border-box',
};
const LBL = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.navy, marginBottom: '0.3rem' };

const STEPS = ['Grundlagen', 'Einordnung', 'Kennzahlen', 'Beschreibung', 'Sichtbarkeit', 'Prüfen'];
const BUYER_GROUPS = [
  ['strategic', 'Strategischer Käufer'], ['financial', 'Finanzinvestor'],
  ['private', 'Privatperson'], ['advisor_mandate', 'M&A-Berater mit Suchmandat'],
];

export default function ListingWizard({ existingId = null, onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState(existingId);
  const [form, setForm] = useState({
    mandate_type: 'ma', codename: '', industry: '', region: '', location_city: '',
    revenue_band: '', ebitda_band: '', deal_type: 'Nachfolge', short_description: '', highlights: [],
    stage: '', investment_needed: '', equity_stake: '', post_money_valuation: '', tam_band: '',
    buyer_groups: [], keywords: '',
  });
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const timer = useRef(null);

  // Bestehenden Entwurf laden
  useEffect(() => {
    if (!existingId) return;
    (async () => {
      try {
        const d = await api.get(`/projects/${existingId}/teaser`);
        setForm(f => ({
          ...f,
          mandate_type: d.mandate_type || 'ma', codename: d.codename || '', industry: d.industry || '',
          region: d.region || '', location_city: d.location_city || '',
          revenue_band: d.revenue_band && d.revenue_band !== 'k. A.' ? d.revenue_band : '',
          ebitda_band: d.ebitda_band && d.ebitda_band !== 'k. A.' ? d.ebitda_band : '',
          deal_type: d.deal_type || 'Nachfolge', short_description: d.short_description || '',
          highlights: Array.isArray(d.highlights) ? d.highlights : [],
          stage: d.stage || '', investment_needed: d.investment_needed || '', equity_stake: d.equity_stake || '',
          post_money_valuation: d.post_money_valuation || '', tam_band: d.tam_band || '',
          buyer_groups: Array.isArray(d.buyer_groups) ? d.buyer_groups : [], keywords: d.keywords || '',
        }));
      } catch (e) { setErr('Entwurf konnte nicht geladen werden: ' + e.message); }
    })();
  }, [existingId]);

  const set = (k) => (e) => { dirty.current = true; setForm(f => ({ ...f, [k]: e.target.value })); };
  const setVal = (k, v) => { dirty.current = true; setForm(f => ({ ...f, [k]: v })); };

  // Autosave: sobald ein Entwurf existiert und etwas geändert wurde
  const saveNow = useCallback(async () => {
    if (!draftId || !dirty.current) return;
    dirty.current = false;
    setSaveState('saving');
    try {
      await api.put(`/projects/${draftId}`, { ...form, highlights: form.highlights });
      setSaveState('saved');
    } catch (e) { setSaveState('error'); setErr('Automatisches Speichern fehlgeschlagen: ' + e.message); }
  }, [draftId, form]);

  useEffect(() => {
    if (!draftId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(saveNow, 1000);
    return () => timer.current && clearTimeout(timer.current);
  }, [form, draftId, saveNow]);

  // Entwurf beim Verlassen von Schritt 1 anlegen (Name genügt)
  async function ensureDraft() {
    if (draftId) return draftId;
    if (!form.codename.trim()) { setErr('Bitte einen Unternehmensnamen oder Codenamen angeben'); return null; }
    setBusy(true); setErr('');
    try {
      const r = await api.post('/projects/my-project', { codename: form.codename.trim(), mandate_type: form.mandate_type });
      setDraftId(r.id);
      return r.id;
    } catch (e) { setErr(e.message); return null; }
    finally { setBusy(false); }
  }

  async function next() {
    setErr('');
    if (step === 0) { const id = await ensureDraft(); if (!id) return; }
    else { await saveNow(); }
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  }
  function back() { setErr(''); setStep(s => Math.max(0, s - 1)); }

  async function submit() {
    setBusy(true); setErr('');
    try {
      await saveNow();
      await api.post(`/projects/${draftId}/submit`, {});
      onDone && onDone('Zur Prüfung eingereicht. Wir prüfen dein Inserat und schalten es frei.');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function saveAndClose() {
    await saveNow();
    onDone && onDone(draftId ? 'Entwurf gespeichert. Du kannst später weitermachen.' : '');
  }

  const isMa = form.mandate_type === 'ma';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 'min(680px, 96vw)', maxHeight: '92vh', overflow: 'auto' }}>
        {/* Kopf */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.4rem', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontWeight: 800, color: C.navy, fontSize: '1.05rem' }}>Inserat erstellen</h2>
            <div style={{ fontSize: '0.72rem', color: C.gray, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={11} /> Privat, bis du einreichst und wir freigeben
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.72rem', color: saveState === 'error' ? '#b91c1c' : C.gray, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Cloud size={12} /> {saveState === 'saving' ? 'Speichert…' : saveState === 'saved' ? 'Automatisch gespeichert' : saveState === 'error' ? 'Nicht gespeichert' : draftId ? 'Bereit' : 'Neu'}
            </span>
            <button onClick={saveAndClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
          </div>
        </div>

        {/* Fortschritt */}
        <div style={{ display: 'flex', gap: 6, padding: '0.9rem 1.4rem', flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700,
              color: i === step ? C.navy : i < step ? '#059669' : '#94a3b8',
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: i === step ? C.navy : i < step ? '#d1fae5' : '#f1f5f9', color: i === step ? '#fff' : i < step ? '#059669' : '#94a3b8', fontSize: '0.68rem',
              }}>{i < step ? <Check size={12} /> : i + 1}</span>
              {s}{i < STEPS.length - 1 && <span style={{ color: '#cbd5e1', marginLeft: 2 }}>›</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: '0.6rem 1.4rem 1.2rem' }}>
          {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.8rem', marginBottom: '0.9rem' }}>{err}</div>}

          {/* Schritt 1: Grundlagen */}
          {step === 0 && (
            <>
              <label style={LBL}>Art des Mandats</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {[['ma', 'M&A / Unternehmensverkauf'], ['fundraising', 'Startup-Finanzierung']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setVal('mandate_type', v)} style={{
                    flex: 1, padding: '0.5rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                    background: form.mandate_type === v ? C.navy : '#f5f5f5', color: form.mandate_type === v ? '#fff' : '#555',
                    border: `1.5px solid ${form.mandate_type === v ? C.navy : '#ddd'}`,
                  }}>{l}</button>
                ))}
              </div>
              <label style={LBL}>Unternehmensname / Codename *</label>
              <input value={form.codename} onChange={set('codename')} placeholder="z. B. Müller GmbH oder Projekt Alpha" style={INPUT} />
              <p style={{ fontSize: '0.75rem', color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
                Der Name ist intern. Für Käufer bleibt das Inserat anonym, bis du die Namensnennung freigibst.
              </p>
            </>
          )}

          {/* Schritt 2: Einordnung */}
          {step === 1 && (
            <>
              <label style={LBL}>Branche (NACE) *</label>
              <div style={{ marginBottom: '0.9rem' }}><GroupedSelect value={form.industry} onChange={set('industry')} groups={NACE_INDUSTRIES} style={INPUT} /></div>
              <label style={LBL}>Region *</label>
              <div style={{ marginBottom: '0.9rem' }}><GroupedSelect value={form.region} onChange={set('region')} groups={BUNDESLAENDER} style={INPUT} /></div>
              <label style={LBL}>Standort (Stadt, optional)</label>
              <input value={form.location_city} onChange={set('location_city')} placeholder="z. B. Nürnberg" style={INPUT} />
            </>
          )}

          {/* Schritt 3: Kennzahlen */}
          {step === 2 && (
            <>
              {isMa ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
                  <div><label style={LBL}>Umsatz (ca.)</label><input value={form.revenue_band} onChange={set('revenue_band')} placeholder="5–10 Mio. €" style={INPUT} /></div>
                  <div><label style={LBL}>EBITDA (ca.)</label><input value={form.ebitda_band} onChange={set('ebitda_band')} placeholder="1–2 Mio. €" style={INPUT} /></div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
                  <div><label style={LBL}>Phase</label><input value={form.stage} onChange={set('stage')} placeholder="Seed, Series A …" style={INPUT} /></div>
                  <div><label style={LBL}>Kapitalbedarf</label><input value={form.investment_needed} onChange={set('investment_needed')} placeholder="0,5–1 Mio. €" style={INPUT} /></div>
                  <div><label style={LBL}>Anteil</label><input value={form.equity_stake} onChange={set('equity_stake')} placeholder="bis 25 %" style={INPUT} /></div>
                  <div><label style={LBL}>Post-Money (ca.)</label><input value={form.post_money_valuation} onChange={set('post_money_valuation')} placeholder="4 Mio. €" style={INPUT} /></div>
                  <div><label style={LBL}>Marktgröße (TAM)</label><input value={form.tam_band} onChange={set('tam_band')} placeholder="> 1 Mrd. €" style={INPUT} /></div>
                </div>
              )}
              <label style={LBL}>Deal-Typ</label>
              <GroupedSelect value={form.deal_type} onChange={set('deal_type')} groups={isMa ? DEAL_TYPES_MA : DEAL_TYPES_FUNDRAISING} style={{ ...INPUT, background: C.xLight }} />
            </>
          )}

          {/* Schritt 4: Beschreibung */}
          {step === 3 && (
            <>
              <label style={LBL}>Kurzbeschreibung *</label>
              <textarea value={form.short_description} onChange={set('short_description')} rows={5}
                placeholder="Beschreibe das Unternehmen kurz: Tätigkeit, Alleinstellungsmerkmale, Anlass und Ziel des Prozesses. Nichts, was dich verrät."
                style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }} />
              <label style={{ ...LBL, marginTop: '0.9rem' }}>Highlights (je Zeile ein Punkt, optional)</label>
              <textarea
                value={(form.highlights || []).join('\n')}
                onChange={(e) => setVal('highlights', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))}
                rows={4} placeholder={'Stabiler Kundenstamm\nWiederkehrende Umsätze\nEingespieltes Team'}
                style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }} />
            </>
          )}

          {/* Schritt 5: Sichtbarkeit & Auffindbarkeit */}
          {step === 4 && (
            <>
              <label style={LBL}>Welche Käufergruppen soll das Inserat erreichen?</label>
              <p style={{ fontSize: '0.75rem', color: C.gray, margin: '2px 0 0.6rem', lineHeight: 1.5 }}>
                Keine Auswahl bedeutet: für alle sichtbar. Sonst matchen wir gezielt die gewählten Typen.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
                {BUYER_GROUPS.map(([v, l]) => {
                  const on = (form.buyer_groups || []).includes(v);
                  return (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: C.text, cursor: 'pointer', padding: '0.4rem 0.6rem', border: `1px solid ${on ? C.steel : C.border}`, borderRadius: 7, background: on ? C.lightBg : '#fff' }}>
                      <input type="checkbox" checked={on} onChange={() => setVal('buyer_groups', on ? form.buyer_groups.filter(x => x !== v) : [...(form.buyer_groups || []), v])} />
                      {l}
                    </label>
                  );
                })}
              </div>
              <label style={LBL}>Schlagwörter (für die Auffindbarkeit, kommagetrennt)</label>
              <input value={form.keywords} onChange={set('keywords')} placeholder="z. B. Tabakwaren, Großhandel, Nachfolge, Nürnberg" style={INPUT} />
              <p style={{ fontSize: '0.75rem', color: C.gray, marginTop: 6, lineHeight: 1.5 }}>
                Schlagwörter helfen beim Matching und der Suche. Sie sind intern und verraten nichts über die Identität.
              </p>
            </>
          )}

          {/* Schritt 6: Prüfen */}
          {step === 5 && (
            <>
              <p style={{ fontSize: '0.82rem', color: C.gray, marginBottom: '0.9rem', lineHeight: 1.5 }}>
                So sieht die anonyme Kurzansicht aus. Passt alles? Dann reiche zur Prüfung ein. Nach der Freigabe ist das Inserat für qualifizierte Investoren sichtbar.
              </p>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem 1.2rem', background: C.xLight }}>
                <div style={{ fontSize: '0.72rem', color: C.gray, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{isMa ? 'M&A / Unternehmensverkauf' : 'Startup-Finanzierung'} · {form.deal_type || 'k. A.'}</div>
                <div style={{ fontWeight: 800, color: C.navy, fontSize: '1.05rem', margin: '0.2rem 0 0.4rem' }}>{form.codename || 'k. A.'} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: C.gray }}>(intern)</span></div>
                <div style={{ fontSize: '0.82rem', color: C.text }}>{[form.industry, form.region, form.location_city].filter(Boolean).join(' · ') || 'Branche/Region fehlen'}</div>
                {isMa && (form.revenue_band || form.ebitda_band) && (
                  <div style={{ fontSize: '0.8rem', color: C.gray, marginTop: 4 }}>Umsatz: {form.revenue_band || 'k. A.'} · EBITDA: {form.ebitda_band || 'k. A.'}</div>
                )}
                {form.short_description && <div style={{ fontSize: '0.85rem', color: C.text, marginTop: '0.6rem', lineHeight: 1.5 }}>{form.short_description}</div>}
                {(form.highlights || []).length > 0 && (
                  <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.1rem', fontSize: '0.82rem', color: C.text }}>
                    {form.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                )}
              </div>
              {(!form.industry || !form.region || !form.short_description) && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.8rem', marginTop: '0.8rem' }}>
                  Zum Einreichen fehlen noch: {[!form.industry && 'Branche', !form.region && 'Region', !form.short_description && 'Beschreibung'].filter(Boolean).join(', ')}.
                </div>
              )}
            </>
          )}
        </div>

        {/* Fuß */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '1rem 1.4rem', borderTop: `1px solid ${C.border}` }}>
          <button onClick={step === 0 ? saveAndClose : back} disabled={busy} style={{ padding: '0.65rem 1.1rem', border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: C.navy, display: 'flex', alignItems: 'center', gap: 6 }}>
            {step === 0 ? 'Später fortsetzen' : <><ChevronLeft size={15} /> Zurück</>}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} disabled={busy} style={{ padding: '0.65rem 1.3rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem', opacity: busy ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              Weiter <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={submit} disabled={busy || !form.industry || !form.region || !form.short_description} style={{ padding: '0.65rem 1.3rem', background: (!form.industry || !form.region || !form.short_description) ? '#94a3b8' : '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={15} /> {busy ? 'Wird eingereicht…' : 'Zur Prüfung einreichen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
