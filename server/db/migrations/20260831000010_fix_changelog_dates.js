/**
 * v0.312: Falsche Changelog-Daten korrigieren.
 *
 * Die Einträge ab v0.260 trugen fortlaufend Daten, die in der Zukunft lagen:
 * Sie wurden beim Anlegen hochgezählt, statt das tatsächliche Datum zu setzen.
 * Die Abweichung wuchs bis auf rund sechs Wochen (v0.311 stand auf dem 30.08.2026,
 * obwohl der Eintrag am 21.07.2026 entstand).
 *
 * Hier wird alles, was nach dem 21.07.2026 datiert ist, auf dieses Datum gesetzt.
 * Die Reihenfolge bleibt über die Versionsnummer erhalten. Frühere, korrekte
 * Einträge bleiben unberührt.
 *
 * Hinweis: Die Datumszahl im Dateinamen einer Migration ist nur ein Sortierschlüssel
 * und hat nichts mit dem Veröffentlichungsdatum zu tun.
 */
const CORRECT_DATE = '2026-07-21';

exports.up = async function (knex) {
  await knex.raw(
    `UPDATE changelog SET released_on = ? WHERE released_on > ?`,
    [CORRECT_DATE, CORRECT_DATE],
  ).catch(() => {});
};

exports.down = async function () {
  // Bewusst ohne Rücknahme: die alten Daten waren schlicht falsch.
};
