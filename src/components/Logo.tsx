import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | number;
  textColor?: string;
}

export default function Logo({
  className = "",
  showText = true,
  size = "md",
  textColor = "text-[#3C1E19]"
}: LogoProps) {
  // Map friendly size presets to pixel widths
  const sizeMap = {
    sm: 40,
    md: 56,
    lg: 96,
    xl: 160
  };

  const pixelSize = typeof size === "number" ? size : sizeMap[size] || 56;

  // If we only show the emblem (without text), we can use a tighter bounding box
  const viewBox = showText ? "0 0 320 385" : "0 0 320 270";

  return (
    <svg
      viewBox={viewBox}
      width={pixelSize}
      height={showText ? (pixelSize * 385) / 320 : (pixelSize * 270) / 320}
      className={`inline-block select-none transition-transform duration-300 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Geometric emblem group */}
      <g id="logo-geometric-group">
        {/* Top curved red sail / triangle */}
        <path
          d="M 90 170 L 210 170 Q 180 140 165 95 Z"
          fill="#D12229"
          stroke="#D12229"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Small floating orange/yellow circle (sun) */}
        <circle 
          cx="215" 
          cy="100" 
          r="18" 
          fill="#F5B016" 
        />

        {/* Bottom-left right-angle blue triangle */}
        <path
          d="M 95 195 L 95 255 L 170 255 Z"
          fill="#0B4C9C"
          stroke="#0B4C9C"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Bottom-right large orange/yellow circle (sun/wheel) */}
        <circle 
          cx="190" 
          cy="225" 
          r="30" 
          fill="#F5B016" 
        />
      </g>

      {/* 2. Text branding below the emblem */}
      {showText && (
        <g id="logo-text-group" className={textColor}>
          {/* Cursive cursive "Iniciativa" */}
          <text
            x="160"
            y="312"
            textAnchor="middle"
            fill="currentColor"
            style={{
              fontFamily: 'Playball, "Marck Script", cursive',
              fontSize: "36px",
              fontStyle: "italic",
              fontWeight: "normal"
            }}
          >
            Iniciativa
          </text>

          {/* Cursive bold "Ser o Estar" */}
          <text
            x="160"
            y="360"
            textAnchor="middle"
            fill="currentColor"
            style={{
              fontFamily: 'Playball, "Marck Script", cursive',
              fontSize: "44px",
              fontWeight: "bold"
            }}
          >
            Ser o Estar
          </text>
        </g>
      )}
    </svg>
  );
}
