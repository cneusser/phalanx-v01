/**
 * Korrespondenz aus Phalanx OS anzeigen (v0.454).
 *
 * Eine Komponente für beide Stellen: Mandat und Kontakt. Der Unterschied ist
 * die Adresse, die sie abruft, und der Warnhinweis, den nur das Mandat trägt.
 *
 * Diese Daten liegen nicht in CapitalMatch. Sie werden bei jedem Öffnen
 * geholt, und wenn Phalanx OS nicht antwortet, steht hier der Grund und keine
 * leere Liste. Eine leere Liste sähe aus wie „keine Korrespondenz", und das
 * ist an dieser Stelle die gefährlichste Auskunft überhaupt: Sie führt zu der
 * Aussage, es sei nichts geschrieben worden.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Mail, ChevronDown, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../api/client';

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const zeit = (w) => (w ? new Date(w).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function Korrespondenz({ C, pfad, mitWarnung = false }) {
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [offen, setOffen] = useState({});
  const [nurPerson, setNurPerson] = useState('');

  const laden = useCallback(async () => {
    setLaeuft(true); setFehler(null);
    try { setDaten(await api.get(pfad)); }
    catch (e) { setFehler(e.message); setDaten(null); }
    setLaeuft(false);
  }, [pfad]);

  useEffect(() => { laden(); }, [laden]);

  // Die Gegenseite einer Nachricht: bei eingehenden der Absender, bei
  // ausgehenden der erste Empfänger. Danach wird gefiltert, denn „mit wem"
  // ist die Frage, die man an einen Schriftwechsel stellt.
  const gegenseite = (m) => (m.richtung === 'eingehend'
    ? ((m.von && (m.von.email || m.von.name)) || 'unbekannt')
    : ((m.an && m.an[0]) || 'unbekannt'));

  const alle = (daten && daten.items) || [];
  const personen = [...new Set(alle.map(gegenseite))].sort();
  const sichtbar = nurPerson ? alle.filter((m) => gegenseite(m) === nurPerson) : alle;

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.9rem 1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Mail size={14} /> Korrespondenz
          {daten && daten.verfuegbar && <span style={{ fontWeight: 400, textTransform: 'none', color: C.muted }}> · {daten.total} Nachrichten</span>}
        </span>
        <button onClick={laden} disabled={laeuft}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.28rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, color: C.navy, cursor: 'pointer' }}>
          <RefreshCw size={12} /> {laeuft ? 'Wird geholt…' : 'Neu laden'}
        </button>
      </div>

      {mitWarnung && (
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.55rem 0.8rem', fontSize: '0.78rem', color: '#78350f', lineHeight: 1.55, marginBottom: '0.7rem' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Enthält Klarnamen. Nicht für Käufer oder Verkäufer sichtbar.</span>
        </div>
      )}

      {fehler && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.55 }}>
          {fehler}
          <span style={{ display: 'block', marginTop: 4, color: '#7f1d1d' }}>
            Die Korrespondenz liegt in Phalanx OS und wird hier nicht gespeichert. Es wird deshalb
            auch kein älterer Stand angezeigt.
          </span>
        </div>
      )}

      {!fehler && daten && !daten.verfuegbar && (
        <div style={{ fontSize: '0.8rem', color: C.muted, lineHeight: 1.55 }}>{daten.grund}</div>
      )}

      {!fehler && daten && daten.verfuegbar && (
        <>
          {personen.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              <button onClick={() => setNurPerson('')}
                style={{ background: nurPerson === '' ? C.navy : '#fff', color: nurPerson === '' ? '#fff' : C.navy, border: `1px solid ${C.border}`, borderRadius: 20, padding: '0.18rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                Alle ({alle.length})
              </button>
              {personen.map((p) => (
                <button key={p} onClick={() => setNurPerson(p)}
                  style={{ background: nurPerson === p ? C.navy : '#fff', color: nurPerson === p ? '#fff' : C.navy, border: `1px solid ${C.border}`, borderRadius: 20, padding: '0.18rem 0.7rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
            </div>
          )}

          {sichtbar.length === 0 && (
            <div style={{ fontSize: '0.8rem', color: C.muted }}>Keine Nachrichten in diesem Zeitraum.</div>
          )}

          {sichtbar.map((m) => {
            const auf = !!offen[m.id];
            const raus = m.richtung === 'ausgehend';
            return (
              <div key={m.id} style={{ borderTop: `1px solid ${C.border}`, padding: '0.5rem 0' }}>
                <button onClick={() => setOffen((o) => ({ ...o, [m.id]: !auf }))}
                  style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {auf ? <ChevronDown size={14} style={{ flexShrink: 0, marginTop: 3, color: C.muted }} />
                       : <ChevronRight size={14} style={{ flexShrink: 0, marginTop: 3, color: C.muted }} />}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: raus ? '#065f46' : '#1e40af',
                        background: raus ? '#ecfdf5' : '#eff6ff', borderRadius: 20, padding: '1px 8px' }}>
                        {raus ? 'ausgehend' : 'eingehend'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: C.muted }}>{zeit(m.wann)}</span>
                      <span style={{ fontSize: '0.72rem', color: C.accent, fontWeight: 600 }}>{gegenseite(m)}</span>
                    </span>
                    <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: C.navy, marginTop: 2 }}>
                      {m.betreff || 'ohne Betreff'}
                    </span>
                  </span>
                </button>
                {auf && (
                  <div style={{ marginLeft: 22, marginTop: 6 }}>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', color: C.text, lineHeight: 1.6, background: C.bg, borderRadius: 8, padding: '0.6rem 0.8rem' }}>
                      {m.text || 'Kein Text übermittelt.'}
                    </div>
                    {m.anhaenge && m.anhaenge.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
                        Anhänge: {m.anhaenge.map((a) => `${a.name} (${kb(a.groesse)})`).join(', ')}
                        <span style={{ display: 'block' }}>
                          Die Dateien selbst liegen in Phalanx OS und werden hier nicht ausgeliefert.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {daten.total > alle.length && (
            <div style={{ fontSize: '0.74rem', color: C.muted, marginTop: '0.5rem' }}>
              {alle.length} von {daten.total} Nachrichten geladen.
            </div>
          )}
        </>
      )}
    </div>
  );
}
