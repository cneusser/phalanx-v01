import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Calculator, TrendingUp, Download, ChevronRight, AlertTriangle } from 'lucide-react';

const C = {
  navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2',
  bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B',
};

// Branchen (DUB KMU-Multiples-Struktur) — key muss zu valuation_multiples.industry_key passen
const INDUSTRIES = [
  ['maschinenbau', 'Maschinen- und Anlagenbau'],
  ['automotive', 'Fahrzeugbau & Automotive'],
  ['elektrotechnik', 'Elektrotechnik & Elektronik'],
  ['metall', 'Metallverarbeitung & Fertigungstechnik'],
  ['chemie', 'Chemie, Kunststoffe & Verpackung'],
  ['medizintechnik', 'Medizintechnik & Life Sciences'],
  ['software', 'Software & Digitale Plattformen'],
  ['it_services', 'IT-Services & Systemhäuser'],
  ['medien', 'Medien, Marketing & Agenturen'],
  ['telekom', 'Telekommunikation & Infrastruktur'],
  ['gesundheit', 'Gesundheitswesen: Pflege & Dienstleister'],
  ['b2b_dienste', 'Unternehmensnahe Dienstleistungen (B2B)'],
  ['bau', 'Bauhaupt- & Baunebengewerbe (Handwerk)'],
  ['immobilien', 'Immobilien-Dienstl. & Facility Mgmt.'],
  ['finanz', 'Finanzdienstleistungen & Vers.-Makler'],
  ['nahrung', 'Nahrungs- & Genussmittel'],
  ['konsum', 'Konsumgüter (Non-Food)'],
  ['ecommerce', 'Handel: E-Commerce & Versand'],
  ['handel', 'Handel: Groß- & Einzelhandel (Stationär)'],
  ['logistik', 'Transport, Logistik & Spedition'],
  ['sonstige', 'Sonstige / branchenübergreifend'],
];
const INPUT = { width: '100%', padding: '0.6rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };
const LABEL = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' };

const eur = (n) => (Math.round(Number(n) || 0)).toLocaleString('de-DE') + ' €';

// Qualitätsfragen: Wert -1 / 0 / +1
const QUALITY = [
  ['owner_dependence', 'Wie stark hängt das Geschäft am Inhaber?', [['Stark abhängig', -1], ['Teils', 0], ['Läuft ohne Inhaber', 1]]],
  ['customer_concentration', 'Wie ist die Kundenstruktur?', [['Wenige Großkunden', -1], ['Gemischt', 0], ['Breit gestreut', 1]]],
  ['recurring_revenue', 'Wiederkehrende Umsätze?', [['Kaum', -1], ['Teilweise', 0], ['Hoher Anteil', 1]]],
  ['investment_backlog', 'Investitionsstau?', [['Hoch', -1], ['Etwas', 0], ['Kein Stau', 1]]],
  ['second_level', 'Zweite Führungsebene / Team?', [['Fehlt', -1], ['Im Aufbau', 0], ['Etabliert', 1]]],
];

const num = (v) => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

export default function ValuationCalculator() {
  const [industry, setIndustry] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [foundingYear, setFoundingYear] = useState('');
  const [rev, setRev] = useState(['', '', '']);
  const [ebit, setEbit] = useState(['', '', '']);
  const [ownerSalary, setOwnerSalary] = useState('');
  const [oneOffs, setOneOffs] = useState('');
  const [netDebt, setNetDebt] = useState('');
  const [quality, setQuality] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lead-Capture (PDF)
  const [lead, setLead] = useState({ email: '', name: '', company: '', consent: false });
  const [leadMsg, setLeadMsg] = useState('');
  const [leadLoading, setLeadLoading] = useState(false);

  const payload = () => ({
    industry, legalForm, foundingYear,
    revenues: rev.map(num), ebits: ebit.map(num),
    ownerSalaryAdjustment: num(ownerSalary), oneOffs: num(oneOffs), netDebt: num(netDebt),
    quality,
  });

  const calculate = async () => {
    if (!industry) { setError('Bitte wählen Sie eine Branche.'); return; }
    if (ebit.every(e => !num(e)) && rev.every(r => !num(r))) { setError('Bitte geben Sie Umsatz und/oder EBIT an.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const d = await api.post('/valuation/quick', payload());
      setResult(d.result);
      setTimeout(() => document.getElementById('val-result')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const requestReport = async () => {
    if (!lead.email || !lead.consent) { setLeadMsg('Bitte E-Mail angeben und der Datenschutzerklärung zustimmen.'); return; }
    setLeadMsg(''); setLeadLoading(true);
    try {
      const d = await api.post('/valuation/report', { ...payload(), email: lead.email, name: lead.name, company: lead.company, privacy_consent: lead.consent });
      // PDF direkt herunterladen
      const bin = atob(d.pdf_base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = d.filename || 'Unternehmensbewertung.pdf'; a.click();
      URL.revokeObjectURL(url);
      setLeadMsg('Ihr Bewertungs-Report wurde erstellt und heruntergeladen — zusätzlich per E-Mail versendet.');
    } catch (e) { setLeadMsg('Fehler: ' + e.message); }
    finally { setLeadLoading(false); }
  };

  const yearLabels = ['Vor 2 Jahren', 'Vorjahr', 'Letztes Jahr'];

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: C.navy, color: '#fff', padding: '3rem 1.5rem 2.5rem' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(41,171,226,0.15)', border: '1px solid rgba(41,171,226,0.3)', borderRadius: 6, padding: '0.3rem 0.8rem', fontSize: '0.72rem', color: C.steel, letterSpacing: '0.08em', marginBottom: '1rem', fontWeight: 600 }}>
            KOSTENLOS · ANONYM · UNVERBINDLICH
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.6rem', lineHeight: 1.2 }}>Was ist Ihr Unternehmen wert?</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', maxWidth: 620 }}>
            Ermitteln Sie in 2 Minuten einen indikativen Werte-Korridor auf Basis von Branchen-Multiples und Ihrem bereinigten Ertrag — ganz ohne Login. Für eine belastbare Bewertung begleiten wir Sie persönlich.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {/* Eingaben */}
        <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, color: C.navy, marginBottom: '1.25rem' }}><Calculator size={18} /> Ihre Angaben</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div><label style={LABEL}>Branche *</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} style={INPUT}>
                <option value="">Bitte wählen …</option>
                {INDUSTRIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Rechtsform</label><input value={legalForm} onChange={e => setLegalForm(e.target.value)} placeholder="z. B. GmbH" style={INPUT} /></div>
            <div><label style={LABEL}>Gründungsjahr</label><input value={foundingYear} onChange={e => setFoundingYear(e.target.value)} placeholder="2005" style={INPUT} /></div>
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>Umsatz (€) — letzte 3 Jahre</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
            {yearLabels.map((yl, i) => (
              <div key={i}><label style={{ ...LABEL, fontWeight: 400, color: C.muted }}>{yl}</label>
                <input value={rev[i]} onChange={e => setRev(r => r.map((v, j) => j === i ? e.target.value : v))} placeholder="0" style={INPUT} inputMode="numeric" /></div>
            ))}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: '0.5rem' }}>EBIT / Betriebsergebnis (€) — letzte 3 Jahre</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {yearLabels.map((yl, i) => (
              <div key={i}><label style={{ ...LABEL, fontWeight: 400, color: C.muted }}>{yl}</label>
                <input value={ebit[i]} onChange={e => setEbit(r => r.map((v, j) => j === i ? e.target.value : v))} placeholder="0" style={INPUT} inputMode="numeric" /></div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div><label style={LABEL}>Kalk. GF-Gehalt p. a. (€)</label><input value={ownerSalary} onChange={e => setOwnerSalary(e.target.value)} placeholder="0" style={INPUT} inputMode="numeric" /><div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2 }}>falls noch nicht im EBIT enthalten</div></div>
            <div><label style={LABEL}>Einmaleffekte (€)</label><input value={oneOffs} onChange={e => setOneOffs(e.target.value)} placeholder="0" style={INPUT} inputMode="numeric" /><div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2 }}>Sondererträge, werden bereinigt</div></div>
            <div><label style={LABEL}>Netto-Finanzschulden (€)</label><input value={netDebt} onChange={e => setNetDebt(e.target.value)} placeholder="0" style={INPUT} inputMode="numeric" /><div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2 }}>für Equity-Value-Hinweis</div></div>
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.navy, marginBottom: '0.6rem' }}>Qualitätsfaktoren</div>
          {QUALITY.map(([key, q, opts]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: C.text }}>{q}</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {opts.map(([lbl, val]) => (
                  <button key={val} type="button" onClick={() => setQuality(s => ({ ...s, [key]: val }))} style={{
                    padding: '0.3rem 0.7rem', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
                    border: `1.5px solid ${quality[key] === val ? C.navy : '#ddd'}`,
                    background: quality[key] === val ? `${C.navy}12` : '#fff',
                    color: quality[key] === val ? C.navy : '#666', fontWeight: quality[key] === val ? 600 : 400,
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
          ))}

          {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.9rem', margin: '1rem 0 0', fontSize: '0.83rem', color: '#991b1b' }}>{error}</div>}

          <button onClick={calculate} disabled={loading} style={{ marginTop: '1.5rem', width: '100%', padding: '0.85rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <TrendingUp size={17} /> {loading ? 'Wird berechnet…' : 'Unternehmenswert berechnen'}
          </button>
        </div>

        {/* Ergebnis */}
        {result && (
          <div id="val-result" style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: '1.75rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: C.navy, marginBottom: '0.4rem' }}>Ihr indikativer Werte-Korridor</h2>
            <p style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '1.25rem' }}>Enterprise Value · Branche: {result.industryLabel || '—'}{result.sizeBand ? ` · ${result.sizeBand.label}` : ''}</p>

            {result.positive ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[['Konservativ', result.corridor.conservative, false], ['Basis', result.corridor.base, true], ['Optimistisch', result.corridor.optimistic, false]].map(([lbl, val, hi]) => (
                  <div key={lbl} style={{ background: hi ? C.navy : C.bg, borderRadius: 8, padding: '1rem 0.75rem', textAlign: 'center', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.07em', color: hi ? 'rgba(255,255,255,0.7)' : C.muted, marginBottom: '0.3rem' }}>{lbl.toUpperCase()}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: hi ? '#fff' : C.text }}>{eur(val)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.6rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#92400e' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>Das bereinigte nachhaltige Ergebnis ist nicht positiv — ertragsorientierte Verfahren liefern hier keinen sinnvollen Wert. Sprechen Sie uns für eine individuelle Einschätzung an.</span>
              </div>
            )}

            {result.equityHint && (
              <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '1rem' }}>Nach Abzug der Netto-Finanzschulden (Equity Value, indikativ): ca. <strong style={{ color: C.text }}>{eur(result.equityHint.base)}</strong> (Basis).</div>
            )}

            <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: '1rem' }}>
              <strong>Bereinigtes EBIT:</strong> {eur(result.inputsSummary.adjustedEbit)} ·
              <strong> Multiple:</strong> {result.methods.multiple.chosenMultiple}× (Band {result.methods.multiple.band.min}–{result.methods.multiple.band.max}×) ·
              <strong> §199 BewG:</strong> {eur(result.methods.simplifiedIncome.value)}
            </div>

            <div style={{ background: '#EDF4FA', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '1rem', fontSize: '0.76rem', color: '#475569', lineHeight: 1.5 }}>
              <strong>Wichtig:</strong> {result.disclaimer}
            </div>

            {/* Lead-Capture für PDF */}
            <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${C.border}`, paddingTop: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Ausführlichen PDF-Report erhalten</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input value={lead.name} onChange={e => setLead(s => ({ ...s, name: e.target.value }))} placeholder="Ihr Name" style={INPUT} />
                <input value={lead.company} onChange={e => setLead(s => ({ ...s, company: e.target.value }))} placeholder="Unternehmen (optional)" style={INPUT} />
              </div>
              <input value={lead.email} onChange={e => setLead(s => ({ ...s, email: e.target.value }))} placeholder="Ihre E-Mail-Adresse *" type="email" style={{ ...INPUT, marginBottom: '0.75rem' }} />
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.78rem', color: C.muted, marginBottom: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={lead.consent} onChange={e => setLead(s => ({ ...s, consent: e.target.checked }))} style={{ marginTop: 2 }} />
                <span>Ich willige ein, dass meine Angaben zur Erstellung und Zusendung des Reports sowie zur projektbezogenen Ansprache gespeichert und genutzt werden (<Link to="/datenschutz" style={{ color: C.navy }}>Datenschutz</Link>). Widerruf jederzeit möglich.</span>
              </label>
              {leadMsg && <div style={{ background: leadMsg.startsWith('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: leadMsg.startsWith('Fehler') ? '#991b1b' : '#065f46' }}>{leadMsg}</div>}
              <button onClick={requestReport} disabled={leadLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem', background: C.steel, color: C.navy, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', opacity: leadLoading ? 0.6 : 1 }}>
                <Download size={15} /> {leadLoading ? 'Wird erstellt…' : 'PDF-Report anfordern'}
              </button>
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: C.navy, borderRadius: 10, padding: '1.75rem', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>Verkauf oder Nachfolge geplant?</div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '1.1rem' }}>Wir begleiten Sie von der belastbaren Bewertung bis zum Abschluss — vertraulich und professionell.</p>
          <Link to="/registrieren" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: C.steel, color: C.navy, padding: '0.7rem 1.75rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
            Jetzt Mandat starten <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
