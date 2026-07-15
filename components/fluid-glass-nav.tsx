/* eslint-disable react/no-unknown-property */
"use client"

import * as THREE from "three"
import { useRef, useState, useMemo, useEffect, Component, type ReactNode } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useFBO, MeshTransmissionMaterial } from "@react-three/drei"
import { easing } from "maath"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FluidGlassNavProps {
  activeIndex: number
  tabCount: number
  dragOffset?: number
  isDragging?: boolean
  isPressed?: boolean
}

// ─── Pill geometry (no .glb needed) ───────────────────────────────────────────

/**
 * Creates a stadium / pill-shaped ExtrudeGeometry.
 * totalWidth  = outer width  (world units)
 * totalHeight = outer height (world units) — also controls the cap radius
 */
function createPillGeometry(totalWidth: number, totalHeight: number): THREE.BufferGeometry {
  const r = totalHeight / 2
  // Half-length of the straight section between the two arc centres
  const hw = Math.max(totalWidth / 2 - r, 0)

  const shape = new THREE.Shape()
  shape.moveTo(-hw, -r)
  shape.lineTo(hw, -r)
  // Right cap (bottom → top, counterclockwise)
  shape.absarc(hw, 0, r, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(-hw, r)
  // Left cap (top → bottom, counterclockwise)
  shape.absarc(-hw, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false)

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 8,
    curveSegments: 28,
  })
  geo.center()
  return geo
}

// ─── Animated gradient background (rendered into FBO) ─────────────────────────

/**
 * Creates the background THREE.Mesh that lives inside `bgScene`.
 * The shader animates an emerald/teal/cyan liquid gradient that the glass
 * will refract, making the pill look like true liquid glass.
 */
function useBackgroundMesh() {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 100)
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;

        // Smooth noise helpers
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float smoothNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec2 uv = vUv;

          // Layered wave animation
          float w1 = sin(uv.x * 5.0 + uTime * 0.85) * 0.5 + 0.5;
          float w2 = sin(uv.y * 4.0 - uTime * 0.70) * 0.5 + 0.5;
          float w3 = sin((uv.x + uv.y) * 4.5 + uTime * 1.10) * 0.5 + 0.5;
          float w4 = smoothNoise(uv * 3.0 + uTime * 0.15) * 0.5 + 0.5;

          // App-themed colour palette
          vec3 emerald  = vec3(0.02, 0.60, 0.45);   // emerald-600
          vec3 teal     = vec3(0.00, 0.50, 0.55);   // teal-600
          vec3 mint     = vec3(0.75, 1.00, 0.92);   // mint highlight
          vec3 cyan     = vec3(0.00, 0.75, 0.82);   // cyan-500
          vec3 deep     = vec3(0.00, 0.35, 0.38);   // deep teal shadow

          vec3 col = mix(emerald, teal, w1);
          col = mix(col, mint,  w2 * 0.38);
          col = mix(col, cyan,  w3 * 0.28);
          col = mix(col, deep,  w4 * 0.22);

          // Soft vignette to stop hard edges
          float vig = 1.0 - smoothstep(0.35, 0.85, length(uv - 0.5));
          col = mix(col * 0.6, col, vig);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
    return new THREE.Mesh(geo, mat)
  }, [])
}

// ─── Core glass pill scene object ─────────────────────────────────────────────

