/**
 * Dateien hochladen: in Häppchen, mit Fortschritt und mit einem Grund im
 * Fehlerfall (v0.429).
 *
 * Anlass: „Fehler: Load failed" im Datenraum. Das ist keine Meldung der
 * Anwendung, sondern die Art, wie der Browser sagt, dass die Verbindung weg
 * ist, ohne zu sagen warum. Drei Ursachen kommen dafür in Frage, und die
 * bisherige Umsetzung lud sich in alle drei hinein:
 *
 *   • Eine einzige Anfrage mit allen Dateien. Bei 86 Dateien und 96 MB ist das
 *     ein Paket, das minutenlang unterwegs ist. Railway trennt eine Anfrage
 *     nach fünf Minuten ohne Datenfluss und nach fünfzehn Minuten insgesamt.
 *   • Der Server hält alle Dateien gleichzeitig im Arbeitsspeicher. Viele
 *     große Dateien auf einmal können den Dienst über seine Grenze bringen,
 *     und ein beendeter Dienst bedeutet: Verbindung weg.
 *   • Ein Abbruch unterwegs verwirft alles, auch die Dateien, die schon
 *     angekommen waren.
 *
 * Deshalb: kleine Pakete, nacheinander. Was durch ist, bleibt oben, auch wenn
 * ein späteres Paket scheitert. Und der Fortschritt ist sichtbar, denn ein
 * Balken, der sich bewegt, ist der Unterschied zwischen „es lädt" und „es
 * hängt".
 *
 * Bewusst XMLHttpRequest statt fetch: fetch kennt keinen Fortschritt beim
 * Senden. Das ist genau die Auskunft, die hier fehlte.
 */

// Ein Paket ist voll, wenn eine der beiden Grenzen erreicht ist. Zwanzig
// Dateien, weil der Aufwand je Anfrage sonst überwiegt; 20 MB, weil ein Paket
// auch auf einer langsamen Leitung in ein bis zwei Minuten durch sein soll.
const MAX_DATEIEN = 20;
const MAX_BYTES = 20 * 1024 * 1024;

/** Dateien auf Pakete verteilen. Eine einzelne große Datei bekommt ihr eigenes. */
export function pakete(eintraege, maxDateien = MAX_DATEIEN, maxBytes = MAX_BYTES) {
  const raus = [];
  let aktuell = [];
  let summe = 0;
  for (const e of eintraege || []) {
    const groesse = (e.file && e.file.size) || 0;
    if (aktuell.length && (aktuell.length >= maxDateien || summe + groesse > maxBytes)) {
      raus.push(aktuell); aktuell = []; summe = 0;
    }
    aktuell.push(e); summe += groesse;
  }
  if (aktuell.length) raus.push(aktuell);
  return raus;
}

/** Aus einem XHR-Ergebnis einen Satz machen, mit dem man etwas anfangen kann. */
export function fehlertext(xhr, dauerMs) {
  if (xhr.status === 0) {
    const min = Math.round(dauerMs / 60000);
    return 'Die Verbindung ist abgerissen, bevor eine Antwort kam'
      + (min >= 1 ? ` (nach etwa ${min} Minute${min === 1 ? '' : 'n'})` : '')
      + '. Häufigste Gründe: die Leitung war unterbrochen, oder die Übertragung hat zu lange gedauert.';
  }
  let text = '';
  try { text = (JSON.parse(xhr.responseText) || {}).error || ''; } catch { /* keine JSON-Antwort */ }
  if (text) return text;
  if (xhr.status === 413) return 'Die Datei ist zu groß für einen Upload.';
  if (xhr.status === 401 || xhr.status === 403) return 'Keine Berechtigung. Bitte melden Sie sich neu an.';
  return `Der Server hat mit HTTP ${xhr.status} geantwortet.`;
}

/**
 * Ein Paket senden.
 *
 * @param opts.url        Zieladresse
 * @param opts.token      Anmeldetoken
 * @param opts.felder     zusätzliche Formularfelder
 * @param opts.dateien    [{ file, path }]
 * @param opts.aufFortschritt  (gesendet, gesamt) => void
 */
/**
 * Eine Datei vollständig in den Speicher holen, bevor sie gesendet wird.
 *
 * Anlass: Gemessen im Serverprotokoll, an zwei Uploads von je einem Megabyte:
 *
 *   Upload beginnt:    POST /api/exposes/7/pdf-upload, angekündigt 1 MB
 *   Upload abgebrochen: 0 MB von 1 MB nach 0.6s,
 *                       Körper vollständig: nein, Antwort gesendet: nein
 *
 * Die Anfrage erreicht den Server, der Körper kommt nicht an, und der Server
 * hat nichts geantwortet. Es bricht also nicht der Server ab, sondern die
 * Seite, die sendet.
 *
 * Ein File-Objekt aus einem Dateiauswahlfeld ist nur ein Verweis auf die Datei
 * auf der Platte. Gelesen wird erst beim Senden. Liegt die Datei in einem
 * Ordner, der mit der Cloud abgeglichen wird, kann an dieser Stelle nur ein
 * Platzhalter liegen und keine Datei. Der Browser bricht dann mitten im Senden
 * ab und nennt als Grund das, was er sieht: einen Abriss.
 *
 * Deshalb wird hier zuerst gelesen und dann gesendet. Scheitert das Lesen,
 * steht das in der Meldung, mit dem Namen der Datei, statt eines Abrisses.
 */
