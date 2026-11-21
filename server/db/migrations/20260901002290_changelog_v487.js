/** Changelog v0.487 (zwei Luecken in der Demowelt, gefunden im ersten Durchgang). */
const ENTRY = {
  version: 'v0.487', released_on: '2026-11-21',
  title: 'Die Demowelt taugt jetzt für einen vollständigen Durchgang',
  items: [
    'Der erste Durchgang des Testdrehbuchs auf der laufenden Teststufe hat zwei Lücken in den Demodaten gezeigt. Beide hätten jeden Durchgang von Hand an derselben Stelle enden lassen',
    'Erstens hatten die Demokonten kein vollständiges Profil. Die Plattform verlangt neun Felder, bevor ein Interessent ein Mandat im Detail ansehen darf. Jeder Versuch endete deshalb mit „Bitte vervollständigen Sie zuerst Ihr Profil" statt mit der Frage, die eigentlich geprüft werden sollte. Die Demokonten bringen jetzt Anrede, Position, Rufnummern und Anschrift mit',
    'Zweitens gehörten alle vier Demomandate derselben Verkäuferin. Damit liess sich die wichtigste Frage der Verkäufersicht gar nicht stellen, nämlich ob jemand an ein fremdes Mandat kommt. Es gibt jetzt einen zweiten Verkäufer, dem genau ein Mandat gehört',
    'Dass die neun Pflichtfelder eine hohe Hürde an der frühesten Stelle des Prozesses sind, bleibt als eigene Beobachtung für die Vereinfachung stehen. Hier wurde sie nur aus dem Weg geräumt, nicht gesenkt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
