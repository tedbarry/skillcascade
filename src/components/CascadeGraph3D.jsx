import { useRef, useMemo, useState, useCallback, useEffect, memo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const STATE_COLORS = {
  locked: '#444444',
  blocked: '#8b4444',
  'needs-work': '#e8928a',
  developing: '#e5b76a',
  mastered: '#7fb589',
}

// Wider spread for cinematic feel
const NODE_LAYOUT_3D = {
  d1: [0, 0, 0],
  d2: [-1.5, 1.8, 0.9],
  d3: [1.2, 3.6, -1.2],
  d4: [-0.5, 5.4, 1.5],
  d5: [1.8, 7.2, 0.5],
  d6: [-1.2, 9.0, -0.9],
  d7: [0, 10.8, 0],
  d8: [-3.3, 5.4, -1.8],
  d9: [3.3, 5.4, 1.8],
}

const EDGES = [
  { from: 'd1', to: 'd2', type: 'primary' },
  { from: 'd2', to: 'd3', type: 'primary' },
  { from: 'd3', to: 'd4', type: 'primary' },
  { from: 'd4', to: 'd5', type: 'primary' },
  { from: 'd5', to: 'd6', type: 'primary' },
  { from: 'd6', to: 'd7', type: 'primary' },
  { from: 'd2', to: 'd6', type: 'secondary' },
  { from: 'd3', to: 'd7', type: 'secondary' },
]

/* ─── Custom CameraRig — no OrbitControls, no zoom bug ─── */
function CameraRig({ thetaRef, phiRef, radiusRef, targetRef }) {
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

/* ─── Star field background ─── */
const StarField = memo(function StarField() {
  const starsGeo = useMemo(() => {
    const positions = new Float32Array(500 * 3)
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 40 + Math.random() * 20
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <points geometry={starsGeo}>
      <pointsMaterial color="#ffffff" size={0.08} transparent opacity={0.6} sizeAttenuation />
    </points>
  )
})

/* ─── Cinematic node: icosahedron wireframe shell + glass inner core + point light ─── */
const CinematicNode = memo(function CinematicNode({ node, position, isSource, cascadeState, isMasteryCascade, onClick }) {
  const groupRef = useRef()
  const shellRef = useRef()
  const [hovered, setHovered] = useState(false)
  const domainColor = DOMAIN_COLORS[node.id] || '#888'
  const stateColor = STATE_COLORS[node.state] || '#444'

  const color = useMemo(() => {
    if (cascadeState?.active) {
      if (isSource) return isMasteryCascade ? '#ffd700' : '#ff4444'
      if (cascadeState.affected?.[node.id]) {
        const intensity = cascadeState.affected[node.id].impactStrength
        return isMasteryCascade
          ? new THREE.Color('#ffd700').lerp(new THREE.Color(domainColor), 1 - intensity).getStyle()
          : new THREE.Color('#ff4444').lerp(new THREE.Color(domainColor), 1 - intensity).getStyle()
      }
    }
    return node.state === 'mastered' ? domainColor : stateColor
  }, [node.id, node.state, cascadeState, isSource, isMasteryCascade, domainColor, stateColor])

  const sphereSize = node.healthPct > 0 ? 0.4 + node.healthPct * 0.2 : 0.4
  const emissiveIntensity = isSource ? 2.0 : hovered ? 1.0 : node.state === 'mastered' ? 0.6 : 0.2
  const lightIntensity = isSource ? 3.0 : hovered ? 1.5 : 0.5

  return (
    <group ref={groupRef} position={position}>
      {/* Outer wireframe shell — low-poly icosahedron */}
      <mesh ref={shellRef} scale={1.4}>
        <icosahedronGeometry args={[sphereSize, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={hovered ? 0.4 : 0.2} />
      </mesh>

      {/* Inner glass core */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick?.(node.id) }}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <sphereGeometry args={[sphereSize, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.1}
          metalness={0.3}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={0.3}
          ior={1.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Point light for domain color glow */}
      <pointLight color={color} intensity={lightIntensity} distance={4} decay={2} />

      {/* Domain label */}
      <Billboard position={[0, sphereSize + 0.35, 0]}>
        <Text fontSize={0.2} color="#ddd" anchorX="center" anchorY="bottom" fontWeight="bold">
          {node.name}
        </Text>
      </Billboard>

      {/* Score label */}
      <Billboard position={[0, -(sphereSize + 0.18), 0]}>
        <Text fontSize={0.14} color={domainColor} anchorX="center" anchorY="top">
          D{node.domain} · {(node.avg || 0).toFixed(1)}/3
        </Text>
      </Billboard>
    </group>
  )
})

/* ─── Cinematic edge: tube geometry with emissive material ─── */
const CinematicEdge = memo(function CinematicEdge({ from, to, color, opacity, isActive, isMasteryCascade }) {
  const tubeGeo = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
    mid.x *= 0.7
    mid.z *= 0.7
    mid.y += 0.4
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    return new THREE.TubeGeometry(curve, 24, isActive ? 0.04 : 0.02, 6, false)
  }, [from, to, isActive])

  return (
    <mesh geometry={tubeGeo}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
})

/* ─── Edge particle flow — the one useFrame in scene ─── */
function EdgeParticles({ edges: edgeDefs, nodePositions, cascadeState, isMasteryCascade }) {
  const meshRef = useRef()
  const particleCount = edgeDefs.length * 8 // 8 particles per edge
  const frameCounter = useRef(0)

  const { positions: initPositions, curves, edgeMap } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const curves = []
    const edgeMap = []

    edgeDefs.forEach((edge, ei) => {
      const fromPos = nodePositions[edge.from]
      const toPos = nodePositions[edge.to]
      if (!fromPos || !toPos) return

      const start = new THREE.Vector3(...fromPos)
      const end = new THREE.Vector3(...toPos)
      const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
      mid.x *= 0.7; mid.z *= 0.7; mid.y += 0.4
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      curves.push(curve)

      for (let i = 0; i < 8; i++) {
        const idx = ei * 8 + i
        const t = i / 8
        const pt = curve.getPoint(t)
        pos[idx * 3] = pt.x
        pos[idx * 3 + 1] = pt.y
        pos[idx * 3 + 2] = pt.z
        edgeMap.push({ curveIndex: curves.length - 1, t, speed: 0.004 + Math.random() * 0.003, edgeDef: edge })
      }
    })

    return { positions: pos, curves, edgeMap }
  }, [edgeDefs, nodePositions, particleCount])

  useFrame(() => {
    // Throttle to ~30fps
    frameCounter.current++
    if (frameCounter.current % 2 !== 0) return

    if (!meshRef.current) return
    const geo = meshRef.current.geometry
    const posAttr = geo.attributes.position

    edgeMap.forEach((em, i) => {
      const curve = curves[em.curveIndex]
      if (!curve) return

      const isActive = cascadeState?.active && (
        (em.edgeDef.from === cascadeState.source || cascadeState.affected?.[em.edgeDef.from]) &&
        cascadeState.affected?.[em.edgeDef.to]
      )

      const speedMult = isActive ? 2.5 : 1
      em.t = (em.t + em.speed * speedMult) % 1
      const pt = curve.getPoint(em.t)
      posAttr.setXYZ(i, pt.x, pt.y, pt.z)
    })

    posAttr.needsUpdate = true
  })

  const particleColor = useMemo(() => {
    if (cascadeState?.active) return isMasteryCascade ? '#ffd700' : '#ff8866'
    return '#6889b5'
  }, [cascadeState?.active, isMasteryCascade])

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={initPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={particleColor} size={0.06} transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}

/* ─── Scene content (memoized) ─── */
const SceneContent = memo(function SceneContent({ nodes, cascadeState, isMasteryCascade, onNodeClick }) {
  const nodePositions = useMemo(() => {
    const pos = {}
    nodes.forEach(node => {
      const layout = NODE_LAYOUT_3D[node.id]
      if (layout) pos[node.id] = layout
    })
    return pos
  }, [nodes])

  return (
    <>
      <StarField />

      {/* Fog for depth */}
      <fog attach="fog" args={['#080810', 15, 50]} />

      {/* Lights */}
      <ambientLight intensity={0.15} />
      <pointLight position={[8, 15, 8]} intensity={0.6} color="#6889b5" />
      <pointLight position={[-8, 8, -8]} intensity={0.3} color="#a86e9a" />
      <directionalLight position={[0, 10, 5]} intensity={0.2} color="#ffffff" />

      {/* Edges */}
      {EDGES.map((edge, i) => {
        const fromPos = nodePositions[edge.from]
        const toPos = nodePositions[edge.to]
        if (!fromPos || !toPos) return null

        const isActive = cascadeState?.active && (
          (edge.from === cascadeState.source || cascadeState.affected?.[edge.from]) &&
          cascadeState.affected?.[edge.to]
        )

        const edgeColor = isActive
          ? (isMasteryCascade ? '#ffd700' : '#ff4444')
          : edge.type === 'secondary' ? '#445' : '#556'

        return (
          <CinematicEdge
            key={`edge-${i}`}
            from={fromPos}
            to={toPos}
            color={edgeColor}
            opacity={isActive ? 0.7 : 0.25}
            isActive={isActive}
            isMasteryCascade={isMasteryCascade}
          />
        )
      })}

      {/* Edge particles */}
      <EdgeParticles
        edges={EDGES}
        nodePositions={nodePositions}
        cascadeState={cascadeState}
        isMasteryCascade={isMasteryCascade}
      />

      {/* Nodes */}
      {nodes.map(node => {
        const position = nodePositions[node.id]
        if (!position) return null
        return (
          <CinematicNode
            key={node.id}
            node={node}
            position={position}
            isSource={cascadeState?.source === node.id}
            cascadeState={cascadeState}
            isMasteryCascade={isMasteryCascade}
            onClick={onNodeClick}
          />
        )
      })}
    </>
  )
})

/* ─── Main 3D graph component ─── */
export default memo(function CascadeGraph3D({
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

  // Camera spherical coords stored in refs — no React state, no re-renders
  const thetaRef = useRef(0.5)
  const phiRef = useRef(1.0)
  const radiusRef = useRef(16)
  const targetRef = useRef({ x: 0, y: 5.4, z: 0 })
  const pointerRef = useRef({ down: false, lastX: 0, lastY: 0 })
  const pinchRef = useRef({ active: false, startDist: 0, startRadius: 16 })

  // Pointer events on wrapping div (NOT on R3F canvas) to avoid invalidate() storms
  const handlePointerDown = useCallback((e) => {
    if (e.target.tagName === 'CANVAS') {
      // Let R3F handle click-through for node clicks
    }

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
      radiusRef.current = Math.max(6, Math.min(35, pinchRef.current.startRadius * (pinchRef.current.startDist / dist)))
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
    phiRef.current = Math.max(0.2, Math.min(Math.PI - 0.2, phiRef.current - dy * 0.005))
  }, [])

  const handlePointerUp = useCallback(() => {
    pointerRef.current.down = false
    pinchRef.current.active = false
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    radiusRef.current = Math.max(6, Math.min(35, radiusRef.current + e.deltaY * 0.01))
  }, [])

  // Attach wheel with passive: false
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
        camera={{ position: [5, 8, 12], fov: 45 }}
        style={{ background: 'linear-gradient(180deg, #060610 0%, #0a0a18 50%, #060610 100%)' }}
        frameloop="always"
        dpr={[1, 1.5]}
      >
        <CameraRig
          thetaRef={thetaRef}
          phiRef={phiRef}
          radiusRef={radiusRef}
          targetRef={targetRef}
        />

        <SceneContent
          nodes={nodes}
          cascadeState={cascadeState}
          isMasteryCascade={isMasteryCascade}
          onNodeClick={onNodeClick}
        />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.4}
            luminanceSmoothing={0.9}
            intensity={0.8}
          />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      </Canvas>

      <div className="absolute bottom-3 left-3 text-[10px] text-gray-600 pointer-events-none">
        Drag to orbit · Scroll to zoom · Click node to cascade
      </div>
    </div>
  )
})
