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
import { ListChecks, Mail, Send, RefreshCw, Users, AlertCircle, CheckCircle, Eye, Megaphone, Languages, Wand2 } from 'lucide-react';

const C = { navy: '#111820', accent: '#1D4E89', steel: '#174a6a', bg: '#f4f6f7', card: '#FFFFFF', border: '#d8dde1', muted: '#64748B' };
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


// Ein Bereich, der sich zuklappen laesst (v0.474).
//
// Die Seite trug fuenf Bereiche untereinander, alle offen. Zusammen sind das
// mehrere Bildschirmhoehen, und gearbeitet wird immer an einem. Zugeklappt
// bleibt die Ueberschrift mit einer Zeile, die sagt, was drinsteht; so muss
// man nicht aufklappen, um zu sehen, ob es sich lohnt.
//
// Die Wahl steht im localStorage. Wer die Seite neu laedt, findet sie so vor,
// wie er sie verlassen hat.
function Bereich({ id, titel, Symbol, zusatz, ton, offen, umschalten, children }) {
  const auf = offen.has(id);
  return (
    <div style={{ ...KARTE, marginBottom: '1.2rem', ...(ton || {}) }}>
      <button
        type="button"
        onClick={() => umschalten(id)}
        aria-expanded={auf}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.45rem', width: '100%',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ color: C.muted, fontSize: '0.8rem', width: 12 }}>{auf ? '\u25be' : '\u25b8'}</span>
        {Symbol ? <Symbol size={17} color={ton ? '#991b1b' : C.steel} /> : null}
        <h2 style={{ fontSize: '1rem', color: ton ? '#991b1b' : C.navy, margin: 0 }}>{titel}</h2>
        {zusatz && !auf ? (
          <span style={{ fontSize: '0.78rem', color: C.muted, marginLeft: 'auto' }}>{zusatz}</span>
        ) : null}
      </button>
      {auf && <div style={{ marginTop: '0.9rem' }}>{children}</div>}
    </div>
  );
}

