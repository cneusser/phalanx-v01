import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getToken } from '../api/client';
import { Folder, File, Image as ImageIcon, Upload, FolderPlus, Trash2, Download, Share2, ChevronLeft, RotateCcw, HardDrive, X, Eye, BarChart3, Edit2, ChevronUp, ChevronDown, Bell, Search, Eraser } from 'lucide-react';

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
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);
  const [structOpen, setStructOpen] = useState(false);
  const [structVal, setStructVal] = useState('');
  const [safeQ, setSafeQ] = useState('');
  const [safeHits, setSafeHits] = useState(null);
  const [reindexing, setReindexing] = useState(false);
  const [redactItem, setRedactItem] = useState(null);
  const [redactTerms, setRedactTerms] = useState('');
  const [redactPreview, setRedactPreview] = useState(null);
  const [redactBusy, setRedactBusy] = useState(false);

  const redactTermList = () => redactTerms.split(/[\n,;]+/).map(t => t.trim()).filter(t => t.length >= 2);
  function openRedact(item) { setRedactItem(item); setRedactTerms(''); setRedactPreview(null); }
  async function runRedactPreview() {
    const terms = redactTermList();
    if (!terms.length) { setRedactPreview({ total: 0, per_term: {} }); return; }
    setRedactBusy(true);
    try { setRedactPreview(await api.post(`/safe/${pid}/item/${redactItem.id}/redact-preview`, { terms })); }
    catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setRedactBusy(false); }
  }
  async function runRedact() {
    const terms = redactTermList();
    if (!terms.length) { setMsg('Bitte mindestens einen Begriff angeben.'); return; }
    setRedactBusy(true);
    try {
      const d = await api.post(`/safe/${pid}/item/${redactItem.id}/redact`, { terms });
      setRedactItem(null);
      setMsg(`Geschwärzte Kopie erstellt: „${d.name}" (${d.hits} Fundstelle(n)). Prüfen Sie sie und übernehmen Sie sie dann in den Datenraum.`);
      load(parent);
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setRedactBusy(false); }
  }

  // Volltextsuche im Safe (Name + Dateiinhalt), 250ms entprellt.
  useEffect(() => {
    const q = safeQ.trim();
    if (q.length < 2) { setSafeHits(null); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try { const r = await api.get(`/safe/${pid}/search?q=${encodeURIComponent(q)}`); if (alive) setSafeHits(r.results || []); }
      catch { if (alive) setSafeHits([]); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [safeQ, pid]);

  async function reindex() {
    setReindexing(true); setMsg('');
    try {
      const d = await api.post(`/safe/${pid}/reindex`, {});
      setMsg(`Volltext-Index aktualisiert: ${d.indexed} Safe-Datei(en), ${d.docsIndexed} Datenraum-Dokument(e).`);
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setReindexing(false); }
  }

  // Ordnerstruktur aus Freitext bauen (leere Ordner inklusive). Zwei Formate,
  // frei mischbar: vollständige Pfade mit „/" oder eine eingerückte Baumliste.
  function parseStructure(text) {
    const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
    const paths = [];
    const stack = [];
    for (const raw of lines) {
      const clean = raw.trim();
      if (clean.includes('/')) { paths.push(clean.replace(/^\/+|\/+$/g, '')); continue; }
      const indent = (raw.match(/^[\s]*/)[0] || '').replace(/\t/g, '  ').length;
      const depth = Math.floor(indent / 2);
      const name = clean.replace(/\//g, '').trim();
      if (!name) continue;
      while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
      stack.push({ depth, name });
      paths.push(stack.map(s => s.name).join('/'));
    }
    return Array.from(new Set(paths)).filter(Boolean);
  }
  async function dedupeStructure() {
    if (!window.confirm('Doppelte Ordner zusammenführen?\n\nJe Ordnername auf oberster Ebene bleibt der erste erhalten. Inhalte gleichnamiger Dubletten werden dorthin verschoben, die geleerten Dubletten wandern in den Papierkorb. Es geht nichts verloren.')) return;
    try {
      const d = await api.post(`/safe/${pid}/dedupe-structure`, {});
      setMsg(d.removed ? `${d.removed} Dublette(n) zusammengeführt${d.moved ? `, ${d.moved} Objekt(e) verschoben` : ''}.` : 'Keine doppelten Ordner gefunden.');
      load(parent);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  async function createStructure() {
    const paths = parseStructure(structVal);
    if (!paths.length) { setStructOpen(false); return; }
    setStructOpen(false); setStructVal('');
    await uploadCollected([], paths);
  }

  async function loadReport() {
    try { setReport(await api.get(`/safe/${pid}/access-report`)); setShowReport(true); setShowTrash(false); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }
  const [renameId, setRenameId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  async function saveRename(item) {
    const name = renameVal.trim();
    if (!name || name === item.name) { setRenameId(null); return; }
    try { await api.patch(`/safe/${pid}/item/${item.id}`, { name }); setRenameId(null); load(parent); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }
  async function moveItem(item, dir) {
    try { await api.post(`/safe/${pid}/item/${item.id}/move`, { dir }); load(parent); }
    catch (e) { setMsg('Fehler: ' + e.message); }
  }
  const fmtDate = (d) => d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'k. A.';
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
  useEffect(() => { if (project) document.title = `Safe · ${project.codename}, CapitalMatch`; return () => { document.title = 'CapitalMatch'; }; }, [project]);
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

  // Drag-and-drop: Verzeichnisse rekursiv durchlaufen (Dateien + auch leere Ordner).
  async function collectFromEntry(entry, prefix, files, folders) {
    if (!entry) return;
    if (entry.isFile) {
      await new Promise((resolve) => entry.file(f => { files.push({ file: f, path: prefix + entry.name }); resolve(); }, resolve));
    } else if (entry.isDirectory) {
      const dirPath = prefix + entry.name;
      folders.push(dirPath);
      const reader = entry.createReader();
      const all = [];
      await new Promise((resolve) => {
        const readBatch = () => reader.readEntries((batch) => {
          if (!batch.length) return resolve();
          all.push(...batch); readBatch();
        }, resolve);
        readBatch();
      });
      for (const child of all) await collectFromEntry(child, dirPath + '/', files, folders);
    }
  }
  async function uploadCollected(fileEntries, folderPaths) {
    if (!fileEntries.length && !folderPaths.length) return;
    setUploading(true); setMsg('');
    const fd = new FormData();
    const paths = [];
    for (const { file, path } of fileEntries) { fd.append('files', file); paths.push(path); }
    if (parent) fd.append('parent_id', parent);
    fd.append('paths', JSON.stringify(paths));
    fd.append('folder_paths', JSON.stringify(folderPaths));
    try {
      const res = await fetch(`/api/safe/${pid}/upload`, { method: 'POST', headers: authHeaders(), body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Upload fehlgeschlagen');
      setMsg(`${fileEntries.length} Datei(en) und ${folderPaths.length} Ordner hochgeladen.`); load(parent);
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

  // Sichere Vorschau (PDFs mit Wasserzeichen) in neuem Tab. Das Tab wird SYNCHRON
  // beim Klick geöffnet, sonst blockiert der Browser das Popup nach dem await.
  async function preview(item) {
    const win = window.open('', '_blank');
    if (win) win.document.write('<p style="font-family:sans-serif;color:#555;padding:1rem">Vorschau wird geladen…</p>');
    try {
      const res = await fetch(`/api/safe/${pid}/item/${item.id}/preview`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Fehler beim Laden');
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      if (win) win.location = url; else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (win) win.close();
      setMsg('Vorschau-Fehler: ' + e.message);
    }
  }

  async function del(item) {
    if (!window.confirm(`„${item.name}" in den Papierkorb verschieben?`)) return;
    try { await api.delete(`/safe/${pid}/item/${item.id}`); load(parent); } catch (e) { setMsg('Fehler: ' + e.message); }
  }
  async function loadTrash() { try { setTrash(await api.get(`/safe/${pid}/trash`)); setShowTrash(true); } catch (e) { setMsg('Fehler: ' + e.message); } }
  async function restore(item) { try { await api.post(`/safe/${pid}/item/${item.id}/restore`); loadTrash(); load(parent); } catch (e) { setMsg('Fehler: ' + e.message); } }
  async function purge(item) { if (!window.confirm(`„${item.name}" endgültig löschen?`)) return; try { await api.delete(`/safe/${pid}/item/${item.id}/purge`); loadTrash(); } catch (e) { setMsg('Fehler: ' + e.message); } }

  async function doPublish(access_level) {
    const t = publishItem;
    try {
      if (t.all) {
        const d = await api.post(`/safe/${pid}/publish-bulk`, { all: true, access_level });
        setMsg(`${d.published} Datei(en) in den Datenraum übernommen${d.skipped ? `, ${d.skipped} übersprungen (bereits vorhanden)` : ''}.`);
      } else if (t.is_folder) {
        const d = await api.post(`/safe/${pid}/publish-bulk`, { item_id: t.id, access_level });
        setMsg(`Ordner „${t.name}": ${d.published} Datei(en) übernommen${d.skipped ? `, ${d.skipped} übersprungen (bereits vorhanden)` : ''}.`);
      } else {
        const d = await api.post(`/safe/${pid}/item/${t.id}/publish`, { access_level });
        setMsg(d.skipped ? `„${t.name}" war bereits im Datenraum.` : `„${t.name}" in den Datenraum übernommen (Dokument #${d.document_id}).`);
      }
      setPublishItem(null);
    } catch (e) { setMsg('Fehler: ' + e.message); }
  }

  async function notifyDataroom() {
    const note = window.prompt('Käufer mit Datenraum-Zugang über neue Unterlagen informieren.\n\nOptionaler eigener Text (leer lassen für Standardtext):', '');
    if (note === null) return;
    setUploading(true); setMsg('');
    try {
      const d = await api.post(`/safe/${pid}/notify-dataroom`, note.trim() ? { message: note.trim() } : {});
      setMsg(d.notified ? `${d.notified} Käufer über neue Unterlagen benachrichtigt.` : 'Keine Käufer mit Datenraum-Zugang gefunden.');
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setUploading(false); }
  }

  async function buildTeaserIm() {
    if (!window.confirm('Teaser und Investment Memorandum als PDF bereitstellen?\n\nEin bereits hochgeladenes Master-PDF im Ordner „Teaser und Investment Memorandum" wird bevorzugt, sonst wird eines aus den Mandatsdaten erzeugt. Beides wird in den Datenraum übernommen (Teaser öffentlich, IM nach NDA). Jeder Empfänger erhält beim Download sein persönlich gewasserzeichntes Exemplar.')) return;
    setUploading(true); setMsg('');
    try {
      const d = await api.post(`/safe/${pid}/teaser-im/build`, {});
      const t = d.teaser, im = d.im;
      setMsg(`Teaser (${t.source}${t.skipped ? ', bereits im Datenraum' : ''}) und IM (${im.source}${im.skipped ? ', bereits im Datenraum' : ''}) bereitgestellt.`);
      load(parent);
    } catch (e) { setMsg('Fehler: ' + e.message); }
    finally { setUploading(false); }
  }

  const onDrop = async (e) => {
    e.preventDefault(); setDrag(false);
    const dt = e.dataTransfer;
    // Ordner-Drag-and-drop über die Entry-API (falls unterstützt), sonst flache Dateien.
    const items = dt.items ? Array.from(dt.items) : [];
    const entries = items.map(it => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null)).filter(Boolean);
    if (entries.length) {
      const files = [], folders = [];
      for (const entry of entries) await collectFromEntry(entry, '', files, folders);
      if (files.length || folders.length) return uploadCollected(files, folders);
    }
    if (dt.files?.length) doUpload(Array.from(dt.files), false);
  };

  if (denied) return <div style={{ maxWidth: 700, margin: '4rem auto', padding: '2rem', textAlign: 'center', color: C.muted }}>Kein Zugriff auf den Safe dieses Mandats. Der Container-Safe ist ausschließlich für Administratoren und Mandats-Pfleger zugänglich.</div>;

  // In Server-Reihenfolge (Position), damit die strukturbasierte Nummer stimmt.
  const listItems = items.filter(i => i.is_folder || !isImage(i.mime));
  const images = items.filter(i => !i.is_folder && isImage(i.mime));
  // Führende manuelle Nummer (z. B. „5.1.8 ") wird angezeigt über die Auto-Nummer ersetzt.
  const displayName = (name) => String(name || '').replace(/^\s*\d+(\.\d+)*[.)]?\s+/, '');
  // Freigabe-Ampel: grün = im Datenraum (mit Stufe), rot = noch nicht übernommen.
  const PUB_LABEL = { public: 'Teaser', nda: 'IM (nach NDA)', approved: 'Datenraum' };
  const pubDot = (level) => {
    const on = !!level;
    return (
      <span title={on ? `Im Datenraum · ${PUB_LABEL[level] || level}` : 'Noch nicht in den Datenraum übernommen'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 96, fontSize: '0.7rem', color: on ? '#166534' : '#b91c1c', fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
        {on ? (PUB_LABEL[level] || level) : 'nicht freigegeben'}
      </span>
    );
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ background: C.navy, color: '#fff', padding: '1.75rem 1.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Link to={`/projekte/${pid}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '0.6rem' }}><ChevronLeft size={14} /> Zurück zum Mandat{project ? ` „${project.codename}"` : ''}</Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <HardDrive size={15} /> Container-Safe
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                {project ? project.codename : `Mandat #${pid}`}
                {project && <span style={{ fontSize: '0.66rem', fontWeight: 700, background: project.mandate_type === 'fundraising' ? 'rgba(139,92,246,0.25)' : 'rgba(41,171,226,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '0.15rem 0.55rem', borderRadius: 20, letterSpacing: '0.03em' }}>{project.mandate_type === 'fundraising' ? 'STARTUP' : 'M&A'}</span>}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginTop: 4 }}>Mandat #{pid}{project && project.industry ? ` · ${project.industry}` : ''} · sichere Ablage, nur für Pfleger, kein Investor-Zugriff.</p>
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
          <button onClick={() => { setStructVal(''); setStructOpen(true); }} title="Leere Ordnerstruktur anlegen (auch verschachtelt)" style={btn('#fff', C.navy, true)}><FolderPlus size={15} /> Ordnerstruktur</button>
          <button onClick={dedupeStructure} title="Doppelte Ordner zusammenführen (Inhalte werden in den ersten verschoben)" style={btn('#fff', C.navy, true)}><RotateCcw size={15} /> Bereinigen</button>
          <div style={{ flex: 1 }} />
          <button onClick={buildTeaserIm} title="Teaser und IM als PDF bereitstellen (Master bevorzugt, sonst generiert)" style={btn('#fff', C.navy, true)}><File size={15} /> Teaser & IM</button>
          <button onClick={notifyDataroom} title="Käufer mit Datenraum-Zugang über neue Unterlagen per E-Mail informieren" style={btn('#fff', C.navy, true)}><Bell size={15} /> Käufer benachrichtigen</button>
          <button onClick={() => setPublishItem({ all: true, name: 'Alle Dateien' })} title="Alle Dateien dieses Mandats in den Datenraum übernehmen" style={btn('#fff', C.navy, true)}><Share2 size={15} /> Alles in Datenraum</button>
          <button onClick={() => showReport ? setShowReport(false) : loadReport()} style={btn('#fff', showReport ? C.accent : C.muted, true)}><BarChart3 size={15} /> Zugriffe</button>
          <button onClick={() => showTrash ? setShowTrash(false) : loadTrash()} style={btn('#fff', showTrash ? '#991b1b' : C.muted, true)}><Trash2 size={15} /> Papierkorb</button>
          <input ref={fileInput} type="file" multiple hidden onChange={e => doUpload(Array.from(e.target.files), false)} />
          <input ref={dirInput} type="file" hidden multiple onChange={e => doUpload(Array.from(e.target.files), true)} />
        </div>

        {/* Volltextsuche im Safe (Name + Dateiinhalt) */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} color={C.muted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={safeQ} onChange={e => setSafeQ(e.target.value)} placeholder="Im Safe suchen (Name und Dateiinhalt)…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem 0.5rem 1.9rem', fontSize: '0.85rem', border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none' }} />
          </div>
          {safeQ && <button onClick={() => setSafeQ('')} style={btn('#fff', C.muted, true)}>Zurück zur Ordneransicht</button>}
          <button onClick={reindex} disabled={reindexing} title="Text aus vorhandenen PDFs für die Suche nachziehen" style={btn('#fff', C.muted, true)}>{reindexing ? 'Indexiere…' : 'Index aktualisieren'}</button>
        </div>

        {msg &&<div style={{ background: msg.includes('Fehler') ? '#fee2e2' : '#d1fae5', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: msg.includes('Fehler') ? '#991b1b' : '#065f46' }}>{msg}</div>}
        {uploading && <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: C.accent }}>Wird hochgeladen…</div>}

        {safeHits !== null ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.7rem' }}>{safeHits.length} Treffer für „{safeQ.trim()}"</div>
            {safeHits.length === 0 ? (
              <div style={{ color: C.muted, padding: '1rem', textAlign: 'center' }}>Keine Treffer. Tipp: „Index aktualisieren" zieht Text aus älteren PDFs nach.</div>
            ) : safeHits.map(h => (
              <div key={h.id} style={{ padding: '0.6rem 0.4rem', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <span onClick={() => { setSafeQ(''); load(h.parent_id || null); }} title="Im Ordner öffnen" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}>
                    <File size={15} color={C.muted} />
                    <span style={{ fontWeight: 600, fontSize: '0.86rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(h.name)}</span>
                  </span>
                  <span style={{ display: 'flex', gap: 2 }}>
                    <button title="Vorschau" onClick={() => preview(h)} style={iconBtn}><Eye size={15} /></button>
                    <button title="Herunterladen" onClick={() => download(h)} style={iconBtn}><Download size={15} /></button>
                  </span>
                </div>
                {h.folder && <div style={{ fontSize: '0.7rem', color: C.muted, marginLeft: 21 }}>{h.folder}</div>}
                {h.snippet && <div style={{ fontSize: '0.74rem', color: C.text, marginLeft: 21, marginTop: 2, lineHeight: 1.4 }}>{renderSafeSnippet(h.snippet)}</div>}
              </div>
            ))}
          </div>
        ) : showReport ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={() => setShowReport(false)} style={{ ...miniBtn }}><ChevronLeft size={13} /> Zurück zum Safe</button>
                <strong style={{ color: C.navy }}>Zugriffsbericht</strong>
              </div>
              <span style={{ fontSize: '0.75rem', color: C.muted }}>Wer hat welche Datei angesehen oder heruntergeladen.</span>
            </div>
            {(!report || (report.per_user.length === 0)) ? (
              <div style={{ color: C.muted, padding: '1.5rem', textAlign: 'center' }}>Noch keine Zugriffe protokolliert.</div>
            ) : (
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: C.navy, marginBottom: '0.5rem' }}>Nach Person</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead><tr style={{ background: C.bg }}>{['Person', 'Ansichten', 'Downloads', 'Dokumente', 'Zuletzt'].map(h => <th key={h} style={thS}>{h.toUpperCase()}</th>)}</tr></thead>
                    <tbody>
                      {report.per_user.map((u, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={tdS}>{u.name || 'k. A.'}<div style={{ fontSize: '0.7rem', color: C.muted }}>{u.email}{u.role ? ' · ' + u.role : ''}</div></td>
                          <td style={tdS}>{u.views}</td><td style={{ ...tdS, fontWeight: 700, color: u.downloads > 0 ? '#166534' : C.muted }}>{u.downloads}</td>
                          <td style={tdS}>{u.documents}</td><td style={tdS}>{fmtDate(u.last_access)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: C.navy, marginBottom: '0.5rem' }}>Nach Dokument</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead><tr style={{ background: C.bg }}>{['Dokument', 'Ansichten', 'Downloads', 'Personen', 'Zuletzt'].map(h => <th key={h} style={thS}>{h.toUpperCase()}</th>)}</tr></thead>
                    <tbody>
                      {report.per_item.map((it, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={tdS}>{it.name || '(gelöscht)'}</td>
                          <td style={tdS}>{it.views}</td><td style={{ ...tdS, fontWeight: 700, color: it.downloads > 0 ? '#166534' : C.muted }}>{it.downloads}</td>
                          <td style={tdS}>{it.users}</td><td style={tdS}>{fmtDate(it.last_access)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : showTrash ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><button onClick={() => setShowTrash(false)} style={{ ...miniBtn }}><ChevronLeft size={13} /> Zurück zum Safe</button><strong style={{ color: C.navy }}>Papierkorb</strong></div><span style={{ fontSize: '0.75rem', color: C.muted }}>Objekte werden nach 30 Tagen automatisch entfernt.</span></div>
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
                  {/* Ordner + Nicht-Bild-Dateien in strukturierter Reihenfolge */}
                  {listItems.map((it, i) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ minWidth: 46, fontSize: '0.78rem', fontWeight: 700, color: C.navy, fontVariantNumeric: 'tabular-nums' }}>{it.number}</span>
                      {it.is_folder ? <Folder size={18} color={C.accent} /> : <File size={18} color={C.muted} />}
                      {renameId === it.id ? (
                        <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveRename(it); if (e.key === 'Escape') setRenameId(null); }}
                          onBlur={() => saveRename(it)}
                          style={{ flex: 1, fontSize: '0.88rem', padding: '0.3rem 0.5rem', border: `1px solid ${C.navy}`, borderRadius: 5, outline: 'none' }} />
                      ) : (
                        <span onClick={() => it.is_folder ? load(it.id) : preview(it)} title={it.is_folder ? 'Ordner öffnen' : 'Vorschau öffnen'} style={{ flex: 1, fontSize: '0.88rem', fontWeight: it.is_folder ? 600 : 400, color: C.text, cursor: 'pointer' }}>
                          {displayName(it.name)}{!it.is_folder && it.version > 1 && <span style={{ marginLeft: 6, fontSize: '0.68rem', background: C.bg, color: C.muted, padding: '0.05rem 0.4rem', borderRadius: 10 }}>v{it.version}</span>}
                        </span>
                      )}
                      {!it.is_folder && <span style={{ fontSize: '0.74rem', color: C.muted, minWidth: 60, textAlign: 'right' }}>{fmtBytes(it.size)}</span>}
                      {!it.is_folder && pubDot(it.published_level)}
                      <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <button title="Nach oben" disabled={i === 0} onClick={() => moveItem(it, 'up')} style={{ ...iconBtn, color: i === 0 ? '#cbd5e1' : C.muted }}><ChevronUp size={15} /></button>
                        <button title="Nach unten" disabled={i === listItems.length - 1} onClick={() => moveItem(it, 'down')} style={{ ...iconBtn, color: i === listItems.length - 1 ? '#cbd5e1' : C.muted }}><ChevronDown size={15} /></button>
                        <button title="Umbenennen" onClick={() => { setRenameId(it.id); setRenameVal(displayName(it.name)); }} style={iconBtn}><Edit2 size={15} /></button>
                        {it.is_folder && <button title="Ganzen Ordner in Datenraum übernehmen" onClick={() => setPublishItem(it)} style={iconBtn}><Share2 size={15} /></button>}
                        {!it.is_folder && <><button title="Vorschau (mit Wasserzeichen)" onClick={() => preview(it)} style={iconBtn}><Eye size={15} /></button><button title="Herunterladen" onClick={() => download(it)} style={iconBtn}><Download size={15} /></button>
                          {(String(it.mime || '').includes('pdf') || /\.pdf$/i.test(it.name || '')) && <button title="Schwärzen (Begriffe unkenntlich machen)" onClick={() => openRedact(it)} style={iconBtn}><Eraser size={15} /></button>}
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

      {/* Ordnerstruktur-Dialog */}
      {structOpen && (
        <div onClick={() => setStructOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', maxWidth: 520, width: '92%' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.4rem' }}>Ordnerstruktur anlegen</div>
            <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.8rem' }}>Eine Zeile je Ordner. Verschachtelung entweder mit Schrägstrich („01 Recht/Vertraege") oder mit Einrückung (zwei Leerzeichen je Ebene). Leere Ordner werden angelegt, unter dem aktuellen Ordner.</div>
            <textarea autoFocus value={structVal} onChange={e => setStructVal(e.target.value)} rows={9}
              placeholder={'01 Financials\n02 Recht\n  Vertraege\n  Gesellschaftsvertrag\n03 Steuern/Bescheide\n04 HR'}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', padding: '0.6rem', border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setStructOpen(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
              <button onClick={createStructure} style={btn(C.navy, '#fff')}><FolderPlus size={15} /> Struktur anlegen</button>
            </div>
          </div>
        </div>
      )}

      {/* Schwärzen-Dialog */}
      {redactItem && (
        <div onClick={() => setRedactItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', maxWidth: 520, width: '92%' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.3rem' }}>Schwärzen: {displayName(redactItem.name)}</div>
            <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '0.9rem' }}>
              Begriffe eingeben (einer je Zeile oder mit Komma getrennt). Alle Fundstellen werden geschwärzt und der Text an diesen Stellen wirklich entfernt. Es entsteht eine neue Kopie „(geschwärzt)", das Original bleibt unverändert.
            </div>
            <textarea autoFocus value={redactTerms} onChange={e => { setRedactTerms(e.target.value); setRedactPreview(null); }} rows={5}
              placeholder={'z. B.\nMüller GmbH\nHerr Schmidt\n3,2 Mio'}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.86rem', padding: '0.6rem', border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', resize: 'vertical' }} />
            {redactPreview && (
              <div style={{ fontSize: '0.8rem', color: redactPreview.total ? '#166534' : '#b91c1c', marginTop: '0.6rem' }}>
                {redactPreview.total ? `${redactPreview.total} Fundstelle(n) gefunden: ` : 'Keine Fundstellen (bei gescannten Bild-PDFs ohne Textebene findet die Suche nichts).'}
                {redactPreview.total ? Object.entries(redactPreview.per_term).map(([t, c]) => `„${t}" (${c})`).join(', ') : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setRedactItem(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
              <button onClick={runRedactPreview} disabled={redactBusy || !redactTermList().length} style={btn('#fff', C.navy, true)}>{redactBusy ? 'Prüfe…' : 'Vorschau: Fundstellen zählen'}</button>
              <button onClick={runRedact} disabled={redactBusy || !redactTermList().length} style={btn(C.navy, '#fff')}><Eraser size={15} /> Geschwärzte Kopie erstellen</button>
            </div>
          </div>
        </div>
      )}

      {/* Publish-Dialog */}
      {publishItem && (
        <div onClick={() => setPublishItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', maxWidth: 420, width: '90%' }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: '0.4rem' }}>In Datenraum übernehmen</div>
            <div style={{ fontSize: '0.83rem', color: C.muted, marginBottom: '1rem' }}>{publishItem.all ? 'Alle Dateien dieses Mandats werden als freigebbare Dokumente kopiert (bereits vorhandene werden übersprungen). ' : publishItem.is_folder ? `Alle Dateien im Ordner „${publishItem.name}" (inkl. Unterordner) werden kopiert. ` : `„${publishItem.name}" wird als freigebbares Dokument kopiert. `}Zugriffsebene wählen:</div>
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
// Trefferausschnitt: Server markiert Fundstellen mit « … », hier hervorgehoben.
function renderSafeSnippet(s) {
  return String(s).split(/[«»]/).map((p, i) => (i % 2 === 1
    ? <mark key={i} style={{ background: '#fde68a', padding: '0 1px', borderRadius: 2 }}>{p}</mark>
    : <span key={i}>{p}</span>));
}
const thS = { padding: '0.5rem 0.7rem', textAlign: 'left', fontWeight: 600, color: C.navy, fontSize: '0.68rem' };
const tdS = { padding: '0.5rem 0.7rem', color: '#334155' };
const miniBtn = { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.3rem 0.55rem', fontSize: '0.72rem', cursor: 'pointer', color: C.navy };
const crumbBtn = { background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0 };
