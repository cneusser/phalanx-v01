// Phalanx SVG Logo: recreated from www.phalanx.de brand assets
// Flower badge: 6-petal geometric flower in navy #14314F on steel-blue circle

export default function PhalanxLogo({ size = 40, showText = true, textSize = 22, white = false }) {
  const navy = white ? '#FFFFFF' : '#14314F';
  const blue = white ? 'rgba(255,255,255,0.25)' : '#A5C8E4';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
      {/* Flower Badge */}
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer circle background */}
        <circle cx="50" cy="50" r="48" fill={blue} />
        {/* 6-petal flower: 6 ellipses rotated 60° each */}
        <g transform="translate(50,50)">
          <ellipse rx="16" ry="28" fill={navy} transform="rotate(0)" />
          <ellipse rx="16" ry="28" fill={navy} transform="rotate(60)" />
          <ellipse rx="16" ry="28" fill={navy} transform="rotate(120)" />
        </g>
        {/* Center circle overlay for depth */}
        <circle cx="50" cy="50" r="12" fill={blue} />
        {/* Thin border */}
        <circle cx="50" cy="50" r="48" stroke={navy} strokeWidth="2" fill="none" />
      </svg>
      {/* pHaLanX text */}
      {showText && (
        <span style={{
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontWeight: 700,
          fontSize: textSize,
          letterSpacing: '0.03em',
          color: navy,
          lineHeight: 1,
        }}>
          p<span style={{ textTransform: 'uppercase', fontSize: textSize * 0.85 }}>H</span>
          a<span style={{ textTransform: 'uppercase', fontSize: textSize * 0.85 }}>L</span>
          an<span style={{ textTransform: 'uppercase', fontSize: textSize * 0.85 }}>X</span>
        </span>
      )}
    </div>
  );
}

// Just the flower icon without text
export function PhalanxFlower({ size = 40, white = false }) {
  const navy = white ? '#FFFFFF' : '#14314F';
  const blue = white ? 'rgba(255,255,255,0.25)' : '#A5C8E4';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill={blue} />
      <g transform="translate(50,50)">
        <ellipse rx="16" ry="28" fill={navy} transform="rotate(0)" />
        <ellipse rx="16" ry="28" fill={navy} transform="rotate(60)" />
        <ellipse rx="16" ry="28" fill={navy} transform="rotate(120)" />
      </g>
      <circle cx="50" cy="50" r="12" fill={blue} />
      <circle cx="50" cy="50" r="48" stroke={navy} strokeWidth="2" fill="none" />
    </svg>
  );
}
