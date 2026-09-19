// Pixel Reveal — Originkit
"use client"

import * as React from "react"
import { useEffect, useLayoutEffect, useRef } from "react"

const useIsStaticRenderer = () => false

type Direction = "up" | "down" | "left" | "right"

export interface PixelRevealProps {
    imageSrc?: string
    gridSize?: number
    transitionColor?: string
    edgeHeight?: number
    transition?: {
        type?: "tween" | "spring"
        duration?: number
        ease?: string | number[]
        [key: string]: unknown
    }
    direction?: Direction
    delay?: number
    staggerDelay?: number
    autoTrigger?: boolean
    onRevealComplete?: () => void
    style?: React.CSSProperties
    className?: string
    alt?: string
    objectFit?: "cover" | "contain"
}

export type PixelRevealTransition = {
    type?: "tween" | "spring"
    duration?: number
    ease?: string | number[]
    [key: string]: unknown
}

const COMPONENT_DEFAULTS: {
    imageSrc: string
    gridSize: number
    transitionColor: string
    edgeHeight: number
    transition: PixelRevealTransition
    direction: Direction
    delay: number
    autoTrigger: boolean
} = {
    imageSrc:
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/aeaa0756-9647-4f6c-d900-204bd25e4a00/w=800",
    gridSize: 15,
    transitionColor: "#09090b",
    edgeHeight: 10,
    transition: { type: "tween", duration: 1.2, ease: "easeInOut" },
    direction: "up",
    delay: 0,
    autoTrigger: true,
}

