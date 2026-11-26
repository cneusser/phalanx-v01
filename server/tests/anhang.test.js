// ─────────────────────────────────────────────────────────────────────────────
// Ein Anhang, der übergeben wird, muss auch mitgehen (v0.507)
//
// Anlass, wörtlich: „da ich die Mail nur separat bekomme mit dem PDF, ob auch
// der jeweilige Unterschreibende diese E-Mail erhält."
//
// Er erhielt sie, aber ohne das PDF. Die Prozessmail nahm `attachments` nicht
// entgegen. Die Eigenschaft stand nicht in der Zerlegung des Parameters, also
// fiel sie weg, ohne Fehler und ohne Spur. Die Beratung bekam ihre Kopie über
// einen anderen Weg und damit mit Anhang, und genau diese Asymmetrie hat die
// Sache so lange verdeckt.
//
// Geprüft wird hier der Durchstich selbst: Was die Prozessmail bekommt, muss
// unten ankommen. Dazu die beiden Aufrufer, die eine Urkunde verschicken.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (name, bedingung, zusatz = '') => {
  console.log(`${bedingung ? '✓' : '✗ FEHLER'} ${name}${zusatz ? `  [${zusatz}]` : ''}`);
  if (!bedingung) fail += 1;
};

const quelle = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

console.log('\n══ Die Prozessmail nimmt einen Anhang entgegen und reicht ihn weiter ══');
{
  const mail = quelle('utils/email.js');
  const kopf = (mail.match(/async function sendProcessUpdateEmail\(\{[^}]*\}/) || [''])[0];
  ok('attachments steht in der Parameterliste', /attachments/.test(kopf), kopf.slice(0, 120));

  // Der Rumpf bis zum schliessenden sendMail-Aufruf.
  const von = mail.indexOf('async function sendProcessUpdateEmail');
  const rumpf = mail.slice(von, von + 1400);
  ok('und wird an sendMail weitergereicht', /sendMail\(\{[\s\S]*?\n\s+attachments,/.test(rumpf));
}

console.log('\n══ Die beiden Wege, auf denen eine Urkunde verschickt wird ══');
{
  const ndas = quelle('routes/ndas.js');
  const stellen = (ndas.match(/attachments: anhang/g) || []).length;
  ok('beide Aufrufer uebergeben den Anhang', stellen >= 2, String(stellen));
  ok('die Beratung bekommt ihn ueber sendMail', /sendMail\(\{[\s\S]{0,1200}?attachments: anhang/.test(ndas));
}

console.log('\n══ Kein zweiter Weg verliert stillschweigend etwas ══');
{
  // Jede Funktion in email.js, die sendMail aufruft und selbst `attachments`
  // entgegennimmt, muss es auch weitergeben.
  const mail = quelle('utils/email.js');
  const verloren = [];
  for (const m of mail.matchAll(/async function (\w+)\(\{([^}]*)\}\)\s*\{/g)) {
    if (!/attachments/.test(m[2])) continue;
    const name = m[1];
    if (name === 'sendMail' || name === 'sendViaBrevoApi') continue;
    const rumpf = mail.slice(m.index, m.index + 2000);
    if (!/attachments[,:]/.test(rumpf.replace(m[0], ''))) verloren.push(name);
  }
  ok('keine Mailfunktion nimmt einen Anhang an, ohne ihn zu senden', verloren.length === 0, verloren.join(', '));
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
