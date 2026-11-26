// ─────────────────────────────────────────────────────────────────────────────
// Zwei Anbieter, eine Absicht (v0.510)
//
// Anlass, wörtlich: „Kann ich auch Claude verwenden?"
//
// Ja. Die beiden Häuser sprechen verschieden: OpenAI nimmt den Auftrag als
// erste Nachricht und kann ein JSON-Format erzwingen, Anthropic hat dafür ein
// eigenes Feld und erzwingt nichts.
//
// Geprüft wird hier vor allem das, was still schiefgehen kann: der falsche
// Kopf, ein Auftrag, der im falschen Feld landet, und eine Antwort in Code-
// Zäunen, die dann als „kein lesbares JSON" durchfällt.
// ─────────────────────────────────────────────────────────────────────────────

let fail = 0;
const ok = (name, bedingung, zusatz = '') => {
  console.log(`${bedingung ? '✓' : '✗ FEHLER'} ${name}${zusatz ? `  [${zusatz}]` : ''}`);
  if (!bedingung) fail += 1;
};

const sauber = () => {
  delete process.env.ANREICHERUNG_SCHLUESSEL;
  delete process.env.ANREICHERUNG_ART;
  delete process.env.ANREICHERUNG_MODELL;
  delete process.env.ANREICHERUNG_URL;
};

const a = require('../utils/anreicherung');

console.log('\n══ Der Anbieter ergibt sich aus dem Schluessel ══');
{
  sauber();
  process.env.ANREICHERUNG_SCHLUESSEL = 'sk-ant-api03-beispiel';
  ok('ein Anthropic-Schluessel wird erkannt', a.ART() === 'anthropic', a.ART());
  ok('und bringt sein eigenes Standardmodell mit', a.MODELL() === 'claude-haiku-5-5', a.MODELL());
  ok('sowie seine eigene Adresse', /api\.anthropic\.com/.test(a.ADRESSE()), a.ADRESSE());

  process.env.ANREICHERUNG_SCHLUESSEL = 'sk-proj-beispiel';
  ok('ein anderer Schluessel bleibt bei OpenAI', a.ART() === 'openai', a.ART());
  ok('mit dem dortigen Standardmodell', a.MODELL() === 'gpt-4o-mini', a.MODELL());

  process.env.ANREICHERUNG_ART = 'anthropic';
  ok('eine ausdrueckliche Angabe sticht die Erkennung', a.ART() === 'anthropic', a.ART());
  sauber();
}

console.log('\n══ Jeder Anbieter bekommt, was er versteht ══');
{
  sauber();
  process.env.ANREICHERUNG_SCHLUESSEL = 'sk-ant-api03-beispiel';
  const anth = a.anfrage('Firma: Muster GmbH', ['sektor', 'region']);
  ok('Anthropic bekommt den Schluessel im eigenen Kopffeld', !!anth.kopf['x-api-key'], JSON.stringify(Object.keys(anth.kopf)));
  ok('und keine Bearer-Zeile', !anth.kopf.Authorization);
  ok('die Fassung der Schnittstelle steht dabei', anth.kopf['anthropic-version'] === '2023-06-01', String(anth.kopf['anthropic-version']));
  ok('der Auftrag steht im system-Feld', /Stammdaten/.test(anth.koerper.system || ''));
  ok('und nicht als Nachricht', (anth.koerper.messages || []).every((m) => m.role !== 'system'), JSON.stringify((anth.koerper.messages || []).map((m) => m.role)));
  ok('max_tokens ist gesetzt, sonst antwortet Anthropic nicht', Number(anth.koerper.max_tokens) > 0, String(anth.koerper.max_tokens));
  // v0.511: Die neueren Modelle weisen die Anfrage mit `temperature` ab.
  // Gefunden auf der Teststufe, bei der ersten echten Anfrage, Fehler 400.
  ok('und temperature wird nicht mitgeschickt', anth.koerper.temperature === undefined, String(anth.koerper.temperature));
  ok('die gesuchten Felder stehen in der Nachricht', /sektor, region/.test(anth.koerper.messages[0].content));

  process.env.ANREICHERUNG_SCHLUESSEL = 'sk-proj-beispiel';
  const oai = a.anfrage('Firma: Muster GmbH', ['sektor']);
  ok('OpenAI bekommt die Bearer-Zeile', /^Bearer /.test(oai.kopf.Authorization || ''), String(oai.kopf.Authorization).slice(0, 12));
  ok('der Auftrag kommt als erste Nachricht', (oai.koerper.messages || [])[0].role === 'system');
  ok('und das JSON-Format wird erzwungen', oai.koerper.response_format && oai.koerper.response_format.type === 'json_object');
  sauber();
}

console.log('\n══ Die Antwort wird aus beiden Formaten gelesen ══');
{
  ok('aus der Blockliste von Anthropic',
    a.textAus({ content: [{ type: 'text', text: '{"felder":{}}' }] }) === '{"felder":{}}');
  ok('aus der Auswahlliste von OpenAI',
    a.textAus({ choices: [{ message: { content: '{"felder":{}}' } }] }) === '{"felder":{}}');
  ok('eine unbekannte Antwort gibt nichts zurueck', a.textAus({ irgendwas: 1 }) === null);
  ok('Code-Zaeune werden abgeschaelt', a.ohneZaun('```json\n{"a":1}\n```') === '{"a":1}');
  ok('ein Zaun ohne Sprache auch', a.ohneZaun('```\n{"a":1}\n```') === '{"a":1}');
  ok('blankes JSON bleibt, wie es ist', a.ohneZaun('{"a":1}') === '{"a":1}');
}

console.log('\n══ Ohne Schluessel wird nichts gefragt ══');
{
  sauber();
  a.frage('Firma: X', ['sektor']).then((r) => {
    ok('die Anfrage unterbleibt', r.felder && Object.keys(r.felder).length === 0 && !!r.fehler, String(r.fehler));
    console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
    process.exit(fail ? 1 : 0);
  });
}
