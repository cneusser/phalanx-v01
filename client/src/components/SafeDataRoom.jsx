// Käufer-Datenraum auf Basis des Safe (v0.392).
//
// Zeigt den echten Ordnerbaum statt einer flachen Liste. Vertrauliche Bereiche
// erscheinen gesperrt, bis dafür eine Einzelfreigabe vorliegt. Ganze Ordner
// lassen sich als Archiv laden, damit niemand Datei für Datei klicken muss.
import React, { useCallback, useEffect, useState } from 'react';
import { Folder, FileText, Lock, Download, Eye, Search, ChevronRight, Package } from 'lucide-react';
import { api } from '../api/client';

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function authHeaders() {
  const t = localStorage.getItem('phalanx_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Datei über fetch holen und als Download anstoßen (Bearer-Token nötig).
async function hole(pfad, dateiname, setFehler) {
  try {
    const res = await fetch(pfad, { headers: authHeaders() });
    if (!res.ok) {
      let m = 'Download nicht möglich.';
      try { const d = await res.json(); if (d.error) m = d.error; } catch { /* Binärantwort */ }
      setFehler(m); return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = dateiname; a.click();
    URL.revokeObjectURL(url);
  } catch (e) { setFehler('Download fehlgeschlagen: ' + e.message); }
}

export default function SafeDataRoom({ projectId, C }) {
  const [daten, setDaten] = useState({ items: [], breadcrumb: [] });
  const [parent, setParent] = useState(null);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState(null);
  const [suche, setSuche] = useState('');
  const [treffer, setTreffer] = useState(null);
  const [busy, setBusy] = useState(false);

  const lade = useCallback(async (pid = null) => {
    setLaden(true); setFehler(null);
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

  const ordner = daten.items.filter((i) => i.is_folder);
  const dateien = daten.items.filter((i) => !i.is_folder);
  const ladbareHier = dateien.filter((f) => f.darf_download).length;

  return (
    <div>
      {/* Suche */}
      <form onSubmit={suchen} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.9rem' }}>
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
                  <button onClick={() => hole(`/api/safe/${projectId}/item/${t.id}/download`, t.name, setFehler)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <Download size={11} /> Laden
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Pfadleiste und Ordner-Download */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', flexWrap: 'wrap' }}>
              <button onClick={() => lade(null)} style={{ background: 'none', border: 'none', color: C.navy, cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: '0.8rem' }}>Datenraum</button>
              {(daten.breadcrumb || []).map((c) => (
                <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronRight size={12} color={C.muted} />
                  <button onClick={() => lade(c.id)} style={{ background: 'none', border: 'none', color: C.navy, cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}>{c.name}</button>
                </span>
              ))}
            </div>
            {parent && ladbareHier > 0 && (
              <button disabled={busy} onClick={async () => {
                setBusy(true);
                const name = (daten.breadcrumb || []).slice(-1)[0]?.name || 'Ordner';
                await hole(`/api/safe/${projectId}/folder/${parent}/zip`, `${name}.zip`, setFehler);
                setBusy(false);
              }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#dcfce7', color: '#166534', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 7, cursor: busy ? 'default' : 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                <Package size={12} /> {busy ? 'Archiv wird erstellt…' : 'Diesen Ordner als ZIP laden'}
              </button>
            )}
          </div>

          {laden ? <p style={{ color: C.muted, fontSize: '0.83rem' }}>Laden…</p> : (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {daten.items.length === 0 && <p style={{ color: C.muted, fontSize: '0.83rem', padding: '1rem', margin: 0 }}>Dieser Ordner ist leer.</p>}

              {ordner.map((f) => (
                <div key={f.id} onClick={() => !f.gesperrt && lade(f.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', borderBottom: `1px solid ${C.border}`, cursor: f.gesperrt ? 'default' : 'pointer', background: f.gesperrt ? '#fafafa' : '#fff' }}>
                  {f.gesperrt ? <Lock size={15} color="#b45309" /> : <Folder size={15} color={C.navy} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: f.gesperrt ? C.muted : C.text }}>
                      <span style={{ color: C.muted, fontWeight: 500, marginRight: 6 }}>{f.number}</span>{f.name}
                    </div>
                    {f.gesperrt && <div style={{ fontSize: '0.72rem', color: '#b45309' }}>Vertraulich, Freigabe erforderlich. Sprechen Sie uns an.</div>}
                  </div>
                  {!f.gesperrt && <ChevronRight size={14} color={C.muted} />}
                </div>
              ))}

              {dateien.map((f) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', borderBottom: `1px solid ${C.border}`, background: f.gesperrt ? '#fafafa' : '#fff' }}>
                  {f.gesperrt ? <Lock size={15} color="#b45309" /> : <FileText size={15} color={C.muted} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', color: f.gesperrt ? C.muted : C.text, overflowWrap: 'break-word' }}>
                      <span style={{ color: C.muted, marginRight: 6 }}>{f.number}</span>{f.name}
                      {f.vertraulich && !f.gesperrt && <span style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '1px 7px', fontSize: '0.66rem', fontWeight: 700 }}>vertraulich</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: C.muted }}>
                      {f.gesperrt ? 'Vertraulich, Freigabe erforderlich' : kb(f.size)}
                    </div>
                  </div>
                  {!f.gesperrt && (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button onClick={() => window.open(`/api/safe/${projectId}/item/${f.id}/preview`, '_blank')}
                        title="Ansehen (mit Wasserzeichen)"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: C.navy, border: 'none', padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600 }}>
                        <Eye size={11} /> Ansehen
                      </button>
                      {f.darf_download && (
                        <button onClick={() => hole(`/api/safe/${projectId}/item/${f.id}/download`, f.name, setFehler)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600 }}>
                          <Download size={11} /> Laden
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.6rem' }}>
            Jeder Abruf wird zur Nachvollziehbarkeit protokolliert. Vorschauen tragen ein persönliches Wasserzeichen.
          </p>
        </>
      )}
    </div>
  );
}