function GlassPill({ activeIndex, tabCount, dragOffset = 0, isDragging = false, isPressed = false }: FluidGlassNavProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  // FBO captures the bg scene — this is what the glass refracts
  const buffer = useFBO()
  const { viewport, size } = useThree()

  // Separate Three.js scene for the FBO background
  const [bgScene] = useState(() => new THREE.Scene())
  const bgMesh = useBackgroundMesh()

  useEffect(() => {
    bgScene.add(bgMesh)
    return () => void bgScene.remove(bgMesh)
  }, [bgScene, bgMesh])

  // ── Convert the 6px nav-container padding into world units ─────────────────
  // The CSS active-bg uses: top:6px, bottom:6px, left:6px, width:(100%-12px)/4
  // The Canvas fills the full nav container (inset:0), so we mirror that here.
  const pxToWorld  = size.width > 0 ? viewport.width / size.width : 1
  const padWorld   = 6 * pxToWorld                          // 6px in world space
  const innerW     = viewport.width  - 2 * padWorld         // usable horizontal space
  const innerH     = viewport.height - 2 * padWorld         // usable vertical space

  const tabStep    = innerW / tabCount                      // width of one tab slot
  const pillWidth  = tabStep  * 0.96                        // tiny gap between neighbours
  const pillHeight = innerH                                 // fills top→bottom (matches CSS)

  const geometry = useMemo(
    () => createPillGeometry(pillWidth, pillHeight),
    [pillWidth, pillHeight]
  )

  // ── Per-frame update ────────────────────────────────────────────────────────
  useFrame(({ gl, camera, clock }, delta) => {
    // Animate the gradient shader
    ;(bgMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.getElapsedTime()

    // Render background scene → FBO
    gl.setRenderTarget(buffer)
    gl.render(bgScene, camera)
    gl.setRenderTarget(null)

    // Centre of the active tab slot in world space
    // = left edge of usable area + (slot index + 0.5) * slot width, then shift to origin
    const slotCentreX = -viewport.width / 2 + padWorld + (activeIndex + 0.5) * tabStep
    const targetX     = slotCentreX + (isDragging ? dragOffset * pxToWorld : 0)

    // Smooth easing — tight tracking while dragging, snappy spring on release
    easing.damp3(
      meshRef.current.position,
      [targetX, 0, 0],
      isDragging ? 0.05 : 0.08,
      delta
    )

    // iOS press-and-hold expand: scale up from all sides when pressed
    const pressScale = isPressed ? 1.12 : 1.0
    easing.damp3(
      meshRef.current.scale,
      [pressScale, pressScale, 1],
      isPressed ? 0.04 : 0.10, // fast spring-in, smooth release
      delta
    )
  })

  // Set initial position exactly once on mount so we don't teleport when activeIndex changes
  useEffect(() => {
    if (meshRef.current) {
      const initialX = -viewport.width / 2 + padWorld + (activeIndex + 0.5) * tabStep
      meshRef.current.position.set(initialX, 0, 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/*
        Invisible fullscreen plane that "owns" the FBO texture in the scene.
        MeshTransmissionMaterial uses screen-space UV to sample the buffer,
        so this plane must exist in the scene even at opacity 0.
      */}
      <mesh
        scale={[viewport.width, viewport.height, 1]}
        position={[0, 0, -0.15]}
        renderOrder={0}
      >
        <planeGeometry />
        <meshBasicMaterial
          map={buffer.texture}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* The liquid glass pill */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        renderOrder={1}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          // Glass optics
          ior={1.20}
          thickness={3.0}
          transmission={1}
          // Surface quality
          roughness={0.03}
          anisotropy={0.12}
          // Chromatic aberration (rainbow fringe on glass edges)
          chromaticAberration={0.07}
          // Colour tint
          color="#ffffff"
          transparent
          opacity={0.90}
        />
      </mesh>
    </>
  )
}

// ─── Error boundary: if WebGL / Three.js fails, silently fall back ─────────────

interface EBState { crashed: boolean }
class NavGlassErrorBoundary extends Component<{ children: ReactNode; tabCount: number; activeIndex: number }, EBState> {
  state: EBState = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  componentDidCatch(err: unknown) { console.warn("[FluidGlassNav] WebGL error, falling back to CSS pill:", err) }
  render() {
    if (this.state.crashed) {
      // CSS fallback pill — matches the original ios-nav-active-bg look
      const { tabCount, activeIndex } = this.props
      const pct = (100 / tabCount) * activeIndex
      return (
        <div
          style={{
            position: "absolute",
            top: 6, bottom: 6,
            left: `calc(6px + ${pct}%)`,
            width: `calc(${100 / tabCount}% - 12px / ${tabCount})`,
            borderRadius: 22,
            background: "rgba(255,255,255,0.55)",
            border: "0.5px solid rgba(255,255,255,0.8)",
            transition: "left 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )
    }
    return this.props.children
  }
}

// ─── Exported wrapper ──────────────────────────────────────────────────────────

export function FluidGlassNav({ activeIndex, tabCount, dragOffset, isDragging, isPressed }: FluidGlassNavProps) {
  return (
    <NavGlassErrorBoundary activeIndex={activeIndex} tabCount={tabCount}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <GlassPill
          activeIndex={activeIndex}
          tabCount={tabCount}
          dragOffset={dragOffset}
          isDragging={isDragging}
          isPressed={isPressed}
        />
      </Canvas>
    </NavGlassErrorBoundary>
  )
}
