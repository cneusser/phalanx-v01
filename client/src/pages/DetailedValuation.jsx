import React, { useState, useEffect } from 'react';
import { api, getToken } from '../api/client';
import { VALUATION_INDUSTRIES as INDUSTRIES } from '../constants/valuationIndustries';
import { FileText, Plus, Download, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const INPUT = { width: '100%', padding: '0.6rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };
const LABEL = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' };
const eur = (n) => (Math.round(Number(n) || 0)).toLocaleString('de-DE') + ' €';
const num = (v) => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

const SCORECARD = [
  ['owner_dependence', 'Inhaberabhängigkeit', 'Läuft das Geschäft ohne den Inhaber?'],
  ['customer_concentration', 'Kundenstreuung', 'Wie breit ist die Kundenbasis?'],
  ['second_level', 'Zweite Führungsebene', 'Trägt ein Team die Verantwortung?'],
  ['market_position', 'Marktposition', 'Wie stark ist die Wettbewerbsposition?'],
  ['cyclicality', 'Stabilität', 'Wie konjunktur-/saisonunabhängig?'],
  ['investment_backlog', 'Investitionslage', 'Besteht Investitionsstau?'],
  ['digitalization', 'Digitalisierung', 'Wie reif sind Prozesse/IT?'],
];
const SC_OPTS = [['−2', -2], ['−1', -1], ['0', 0], ['+1', 1], ['+2', 2]];
const STATUS_LABEL = { draft: 'Entwurf', submitted: 'Berechnet', reviewed: 'Geprüft' };
const STATUS_COLOR = { draft: '#64748B', submitted: '#1D4E89', reviewed: '#166534' };

const emptyInputs = () => ({
  industry: '', revenues: ['', '', ''], ebits: ['', '', ''],
  ownerSalaryAdjustment: '', oneOffs: '', shareholderRentAddback: '', netDebt: '',
  scorecard: {}, assetValue: '', assetDebt: '', buyerYears: '7', buyerInterest: '6,5',
});

export default function DetailedValuation() {
  const [view, setView] = useState('list');  // list | edit
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState(null);
  const [title, setTitle] = useState('');
  const [inputs, setInputs] = useState(emptyInputs());
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('draft');
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [access, setAccess] = useState(null);
  useEffect(() => { loadList(); api.get('/detailed-valuations/access').then(setAccess).catch(() => {}); }, []);
  async function loadList() {
    setLoading(true);
    try { setList(await api.get('/detailed-valuations') || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function startNew() {
    setId(null); setTitle(''); setInputs(emptyInputs()); setResult(null); setStatus('draft'); setComment(''); setStep(0); setMsg(''); setView('edit');
  }
  async function openOne(row) {
    setMsg('');
    try {
      const d = await api.get(`/detailed-valuations/${row.id}`);
      setId(d.id); setTitle(d.title || ''); setStatus(d.status); setComment(d.reviewer_comment || '');
      const inp = d.inputs || {};
      setInputs({ ...emptyInputs(), ...inp,
        revenues: (inp.revenues || ['', '', '']).map(v => v === 0 ? '' : v),
        ebits: (inp.ebits || ['', '', '']).map(v => v === 0 ? '' : v),
        scorecard: inp.scorecard || {},
        buyerYears: inp.buyerYears ? String(inp.buyerYears) : '7',
        buyerInterest: inp.buyerInterest ? String(inp.buyerInterest * 100).replace('.', ',') : '6,5',
      });
      setResult(d.results && d.results.corridor ? d.results : null);
      setStep(d.results && d.results.corridor ? 3 : 0);
      setView('edit');
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  function payload() {
    return {
      industry: inputs.industry,
      revenues: inputs.revenues.map(num), ebits: inputs.ebits.map(num),
      ownerSalaryAdjustment: num(inputs.ownerSalaryAdjustment), oneOffs: num(inputs.oneOffs),
      shareholderRentAddback: num(inputs.shareholderRentAddback), netDebt: num(inputs.netDebt),
      scorecard: inputs.scorecard,
      assetValue: num(inputs.assetValue), assetDebt: num(inputs.assetDebt),
      buyerYears: num(inputs.buyerYears) || 7, buyerInterest: (num(inputs.buyerInterest) || 6.5) / 100,
      company: title,
    };
  }

  async function saveDraft() {
    setBusy(true); setMsg('');
    try {
      if (!id) {
        const d = await api.post('/detailed-valuations', { title, inputs: payload() });
        setId(d.id); setMsg('Entwurf angelegt.');
      } else {
        await api.put(`/detailed-valuations/${id}`, { title, inputs: payload() });
        setMsg('Entwurf gespeichert.');
      }
      loadList();
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!inputs.industry) { setMsg('Bitte Branche wählen.'); setStep(0); return; }
    setBusy(true); setMsg('');
    try {
      let vid = id;
      if (!vid) { const d = await api.post('/detailed-valuations', { title, inputs: payload() }); vid = d.id; setId(vid); }
      else { await api.put(`/detailed-valuations/${vid}`, { title, inputs: payload() }); }
      const d = await api.post(`/detailed-valuations/${vid}/submit`, { inputs: payload() });
      setResult(d.result); setStatus('submitted'); setStep(3); loadList();
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  async function downloadPdf(vid) {
    try {
      const res = await fetch(`/api/detailed-valuations/${vid}/report`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Fehler'); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `CapitalMatch_Bewertung_${vid}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setMsg('PDF-Fehler: ' + e.message); }
  }

  const setInp = (k, v) => setInputs(s => ({ ...s, [k]: v }));
  const setArr = (k, i, v) => setInputs(s => ({ ...s, [k]: s[k].map((x, j) => j === i ? v : x) }));
  const setScore = (k, v) => setInputs(s => ({ ...s, scorecard: { ...s.scorecard, [k]: v } }));

  // ── LIST VIEW ───────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div style={{ background: C.bg, minHeight: '100vh' }}>
        <div style={{ background: C.navy, color: '#fff', padding: '2.5rem 1.5rem 2rem' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 700, marginBottom: '0.4rem' }}>Ausführliche Unternehmensbewertung</h1>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.92rem', maxWidth: 640 }}>Geführte, mehrstufige Bewertung mit Bereinigungsrechnung, Qualitäts-Scorecard, Ertragswert und Kapitaldienst-Check — als ausführlicher PDF-Report. Indikativ, kein IDW-S1-Gutachten.</p>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.75rem 1.5rem 4rem' }}>
          {access && (access.requires_payment
            ? <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.83rem', color: '#92400e' }}>Die ausführliche Bewertung ist seit {new Date(access.free_until).toLocaleDateString('de-DE')} kostenpflichtig. Bitte sprechen Sie uns zur Freischaltung an.</div>
            : access.in_free_period && access.paywall_enabled
              ? <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.83rem', color: '#065f46' }}>Die ausführliche Bewertung ist bis zum <strong>{new Date(access.free_until).toLocaleDateString('de-DE')}</strong> kostenlos.</div>
              : null)}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, color: C.navy }}>Ihre Bewertungen</div>
            <button onClick={startNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.1rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}><Plus size={15} /> Neue Bewertung</button>
          </div>
          {msg && <div style={{ background: msg.startsWith('Fehler') || msg.includes('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '0.9rem', fontSize: '0.82rem', color: msg.includes('Fehler') ? '#991b1b' : '#065f46' }}>{msg}</div>}
          {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Wird geladen…</div>
            : list.length === 0 ? <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '3rem', textAlign: 'center', color: C.muted }}>Noch keine Bewertung. Legen Sie oben rechts eine neue an.</div>
            : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead><tr style={{ background: C.bg }}>
                    {['Titel', 'Branche', 'Status', 'Wert (Basis)', 'Mandat', ''].map(h => <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.72rem' }}>{h.toUpperCase()}</th>)}
                  </tr></thead>
                  <tbody>
                    {list.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: C.text, cursor: 'pointer' }} onClick={() => openOne(r)}>{r.title || '(ohne Titel)'}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{r.industry || '—'}</td>
                        <td style={{ padding: '0.7rem 1rem' }}><span style={{ background: STATUS_COLOR[r.status] + '18', color: STATUS_COLOR[r.status], fontWeight: 600, fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: 20 }}>{STATUS_LABEL[r.status] || r.status}</span></td>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 600 }}>{r.positive && r.corridor_base != null ? eur(r.corridor_base) : (r.status === 'draft' ? '—' : 'n. b.')}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#555' }}>{r.codename || '—'}</td>
                        <td style={{ padding: '0.7rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={() => openOne(r)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.75rem', cursor: 'pointer', marginRight: 6 }}>Öffnen</button>
                          {r.status !== 'draft' && <button onClick={() => downloadPdf(r.id)} style={{ background: C.steel, color: C.navy, border: 'none', borderRadius: 6, padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>PDF</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    );
  }

  // ── EDIT / STEPPER VIEW ─────────────────────────────────────────────────
  const steps = ['Finanzdaten', 'Scorecard', 'Substanz & Käufer', 'Ergebnis'];
  const yearLabels = ['Vor 2 Jahren', 'Vorjahr', 'Letztes Jahr'];
  const locked = status === 'reviewed';

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.5rem 4rem' }}>
        <button onClick={() => { setView('list'); loadList(); }} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1rem' }}><ChevronLeft size={15} /> Zur Übersicht</button>

        {/* Stepper header */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} style={{ flex: 1, minWidth: 140, padding: '0.6rem', borderRadius: 8, border: `1.5px solid ${step === i ? C.navy : C.border}`, background: step === i ? C.navy : '#fff', color: step === i ? '#fff' : C.muted, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>{i + 1}. {s}</button>
          ))}
        </div>

        {locked && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#065f46' }}><CheckCircle size={14} style={{ verticalAlign: -2 }} /> Diese Bewertung wurde geprüft und ist schreibgeschützt.{comment ? ` Kommentar: „${comment}"` : ''}</div>}
        {msg && <div style={{ background: msg.includes('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: msg.includes('Fehler') ? '#991b1b' : '#065f46' }}>{msg}</div>}

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.75rem' }}>
          {/* STEP 0 — Finanzdaten */}
          {step === 0 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
                <div><label style={LABEL}>Unternehmen / Titel</label><input value={title} onChange={e => setTitle(e.target.value)} disabled={locked} placeholder="z. B. Muster GmbH" style={INPUT} /></div>
                <div><label style={LABEL}>Branche *</label>
                  <select value={inputs.industry} onChange={e => setInp('industry', e.target.value)} disabled={locked} style={INPUT}>
                    <option value="">Bitte wählen …</option>
                    {INDUSTRIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>Umsatz (€) — letzte 3 Jahre</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {yearLabels.map((yl, i) => <div key={i}><label style={{ ...LABEL, fontWeight: 400, color: C.muted }}>{yl}</label><input value={inputs.revenues[i]} onChange={e => setArr('revenues', i, e.target.value)} disabled={locked} placeholder="0" style={INPUT} inputMode="numeric" /></div>)}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>EBIT / Betriebsergebnis (€) — letzte 3 Jahre</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
                {yearLabels.map((yl, i) => <div key={i}><label style={{ ...LABEL, fontWeight: 400, color: C.muted }}>{yl}</label><input value={inputs.ebits[i]} onChange={e => setArr('ebits', i, e.target.value)} disabled={locked} placeholder="0" style={INPUT} inputMode="numeric" /></div>)}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>Bereinigungen</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={LABEL}>Kalk. GF-Gehalt p. a. (€)</label><input value={inputs.ownerSalaryAdjustment} onChange={e => setInp('ownerSalaryAdjustment', e.target.value)} disabled={locked} placeholder="0" style={INPUT} inputMode="numeric" /><div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2 }}>wird vom EBIT abgezogen</div></div>
                <div><label style={LABEL}>Einmaleffekte (€)</label><input value={inputs.oneOffs} onChange={e => setInp('oneOffs', e.target.value)} disabled={locked} placeholder="0" style={INPUT} inputMode="numeric" /><div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2 }}>Sondererträge, werden bereinigt</div></div>
                <div><label style={LABEL}>Bereinigung Gesellschafter-Miete (€)</label><input value={inputs.shareholderRentAddback} onChange={e => setInp('shareholderRentAddback', e.target.value)} disabled={locked} placeholder="0" style={INPUT} inputMode="numeric" /><div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2 }}>Überzahlung an Gesellschafter → Addback</div></div>
                <div><label style={LABEL}>Netto-Finanzschulden (€)</label><input value={inputs.netDebt} onChange={e => setInp('netDebt', e.target.value)} disabled={locked} placeholder="0" style={INPUT} inputMode="numeric" /><div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2 }}>für Equity-Value</div></div>
              </div>
            </div>
          )}

          {/* STEP 1 — Scorecard */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1rem' }}>Bewerten Sie je Faktor von −2 (sehr schwach) bis +2 (sehr gut). Das verschiebt Multiple und Risikozins.</div>
              {SCORECARD.map(([key, label, hint]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
                  <div><div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text }}>{label}</div><div style={{ fontSize: '0.72rem', color: C.muted }}>{hint}</div></div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {SC_OPTS.map(([lbl, val]) => {
                      const active = (inputs.scorecard[key] ?? 0) === val;
                      return <button key={val} type="button" onClick={() => !locked && setScore(key, val)} style={{ width: 38, padding: '0.35rem 0', borderRadius: 8, fontSize: '0.78rem', cursor: locked ? 'default' : 'pointer', border: `1.5px solid ${active ? C.navy : '#ddd'}`, background: active ? C.navy : '#fff', color: active ? '#fff' : '#666', fontWeight: active ? 700 : 400 }}>{lbl}</button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2 — Substanz & Käufer */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>Substanzwert (optional)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div><label style={LABEL}>Verkehrswerte Anlagen/Immobilien (€)</label><input value={inputs.assetValue} onChange={e => setInp('assetValue', e.target.value)} disabled={locked} placeholder="0" style={INPUT} inputMode="numeric" /></div>
                <div><label style={LABEL}>Zugeordnete Schulden (€)</label><input value={inputs.assetDebt} onChange={e => setInp('assetDebt', e.target.value)} disabled={locked} placeholder="0" style={INPUT} inputMode="numeric" /></div>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>Kapitaldienst-Annahmen (Käufersicht)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={LABEL}>Finanzierungslaufzeit (Jahre)</label><input value={inputs.buyerYears} onChange={e => setInp('buyerYears', e.target.value)} disabled={locked} placeholder="7" style={INPUT} inputMode="numeric" /></div>
                <div><label style={LABEL}>Finanzierungszins (%)</label><input value={inputs.buyerInterest} onChange={e => setInp('buyerInterest', e.target.value)} disabled={locked} placeholder="6,5" style={INPUT} inputMode="decimal" /></div>
              </div>
            </div>
          )}

          {/* STEP 3 — Ergebnis */}
          {step === 3 && (
            <div>
              {!result ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: C.muted }}>
                  <AlertTriangle size={22} style={{ marginBottom: 8 }} /><div>Noch kein Ergebnis. Klicken Sie auf „Berechnen".</div>
                </div>
              ) : !result.positive ? (
                <div style={{ display: 'flex', gap: '0.6rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '1rem', fontSize: '0.85rem', color: '#92400e' }}><AlertTriangle size={18} style={{ flexShrink: 0 }} /><span>Das bereinigte nachhaltige Ergebnis ist nicht positiv — ertragsorientierte Verfahren liefern hier keinen sinnvollen Wert.</span></div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.9rem' }}>Enterprise Value · {result.industryLabel} · {result.sizeBand?.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem', marginBottom: '1.25rem' }}>
                    {[['Konservativ', result.corridor.conservative, false], ['Basis', result.corridor.base, true], ['Optimistisch', result.corridor.optimistic, false]].map(([lbl, val, hi]) => (
                      <div key={lbl} style={{ background: hi ? C.navy : C.bg, borderRadius: 8, padding: '1rem 0.5rem', textAlign: 'center', border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.06em', color: hi ? 'rgba(255,255,255,0.7)' : C.muted, marginBottom: 4 }}>{String(lbl).toUpperCase()}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: hi ? '#fff' : C.text }}>{eur(val)}</div>
                      </div>
                    ))}
                  </div>
                  {result.equity && <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.8rem' }}>Equity Value (nach Netto-Finanzschulden): ca. <strong style={{ color: C.text }}>{eur(result.equity.base)}</strong> (Basis).</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.8rem', color: '#475569', borderTop: `1px solid ${C.border}`, paddingTop: '0.9rem' }}>
                    <div><strong>Bereinigtes EBIT:</strong> {eur(result.inputsSummary.adjustedEbit)}</div>
                    <div><strong>Multiple:</strong> {String(result.methods.multiple.chosenMultiple).replace('.', ',')}× (Band {String(result.methods.multiple.band.min).replace('.', ',')}–{String(result.methods.multiple.band.max).replace('.', ',')}×)</div>
                    <div><strong>Ertragswert:</strong> {eur(result.methods.income.value)} (Zins {String(result.methods.income.capRate).replace('.', ',')} %)</div>
                    <div><strong>§199 BewG:</strong> {eur(result.methods.simplifiedIncome.value)}</div>
                    <div><strong>Kapitaldienst:</strong> {result.affordability.verdict} (finanzierbar {eur(result.affordability.financeablePrice)})</div>
                    {result.methods.substance.value > 0 && <div><strong>Substanzwert:</strong> {eur(result.methods.substance.value)}</div>}
                  </div>
                  <div style={{ background: '#EDF4FA', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '1rem', fontSize: '0.76rem', color: '#475569', lineHeight: 1.5 }}><strong>Wichtig:</strong> {result.disclaimer} Indikativ, kein IDW-S1-Gutachten.</div>
                  <button onClick={() => id && downloadPdf(id)} style={{ marginTop: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.4rem', background: C.steel, color: C.navy, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}><Download size={15} /> Ausführlichen PDF-Report herunterladen</button>
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: `1px solid ${C.border}`, gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))} style={{ padding: '0.6rem 1rem', border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, cursor: step === 0 ? 'default' : 'pointer', opacity: step === 0 ? 0.4 : 1, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={15} /> Zurück</button>
              {step < 3 && <button onClick={() => setStep(s => Math.min(3, s + 1))} style={{ padding: '0.6rem 1rem', border: `1px solid ${C.border}`, background: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Weiter <ChevronRight size={15} /></button>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!locked && <button onClick={saveDraft} disabled={busy} style={{ padding: '0.6rem 1.1rem', border: `1px solid ${C.navy}`, background: '#fff', color: C.navy, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: busy ? 0.6 : 1 }}>Entwurf speichern</button>}
              {!locked && <button onClick={submit} disabled={busy} style={{ padding: '0.6rem 1.3rem', border: 'none', background: C.navy, color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', opacity: busy ? 0.6 : 1 }}>{busy ? 'Rechnet…' : 'Berechnen'}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
