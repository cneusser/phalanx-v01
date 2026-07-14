// ─────────────────────────────────────────────────────────────────────────────
// LocalVolumeProvider: speichert Safe-Objekte im Dateisystem (Railway-Volume
// bevorzugt, sonst lokal). Default-Provider; entspricht dem heutigen Verhalten.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

function baseDir() {
  const base = process.env.SAFE_DIR
    || (process.env.RAILWAY_VOLUME_MOUNT_PATH
          ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'safe')
          : (process.env.UPLOAD_DIR
              ? path.join(process.env.UPLOAD_DIR, 'safe')
              : path.join(__dirname, '../../../uploads/safe')));
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

// Pfad-Traversal verhindern: Key auf einfache Segmente beschränken.
function safeJoin(key) {
  const clean = String(key).replace(/\\/g, '/').replace(/\.\.+/g, '').replace(/^\/+/, '');
  return path.join(baseDir(), clean);
}

function create() {
  return {
    name: 'local',
    async put(key, buffer) {
      const full = safeJoin(key);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, buffer);
      return { key };
    },
    async get(key) {
      const full = safeJoin(key);
      if (!fs.existsSync(full)) throw new Error('Objekt nicht gefunden');
      return fs.readFileSync(full);
    },
    async delete(key) {
      const full = safeJoin(key);
      if (fs.existsSync(full)) fs.unlinkSync(full);
      return true;
    },
    async exists(key) {
      return fs.existsSync(safeJoin(key));
    },
    async list(prefix = '') {
      const root = baseDir();
      const start = safeJoin(prefix);
      const out = [];
      const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) walk(p);
          else out.push({ key: path.relative(root, p).replace(/\\/g, '/'), size: fs.statSync(p).size });
        }
      };
      walk(start);
      return out;
    },
  };
}

module.exports = { create };
