// Käufer-Datenraum, bedienbar wie ein Dateimanager (v0.401).
//
// Rückmeldung eines Käufers: „Ist es möglich, die Dokumente herunterzuladen?
// Das Arbeiten in Ihrer Webapp erscheint etwas umständlich." Beides stimmte.
// Auf der obersten Ebene gab es gar keinen Weg, alles zu holen, und jede Datei
// war ein eigener Klick.
//
// Deshalb jetzt: eine Tabelle statt Kacheln, Mehrfachauswahl mit Umschalttaste,
// Doppelklick öffnet einen Ordner, Rücktaste geht zurück, und ganz oben steht
// gut sichtbar, wie viele Dateien es gibt und wie man sie in einem Zug bekommt.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Folder, FileText, Lock, Download, Eye, Search, ChevronRight, ChevronUp, ChevronDown, Package, CornerLeftUp } from 'lucide-react';
import { api } from '../api/client';

const kb = (n) => {
  if (!n) return '';
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
};
const datum = (d) => (d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const endung = (name) => {
  const m = String(name || '').match(/\.([A-Za-z0-9]{1,5})$/);
  return m ? m[1].toUpperCase() : '';
};

function authHeaders() {
  const t = localStorage.getItem('phalanx_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Datei oder Archiv holen und als Download anstoßen (Bearer-Token nötig).
async function hole(pfad, dateiname, setFehler, body = null) {
  try {
    const res = await fetch(pfad, {
      method: body ? 'POST' : 'GET',
      headers: { ...authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let m = 'Download nicht möglich.';
      try { const d = await res.json(); if (d.error) m = d.error; } catch { /* Binärantwort */ }
      setFehler(m); return false;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = dateiname; a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) { setFehler('Download fehlgeschlagen: ' + e.message); return false; }
}

export default function SafeDataRoom({ projectId, C }) {
  const [daten, setDaten] = useState({ items: [], breadcrumb: [] });
  const [parent, setParent] = useState(null);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState(null);
  const [suche, setSuche] = useState('');
  const [treffer, setTreffer] = useState(null);
  const [busy, setBusy] = useState('');
  const [auswahl, setAuswahl] = useState([]);          // ids der markierten Zeilen
  const [zuletzt, setZuletzt] = useState(null);        // für die Umschalttaste
  const [sortierung, setSortierung] = useState({ feld: 'name', auf: true });
  const listeRef = useRef(null);

  const lade = useCallback(async (pid = null) => {
    setLaden(true); setFehler(null); setAuswahl([]); setZuletzt(null);
    try {
      const d = await api.get(`/safe/${projectId}${pid ? `?parent_id=${pid}` : ''}`);
      setDaten(d); setParent(pid);
    } catch (e) { setFehler(e.message); }
    setLaden(false);
  }, [projectId]);

  useEffect(() => { lade(null); }, [lade]);

  async function suchen(e) {
    e.preventDefault();
    if (suche.trim().length < 2) { setTreffer(null); return; }
    try { const r = await api.get(`/safe/${projectId}/search?q=${encodeURIComponent(suche.trim())}`); setTreffer(r.results || []); }
    catch (e2) { setFehler(e2.message); }
  }

  // Ordner zuerst, dann Dateien, innerhalb der Gruppe nach der gewählten Spalte.
  const zeilen = useMemo(() => {
    const kopie = [...(daten.items || [])];
    const richtung = sortierung.auf ? 1 : -1;
    kopie.sort((a, b) => {
      if (Number(a.is_folder) !== Number(b.is_folder)) return Number(b.is_folder) - Number(a.is_folder);
      if (sortierung.feld === 'size') return ((a.size || 0) - (b.size || 0)) * richtung;
      if (sortierung.feld === 'datum') return (new Date(a.updated_at || a.created_at || 0) - new Date(b.updated_at || b.created_at || 0)) * richtung;
      return String(`${a.number || ''} ${a.name}`).localeCompare(String(`${b.number || ''} ${b.name}`), 'de') * richtung;
    });
    return kopie;
  }, [daten.items, sortierung]);

  const waehlbar = zeilen.filter((i) => !i.gesperrt && (Number(i.is_folder) === 1 || i.darf_download));
  const alleGewaehlt = waehlbar.length > 0 && waehlbar.every((i) => auswahl.includes(i.id));
  const gewaehlteDateien = zeilen.filter((i) => auswahl.includes(i.id) && Number(i.is_folder) === 0).length;
  const gewaehlteOrdner = zeilen.filter((i) => auswahl.includes(i.id) && Number(i.is_folder) === 1).length;

  function markiere(item, ev) {
    if (item.gesperrt) return;
    const idx = zeilen.findIndex((z) => z.id === item.id);
    if (ev && ev.shiftKey && zuletzt != null) {
      // Bereich wie im Dateimanager: von der zuletzt angeklickten Zeile bis hier.
      const von = Math.min(zuletzt, idx), bis = Math.max(zuletzt, idx);
      const bereich = zeilen.slice(von, bis + 1).filter((z) => !z.gesperrt).map((z) => z.id);
      setAuswahl((a) => [...new Set([...a, ...bereich])]);
      return;
    }
    setZuletzt(idx);
    setAuswahl((a) => (a.includes(item.id) ? a.filter((x) => x !== item.id) : [...a, item.id]));
  }

  async function ladeAuswahl() {
    if (!auswahl.length) return;
    setBusy('auswahl');
    await hole(`/api/safe/${projectId}/zip`, 'Auswahl.zip', setFehler, { ids: auswahl });
    setBusy('');
  }

  async function ladeAlles() {
    setBusy('alles');
    await hole(`/api/safe/${projectId}/zip`, 'Datenraum.zip', setFehler, {});
    setBusy('');
  }

  async function ladeOrdner(f) {
    setBusy('o' + f.id);
    await hole(`/api/safe/${projectId}/folder/${f.id}/zip`, `${f.name}.zip`, setFehler);
    setBusy('');
  }

  // Tastatur wie im Dateimanager: Rücktaste geht eine Ebene hoch.
  useEffect(() => {
    const auf = (e) => {
      if (e.key !== 'Backspace') return;
      const z = e.target && e.target.tagName;
      if (z === 'INPUT' || z === 'TEXTAREA') return;
      if (!parent) return;
      e.preventDefault();
      const bc = daten.breadcrumb || [];
      lade(bc.length > 1 ? bc[bc.length - 2].id : null);
    };
    window.addEventListener('keydown', auf);
    return () => window.removeEventListener('keydown', auf);
  }, [parent, daten.breadcrumb, lade]);

  const Kopf = ({ feld, children, breite }) => (
    <th onClick={() => setSortierung((s) => ({ feld, auf: s.feld === feld ? !s.auf : true }))}
      style={{ textAlign: 'left', padding: '0.5rem 0.7rem', fontSize: '0.7rem', fontWeight: 700, color: C.muted,
        textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', userSelect: 'none', width: breite, whiteSpace: 'nowrap' }}>
      {children}
      {sortierung.feld === feld && (sortierung.auf ? <ChevronUp size={11} style={{ marginLeft: 3, verticalAlign: -1 }} /> : <ChevronDown size={11} style={{ marginLeft: 3, verticalAlign: -1 }} />)}
    </th>
  );

  const Knopf = ({ onClick, disabled, ton = 'still', children, titel }) => {
    const farben = {
      stark: { background: C.navy, color: '#fff' },
      gut: { background: '#dcfce7', color: '#166534' },
      still: { background: '#f1f5f9', color: C.navy },
    }[ton];
    return (
      <button onClick={onClick} disabled={disabled} title={titel}
        style={{ ...farben, display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', borderRadius: 7,
          padding: '0.42rem 0.8rem', fontSize: '0.78rem', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
        {children}
      </button>
    );
  };

  return (
    <div>
      {/* Kopfzeile: Was liegt hier, und wie bekomme ich es? */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap',
        background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '0.8rem' }}>
        <div style={{ fontSize: '0.83rem', color: C.text }}>
          {daten.gesamt_dateien ? (
            <>
              <strong>{daten.gesamt_dateien}</strong> {daten.gesamt_dateien === 1 ? 'Dokument' : 'Dokumente'} für Sie freigegeben
              {daten.gesamt_groesse ? <span style={{ color: C.muted }}> · {kb(daten.gesamt_groesse)}</span> : null}
              <div style={{ fontSize: '0.74rem', color: C.muted, marginTop: 2 }}>
                Sie können alles in einem Zug laden oder einzelne Zeilen markieren.
              </div>
            </>
          ) : (
            <><strong>Datenraum</strong>
              <div style={{ fontSize: '0.74rem', color: C.muted, marginTop: 2 }}>Ordner öffnen Sie mit einem Klick, ansehen können Sie jedes Dokument.</div>
            </>
          )}
        </div>
        {daten.gesamt_dateien === 0 ? (
          // Ehrlich statt ein Knopf, der nichts tut: Wenn fuer diesen Zugang nur
          // das Ansehen freigegeben ist, soll das dastehen und nicht erst beim
          // Klick als Fehlermeldung erscheinen.
          <span style={{ fontSize: '0.78rem', color: '#92400e', background: '#FFFBEB', border: '1px solid #fcd34d', borderRadius: 7, padding: '0.45rem 0.7rem', maxWidth: 420 }}>
            Für Ihren Zugang ist bisher das Ansehen freigegeben, nicht das Herunterladen. Sprechen Sie uns an, wenn Sie die Unterlagen als Datei benötigen.
          </span>
        ) : (
          <Knopf onClick={ladeAlles} disabled={busy === 'alles'} ton="stark" titel="Den gesamten freigegebenen Datenraum als ZIP laden">
            <Package size={14} /> {busy === 'alles' ? 'Archiv wird gepackt…' : 'Alles herunterladen'}
          </Knopf>
        )}
      </div>

      {/* Suche */}
      <form onSubmit={suchen} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input value={suche} onChange={(e) => { setSuche(e.target.value); if (!e.target.value) setTreffer(null); }}
            placeholder="Im Datenraum suchen, auch im Text der Dokumente"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem 0.5rem 2rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.83rem' }} />
        </div>
        <button type="submit" style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Suchen</button>
      </form>

      {fehler && <p style={{ background: '#fef2f2', color: '#991b1b', borderRadius: 8, padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>{fehler}</p>}

      {treffer ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <strong style={{ fontSize: '0.85rem', color: C.text }}>{treffer.length} Treffer</strong>
            <button onClick={() => { setTreffer(null); setSuche(''); }} style={{ background: 'none', border: 'none', color: C.navy, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Zurück zum Ordner</button>
          </div>
          {treffer.length === 0 && <p style={{ color: C.muted, fontSize: '0.83rem' }}>Nichts gefunden.</p>}
          {treffer.map((t) => (
            <div key={t.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.6rem 0.8rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.83rem', color: C.text, overflowWrap: 'break-word' }}>{t.name}</div>
                  <div style={{ fontSize: '0.72rem', color: C.muted }}>{t.folder || 'Hauptordner'}</div>
                  {t.snippet && <div style={{ fontSize: '0.74rem', color: C.muted, marginTop: 3 }} dangerouslySetInnerHTML={{ __html: t.snippet.replace(/«/g, '<mark>').replace(/»/g, '</mark>') }} />}
                </div>
                {t.darf_download && (
                  <Knopf onClick={() => hole(`/api/safe/${projectId}/item/${t.id}/download`, t.name, setFehler)}>
                    <Download size={12} /> Laden
                  </Knopf>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Pfadleiste */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', flexWrap: 'wrap' }}>
              {parent && (
                <button onClick={() => { const bc = daten.breadcrumb || []; lade(bc.length > 1 ? bc[bc.length - 2].id : null); }}
                  title="Eine Ebene höher (Rücktaste)"
                  style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.2rem 0.35rem', marginRight: 4, cursor: 'pointer', color: C.navy }}>
                  <CornerLeftUp size={13} />
                </button>
              )}
              <button onClick={() => lade(null)} style={{ background: 'none', border: 'none', color: C.navy, cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: '0.8rem' }}>Datenraum</button>
              {(daten.breadcrumb || []).map((c) => (
                <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronRight size={12} color={C.muted} />
                  <button onClick={() => lade(c.id)} style={{ background: 'none', border: 'none', color: C.navy, cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>{c.name}</button>
                </span>
              ))}
            </div>
            {parent && (
              <Knopf onClick={() => ladeOrdner({ id: parent, name: (daten.breadcrumb || []).slice(-1)[0]?.name || 'Ordner' })}
                disabled={busy === 'o' + parent} ton="gut" titel="Diesen Ordner mit allen Unterordnern laden">
                <Package size={13} /> {busy === 'o' + parent ? 'Archiv wird gepackt…' : 'Diesen Ordner laden'}
              </Knopf>
            )}
          </div>

          {/* Auswahlleiste, erscheint nur wenn etwas markiert ist */}
          {auswahl.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap',
              background: '#EFF6FF', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.5rem 0.8rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#1e3a8a', fontWeight: 600 }}>
                {gewaehlteDateien > 0 && `${gewaehlteDateien} ${gewaehlteDateien === 1 ? 'Dokument' : 'Dokumente'}`}
                {gewaehlteDateien > 0 && gewaehlteOrdner > 0 && ' und '}
                {gewaehlteOrdner > 0 && `${gewaehlteOrdner} ${gewaehlteOrdner === 1 ? 'Ordner' : 'Ordner'}`}
                {' '}markiert
              </span>
              <span style={{ display: 'flex', gap: '0.4rem' }}>
                <Knopf onClick={() => setAuswahl([])}>Auswahl aufheben</Knopf>
                <Knopf onClick={ladeAuswahl} disabled={busy === 'auswahl'} ton="stark">
                  <Download size={13} /> {busy === 'auswahl' ? 'Archiv wird gepackt…' : 'Auswahl herunterladen'}
                </Knopf>
              </span>
            </div>
          )}

          {laden ? <p style={{ color: C.muted, fontSize: '0.83rem' }}>Laden…</p> : (
            <div ref={listeRef} style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {zeilen.length === 0 ? (
                <p style={{ color: C.muted, fontSize: '0.83rem', padding: '1rem', margin: 0 }}>Dieser Ordner ist leer.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ width: 34, padding: '0.5rem 0 0.5rem 0.7rem' }}>
                        <input type="checkbox" checked={alleGewaehlt} title="Alles auf dieser Ebene markieren"
                          onChange={() => setAuswahl(alleGewaehlt ? [] : waehlbar.map((i) => i.id))} />
                      </th>
                      <Kopf feld="name">Name</Kopf>
                      <Kopf feld="size" breite={90}>Größe</Kopf>
                      <Kopf feld="datum" breite={110}>Geändert</Kopf>
                      <th style={{ width: 168 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {zeilen.map((f) => {
                      const ordner = Number(f.is_folder) === 1;
                      const markiert = auswahl.includes(f.id);
                      return (
                        <tr key={f.id}
                          onDoubleClick={() => ordner && !f.gesperrt && lade(f.id)}
                          style={{ borderBottom: `1px solid ${C.border}`, background: markiert ? '#EFF6FF' : (f.gesperrt ? '#FAFAFA' : '#fff'), cursor: ordner && !f.gesperrt ? 'pointer' : 'default' }}>
                          <td style={{ padding: '0.5rem 0 0.5rem 0.7rem' }}>
                            {!f.gesperrt && (ordner || f.darf_download) && (
                              <input type="checkbox" checked={markiert} onChange={() => {}} onClick={(e) => { e.stopPropagation(); markiere(f, e); }} />
                            )}
                          </td>
                          <td style={{ padding: '0.5rem 0.7rem' }}
                            onClick={(e) => { if (ordner && !f.gesperrt && !e.shiftKey) lade(f.id); }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                              {f.gesperrt ? <Lock size={15} color="#b45309" style={{ flex: 'none' }} />
                                : ordner ? <Folder size={15} color={C.navy} style={{ flex: 'none' }} />
                                  : <FileText size={15} color={C.muted} style={{ flex: 'none' }} />}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: ordner ? 600 : 400, color: f.gesperrt ? C.muted : C.text, overflowWrap: 'break-word' }}>
                                  {f.number && <span style={{ color: C.muted, fontWeight: 500, marginRight: 6 }}>{f.number}</span>}
                                  {f.name}
                                  {f.vertraulich && !f.gesperrt && <span style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '1px 7px', fontSize: '0.66rem', fontWeight: 700 }}>vertraulich</span>}
                                </div>
                                {f.gesperrt && <div style={{ fontSize: '0.72rem', color: '#b45309' }}>Vertraulich, Freigabe erforderlich. Sprechen Sie uns an.</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem 0.7rem', fontSize: '0.76rem', color: C.muted, whiteSpace: 'nowrap' }}>
                            {ordner ? (f.anzahl != null ? `${f.anzahl} Objekte` : '') : kb(f.size)}
                          </td>
                          <td style={{ padding: '0.5rem 0.7rem', fontSize: '0.76rem', color: C.muted, whiteSpace: 'nowrap' }}>
                            {datum(f.updated_at || f.created_at)}
                            {!ordner && endung(f.name) && <span style={{ marginLeft: 6, opacity: 0.7 }}>{endung(f.name)}</span>}
                          </td>
                          <td style={{ padding: '0.4rem 0.7rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {!f.gesperrt && ordner && (
                              <Knopf onClick={() => ladeOrdner(f)} disabled={busy === 'o' + f.id} ton="gut" titel="Ordner mit allen Unterordnern laden">
                                <Package size={12} /> {busy === 'o' + f.id ? 'Packt…' : 'Laden'}
                              </Knopf>
                            )}
                            {!f.gesperrt && !ordner && (
                              <span style={{ display: 'inline-flex', gap: '0.3rem' }}>
                                <Knopf onClick={() => window.open(`/api/safe/${projectId}/item/${f.id}/preview`, '_blank')} titel="Ansehen, mit persönlichem Wasserzeichen">
                                  <Eye size={12} /> Ansehen
                                </Knopf>
                                {f.darf_download && (
                                  <Knopf onClick={() => hole(`/api/safe/${projectId}/item/${f.id}/download`, f.name, setFehler)} ton="gut">
                                    <Download size={12} /> Laden
                                  </Knopf>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
          <p style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.6rem' }}>
            Doppelklick öffnet einen Ordner, die Rücktaste geht eine Ebene zurück. Mit gedrückter Umschalttaste markieren Sie mehrere Zeilen auf einmal.
            Jeder Abruf wird zur Nachvollziehbarkeit protokolliert, Vorschauen tragen ein persönliches Wasserzeichen.
          </p>
        </>
      )}
    </div>
  );
}