export default function Datenpflege() {
  const [uebersicht, setUebersicht] = useState(null);
  const [filter, setFilter] = useState('');
  const [auswahl, setAuswahl] = useState([]);
  const [stapelFeld, setStapelFeld] = useState('sektor');
  const [stapelWert, setStapelWert] = useState('');
  // Beim Schwerpunkt wird der Sektor mitgewählt, sonst scheitert das Setzen bei
  // jeder Firma, die noch keinen Sektor hat.
  const [stapelSektor, setStapelSektor] = useState('');
  const [vok, setVok] = useState({ sektoren: [], schwerpunkte: {}, laender: [] });
  const [kampagnen, setKampagnen] = useState([]);
  const [vorschau, setVorschau] = useState(null);
  const [rundmails, setRundmails] = useState([]);
  const [rundVorschau, setRundVorschau] = useState(null);
  const [sprachen, setSprachen] = useState(null);
  const [sprachenFehler, setSprachenFehler] = useState('');
  // Welche Bereiche sind aufgeklappt. Beim ersten Besuch nur der erste.
  const [offeneBereiche, setOffeneBereiche] = useState(() => {
    try {
      const gespeichert = JSON.parse(localStorage.getItem('cm_datenpflege_bereiche') || 'null');
      if (Array.isArray(gespeichert)) return new Set(gespeichert);
    } catch { /* privater Modus oder kaputter Eintrag */ }
    return new Set(['luecken']);
  });
  const bereichUmschalten = (id) => setOffeneBereiche((alt) => {
    const neu = new Set(alt);
    if (neu.has(id)) neu.delete(id); else neu.add(id);
    try { localStorage.setItem('cm_datenpflege_bereiche', JSON.stringify([...neu])); }
    catch { /* nicht schlimm, dann merkt es sich die Seite eben nicht */ }
    return neu;
  });
  // Übersetzungen: zugeklappt als Standard (v0.471). Aufgeklappt wird, woran
  // gerade gearbeitet wird, und das ist immer genau ein Mandat.
  const [offeneMandate, setOffeneMandate] = useState(() => new Set());
  const [sprachFilter, setSprachFilter] = useState('offen');
  const mandatUmschalten = (id) => setOffeneMandate((alt) => {
    const neu = new Set(alt);
    if (neu.has(id)) neu.delete(id); else neu.add(id);
    return neu;
  });
  const sichtbareMandate = ((sprachen && sprachen.mandate) || []).filter((m) => (
    sprachFilter === 'alle'
      ? true
      : (sprachFilter === 'freigegeben'
        ? m.uebersetzung_status === 'freigegeben'
        : m.uebersetzung_status !== 'freigegeben')
  ));

  const [kriterien, setKriterien] = useState(null);
  const [kriterienLaeuft, setKriterienLaeuft] = useState(false);

  // Trockenlauf und Übernahme laufen durch dieselbe Route. Der Unterschied ist
  // ein Schalter, damit beide dasselbe tun und nur eines davon schreibt.
  async function kriterienLauf(uebernehmen) {
    setKriterienLaeuft(true);
    try { setKriterien(await api.post('/crm/kriterien-ableiten', { uebernehmen })); }
    catch (e) { setKriterien({ geprueft: 0, vorgesehen: 0, ohne_zuordnung: 0, geschrieben: 0, zeilen: [], fehler: e.message }); }
    finally { setKriterienLaeuft(false); }
  }
  const [entwurf, setEntwurf] = useState({});   // id → { feld_en: Text }
  const [meldung, setMeldung] = useState('');
  const [fehler, setFehler] = useState('');
  const [busy, setBusy] = useState(false);

  const laden = useCallback(async () => {
    try {
      const [u, k, v, r] = await Promise.all([
        api.get(`/pflege/pflege/uebersicht${filter ? `?fehlt=${encodeURIComponent(filter)}` : ''}`),
        api.get('/pflege/kampagnen'),
        api.get('/crm/vokabular'),
        api.get('/pflege/rundmails').catch(() => []),
      ]);
      setUebersicht(u); setKampagnen(k); setVok(v); setRundmails(r || []);
      // Kein stilles catch mehr (v0.467). Hier stand „erst nach der
      // Migration da", und genau das war der Fehler: Die Abfrage antwortete
      // mit 500, der Abschnitt erschien nie, und es sah aus, als gäbe es ihn
      // nicht. Ein verschluckter Fehler sieht aus wie eine fehlende Funktion.
      try { setSprachen(await api.get('/pflege/uebersetzungen')); }
      catch (e) { setSprachenFehler(e.message || 'Die Übersetzungen lassen sich nicht laden.'); }
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
    // Eine Sammelaktion ist schnell und damit gefaehrlich (v0.473): 276
    // Firmen auf einen falschen Wert zu setzen dauert einen Klick, das
    // Zuruecknehmen dauert einen Abend.
    if (auswahl.length > 25) {
      const feldName = (STAPEL_FELDER.find(([w]) => w === stapelFeld) || [, stapelFeld])[1];
      if (!window.confirm(`${feldName} für ${auswahl.length} Firmen auf „${stapelWert}" setzen?`)) return;
    }
    setBusy(true); setFehler(''); setMeldung('');
    try {
      const r = await api.post('/pflege/pflege/stapel', {
        feld: stapelFeld, wert: stapelWert, ids: auswahl,
        sektor: stapelFeld === 'schwerpunkt' ? stapelSektor : undefined,
      });
      const abgelehnt = r.abgelehnt || [];
      // Die Gründe zusammenfassen, damit nicht zehnmal dasselbe dasteht.
      const gruende = [...new Set(abgelehnt.map((a) => a.grund))].join('; ');
      setMeldung(`${r.gesetzt} Firmen gesetzt${abgelehnt.length
        ? `, ${abgelehnt.length} nicht (${gruende}): ${abgelehnt.map((a) => a.name).join(', ')}`
        : ''}.`);
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

  // Beim Schwerpunkt nur die Werte des gewählten Sektors anbieten. Alles andere
  // wäre eine Liste, aus der man garantiert das Falsche nimmt.
  // ── Rundmail an registrierte Konten ──────────────────────────────────────
  const rundVorschauHolen = async () => {
    setBusy(true); setFehler('');
    try { setRundVorschau(await api.get('/pflege/rundmail/empfaenger-vorschau')); }
    catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const rundAnlegen = async () => {
    setBusy(true); setFehler(''); setMeldung('');
    try {
      const r = await api.post('/pflege/rundmails', {});
      setMeldung(`Rundmail angelegt: ${r.angelegt} Empfänger aus ${r.geprueft} geprüften Konten. ${(r.ausgeschlossen || []).length} ausgeschlossen.`);
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const rundStatus = async (id, status) => {
    setBusy(true); setFehler(''); setMeldung('');
    try {
      await api.put(`/pflege/rundmails/${id}`, { status });
      setMeldung(status === 'laeuft'
        ? 'Rundmail ist freigegeben. Versendet wird erst, wenn Sie eine Ration anstoßen.'
        : 'Rundmail angehalten.');
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const rundSenden = async (id) => {
    setBusy(true); setFehler(''); setMeldung('');
    try {
      const r = await api.post(`/pflege/rundmails/${id}/senden`, {});
      if (r.uebersprungen) setMeldung(`Nichts versendet: ${r.uebersprungen}.`);
      else if (r.fehler && r.fehler.length) {
        setMeldung(`${r.versendet} von ${r.betrachtet} versendet. Nicht zugestellt: ${r.fehler.map((f) => f.grund).join('; ')}`);
      } else setMeldung(`${r.versendet} von ${r.betrachtet} Mails versendet.`);
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  // ── Übersetzungen ────────────────────────────────────────────────────────
  const feldWert = (m, f) => {
    const eigen = entwurf[m.id] && entwurf[m.id][`${f.feld}_en`];
    return eigen !== undefined ? eigen : f.en;
  };
  const feldSetzen = (id, feld, wert) => setEntwurf((e) => ({ ...e, [id]: { ...(e[id] || {}), [`${feld}_en`]: wert } }));

  const uebersetzungSpeichern = async (m, status) => {
    setBusy(true); setFehler(''); setMeldung('');
    try {
      const koerper = { ...(entwurf[m.id] || {}) };
      if (status) koerper.uebersetzung_status = status;
      await api.put(`/pflege/uebersetzungen/${m.id}`, koerper);
      setMeldung(status === 'freigegeben'
        ? `${m.codename}: englische Fassung freigegeben, ab sofort für englische Leser sichtbar.`
        : `${m.codename}: gespeichert, weiterhin Entwurf.`);
      setEntwurf((e) => { const n = { ...e }; delete n[m.id]; return n; });
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const vorbelegen = async (m) => {
    setBusy(true); setFehler(''); setMeldung('');
    try {
      const r = await api.post(`/pflege/uebersetzungen/${m.id}/vorbelegen`, {});
      setMeldung(`${m.codename}: ${r.vorbelegt} Feld(er) vorbelegt, bitte prüfen und freigeben.`);
      await laden();
    } catch (e) { setFehler(e.message); }
    setBusy(false);
  };

  const stapelWerte = stapelFeld === 'sektor' ? (vok.sektoren || [])
    : stapelFeld === 'country' ? (vok.laender || [])
      : stapelFeld === 'schwerpunkt' ? ((vok.schwerpunkte || {})[stapelSektor] || [])
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
        <Bereich id="luecken" titel="Fehlende Angaben" Symbol={ListChecks}
          offen={offeneBereiche} umschalten={bereichUmschalten}
          zusatz={uebersicht ? `${uebersicht.unvollstaendig} von ${uebersicht.gesamt} Firmen mit Lücken` : null}>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Zahl label="Firmen insgesamt" wert={uebersicht?.gesamt ?? '.'} />
            <Zahl label="mit Lücken" wert={uebersicht?.unvollstaendig ?? '.'} ton="#B45309" />
            <Zahl label="ausgewählt" wert={auswahl.length} ton={auswahl.length ? C.accent : C.muted} />
          </div>

          {/* Je Feld, damit man sieht, wo der Hebel liegt. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            <button type="button" onClick={() => { setFilter(''); setAuswahl([]); }} style={{
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

          {/* Auswaehlen, ohne zur Tabelle zu scrollen (v0.473).
              Das Kaestchen in der Kopfzeile gibt es laenger, nur steht es
              genau dort, wohin man erst scrollen muss. Bei 276 Zeilen ist
              das der Unterschied zwischen zwei Klicks und zwei Minuten. */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
            <button type="button" onClick={alleUmschalten} style={{
              ...KNOPF_HELL, padding: '0.35rem 0.7rem', fontSize: '0.78rem',
            }}>
              {auswahl.length && auswahl.length === (uebersicht?.zeilen || []).length
                ? 'Auswahl aufheben'
                : `alle ${(uebersicht?.zeilen || []).length} auswählen`}
            </button>
            {auswahl.length > 0 && (
              <span style={{ fontSize: '0.78rem', color: C.muted }}>
                {auswahl.length} ausgewählt
                {filter ? ` · gefiltert nach „${(uebersicht?.je_feld || []).find((f) => f.feld === filter)?.label || filter}"` : ''}
              </span>
            )}
          </div>

          {/* Stapelbearbeitung */}
          {/* Klebt oben (v0.473): Wer unten in der Liste auswaehlt, soll den
              Knopf nicht suchen muessen, mit dem er den Wert setzt. */}
          <div style={{
            display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9,
            padding: '0.7rem', marginBottom: '1rem',
            position: 'sticky', top: 0, zIndex: 5, boxShadow: '0 2px 10px rgba(0,0,0,.05)',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: C.navy }}>Für die Auswahl setzen:</span>
            <select style={INPUT} value={stapelFeld} onChange={(e) => { setStapelFeld(e.target.value); setStapelWert(''); setStapelSektor(''); }}>
              {STAPEL_FELDER.map(([w, l]) => <option key={w} value={w}>{l}</option>)}
            </select>
            {stapelFeld === 'schwerpunkt' && (
              <select style={{ ...INPUT, minWidth: 220 }} value={stapelSektor}
                onChange={(e) => { setStapelSektor(e.target.value); setStapelWert(''); }}>
                <option value="">Sektor wählen</option>
                {(vok.sektoren || []).map((s2) => <option key={s2} value={s2}>{s2}</option>)}
              </select>
            )}
            {stapelWerte ? (
              <select style={{ ...INPUT, minWidth: 220 }} value={stapelWert} onChange={(e) => setStapelWert(e.target.value)}
                disabled={stapelFeld === 'schwerpunkt' && !stapelSektor}>
                <option value="">
                  {stapelFeld === 'schwerpunkt' && !stapelSektor ? 'erst Sektor wählen'
                    : stapelWerte.length ? 'Bitte wählen' : 'für diesen Sektor nicht vorgesehen'}
                </option>
                {stapelWerte.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            ) : (
              <input style={{ ...INPUT, minWidth: 220 }} value={stapelWert} onChange={(e) => setStapelWert(e.target.value)} placeholder="Wert" />
            )}
            <button type="button" style={{ ...KNOPF, opacity: (!stapelWert || !auswahl.length || busy) ? 0.45 : 1 }}
              disabled={!stapelWert || !auswahl.length || busy} onClick={stapelSpeichern}>
              {stapelFeld === 'schwerpunkt' && stapelSektor
                ? `Sektor und Schwerpunkt für ${auswahl.length} Firmen setzen`
                : `Für ${auswahl.length} Firmen setzen`}
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
        </Bereich>

        {/* ── Mailings ─────────────────────────────────────────────────── */}
        <Bereich id="mailings" titel="Aktualisierungsmailings" Symbol={Mail}
          offen={offeneBereiche} umschalten={bereichUmschalten}
          zusatz={kampagnen.length ? `${kampagnen.length} angelegt` : 'noch keines angelegt'}>
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
        </Bereich>

        {/* ── Suchkriterien aus dem Schwerpunkt ableiten (v0.469) ───────── */}
        <Bereich id="kriterien" titel="Suchkriterien aus dem Schwerpunkt"
          offen={offeneBereiche} umschalten={bereichUmschalten}
          zusatz={kriterien ? `${kriterien.vorgesehen} würden ergänzt` : null}>
          <p style={{ fontSize: '0.83rem', color: C.muted, margin: '0 0 0.9rem', lineHeight: 1.6 }}>
            Recherchierte Kontakte tragen oft nur einen Satz wie „Bau, Infrastruktur, Immobilien,
            Technologie". Der Abgleich im Deal-Funnel vergleicht aber Branchen und Regionen als
            Kennung. Hier wird der Satz in diese Kennungen übersetzt. Bestehende Kriterien bleiben
            unverändert, und was sich nicht eindeutig zuordnen lässt, wird genannt statt geraten.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            <button onClick={() => kriterienLauf(false)} disabled={kriterienLaeuft}
              style={{ padding: '0.45rem 0.9rem', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', color: C.navy, cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}>
              Trockenlauf
            </button>
            <button onClick={() => kriterienLauf(true)} disabled={kriterienLaeuft || !kriterien || !kriterien.vorgesehen}
              style={{ padding: '0.45rem 0.9rem', borderRadius: 8, border: 'none', background: kriterien && kriterien.vorgesehen ? C.accent : '#e2e8f0', color: kriterien && kriterien.vorgesehen ? '#fff' : C.muted, cursor: kriterien && kriterien.vorgesehen ? 'pointer' : 'not-allowed', fontSize: '0.83rem', fontWeight: 600 }}>
              Übernehmen
            </button>
          </div>
          {kriterien && (
            <>
              <p style={{ fontSize: '0.83rem', color: C.navy, margin: '0 0 0.6rem' }}>
                {kriterien.geprueft} Kontakte mit Schwerpunkt geprüft,
                {' '}{kriterien.vorgesehen} würden ergänzt,
                {' '}{kriterien.ohne_zuordnung} ohne eindeutige Zuordnung.
                {kriterien.geschrieben > 0 && <strong> {kriterien.geschrieben} wurden geschrieben.</strong>}
              </p>
              <div style={{ maxHeight: 280, overflow: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                {kriterien.zeilen.map((z) => (
                  <div key={z.id} style={{ padding: '0.5rem 0.7rem', borderBottom: `1px solid ${C.border}`, fontSize: '0.79rem' }}>
                    <span style={{ fontWeight: 600, color: C.navy }}>{z.name}</span>
                    <span style={{ color: C.muted }}> · {z.text}</span>
                    <div style={{ color: z.aenderung ? '#166534' : C.muted, marginTop: 2 }}>
                      {z.aenderung ? `${z.branchen.join(', ')}${z.regionen.length ? ' · ' + z.regionen.join(', ') : ''}` : z.grund}
                      {z.unklar.length > 0 && <span style={{ color: '#92400e' }}> · nicht zugeordnet: {z.unklar.join(', ')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Bereich>

        {/* ── Übersetzungen der Mandate ─────────────────────────────────── */}
        {sprachenFehler && (
          <Bereich id="sprachen" titel="Übersetzungen der Mandate" Symbol={Languages}
            offen={offeneBereiche} umschalten={bereichUmschalten}
            ton={{ borderColor: '#fca5a5', background: '#fef2f2' }}
            zusatz="lässt sich nicht laden">
            <p style={{ fontSize: '0.85rem', color: '#991b1b', margin: 0, lineHeight: 1.6 }}>{sprachenFehler}</p>
          </Bereich>
        )}
        {sprachen && (
          <Bereich id="sprachen" titel="Übersetzungen der Mandate" Symbol={Languages}
            offen={offeneBereiche} umschalten={bereichUmschalten}
            zusatz={sprachen.offen > 0
              ? `${sprachen.offen} von ${sprachen.mandate.length} offen`
              : 'alle freigegeben'}>
            <p style={{ fontSize: '0.83rem', color: C.muted, margin: '0 0 0.9rem', lineHeight: 1.6 }}>
              Links steht die deutsche Fassung, rechts die englische. Gezeigt wird einem englischen
              Leser nur, was freigegeben ist. Solange nichts freigegeben ist, sieht er den deutschen
              Text mit einem Hinweis auf die Sprache, nie eine ungeprüfte Übersetzung.
              {' '}{sprachen.offen > 0
                ? <strong>{sprachen.offen} von {sprachen.mandate.length} Mandaten sind noch offen.</strong>
                : <strong>Alle Mandate sind freigegeben.</strong>}
              {!sprachen.dienst_eingerichtet && (
                <>
                  {' '}Ein Übersetzungsdienst ist nicht eingerichtet, die Vorbelegung steht daher nicht
                  zur Verfügung. Dafür genügt in der Umgebungskonfiguration der Schlüssel
                  {' '}<code>UEBERSETZER_SCHLUESSEL</code>, dazu wahlweise{' '}
                  <code>UEBERSETZER_ART</code> mit <code>deepl</code> oder <code>openai</code>.
                  Vorbelegtes bleibt Entwurf und geht nie ungeprüft nach aussen.
                </>
              )}
            </p>

            {/* Filter und Sammelschalter (v0.471). Acht Mandate nebeneinander
                aufgeklappt sind mehrere Bildschirmhöhen, und gearbeitet wird
                immer nur an einem. */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.9rem' }}>
              {[['offen', 'Noch offen'], ['freigegeben', 'Freigegeben'], ['alle', 'Alle']].map(([wert, text]) => (
                <button key={wert} type="button" onClick={() => setSprachFilter(wert)}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: 7, fontSize: '0.79rem', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${sprachFilter === wert ? C.navy : C.border}`,
                    background: sprachFilter === wert ? C.navy : '#fff',
                    color: sprachFilter === wert ? '#fff' : C.navy,
                  }}>{text}</button>
              ))}
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => setOffeneMandate(new Set(sichtbareMandate.map((m) => m.id)))}
                style={{ ...KNOPF_HELL, fontSize: '0.79rem' }}>Alle aufklappen</button>
              <button type="button" onClick={() => setOffeneMandate(new Set())}
                style={{ ...KNOPF_HELL, fontSize: '0.79rem' }}>Alle zuklappen</button>
            </div>

            {!sichtbareMandate.length && (
              <p style={{ fontSize: '0.83rem', color: C.muted, margin: 0 }}>
                {sprachFilter === 'offen' ? 'Kein Mandat ist mehr offen.'
                  : (sprachFilter === 'freigegeben' ? 'Noch kein Mandat ist freigegeben.' : 'Es gibt noch kein Mandat.')}
              </p>
            )}

            {sichtbareMandate.map((m) => (
              <div key={m.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.9rem', marginBottom: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem', marginBottom: offeneMandate.has(m.id) ? '0.7rem' : 0 }}>
                  <div
                    onClick={() => mandatUmschalten(m.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mandatUmschalten(m.id); } }}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span style={{ color: C.muted, fontSize: '0.8rem', width: 12, display: 'inline-block' }}>
                      {offeneMandate.has(m.id) ? '▾' : '▸'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.92rem' }}>{m.codename}</div>
                      <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: 2 }}>
                        erfasst auf {m.sprache === 'en' ? 'Englisch' : 'Deutsch'}
                        {m.uebersetzt_am ? ` · zuletzt bearbeitet ${new Date(m.uebersetzt_am).toLocaleDateString('de-DE')}` : ''}
                        {!offeneMandate.has(m.id) && !m.vollstaendig ? ' · englische Fassung unvollständig' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, borderRadius: 20, padding: '0.2rem 0.6rem',
                      background: m.uebersetzung_status === 'freigegeben' ? '#F0FDF4' : (m.uebersetzung_status === 'entwurf' ? '#FFFBEB' : C.bg),
                      color: m.uebersetzung_status === 'freigegeben' ? '#166534' : (m.uebersetzung_status === 'entwurf' ? '#92400E' : C.muted),
                      border: `1px solid ${m.uebersetzung_status === 'freigegeben' ? '#BBF7D0' : (m.uebersetzung_status === 'entwurf' ? '#FDE68A' : C.border)}`,
                    }}>{m.uebersetzung_status}</span>
                    {sprachen.dienst_eingerichtet && !m.vollstaendig && (
                      <button type="button" style={KNOPF_HELL} onClick={() => vorbelegen(m)} disabled={busy}>
                        <Wand2 size={13} /> Vorbelegen
                      </button>
                    )}
                    <button type="button" style={KNOPF_HELL} onClick={() => uebersetzungSpeichern(m, 'entwurf')} disabled={busy}>
                      Speichern
                    </button>
                    {m.uebersetzung_status !== 'freigegeben' && (
                      <button type="button" style={KNOPF} onClick={() => uebersetzungSpeichern(m, 'freigegeben')} disabled={busy}>
                        <CheckCircle size={13} /> Freigeben
                      </button>
                    )}
                  </div>
                </div>

                {offeneMandate.has(m.id) && m.felder.filter((f) => f.de || f.en).map((f) => (
                  <div key={f.feld} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', marginBottom: '0.6rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                        {f.feld} · Deutsch
                      </div>
                      <div style={{ fontSize: '0.83rem', color: C.navy, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '0.5rem 0.65rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {f.de || <span style={{ color: C.muted }}>leer</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                        {f.feld} · Englisch
                      </div>
                      <textarea
                        value={feldWert(m, f)}
                        onChange={(e) => feldSetzen(m.id, f.feld, e.target.value)}
                        rows={Math.min(10, Math.max(2, Math.ceil((feldWert(m, f) || f.de || '').length / 60)))}
                        style={{ ...INPUT, width: '100%', fontSize: '0.83rem', lineHeight: 1.55, resize: 'vertical', fontFamily: 'inherit' }}
                        placeholder="Englische Fassung"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </Bereich>
        )}

        {/* ── Rundmail an alle registrierten Konten ─────────────────────── */}
        <Bereich id="rundmail" titel="Rundmail an registrierte Konten" Symbol={Megaphone}
          offen={offeneBereiche} umschalten={bereichUmschalten}
          zusatz={rundmails.length ? `${rundmails.length} angelegt` : 'noch keine angelegt'}>
          <p style={{ fontSize: '0.83rem', color: C.muted, margin: '0 0 0.9rem', lineHeight: 1.6 }}>
            Für Mitteilungen, die den Zugang betreffen. Angeschrieben werden nur Konten mit bestätigter
            Adresse, die aktiv und freigeschaltet sind. Widerspruch im CRM und die Sperrliste gelten auch
            hier. Jede Ration stoßen Sie selbst an.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button type="button" style={KNOPF_HELL} onClick={rundVorschauHolen} disabled={busy}>
              <Eye size={14} /> Empfänger prüfen
            </button>
            <button type="button" style={KNOPF} onClick={rundAnlegen} disabled={busy}>
              <Megaphone size={14} /> Rundmail anlegen
            </button>
          </div>

          {rundVorschau && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '0.8rem', fontSize: '0.83rem', color: C.navy, marginBottom: '1rem', lineHeight: 1.7 }}>
              <strong>{rundVorschau.anzahl}</strong> Empfänger aus {rundVorschau.konten_geprueft} geprüften Konten.
              {' '}<span style={{ color: C.muted }}>{rundVorschau.ausgeschlossen} wegen Widerspruch oder Sperre ausgeschlossen.</span>
              {!!(rundVorschau.beispiele || []).length && (
                <div style={{ color: C.muted, marginTop: '0.4rem' }}>
                  Beispiele: {rundVorschau.beispiele.map((b) => b.email).join(', ')}
                </div>
              )}
            </div>
          )}

          {rundmails.map((r) => {
            const z = r.zahlen || {};
            return (
              <div key={r.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.9rem', marginBottom: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.92rem' }}>{r.name}</div>
                    <div style={{ fontSize: '0.76rem', color: C.muted, marginTop: 2 }}>
                      Betreff: {r.betreff} · Ration {r.ration} · Fenster {r.fenster_von} bis {r.fenster_bis}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, borderRadius: 20, padding: '0.2rem 0.6rem',
                      background: r.status === 'laeuft' ? '#F0FDF4' : C.bg,
                      color: r.status === 'laeuft' ? '#166534' : C.muted,
                      border: `1px solid ${r.status === 'laeuft' ? '#BBF7D0' : C.border}`,
                    }}>{r.status}</span>
                    {r.status === 'laeuft' ? (
                      <>
                        <button type="button" style={KNOPF} onClick={() => rundSenden(r.id)} disabled={busy}>
                          <Send size={13} /> Ration senden
                        </button>
                        <button type="button" style={KNOPF_HELL} onClick={() => rundStatus(r.id, 'pausiert')} disabled={busy}>
                          Anhalten
                        </button>
                      </>
                    ) : (
                      <button type="button" style={KNOPF} onClick={() => rundStatus(r.id, 'laeuft')} disabled={busy}>
                        Freigeben
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                  <Zahl label="Empfänger" wert={z.gesamt ?? 0} />
                  <Zahl label="offen" wert={z.offen ?? 0} ton={C.muted} />
                  <Zahl label="versendet" wert={z.versendet ?? 0} ton={C.accent} />
                  <Zahl label="abgemeldet" wert={z.abgemeldet ?? 0} ton={C.muted} />
                  <Zahl label="unzustellbar" wert={z.unzustellbar ?? 0} ton={z.unzustellbar ? '#991B1B' : C.muted} />
                </div>
              </div>
            );
          })}
          {!rundmails.length && <p style={{ fontSize: '0.85rem', color: C.muted, margin: 0 }}>Noch keine Rundmail angelegt.</p>}
        </Bereich>
      </div>
    </div>
  );
}
