// Liquid Carve Button — Originkit
"use client";

import * as React from "react";
import { useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import { useAnimate, useReducedMotion, type Transition } from "framer-motion";

const radiusFromPercent = (w: number, h: number, pct: number) =>
    (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

const GOO_STRENGTH = 8;

const FOLLOW_TAU_MIN = 0.02;
const FOLLOW_TAU_MAX = 0.4;
const SQUASH_TAU = 0.09;
const SQUASH_PER_PX_PER_SEC = 0.0011;
const SQUASH_MAX = 1.6;

const DEFAULT_TRANSITION: Transition = {
    type: "spring",
    stiffness: 110,
    damping: 13,
    mass: 1.4,
};

type RGBA = { r: number; g: number; b: number; a: number };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };

function parseColor(input?: string): RGBA {
    if (!input) return WHITE;
    let c = String(input).trim();
    const token = c.match(/^var\([^,]+,\s*(.+)\)$/i);
    if (token) c = token[1].trim();
    if (c[0] === "#") {
        let h = c.slice(1);
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("");
        if (h.length !== 6 && h.length !== 8) return WHITE;
        const n = parseInt(h, 16);
        if (Number.isNaN(n)) return WHITE;
        return h.length === 6
            ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
            : {
                  r: (n >>> 24) & 255,
                  g: (n >>> 16) & 255,
                  b: (n >>> 8) & 255,
                  a: (n & 255) / 255,
              };
    }
    const fn = c.match(/rgba?\(([^)]+)\)/i);
    if (fn) {
        const p = fn[1]
            .split(/[,\s/]+/)
            .filter(Boolean)
            .map(Number);
        if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v)))
            return {
                r: p[0],
                g: p[1],
                b: p[2],
                a: p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1,
            };
    }
    return WHITE;
}

