/** Changelog v0.490 (die Vereinbarung aus dem Hausdokument). */
const ENTRY = {
  version: 'v0.490', released_on: '2026-11-21',
  title: 'Die Vertraulichkeitsvereinbarung aus dem Hausdokument, zweisprachig und auf Person und Mandat',
  items: [
    'Die Plattform arbeitet jetzt mit der Vereinbarung aus dem Hausdokument, zehn Paragraphen, deutsch und englisch. Sie löst die bisherige Vorlage ab. Was früher unterzeichnet wurde, bleibt unverändert: Jede unterzeichnete Vereinbarung behält ihren Text und ihren Fingerabdruck, eine neue Vorlage schreibt nichts rückwirkend um',
    'Deutsch und Englisch stehen nebeneinander, im Dialog wie im PDF, Absatz neben Absatz. Massgeblich ist nach § 10 Absatz 4 die deutsche Fassung, deshalb steht sie links. Die bisherige englische Kurzfassung der Kernpunkte ist entfallen: Sie war ein Behelf, solange der Vertrag nur deutsch vorlag',
    'Der Vertrag nennt die Vertragspartei jetzt vollständig, mit Firma, Sitz, Register samt Nummer und vertretungsberechtigter Person. Die drei neuen Angaben erhebt der Unterschriftsdialog dort, wo sie im Vertrag erscheinen, mit Erklärung und Beispiel. Sie wandern ins Profil und werden beim nächsten Mandat nicht erneut verlangt',
    'Ohne diese Angaben wird nicht unterzeichnet. Ein Vertrag, der seine Partei nicht benennt, ist keiner, und eine Lücke an dieser Stelle fällt erst auf, wenn man sie braucht',
    'Der Fingerabdruck deckt jetzt beide Sprachen und die vollständige Vertragspartei ab. Wer eine englische Klausel ändert oder einen anderen Sitz einträgt, bekommt einen anderen Abdruck, und der Dialog holt vor der Unterschrift die Fassung mit genau den eingetragenen Angaben',
    'Im Verkaufstrichter ist das Kennzeichen „Plattform-NDA" entfallen. Mit v0.489 gibt es das Plattform-NDA nicht mehr; stehen geblieben wäre ein Abzeichen, das den Altbestand auszeichnet, ohne dass dahinter ein Unterschied steht',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
