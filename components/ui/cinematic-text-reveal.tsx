"use client";

import type { ElementType } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";

const STAGGER_MS = 24;
const MAX_STAGGER_MS = 360;

export type CinematicTextRevealProps = {
  children: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  variant?: "measured" | "hard-cut";
  className?: string;
  once?: boolean;
};

export function segmentGraphemes(value: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), ({ segment }) => segment);
  }

  return Array.from(value);
}

const measuredGlyph: Variants = {
  hidden: {
    opacity: 0,
    y: "0.9em",
    rotateX: -36,
    filter: "blur(5px)",
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: "blur(0px)",
    transition: {
      delay: Math.min(index * STAGGER_MS, MAX_STAGGER_MS) / 1000,
      duration: 0.68,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const hardCutGlyph: Variants = {
  hidden: {
    opacity: 0,
    y: "0.72em",
    clipPath: "inset(100% 0 0 0)",
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    clipPath: "inset(0% 0 0 0)",
    transition: {
      delay: Math.min(index * 20, MAX_STAGGER_MS) / 1000,
      duration: 0.52,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export function CinematicTextReveal({
  children,
  as = "span",
  variant = "measured",
  className,
  once = true,
}: CinematicTextRevealProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const Tag = as as ElementType;
  const tokens = children.split(/(\s+)/);
  const glyphVariants = variant === "hard-cut" ? hardCutGlyph : measuredGlyph;
  let glyphIndex = 0;

  return (
    <Tag className={cn("relative", className)} role="text">
      <span className="sr-only">{children}</span>
      <motion.span
        aria-hidden="true"
        className="inline"
        initial={reducedMotion ? false : "hidden"}
        whileInView={reducedMotion ? undefined : "visible"}
        viewport={{ once, amount: 0.72 }}
      >
        {tokens.map((token, tokenIndex) => {
          if (/^\s+$/.test(token)) {
            return (
              <span key={`space-${tokenIndex}`} className="whitespace-pre-wrap">
                {token}
              </span>
            );
          }

          return (
            <span key={`word-${tokenIndex}`} className="inline-block whitespace-nowrap">
              {segmentGraphemes(token).map((grapheme, graphemeIndex) => {
                const index = glyphIndex;
                glyphIndex += 1;

                return (
                  <motion.span
                    key={`${tokenIndex}-${graphemeIndex}-${grapheme}`}
                    className="inline-block transform-gpu [backface-visibility:hidden]"
                    custom={index}
                    variants={glyphVariants}
                    style={reducedMotion ? { opacity: 1, transform: "none", filter: "none", clipPath: "none" } : undefined}
                  >
                    {grapheme}
                  </motion.span>
                );
              })}
            </span>
          );
        })}
      </motion.span>
    </Tag>
  );
}
