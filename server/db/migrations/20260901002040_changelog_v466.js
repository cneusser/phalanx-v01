/** Changelog v0.466 (Eine Fassung der Vertraulichkeitsvereinbarung). */
const ENTRY = {
  version: 'v0.466', released_on: '2026-10-24',
  title: 'Eine Fassung der Vertraulichkeitsvereinbarung, nicht zwei',
  items: [
    'Ein Interessent hat nach der Online-Unterzeichnung das signierte PDF mit dem Unterzeichnungsdialog verglichen und drei Abweichungen gefunden. Er hatte in allen drei Punkten recht',
    'Die Ursache war kein Tippfehler: Der Dialog trug seinen eigenen, von Hand gepflegten Vertragstext im Quelltext der Oberfläche, das PDF entstand aus der Vorlage in der Datenbank. Zwei Texte, zwei Pflegewege, und sie sind auseinandergelaufen. Im Dialog stand unter anderem eine Vertragspartei, die es nicht gibt',
    'Ab sofort gibt es genau eine Fassung. Der Dialog holt sie vom Server, das PDF druckt dieselbe, und im Quelltext der Oberfläche steht kein Vertragstext mehr: keine Paragraphen, keine Vertragspartei, keine Laufzeit. Eine Prüfung hält das fest, für die gesamte Oberfläche',
    'Jede Fassung trägt einen Fingerabdruck. Er steht unter dem Text im Dialog, wird beim Unterzeichnen mitgeschickt und am Nachweis gespeichert. Damit ist die Frage beantwortbar, die der Interessent gestellt hat und die wir bisher nicht beantworten konnten: Welcher Text war das, dem ich zugestimmt habe',
    'Hat sich die Vorlage geändert, seit sie angezeigt wurde, wird die Unterzeichnung abgewiesen und die Abweichung protokolliert. Unterschrieben wird nur, was auf dem Schirm stand',
    'Gespeichert wird nicht nur der Fingerabdruck, sondern der Wortlaut. Ein Fingerabdruck beweist, dass sich nichts geändert hat; er stellt den Text aber nicht wieder her, wenn die Vorlage später überschrieben wird, und genau dann braucht man ihn',
    'Lässt sich die Fassung nicht laden, zeigt der Dialog das und lässt nicht unterzeichnen. Ein Dialog, der im Zweifel irgendeinen Text zeigt, ist schlimmer als einer, der sagt, dass er gerade nichts zeigen kann',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
