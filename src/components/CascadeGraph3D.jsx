import { useRef, useMemo, useState, useCallback, memo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Billboard } from '@react-three/drei'
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

// 3D node positions — spiral helix layout
const NODE_LAYOUT_3D = {
  d1: [0, 0, 0],
  d2: [-1.0, 1.2, 0.6],
  d3: [0.8, 2.4, -0.8],
  d4: [-0.3, 3.6, 1.0],
  d5: [1.2, 4.8, 0.3],
  d6: [-0.8, 6.0, -0.6],
  d7: [0, 7.2, 0],
  d8: [-2.2, 3.6, -1.2],
  d9: [2.2, 3.6, 1.2],
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

/* ─── Static scene content (memoized to prevent re-renders) ─── */
const SceneContent = memo(function SceneContent({ nodes, cascadeState, isMasteryCascade, onNodeClick }) {
  const nodePositions = useMemo(() => {
    const pos = {}
    nodes.forEach((node) => {
      const layout = NODE_LAYOUT_3D[node.id]
      if (layout) pos[node.id] = layout
    })
    return pos
  }, [nodes])

  return (
    <>
      {/* Tier ring indicators */}
      {[0, 1.2, 2.4, 3.6, 4.8, 6.0, 7.2].map((y, i) => (
        <mesh key={`ring-${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 2.85, 64]} />
          <meshBasicMaterial color="#334" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Edge connections */}
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
          <EdgeLine
            key={`edge-${i}`}
            from={fromPos}
            to={toPos}
            color={edgeColor}
            opacity={isActive ? 0.6 : 0.2}
          />
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

/* ─── Glowing sphere node ─── */
function DomainNode({ node, position, isSource, cascadeState, isMasteryCascade, onClick }) {
  const meshRef = useRef()
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

  const sphereSize = node.healthPct > 0 ? 0.35 + node.healthPct * 0.15 : 0.35

  return (
    <group position={position}>
      {/* Glow sphere */}
      <mesh scale={1.3}>
        <sphereGeometry args={[sphereSize, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(node.id) }}
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
      <Billboard position={[0, sphereSize + 0.22, 0]}>
        <Text fontSize={0.18} color="#ccc" anchorX="center" anchorY="bottom">
          {node.name}
        </Text>
      </Billboard>

      {/* Domain number */}
      <Billboard position={[0, -(sphereSize + 0.12), 0]}>
        <Text fontSize={0.13} color={domainColor} anchorX="center" anchorY="top">
          D{node.domain}
        </Text>
      </Billboard>
    </group>
  )
}

/* ─── Edge connection line ─── */
function EdgeLine({ from, to, color, opacity }) {
  const geometry = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5)
    mid.x *= 0.7
    mid.z *= 0.7
    mid.y += 0.3
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(24))
  }, [from, to])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  )
}

/* ─── Main 3D graph component ─── */
export default memo(function CascadeGraph3D({
  nodes = [],
  cascadeState = {},
  isMasteryCascade = false,
  onNodeClick,
}) {
  const controlsRef = useRef()

  return (
    <div
      className="w-full h-full relative"
      style={{ minHeight: 400, touchAction: 'none' }}
    >
      <Canvas
        camera={{ position: [5, 5, 6], fov: 45 }}
        style={{ background: 'linear-gradient(180deg, #0a0a10 0%, #12121a 50%, #0a0a10 100%)', touchAction: 'none' }}
        frameloop="demand"
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 10, 5]} intensity={0.8} color="#6889b5" />
        <pointLight position={[-5, 5, -5]} intensity={0.4} color="#a86e9a" />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping={false}
          enableZoom
          enablePan={false}
        />

        <SceneContent
          nodes={nodes}
          cascadeState={cascadeState}
          isMasteryCascade={isMasteryCascade}
          onNodeClick={onNodeClick}
        />
      </Canvas>

      <div className="absolute bottom-3 left-3 text-[10px] text-gray-600 pointer-events-none">
        Drag to orbit {'\u00B7'} Scroll to zoom {'\u00B7'} Click node to cascade
      </div>
    </div>
  )
})
