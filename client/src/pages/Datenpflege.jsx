// ─────────────────────────────────────────────────────────────────────────────
// Datenpflege (v0.405).
//
// Zwei Bereiche auf einer Seite:
//   1. Was fehlt wo? Eine Liste, kein Prozentbalken. Filter je Feld, Mehrfach-
//      auswahl und Stapelbearbeitung für die Felder, bei denen ein gemeinsamer
//      Wert sinnvoll ist.
//   2. Mailings: anlegen, Ration senden, Verlauf ansehen.
//
// Bewusst zurückhaltend beim Versand: jede Ration wird von Hand angestoßen.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ListChecks, Mail, Send, RefreshCw, Users, AlertCircle, CheckCircle, Eye } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', muted: '#64748B' };
const INPUT = { padding: '0.5rem 0.7rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.85rem', outline: 'none', background: '#fff' };
const KNOPF = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.9rem', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer' };
const KNOPF_HELL = { ...KNOPF, background: '#fff', color: C.navy, border: `1.5px solid ${C.border}` };
const KARTE = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.2rem' };

const STAPEL_FELDER = [['sektor', 'Sektor'], ['schwerpunkt', 'Schwerpunkt'], ['region', 'Region'], ['country', 'Land']];

function Zahl({ label, wert, ton }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.7rem 0.9rem', minWidth: 104 }}>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: ton || C.navy, lineHeight: 1.1 }}>{wert}</div>
      <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Datenpflege() {
  const [uebersicht, setUebersicht] = useState(null);
  const [filter, setFilter] = useState('');
  const [auswahl, setAuswahl] = useState([]);
  const [stapelFeld, setStapelFeld] = useState('sektor');
  const [stapelWert, setStapelWert] = useState('');
  const [vok, setVok] = useState({ sektoren: [], schwerpunkte: {}, laender: [] });
  const [kampagnen, setKampagnen] = useState([]);
  const [vorschau, setVorschau] = useState(null);
  const [meldung, setMeldung] = useState('');
  const [fehler, setFehler] = useState('');
  const [busy, setBusy] = useState(false);

  const laden = useCallback(async () => {
    try {
      const [u, k, v] = await Promise.all([
        api.get(`/pflege/pflege/uebersicht${filter ? `?fehlt=${encodeURIComponent(filter)}` : ''}`),
        api.get('/pflege/kampagnen'),
        api.get('/crm/vokabular'),
      ]);
      setUebersicht(u); setKampagnen(k); setVok(v);
    } catch (e) { setFehler(e.message); }
  }, [filter]);

  useEffect(() => { laden(); }, [laden]);

  const umschalten = (id) => setAuswahl((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const alleUmschalten = () => {
    const ids = (uebersicht?.zeilen || []).map((z) => z.id);
    setAuswahl((a) => (a.length === ids.length ? [] : ids));
  };

  const stapelSpeichern = async () => {
    if (!stapelWert || !auswahl.length) return;
    setBusy(true); setFehler(''); setMeldung('');
    try {
      const r = await api.post('/pflege/pflege/stapel', { feld: stapelFeld, wert: stapelWert, ids: auswahl });
      const abgelehnt = r.abgelehnt || [];
      setMeldung(`${r.gesetzt} Firmen gesetzt${abgelehnt.length ? `, ${abgelehnt.length} nicht: ${abgelehnt.map((a) => a.name).join(', ')}` : ''}.`);
      setAuswahl([]); setStapelWert('');
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const vorschauHolen = async () => {
    setBusy(true); setFehler('');
    try { setVorschau(await api.get('/pflege/empfaenger-vorschau')); } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const kampagneAnlegen = async () => {
    setBusy(true); setFehler(''); setMeldung('');
    try {
      const r = await api.post('/pflege/kampagnen', {});
      setMeldung(`Mailing angelegt: ${r.angelegt} Einladungen. ${(r.ohneAnsprechperson || []).length} Firmen ohne anschreibbare Ansprechperson.`);
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const rationSenden = async (id, erinnerung) => {
    setBusy(true); setFehler(''); setMeldung('');
    try {
      const r = await api.post(`/pflege/kampagnen/${id}/senden`, { erinnerung });
      if (r.uebersprungen) setMeldung(`Nichts versendet: ${r.uebersprungen}.`);
      else if (r.fehler && r.fehler.length) {
        setMeldung(`${r.versendet} von ${r.betrachtet} versendet. Nicht zugestellt: ${r.fehler.map((f) => f.grund).join('; ')}`);
      } else setMeldung(`${r.versendet} von ${r.betrachtet} Mails versendet.`);
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const statusSetzen = async (id, status) => {
    setBusy(true); setFehler(''); setMeldung('');
    try {
      await api.put(`/pflege/kampagnen/${id}`, { status });
      setMeldung(status === 'laeuft' ? 'Mailing ist scharf. Der Versand läuft nur, wenn Sie eine Ration anstoßen.' : 'Mailing angehalten.');
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const stapelWerte = stapelFeld === 'sektor' ? (vok.sektoren || [])
    : stapelFeld === 'country' ? (vok.laender || [])
      : stapelFeld === 'schwerpunkt' ? [...new Set(Object.values(vok.schwerpunkte || {}).flat())]
        : null;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '1.8rem 1.2rem' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', color: C.navy, margin: 0, letterSpacing: '-0.02em' }}>Datenpflege</h1>
            <p style={{ fontSize: '0.85rem', color: C.muted, margin: '0.3rem 0 0' }}>
              Welche Angaben fehlen, und wen kann ich danach fragen.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/crm" style={{ ...KNOPF_HELL, textDecoration: 'none' }}>Zum CRM</Link>
            <button type="button" style={KNOPF_HELL} onClick={laden}><RefreshCw size={14} /> Neu laden</button>
          </div>
        </div>

        {fehler && (
          <div style={{ display: 'flex', gap: '0.5rem', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 9, padding: '0.7rem 0.9rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <AlertCircle size={16} /> {fehler}
          </div>
        )}
        {meldung && (
          <div style={{ display: 'flex', gap: '0.5rem', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', borderRadius: 9, padding: '0.7rem 0.9rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <CheckCircle size={16} /> {meldung}
          </div>
        )}

        {/* ── Was fehlt wo ─────────────────────────────────────────────── */}
        <div style={{ ...KARTE, marginBottom: '1.2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1rem', color: C.navy, margin: '0 0 0.9rem' }}>
            <ListChecks size={17} color={C.steel} /> Fehlende Angaben
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Zahl label="Firmen insgesamt" wert={uebersicht?.gesamt ?? '.'} />
            <Zahl label="mit Lücken" wert={uebersicht?.unvollstaendig ?? '.'} ton="#B45309" />
            <Zahl label="ausgewählt" wert={auswahl.length} ton={auswahl.length ? C.accent : C.muted} />
          </div>

          {/* Je Feld, damit man sieht, wo der Hebel liegt. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            <button type="button" onClick={() => setFilter('')} style={{
              ...KNOPF_HELL, background: filter ? '#fff' : C.navy, color: filter ? C.navy : '#fff',
              padding: '0.35rem 0.7rem', fontSize: '0.78rem',
            }}>alle</button>
            {(uebersicht?.je_feld || []).map((f) => (
              <button key={f.feld} type="button" onClick={() => { setFilter(f.feld); setAuswahl([]); }} style={{
                ...KNOPF_HELL, padding: '0.35rem 0.7rem', fontSize: '0.78rem',
                background: filter === f.feld ? C.navy : '#fff', color: filter === f.feld ? '#fff' : C.navy,
              }}>{f.label} <span style={{ opacity: 0.6 }}>{f.anzahl}</span></button>
            ))}
          </div>

          {/* Stapelbearbeitung */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.7rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: C.navy }}>Für die Auswahl setzen:</span>
            <select style={INPUT} value={stapelFeld} onChange={(e) => { setStapelFeld(e.target.value); setStapelWert(''); }}>
              {STAPEL_FELDER.map(([w, l]) => <option key={w} value={w}>{l}</option>)}
            </select>
            {stapelWerte ? (
              <select style={{ ...INPUT, minWidth: 220 }} value={stapelWert} onChange={(e) => setStapelWert(e.target.value)}>
                <option value="">Bitte wählen</option>
                {stapelWerte.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            ) : (
              <input style={{ ...INPUT, minWidth: 220 }} value={stapelWert} onChange={(e) => setStapelWert(e.target.value)} placeholder="Wert" />
            )}
            <button type="button" style={{ ...KNOPF, opacity: (!stapelWert || !auswahl.length || busy) ? 0.45 : 1 }}
              disabled={!stapelWert || !auswahl.length || busy} onClick={stapelSpeichern}>
              Für {auswahl.length} Firmen setzen
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.muted, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.5rem 0.4rem', width: 34 }}>
                    <input type="checkbox" checked={!!auswahl.length && auswahl.length === (uebersicht?.zeilen || []).length} onChange={alleUmschalten} />
                  </th>
                  <th style={{ padding: '0.5rem 0.4rem' }}>Firma</th>
                  <th style={{ padding: '0.5rem 0.4rem' }}>Sektor</th>
                  <th style={{ padding: '0.5rem 0.4rem' }}>alte Firmenart</th>
                  <th style={{ padding: '0.5rem 0.4rem' }}>fehlt</th>
                </tr>
              </thead>
              <tbody>
                {(uebersicht?.zeilen || []).map((z) => (
                  <tr key={z.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '0.5rem 0.4rem' }}>
                      <input type="checkbox" checked={auswahl.includes(z.id)} onChange={() => umschalten(z.id)} />
                    </td>
                    <td style={{ padding: '0.5rem 0.4rem', fontWeight: 600, color: C.navy }}>{z.name}</td>
                    <td style={{ padding: '0.5rem 0.4rem', color: z.sektor ? C.navy : '#B45309' }}>{z.sektor || 'offen'}</td>
                    <td style={{ padding: '0.5rem 0.4rem', color: C.muted }}>{z.company_type || '.'}</td>
                    <td style={{ padding: '0.5rem 0.4rem', color: C.muted }}>{(z.labels || []).join(', ')}</td>
                  </tr>
                ))}
                {!(uebersicht?.zeilen || []).length && (
                  <tr><td colSpan={5} style={{ padding: '1.2rem 0.4rem', color: C.muted }}>
                    {!uebersicht ? 'Einen Moment bitte.'
                      : uebersicht.gesamt === 0 ? 'Es sind noch keine Unternehmen im CRM angelegt.'
                        : filter ? 'Bei diesem Feld fehlt nichts. Wählen Sie „alle" für den Gesamtstand.'
                          : 'Alle Unternehmen sind vollständig gepflegt.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Mailings ─────────────────────────────────────────────────── */}
        <div style={KARTE}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1rem', color: C.navy, margin: '0 0 0.9rem' }}>
            <Mail size={17} color={C.steel} /> Aktualisierungsmailings
          </h2>
          <p style={{ fontSize: '0.83rem', color: C.muted, margin: '0 0 0.9rem', lineHeight: 1.6 }}>
            Angeschrieben werden nur Ansprechpersonen mit Einwilligung. Jede Person bekommt je Mailing
            genau eine Mail, mit einem Link, der einmal gilt. Der Versand läuft in Rationen und nur
            innerhalb des Versandfensters.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button type="button" style={KNOPF_HELL} onClick={vorschauHolen} disabled={busy}>
              <Eye size={14} /> Empfänger prüfen
            </button>
            <button type="button" style={KNOPF} onClick={kampagneAnlegen} disabled={busy}>
              <Users size={14} /> Mailing anlegen
            </button>
          </div>

          {vorschau && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.8rem', fontSize: '0.83rem', color: C.navy, marginBottom: '1rem', lineHeight: 1.7 }}>
              <strong>{vorschau.anzahl}</strong> Mails an Personen mit Einwilligung, aus {vorschau.firmen_geprueft} geprüften Firmen.
              {' '}<span style={{ color: C.muted }}>{(vorschau.ohne_ansprechperson || []).length} Firmen haben keine anschreibbare Ansprechperson.</span>
              {!!(vorschau.beispiele || []).length && (
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', color: C.muted }}>
                  {vorschau.beispiele.map((b, i) => (
                    <li key={i}>{b.firma}: {b.fehlend.join(', ')}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {kampagnen.map((k) => {
            const z = k.zahlen || {};
            return (
              <div key={k.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.9rem', marginBottom: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.92rem' }}>{k.name}</div>
                    <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: 2 }}>
                      Ration {k.ration}, Fenster {k.fenster_von} bis {k.fenster_bis}, Erinnerung nach {k.erinnerung_nach_tagen} Tagen
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, borderRadius: 20, padding: '0.2rem 0.6rem',
                      background: k.status === 'laeuft' ? '#F0FDF4' : C.bg,
                      color: k.status === 'laeuft' ? '#166534' : C.muted,
                      border: `1px solid ${k.status === 'laeuft' ? '#BBF7D0' : C.border}`,
                    }}>{k.status}</span>
                    {k.status === 'laeuft' ? (
                      <>
                        <button type="button" style={KNOPF} onClick={() => rationSenden(k.id, false)} disabled={busy}>
                          <Send size={13} /> Ration senden
                        </button>
                        <button type="button" style={KNOPF_HELL} onClick={() => rationSenden(k.id, true)} disabled={busy}>
                          Erinnerung
                        </button>
                        <button type="button" style={KNOPF_HELL} onClick={() => statusSetzen(k.id, 'pausiert')} disabled={busy}>
                          Anhalten
                        </button>
                      </>
                    ) : (
                      <button type="button" style={KNOPF} onClick={() => statusSetzen(k.id, 'laeuft')} disabled={busy}>
                        Freigeben
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                  <Zahl label="Einladungen" wert={z.gesamt ?? 0} />
                  <Zahl label="offen" wert={z.offen ?? 0} ton={C.muted} />
                  <Zahl label="versendet" wert={z.versendet ?? 0} ton={C.accent} />
                  <Zahl label="geöffnet" wert={z.geoeffnet ?? 0} ton={C.steel} />
                  <Zahl label="ausgefüllt" wert={z.ausgefuellt ?? 0} ton="#166534" />
                  <Zahl label="bestätigt" wert={z.bestaetigt ?? 0} ton="#166534" />
                  <Zahl label="unzustellbar" wert={z.unzustellbar ?? 0} ton={z.unzustellbar ? '#991B1B' : C.muted} />
                  <Zahl label="abgemeldet" wert={z.abgemeldet ?? 0} ton={C.muted} />
                </div>
              </div>
            );
          })}
          {!kampagnen.length && <p style={{ fontSize: '0.85rem', color: C.muted, margin: 0 }}>Noch kein Mailing angelegt.</p>}
        </div>
      </div>
    </div>
  );
}
