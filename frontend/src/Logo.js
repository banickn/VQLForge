import React from 'react';

function Logo() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
      <stop offset="100%" stopColor="#7c3aed" stopOpacity="1" />
    </linearGradient>
  </defs>
  
  <g transform="translate(40, 40) scale(1.4)">
    <path d="M -20 6 L 0 16 L 20 6 L 0 -4 Z" fill="url(#purpleGrad)"/>
    <path d="M -20 6 L -20 9 L 0 19 L 0 16 Z" fill="#6d28d9"/>
    <path d="M 0 16 L 0 19 L 20 9 L 20 6 Z" fill="#a855f7"/>
    
    <path d="M -20 -2 L 0 8 L 20 -2 L 0 -12 Z" fill="url(#purpleGrad)"/>
    <path d="M -20 -2 L -20 1 L 0 11 L 0 8 Z" fill="#6d28d9"/>
    <path d="M 0 8 L 0 11 L 20 1 L 20 -2 Z" fill="#a855f7"/>
    
    <path d="M -20 -10 L 0 0 L 20 -10 L 0 -20 Z" fill="white"/>
  </g>
  </svg>
  );
}

export default Logo;