export default function PixelReveal(props: PixelRevealProps) {
    const mergedProps = { ...COMPONENT_DEFAULTS, ...props }
    const {
        imageSrc,
        gridSize,
        transitionColor,
        edgeHeight,
        transition,
        direction,
        delay,
        staggerDelay,
        autoTrigger,
        onRevealComplete,
        style,
        className,
        alt = "",
        objectFit = "cover",
    } = mergedProps

    const effectiveDelay = Math.max(0, staggerDelay ?? delay ?? 0)
    const isStatic = useIsStaticRenderer()

    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

    const progressRef = useRef(0)
    const linearProgressRef = useRef(0)
    const startTimeRef = useRef<number | null>(null)
    const rafRef = useRef<number | null>(null)
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const runningRef = useRef(false)
    const completedRef = useRef(false)
    const triggeredOnceRef = useRef(false)

    const gridRef = useRef<{
        cols: number
        rows: number
        cellW: number
        cellH: number
        cssW: number
        cssH: number
        thresholds: Float32Array
    } | null>(null)

    const propsRef = useRef({
        gridSize,
        edgeHeight,
        direction,
        transition,
        transitionColor,
        effectiveDelay,
        onRevealComplete,
    })

    useEffect(() => {
        propsRef.current = {
            gridSize,
            edgeHeight,
            direction,
            transition,
            transitionColor,
            effectiveDelay,
            onRevealComplete,
        }
    }, [
        gridSize,
        edgeHeight,
        direction,
        transition,
        transitionColor,
        effectiveDelay,
        onRevealComplete,
    ])

    const cubicBezier = (
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): ((t: number) => number) => {
        const cx = 3 * x1
        const bx = 3 * (x2 - x1) - cx
        const ax = 1 - cx - bx

        const cy = 3 * y1
        const by = 3 * (y2 - y1) - cy
        const ay = 1 - cy - by

        const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
        const sampleY = (t: number) => ((ay * t + by) * t + cy) * t

        return (x: number): number => {
            if (x <= 0) return 0
            if (x >= 1) return 1

            let lo = 0,
                hi = 1,
                t = x
            for (let i = 0; i < 12; i++) {
                const mid = (lo + hi) / 2
                const sx = sampleX(mid)
                if (Math.abs(sx - x) < 1e-6) {
                    t = mid
                    break
                }
                if (sx < x) lo = mid
                else hi = mid
                t = mid
            }
            return sampleY(t)
        }
    }

    const resolveEasingFn = (
        trans: PixelRevealProps["transition"]
    ): ((t: number) => number) => {
        const linear = (t: number) => t

        if (!trans || trans.type === "spring") return linear

        const ease = (trans as { ease?: unknown }).ease

        if (
            Array.isArray(ease) &&
            ease.length === 4 &&
            ease.every((v) => typeof v === "number")
        ) {
            const [x1, y1, x2, y2] = ease as [number, number, number, number]
            return cubicBezier(x1, y1, x2, y2)
        }

        if (typeof ease === "string") {
            switch (ease) {
                case "easeIn":
                case "circIn":
                    return (t) => t * t
                case "easeOut":
                case "circOut":
                    return (t) => 1 - (1 - t) * (1 - t)
                case "easeInOut":
                case "circInOut":
                    return (t) =>
                        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
                case "linear":
                default:
                    return linear
            }
        }

        return linear
    }

    const resolveDuration = (trans: PixelRevealProps["transition"]): number => {
        if (!trans) return 1
        if (trans.type === "spring") return 1
        const d = (trans as { duration?: unknown }).duration
        if (typeof d === "number" && d > 0) return d
        return 1
    }

    const rebuildGrid = (entry?: ResizeObserverEntry) => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const cr = entry?.contentRect
        const rectW =
            cr?.width ||
            container.clientWidth ||
            container.getBoundingClientRect().width
        const rectH =
            cr?.height ||
            container.clientHeight ||
            container.getBoundingClientRect().height
        const cssW = Math.max(1, Math.floor(rectW) || 600)
        const cssH = Math.max(1, Math.floor(rectH) || 400)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        canvas.width = Math.floor(cssW * dpr)
        canvas.height = Math.floor(cssH * dpr)
        canvas.style.width = `${cssW}px`
        canvas.style.height = `${cssH}px`
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctxRef.current = ctx

        const gs = Math.max(1, propsRef.current.gridSize)
        const cols = Math.max(1, Math.ceil(cssW / gs))
        const rows = Math.max(1, Math.ceil(cssH / gs))

        const cellW = cssW / cols
        const cellH = cssH / rows

        const eh = Math.max(0, Math.min(1, propsRef.current.edgeHeight / 100))
        const dir = propsRef.current.direction
        const thresholds = new Float32Array(cols * rows)

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let base: number
                if (dir === "up") {
                    base = rows === 1 ? 0 : 1 - r / (rows - 1)
                } else if (dir === "down") {
                    base = rows === 1 ? 0 : r / (rows - 1)
                } else if (dir === "left") {
                    base = cols === 1 ? 0 : 1 - c / (cols - 1)
                } else {
                    base = cols === 1 ? 0 : c / (cols - 1)
                }

                const threshold = base * (1 - eh) + Math.random() * eh
                thresholds[r * cols + c] = threshold
            }
        }

        gridRef.current = { cols, rows, cellW, cellH, cssW, cssH, thresholds }
    }

    const draw = () => {
        const ctx = ctxRef.current
        const grid = gridRef.current
        if (!ctx || !grid) return

        const { cols, rows, cellW, cellH, cssW, cssH, thresholds } = grid
        ctx.clearRect(0, 0, cssW, cssH)
        ctx.fillStyle = propsRef.current.transitionColor

        const p = progressRef.current

        const padW = cellW + 1
        const padH = cellH + 1

        for (let r = 0; r < rows; r++) {
            const yBase = r * cellH
            const rowOff = r * cols
            for (let c = 0; c < cols; c++) {
                if (thresholds[rowOff + c] > p) {
                    ctx.fillRect(c * cellW, yBase, padW, padH)
                }
            }
        }
    }

    const stopRaf = () => {
        if (delayTimerRef.current != null) {
            clearTimeout(delayTimerRef.current)
            delayTimerRef.current = null
        }
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
        runningRef.current = false
    }

    const loop = (now: number) => {
        if (!runningRef.current) return
        const dur = Math.max(
            0.0001,
            resolveDuration(propsRef.current.transition)
        )
        const easeFn = resolveEasingFn(propsRef.current.transition)
        if (startTimeRef.current == null) {
            startTimeRef.current = now
        }
        const elapsed = (now - startTimeRef.current) / 1000
        const linear = Math.max(0, Math.min(1, elapsed / dur))
        linearProgressRef.current = linear
        progressRef.current = easeFn(linear)
        draw()

        if (linear >= 1) {
            stopRaf()
            if (!completedRef.current) {
                completedRef.current = true
                propsRef.current.onRevealComplete?.()
            }
            return
        }
        rafRef.current = requestAnimationFrame(loop)
    }

    const startRaf = () => {
        if (runningRef.current) return
        if (isStatic) {
            progressRef.current = 1
            linearProgressRef.current = 1
            draw()
            return
        }
        runningRef.current = true

        const dur = Math.max(
            0.0001,
            resolveDuration(propsRef.current.transition)
        )
        const offsetMs = linearProgressRef.current * dur * 1000
        startTimeRef.current = performance.now() - offsetMs
        rafRef.current = requestAnimationFrame(loop)
    }

    const triggerFn = () => {
        completedRef.current = false
        stopRaf()
        progressRef.current = 0
        linearProgressRef.current = 0
        startTimeRef.current = null
        draw()

        const currentDelay = propsRef.current.effectiveDelay
        if (currentDelay > 0) {
            delayTimerRef.current = setTimeout(() => {
                startRaf()
            }, currentDelay * 1000)
        } else {
            startRaf()
        }
    }

    useLayoutEffect(() => {
        if (isStatic) {
            progressRef.current = 1
            linearProgressRef.current = 1
        }
        rebuildGrid()
        draw()
        const container = containerRef.current
        if (!container) return
        const ro = new ResizeObserver((entries) => {
            rebuildGrid(entries[0])
            draw()
        })
        ro.observe(container)
        return () => ro.disconnect()
    }, [])

    useLayoutEffect(() => {
        rebuildGrid()
        draw()
    }, [gridSize, edgeHeight, direction])

    useEffect(() => {
        draw()
    }, [transitionColor])

    useEffect(() => {
        if (isStatic) return
        if (!autoTrigger) return
        const container = containerRef.current
        if (!container) return

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        if (triggeredOnceRef.current) continue
                        triggeredOnceRef.current = true
                        triggerFn()
                    }
                }
            },
            { threshold: 0 }
        )
        io.observe(container)
        return () => io.disconnect()
    }, [isStatic, autoTrigger])

    useEffect(() => {
        if (imageSrc && triggeredOnceRef.current) {
            triggerFn()
        }
    }, [imageSrc])

    useEffect(() => {
        return () => {
            stopRaf()
        }
    }, [])

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                ...style,
            }}
        >
            {imageSrc ? (
                <img
                    src={imageSrc}
                    alt={alt}
                    draggable={false}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit,
                        display: "block",
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                />
            ) : null}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}
