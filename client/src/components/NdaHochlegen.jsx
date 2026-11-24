// ─────────────────────────────────────────────────────────────────────────────
// Einen ausserhalb der Plattform unterschriebenen NDA hinterlegen (v0.504)
//
// Der Anlass war ein Satz aus der Praxis: Viele Vertraulichkeitsvereinbarungen
// laufen weiterhin über E-Mail. Unterschrieben kommen sie als PDF zurück, und
// bis hierher hatte die Plattform dafür nur ein Auswahlfeld mit dem Wert
// „liegt vor". Ein Wert, der etwas behauptet, ohne es zu belegen.
//
// Dieses Fenster verlangt dieselben Angaben, die der Online-Weg von sich aus
// festhält. Das ist bewusst etwas mehr Tipparbeit als ein Dateidialog: Ein
// PDF ohne Datum, Unterzeichner und Vertragspartei ist ein Anhang, kein
// Nachweis, und der Unterschied fällt erst auf, wenn jemand danach fragt.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { api, getToken } from '../api/client';
import { FileText, Upload, Download } from 'lucide-react';

const C = { navy: '#111820', bg: '#F8FAFC', border: '#E2E8F0', text: '#0F172A', muted: '#64748B' };
const IN = { width: '100%', padding: '0.4rem 0.55rem', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' };
const LBL = { fontSize: '0.66rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.03em' };

const HERKUNFT = [
  ['mail', 'Per E-Mail zurückerhalten'],
  ['papier', 'Auf Papier unterschrieben'],
  ['anbieter', 'Über einen anderen Signaturanbieter'],
  ['sonstiges', 'Auf anderem Weg'],
];

const datum = (d) => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'k. A.';
const kb = (n) => n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`;

export default function NdaHochlegen({ projectId, partyId, contactId, kontakt, firma, onFertig, show }) {
  const [offen, setOffen] = useState(false);
  const [liste, setListe] = useState([]);
  const [laeuft, setLaeuft] = useState(false);
  const [datei, setDatei] = useState(null);
  const [f, setF] = useState({
    unterzeichnet_am: '', unterzeichner_name: '', partei_firma: '',
    partei_sitz: '', partei_register: '', herkunft: 'mail', bemerkung: '',
  });

  const laden = useCallback(async () => {
    try {
      const r = await api.get(`/nda-dokumente/${projectId}?contact_id=${contactId}`);
      setListe(r.dokumente || []);
    } catch { setListe([]); }
  }, [projectId, contactId]);
  useEffect(() => { laden(); }, [laden]);

  // Vorbelegen, was wir ohnehin wissen. Geändert werden darf alles: auf dem
  // Dokument kann eine andere Person unterschrieben haben als die, mit der
  // geschrieben wurde.
  function oeffnen() {
    setF((alt) => ({
      ...alt,
      unterzeichner_name: alt.unterzeichner_name || [kontakt?.title, kontakt?.first_name, kontakt?.last_name].filter(Boolean).join(' '),
      partei_firma: alt.partei_firma || firma || '',
    }));
    setOffen(true);
  }

  async function hochlegen() {
    if (!datei) { show('Bitte wählen Sie zuerst die unterschriebene Datei aus.'); return; }
    const fd = new FormData();
    fd.append('datei', datei);
    fd.append('contact_id', String(contactId));
    if (partyId) fd.append('party_id', String(partyId));
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    setLaeuft(true);
    try {
      const r = await api.upload(`/nda-dokumente/${projectId}`, fd);
      show(r && r.id
        ? 'Der NDA ist hinterlegt. Die Ampel steht jetzt auf unterschrieben ✓'
        : 'Hinterlegt ✓');
      setOffen(false); setDatei(null);
      setF({ unterzeichnet_am: '', unterzeichner_name: '', partei_firma: '', partei_sitz: '', partei_register: '', herkunft: 'mail', bemerkung: '' });
      await laden();
      if (onFertig) onFertig();
    } catch (e) { show('Fehler: ' + e.message); }
    finally { setLaeuft(false); }
  }

  function herunterladen(d) {
    fetch(`/api/nda-dokumente/datei/${d.id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.ok ? r.blob() : Promise.reject(new Error('Dieses Dokument ist für Sie nicht abrufbar.')))
      .then((b) => {
        const u = URL.createObjectURL(b); const a = document.createElement('a');
        a.href = u; a.download = d.dateiname; a.click(); URL.revokeObjectURL(u);
      })
      .catch((e) => show('Fehler: ' + e.message));
  }

  return (
    <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={LBL}>Unterschriebener NDA als Datei</div>
        <button onClick={() => (offen ? setOffen(false) : oeffnen())}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, color: C.navy, cursor: 'pointer' }}>
          <Upload size={12} /> {offen ? 'Abbrechen' : 'NDA hochlegen'}
        </button>
      </div>

      {!liste.length && !offen && (
        <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
          Hier liegt noch keine Datei. Wer den NDA per Mail zurückgeschickt hat, wird so dokumentiert:
          Datei, Unterzeichnungsdatum, Unterzeichner, Vertragspartei.
        </div>
      )}

      {liste.map((d) => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 7, padding: '0.5rem 0.6rem', background: '#fff', border: `1px solid ${d.gilt ? '#a7f3d0' : C.border}`, borderRadius: 7 }}>
          <FileText size={14} style={{ color: d.gilt ? '#065f46' : C.muted, marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.navy, wordBreak: 'break-all' }}>
              {d.dateiname}{!d.gilt && <span style={{ color: C.muted, fontWeight: 500 }}> (ersetzt)</span>}
            </div>
            <div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
              Unterzeichnet am {datum(d.unterzeichnet_am)} von {d.unterzeichner_name}
              {d.partei_firma ? ` für ${d.partei_firma}` : ''}<br />
              {d.herkunft_text}, hinterlegt am {datum(d.hochgeladen_am)}
              {d.hochgeladen_von_name ? ` von ${d.hochgeladen_von_name}` : ''} · {kb(d.groesse)}
              {d.pruefsumme ? <><br />Prüfsumme {d.pruefsumme.slice(0, 16)}…</> : null}
              {d.bemerkung ? <><br />{d.bemerkung}</> : null}
            </div>
          </div>
          <button onClick={() => herunterladen(d)} title="Herunterladen (der Abruf wird protokolliert)"
            style={{ background: 'none', border: 'none', color: C.navy, cursor: 'pointer', padding: 3, flexShrink: 0 }}>
            <Download size={14} />
          </button>
        </div>
      ))}

      {offen && (
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <div style={LBL}>Unterzeichnet am</div>
              <input type="date" value={f.unterzeichnet_am} onChange={(e) => setF({ ...f, unterzeichnet_am: e.target.value })} style={{ ...IN, marginTop: 3 }} />
            </div>
            <div>
              <div style={LBL}>Name des Unterzeichners</div>
              <input value={f.unterzeichner_name} onChange={(e) => setF({ ...f, unterzeichner_name: e.target.value })}
                placeholder="Dr. Leon Wiedemeyer, Geschäftsführer" style={{ ...IN, marginTop: 3 }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={LBL}>Vertragspartei (Firma)</div>
              <input value={f.partei_firma} onChange={(e) => setF({ ...f, partei_firma: e.target.value })}
                placeholder="Wiedemeyer Beteiligungen GmbH" style={{ ...IN, marginTop: 3 }} />
            </div>
            <div>
              <div style={LBL}>Sitz</div>
              <input value={f.partei_sitz} onChange={(e) => setF({ ...f, partei_sitz: e.target.value })}
                placeholder="Düsseldorf" style={{ ...IN, marginTop: 3 }} />
            </div>
            <div>
              <div style={LBL}>Register</div>
              <input value={f.partei_register} onChange={(e) => setF({ ...f, partei_register: e.target.value })}
                placeholder="HRB 12345, Amtsgericht Düsseldorf" style={{ ...IN, marginTop: 3 }} />
            </div>
            <div>
              <div style={LBL}>Herkunft</div>
              <select value={f.herkunft} onChange={(e) => setF({ ...f, herkunft: e.target.value })} style={{ ...IN, marginTop: 3 }}>
                {HERKUNFT.map(([w, l]) => <option key={w} value={w}>{l}</option>)}
              </select>
            </div>
            <div>
              <div style={LBL}>Bemerkung (freiwillig)</div>
              <input value={f.bemerkung} onChange={(e) => setF({ ...f, bemerkung: e.target.value })}
                placeholder="Abweichung vom Standardtext, Laufzeit" style={{ ...IN, marginTop: 3 }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={LBL}>Die unterschriebene Datei</div>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setDatei(e.target.files[0] || null)}
                style={{ ...IN, marginTop: 3, padding: '0.3rem' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 7, lineHeight: 1.55 }}>
            Die Datei liegt außerhalb des Datenraums. Sie ist für die Verwaltung und für den
            Unterzeichner selbst abrufbar, jeder Abruf wird protokolliert. Eine frühere Fassung wird
            nicht gelöscht, sondern als ersetzt gekennzeichnet.
          </div>
          <button onClick={hochlegen} disabled={laeuft}
            style={{ marginTop: 8, background: laeuft ? C.muted : '#065f46', color: '#fff', border: 'none', borderRadius: 7, padding: '0.45rem 1rem', fontSize: '0.78rem', fontWeight: 700, cursor: laeuft ? 'default' : 'pointer' }}>
            {laeuft ? 'Wird hinterlegt…' : 'Hinterlegen und NDA auf unterschrieben setzen'}
          </button>
        </div>
      )}
    </div>
  );
}
