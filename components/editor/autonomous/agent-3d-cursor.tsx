'use client'

/**
 * Agent3DCursor
 *
 * Premium 3D claymorphic rounded black arrow cursor matching the user's reference.
 * Features soft rounded corners, bulbous pillowy bevels, specular top-edge lighting,
 * and deep elevated drop shadows.
 */

import React from 'react'

interface Agent3DCursorProps {
  className?: string
  isClicking?: boolean
}

export function Agent3DCursor({ className = '', isClicking = false }: Agent3DCursorProps) {
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform duration-100 ease-out"
        style={{
          transform: isClicking ? 'scale(0.96) translate3d(1px, 1px, 0)' : 'scale(1)',
        }}
      >
        <defs>
          {/* Main 3D Pillowy Clay Body Gradient */}
          <linearGradient
            id="clay-cursor-body"
            x1="5"
            y1="5"
            x2="28"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#3d3d44" />
            <stop offset="22%" stopColor="#27272d" />
            <stop offset="55%" stopColor="#1a1a1f" />
            <stop offset="82%" stopColor="#121215" />
            <stop offset="100%" stopColor="#08080a" />
          </linearGradient>

          {/* Specular Top-Edge Ridge Highlight */}
          <linearGradient
            id="clay-cursor-highlight"
            x1="6"
            y1="5"
            x2="26"
            y2="18"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.65)" />
            <stop offset="30%" stopColor="rgba(255, 255, 255, 0.35)" />
            <stop offset="65%" stopColor="rgba(255, 255, 255, 0.08)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </linearGradient>

          {/* Upper Contour Sheen */}
          <linearGradient
            id="clay-cursor-sheen"
            x1="6"
            y1="6"
            x2="16"
            y2="14"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.40)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.10)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>

          {/* Perimeter Bevel Stroke */}
          <linearGradient
            id="clay-cursor-rim"
            x1="5"
            y1="5"
            x2="30"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
            <stop offset="45%" stopColor="rgba(255, 255, 255, 0.15)" />
            <stop offset="80%" stopColor="rgba(0, 0, 0, 0.6)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.95)" />
          </linearGradient>
        </defs>

        {/* 1. Base 3D Claymorphic Body (smooth pillowy arrow with rounded extremities) */}
        <path
          d="M 6.4 5.2
             C 7.6 4.3 9.4 4.7 10.3 6.0
             L 25.8 15.6
             C 27.6 16.7 27.8 19.3 26.2 20.6
             C 25.1 21.6 23.4 21.6 22.1 20.7
             L 16.2 17.6
             C 14.8 16.9 13.3 17.8 13.6 19.4
             L 16.4 25.8
             C 17.2 27.8 15.4 29.8 13.3 29.2
             C 12.0 28.8 11.2 27.7 10.7 26.5
             L 5.4 8.6
             C 4.8 7.0 5.3 5.9 6.4 5.2 Z"
          fill="url(#clay-cursor-body)"
        />

        {/* 2. Perimeter Bevel Highlight Stroke */}
        <path
          d="M 6.4 5.2
             C 7.6 4.3 9.4 4.7 10.3 6.0
             L 25.8 15.6
             C 27.6 16.7 27.8 19.3 26.2 20.6
             C 25.1 21.6 23.4 21.6 22.1 20.7
             L 16.2 17.6
             C 14.8 16.9 13.3 17.8 13.6 19.4
             L 16.4 25.8
             C 17.2 27.8 15.4 29.8 13.3 29.2
             C 12.0 28.8 11.2 27.7 10.7 26.5
             L 5.4 8.6
             C 4.8 7.0 5.3 5.9 6.4 5.2 Z"
          stroke="url(#clay-cursor-rim)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 3. Upper Pillowy Specular Ridge Light */}
        <path
          d="M 7.2 6.4
             C 8.0 5.9 9.2 6.2 9.8 7.0
             L 24.2 16.0
             C 24.8 16.4 24.6 17.2 24.0 17.4
             L 15.6 15.2
             C 14.2 14.8 12.8 15.4 12.4 16.8
             L 10.4 24.2
             C 10.1 25.0 9.2 24.8 9.0 24.2
             L 6.6 8.6
             C 6.4 7.6 6.6 6.8 7.2 6.4 Z"
          fill="url(#clay-cursor-highlight)"
          opacity="0.85"
        />

        {/* 4. Bulbous Center Highlight (Pillowy Sheen) */}
        <ellipse
          cx="11.5"
          cy="11.5"
          rx="4.5"
          ry="3.2"
          transform="rotate(-25 11.5 11.5)"
          fill="url(#clay-cursor-sheen)"
        />

        {/* 5. Jarvis AI Core Status Micro-Glow (Cyan tip pulse) */}
        <circle
          cx="7.2"
          cy="6.8"
          r="1.4"
          fill="#00f0ff"
          opacity="0.9"
          className="animate-pulse"
          filter="drop-shadow(0 0 4px #00f0ff)"
        />
      </svg>
    </div>
  )
}
