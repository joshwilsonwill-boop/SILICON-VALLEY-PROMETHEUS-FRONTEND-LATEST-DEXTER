"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type GooeyTextProps = {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  className?: string;
  textClassName?: string;
};

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className,
  textClassName,
}: GooeyTextProps) {
  const text1Ref = React.useRef<HTMLSpanElement>(null);
  const text2Ref = React.useRef<HTMLSpanElement>(null);
  const animationRef = React.useRef<number | null>(null);
  const filterId = React.useId().replace(/:/g, "");
  const textKey = texts.join("\u0001");
  const stableTexts = React.useMemo(() => textKey.split("\u0001").map((text) => text.trim()).filter(Boolean), [textKey]);
  const firstText = stableTexts[0] ?? "";

  React.useEffect(() => {
    if (!text1Ref.current || !text2Ref.current || stableTexts.length === 0) return undefined;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    text1Ref.current.textContent = firstText;
    text2Ref.current.textContent = stableTexts[1] ?? firstText;

    if (prefersReducedMotion || stableTexts.length === 1) {
      text1Ref.current.style.opacity = "100%";
      text2Ref.current.style.opacity = "0%";
      text1Ref.current.style.filter = "";
      text2Ref.current.style.filter = "";
      return undefined;
    }

    let textIndex = stableTexts.length - 1;
    let lastTime = Date.now();
    let morph = 0;
    let cooldown = cooldownTime;

    const setMorph = (fraction: number) => {
      if (!text1Ref.current || !text2Ref.current) return;

      const safeFraction = Math.max(0.001, Math.min(1, fraction));
      text2Ref.current.style.filter = `blur(${Math.min(8 / safeFraction - 8, 100)}px)`;
      text2Ref.current.style.opacity = `${Math.pow(safeFraction, 0.4) * 100}%`;

      const inverseFraction = Math.max(0.001, 1 - safeFraction);
      text1Ref.current.style.filter = `blur(${Math.min(8 / inverseFraction - 8, 100)}px)`;
      text1Ref.current.style.opacity = `${Math.pow(inverseFraction, 0.4) * 100}%`;
    };

    const doCooldown = () => {
      morph = 0;
      if (!text1Ref.current || !text2Ref.current) return;
      text2Ref.current.style.filter = "";
      text2Ref.current.style.opacity = "100%";
      text1Ref.current.style.filter = "";
      text1Ref.current.style.opacity = "0%";
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / morphTime;

      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    };

    const animate = () => {
      animationRef.current = window.requestAnimationFrame(animate);
      const currentTime = Date.now();
      const shouldIncrementIndex = cooldown > 0;
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      cooldown -= delta;

      if (cooldown <= 0) {
        if (shouldIncrementIndex && text1Ref.current && text2Ref.current) {
          textIndex = (textIndex + 1) % stableTexts.length;
          text1Ref.current.textContent = stableTexts[textIndex % stableTexts.length];
          text2Ref.current.textContent = stableTexts[(textIndex + 1) % stableTexts.length];
        }
        doMorph();
      } else {
        doCooldown();
      }
    };

    animationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cooldownTime, firstText, morphTime, stableTexts]);

  return (
    <span className={cn("relative inline-flex items-center justify-center", className)} aria-label={firstText}>
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={`threshold-${filterId}`}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
      <span className="relative inline-flex h-full w-full items-center justify-center" style={{ filter: `url(#threshold-${filterId})` }}>
        <span
          ref={text1Ref}
          aria-hidden="true"
          className={cn("absolute inline-block select-none whitespace-nowrap text-center", textClassName)}
        >
          {firstText}
        </span>
        <span
          ref={text2Ref}
          aria-hidden="true"
          className={cn("absolute inline-block select-none whitespace-nowrap text-center", textClassName)}
          style={{ opacity: 0 }}
        >
          {stableTexts[1] ?? firstText}
        </span>
      </span>
    </span>
  );
}
