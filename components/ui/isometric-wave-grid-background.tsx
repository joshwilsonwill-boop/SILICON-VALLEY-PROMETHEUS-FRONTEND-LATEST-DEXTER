'use client';
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface IsoLevelWarpProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Primary line color (Tailwind hex or rgb).
   * Default: cyan/teal mix
   */
  color?: string;
  /**
   * Animation speed multiplier.
   * Default: 1
   */
  speed?: number;
  /**
   * Grid density. Lower = larger cells.
   * Default: 40
   */
  density?: number;
}

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const IsoLevelWarp = ({
  className,
  color = "168, 124, 255",
  speed = 1,
  density = 40,
  ...props
}: IsoLevelWarpProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    type ConnectionNavigator = Navigator & {
      connection?: {
        saveData?: boolean;
      };
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let idleCallbackId: number | undefined;
    const updateMotionPreference = () => {
      const connection = (navigator as ConnectionNavigator).connection;
      const shouldAnimate = !motionQuery.matches
        && !connection?.saveData
        && window.innerWidth >= 1024
        && (navigator.hardwareConcurrency ?? 8) > 4;
      setMotionEnabled(shouldAnimate);
    };

    // Keep the first render free for real application work, then start this
    // decorative canvas once the browser is idle.
    const idleWindow = window as IdleCallbackWindow;
    if (idleWindow.requestIdleCallback) {
      idleCallbackId = idleWindow.requestIdleCallback(updateMotionPreference, { timeout: 1200 });
    } else {
      const timer = window.setTimeout(updateMotionPreference, 500);
      idleCallbackId = timer;
    }
    motionQuery.addEventListener("change", updateMotionPreference);
    window.addEventListener("resize", updateMotionPreference);

    return () => {
      if (idleWindow.cancelIdleCallback && idleCallbackId !== undefined) {
        idleWindow.cancelIdleCallback(idleCallbackId);
      } else if (idleCallbackId !== undefined) {
        window.clearTimeout(idleCallbackId);
      }
      motionQuery.removeEventListener("change", updateMotionPreference);
      window.removeEventListener("resize", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!motionEnabled) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = container.offsetWidth;
    let height = container.offsetHeight;
    let animationFrameId: number;
    let isPaused = document.hidden;

    // Grid Configuration
    const gridGap = density;
    let rows = Math.ceil(height / gridGap) + 5; // Extra buffer
    let cols = Math.ceil(width / gridGap) + 5;
    
    // Mouse Interaction
    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
    
    // Wave Physics
    let time = 0;

    const resize = () => {
      width = container.offsetWidth;
      height = container.offsetHeight;
      rows = Math.ceil(height / gridGap) + 5;
      cols = Math.ceil(width / gridGap) + 5;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    // Math Helper: Smoothstep
    const smoothMix = (a: number, b: number, t: number) => {
      return a + (b - a) * t;
    };

    const targetFrameDuration = 1000 / 30;
    let lastDrawTime = 0;

    const draw = (timestamp: number) => {
      if (isPaused) return;

      if (timestamp - lastDrawTime < targetFrameDuration) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = timestamp;

      // Clear Screen with trail effect (optional, simplified here for clarity)
      ctx.clearRect(0, 0, width, height);
      
      // Smooth mouse movement
      mouse.x = smoothMix(mouse.x, mouse.targetX, 0.1);
      mouse.y = smoothMix(mouse.y, mouse.targetY, 0.1);

      time += 0.004 * speed;

      ctx.beginPath();
      
      // Calculate Grid Points
      for (let y = 0; y <= rows; y++) {
        // We draw lines row by row
        // To make it look 3D/Topographic, we offset Y based on noise/sine
        
        let isFirst = true;

        for (let x = 0; x <= cols; x++) {
          const baseX = (x * gridGap) - (gridGap * 2);
          const baseY = (y * gridGap) - (gridGap * 2);

          // DISTORTION LOGIC
          // 1. Ambient Wave (The "Breathing")
          const wave = Math.sin(x * 0.2 + time) * Math.cos(y * 0.2 + time) * 11;
          
          // 2. Mouse Repulsion (The "Interaction")
          const dx = baseX - mouse.x;
          const dy = baseY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 300;
          
          // Calculate force: 0 at edge, 1 at center
          const force = Math.max(0, (maxDist - dist) / maxDist);
          // Apply a "Z-push" effect by moving points UP (negative Y) based on proximity
          const interactionY = -(force * force) * 54;

          // Final Coordinates
          const finalX = baseX;
          const finalY = baseY + wave + interactionY;

          // Draw the line
          if (isFirst) {
            ctx.moveTo(finalX, finalY);
            isFirst = false;
          } else {
            // Bezier smoothing for organic feel
            // We simplify to lineTo for performance in high density, 
            // but could use quadraticCurveTo for liquid feel
            ctx.lineTo(finalX, finalY);
          }
        }
      }

      // STYLING
      // Gradient Stroke
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `rgba(${color}, 0)`); // Fade top-left
      gradient.addColorStop(0.5, `rgba(${color}, 0.36)`);
      gradient.addColorStop(1, `rgba(${color}, 0)`); // Fade bottom-right

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        lastDrawTime = 0;
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("resize", resize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, speed, density, motionEnabled]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 z-0 overflow-hidden bg-black", className)}
      {...props}
    >
      {motionEnabled ? <canvas ref={canvasRef} className="block w-full h-full" /> : null}
      
      {/* Optional: Vignette overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.92)_100%)] opacity-70 pointer-events-none" />
    </div>
  );
};

export default IsoLevelWarp;
