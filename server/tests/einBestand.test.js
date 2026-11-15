// ─────────────────────────────────────────────────────────────────────────────
// Datenraum 2.0, Sprint 1a: ein Bestand, ein Speicherweg (v0.477)
//
// Der Satz, der diesen Sprint ausgelöst hat: „Gefühlt kann ich Dateien
// hochladen wie zum Beispiel Teaser oder Exposé, aber sie tauchen nicht im
// Datenraum auf."
//
// Das war kein Gefühl. Es gab zwei Ablagen, und sie wussten nichts
// voneinander: `documents` schrieb als Datei auf das Railway-Volume,
// `safe_items` legte beim Speicheranbieter ab. Der Dokumente-Reiter füllte
// die eine, der Datenraum zeigte die andere.
//
// Drei Dinge hält diese Datei fest:
//
//   1. Keine Stelle schreibt mehr unmittelbar auf das Volume.
//   2. Wer über den Dokumente-Reiter hochlädt, steht danach im
//      Datenraum-Baum, und zwar mit demselben Schlüssel, nicht als Kopie.
//   3. Bestandszeilen mit `file_path` bleiben lesbar. Eine Umstellung, die
//      den alten Weg sofort abschneidet, macht aus einem Umbau einen
//      Ausfall.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const docs = lies('server', 'routes', 'documents.js');
const safe = lies('server', 'routes', 'safe.js');
const migration = lies('server', 'db', 'migrations', '20260901002170_ein_bestand.js');

console.log('\n── Nichts mehr unmittelbar auf das Volume ──');
ok('der Dokumente-Reiter nimmt den Arbeitsspeicher', /multer\.memoryStorage\(\)/.test(docs));
ok('und kein Ablegen auf der Platte mehr', !/multer\.diskStorage/.test(docs));
ok('abgelegt wird über die eine Stelle', /require\('\.\.\/utils\/dateiAblage'\)/.test(docs));
ok('die Zeile merkt sich den Schlüssel', /storage_key, content_text\)/.test(docs));
ok('die zweite Kopie beim Übernehmen ist weg', !/DOC_UPLOAD_DIR/.test(safe));
ok('stattdessen zeigt die Zeile auf dieselbe Datei', /item\.storage_key, item\.id,/.test(safe));
ok('und merkt sich, woher sie stammt', /safe_item_id/.test(safe));

console.log('\n── Was hochgeladen wird, steht im Datenraum ──');
ok('der Upload legt einen Eintrag im Baum an', /safeAblage\.alsSafeObjekt/.test(docs));
ok('die Dokumentzeile wird damit verknüpft', /UPDATE documents SET safe_item_id = \? WHERE id = \?/.test(docs));
ok('ein Fehler dabei lässt den Upload nicht scheitern', /Eintrag im Datenraum-Baum fehlgeschlagen/.test(docs));

console.log('\n── Der Bestand bleibt lesbar ──');
ok('die Spalten kommen hinzu, nichts wird ersetzt', /hasColumn\('documents', name\)/.test(migration));
ok('file_path wird nicht entfernt', !/dropColumn\('file_path'\)/.test(migration));
{
  const ablage = require('../utils/dateiAblage');
  ok('eine Zeile mit altem Pfad gilt als noch auf dem Volume',
    ablage.nochAufDemVolume({ file_path: '/x/y.pdf' }) === true);
  ok('eine Zeile mit Schlüssel nicht',
    ablage.nochAufDemVolume({ storage_key: 'project_1/dokumente/abc.pdf' }) === false);
}
ok('„hat eine Datei" zählt beide Wege',
  /\(\(storage_key IS NOT NULL\) OR \(file_path IS NOT NULL\)\)/.test(docs));
ok('der Download prüft nicht mehr das Dateisystem', !/fs\.existsSync\(doc\.file_path\)/.test(docs));

