// Trefferausschnitt der Volltextsuche (v0.507).
// Der Server markiert Fundstellen mit « … ». Hier werden daraus Textknoten und
// <mark>-Elemente. React escaped Textknoten selbst; der Ausschnitt stammt aus
// hochgeladenen Dokumenten und darf deshalb nie als HTML ins DOM.
import React from 'react';

export function trefferAusschnitt(text, farbe = 'inherit') {
  const teile = String(text || '').split(/[«»]/);
  return teile.map((t, i) => (i % 2 === 1
    ? <mark key={i} style={{ background: '#fde68a', color: farbe, padding: '0 1px', borderRadius: 2 }}>{t}</mark>
    : <span key={i}>{t}</span>));
}
