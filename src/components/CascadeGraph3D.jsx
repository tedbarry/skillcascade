import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { framework, DOMAIN_DEPENDENCIES } from '../data/framework.js'

// Stable constants to avoid re-creating objects on every render
const ORBIT_TARGET = new THREE.Vector3(0, 3.6, 0)
const CAMERA_POSITION = [5, 5, 6]

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

// 3D node positions — spiral helix layout
// Y axis = tier (foundation at bottom), X/Z = spread
const NODE_LAYOUT_3D = {
  d1: { y: 0, x: 0, z: 0 },
  d2: { y: 1.2, x: -1.0, z: 0.6 },
  d3: { y: 2.4, x: 0.8, z: -0.8 },
  d4: { y: 3.6, x: -0.3, z: 1.0 },
  d5: { y: 4.8, x: 1.2, z: 0.3 },
  d6: { y: 6.0, x: -0.8, z: -0.6 },
  d7: { y: 7.2, x: 0, z: 0 },
  d8: { y: 3.6, x: -2.2, z: -1.2 },
  d9: { y: 3.6, x: 2.2, z: 1.2 },
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

/* ─── Glowing sphere node ─── */
function DomainNode({ node, position, isActive, isSource, cascadeState, isMasteryCascade, onClick }) {
  const meshRef = useRef()
  const glowRef = useRef()
  const [hovered, setHovered] = useState(false)
  const domainColor = DOMAIN_COLORS[node.id] || '#888'
  const stateColor = STATE_COLORS[node.state] || '#444'

  const color = useMemo(() => {
    if (cascadeState?.active) {
      if (isSource) return isMasteryCascade ? '#ffd700' : '#ff4444'
      if (cascadeState.affected[node.id]) {
        const intensity = cascadeState.affected[node.id].impactStrength
        return isMasteryCascade
          ? new THREE.Color('#ffd700').lerp(new THREE.Color(domainColor), 1 - intensity).getStyle()
          : new THREE.Color('#ff4444').lerp(new THREE.Color(domainColor), 1 - intensity).getStyle()
      }
    }
    return node.state === 'mastered' ? domainColor : stateColor
  }, [node, cascadeState, isSource, isMasteryCascade, domainColor, stateColor])

  const sphereSize = useMemo(() => {
    const base = 0.35
    if (node.healthPct > 0) return base + node.healthPct * 0.15
    return base
  }, [node.healthPct])

  useFrame((state) => {
    if (!meshRef.current) return
    // Gentle floating animation
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.05

    // Pulse glow for source nodes
    if (glowRef.current) {
      const scale = isSource
        ? 1.8 + Math.sin(state.clock.elapsedTime * 2) * 0.3
        : hovered ? 1.5 : 1.3
      glowRef.current.scale.setScalar(scale)
      glowRef.current.material.opacity = isSource ? 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.05 : 0.08
    }
  })

  return (
    <group>
      {/* Glow sphere */}
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[sphereSize, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => { e.stopPropagation(); onClick(node.id) }}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <sphereGeometry args={[sphereSize, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : isSource ? 0.8 : node.state === 'mastered' ? 0.4 : 0.15}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* Domain label */}
      <Billboard position={[position[0], position[1] + sphereSize + 0.22, position[2]]}>
        <Text
          fontSize={0.18}
          color="#ccc"
          anchorX="center"
          anchorY="bottom"
          font={undefined}
        >
          {node.name}
        </Text>
        {node.assessed > 0 && (
          <Text
            fontSize={0.12}
            color={domainColor}
            anchorX="center"
            anchorY="top"
            position={[0, -0.04, 0]}
          >
            {node.avg.toFixed(1)}/3
          </Text>
        )}
      </Billboard>

      {/* Domain number */}
      <Billboard position={[position[0], position[1] - sphereSize - 0.12, position[2]]}>
        <Text fontSize={0.13} color={domainColor} anchorX="center" anchorY="top" font={undefined}>
          D{node.domain}
        </Text>
      </Billboard>
    </group>
  )
}

/* ─── Edge connection line ─── */
function EdgeLine({ from, to, isActive, color, opacity, dashSize }) {
  const points = useMemo(() => {
    // Create a quadratic curve between the two points
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
    // Pull midpoint toward center and up slightly
    mid.x *= 0.7
    mid.z *= 0.7
    mid.y += 0.3

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    return curve.getPoints(24)
  }, [from, to])

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        linewidth={1}
      />
    </line>
  )
}