console.log('\n── Der Schlüssel ──');
{
  const { schluessel } = require('../utils/dateiAblage');
  const k = schluessel({ projectId: 7, bereich: 'dokumente', dateiname: 'Teaser FARADAY.pdf' });
  ok('er beginnt mit dem Mandat', k.startsWith('project_7/dokumente/'));
  ok('er endet auf die Endung', k.endsWith('.pdf'));
  ok('er übernimmt den Dateinamen nicht', !/Teaser/.test(k));
  const zweiter = schluessel({ projectId: 7, bereich: 'dokumente', dateiname: 'Teaser FARADAY.pdf' });
  ok('zweimal derselbe Name ergibt zwei Schlüssel', k !== zweiter);
  const boese = schluessel({ projectId: 7, dateiname: '../../etc/passwd' });
  ok('ein Pfad im Dateinamen führt nicht aus dem Mandat heraus', boese.startsWith('project_7/') && !boese.includes('..'));
}

console.log('\n── Die Ordner im Baum ──');
{
  const { ordnerFuerStufe, alsSafeObjekt } = require('../utils/safeAblage');
  ok('der Teaser landet unter 00', ordnerFuerStufe('public') === '00 Teaser');
  ok('das Memorandum unter 01', ordnerFuerStufe('nda') === '01 Informationsmemorandum');
  ok('die Unterlagen unter 02', ordnerFuerStufe('approved') === '02 Unterlagen');
  ok('eine unbekannte Stufe landet nicht im Nichts', ordnerFuerStufe('quatsch') === '02 Unterlagen');

  // Eine kleine, erklärbare Welt statt einer Datenbank.
  (async () => {
    const zeilen = [];
    let naechste = 1;
    const lauf = async (sql, p) => {
      const istOrdner = /is_folder = 1/.test(sql);
      return zeilen.find((z) => z.project_id === p[0] && z.is_folder === (istOrdner ? 1 : 0)
        && z.name === p[1] && (p.length > 2 ? z.parent_id === p[2] : z.parent_id === null)) || null;
    };
    const neu = async (sql, p) => {
      const id = naechste++;
      if (/is_folder, uploaded_by/.test(sql) || /, 1, \?\)/.test(sql)) {
        zeilen.push({ id, project_id: p[0], parent_id: p[1], name: p[2], is_folder: 1 });
      } else {
        zeilen.push({ id, project_id: p[0], parent_id: p[1], name: p[2], is_folder: 0, storage_key: p[3] });
      }
      return id;
    };
    const a = await alsSafeObjekt(lauf, neu, {
      projectId: 1, name: 'Teaser.pdf', storageKey: 'project_1/dokumente/a.pdf', stufe: 'public', userId: 1 });
    ok('die Datei wird angelegt', a.angelegt === true);
    ok('der Ordner darüber ebenfalls', zeilen.some((z) => z.is_folder === 1 && z.name === '00 Teaser'));

    const b = await alsSafeObjekt(lauf, neu, {
      projectId: 1, name: 'Teaser.pdf', storageKey: 'project_1/dokumente/b.pdf', stufe: 'public', userId: 1 });
    ok('derselbe Name im selben Ordner legt nichts Zweites an', b.angelegt === false && b.safe_item_id === a.safe_item_id);
    ok('und der Ordner steht nur einmal da',
      zeilen.filter((z) => z.is_folder === 1 && z.name === '00 Teaser').length === 1);

    await alsSafeObjekt(lauf, neu, {
      projectId: 1, name: 'BWA.pdf', storageKey: 'project_1/dokumente/c.pdf', stufe: 'approved',
      ordner: 'Finanzen/BWA', userId: 1 });
    ok('eine eigene Ordnerangabe schlägt die Stufe',
      zeilen.some((z) => z.is_folder === 1 && z.name === 'Finanzen')
      && zeilen.some((z) => z.is_folder === 1 && z.name === 'BWA'));

    console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
    process.exit(fail ? 1 : 0);
  })();
}
