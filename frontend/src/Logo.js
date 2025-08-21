import React from 'react';

function Logo() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
          <stop offset="100%" stopColor="#9333ea" stopOpacity="1" />
        </linearGradient>
      </defs>

      <g transform="translate(40, 40) scale(1.4)">
        <path d="M -20 2 L 0 12 L 20 2 L 0 -8 Z" fill="url(#purpleGrad)" />
        <path d="M -20 2 L -20 5 L 0 15 L 0 12 Z" fill="#7c3aed" />
        <path d="M 0 12 L 0 15 L 20 5 L 20 2 Z" fill="#c084fc" />

        <path d="M -20 -4 L 0 6 L 20 -4 L 0 -14 Z" fill="url(#purpleGrad)" />
        <path d="M -20 -4 L -20 -1 L 0 9 L 0 6 Z" fill="#7c3aed" />
        <path d="M 0 6 L 0 9 L 20 -1 L 20 -4 Z" fill="#c084fc" />

        <path d="M -20 -10 L 0 0 L 20 -10 L 0 -20 Z" fill="white" />
      </g>
    </svg>
  );
}

export default Logo;
