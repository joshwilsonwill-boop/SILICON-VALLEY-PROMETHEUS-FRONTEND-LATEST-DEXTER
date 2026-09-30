'use client'

import * as React from 'react'
import * as THREE from 'three'

type PaperImageProps = {
  src: string
  alt: string
  className?: string
}

export default function PaperImage({ src, alt, className }: PaperImageProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const mouseXRef = React.useRef(0.5)
  const hoveringRef = React.useRef(false)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    } catch {
      return
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

    const fov = 30
    const overscan = 1.8
    const halfTan = Math.tan((fov * Math.PI) / 360)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 100)
    const uniforms = {
      uTime: { value: 0 },
      uWind: { value: reduced ? 0 : 0.3 },
      uMouseX: { value: 0.5 },
      uPlaneSize: { value: new THREE.Vector2(0.75, 1) },
      uImageAspect: { value: 0.75 },
      uAmp: { value: 0.18 },
      uMode: { value: 0 },
      uSheen: { value: 0.35 },
      uTex: { value: null as THREE.Texture | null },
      uHasTex: { value: 0 },
    }
    const geometry = new THREE.PlaneGeometry(1, 1, 64, 64)
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let disposed = false
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(
      src,
      (texture) => {
        if (disposed) {
          texture.dispose()
          return
        }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
        uniforms.uTex.value = texture
        uniforms.uHasTex.value = 1
        const image = texture.image as { width?: number; height?: number }
        if (image.width && image.height) uniforms.uImageAspect.value = image.width / image.height
        setReady(true)
      },
      undefined,
      () => setReady(false),
    )

    function onMove(event: PointerEvent) {
      const rect = container!.getBoundingClientRect()
      mouseXRef.current = Math.min(1, Math.max(0, (event.clientX - rect.left) / (rect.width || 1)))
      hoveringRef.current = true
    }
    function onLeave() {
      hoveringRef.current = false
    }
    if (!reduced) {
      container.addEventListener('pointermove', onMove)
      container.addEventListener('pointerleave', onLeave)
    }

    let width = 0
    let height = 0
    let frame = 0
    let running = false
    const start = performance.now()
    function loop() {
      if (!running) return
      frame = requestAnimationFrame(loop)
      const nextWidth = container!.clientWidth
      const nextHeight = container!.clientHeight
      if (nextWidth > 0 && nextHeight > 0 && (nextWidth !== width || nextHeight !== height)) {
        width = nextWidth
        height = nextHeight
        renderer.setSize(width * overscan, height * overscan, false)
        camera.aspect = width / height
        uniforms.uPlaneSize.value.set(width / height, 1)
        camera.updateProjectionMatrix()
      }
      if (!width) return

      uniforms.uTime.value = (performance.now() - start) / 1000
      const targetWind = reduced ? 0 : hoveringRef.current ? 0.42 : 0.24
      uniforms.uWind.value += (targetWind - uniforms.uWind.value) * 0.06
      uniforms.uMouseX.value += (mouseXRef.current - uniforms.uMouseX.value) * 0.1
      camera.position.z = overscan / (2 * halfTan)
      renderer.render(scene, camera)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true
        loop()
      } else if (!entry.isIntersecting) {
        running = false
        cancelAnimationFrame(frame)
      }
    }, { threshold: 0.01 })
    observer.observe(container)

    return () => {
      disposed = true
      running = false
      observer.disconnect()
      cancelAnimationFrame(frame)
      container.removeEventListener('pointermove', onMove)
      container.removeEventListener('pointerleave', onLeave)
      uniforms.uTex.value?.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [src])

  return (
    <div ref={containerRef} className={className}>
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute -left-[40%] -top-[40%] block h-[180%] w-[180%] transition-opacity duration-300"
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  )
}

const VERT = `
uniform float uTime, uWind, uMouseX, uAmp, uMode;
uniform vec2 uPlaneSize;
varying vec2 vUv; varying vec3 vNormal, vViewPos;

float wave(vec2 uv, float t, float wind) {
  float mask = pow(max(0.0, 1.0 - uv.y), 1.1);
  float w = sin(uv.x * 6.0 + t * 3.0) * 0.5
          + sin(uv.x * 11.0 - t * 2.0 + uv.y * 4.0) * 0.25
          + sin((uv.x + uv.y) * 8.0 + t * 4.0) * 0.15;
  w += sin(uv.x * 9.0 + t * 5.0) * 0.3 * (1.0 - smoothstep(0.0, 0.35, abs(uv.x - uMouseX)));
  return w * mask * wind;
}
float disp(vec2 uv, float t, float wind) {
  float ripple = wave(uv, t, wind);
  if (uMode < 0.5) return uAmp * ripple;
  return uAmp * (ripple * 0.6 + pow(max(0.0, 1.0 - uv.y), 2.0) * wind * 3.0);
}
void main() {
  vUv = uv;
  float z = disp(uv, uTime, uWind), e = 0.002;
  float dzdx = (disp(uv + vec2(e, 0.0), uTime, uWind) - disp(uv - vec2(e, 0.0), uTime, uWind)) / (2.0 * e) / uPlaneSize.x;
  float dzdy = (disp(uv + vec2(0.0, e), uTime, uWind) - disp(uv - vec2(0.0, e), uTime, uWind)) / (2.0 * e) / uPlaneSize.y;
  vNormal = normalMatrix * normalize(vec3(-dzdx, -dzdy, 1.0));
  float yLift = uMode < 0.5 ? 0.0 : uAmp * pow(max(0.0, 1.0 - uv.y), 2.0) * uWind * 1.2;
  vec4 mv = modelViewMatrix * vec4(position.x * uPlaneSize.x, position.y + yLift, z, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

const FRAG = `
precision highp float;
uniform sampler2D uTex; uniform float uHasTex, uSheen, uImageAspect; uniform vec2 uPlaneSize;
varying vec2 vUv; varying vec3 vNormal, vViewPos;
void main() {
  float ar = uPlaneSize.x; vec2 st = vUv;
  if (ar > uImageAspect) st.y = (vUv.y - 0.5) * (uImageAspect / ar) + 0.5;
  else st.x = (vUv.x - 0.5) * (ar / uImageAspect) + 0.5;
  vec3 base = uHasTex > 0.5 ? texture2D(uTex, st).rgb : vec3(0.85);
  vec3 N = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
  vec3 L = normalize(vec3(0.35, 0.55, 0.75)), V = normalize(-vViewPos);
  float diff = clamp(dot(N, L), 0.0, 1.0);
  float spec = pow(clamp(dot(N, normalize(L + V)), 0.0, 1.0), 26.0);
  float shade = (0.68 + diff * 0.45) / (0.68 + L.z * 0.45);
  float flatSpec = pow(clamp(normalize(L + V).z, 0.0, 1.0), 26.0);
  gl_FragColor = vec4(base * shade + max(spec - flatSpec, 0.0) * uSheen, 1.0);
  #include <colorspace_fragment>
}
`
