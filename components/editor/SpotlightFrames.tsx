// Spotlight Frames — Originkit
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, KeyboardEvent } from "react"
import { motion, type Transition } from "framer-motion"

type ImageSource = string | { src?: string } | null | undefined

export interface SpotlightImage {
    image?: ImageSource
    offsetY?: number
}

export type ImageInput = ImageSource | SpotlightImage

export type SpotlightTrigger = "auto" | "hover" | "click"

export interface SpotlightTrack {
    collapsedWidth?: number
    expandedWidth?: number
    gap?: number
}

export interface SpotlightPanel {
    height?: number
    radius?: number
    dim?: number
}

export interface SpotlightSelector {
    box?: boolean
    lines?: boolean
    lineLength?: number
    thickness?: number
    color?: string
    reticle?: boolean
    spotlight?: boolean
}

export interface SpotlightEntrance {
    animate?: boolean
    duration?: number
    stagger?: number
}

export interface SpotlightFramesProps {
    images?: ImageInput[]
    background?: string
    panels?: number
    startIndex?: number
    selectedIndex?: number
    onSelectIndex?: (index: number) => void
    track?: SpotlightTrack
    panel?: SpotlightPanel
    selector?: SpotlightSelector
    entrance?: SpotlightEntrance
    trigger?: SpotlightTrigger
    transition?: Transition
    style?: CSSProperties
    className?: string
    renderOverlay?: (index: number, isOpen: boolean) => React.ReactNode
    enableCursorSpotlight?: boolean
    enableParallaxTilt?: boolean
}

