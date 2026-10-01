// Sphere Gallery 3D — Originkit

"use client"

import * as React from "react"

export interface GalleryItem {
    image?: string
    link?: string
}

export interface CoreGroup {
    coreColor?: string

    coreSize?: number

    lineColor?: string
}

export type SpinDirection = "clockwise" | "counterclockwise"

export interface SphereGallery3DProps {
    images?: GalleryItem[]

    branches?: number
    background?: string

    scale?: number

    size?: number

    scatter?: number

    speed?: number

    direction?: SpinDirection

    hover?: number

    rounded?: number
    core?: CoreGroup
    className?: string
    style?: React.CSSProperties
}

const DUMMY_PAIRS: ReadonlyArray<[string, string]> = [
    ["FF7A45", "FFB199"],
    ["4D7CFE", "9BC1FF"],
    ["16C79A", "9BE7C4"],
    ["FFC53D", "FFE9A8"],
    ["B15CFF", "E0B8FF"],
    ["FF4D7E", "FFB3C7"],
]
const dummyImage = (i: number, w = 1200, h = 800) => {
    const [a, b] = DUMMY_PAIRS[i % DUMMY_PAIRS.length]
    const n = String(i + 1).padStart(2, "0")
    return (
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E` +
        `%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E` +
        `%3Cstop offset='0' stop-color='%23${a}'/%3E%3Cstop offset='1' stop-color='%23${b}'/%3E` +
        `%3C/linearGradient%3E%3C/defs%3E%3Crect width='${w}' height='${h}' fill='url(%23g)'/%3E` +
        `%3Ctext x='50%25' y='50%25' dy='.35em' text-anchor='middle' ` +
        `font-family='Inter, Helvetica, Arial, sans-serif' font-size='${Math.round(Math.min(w, h) * 0.34)}' ` +
        `font-weight='700' fill='rgba(255,255,255,0.9)'%3E${n}%3C/text%3E%3C/svg%3E`
    )

        .replace(/ /g, "%20")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
}

const DEFAULT_ITEMS: GalleryItem[] = Array.from({ length: 12 }, (_, i) => ({
    image: dummyImage(i, 800, 600),
    link: "",
}))

const QUAD_VERT =  `
precision highp float;
attribute vec2 aCorner;
uniform mat4 uMVP;
varying vec2 vUv;
void main() {
    vUv = aCorner + 0.5;
    gl_Position = uMVP * vec4(aCorner, 0.0, 1.0);
}
`

const QUAD_FRAG =  `
precision highp float;

varying vec2 vUv;

uniform sampler2D uMap;
uniform float uHasTex;
uniform vec2  uHalf;
uniform float uRadius;
uniform float uAA;
uniform float uOpacity;
uniform float uDim;
uniform vec3  uPlaceholder;

float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
    vec2 p = (vUv - 0.5) * 2.0 * uHalf;

    float sHalf = min(uHalf.x, uHalf.y);
    float t = sHalf > 0.0 ? clamp(uRadius / sHalf, 0.0, 1.0) : 0.0;
    vec2 box = mix(uHalf, vec2(sHalf), t);
    float d = sdRoundBox(p, box, uRadius);
    float aa = max(uAA, 1e-5);
    float mask = 1.0 - smoothstep(-aa, aa, d);
    if (mask <= 0.002) discard;

    vec3 col = mix(uPlaceholder, texture2D(uMap, vUv).rgb, uHasTex);
    col *= uDim;

    float a = mask * uOpacity;
    if (a <= 0.002) discard;

    gl_FragColor = vec4(col * a, a);
}
`

const SOLID_VERT =  `
precision highp float;
attribute vec3 aPos;
uniform mat4 uMVP;
uniform float uScale;
void main() {
    gl_Position = uMVP * vec4(aPos * uScale, 1.0);
}
`

const SOLID_FRAG =  `
precision mediump float;
uniform vec4 uColor;
void main() {
    gl_FragColor = vec4(uColor.rgb * uColor.a, uColor.a);
}
`

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const BASE_SPIN = 0.22
const SPRING_STIFFNESS = 70
const HOVER_POP = 0.3

const BILLBOARD_BLEND = 0.75

const RADIUS = 12
const DAMPING = 0.6
const FOV = 45
const MIN_DIST = 18
const MAX_DIST = 70
const REST_DIST_MUL = 2.8
const DEFAULT_BRANCHES = 12
const MAX_BRANCHES = 60
const ZOOM_GAIN = 1
const ORBIT_SPEED = 0.25
const ORBIT_DAMPING = 0.6
const ORBIT_LIMIT = 70
const DEPTH_FLOOR = 0.32
const ZOOM_RATE = 9
const CLICK_SLOP_PX = 5
const CLICK_MS = 450
const PLACEHOLDER = "#1b1b20"
const SPHERE_W = 32
const SPHERE_H = 24
const NEAR = 0.1
const FAR = 2000

function hash01(i: number): number {
    const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453
    return s - Math.floor(s)
}

const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v

function parseColor(input: string | undefined, fallback: number[]): number[] {
    if (!input) return fallback.slice()
    const s = String(input).trim()

    const m = s.match(/^rgba?\(([^)]+)\)$/i)
    if (m) {
        const parts = m[1].split(/[,\s/]+/).filter(Boolean)
        const ch = (t: string) =>
            t.indexOf("%") >= 0 ? parseFloat(t) / 100 : parseFloat(t) / 255
        const r = ch(parts[0] ?? "0")
        const g = ch(parts[1] ?? "0")
        const b = ch(parts[2] ?? "0")
        const a = parts[3] === undefined ? 1 : parseFloat(parts[3])
        if ([r, g, b, a].some((v) => !isFinite(v))) return fallback.slice()
        return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1), clamp(a, 0, 1)]
    }

    let h = s.replace(/^#/, "")
    if (h.length === 3 || h.length === 4) {
        h = h
            .split("")
            .map((c) => c + c)
            .join("")
    }
    if (h.length !== 6 && h.length !== 8) return fallback.slice()
    const n = parseInt(h, 16)
    if (!isFinite(n)) return fallback.slice()
    if (h.length === 6) {
        return [
            ((n >> 16) & 255) / 255,
            ((n >> 8) & 255) / 255,
            (n & 255) / 255,
            1,
        ]
    }
    return [
        ((n >>> 24) & 255) / 255,
        ((n >>> 16) & 255) / 255,
        ((n >>> 8) & 255) / 255,
        (n & 255) / 255,
    ]
}

type M4 = Float32Array

function mat4(): M4 {
    const m = new Float32Array(16)
    m[0] = m[5] = m[10] = m[15] = 1
    return m
}

function perspective(out: M4, fovyRad: number, aspect: number): M4 {
    const f = 1 / Math.tan(fovyRad / 2)
    out.fill(0)
    out[0] = f / aspect
    out[5] = f
    out[10] = (FAR + NEAR) / (NEAR - FAR)
    out[11] = -1
    out[14] = (2 * FAR * NEAR) / (NEAR - FAR)
    return out
}

function mul(out: M4, a: M4, b: M4): M4 {
    for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4],
            b1 = b[c * 4 + 1],
            b2 = b[c * 4 + 2],
            b3 = b[c * 4 + 3]
        out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3
        out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3
        out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3
        out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3
    }
    return out
}

function rigView(out: M4, yaw: number, pitch: number, camZ: number): M4 {
    const a = Math.cos(pitch),
        b = Math.sin(pitch)
    const c = Math.cos(yaw),
        d = Math.sin(yaw)
    out[0] = c
    out[1] = 0
    out[2] = -d
    out[3] = 0
    out[4] = d * b
    out[5] = a
    out[6] = c * b
    out[7] = 0
    out[8] = a * d
    out[9] = -b
    out[10] = a * c
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = -camZ
    out[15] = 1
    return out
}

function rigBasis(yaw: number, pitch: number): number[] {
    const a = Math.cos(pitch),
        b = Math.sin(pitch)
    const c = Math.cos(yaw),
        d = Math.sin(yaw)

    return [c, d * b, a * d, 0, a, -b, -d, c * b, a * c]
}

function applyBasis(R: number[], x: number, y: number, z: number, out: number[]) {
    out[0] = R[0] * x + R[1] * y + R[2] * z
    out[1] = R[3] * x + R[4] * y + R[5] * z
    out[2] = R[6] * x + R[7] * y + R[8] * z
}

function applyBasisT(R: number[], x: number, y: number, z: number, out: number[]) {
    out[0] = R[0] * x + R[3] * y + R[6] * z
    out[1] = R[1] * x + R[4] * y + R[7] * z
    out[2] = R[2] * x + R[5] * y + R[8] * z
}

type Quat = [number, number, number, number]

function quatFromYawPitch(yaw: number, pitch: number, out: Quat): Quat {
    const cy = Math.cos(yaw / 2),
        sy = Math.sin(yaw / 2)
    const cx = Math.cos(pitch / 2),
        sx = Math.sin(pitch / 2)
    out[0] = cy * sx
    out[1] = sy * cx
    out[2] = -sy * sx
    out[3] = cy * cx
    return out
}

function quatFromZTo(dx: number, dy: number, dz: number, out: Quat): Quat {
    let r = dz + 1
    let x: number, y: number, z: number, w: number
    if (r < 1e-6) {
        x = 0
        y = -1
        z = 0
        w = 0
    } else {
        x = -dy
        y = dx
        z = 0
        w = r
    }
    const len = Math.hypot(x, y, z, w) || 1
    out[0] = x / len
    out[1] = y / len
    out[2] = z / len
    out[3] = w / len
    return out
}

function quatSlerp(a: Quat, b: Quat, t: number, out: Quat): Quat {
    if (t <= 0) {
        out[0] = a[0]
        out[1] = a[1]
        out[2] = a[2]
        out[3] = a[3]
        return out
    }
    if (t >= 1) {
        out[0] = b[0]
        out[1] = b[1]
        out[2] = b[2]
        out[3] = b[3]
        return out
    }

    const ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3]
    let bx = b[0],
        by = b[1],
        bz = b[2],
        bw = b[3]

    let cosHalf = aw * bw + ax * bx + ay * by + az * bz
    if (cosHalf < 0) {
        cosHalf = -cosHalf
        bx = -bx
        by = -by
        bz = -bz
        bw = -bw
    }

    if (cosHalf >= 1) {
        out[0] = ax
        out[1] = ay
        out[2] = az
        out[3] = aw
        return out
    }

    const sqrSin = 1 - cosHalf * cosHalf
    if (sqrSin <= Number.EPSILON) {
        const s = 1 - t
        out[0] = s * ax + t * bx
        out[1] = s * ay + t * by
        out[2] = s * az + t * bz
        out[3] = s * aw + t * bw
        const len =
            Math.hypot(out[0], out[1], out[2], out[3]) || 1
        out[0] /= len
        out[1] /= len
        out[2] /= len
        out[3] /= len
        return out
    }

    const sinHalf = Math.sqrt(sqrSin)
    const half = Math.atan2(sinHalf, cosHalf)
    const ra = Math.sin((1 - t) * half) / sinHalf
    const rb = Math.sin(t * half) / sinHalf
    out[0] = ax * ra + bx * rb
    out[1] = ay * ra + by * rb
    out[2] = az * ra + bz * rb
    out[3] = aw * ra + bw * rb
    return out
}

function compose(
    out: M4,
    px: number,
    py: number,
    pz: number,
    q: Quat,
    sx: number,
    sy: number,
    sz: number
): M4 {
    const x = q[0],
        y = q[1],
        z = q[2],
        w = q[3]
    const x2 = x + x,
        y2 = y + y,
        z2 = z + z
    const xx = x * x2,
        xy = x * y2,
        xz = x * z2
    const yy = y * y2,
        yz = y * z2,
        zz = z * z2
    const wx = w * x2,
        wy = w * y2,
        wz = w * z2

    out[0] = (1 - (yy + zz)) * sx
    out[1] = (xy + wz) * sx
    out[2] = (xz - wy) * sx
    out[3] = 0
    out[4] = (xy - wz) * sy
    out[5] = (1 - (xx + zz)) * sy
    out[6] = (yz + wx) * sy
    out[7] = 0
    out[8] = (xz + wy) * sz
    out[9] = (yz - wx) * sz
    out[10] = (1 - (xx + yy)) * sz
    out[11] = 0
    out[12] = px
    out[13] = py
    out[14] = pz
    out[15] = 1
    return out
}

function quatAxes(q: Quat, right: number[], up: number[], normal: number[]) {
    const x = q[0],
        y = q[1],
        z = q[2],
        w = q[3]
    const x2 = x + x,
        y2 = y + y,
        z2 = z + z
    const xx = x * x2,
        xy = x * y2,
        xz = x * z2
    const yy = y * y2,
        yz = y * z2,
        zz = z * z2
    const wx = w * x2,
        wy = w * y2,
        wz = w * z2
    right[0] = 1 - (yy + zz)
    right[1] = xy + wz
    right[2] = xz - wy
    up[0] = xy - wz
    up[1] = 1 - (xx + zz)
    up[2] = yz + wx
    normal[0] = xz + wy
    normal[1] = yz - wx
    normal[2] = 1 - (xx + yy)
}

function buildSphere(widthSeg: number, heightSeg: number) {
    const pos: number[] = []
    const grid: number[][] = []
    let index = 0

    for (let iy = 0; iy <= heightSeg; iy++) {
        const row: number[] = []
        const v = iy / heightSeg
        const theta = v * Math.PI
        for (let ix = 0; ix <= widthSeg; ix++) {
            const u = ix / widthSeg
            const phi = u * Math.PI * 2
            pos.push(
                -Math.cos(phi) * Math.sin(theta),
                Math.cos(theta),
                Math.sin(phi) * Math.sin(theta)
            )
            row.push(index++)
        }
        grid.push(row)
    }

    const tris: number[] = []
    for (let iy = 0; iy < heightSeg; iy++) {
        for (let ix = 0; ix < widthSeg; ix++) {
            const a = grid[iy][ix + 1]
            const b = grid[iy][ix]
            const c = grid[iy + 1][ix]
            const d = grid[iy + 1][ix + 1]
            if (iy !== 0) tris.push(a, b, d)
            if (iy !== heightSeg - 1) tris.push(b, c, d)
        }
    }

    const edges: number[] = []
    for (let i = 0; i < tris.length; i += 3) {
        const a = tris[i], b = tris[i + 1], c = tris[i + 2]
        edges.push(a, b, b, c, c, a)
    }

    return {
        positions: new Float32Array(pos),
        tris: new Uint16Array(tris),
        edges: new Uint16Array(edges),
    }
}

interface Loaded {
    image: HTMLImageElement | null
    aspect: number
    texture: WebGLTexture | null

    applied: boolean
}

interface NodeRT {
    ox: number
    oy: number
    oz: number
    vx: number
    vy: number
    vz: number

    px: number
    py: number
    pz: number
    q: Quat
    hx: number
    hy: number
}

interface Live {
    count: number
    radius: number
    depthRand: number
    itemSize: number
    coreColor: string
    coreSize: number
    coreGlow: number
    lineColor: string
    lineOpacity: number

    rounded: number

    spin: number
    force: number
    hoverDist: number

    scale: number
    minZoom: number
    maxZoom: number
    zoomGain: number
    orbitSpeed: number
    orbitDamping: number
    orbitLimit: number
}

function makeNode(): NodeRT {
    return {
        ox: 0,
        oy: 0,
        oz: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        px: 0,
        py: 0,
        pz: 0,
        q: [0, 0, 0, 1],
        hx: 0,
        hy: 0,
    }
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("[SphereGallery3D] shader", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function link(
    gl: WebGLRenderingContext,
    vertSrc: string,
    fragSrc: string
): WebGLProgram | null {
    const v = compile(gl, gl.VERTEX_SHADER, vertSrc)
    const f = compile(gl, gl.FRAGMENT_SHADER, fragSrc)
    if (!v || !f) return null
    const p = gl.createProgram()
    if (!p) return null
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("[SphereGallery3D] link", gl.getProgramInfoLog(p))
        gl.deleteProgram(p)
        return null
    }
    return p
}

export default function SphereGallery3D(props: SphereGallery3DProps) {
    const {
        images = DEFAULT_ITEMS,
        branches: branchesProp = 34,
        background = "#000000",
        scale = 60,
        size = 28,
        scatter = 0,
        speed = 18,
        direction = "counterclockwise",
        hover = 200,
        rounded = 18,

        core = { coreSize: 24, coreColor: "#FFFFFF59", lineColor: "#FFFFFF59" },
        className,
        style,
    } = props

    const itemsProp = images
    const items = itemsProp && itemsProp.length ? itemsProp : DEFAULT_ITEMS
    const branches = clamp(Math.round(branchesProp), 1, MAX_BRANCHES)

    const hostRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)

    const radius = RADIUS
    const coreColor = core.coreColor ?? "#7ab8ffff"
    const lineColor = core.lineColor ?? "#4a6a9959"

    const coreAlpha = parseColor(coreColor, [0.48, 0.72, 1, 1])[3]
    const lineAlpha = parseColor(lineColor, [0.29, 0.42, 0.6, 0.35])[3]

    const spinSign = direction === "clockwise" ? -1 : 1

    const live = React.useRef<Live>({} as Live)
    live.current = {
        count: branches,
        radius,
        depthRand: clamp(scatter / 100, 0, 1),
        itemSize: radius * clamp(size / 100, 0.01, 2),
        coreColor,
        coreSize: radius * clamp((core.coreSize ?? 16) / 100, 0, 1),
        coreGlow: coreAlpha,
        lineColor,
        lineOpacity: lineAlpha,
        rounded: clamp(rounded / 100, 0, 1),

        spin: (BASE_SPIN * speed * spinSign) / 50,

        force: clamp(hover / 100, 0, 3),
        hoverDist: radius * clamp((hover / 100) * 0.35, 0, 3),

        scale: clamp(scale / 100, 0.2, 4),
        minZoom: MIN_DIST,
        maxZoom: MAX_DIST,
        zoomGain: ZOOM_GAIN,
        orbitSpeed: ORBIT_SPEED,
        orbitDamping: ORBIT_DAMPING,
        orbitLimit: ORBIT_LIMIT,
    }

    const linksRef = React.useRef<string[]>([])

    linksRef.current = Array.from(
        { length: branches },
        (_, i) => items[i % items.length]?.link || ""
    )

    const mediaRef = React.useRef<Loaded[]>([])
    const graveyardRef = React.useRef<WebGLTexture[]>([])
    const mediaImages = React.useMemo(
        () => items.map((item) => item?.image || ""),
        [items]
    )

    React.useEffect(() => {
        let alive = true
        const graveyard = graveyardRef.current
        const loaded: Loaded[] = mediaImages.map(() => ({
            image: null,
            aspect: 1,
            texture: null,
            applied: false,
        }))
        mediaRef.current = loaded

        mediaImages.forEach((url, i) => {
            if (!url) return
            const img = new Image()

            img.crossOrigin = "anonymous"
            img.onload = () => {
                if (!alive) return
                loaded[i].image = img
                loaded[i].aspect =
                    (img.naturalWidth || 1) / Math.max(1, img.naturalHeight || 1)
            }
            img.onerror = () => {
            }
            img.src = url
        })

        return () => {
            alive = false

            loaded.forEach((l) => {
                if (l.texture) graveyard.push(l.texture)
                l.texture = null
            })
        }

    }, [mediaImages])

    React.useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return
        const graveyard = graveyardRef.current

        const attrs: WebGLContextAttributes = {
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            depth: true,
            powerPreference: "high-performance",
        }
        const gl = (canvas.getContext("webgl2", attrs) ||
            canvas.getContext("webgl", attrs) ||
            canvas.getContext(
                "experimental-webgl",
                attrs
            )) as WebGLRenderingContext | null

        if (!gl) {
            console.error("[SphereGallery3D] WebGL unavailable")
            return
        }

        const isGL2 =
            typeof WebGL2RenderingContext !== "undefined" &&
            gl instanceof WebGL2RenderingContext
        const aniso =
            gl.getExtension("EXT_texture_filter_anisotropic") ||
            gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic")

        const quadProg = link(gl, QUAD_VERT, QUAD_FRAG)
        const solidProg = link(gl, SOLID_VERT, SOLID_FRAG)
        if (!quadProg || !solidProg) return

        const qLoc = {
            aCorner: gl.getAttribLocation(quadProg, "aCorner"),
            uMVP: gl.getUniformLocation(quadProg, "uMVP"),
            uMap: gl.getUniformLocation(quadProg, "uMap"),
            uHasTex: gl.getUniformLocation(quadProg, "uHasTex"),
            uHalf: gl.getUniformLocation(quadProg, "uHalf"),
            uRadius: gl.getUniformLocation(quadProg, "uRadius"),
            uAA: gl.getUniformLocation(quadProg, "uAA"),
            uOpacity: gl.getUniformLocation(quadProg, "uOpacity"),
            uDim: gl.getUniformLocation(quadProg, "uDim"),
            uPlaceholder: gl.getUniformLocation(quadProg, "uPlaceholder"),
        }
        const sLoc = {
            aPos: gl.getAttribLocation(solidProg, "aPos"),
            uMVP: gl.getUniformLocation(solidProg, "uMVP"),
            uScale: gl.getUniformLocation(solidProg, "uScale"),
            uColor: gl.getUniformLocation(solidProg, "uColor"),
        }

        const missing = [
            ...Object.entries(qLoc),
            ...Object.entries(sLoc),
        ].filter(([, v]) => v === null || v === -1)
        if (missing.length) {
            console.error(
                "[SphereGallery3D] unresolved GL locations:",
                missing.map(([k]) => k).join(", ")
            )
        }

        const quadBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
        gl.bufferData(
            gl.ARRAY_BUFFER,

            new Float32Array([
                -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
                0.5,
            ]),
            gl.STATIC_DRAW
        )

        const ball = buildSphere(SPHERE_W, SPHERE_H)
        const ballBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf)
        gl.bufferData(gl.ARRAY_BUFFER, ball.positions, gl.STATIC_DRAW)
        const ballTri = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballTri)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ball.tris, gl.STATIC_DRAW)
        const ballEdge = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballEdge)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ball.edges, gl.STATIC_DRAW)

        const lineBuf = gl.createBuffer()
        let lineData = new Float32Array(0)
        const ensureLines = (n: number) => {
            if (lineData.length === n * 6) return
            lineData = new Float32Array(n * 6)
            gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
            gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW)
        }

        const white = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, white)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 255])
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        const isPOT = (v: number) => (v & (v - 1)) === 0 && v > 0

        const upload = (img: HTMLImageElement): WebGLTexture | null => {
            const tex = gl.createTexture()
            if (!tex) return null
            gl.bindTexture(gl.TEXTURE_2D, tex)

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                isGL2 ? (gl as any).SRGB8_ALPHA8 : gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img
            )
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

            const mip =
                isGL2 || (isPOT(img.naturalWidth) && isPOT(img.naturalHeight))
            if (mip) {
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MIN_FILTER,
                    gl.LINEAR_MIPMAP_LINEAR
                )
                gl.generateMipmap(gl.TEXTURE_2D)
                if (aniso) {
                    const max = gl.getParameter(
                        (aniso as any).MAX_TEXTURE_MAX_ANISOTROPY_EXT
                    )
                    gl.texParameterf(
                        gl.TEXTURE_2D,
                        (aniso as any).TEXTURE_MAX_ANISOTROPY_EXT,
                        Math.min(8, max || 1)
                    )
                }
            } else {
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MIN_FILTER,
                    gl.LINEAR
                )
            }
            return tex
        }

        let vw = 1
        let vh = 1
        const resize = () => {
            const w = Math.max(1, host.clientWidth)
            const h = Math.max(1, host.clientHeight)
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            vw = Math.max(1, Math.round(w * dpr))
            vh = Math.max(1, Math.round(h * dpr))
            if (canvas.width !== vw) canvas.width = vw
            if (canvas.height !== vh) canvas.height = vh
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        const pointer = {
            nx: 0,
            ny: 0,
            inside: false,
            dragging: false,
            lastX: 0,
            lastY: 0,
            downX: 0,
            downY: 0,
            downAt: 0,
        }

        const orbit = {
            yaw: 0,
            pitch: 0,
            yawVel: 0,
            pitchVel: 0,
            spin: 0,
            zoom: clamp(
                live.current.radius * REST_DIST_MUL,
                live.current.minZoom,
                live.current.maxZoom
            ),
            zoomTarget: 0,
        }
        orbit.zoomTarget = orbit.zoom

        let camDist = orbit.zoom / live.current.scale

        const nodes: NodeRT[] = []
        const setNdc = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            pointer.nx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1
            pointer.ny = -((e.clientY - r.top) / Math.max(1, r.height)) * 2 + 1
        }

        const rayO = [0, 0, 0]
        const rayD = [0, 0, -1]
        const rayOL = [0, 0, 0]
        const rayDL = [0, 0, -1]
        const tmpA = [0, 0, 0]
        const axR = [0, 0, 0]
        const axU = [0, 0, 0]
        const axN = [0, 0, 0]

        const buildRay = (camZ: number, fovRad: number, aspect: number) => {
            const th = Math.tan(fovRad / 2)
            const dx = pointer.nx * th * aspect
            const dy = pointer.ny * th
            const dz = -1
            const len = Math.hypot(dx, dy, dz) || 1
            rayO[0] = 0
            rayO[1] = 0
            rayO[2] = camZ
            rayD[0] = dx / len
            rayD[1] = dy / len
            rayD[2] = dz / len
        }

        const hitTest = (R: number[]): number => {
            applyBasisT(R, rayO[0], rayO[1], rayO[2], rayOL)
            applyBasisT(R, rayD[0], rayD[1], rayD[2], rayDL)

            let best = -1
            let bestT = Infinity
            for (let i = 0; i < nodes.length; i++) {
                const nd = nodes[i]
                quatAxes(nd.q, axR, axU, axN)
                const denom =
                    rayDL[0] * axN[0] + rayDL[1] * axN[1] + rayDL[2] * axN[2]
                if (Math.abs(denom) < 1e-8) continue
                const ox = nd.px - rayOL[0]
                const oy = nd.py - rayOL[1]
                const oz = nd.pz - rayOL[2]
                const t = (ox * axN[0] + oy * axN[1] + oz * axN[2]) / denom
                if (t <= 0 || t >= bestT) continue
                const hx = rayOL[0] + rayDL[0] * t - nd.px
                const hy = rayOL[1] + rayDL[1] * t - nd.py
                const hz = rayOL[2] + rayDL[2] * t - nd.pz
                const u = hx * axR[0] + hy * axR[1] + hz * axR[2]
                const v = hx * axU[0] + hy * axU[1] + hz * axU[2]
                if (Math.abs(u) > nd.hx || Math.abs(v) > nd.hy) continue
                bestT = t
                best = i
            }
            return best
        }

        let frameBasis = rigBasis(0, 0)

        const onPointerDown = (e: PointerEvent) => {
            setNdc(e)
            pointer.inside = true
            pointer.dragging = true
            pointer.lastX = e.clientX
            pointer.lastY = e.clientY
            pointer.downX = e.clientX
            pointer.downY = e.clientY
            pointer.downAt = performance.now()
            orbit.yawVel = 0
            orbit.pitchVel = 0
            canvas.style.cursor = "grabbing"
        }

        const onPointerMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            const inBox =
                e.clientX >= r.left &&
                e.clientX <= r.right &&
                e.clientY >= r.top &&
                e.clientY <= r.bottom
            pointer.inside = inBox || pointer.dragging
            if (pointer.inside) setNdc(e)

            if (!pointer.dragging) {
                if (inBox) {
                    buildRay(camDist, (FOV * Math.PI) / 180, vw / vh)
                    const idx = hitTest(frameBasis)
                    canvas.style.cursor =
                        idx >= 0 && linksRef.current[idx] ? "pointer" : "grab"
                }
                return
            }

            const dx = e.clientX - pointer.lastX
            const dy = e.clientY - pointer.lastY
            pointer.lastX = e.clientX
            pointer.lastY = e.clientY

            const L = live.current

            orbit.yaw += (dx * L.orbitSpeed * Math.PI) / 180
            orbit.pitch += (dy * L.orbitSpeed * Math.PI) / 180
            const lim = (L.orbitLimit * Math.PI) / 180
            orbit.pitch = clamp(orbit.pitch, -lim, lim)

            orbit.yawVel = dx * L.orbitSpeed * 60
            orbit.pitchVel = dy * L.orbitSpeed * 60
        }

        const release = (e: PointerEvent) => {
            if (!pointer.dragging) return
            pointer.dragging = false
            canvas.style.cursor = "grab"

            const dt = performance.now() - pointer.downAt
            const dist =
                Math.abs(e.clientX - pointer.downX) +
                Math.abs(e.clientY - pointer.downY)

            if (dist <= CLICK_SLOP_PX && dt <= CLICK_MS) {
                orbit.yawVel = 0
                orbit.pitchVel = 0
                setNdc(e)
                buildRay(camDist, (FOV * Math.PI) / 180, vw / vh)
                const idx = hitTest(frameBasis)
                const url = idx >= 0 ? linksRef.current[idx] : ""
                if (url) {
                    window.open(url, "_blank", "noopener,noreferrer")
                }
            }
        }

        const onLeave = () => {
            if (!pointer.dragging) pointer.inside = false
        }

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const L = live.current
            orbit.zoomTarget = clamp(
                orbit.zoomTarget + e.deltaY * 0.02 * L.zoomGain,
                L.minZoom,
                L.maxZoom
            )
        }

        canvas.style.cursor = "grab"
        canvas.style.touchAction = "none"
        canvas.addEventListener("pointerdown", onPointerDown)
        canvas.addEventListener("pointerleave", onLeave)
        canvas.addEventListener("wheel", onWheel, { passive: false })

        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)

        const proj = mat4()
        const view = mat4()
        const viewProj = mat4()
        const model = mat4()
        const mvp = mat4()
        const qRig: Quat = [0, 0, 0, 1]
        const qCamLocal: Quat = [0, 0, 0, 1]
        const qRadial: Quat = [0, 0, 0, 1]
        const forwardLocal = [0, 0, -1]
        const placeholderRGB = parseColor(PLACEHOLDER, [0, 0, 0, 1])
        const order: number[] = []

        gl.clearColor(0, 0, 0, 0)
        gl.enable(gl.DEPTH_TEST)

        let raf = 0
        let prev = performance.now()

        const frame = () => {
            raf = requestAnimationFrame(frame)

            const now = performance.now()
            const dt = Math.min(0.05, (now - prev) / 1000)
            prev = now

            const L = live.current
            const media = mediaRef.current
            const n = Math.max(0, L.count | 0)

            const mediaFor = (i: number): Loaded | undefined =>
                media.length ? media[i % media.length] : undefined

            const grave = graveyardRef.current
            while (grave.length) gl.deleteTexture(grave.pop() as WebGLTexture)

            while (nodes.length < n) nodes.push(makeNode())
            if (nodes.length > n) nodes.length = n
            ensureLines(n)

            gl.viewport(0, 0, vw, vh)

            gl.depthMask(true)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            const lo = Math.min(L.minZoom, L.maxZoom)
            const hi = Math.max(L.minZoom, L.maxZoom)
            orbit.zoomTarget = clamp(orbit.zoomTarget, lo, hi)
            orbit.zoom +=
                (orbit.zoomTarget - orbit.zoom) * (1 - Math.exp(-ZOOM_RATE * dt))

            camDist = orbit.zoom / Math.max(0.001, L.scale)

            const fovRad = (FOV * Math.PI) / 180
            const aspect = vw / vh
            perspective(proj, fovRad, aspect)

            if (!pointer.dragging) {
                const keep =
                    L.orbitDamping <= 0
                        ? 0
                        : Math.exp((-6 / Math.max(0.001, L.orbitDamping)) * dt)
                orbit.yaw += ((orbit.yawVel * dt * Math.PI) / 180) * keep
                orbit.pitch += ((orbit.pitchVel * dt * Math.PI) / 180) * keep
                orbit.yawVel *= keep
                orbit.pitchVel *= keep
                const lim = (L.orbitLimit * Math.PI) / 180
                orbit.pitch = clamp(orbit.pitch, -lim, lim)
            }
            orbit.spin += L.spin * dt
            if (orbit.spin > Math.PI * 2) orbit.spin -= Math.PI * 2

            const yaw = orbit.spin + orbit.yaw
            const pitch = orbit.pitch
            rigView(view, yaw, pitch, camDist)
            mul(viewProj, proj, view)

            const R = rigBasis(yaw, pitch)
            frameBasis = R
            quatFromYawPitch(yaw, pitch, qRig)

            qCamLocal[0] = -qRig[0]
            qCamLocal[1] = -qRig[1]
            qCamLocal[2] = -qRig[2]
            qCamLocal[3] = qRig[3]

            applyBasisT(R, 0, 0, -1, forwardLocal)

            const coreR = Math.max(0.001, L.coreSize)

            gl.useProgram(solidProg)
            gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj)
            gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf)
            gl.enableVertexAttribArray(sLoc.aPos)
            gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0)

            if (L.coreSize > 0.001) {
                const c = parseColor(L.coreColor, [0.48, 0.72, 1, 1])
                gl.disable(gl.BLEND)
                gl.enable(gl.CULL_FACE)
                gl.cullFace(gl.BACK)
                gl.depthMask(true)
                gl.uniform1f(sLoc.uScale, coreR)
                gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], 1)
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballTri)
                gl.drawElements(
                    gl.TRIANGLES,
                    ball.tris.length,
                    gl.UNSIGNED_SHORT,
                    0
                )
                gl.disable(gl.CULL_FACE)
            }
            gl.disableVertexAttribArray(sLoc.aPos)

            gl.enable(gl.BLEND)
            gl.depthMask(false)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

            const drawHalo = () => {
                if (L.coreGlow <= 0.002) return
                const c = parseColor(L.coreColor, [0.48, 0.72, 1, 1])
                gl.useProgram(solidProg)
                gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj)
                gl.bindBuffer(gl.ARRAY_BUFFER, ballBuf)
                gl.enableVertexAttribArray(sLoc.aPos)
                gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0)

                gl.blendFunc(gl.ONE, gl.ONE)
                gl.uniform1f(sLoc.uScale, coreR * 1.45)
                gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], L.coreGlow)
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballEdge)
                gl.drawElements(
                    gl.LINES,
                    ball.edges.length,
                    gl.UNSIGNED_SHORT,
                    0
                )
                gl.disableVertexAttribArray(sLoc.aPos)
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            }

            if (!n) {
                gl.disableVertexAttribArray(sLoc.aPos)

                drawHalo()
                return
            }

            const hovering =
                pointer.inside && L.force > 0 && L.hoverDist > 0
            if (hovering) buildRay(camDist, fovRad, aspect)

            const worldPerPixel = (2 * Math.tan(fovRad / 2)) / vh

            for (let i = 0; i < n; i++) {
                const nd = nodes[i]

                const y = 1 - (2 * (i + 0.5)) / n
                const rr = Math.sqrt(Math.max(0, 1 - y * y))
                const th = GOLDEN_ANGLE * i

                const jitter = 1 + (hash01(i) - 0.5) * L.depthRand
                const Rr = L.radius * jitter

                const bx = Math.cos(th) * rr * Rr
                const by = y * Rr
                const bz = Math.sin(th) * rr * Rr

                let capture = 0
                let tx = 0,
                    ty = 0,
                    tz = 0
                if (hovering) {
                    applyBasis(R, bx, by, bz, tmpA)
                    const wx = tmpA[0],
                        wy = tmpA[1],
                        wz = tmpA[2]

                    const t = Math.max(
                        0,
                        (wx - rayO[0]) * rayD[0] +
                            (wy - rayO[1]) * rayD[1] +
                            (wz - rayO[2]) * rayD[2]
                    )
                    const cx = rayO[0] + rayD[0] * t
                    const cy = rayO[1] + rayD[1] * t
                    const cz = rayO[2] + rayD[2] * t
                    const d = Math.hypot(cx - wx, cy - wy, cz - wz)
                    if (d < L.hoverDist) {
                        const u = 1 - d / L.hoverDist
                        capture = u * u * (3 - 2 * u)

                        applyBasisT(R, cx - wx, cy - wy, cz - wz, tmpA)
                        const k = capture * L.force
                        tx = tmpA[0] * k
                        ty = tmpA[1] * k
                        tz = tmpA[2] * k

                        const pop = -k * L.radius * 0.12
                        tx += forwardLocal[0] * pop
                        ty += forwardLocal[1] * pop
                        tz += forwardLocal[2] * pop
                    }
                }

                const damp = 2 + DAMPING * 16
                nd.vx += (tx - nd.ox) * SPRING_STIFFNESS * dt
                nd.vy += (ty - nd.oy) * SPRING_STIFFNESS * dt
                nd.vz += (tz - nd.oz) * SPRING_STIFFNESS * dt
                const decay = Math.exp(-damp * dt)
                nd.vx *= decay
                nd.vy *= decay
                nd.vz *= decay
                nd.ox += nd.vx * dt
                nd.oy += nd.vy * dt
                nd.oz += nd.vz * dt

                const px = bx + nd.ox
                const py = by + nd.oy
                const pz = bz + nd.oz
                nd.px = px
                nd.py = py
                nd.pz = pz

                const radLen = Math.hypot(px, py, pz) || 1
                quatFromZTo(px / radLen, py / radLen, pz / radLen, qRadial)

                quatSlerp(qRadial, qCamLocal, BILLBOARD_BLEND, nd.q)

                const m = mediaFor(i)
                const aspectI = m?.aspect || 1
                const s = L.itemSize * (1 + HOVER_POP * capture)
                nd.hx = (s * aspectI) / 2
                nd.hy = s / 2

                order[i] = i
            }
            order.length = n

            const depthOf = (nd: NodeRT) =>
                R[6] * nd.px + R[7] * nd.py + R[8] * nd.pz
            order.sort((a, b) => depthOf(nodes[a]) - depthOf(nodes[b]))

            let split = 0
            while (split < n && depthOf(nodes[order[split]]) < 0) split++

            for (let o = 0; o < n; o++) {
                const nd = nodes[order[o]]
                const len = Math.hypot(nd.px, nd.py, nd.pz) || 1
                const k = coreR / len
                lineData[o * 6 + 0] = nd.px * k
                lineData[o * 6 + 1] = nd.py * k
                lineData[o * 6 + 2] = nd.pz * k
                lineData[o * 6 + 3] = nd.px
                lineData[o * 6 + 4] = nd.py
                lineData[o * 6 + 5] = nd.pz
            }
            if (L.lineOpacity > 0.002) {
                gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineData)
            }

            const drawStrings = (from: number, count: number) => {
                if (count <= 0 || L.lineOpacity <= 0.002) return
                const c = parseColor(L.lineColor, [0.29, 0.42, 0.6, 1])
                gl.useProgram(solidProg)
                gl.uniformMatrix4fv(sLoc.uMVP, false, viewProj)
                gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
                gl.enableVertexAttribArray(sLoc.aPos)
                gl.vertexAttribPointer(sLoc.aPos, 3, gl.FLOAT, false, 0, 0)
                gl.uniform1f(sLoc.uScale, 1)
                gl.uniform4f(sLoc.uColor, c[0], c[1], c[2], L.lineOpacity)
                gl.drawArrays(gl.LINES, from * 2, count * 2)
                gl.disableVertexAttribArray(sLoc.aPos)
            }

            const beginQuads = () => {
                gl.useProgram(quadProg)
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
                gl.enableVertexAttribArray(qLoc.aCorner)
                gl.vertexAttribPointer(qLoc.aCorner, 2, gl.FLOAT, false, 0, 0)
                gl.uniform1i(qLoc.uMap, 0)
                gl.uniform3f(
                    qLoc.uPlaceholder,
                    placeholderRGB[0],
                    placeholderRGB[1],
                    placeholderRGB[2]
                )
                gl.uniform1f(qLoc.uOpacity, 1)
                gl.activeTexture(gl.TEXTURE0)
            }

            const drawQuads = (from: number, to: number) => {
            for (let o = from; o < to; o++) {
                const i = order[o]
                const nd = nodes[i]
                const m = mediaFor(i)

                if (m && m.image && !m.texture) {
                    m.texture = upload(m.image)
                    m.applied = false
                    m.image = null
                }

                const aspectI = m?.aspect || 1
                const hasTex = m && m.texture ? 1 : 0
                gl.bindTexture(gl.TEXTURE_2D, hasTex ? (m as Loaded).texture : white)
                gl.uniform1f(qLoc.uHasTex, hasTex)

                if (hasTex) {
                    gl.uniform2f(qLoc.uHalf, aspectI / 2, 0.5)
                    gl.uniform1f(
                        qLoc.uRadius,
                        L.rounded * Math.min(aspectI / 2, 0.5)
                    )
                } else {
                    gl.uniform2f(qLoc.uHalf, 0.5, 0.5)
                    gl.uniform1f(qLoc.uRadius, L.rounded * 0.5)
                }

                const sy = nd.hy * 2
                const sx = nd.hx * 2
                compose(model, nd.px, nd.py, nd.pz, nd.q, sx, sy, 1)
                mul(mvp, viewProj, model)
                gl.uniformMatrix4fv(qLoc.uMVP, false, mvp)

                const depth =
                    R[6] * nd.px + R[7] * nd.py + R[8] * nd.pz
                const tt = clamp((depth + L.radius) / (2 * L.radius), 0, 1)
                gl.uniform1f(qLoc.uDim, DEPTH_FLOOR + (1 - DEPTH_FLOOR) * tt)

                const dist = Math.max(0.001, camDist - depth)
                gl.uniform1f(qLoc.uAA, (worldPerPixel * dist) / Math.max(1e-4, sy))

                gl.drawArrays(gl.TRIANGLES, 0, 6)
            }
            }

            drawStrings(0, split)
            beginQuads()
            drawQuads(0, split)
            gl.disableVertexAttribArray(qLoc.aCorner)

            drawHalo()

            drawStrings(split, n - split)
            beginQuads()
            drawQuads(split, n)
            gl.disableVertexAttribArray(qLoc.aCorner)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("pointerleave", onLeave)
            canvas.removeEventListener("wheel", onWheel)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", release)
            window.removeEventListener("pointercancel", release)

            gl.deleteBuffer(quadBuf)
            gl.deleteBuffer(ballBuf)
            gl.deleteBuffer(ballTri)
            gl.deleteBuffer(ballEdge)
            gl.deleteBuffer(lineBuf)
            gl.deleteTexture(white)
            mediaRef.current.forEach((m) => {
                if (m.texture) gl.deleteTexture(m.texture)
                m.texture = null
            })
            while (graveyard.length) {
                gl.deleteTexture(graveyard.pop() as WebGLTexture)
            }
            gl.deleteProgram(quadProg)
            gl.deleteProgram(solidProg)

        }

    }, [])

    return (
        <div
            ref={hostRef}
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",

                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                background,
                isolation: "isolate",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
