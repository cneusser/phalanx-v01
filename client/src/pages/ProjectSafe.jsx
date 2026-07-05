import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getToken } from '../api/client';
import { Folder, File, Image as ImageIcon, Upload, FolderPlus, Trash2, Download, Share2, ChevronLeft, RotateCcw, HardDrive, X } from 'lucide-react';

const C = { navy: '#0D1B36', accent: '#1D4E89', steel: '#29ABE2', bg: '#F4F8FC', card: '#FFFFFF', border: '#DDE8F3', text: '#0F172A', muted: '#64748B' };
const fmtBytes = (b) => { b = Number(b) || 0; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB'; return (b / 1073741824).toFixed(2) + ' GB'; };
const isImage = (m) => (m || '').startsWith('image/');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function Thumb({ pid, item }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let u; let alive = true;
    fetch(`/api/safe/${pid}/item/${item.id}/download?inline=1`, { headers: authHeaders() })
      .then(r => r.blob()).then(b => { if (!alive) return; u = URL.createObjectURL(b); setUrl(u); }).catch(() => {});
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [pid, item.id]);
  return url ? <img src={url} alt={item.name} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6 }} />
    : <div style={{ width: '100%', height: 90, background: C.bg, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} color={C.muted} /></div>;
}

export default function ProjectSafe() {
  const { id: pid } = useParams();
  const [items, setItems] = useState([]);
  const [crumbs, setCrumbs] = useState([]);
  const [parent, setParent] = useState(null);
  const [usage, setUsage] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState([]);
  const [publishItem, setPublishItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [denied, setDenied] = useState(false);
  const fileInput = useRef(); const dirInput = useRef();

  const load = useCallback(async (parentId = null) => {
    setLoading(true); setMsg('');
    try {
      const q = parentId ? `?parent_id=${parentId}` : '';
      const d = await api.get(`/safe/${pid}${q}`);
      setItems(d.items); setCrumbs(d.breadcrumb); setParent(d.parent_id); if (d.project) setProject(d.project);
      api.get(`/safe/${pid}/usage`).then(setUsage).catch(() => {});
    } catch (e) { if ((e.message || '').includes('Zugriff')) setDenied(true); else setMsg('Fehler: ' + e.message); }
    finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { load(null); }, [load]);
  useEffect(() => { if (project) document.title = `Safe · ${project.codename} — CapitalMatch`; return () => { document.title = 'CapitalMatch'; }; }, [project]);
  // Ordner-Upload zuverlässig aktivieren (Attribute per Ref setzen)
  useEffect(() => { if (dirInput.current) { dirInput.current.setAttribute('webkitdirectory', ''); dirInput.current.setAttribute('directory', ''); } }, []);

  async function createFolder() {
    const name = window.prompt('Name des neuen Ordners:');
    if (!name) return;
    try { await api.post(`/safe/${pid}/folder`, { name, parent_id: parent }); load(parent); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }

  async function doUpload(files, withPaths) {
    if (!files || !files.length) return;
    setUploading(true); setMsg('');
    const fd = new FormData();
    const paths = [];
    for (const f of files) { fd.append('files', f); paths.push(withPaths ? (f.webkitRelativePath || f.name) : f.name); }
    if (parent) fd.append('parent_id', parent);
    fd.append('paths', JSON.stringify(paths));
    try {
      const res = await fetch(`/api/safe/${pid}/upload`, { method: 'POST', headers: authHeaders(), body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Upload fehlgeschlagen');
      setMsg(`${j.data.created.length} Datei(en) hochgeladen → ${project ? project.codename : 'Mandat #' + pid}.`); load(parent);
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setUploading(false); }
  }

  async function download(item) {
    try {
      const res = await fetch(`/api/safe/${pid}/item/${item.id}/download`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Fehler');
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = item.name; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setMsg('Download-Fehler: ' + e.message); }
  }

  async function del(item) {
    if (!window.confirm(`„${item.name}" in den Papierkorb verschieben?`)) return;
    try { await api.delete(`/safe/${pid}/item/${item.id}`); load(parent); } catch (e) { setMsg('Fehler: ' + e.message); }
  }
  async function loadTrash() { try { setTrash(await api.get(`/safe/${pid}/trash`)); setShowTrash(true); } catch (e) { setMsg('Fehler: ' + e.message); } }
  async function restore(item) { try { await api.post(`/safe/${pid}/item/${item.id}/restore`); loadTrash(); load(parent); } catch (e) { setMsg('Fehler: ' + e.message); } }
  async function purge(item) { if (!window.confirm(`„${item.name}" endgültig löschen?`)) return; try { await api.delete(`/safe/${pid}/item/${item.id}/purge`); loadTrash(); } catch (e) { setMsg('Fehler: ' + e.message); } }

  async function doPublish(access_level) {
    try { const d = await api.post(`/safe/${pid}/item/${publishItem.id}/publish`, { access_level }); setPublishItem(null); setMsg(`„${publishItem.name}" in den Datenraum übernommen (Dokument #${d.document_id}).`); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }

  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) doUpload(Array.from(e.dataTransfer.files), false); };

  if (denied) return <div style={{ maxWidth: 700, margin: '4rem auto', padding: '2rem', textAlign: 'center', color: C.muted }}>Kein Zugriff auf den Safe dieses Mandats. Der Container-Safe ist ausschließlich für Administratoren und Mandats-Pfleger zugänglich.</div>;

  const folders = items.filter(i => i.is_folder);
  const files = items.filter(i => !i.is_folder);
  const images = files.filter(f => isImage(f.mime));
  const others = files.filter(f => !isImage(f.mime));

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '1.75rem 1.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Link to="/admin" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.6rem' }}><ChevronLeft size={14} /> Admin</Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <HardDrive size={15} /> Container-Safe
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                {project ? project.codename : `Mandat #${pid}`}
                {project && <span style={{ fontSize: '0.66rem', fontWeight: 700, background: project.mandate_type === 'fundraising' ? 'rgba(139,92,246,0.25)' : 'rgba(41,171,226,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '0.15rem 0.55rem', borderRadius: 20, letterSpacing: '0.03em' }}>{project.mandate_type === 'fundraising' ? 'STARTUP' : 'M&A'}</span>}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginTop: 4 }}>Mandat #{pid}{project && project.industry ? ` · ${project.industry}` : ''} · sichere Ablage, nur für Pfleger — kein Investor-Zugriff.</p>
            </div>
            {usage && <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fmtBytes(usage.bytes)}</div><div>{usage.files} Dateien · {usage.folders} Ordner</div></div>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <button onClick={createFolder} style={btn(C.navy, '#fff')}><FolderPlus size={15} /> Neuer Ordner</button>
          <button onClick={() => fileInput.current?.click()} style={btn('#fff', C.navy, true)}><Upload size={15} /> Dateien</button>
          <button onClick={() => dirInput.current?.click()} style={btn('#fff', C.navy, true)}><Folder size={15} /> Ordner hochladen</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => showTrash ? setShowTrash(false) : loadTrash()} style={btn('#fff', showTrash ? '#991b1b' : C.muted, true)}><Trash2 size={15} /> Papierkorb</button>
          <input ref={fileInput} type="file" multiple hidden onChange={e => doUpload(Array.from(e.target.files), false)} />
          <input ref={dirInput} type="file" hidden multiple onChange={e => doUpload(Array.from(e.target.files), true)} />
        </div>

        {msg && <div style={{ background: msg.includes('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: msg.includes('Fehler') ? '#991b1b' : '#065f46' }}>{msg}</div>}
        {uploading && <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: C.accent }}>Wird hochgeladen…</div>}

        {showTrash ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><strong style={{ color: C.navy }}>Papierkorb</strong><span style={{ fontSize: '0.75rem', color: C.muted }}>Objekte werden nach 30 Tagen automatisch entfernt.</span></div>
            {trash.length === 0 ? <div style={{ color: C.muted, padding: '1.5rem', textAlign: 'center' }}>Papierkorb ist leer.</div> : trash.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '0.86rem' }}>{t.is_folder ? <Folder size={14} style={{ verticalAlign: -2 }} /> : <File size={14} style={{ verticalAlign: -2 }} />} {t.name}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => restore(t)} style={miniBtn}><RotateCcw size={13} /> Wiederherstellen</button>
                  <button onClick={() => purge(t)} style={{ ...miniBtn, color: '#991b1b', borderColor: '#fca5a5' }}><X size={13} /> Endgültig</button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
            style={{ border: `2px dashed ${drag ? C.steel : C.border}`, borderRadius: 10, background: drag ? '#eff6ff' : 'transparent', padding: '0.5rem', transition: 'all 0.15s' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', padding: '0.5rem 0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => load(null)} style={crumbBtn}>Start</button>
              {crumbs.map(cr => <React.Fragment key={cr.id}><span style={{ color: C.muted }}>/</span><button onClick={() => load(cr.id)} style={crumbBtn}>{cr.name}</button></React.Fragment>)}
            </div>

            {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Wird geladen…</div>
              : items.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>Leer. Dateien hierher ziehen oder oben hochladen.</div>
              : (
                <div style={{ padding: '0.5rem' }}>
                  {/* Ordner + Nicht-Bild-Dateien als Liste */}
                  {[...folders, ...others].map(it => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderBottom: `1px solid ${C.border}` }}>
                      {it.is_folder ? <Folder size={18} color={C.accent} /> : <File size={18} color={C.muted} />}
                      <span onClick={() => it.is_folder && load(it.id)} style={{ flex: 1, fontSize: '0.88rem', fontWeight: it.is_folder ? 600 : 400, color: C.text, cursor: it.is_folder ? 'pointer' : 'default' }}>
                        {it.name}{!it.is_folder && it.version > 1 && <span style={{ marginLeft: 6, fontSize: '0.68rem', background: C.bg, color: C.muted, padding: '0.05rem 0.4rem', borderRadius: 10 }}>v{it.version}</span>}
                      </span>
                      {!it.is_folder && <span style={{ fontSize: '0.74rem', color: C.muted, minWidth: 60, textAlign: 'right' }}>{fmtBytes(it.size)}</span>}
                      <span style={{ display: 'flex', gap: 4 }}>
                        {!it.is_folder && <><button title="Herunterladen" onClick={() => download(it)} style={iconBtn}><Download size={15} /></button>
                          <button title="In Datenraum übernehmen" onClick={() => setPublishItem(it)} style={iconBtn}><Share2 size={15} /></button></>}
                        <button title="Löschen" onClick={() => del(it)} style={{ ...iconBtn, color: '#991b1b' }}><Trash2 size={15} /></button>
                      </span>
                    </div>
                  ))}
                  {/* Bildergalerie */}
                  {images.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.navy, margin: '0.5rem 0.75rem' }}>BILDER</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', padding: '0 0.75rem' }}>
                        {images.map(im => (
                          <div key={im.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, background: '#fff' }}>
                            <Thumb pid={pid} item={im} />
                            <div style={{ fontSize: '0.72rem', color: C.text, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.name}</div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                              <button onClick={() => download(im)} style={{ ...miniBtn, flex: 1, justifyContent: 'center' }}><Download size={12} /></button>
                              <button onClick={() => setPublishItem(im)} style={{ ...miniBtn, flex: 1, justifyContent: 'center' }}><Share2 size={12} /></button>
                              <button onClick={() => del(im)} style={{ ...miniBtn, color: '#991b1b', borderColor: '#fca5a5' }}><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Publish-Dialog */}
      {publishItem && (
        <div onClick={() => setPublishItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', maxWidth: 420, width: '90%' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.4rem' }}>In Datenraum übernehmen</div>
            <div style={{ fontSize: '0.83rem', color: C.muted, marginBottom: '1rem' }}>„{publishItem.name}" wird als freigebbares Dokument kopiert. Zugriffsebene wählen:</div>
            {[['public', 'Teaser (öffentlich)'], ['nda', 'IM (nach NDA)'], ['approved', 'Datenraum (nach Freigabe)']].map(([lvl, lbl]) => (
              <button key={lvl} onClick={() => doPublish(lvl)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.7rem 0.9rem', marginBottom: '0.5rem', border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, color: C.navy }}>{lbl}</button>
            ))}
            <button onClick={() => setPublishItem(null)} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.82rem' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}

const btn = (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color, border: border ? `1px solid ${C.border}` : 'none', borderRadius: 8, padding: '0.55rem 1rem', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' });
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: C.accent, padding: 4, display: 'inline-flex' };
const miniBtn = { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.3rem 0.55rem', fontSize: '0.72rem', cursor: 'pointer', color: C.navy };
const crumbBtn = { background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0 };
