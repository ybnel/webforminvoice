import React from 'react';

function Logo({ size = 42, style = {} }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id="headerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Main Document Frame */}
      <path 
        d="M 26 14 
           H 54 
           L 72 32 
           V 78 
           C 72 82.5 68.5 86 64 86 
           H 26 
           C 21.5 86 18 82.5 18 78 
           V 22 
           C 18 17.5 21.5 14 26 14 Z" 
        stroke="url(#headerLogoGrad)" 
        strokeWidth="7" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />

      {/* Fold Flap */}
      <path 
        d="M 54 14 V 32 H 72" 
        stroke="url(#headerLogoGrad)" 
        strokeWidth="7" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />

      {/* 3 Bold Horizontal Text Lines inside document */}
      <rect x="28" y="34" width="28" height="6" rx="3" fill="url(#headerLogoGrad)" />
      <rect x="28" y="46" width="28" height="6" rx="3" fill="url(#headerLogoGrad)" />
      <rect x="28" y="58" width="16" height="6" rx="3" fill="url(#headerLogoGrad)" />

      {/* Bold Checkmark Icon overlapping bottom right */}
      <path 
        d="M 44 60 L 58 74 L 84 46" 
        stroke="url(#headerLogoGrad)" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />
    </svg>
  );
}

export default Logo;