const DEFAULT_IMAGES: SpotlightImage[] = [
    {"image":"https://images.unsplash.com/photo-1654944989879-b3ef6a3f69a3?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTE4fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1777146464379-c527ae8c92f0?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzQ1fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1600711151461-05abd927b281?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Njg5fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzEzfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1665699954779-5d391413aaff?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzIyfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1662311516094-fdb7c2c1aa34?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzMxfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1512061649570-b858b7f60d32?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NzUwfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1748485559590-06fa4035b322?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODI0fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1637028357803-78764289ffe5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODM5fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1638305607135-3e555310c69c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODQ1fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1463085154687-27abe97620ab?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODc4fHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
    {"image":"https://images.unsplash.com/photo-1609840422197-0f9a4e97e3a3?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OTkwfHxVc2VyJTIwcHJvZmlsZSUyMGltYWdlJTIwdmlicmFudHxlbnwwfDB8MHx8fDI%3D","offsetY":0},
]

const DEFAULT_BACKGROUND = "#0f0f0f"
const DEFAULT_PANELS = 16
const DEFAULT_START_INDEX = 0

const DEFAULT_TRACK: Required<SpotlightTrack> = {
    collapsedWidth: 80,
    expandedWidth: 400,
    gap: 2,
}

const DEFAULT_PANEL: Required<SpotlightPanel> = {
    height: 400,
    radius: 0,
    dim: 0,
}

const DEFAULT_SELECTOR: Required<SpotlightSelector> = {
    box: true,
    lines: true,
    lineLength: 600,
    thickness: 3,
    color: "#ffffff",
    reticle: true,
    spotlight: true,
}

const DEFAULT_ENTRANCE: Required<SpotlightEntrance> = {
    animate: true,
    duration: 0.9,
    stagger: 0.04,
}

const DEFAULT_TRIGGER: SpotlightTrigger = "auto"

const DEFAULT_TRANSITION: Transition = {
    type: "tween",
    duration: 0.6,
    ease: [0.075, 0.82, 0.165, 1],
}

const ENTRANCE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const DIM_TRANSITION = "filter 600ms cubic-bezier(0.075, 0.82, 0.165, 1)"

const DIM_FLOOR = 0.18

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function resolveSrc(item: ImageSource): string | null {
    if (!item) return null
    if (typeof item === "string") return item || null
    const src = item.src
    return typeof src === "string" && src ? src : null
}

function imageOf(item: ImageInput): string | null {
    if (!item) return null
    if (typeof item === "string") return item || null
    if (typeof item === "object") {
        if ("image" in item) return resolveSrc(item.image)
        if ("src" in item) return resolveSrc(item.src)
    }
    return null
}

function offsetOf(item: ImageInput): number {
    if (!item || typeof item === "string") return 0
    const offset = (item as SpotlightImage).offsetY
    return typeof offset === "number" ? offset : 0
}

function placeholderFill(index: number): string {
    const hue = (index * 43 + 196) % 360
    return `linear-gradient(160deg, hsl(${hue} 42% 34%), hsl(${
        (hue + 38) % 360
    } 58% 9%))`
}

interface Slot {
    left: number
    width: number
}

interface Frame {
    src: string | null
    offsetY: number
}

export default function SpotlightFrames(props: SpotlightFramesProps) {
    const {
        images = DEFAULT_IMAGES,
        background = DEFAULT_BACKGROUND,
        panels = DEFAULT_PANELS,
        startIndex = DEFAULT_START_INDEX,
        selectedIndex,
        onSelectIndex,
        track,
        panel,
        selector,
        entrance,
        trigger = DEFAULT_TRIGGER,
        transition = DEFAULT_TRANSITION,
        style,
        className,
        renderOverlay,
        enableCursorSpotlight = true,
        enableParallaxTilt = true,
    } = props

    const trackOpts = { ...DEFAULT_TRACK, ...track }
    const panelOpts = { ...DEFAULT_PANEL, ...panel }
    const selectorOpts = { ...DEFAULT_SELECTOR, ...selector }
    const entranceOpts = { ...DEFAULT_ENTRANCE, ...entrance }

    const [pointerPos, setPointerPos] = useState({
        x: 0,
        y: 0,
        normalizedX: 0.5,
        normalizedY: 0.5,
        active: false,
    })

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!frameRef.current) return
        const rect = frameRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setPointerPos({
            x,
            y,
            normalizedX: clamp(x / (rect.width || 1), 0, 1),
            normalizedY: clamp(y / (rect.height || 1), 0, 1),
            active: true,
        })
    }, [])

    const handlePointerLeave = useCallback(() => {
        setPointerPos((prev) => ({ ...prev, active: false }))
    }, [])

    const sources = useMemo<Frame[]>(() => {
        const supplied = (images ?? [])
            .map((item) => ({ src: imageOf(item), offsetY: offsetOf(item) }))
            .filter((item) => item.src !== null)
        if (supplied.length > 0) return supplied
        return Array.from({ length: Math.max(1, Math.round(panels)) }, () => ({
            src: null,
            offsetY: 0,
        }))
    }, [images, panels])

    const count = sources.length

    const frameRef = useRef<HTMLDivElement | null>(null)
    const [frame, setFrame] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const node = frameRef.current
        if (!node || typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver(([entry]) => {
            const box = entry.contentRect
            setFrame({ width: box.width, height: box.height })
        })
        observer.observe(node)
        return () => observer.disconnect()
    }, [])

    const [canHover, setCanHover] = useState(true)

    useEffect(() => {
        if (trigger !== "auto") return
        if (typeof window === "undefined" || !window.matchMedia) return
        const query = window.matchMedia("(hover: hover) and (pointer: fine)")
        const read = () => setCanHover(query.matches)
        read()
        query.addEventListener("change", read)
        return () => query.removeEventListener("change", read)
    }, [trigger])

    const opensOnHover = trigger === "hover" || (trigger === "auto" && canHover)

    const [focused, setFocused] = useState(() =>
        clamp(Math.round(selectedIndex ?? startIndex), 0, Math.max(0, count - 1))
    )

    useEffect(() => {
        if (typeof selectedIndex === "number") {
            setFocused(clamp(Math.round(selectedIndex), 0, Math.max(0, count - 1)))
        }
    }, [selectedIndex, count])

    const focusPanel = useCallback((index: number) => {
        setFocused(index)
        onSelectIndex?.(index)
    }, [onSelectIndex])

    const panelNodes = useRef<(HTMLDivElement | null)[]>([])

    const onPanelKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>, index: number) => {
            const step =
                event.key === "ArrowRight"
                    ? 1
                    : event.key === "ArrowLeft"
                      ? -1
                      : 0
            if (step === 0) return
            event.preventDefault()
            const next = clamp(index + step, 0, Math.max(0, count - 1))
            setFocused(next)
            onSelectIndex?.(next)
            panelNodes.current[next]?.focus()
        },
        [count, onSelectIndex]
    )

    const naturalWidth =
        (count - 1) * (trackOpts.collapsedWidth + trackOpts.gap) +
        trackOpts.expandedWidth

    const scale =
        frame.width > 0 && naturalWidth > frame.width
            ? frame.width / naturalWidth
            : 1

    const collapsedWidth = trackOpts.collapsedWidth * scale
    const expandedWidth = trackOpts.expandedWidth * scale
    const gap = trackOpts.gap * scale

    const panelHeight =
        frame.height > 0
            ? Math.min(panelOpts.height, frame.height)
            : panelOpts.height

    const slots = useMemo<Slot[]>(() => {
        const total = naturalWidth * scale
        const out: Slot[] = []
        let left = (frame.width - total) / 2
        for (let i = 0; i < count; i++) {
            const width = i === focused ? expandedWidth : collapsedWidth
            out.push({ left, width })
            left += width + gap
        }
        return out
    }, [
        count,
        focused,
        collapsedWidth,
        expandedWidth,
        gap,
        naturalWidth,
        scale,
        frame.width,
    ])

    const { box, lines, lineLength, thickness, color } = selectorOpts
    const marker = slots[clamp(focused, 0, Math.max(0, count - 1))]
    const showSelector = (box || lines) && marker !== undefined

    const dimAmount = clamp(panelOpts.dim, 0, 10) / 10
    const dimmedFilter =
        dimAmount > 0
            ? `brightness(${(1 - dimAmount * (1 - DIM_FLOOR)).toFixed(3)})`
            : "none"

    const measured = frame.width > 0

    return (
        <div
            ref={frameRef}
            className={className}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            {/* Dynamic Cursor Spotlight Beam */}
            {enableCursorSpotlight && selectorOpts.spotlight && pointerPos.active && (
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: 40,
                        background: `radial-gradient(220px circle at ${pointerPos.x}px ${pointerPos.y}px, rgba(127, 242, 212, 0.16), transparent 70%)`,
                        transition: "opacity 200ms ease",
                    }}
                />
            )}

            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    width: "100%",
                    height: panelHeight,
                    transform: "translateY(-50%)",
                }}
            >
                {measured &&
                    sources.map(({ src, offsetY }, index) => {
                        const slot = slots[index]
                        const isOpen = index === focused
                        const parallaxOffset = enableParallaxTilt && isOpen && pointerPos.active
                            ? {
                                x: (pointerPos.normalizedX - 0.5) * 14,
                                y: (pointerPos.normalizedY - 0.5) * 8,
                            }
                            : { x: 0, y: 0 }

                        return (
                            <motion.div
                                key={index}
                                ref={(node: HTMLDivElement | null) => {
                                    panelNodes.current[index] = node
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Frame ${index + 1} of ${count}`}
                                aria-pressed={isOpen}
                                initial={false}
                                animate={{ left: slot.left, width: slot.width }}
                                transition={transition}
                                onFocus={() => focusPanel(index)}
                                onKeyDown={(event) =>
                                    onPanelKeyDown(event, index)
                                }
                                onPointerEnter={
                                    opensOnHover
                                        ? () => focusPanel(index)
                                        : undefined
                                }
                                onClick={() => focusPanel(index)}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    height: "100%",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    borderRadius: panelOpts.radius,
                                    outlineOffset: 2,
                                    willChange: "left, width",
                                }}
                            >
                                <motion.div
                                    initial={
                                        entranceOpts.animate
                                            ? { opacity: 0, y: 28 }
                                            : false
                                    }
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: entranceOpts.duration,
                                        delay: index * entranceOpts.stagger,
                                        ease: ENTRANCE_EASE,
                                    }}
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        filter: isOpen ? "none" : dimmedFilter,
                                        transition: DIM_TRANSITION,
                                    }}
                                >
                                    {src ? (
                                        <img
                                            src={src}
                                            alt=""
                                            draggable={false}
                                            style={{
                                                position: "absolute",
                                                left: "50%",
                                                top: 0,
                                                transform: `translateX(calc(-50% + ${parallaxOffset.x}px)) translateY(${parallaxOffset.y}px)`,
                                                transition: "transform 140ms ease-out",
                                                width: expandedWidth,
                                                height: "100%",
                                                objectFit: "cover",
                                                objectPosition: `50% calc(50% + ${
                                                    offsetY * scale
                                                }px)`,
                                                pointerEvents: "none",
                                                userSelect: "none",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                position: "absolute",
                                                left: "50%",
                                                top: 0,
                                                transform: "translateX(-50%)",
                                                width: expandedWidth,
                                                height: "100%",
                                                background:
                                                    placeholderFill(index),
                                            }}
                                        />
                                    )}
                                    {renderOverlay?.(index, isOpen)}
                                </motion.div>
                            </motion.div>
                        )
                    })}

                {measured && showSelector && (
                    <motion.div
                        aria-hidden
                        initial={false}
                        animate={{ left: marker.left, width: marker.width }}
                        transition={transition}
                        style={{
                            position: "absolute",
                            top: 0,
                            height: "100%",
                            border: box
                                ? `${thickness}px solid ${color}`
                                : "none",
                            borderRadius: panelOpts.radius,
                            pointerEvents: "none",
                            zIndex: 100,
                            willChange: "left, width",
                            boxShadow: box ? `0 0 16px ${color}33, inset 0 0 12px ${color}22` : "none",
                        }}
                    >
                        {/* Optical Corner Reticle Brackets */}
                        {selectorOpts.reticle && (
                            <>
                                <div
                                    style={{
                                        position: "absolute",
                                        top: -3,
                                        left: -3,
                                        width: 10,
                                        height: 10,
                                        borderTop: `2px solid ${color}`,
                                        borderLeft: `2px solid ${color}`,
                                        borderTopLeftRadius: 3,
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        top: -3,
                                        right: -3,
                                        width: 10,
                                        height: 10,
                                        borderTop: `2px solid ${color}`,
                                        borderRight: `2px solid ${color}`,
                                        borderTopRightRadius: 3,
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        bottom: -3,
                                        left: -3,
                                        width: 10,
                                        height: 10,
                                        borderBottom: `2px solid ${color}`,
                                        borderLeft: `2px solid ${color}`,
                                        borderBottomLeftRadius: 3,
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        bottom: -3,
                                        right: -3,
                                        width: 10,
                                        height: 10,
                                        borderBottom: `2px solid ${color}`,
                                        borderRight: `2px solid ${color}`,
                                        borderBottomRightRadius: 3,
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        width: 14,
                                        height: 14,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        opacity: 0.75,
                                    }}
                                >
                                    <div style={{ width: 1, height: "100%", background: color }} />
                                    <div style={{ position: "absolute", width: "100%", height: 1, background: color }} />
                                </div>
                            </>
                        )}

                        {lines && (
                            <>
                                <div
                                    style={{
                                        position: "absolute",
                                        left: "50%",
                                        bottom: "100%",
                                        transform: "translateX(-50%)",
                                        width: thickness,
                                        height: lineLength,
                                        background: `linear-gradient(to top, ${color}, transparent)`,
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        left: "50%",
                                        top: "100%",
                                        transform: "translateX(-50%)",
                                        width: thickness,
                                        height: lineLength,
                                        background: `linear-gradient(to bottom, ${color}, transparent)`,
                                    }}
                                />
                            </>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
