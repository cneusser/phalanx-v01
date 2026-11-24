/** Changelog v0.506 (Zugang und Unterschrift werden nicht mehr verwechselt). */
const ENTRY = {
  version: 'v0.506', released_on: '2026-11-25',
  title: 'Ein offener Datenraum ist keine Unterschrift',
  items: [
    'Anlass war die Rückfrage eines Interessenten: Seine Ansicht meldete „Zugang freigeschaltet", also nahm er an, er habe unterzeichnet. Hatte er nicht. Die Statusabfrage leitete den Unterschriftsstand aus der Funnel-Stufe ab, und wer im Datenraum stand, bekam dieselbe grüne Meldung wie jemand mit Unterschrift',
    'Zugang und Nachweis stehen jetzt getrennt. Fehlt die unterschriebene Vereinbarung, sagt die Mandatsseite das in einem Satz und bietet daneben das Unterzeichnen an, auch wenn der Datenraum bereits offen ist. Vorher verschwand dieser Knopf genau dann, wenn er gebraucht wurde',
    'Als Nachweis zählt zweierlei: online unterzeichnet oder das zurückgeschickte Dokument hinterlegt. Ein Haken im CRM zählt nicht, der ist eine Behauptung ohne Beleg',
    'Der Knopf „Datenraum freigeben" im Kontakt hat bis hierher ohne jede Prüfung freigegeben. Er verlangt jetzt den Nachweis. Freigeben ohne Unterschrift bleibt möglich, verlangt aber eine Begründung, und die steht im Protokoll',
    'Bestehende Freigaben bleiben unangetastet. Unter Berichte steht stattdessen „Zugang ohne Nachweis": wer Datenraum-Zugang hat, ohne dass eine unterschriebene Vereinbarung vorliegt, je Mandat aufgeschlüsselt. Entzogen wird nichts automatisch, bei einem Zugang seit Wochen wäre das die falsche Reihenfolge',
    'Die Kopie jeder unterzeichneten Vereinbarung geht jetzt an die Beratung des Mandats, nicht mehr nur an die Archivadresse. Wer ein Mandat betreut, bekam die Urkunde bisher nicht',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
