import React from 'react';

// CapitalMatch brand colors — exported for use across the platform
export const CM = {
  light: '#29ABE2',  // "Capital" – sky blue
  dark:  '#1A4D8A',  // "Match"   – deep navy
};

const FONT = "'Nunito', 'Poppins', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// PNG logo embedded as base64 — no file path dependency
// Generated with Pillow: "Capital" #29ABE2 / "Match" #1A4D8A, Poppins Bold, 320×159px
const LOGO_PNG = 'data:image/png;base64,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';

/**
 * CapitalMatch Logo
 *
 * Renders the PNG logo (base64-embedded, no file path dependency).
 * Falls back to CSS text if somehow the image fails.
 *
 * Props:
 *   textSize  – base font size in px (default 22); also scales the PNG
 *   white     – render in white for dark backgrounds (Navbar, Footer, Hero)
 *   showClaim – show tagline "Kapital suchen. Partner finden."
 *   compact   – single-line "CapitalMatch" (Navbar/Footer)
 */
export default function CapitalMatchLogo({
  textSize  = 22,
  height    = null,  // kept for API compatibility
  size      = null,  // kept for API compatibility
  white     = false,
  showClaim = false,
  compact   = false,
}) {
  const colorCapital = white ? 'rgba(255,255,255,0.90)' : CM.light;
  const colorMatch   = white ? '#ffffff'                 : CM.dark;
  const colorClaim   = white ? 'rgba(255,255,255,0.60)' : '#6b7280';

  // ── Tagline element ────────────────────────────────────────────────────────
  const claim = showClaim && !compact ? (
    <span style={{
      display: 'block',
      fontFamily: FONT,
      fontWeight: 500,
      fontSize: Math.round(textSize * 0.38),
      color: colorClaim,
      letterSpacing: '0.04em',
      marginTop: '0.45em',
      whiteSpace: 'nowrap',
    }}>
      Kapital suchen. Partner finden.
    </span>
  ) : null;

  // ── WHITE MODE: CSS text on dark/navy backgrounds (Navbar, Footer, Hero) ──
  if (white) {
    if (compact) {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'baseline', userSelect: 'none', lineHeight: 1 }}>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorCapital, letterSpacing: '-0.03em', lineHeight: 1 }}>Capital</span>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorMatch,   letterSpacing: '-0.03em', lineHeight: 1 }}>Match</span>
        </div>
      );
    }
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none', lineHeight: 1 }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorCapital, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Capital</span>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: textSize, color: colorMatch,   letterSpacing: '-0.03em', lineHeight: 1.1 }}>Match</span>
        {claim}
      </div>
    );
  }

  // ── COLOUR MODE: PNG (base64) for light backgrounds (Login, Register, Hero-Box) ──
  // PNG is 320×159 px. Scale by textSize: textSize=36 → height≈76px, width≈152px
  const pngHeight = Math.round(textSize * 2.1);
  const pngWidth  = Math.round(pngHeight * (320 / 159));

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none', lineHeight: 1 }}>
      <img
        src={LOGO_PNG}
        alt="CapitalMatch"
        width={pngWidth}
        height={pngHeight}
        style={{ display: 'block', objectFit: 'contain' }}
        draggable={false}
      />
      {claim}
    </div>
  );
}
