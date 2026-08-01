"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CinematicTextReveal } from "@/components/ui/cinematic-text-reveal";
import { cn } from "@/lib/utils";

export type ElegistChatGreetingProps = {
  greeting: string;
  className?: string;
};

function composeMeasuredGreeting(greeting: string) {
  return greeting.replace(
    /^What would you like\s+/,
    "What would you like\n",
  );
}

export function ElegistChatGreeting({
  greeting,
  className,
}: ElegistChatGreetingProps) {
  const probeRef = useRef<HTMLHeadingElement | null>(null);
  const punctuationProbeRef = useRef<HTMLSpanElement | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const measuredGreeting = useMemo(
    () => composeMeasuredGreeting(greeting),
    [greeting],
  );

  useEffect(() => {
    let active = true;
    const fontSet = document.fonts;

    if (!fontSet) {
      const frame = window.requestAnimationFrame(() => {
        if (active) setFontReady(true);
      });
      return () => {
        active = false;
        window.cancelAnimationFrame(frame);
      };
    }

    const family = window
      .getComputedStyle(probeRef.current as HTMLHeadingElement)
      .fontFamily.split(",")[0]
      ?.trim();
    const punctuationFamily = punctuationProbeRef.current
      ? window
          .getComputedStyle(punctuationProbeRef.current)
          .fontFamily.split(",")[0]
          ?.trim()
      : undefined;

    if (!family) return undefined;

    const descriptor = `1em ${family}`;
    const punctuationDescriptor = punctuationFamily
      ? `1em ${punctuationFamily}`
      : undefined;
    const punctuationLoad = punctuationDescriptor
      ? document.fonts.load(punctuationDescriptor, ",")
      : Promise.resolve([]);

    void Promise.all([
      document.fonts.load(descriptor, measuredGreeting.replace(",", "")),
      punctuationLoad,
    ])
      .then(([faces, punctuationFaces]) => {
        const punctuationReady =
          !punctuationDescriptor ||
          (punctuationFaces.length > 0 &&
            document.fonts.check(punctuationDescriptor, ","));

        if (
          active &&
          faces.length > 0 &&
          punctuationReady &&
          document.fonts.check(descriptor, measuredGreeting.replace(",", ""))
        ) {
          setFontReady(true);
        }
      })
      .catch(() => {
        // The accessible heading remains available without exposing a UI-font substitute.
      });

    return () => {
      active = false;
    };
  }, [measuredGreeting]);

  const commaIndex = measuredGreeting.indexOf(",");
  const beforeComma = commaIndex >= 0
    ? measuredGreeting.slice(0, commaIndex)
    : measuredGreeting;
  const afterComma = commaIndex >= 0
    ? measuredGreeting.slice(commaIndex + 1)
    : "";

  return (
    <div
      className={cn(
        "relative w-full font-elegist whitespace-pre-line [font-synthesis:none]",
        className,
      )}
    >
      <h1
        ref={probeRef}
        aria-hidden="true"
        className="invisible m-0"
      >
        {beforeComma}
        {commaIndex >= 0 ? (
          <>
            <span ref={punctuationProbeRef} className="font-vogue">,</span>
            {afterComma}
          </>
        ) : null}
      </h1>

      {fontReady ? (
        <div aria-hidden="true" className="absolute inset-0 m-0 w-full">
          <CinematicTextReveal
            as="span"
            variant="measured"
            className="font-elegist whitespace-pre-line [font-synthesis:none]"
            renderGrapheme={(grapheme) =>
              grapheme === "," ? <span className="font-vogue">,</span> : grapheme
            }
          >
            {measuredGreeting}
          </CinematicTextReveal>
        </div>
      ) : null}

      <h1 className="sr-only">{greeting}</h1>
    </div>
  );
}
