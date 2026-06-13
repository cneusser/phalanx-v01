import React from 'react';

// CapitalMatch brand colors
export const CM = {
  light: '#29ABE2',  // "Capital" – sky blue
  dark:  '#1A4D8A',  // "Match"   – deep navy
};

/**
 * CapitalMatch Logo — inline SVG, no external image file needed.
 *
 * Props:
 *   height    – overall height of the SVG logo (default 56)
 *   white     – render all white (for dark/coloured backgrounds)
 *   compact   – single-line layout (Capital + Match side by side)
 *   showClaim – show "Kapital suchen. Partner finden." tagline
 *
 * Falls back gracefully to web-safe fonts if Nunito is not loaded.
 */
export default function CapitalMatchLogo({
  height    = 56,
  size      = 40,   // legacy alias — ignored when height is set
  textSize  = null, // legacy alias — maps to height/2.4 if provided
  white     = false,
  compact   = false,
  showClaim = false,
}) {
  const h = textSize ? textSize * 2.4 : height || size || 56;
  const font = "'Nunito', 'Nunito Sans', 'Poppins', 'Segoe UI', Arial, sans-serif";

  const colorCapital = white ? 'rgba(255,255,255,0.92)' : CM.light;
  const colorMatch   = white ? '#ffffff'                 : CM.dark;
  const colorClaim   = white ? 'rgba(255,255,255,0.62)' : '#6b7280';

  // ── Compact: horizontal one-liner (Navbar) ──────────────────────────────
  if (compact) {
    const fs = h * 0.48;
    const w  = fs * 6.4;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        aria-label="CapitalMatch"
        style={{ display: 'block', userSelect: 'none', overflow: 'visible' }}
      >
        <text
          x="0"
          y={h * 0.78}
          fontFamily={font}
          fontWeight="800"
          fontSize={fs}
          letterSpacing="-0.5"
          fill={colorCapital}
        >Capital</text>
        <text
          x={fs * 3.52}
          y={h * 0.78}
          fontFamily={font}
          fontWeight="800"
          fontSize={fs}
          letterSpacing="-0.5"
          fill={colorMatch}
        >Match</text>
      </svg>
    );
  }

  // ── Stacked two-line (default — Login, Register, Footer) ────────────────
  const fs    = h * 0.44;
  const lineH = h * 0.48;
  const svgW  = fs * 3.9;
  const svgH  = showClaim ? h + lineH * 0.55 : h;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      aria-label="CapitalMatch"
      style={{ display: 'block', userSelect: 'none', overflow: 'visible' }}
    >
      {/* "Capital" – sky blue, top line */}
      <text
        x="0"
        y={lineH * 0.92}
        fontFamily={font}
        fontWeight="800"
        fontSize={fs}
        letterSpacing="-0.6"
        fill={colorCapital}
      >Capital</text>

      {/* "Match" – navy, bottom line */}
      <text
        x="0"
        y={lineH * 0.92 + lineH}
        fontFamily={font}
        fontWeight="800"
        fontSize={fs}
        letterSpacing="-0.6"
        fill={colorMatch}
      >Match</text>

      {/* Optional tagline */}
      {showClaim && (
        <text
          x="0"
          y={lineH * 0.92 + lineH * 2 + fs * 0.15}
          fontFamily={font}
          fontWeight="400"
          fontSize={fs * 0.38}
          letterSpacing="0.5"
          fill={colorClaim}
        >Kapital suchen. Partner finden.</text>
      )}
    </svg>
  );
}
