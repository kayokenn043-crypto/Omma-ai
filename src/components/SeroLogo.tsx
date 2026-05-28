import React from "react";

interface SeroLogoProps {
  className?: string;
  glow?: boolean;
}

export function SeroLogo({ className = "w-6 h-6", glow = true }: SeroLogoProps) {
  return <OmmaLogo className={className} glow={glow} />;
}

export function OmmaLogo({ className = "w-6 h-6", glow = true }: SeroLogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      id="omma-svg-logo"
    >
      <defs>
        {/* Moroccan Green Ggradient */}
        <linearGradient id="moroccoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0df27b" /> {/* Vibrant mint green */}
          <stop offset="50%" stopColor="#06c270" /> {/* Moroccan Green (Mid) */}
          <stop offset="100%" stopColor="#006233" /> {/* Royal Moroccan Green */}
        </linearGradient>

        {/* Moroccan Red Gradient */}
        <linearGradient id="moroccoRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5252" /> {/* Light bright red */}
          <stop offset="100%" stopColor="#c1272d" /> {/* Moroccan Crimson Red */}
        </linearGradient>

        {/* Soft zinc accent */}
        <linearGradient id="zincOutline" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>

        {glow && (
          <filter id="ommaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* Background glow of green/red split */}
      {glow && (
        <g filter="url(#ommaGlow)" opacity="0.4" className="pointer-events-none">
          {/* Green glow */}
          <circle cx="45" cy="55" r="28" fill="#06c270" opacity="0.3" />
          <path
            d="M52 78L72 40 M72 40L88 78"
            stroke="#06c270"
            strokeWidth="15"
            strokeLinecap="round"
            opacity="0.35"
          />
          {/* Red glow */}
          <path
            d="M84 40 L90 58"
            stroke="#c1272d"
            strokeWidth="15"
            strokeLinecap="round"
            opacity="0.35"
          />
        </g>
      )}

      {/* Main emblem group */}
      <g>
        {/* Left Outer Tech Circle - Dark metallic look */}
        <circle 
          cx="45" 
          cy="55" 
          r="34" 
          stroke="url(#zincOutline)" 
          strokeWidth="7" 
          fill="none" 
        />

        {/* Neural nodes inside the circle on left */}
        {/* Connection traces/wires */}
        <path 
          d="M34 40 L45 40 L50 55 M28 48 L38 48 L50 55 M26 58 L38 58 L50 55 M30 68 L40 68 L50 55 M38 78 L45 78 L50 55 M50 55 L50 35"
          stroke="url(#moroccoGreen)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* Shiny Circular Nodes */}
        <circle cx="34" cy="40" r="3.5" fill="#0df27b" className="animate-pulse" />
        <circle cx="28" cy="48" r="3.5" fill="#0df27b" />
        <circle cx="26" cy="58" r="3.5" fill="#0df27b" />
        <circle cx="30" cy="68" r="3.5" fill="#0df27b" />
        <circle cx="38" cy="78" r="3.5" fill="#0df27b" />

        <circle cx="50" cy="35" r="3" fill="#ffffff" />

        {/* Stylized Lambda/A Path (Green Moroccan chevron) representing Letter 'A' or 'O' intersection */}
        <path
          d="M55 76 L74 38 L88 76"
          stroke="url(#moroccoGreen)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Overlapping stylized Red accent block on the right representing 'AI' / red flag star element */}
        <path
          d="M84 38 L90 56"
          stroke="url(#moroccoRed)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Highlight star-shaped dot representing connection/Moroccan star */}
        <polygon 
          points="74,38 76,41 79,41 77,43 78,46 74,44 70,46 71,43 69,41 72,41" 
          fill="#ffffff" 
        />
      </g>
    </svg>
  );
}