async function alsBlob(file, name) {
  try {
    const puffer = await file.arrayBuffer();
    if (!puffer || (file.size && puffer.byteLength !== file.size)) {
      throw new Error(`gelesen ${puffer ? puffer.byteLength : 0} von ${file.size} Bytes`);
    }
    return new File([puffer], name, { type: file.type || 'application/octet-stream' });
  } catch (e) {
    throw new Error(
      `„${name}" lässt sich auf diesem Rechner nicht lesen (${e.message}). `
      + 'Das passiert bei Dateien, die nur in der Cloud liegen und lokal nur als Platzhalter. '
      + 'Bitte laden Sie die Datei herunter, etwa über das Kontextmenü im Finder, und versuchen Sie es erneut.');
  }
}

export async function sendePaket({ url, token, felder = {}, dateien = [], aufFortschritt, feldname = 'files' }) {
  // Erst lesen, dann senden.
  const bereit = [];
  for (const { file, path } of dateien) {
    bereit.push({ file: await alsBlob(file, (file && file.name) || 'datei'), path });
  }

  return new Promise((erfuellen, ablehnen) => {
    const fd = new FormData();
    const pfade = [];
    for (const { file, path } of bereit) { fd.append(feldname, file); pfade.push(path); }
    fd.append('paths', JSON.stringify(pfade));
    for (const [k, v] of Object.entries(felder)) if (v != null) fd.append(k, v);

    const xhr = new XMLHttpRequest();
    const start = Date.now();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // Welche Fassung sendet, und wie viele Bytes hat sie wirklich gelesen?
    //
    // Anlass: Nach drei Korrekturen war im Serverprotokoll nicht zu erkennen,
    // welcher Stand des Browsers den Upload geschickt hat. Damit ließ sich eine
    // Messung nicht mehr der Fassung zuordnen, die sie erzeugt hat, und jede
    // Rückmeldung blieb mehrdeutig.
    try {
      const f = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unbekannt';
      xhr.setRequestHeader('X-App-Fassung', f);
      xhr.setRequestHeader('X-Gelesen-Bytes', String(bereit.reduce((n, b) => n + ((b.file && b.file.size) || 0), 0)));
    } catch { /* Kopfzeilen sind nur zur Diagnose, sie dürfen nichts verhindern */ }
    // Vierzehn Minuten: Railway trennt eine Anfrage nach fünfzehn. Lieber eine
    // eigene, verständliche Meldung als ein stummer Abbruch von aussen.
    xhr.timeout = 14 * 60 * 1000;
    if (xhr.upload && aufFortschritt) {
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) aufFortschritt(e.loaded, e.total); };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let data = null;
        try { data = JSON.parse(xhr.responseText).data; } catch { /* keine JSON-Antwort */ }
        erfuellen({ data, status: xhr.status, roh: xhr.responseText.slice(0, 300) });
      } else ablehnen(new Error(fehlertext(xhr, Date.now() - start)));
    };
    xhr.onerror = () => ablehnen(new Error(fehlertext(xhr, Date.now() - start)));
    xhr.ontimeout = () => ablehnen(new Error(
      'Die Übertragung hat zu lange gedauert und wurde abgebrochen. '
      + 'Bitte laden Sie weniger Dateien auf einmal hoch.'));
    xhr.send(fd);
  });
}

/**
 * Alles hochladen, Paket für Paket.
 *
 * Gibt zurück, wie viel angekommen ist, und wo es gegebenenfalls abbrach.
 * Wichtig: Was durch ist, bleibt oben. Ein Abbruch im letzten Paket macht die
 * ersten nicht zunichte.
 */
export async function ladeAlles({ url, token, felder = {}, dateien = [], aufStand }) {
  const gruppen = pakete(dateien);
  const gesamt = dateien.reduce((s, e) => s + ((e.file && e.file.size) || 0), 0);
  let fertigeBytes = 0;
  let angekommen = 0;
  // Pakete, deren Antwort wir nicht deuten konnten. Die gehören in die
  // Meldung, sonst sieht ein halber Erfolg aus wie ein ganzer.
  const unklar = [];
  // Die Namen, die der Server bestätigt hat. Sie sind der einzige Beleg, dass
  // etwas angelegt wurde: eine Zahl kann man sich ausrechnen, einen Namen nicht.
  const namen = [];

  for (let i = 0; i < gruppen.length; i++) {
    const gruppe = gruppen[i];
    const gruppenBytes = gruppe.reduce((s, e) => s + ((e.file && e.file.size) || 0), 0);
    try {
      const d = await sendePaket({
        url, token, dateien: gruppe,
        // Ordner nur einmal anlegen, sonst legt jedes Paket sie erneut an.
        felder: i === 0 ? felder : { ...felder, folder_paths: undefined },
        aufFortschritt: (gesendet) => aufStand && aufStand({
          paket: i + 1, pakete: gruppen.length,
          prozent: gesamt ? Math.round(((fertigeBytes + gesendet) / gesamt) * 100) : 0,
        }),
      });
      // Genau zählen, was der Server gemeldet hat. Die erste Fassung nahm bei
      // einer leeren Liste die Paketgröße an ("|| gruppe.length"). Dann meldet
      // die Oberfläche einen Erfolg, obwohl nichts abgelegt wurde: der
      // schlimmste Fall, weil man dem Ergebnis nicht mehr ansieht, dass etwas
      // fehlt.
      const erstellt = (d && d.data && Array.isArray(d.data.created)) ? d.data.created.length : null;
      if (erstellt === null) unklar.push(`Paket ${i + 1}: HTTP ${d && d.status}, Antwort: ${(d && d.roh) || 'leer'}`);
      else {
        angekommen += erstellt;
        for (const c of d.data.created) if (c && c.name) namen.push(c.name);
      }
      fertigeBytes += gruppenBytes;
    } catch (e) {
      return { angekommen, gesamt: dateien.length, abgebrochen: true, grund: e.message,
        paket: i + 1, pakete: gruppen.length, unklar, namen };
    }
  }
  return { angekommen, gesamt: dateien.length, abgebrochen: false, unklar, namen };
}
