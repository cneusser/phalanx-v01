import React from 'react';

// CapitalMatch brand colors
export const CM = {
  light: '#29ABE2',  // "Capital" – sky blue
  dark:  '#1A4D8A',  // "Match"   – deep navy
};

const FONT = "'Nunito', 'Poppins', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * CapitalMatch Logo — pure CSS/HTML, no external files needed.
 *
 * Props:
 *   textSize  – font size in px (default 22)
 *   white     – render in white (for dark backgrounds)
 *   showClaim – show tagline below
 *   compact   – single-line "CapitalMatch" (used in Navbar/Footer)
 */
export default function CapitalMatchLogo({
  textSize  = 22,
  height    = null,   // ignored – kept for API compatibility
  size      = null,   // ignored – kept for API compatibility
  white     = false,
  showClaim = false,
  compact   = false,
}) {
  const colorCapital = white ? 'rgba(255,255,255,0.92)' : CM.light;
  const colorMatch   = white ? '#ffffff'                 : CM.dark;
  const colorClaim   = white ? 'rgba(255,255,255,0.60)' : '#6b7280';

  // ── Compact: "CapitalMatch" inline, one line ─────────────────────────────
  if (compact) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', userSelect: 'none', lineHeight: 1 }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorCapital, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Capital
        </span>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorMatch, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Match
        </span>
      </div>
    );
  }

  // ── Stacked: "Capital" / "Match" two lines (Login, Register, Hero) ───────
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none', lineHeight: 1 }}>
      <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorCapital, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        Capital
      </span>
      <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorMatch, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        Match
      </span>
      {showClaim && (
        <span style={{
          fontFamily: FONT, fontWeight: 500,
          fontSize: Math.round(textSize * 0.38),
          color: colorClaim,
          letterSpacing: '0.04em',
          marginTop: '0.45em',
          whiteSpace: 'nowrap',
        }}>
          Kapital suchen. Partner finden.
        </span>
      )}
    </div>
  );
}