const opaque = (c: RGBA) =>
    `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;

type Colors = {
    fill?: string;
    textColor?: string;
    hoverFill?: string;
    hoverTextColor?: string;
};

export type IconConfig = {
    type?: "symbol" | "image";
    symbol?: string;
    image?: string | { src?: string; srcSet?: string; alt?: string };
    color?: string;
    size?: number;
    padding?: number;
    rounded?: number;
    side?: "left" | "right";
};

type BlobConfig = {
    color?: string;
    size?: number;
    smoothness?: number;
};

export type LiquidCarveButtonProps = {
    colors?: Colors;
    label?: string;
    font?: React.CSSProperties;
    showText?: boolean;
    padding?: string;
    rounded?: number;
    fill?: string;
    textColor?: string;
    addIcon?: boolean;
    icon?: IconConfig;
    gap?: number;
    blob?: BlobConfig;
    blobColor?: string;
    blobSize?: number;
    link?: string;
    transition?: Transition;
    newTab?: boolean;
    style?: React.CSSProperties;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLElement>) => void;
    title?: string;
    "aria-label"?: string;
    "data-action"?: string;
    "data-autonomous-target"?: string;
    disabled?: boolean;
};

export default function LiquidCarveButton(props: LiquidCarveButtonProps) {
    const {
        label = "LIQUID CARVE",
        font = {
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 13,
            lineHeight: "1.4em",
            letterSpacing: "0.02em",
            textAlign: "left",
        },
        showText = true,
        padding = "8px 18px",
        rounded = 32,
        fill: fillProp,
        textColor: textColorProp,
        colors = { fill: "#FFFFFF", textColor: "#000000" },
        addIcon = false,
        icon = {
            type: "symbol",
            symbol: "\u2192",
            image: "",
            color: "#000000",
            size: 16,
            padding: 0,
            rounded: 0,
            side: "left",
        },
        gap = 8,
        blob: blobGroup = { size: 60, color: "#7ff2d4", smoothness: 50 },
        blobColor: blobColorLegacy,
        blobSize: blobSizeLegacy,
        link = "",
        transition = {
            type: "tween",
            ease: [0.44, 0, 0.56, 1],
            delay: 0,
            duration: 0.8,
        },
        newTab = true,
        style,
        className,
        onClick,
        title,
        "aria-label": ariaLabel,
        "data-action": dataAction,
        "data-autonomous-target": dataAutonomousTarget,
        disabled = false,
    } = props;

    const fill = colors?.fill ?? fillProp ?? "#FFFFFF";
    const textColor = colors?.textColor ?? textColorProp ?? "#000000";

    const [scope, animate] = useAnimate();

    const [radiusBox, setRadiusBox] = useState({ w: 0, h: 0 });
    useIsoLayoutEffect(() => {
        const el = scope.current as HTMLElement | null;
        if (!el) return;
        const read = () =>
            setRadiusBox((prev) =>
                prev.w === el.offsetWidth && prev.h === el.offsetHeight
                    ? prev
                    : { w: el.offsetWidth, h: el.offsetHeight }
            );
        read();
        const ro = new ResizeObserver(read);
        ro.observe(el);
        return () => ro.disconnect();
    }, [scope]);
    const radiusPx = radiusFromPercent(radiusBox.w, radiusBox.h, rounded);
    const followRef = useRef<SVGGElement>(null);
    const squashRef = useRef<SVGGElement>(null);
    const biteRef = useRef<SVGGElement>(null);
    const hovered = useRef(false);
    const chase = useRef({ x: 0, y: 0, tx: 0, ty: 0, squash: 1, angle: 0 });
    const reducedMotion = useReducedMotion();

    const rawId = useId();
    const uid = rawId.replace(/[:]/g, "");
    const filterId = `goo-${uid}`;
    const maskId = `bite-${uid}`;

    const {
        color: blobColor = blobColorLegacy ?? "#7ff2d4",
        size: blobSize = blobSizeLegacy ?? 60,
        smoothness = 55,
    } = blobGroup;

    const fontStyles = (font ?? {}) as React.CSSProperties;
    const rad = Math.max(0, Math.floor(radiusPx));
    const blob = Math.max(1, Math.floor(blobSize));

    const fillRGB = parseColor(fill);
    const blobRGB = parseColor(blobColor);

    const opts = (): Transition | { duration: 0 } =>
        reducedMotion ? { duration: 0 } : transition;

    const live = useRef({ smoothness, reducedMotion });
    live.current = { smoothness, reducedMotion };

    const offset = (e: React.PointerEvent) => {
        const root = scope.current as HTMLElement | null;
        if (!root) return null;
        const r = root.getBoundingClientRect();
        return {
            dx: e.clientX - (r.left + r.width / 2),
            dy: e.clientY - (r.top + r.height / 2),
        };
    };

    useEffect(() => {
        let last = 0;
        const ctrl = animate(0, 1, {
            duration: 1,
            ease: "linear",
            repeat: Infinity,
            onUpdate: () => {
                const now = performance.now();
                const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
                last = now;

                const st = chase.current;
                const { smoothness: sm, reducedMotion: rm } = live.current;
                const t = Math.max(0, Math.min(100, Math.round(sm))) / 100;
                const tau = FOLLOW_TAU_MIN + t * (FOLLOW_TAU_MAX - FOLLOW_TAU_MIN);

                const k = rm ? 1 : 1 - Math.exp(-dt / tau);
                const dx = (st.tx - st.x) * k;
                const dy = (st.ty - st.y) * k;
                st.x += dx;
                st.y += dy;

                const speed = Math.hypot(dx, dy) / dt;
                const want = rm
                    ? 1
                    : Math.min(SQUASH_MAX, 1 + speed * SQUASH_PER_PX_PER_SEC);
                st.squash += (want - st.squash) * (1 - Math.exp(-dt / SQUASH_TAU));
                if (speed > 8) st.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                const f = followRef.current;
                if (f) f.style.transform = `translate(${st.x}px, ${st.y}px)`;
                const q = squashRef.current;
                if (q)
                    q.style.transform = `rotate(${st.angle}deg) scale(${st.squash}, ${1 / st.squash})`;
            },
        });
        return () => ctrl.stop();
    }, [animate]);

    useEffect(() => {
        if (!biteRef.current) return;
        animate(
            biteRef.current,
            { scale: hovered.current ? 1 : 0 },
            { duration: 0 }
        );
    }, [animate, blob, rad]);

    const onEnter = (e: React.PointerEvent) => {
        if (reducedMotion || !biteRef.current || disabled) return;
        hovered.current = true;
        const o = offset(e);
        if (o) {
            const st = chase.current;
            st.tx = o.dx;
            st.ty = o.dy;
            st.x = o.dx;
            st.y = o.dy;
            if (followRef.current)
                followRef.current.style.transform = `translate(${o.dx}px, ${o.dy}px)`;
        }
        animate(biteRef.current, { scale: 1 }, opts() as any);
    };

    const onMove = (e: React.PointerEvent) => {
        if (reducedMotion || !hovered.current || disabled) return;
        const o = offset(e);
        if (!o) return;
        chase.current.tx = o.dx;
        chase.current.ty = o.dy;
    };

    const onLeave = () => {
        hovered.current = false;
        if (biteRef.current)
            animate(biteRef.current, { scale: 0 }, opts() as any);
    };

    const {
        type: iconKind = "symbol",
        symbol: iconSymbol = "\u2192",
        image: iconImage,
        color: iconColor = "#000000",
        size: iconSize = 16,
        padding: iconPaddingProp = 0,
        rounded: iconRounded = 0,
        side: iconSide = "left",
    } = icon;
    const iconSrc =
        typeof iconImage === "string"
            ? iconImage
            : iconImage && iconImage.src
              ? iconImage.src
              : "";
    const iconMode = iconKind === "image" && iconSrc ? "image" : "symbol";
    const iconPx = Math.max(1, Math.round(iconSize));
    const iconPadPx = Math.max(0, Math.round(iconPaddingProp));
    const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded);
    const gapPx = Math.max(0, Math.round(gap));

    const iconEl = !addIcon ? null : iconMode === "image" ? (
        <img
            src={iconSrc}
            alt=""
            aria-hidden
            draggable={false}
            style={{
                width: iconPx,
                height: iconPx,
                margin: iconPadPx,
                objectFit: iconRadius > 0 ? "cover" : "contain",
                borderRadius: Math.min(iconRadius, iconPx / 2),
                display: "block",
                flex: "none",
                pointerEvents: "none",
            }}
        />
    ) : (
        <span
            aria-hidden
            style={{
                fontSize: iconPx,
                margin: iconPadPx,
                lineHeight: 1,
                color: iconColor,
                flex: "none",
                pointerEvents: "none",
            }}
        >
            {iconSymbol}
        </span>
    );

    const Wrapper: any = link ? "a" : "div";
    const wrapperProps = link
        ? {
              href: link,
              target: newTab ? "_blank" : undefined,
              rel: newTab ? "noopener noreferrer" : undefined,
          }
        : {
              role: "button",
              tabIndex: disabled ? -1 : 0,
              onClick: disabled ? undefined : onClick,
              onKeyDown: disabled
                  ? undefined
                  : (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onClick?.(e as any);
                        }
                    },
          };

    return (
        <Wrapper
            {...wrapperProps}
            ref={scope}
            onPointerEnter={onEnter}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            aria-label={ariaLabel || label}
            title={title}
            data-action={dataAction}
            data-autonomous-target={dataAutonomousTarget}
            className={className}
            style={{
                minWidth: 1,
                minHeight: 1,
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                textDecoration: "none",
                userSelect: "none",
                boxSizing: "border-box",
                overflow: "visible",
                ...style,
            }}
        >
            <svg
                aria-hidden
                width="100%"
                height="100%"
                style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "visible",
                    zIndex: 1,
                }}
            >
                <defs>
                    <filter id={filterId}>
                        <feGaussianBlur
                            in="SourceGraphic"
                            stdDeviation={GOO_STRENGTH}
                            result="blur"
                        />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                        />
                    </filter>
                    <mask id={maskId}>
                        <rect
                            x="0"
                            y="0"
                            width="100%"
                            height="100%"
                            fill="#fff"
                        />
                        <g
                            ref={followRef}
                            style={{
                                transformBox: "fill-box",
                                transformOrigin: "center",
                            }}
                        >
                            <g
                                ref={squashRef}
                                style={{
                                    transformBox: "fill-box",
                                    transformOrigin: "center",
                                }}
                            >
                                <g
                                    ref={biteRef}
                                    style={{
                                        transformBox: "fill-box",
                                        transformOrigin: "center",
                                    }}
                                >
                                    <circle
                                        cx="50%"
                                        cy="50%"
                                        r={blob / 2}
                                        fill="#000"
                                    />
                                </g>
                            </g>
                        </g>
                    </mask>
                </defs>

                <g filter={`url(#${filterId})`} opacity={blobRGB.a}>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        rx={rad}
                        ry={rad}
                        fill={opaque(blobRGB)}
                    />
                </g>

                <g filter={`url(#${filterId})`} opacity={fillRGB.a}>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        rx={rad}
                        ry={rad}
                        fill={opaque(fillRGB)}
                        mask={`url(#${maskId})`}
                    />
                </g>
            </svg>

            <span
                style={{
                    position: "relative",
                    zIndex: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    gap: iconEl && showText ? gapPx : 0,
                    flexDirection: iconSide === "right" ? "row-reverse" : "row",
                    ...fontStyles,
                    color: textColor,
                    pointerEvents: "none",
                }}
            >
                {iconEl}
                {showText && <span>{label}</span>}
            </span>
        </Wrapper>
    );
}
