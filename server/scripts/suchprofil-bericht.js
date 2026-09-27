#!/usr/bin/env node
/**
 * Suchprofil-Bericht: wer bekommt zu wenige oder gar keine Hinweise?
 *
 * Anlass: im Nachfolge-Matching trafen mehrere Branchenwerte aus der
 * Selbstauskunft auf kein einziges Mandat. Wer nur eine Branche und keine
 * Region gesetzt hatte, bekam deshalb nichts, ohne dass es jemandem auffiel.
 * Seit v0.416 löst die Taxonomie das auf. Dieser Bericht zeigt, wen es betraf
 * und was sich für ihn ändert, damit Sie entscheiden können, ob Sie diese
 * Leute anschreiben.
 *
 * Der Bericht liest nur. Er ändert nichts, verschickt nichts und nennt keine
 * Namen, sondern arbeitet mit Profil-Kennungen. Wer dahintersteckt, sehen Sie
 * im CRM.
 *
 * Aufruf:  node server/scripts/suchprofil-bericht.js
 *          node server/scripts/suchprofil-bericht.js --namen   (mit E-Mail)
 */
const tax = require('../utils/taxonomie');
const { scoreMatch, isSuccessionDeal } = require('../utils/successionMatch');

const MIT_NAMEN = process.argv.includes('--namen');

function liste(roh) {
  if (Array.isArray(roh)) return roh;
  try { const x = JSON.parse(roh || '[]'); return Array.isArray(x) ? x : []; } catch { return []; }
}

// Die alte Logik von vor v0.416, wortgleich nachgebaut. Nur so lässt sich
// sagen, was ein Profil vorher getroffen hat und was jetzt.
function altBrancheTrifft(b, industry) {
  const ind = String(industry || '').toLowerCase();
  const x = String(b).toLowerCase();
  return Boolean(ind) && (ind.includes(x) || x.includes(ind.split(/[ /]/)[0]));
}
function altRegionTrifft(r, region) {
  const reg = String(region || '').toLowerCase();
  const x = String(r).toLowerCase();
  return Boolean(reg) && (reg.includes(x) || x.includes(reg));
}

/**
 * Vergleicht je Profil, auf wie viele Mandate es vorher traf und auf wie viele
 * es jetzt trifft. Reine Rechnung ohne Datenbank, damit sie prüfbar ist.
 */
function auswerten(profile, nachfolge) {
  const betroffen = [];
  const unbekannt = new Map();

  for (const p of profile) {
    const branchen = liste(p.branchenfokus);
    const regionen = liste(p.ziel_regionen).concat(liste(p.ziel_laender));
    if (!branchen.length && !regionen.length) continue;   // kein Filter, bekommt alles

    for (const b of branchen) if (!tax.brancheAus(b)) unbekannt.set(b, (unbekannt.get(b) || 0) + 1);
    for (const r of regionen) if (!tax.regionAus(r)) unbekannt.set(r, (unbekannt.get(r) || 0) + 1);

    let alt = 0, neu = 0;
    for (const m of nachfolge) {
      const altStark = branchen.some((b) => altBrancheTrifft(b, m.industry))
        || regionen.some((r) => altRegionTrifft(r, m.region));
      const profil = {
        branchenfokus: branchen, ziel_regionen: liste(p.ziel_regionen),
        ziel_laender: liste(p.ziel_laender), umsatz_band: p.umsatz_band,
      };
      const { reasons } = scoreMatch(profil, m);
      const neuStark = reasons.includes('Branche passt') || reasons.includes('Region passt');
      if (altStark) alt++;
      if (neuStark) neu++;
    }
    if (neu !== alt) {
      betroffen.push({
        id: p.id, email: p.email, alt, neu,
        branchen: branchen.join(', ') || 'keine',
        regionen: regionen.join(', ') || 'keine',
      });
    }
  }
  return { betroffen, unbekannt };
}

async function main() {
  const db = require('../db/database');   // erst hier: der Test braucht keine Datenbank
  const mandate = await db.all(
    `SELECT id, codename, industry, region, deal_type, revenue_band, revenue_class
       FROM projects
      WHERE status = 'active' AND visibility = 'public'`).catch(() => []);
  const nachfolge = mandate.filter((m) => isSuccessionDeal(m.deal_type));

  const profile = await db.all(
    `SELECT sp.id, sp.user_id, sp.branchenfokus, sp.ziel_regionen, sp.ziel_laender, sp.umsatz_band,
            u.email
       FROM succession_profiles sp
       LEFT JOIN users u ON u.id = sp.user_id`).catch(() => []);

  console.log('');
  console.log('Suchprofil-Bericht');
  console.log('══════════════════');
  console.log(`${mandate.length} aktive Mandate, davon ${nachfolge.length} Nachfolge-Mandate`);
  console.log(`${profile.length} Nachfolge-Profile`);
  if (!nachfolge.length) {
    console.log('\nKein aktives Nachfolge-Mandat. Ohne Mandate lässt sich nichts vergleichen.');
    return;
  }

  const { betroffen, unbekannt } = auswerten(profile, nachfolge);
  const stumm = betroffen.filter((b) => b.alt === 0 && b.neu > 0);
  console.log('');
  console.log(`${betroffen.length} Profile treffen jetzt anders als vorher.`);
  console.log(`Davon ${stumm.length} Profile, die vorher auf KEIN Mandat trafen und jetzt treffen.`);
  console.log('Diese Personen haben bisher keine Hinweise bekommen, obwohl passende Mandate da waren.');

  if (betroffen.length) {
    console.log('');
    console.log('Profil  vorher  jetzt   Branchen / Regionen');
    console.log('──────────────────────────────────────────────────────────────────────');
    for (const b of betroffen.sort((x, y) => (y.neu - y.alt) - (x.neu - x.alt))) {
      const kennung = MIT_NAMEN ? String(b.email || `#${b.id}`).slice(0, 28).padEnd(28) : `#${b.id}`.padEnd(7);
      console.log(`${kennung}${String(b.alt).padStart(5)}${String(b.neu).padStart(7)}   ${b.branchen} | ${b.regionen}`);
    }
  }

  if (unbekannt.size) {
    console.log('');
    console.log('Werte, die die Taxonomie nicht kennt (nicht geraten, bleiben stehen):');
    for (const [wert, anzahl] of [...unbekannt.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(anzahl).padStart(3)}x  ${wert}`);
    }
    console.log('  Prüfen Sie, ob einer davon als Synonym in shared/taxonomie.json gehört.');
  }
  console.log('');
}

module.exports = { auswerten, altBrancheTrifft, altRegionTrifft, liste };

// Nur beim direkten Aufruf laufen lassen, nicht wenn der Test die Datei lädt.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => { console.error('Bericht fehlgeschlagen:', e.message); process.exit(1); });
}
