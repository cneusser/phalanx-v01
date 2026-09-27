#!/usr/bin/env node
/**
 * Datenraum aufräumen: Vorschlag ansehen, dann entscheiden.
 *
 * Aufruf:
 *   node server/scripts/datenraum-aufraeumen.js --mandat FARADAY
 *       zeigt den Plan. Ändert nichts.
 *
 *   node server/scripts/datenraum-aufraeumen.js --mandat FARADAY --verschieben
 *       sortiert die Dateien in die vorgeschlagenen Ordner.
 *
 *   node server/scripts/datenraum-aufraeumen.js --mandat FARADAY --stufen
 *       setzt die Vertraulichkeitsstufen.
 *
 * Beide Schritte sind getrennt, weil sie unterschiedlich heikel sind. Eine
 * falsch einsortierte Datei fällt auf und ist in zehn Sekunden zurückgeschoben.
 * Eine falsch gesetzte Stufe fällt erst auf, wenn jemand etwas gesehen hat, das
 * er nicht sehen sollte. Deshalb sehen Sie die Stufen erst als Liste.
 *
 * Fehlende Ordner werden angelegt, nichts wird gelöscht, und eine Datei, deren
 * Name auf keine Regel passt, bleibt liegen, wo sie ist.
 */
const { planen, ORDNER } = require('../utils/datenraumPlan');

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? (process.argv[i + 1] || true) : null;
};
const MANDAT = arg('--mandat');
const VERSCHIEBEN = process.argv.includes('--verschieben');
const STUFEN = process.argv.includes('--stufen');

async function main() {
  const db = require('../db/database');
  if (!MANDAT || MANDAT === true) {
    console.error('Bitte das Mandat nennen:  --mandat FARADAY');
    process.exit(1);
  }

  const projekt = await db.get(
    'SELECT id, codename, tenant_id FROM projects WHERE codename ILIKE ?', [String(MANDAT)]);
  if (!projekt) { console.error(`Kein Mandat mit dem Codenamen "${MANDAT}" gefunden.`); process.exit(1); }

  const alle = await db.all(
    `SELECT i.id, i.name, i.is_folder, i.parent_id, i.confidential, e.name AS parent_name
       FROM safe_items i
       LEFT JOIN safe_items e ON e.id = i.parent_id
      WHERE i.project_id = ? AND i.deleted_at IS NULL
      ORDER BY i.is_folder DESC, i.name`, [projekt.id]);

  const dateien = alle.filter((i) => !Number(i.is_folder));
  const ordner = alle.filter((i) => Number(i.is_folder));
  const plan = planen(dateien);

  console.log('');
  console.log(`Datenraum ${projekt.codename}`);
  console.log('═'.repeat(12 + projekt.codename.length));
  console.log(`${dateien.length} Dateien in ${ordner.length} Ordnern`);
  console.log('');

  console.log(`Umsortieren: ${plan.verschieben.length} Dateien`);
  for (const v of plan.verschieben) {
    console.log(`  ${v.name}`);
    console.log(`      ${v.von}  →  ${v.nach}`);
    console.log(`      ${v.grund}`);
  }

  console.log('');
  console.log(`Vertraulichkeit ändern: ${plan.stufen.length} Dateien`);
  for (const s of plan.stufen) {
    const pfeil = s.nach === 'vertraulich' ? '⚠ ' : '  ';
    console.log(`  ${pfeil}${s.name}`);
    console.log(`      ${s.von}  →  ${s.nach}   (${s.grund})`);
  }

  if (plan.unklar.length) {
    console.log('');
    console.log(`Unklar, bleibt liegen: ${plan.unklar.length} Dateien`);
    for (const u of plan.unklar) console.log(`  ${u.name}   (jetzt: ${u.jetzt})`);
    console.log('  Diese Namen passen auf keine Regel. Sie werden nicht geraten.');
  }

  const fehlt = plan.pruefliste.filter((e) => !e.vorhanden);
  console.log('');
  console.log(`Prüfliste: ${plan.pruefliste.length - fehlt.length} von ${plan.pruefliste.length} Punkten abgedeckt`);
  if (fehlt.length) {
    console.log('Nicht gefunden, bitte prüfen ob anzufordern:');
    for (const e of fehlt) console.log(`  · ${e.was}`);
    console.log('  Das ist eine Suche über Dateinamen. Was anders heißt, findet sie nicht.');
  }

  if (!VERSCHIEBEN && !STUFEN) {
    console.log('');
    console.log('Nichts geändert. Zum Anwenden:  --verschieben   bzw.  --stufen');
    console.log('');
    return;
  }

  if (VERSCHIEBEN) {
    // Fehlende Zielordner anlegen, damit keine Datei ins Leere zeigt.
    const nachId = new Map(ordner.filter((o) => !o.parent_id).map((o) => [o.name, o.id]));
    for (const name of ORDNER) {
      if (nachId.has(name)) continue;
      if (!plan.verschieben.some((v) => v.nach === name)) continue;
      const pos = await db.get(
        'SELECT COALESCE(MAX(position), 0) + 1 AS p FROM safe_items WHERE project_id = ? AND parent_id IS NULL AND deleted_at IS NULL',
        [projekt.id]);
      const neueId = await db.insert(
        `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position)
         VALUES (?, ?, NULL, ?, 1, ?)`,
        [projekt.tenant_id || 1, projekt.id, name, (pos && pos.p) || 1]);
      nachId.set(name, neueId);
      console.log(`Ordner angelegt: ${name}`);
    }
    let n = 0;
    for (const v of plan.verschieben) {
      const ziel = nachId.get(v.nach);
      if (!ziel) { console.log(`übersprungen, Zielordner fehlt: ${v.name}`); continue; }
      await db.run('UPDATE safe_items SET parent_id = ? WHERE id = ?', [ziel, v.id]);
      n++;
    }
    console.log(`\n${n} Dateien umsortiert.`);
  }

  if (STUFEN) {
    let n = 0;
    for (const s of plan.stufen) {
      // 'offen' wird hier nicht gesetzt: ob etwas ohne Vereinbarung sichtbar
      // ist, entscheidet die Freigabe, nicht ein Skript.
      if (s.nach === 'offen') continue;
      await db.run('UPDATE safe_items SET confidential = ? WHERE id = ?', [s.nach === 'vertraulich' ? 1 : 0, s.id]);
      n++;
    }
    console.log(`\n${n} Vertraulichkeitsstufen gesetzt.`);
    console.log('Die Stufe "offen" wurde nicht gesetzt: das entscheidet die Freigabe im Datenraum.');
  }
  console.log('');
}

if (require.main === module) {
  main().then(() => process.exit(0))
    .catch((e) => { console.error('Fehlgeschlagen:', e.message); process.exit(1); });
}
