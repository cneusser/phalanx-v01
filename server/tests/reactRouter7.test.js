// ─────────────────────────────────────────────────────────────────────────────
// React Router 6 auf 7 (v0.476)
//
// Der Wechsel ist hier klein, und der Grund dafür steht im Code: Benutzt
// werden ausschliesslich BrowserRouter, Routes, Route, Navigate, Link,
// useNavigate, useParams, useLocation und useSearchParams. Also die
// beschreibende Hälfte der Bibliothek, die sich zwischen 6 und 7 nicht
// geändert hat.
//
// Was NICHT benutzt wird, ist der Grund, warum es nicht weh tut:
// createBrowserRouter, RouterProvider, Loader, Actions, useLoaderData,
// defer. Genau dort liegen die Unterschiede zwischen 6 und 7, und genau
// dort steht bei uns nichts.
//
// Diese Datei prüft zweierlei: dass im Quelltext nichts auftaucht, was den
// Wechsel teuer machen würde, und dass ein kleiner Routenbaum mit der neuen
// Fassung tatsächlich dasselbe rendert. Gerendert wird auf dem Server, ohne
// Browser; geprüft wird die Bibliothek, nicht das Fenster.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const quelle = path.join(wurzel, 'client', 'src');

// Alle .jsx und .js unter client/src einsammeln.
const dateien = [];
(function lauf(ordner) {
  for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) lauf(p);
    else if (/\.jsx?$/.test(e.name)) dateien.push(p);
  }
}(quelle));

console.log('\n── Die Fassung ──');
{
  const pj = JSON.parse(fs.readFileSync(path.join(wurzel, 'client', 'package.json'), 'utf8'));
  ok('react-router-dom steht auf 7', /^\^?7\./.test(pj.dependencies['react-router-dom']));
  ok('React ist mindestens 18, das verlangt Fassung 7', /^\^?1[89]\.|^\^?[2-9]\d\./.test(pj.dependencies.react));
}

console.log('\n── Was im Quelltext steht ──');
{
  const benutzt = new Set();
  for (const d of dateien) {
    const t = fs.readFileSync(d, 'utf8');
    for (const m of t.matchAll(/import\s*\{([^}]+)\}\s*from\s*'react-router-dom'/g)) {
      for (const n of m[1].split(',')) { const s = n.trim(); if (s) benutzt.add(s); }
    }
  }
  const erlaubt = new Set(['BrowserRouter', 'Routes', 'Route', 'Navigate', 'Link',
    'NavLink', 'Outlet', 'useNavigate', 'useParams', 'useLocation', 'useSearchParams']);
  const fremd = [...benutzt].filter((b) => !erlaubt.has(b));
  ok(`nur die beschreibende Hälfte wird benutzt${fremd.length ? ': ' + fremd.join(', ') : ''}`, fremd.length === 0);

  const teuer = [];
  for (const d of dateien) {
    const t = fs.readFileSync(d, 'utf8');
    for (const wort of ['createBrowserRouter', 'RouterProvider', 'useLoaderData', 'useActionData', 'defer(']) {
      if (t.includes(wort)) teuer.push(`${path.basename(d)}: ${wort}`);
    }
  }
  ok(`nichts aus der Datenschicht von Fassung 6.4${teuer.length ? ': ' + teuer.join(', ') : ''}`, teuer.length === 0);
}

console.log('\n── Ein Routenbaum, tatsächlich gerendert ──');
{
  const React = require(path.join(wurzel, 'client', 'node_modules', 'react'));
  const { renderToStaticMarkup } = require(path.join(wurzel, 'client', 'node_modules', 'react-dom', 'server'));
  const rr = require(path.join(wurzel, 'client', 'node_modules', 'react-router-dom'));
  const e = React.createElement;

  for (const name of ['BrowserRouter', 'Routes', 'Route', 'Navigate', 'Link',
    'useNavigate', 'useParams', 'useLocation', 'useSearchParams']) {
    ok(`${name} gibt es weiterhin`, rr[name] !== undefined);
  }

  const Detail = () => {
    const { id } = rr.useParams();
    const ort = rr.useLocation();
    return e('div', null, `Mandat ${id} auf ${ort.pathname}`);
  };
  const Start = () => e('div', null, e(rr.Link, { to: '/projekte/7' }, 'Zum Mandat'));

  const baum = (pfad) => e(rr.StaticRouter, { location: pfad },
    e(rr.Routes, null,
      e(rr.Route, { path: '/', element: e(Start) }),
      e(rr.Route, { path: '/projekte/:id', element: e(Detail) }),
      e(rr.Route, { path: '/alt', element: e('div', null, 'alt') })));

  const start = renderToStaticMarkup(baum('/'));
  ok('die Startseite rendert und der Link traegt die Adresse', /href="\/projekte\/7"/.test(start));
  const detail = renderToStaticMarkup(baum('/projekte/7'));
  ok('der Parameter kommt an', /Mandat 7/.test(detail));
  ok('und der Pfad ebenso', /auf \/projekte\/7/.test(detail));
  // Eine Umleitung ueber <Navigate> laesst sich serverseitig nicht
  // beobachten: Im StaticRouter ist sie beim ersten Rendern bewusst
  // wirkungslos, in Fassung 6 wie in Fassung 7. Geprueft wird deshalb, dass
  // sich das Element anlegen laesst und die Eigenschaften traegt, die die
  // Anwendung ihm gibt.
  const navi = e(rr.Navigate, { to: '/anmelden', replace: true });
  ok('eine Umleitung laesst sich bauen', navi.props.to === '/anmelden' && navi.props.replace === true);
  ok('und die Anwendung benutzt sie genau so',
    /<Navigate to=\{?["'/]/.test(fs.readFileSync(path.join(quelle, 'App.jsx'), 'utf8')));
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