/* ─── Animated particle along edge ─── */
function EdgeParticle({ from, to, color, speed = 1 }) {
  const meshRef = useRef()
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
    mid.x *= 0.7
    mid.z *= 0.7
    mid.y += 0.3
    return new THREE.QuadraticBezierCurve3(start, mid, end)
  }, [from, to])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = (state.clock.elapsedTime * speed * 0.3) % 1
    const point = curve.getPoint(t)
    meshRef.current.position.copy(point)
    meshRef.current.material.opacity = Math.sin(t * Math.PI) * 0.8
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  )
}

/* ─── Tier ring indicators ─── */
function TierRings() {
  const tiers = [0, 1.2, 2.4, 3.6, 4.8, 6.0, 7.2]

  return (
    <group>
      {tiers.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 2.85, 64]} />
          <meshBasicMaterial color="#334" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

/* ─── Floating ambient particles ─── */
function AmbientParticles({ count = 60 }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 8,
      y: Math.random() * 8,
      z: (Math.random() - 0.5) * 8,
      speed: 0.2 + Math.random() * 0.5,
      size: 0.01 + Math.random() * 0.02,
    }))
  }, [count])

  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    const positions = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      const p = particles[i]
      positions.setY(i, p.y + Math.sin(state.clock.elapsedTime * p.speed + i) * 0.02)
    }
    positions.needsUpdate = true
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    particles.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    })
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [particles, count])

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#556" size={0.03} transparent opacity={0.4} sizeAttenuation />
    </points>
  )
}

/* ─── Main 3D graph component ─── */
export default function CascadeGraph3D({
  nodes = [],
  edges = [],
  cascadeState = {},
  isMasteryCascade = false,
  onNodeClick,
  hasData = false,
}) {
  const controlsRef = useRef()

  const nodePositions = useMemo(() => {
    const pos = {}
    nodes.forEach((node) => {
      const layout = NODE_LAYOUT_3D[node.id]
      if (layout) {
        pos[node.id] = [layout.x, layout.y, layout.z]
      }
    })
    return pos
  }, [nodes])

  const handleClick = useCallback((domainId) => {
    onNodeClick?.(domainId)
  }, [onNodeClick])

  return (
    <div className="w-full h-full relative" style={{ minHeight: 400 }}>
      <Canvas
        camera={{ position: CAMERA_POSITION, fov: 45 }}
        style={{ background: 'linear-gradient(180deg, #0a0a10 0%, #12121a 50%, #0a0a10 100%)' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 10, 5]} intensity={0.8} color="#6889b5" />
        <pointLight position={[-5, 5, -5]} intensity={0.4} color="#a86e9a" />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={14}
          target={ORBIT_TARGET}
          autoRotate={false}
          enableZoom={false}
        />

        {/* Tier rings */}
        <TierRings />

        {/* Ambient particles */}
        <AmbientParticles />

        {/* Edge connections */}
        {EDGES.map((edge, i) => {
          const fromPos = nodePositions[edge.from]
          const toPos = nodePositions[edge.to]
          if (!fromPos || !toPos) return null

          const isActive = cascadeState.active && (
            (edge.from === cascadeState.source || cascadeState.affected?.[edge.from]) &&
            cascadeState.affected?.[edge.to]
          )

          const edgeColor = isActive
            ? (isMasteryCascade ? '#ffd700' : '#ff4444')
            : edge.type === 'secondary' ? '#445' : '#556'

          return (
            <group key={`edge-${i}`}>
              <EdgeLine
                from={fromPos}
                to={toPos}
                isActive={isActive}
                color={edgeColor}
                opacity={isActive ? 0.6 : 0.2}
              />
              {isActive && (
                <>
                  <EdgeParticle from={fromPos} to={toPos} color={edgeColor} speed={1} />
                  <EdgeParticle from={fromPos} to={toPos} color={edgeColor} speed={1.5} />
                </>
              )}
            </group>
          )
        })}

        {/* Domain nodes */}
        {nodes.map((node) => {
          const position = nodePositions[node.id]
          if (!position) return null

          return (
            <DomainNode
              key={node.id}
              node={node}
              position={position}
              isActive={cascadeState.active}
              isSource={cascadeState.source === node.id}
              cascadeState={cascadeState}
              isMasteryCascade={isMasteryCascade}
              onClick={handleClick}
            />
          )
        })}
      </Canvas>

      {/* Overlay instructions */}
      <div className="absolute bottom-3 left-3 text-[10px] text-gray-600 pointer-events-none">
        Drag to orbit {'\u00B7'} Scroll to zoom {'\u00B7'} Click node to cascade
      </div>
    </div>
  )
}
