import React, { useMemo, useState } from 'react';
import { Folder, FileText, ChevronRight, Search, CornerLeftUp } from 'lucide-react';

// Ordner-navigierbarer Käufer-Datenraum. Baut den Baum aus dem Feld doc.folder
// (Pfad mit „/") und spiegelt so die Ablage aus dem Safe. Nur Ansicht + Download.
export default function DataRoomBrowser({ docs, C, renderDownload }) {
  const [path, setPath] = useState([]);      // aktueller Ordnerpfad als Segmente
  const [q, setQ] = useState('');

  const segs = (f) => String(f || '').split('/').map(s => s.trim()).filter(Boolean);
  const fmtMB = (b) => (b ? ` · ${(b / 1024 / 1024).toFixed(1)} MB` : '');
  const newCount = useMemo(() => docs.filter(d => d.is_new).length, [docs]);

  // Suche: flache Trefferliste über alle Dokumente (Name, Beschreibung, Ordner)
  const query = q.trim().toLowerCase();
  const searchHits = useMemo(() => {
    if (!query) return null;
    return docs.filter(d =>
      String(d.filename || '').toLowerCase().includes(query) ||
      String(d.description || '').toLowerCase().includes(query) ||
      String(d.folder || '').toLowerCase().includes(query));
  }, [docs, query]);

  // Aktuelle Ebene: Unterordner + Dateien direkt in diesem Ordner
  const { folders, files } = useMemo(() => {
    const here = path;
    const folderMap = new Map();   // name -> { count, hasNew }
    const fileList = [];
    for (const d of docs) {
      const fp = segs(d.folder);
      const sharesPrefix = here.every((p, i) => fp[i] === p);
      if (!sharesPrefix) continue;
      if (fp.length > here.length) {
        const name = fp[here.length];
        const e = folderMap.get(name) || { count: 0, hasNew: false };
        e.count += 1; e.hasNew = e.hasNew || !!d.is_new;
        folderMap.set(name, e);
      } else if (fp.length === here.length) {
        fileList.push(d);
      }
    }
    const folders = [...folderMap.entries()].map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
    fileList.sort((a, b) => String(a.filename).localeCompare(String(b.filename), 'de', { numeric: true }));
    return { folders, files: fileList };
  }, [docs, path]);

  const FileRow = (d) => (
    <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 0.9rem', background: C.bg, borderRadius: 8, marginBottom: '0.45rem', border: `1px solid ${d.is_new ? '#93c5fd' : C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <div style={{ width: 30, height: 30, background: `${C.navy}12`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={14} color={C.navy} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.83rem', color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description || d.filename}</span>
            {d.is_new && <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '0.05rem 0.35rem', borderRadius: 10, flexShrink: 0 }}>NEU</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {query && d.folder ? `${d.folder} · ` : ''}{d.filename}{fmtMB(d.file_size)}
          </div>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{renderDownload(d)}</div>
    </div>
  );

  return (
    <div>
      {/* Kopf: Neu-Hinweis + Suche */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
        {newCount > 0 && (
          <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: 20 }}>
            {newCount} neu seit Ihrem letzten Besuch
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', minWidth: 220 }}>
          <Search size={13} color={C.muted} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Dokumente durchsuchen…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.4rem 0.6rem 0.4rem 1.7rem', fontSize: '0.8rem', border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none' }} />
        </div>
      </div>

      {searchHits ? (
        <div>
          <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '0.6rem' }}>{searchHits.length} Treffer für „{q}"</div>
          {searchHits.length === 0 ? <p style={{ color: C.muted, fontSize: '0.83rem' }}>Keine Treffer.</p> : searchHits.map(FileRow)}
        </div>
      ) : (
        <div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: '0.7rem', fontSize: '0.8rem' }}>
            <button onClick={() => setPath([])} style={crumbBtn(C)}>Datenraum</button>
            {path.map((p, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={13} color={C.muted} />
                <button onClick={() => setPath(path.slice(0, i + 1))} style={crumbBtn(C)}>{p}</button>
              </React.Fragment>
            ))}
          </div>

          {path.length > 0 && (
            <button onClick={() => setPath(path.slice(0, -1))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.navy, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.5rem', padding: 0 }}>
              <CornerLeftUp size={14} /> Eine Ebene höher
            </button>
          )}

          {folders.length === 0 && files.length === 0 && (
            <p style={{ color: C.muted, fontSize: '0.83rem' }}>Dieser Ordner ist leer.</p>
          )}

          {/* Ordner */}
          {folders.map(f => (
            <button key={f.name} onClick={() => setPath([...path, f.name])}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '0.7rem 0.9rem', background: '#fff', borderRadius: 8, marginBottom: '0.45rem', border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Folder size={17} color={C.accent || C.navy} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text }}>{f.name}</span>
                {f.hasNew && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} title="Neue Unterlagen in diesem Ordner" />}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: '0.75rem' }}>
                {f.count} {f.count === 1 ? 'Datei' : 'Dateien'} <ChevronRight size={15} />
              </span>
            </button>
          ))}

          {/* Dateien */}
          {files.map(FileRow)}
        </div>
      )}
    </div>
  );
}

const crumbBtn = (C) => ({ background: 'none', border: 'none', color: C.navy, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, padding: '0.1rem 0.2rem' });
