import { useRef, useMemo, useState, useCallback, useEffect, memo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { DOMAIN_COLORS } from '../constants/colors.js'

// Domain positions in 10×10 world space
const DOMAIN_POSITIONS = {
  d1: [5, 1.5],
  d2: [3.5, 3],
  d3: [6.5, 3],
  d4: [2.5, 5],
  d5: [5, 5],
  d6: [7.5, 5],
  d7: [5, 8.5],
  d8: [0.8, 5],
  d9: [9.2, 5],
}

const EDGES = [
  { from: 'd1', to: 'd2' },
  { from: 'd2', to: 'd3' },
  { from: 'd3', to: 'd4' },
  { from: 'd4', to: 'd5' },
  { from: 'd5', to: 'd6' },
  { from: 'd6', to: 'd7' },
  { from: 'd2', to: 'd6' },
  { from: 'd3', to: 'd7' },
]

// ─── Terrain vertex shader ───
const terrainVertexShader = `
  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vHeight = position.y;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// ─── Terrain fragment shader ───
const terrainFragmentShader = `
  uniform float uCascadeRadius;
  uniform vec3 uCascadeCenter;
  uniform vec3 uCascadeColor;
  uniform float uCascadeActive;
  uniform float uMaxHeight;

  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vWorldPos;

  void main() {
    float normalizedHeight = clamp(vHeight / max(uMaxHeight, 0.1), 0.0, 1.0);

    // Hypsometric tinting: deep blue → teal → green → yellow-green → golden
    vec3 color;
    if (normalizedHeight < 0.2) {
      color = mix(vec3(0.05, 0.1, 0.25), vec3(0.1, 0.25, 0.3), normalizedHeight / 0.2);
    } else if (normalizedHeight < 0.4) {
      color = mix(vec3(0.1, 0.25, 0.3), vec3(0.15, 0.4, 0.2), (normalizedHeight - 0.2) / 0.2);
    } else if (normalizedHeight < 0.6) {
      color = mix(vec3(0.15, 0.4, 0.2), vec3(0.35, 0.5, 0.15), (normalizedHeight - 0.4) / 0.2);
    } else if (normalizedHeight < 0.8) {
      color = mix(vec3(0.35, 0.5, 0.15), vec3(0.6, 0.55, 0.1), (normalizedHeight - 0.6) / 0.2);
    } else {
      color = mix(vec3(0.6, 0.55, 0.1), vec3(0.85, 0.75, 0.3), (normalizedHeight - 0.8) / 0.2);
    }

    // Contour lines at 0.1 height intervals
    float contourFreq = 10.0;
    float contourVal = fract(vHeight * contourFreq);
    float contour = 1.0 - smoothstep(0.02, 0.06, contourVal) * (1.0 - smoothstep(0.94, 0.98, contourVal));
    color = mix(color, color * 0.6, contour * 0.4);

    // Cascade glow ring
    if (uCascadeActive > 0.5) {
      float dist = length(vWorldPos.xz - uCascadeCenter.xz);
      float ringWidth = 0.4;
      float ring = smoothstep(uCascadeRadius - ringWidth, uCascadeRadius, dist)
                  * (1.0 - smoothstep(uCascadeRadius, uCascadeRadius + ringWidth, dist));
      color += uCascadeColor * ring * 0.6;
    }

    // Simple lighting
    float ambient = 0.3;
    vec3 lightDir = normalize(vec3(1.0, 2.0, 1.5));
    // Approximate normal from height gradient (flat shading supplement)
    float light = ambient + max(0.0, dot(normalize(vec3(0.0, 1.0, 0.0)), lightDir)) * 0.7;
    color *= light;

    gl_FragColor = vec4(color, 1.0);
  }
`

/* ─── Custom CameraRig for terrain ─── */
function TerrainCameraRig({ thetaRef, phiRef, radiusRef, targetRef }) {
  const { camera } = useThree()

  useFrame(() => {
    const theta = thetaRef.current
    const phi = phiRef.current
    const r = radiusRef.current
    const target = targetRef.current

    camera.position.set(
      target.x + r * Math.sin(phi) * Math.sin(theta),
      target.y + r * Math.cos(phi),
      target.z + r * Math.sin(phi) * Math.cos(theta),
    )
    camera.lookAt(target.x, target.y, target.z)
  })

  return null
}

/* ─── Terrain mesh with computed heightfield ─── */
const TerrainMesh = memo(function TerrainMesh({ nodes, cascadeState, isMasteryCascade }) {
  const meshRef = useRef()
  const shaderRef = useRef()
  const cascadeRadiusRef = useRef(0)
  const cascadeStartRef = useRef(0)

  // Build heightfield from node health
  const { geometry, maxHeight, peakPositions3D } = useMemo(() => {
    const segments = 128
    const worldSize = 10
    const geo = new THREE.PlaneGeometry(worldSize, worldSize, segments, segments)
    geo.rotateX(-Math.PI / 2) // Lay flat

    const posAttr = geo.attributes.position
    let maxH = 0

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i) + worldSize / 2 // 0..10
      const vz = posAttr.getZ(i) + worldSize / 2 // 0..10

      let height = 0
      nodes.forEach(node => {
        const dp = DOMAIN_POSITIONS[node.id]
        if (!dp) return

        const healthPct = node.state === 'locked' ? 0 : (node.healthPct || 0)
        const dx = vx - dp[0]
        const dz = vz - dp[1]
        const distSq = dx * dx + dz * dz
        const sigma = 1.2
        const contribution = healthPct * 3.0 * Math.exp(-distSq / (2 * sigma * sigma))
        height = Math.max(height, contribution)
      })

      posAttr.setY(i, height)
      if (height > maxH) maxH = height
    }

    posAttr.needsUpdate = true
    geo.computeVertexNormals()

    // Compute 3D peak positions for labels
    const peaks = {}
    nodes.forEach(node => {
      const dp = DOMAIN_POSITIONS[node.id]
      if (!dp) return
      const healthPct = node.state === 'locked' ? 0 : (node.healthPct || 0)
      const peakHeight = healthPct * 3.0
      peaks[node.id] = [dp[0] - worldSize / 2, peakHeight, dp[1] - worldSize / 2]
    })

    return { geometry: geo, maxHeight: maxH, peakPositions3D: peaks }
  }, [nodes])

  // Cascade animation
  useEffect(() => {
    if (cascadeState.active && cascadeState.source) {
      cascadeRadiusRef.current = 0
      cascadeStartRef.current = performance.now()
    }
  }, [cascadeState.active, cascadeState.source])

  useFrame(() => {
    if (!shaderRef.current) return
    const uniforms = shaderRef.current.uniforms

    if (cascadeState.active && cascadeState.source) {
      const elapsed = (performance.now() - cascadeStartRef.current) / 1000
      cascadeRadiusRef.current = elapsed * 3.0 // Expand at 3 units/sec
      uniforms.uCascadeRadius.value = cascadeRadiusRef.current
      uniforms.uCascadeActive.value = cascadeRadiusRef.current < 12 ? 1.0 : 0.0

      const sourcePos = DOMAIN_POSITIONS[cascadeState.source]
      if (sourcePos) {
        uniforms.uCascadeCenter.value.set(sourcePos[0] - 5, 0, sourcePos[1] - 5)
      }
      uniforms.uCascadeColor.value.set(
        ...(isMasteryCascade ? [1, 0.84, 0] : [1, 0.27, 0.27])
      )
    } else {
      uniforms.uCascadeActive.value = 0.0
    }
  })

  const shaderUniforms = useMemo(() => ({
    uCascadeRadius: { value: 0 },
    uCascadeCenter: { value: new THREE.Vector3(0, 0, 0) },
    uCascadeColor: { value: new THREE.Vector3(1, 0.27, 0.27) },
    uCascadeActive: { value: 0 },
    uMaxHeight: { value: maxHeight },
  }), [maxHeight])

  return (
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <shaderMaterial
          ref={shaderRef}
          vertexShader={terrainVertexShader}
          fragmentShader={terrainFragmentShader}
          uniforms={shaderUniforms}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Peak labels */}
      {nodes.map(node => {
        const peakPos = peakPositions3D[node.id]
        if (!peakPos) return null
        const domainColor = DOMAIN_COLORS[node.id] || '#888'

        return (
          <Billboard key={`label-${node.id}`} position={[peakPos[0], peakPos[1] + 0.4, peakPos[2]]}>
            <Text fontSize={0.25} color={domainColor} anchorX="center" anchorY="bottom" fontWeight="bold">
              {node.name}
            </Text>
            <Text fontSize={0.16} color="#aaa" anchorX="center" anchorY="top" position={[0, -0.05, 0]}>
              {(node.avg || 0).toFixed(1)}/3
            </Text>
          </Billboard>
        )
      })}
    </>
  )
})

/* ─── Water plane at locked height ─── */
const WaterPlane = memo(function WaterPlane() {
  return (
    <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial
        color="#1a3a5a"
        transparent
        opacity={0.5}
        metalness={0.9}
        roughness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
})

/* ─── Edge paths — luminous tubes between peaks ─── */
const EdgePaths = memo(function EdgePaths({ nodes, cascadeState, isMasteryCascade }) {
  const tubes = useMemo(() => {
    return EDGES.map((edge, i) => {
      const fromDp = DOMAIN_POSITIONS[edge.from]
      const toDp = DOMAIN_POSITIONS[edge.to]
      if (!fromDp || !toDp) return null

      const fromNode = nodes.find(n => n.id === edge.from)
      const toNode = nodes.find(n => n.id === edge.to)
      const fromH = (fromNode?.state === 'locked' ? 0 : (fromNode?.healthPct || 0)) * 3.0
      const toH = (toNode?.state === 'locked' ? 0 : (toNode?.healthPct || 0)) * 3.0

      const start = new THREE.Vector3(fromDp[0] - 5, fromH + 0.1, fromDp[1] - 5)
      const end = new THREE.Vector3(toDp[0] - 5, toH + 0.1, toDp[1] - 5)
      const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
      mid.y += 0.5

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      const geo = new THREE.TubeGeometry(curve, 16, 0.03, 6, false)

      const isActive = cascadeState?.active && (
        (edge.from === cascadeState.source || cascadeState.affected?.[edge.from]) &&
        cascadeState.affected?.[edge.to]
      )

      const color = isActive
        ? (isMasteryCascade ? '#ffd700' : '#ff4444')
        : DOMAIN_COLORS[edge.from] || '#556'

      return { geo, color, opacity: isActive ? 0.7 : 0.3, key: `edge-${i}` }
    }).filter(Boolean)
  }, [nodes, cascadeState, isMasteryCascade])

  return (
    <>
      {tubes.map(t => (
        <mesh key={t.key} geometry={t.geo}>
          <meshBasicMaterial color={t.color} transparent opacity={t.opacity} />
        </mesh>
      ))}
    </>
  )
})

/* ─── Main terrain map component ─── */
export default memo(function CascadeTerrainMap({
  nodes = [],
  edges = [],
  cascadeState = {},
  isMasteryCascade = false,
  onNodeClick,
  mode = 'live',
  pathChain = null,
  pathReadiness = null,
  heatmapOn = false,
  hasData = false,
}) {
  const containerRef = useRef(null)

  // Camera spherical coords
  const thetaRef = useRef(0)
  const phiRef = useRef(0.8)
  const radiusRef = useRef(12)
  const targetRef = useRef({ x: 0, y: 1, z: 0 })
  const pointerRef = useRef({ down: false, lastX: 0, lastY: 0 })
  const pinchRef = useRef({ active: false, startDist: 0, startRadius: 12 })

  const handlePointerDown = useCallback((e) => {
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = {
        active: true,
        startDist: Math.sqrt(dx * dx + dy * dy),
        startRadius: radiusRef.current,
      }
      return
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    pointerRef.current = { down: true, lastX: clientX, lastY: clientY }
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (e.touches && e.touches.length === 2 && pinchRef.current.active) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      radiusRef.current = Math.max(5, Math.min(25, pinchRef.current.startRadius * (pinchRef.current.startDist / dist)))
      return
    }

    if (!pointerRef.current.down) return

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const dx = clientX - pointerRef.current.lastX
    const dy = clientY - pointerRef.current.lastY
    pointerRef.current.lastX = clientX
    pointerRef.current.lastY = clientY

    thetaRef.current += dx * 0.005
    phiRef.current = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, phiRef.current - dy * 0.005))
  }, [])

  const handlePointerUp = useCallback(() => {
    pointerRef.current.down = false
    pinchRef.current.active = false
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    radiusRef.current = Math.max(5, Math.min(25, radiusRef.current + e.deltaY * 0.01))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: 400, touchAction: 'none' }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 10, 10], fov: 50 }}
        style={{ background: 'linear-gradient(180deg, #0a0a14 0%, #0e1020 50%, #0a0a14 100%)' }}
        frameloop="always"
        dpr={[1, 1.5]}
      >
        <TerrainCameraRig
          thetaRef={thetaRef}
          phiRef={phiRef}
          radiusRef={radiusRef}
          targetRef={targetRef}
        />

        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} color="#ffe8cc" />
        <directionalLight position={[-3, 8, -3]} intensity={0.3} color="#b5c8e8" />
        <fog attach="fog" args={['#0a0a14', 15, 40]} />

        <TerrainMesh
          nodes={nodes}
          cascadeState={cascadeState}
          isMasteryCascade={isMasteryCascade}
        />

        <WaterPlane />

        <EdgePaths
          nodes={nodes}
          cascadeState={cascadeState}
          isMasteryCascade={isMasteryCascade}
        />
      </Canvas>

      {/* Hint */}
      <div className="absolute bottom-3 left-3 text-[10px] text-gray-600 pointer-events-none">
        Drag to orbit · Scroll to zoom · Heights = domain mastery
      </div>
    </div>
  )
})
