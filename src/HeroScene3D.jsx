import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ═══════════════════════════════════════
   FLOWING WAVE MESH — Premium undulating grid
   ═══════════════════════════════════════ */
const WaveMesh = () => {
    const meshRef = useRef()
    const cols = 80
    const rows = 80

    const { positions, indices } = useMemo(() => {
        const pos = []
        const idx = []
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const x = (j / (cols - 1) - 0.5) * 18
                const z = (i / (rows - 1) - 0.5) * 14
                pos.push(x, 0, z)
            }
        }
        for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < cols - 1; j++) {
                const a = i * cols + j
                const b = a + 1
                const c = a + cols
                const d = c + 1
                idx.push(a, b, c)
                idx.push(b, d, c)
            }
        }
        return {
            positions: new Float32Array(pos),
            indices: new Uint32Array(idx)
        }
    }, [])

    const colors = useMemo(() => {
        const clr = new Float32Array(rows * cols * 3)
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const idx = (i * cols + j) * 3
                const cx = j / cols
                const cz = i / rows
                // Purple to cyan gradient
                clr[idx] = 0.48 * (1 - cx) + 0.02 * cx      // R
                clr[idx + 1] = 0.23 * (1 - cx) + 0.71 * cx   // G
                clr[idx + 2] = 0.93 * (1 - cx) + 0.83 * cx   // B
            }
        }
        return clr
    }, [])

    useFrame((state) => {
        if (!meshRef.current) return
        const posArray = meshRef.current.geometry.attributes.position.array
        const t = state.clock.elapsedTime

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const idx = (i * cols + j) * 3
                const x = posArray[idx]
                const z = posArray[idx + 2]

                // Multiple wave layers for organic movement
                posArray[idx + 1] =
                    Math.sin(x * 0.4 + t * 0.5) * 0.3 +
                    Math.cos(z * 0.5 + t * 0.3) * 0.25 +
                    Math.sin((x + z) * 0.3 + t * 0.4) * 0.15
            }
        }
        meshRef.current.geometry.attributes.position.needsUpdate = true
        meshRef.current.geometry.computeVertexNormals()
    })

    return (
        <mesh ref={meshRef} position={[0, -2.5, -3]} rotation={[-0.4, 0, 0]}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={rows * cols} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={rows * cols} array={colors} itemSize={3} />
                <bufferAttribute attach="index" count={indices.length} array={indices} itemSize={1} />
            </bufferGeometry>
            <meshStandardMaterial
                vertexColors
                wireframe
                transparent
                opacity={0.12}
                emissive="#7C3AED"
                emissiveIntensity={0.3}
            />
        </mesh>
    )
}

/* ═══════════════════════════════════════
   RISING PARTICLES — Floating upward glow
   ═══════════════════════════════════════ */
const RisingParticles = () => {
    const pointsRef = useRef()
    const count = 120

    const { positions, speeds, offsets } = useMemo(() => {
        const pos = new Float32Array(count * 3)
        const spd = []
        const off = []
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 16
            pos[i * 3 + 1] = Math.random() * 10 - 5
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2
            spd.push(0.2 + Math.random() * 0.5)
            off.push(Math.random() * Math.PI * 2)
        }
        return { positions: pos, speeds: spd, offsets: off }
    }, [])

    useFrame((state) => {
        if (!pointsRef.current) return
        const posArray = pointsRef.current.geometry.attributes.position.array
        const t = state.clock.elapsedTime

        for (let i = 0; i < count; i++) {
            // Slowly rise upward
            posArray[i * 3 + 1] += speeds[i] * 0.008
            // Gentle horizontal sway
            posArray[i * 3] += Math.sin(t * 0.5 + offsets[i]) * 0.002

            // Reset if too high
            if (posArray[i * 3 + 1] > 6) {
                posArray[i * 3 + 1] = -5
                posArray[i * 3] = (Math.random() - 0.5) * 16
            }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
                size={0.04}
                color="#8B5CF6"
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    )
}

/* ═══════════════════════════════════════
   FLOATING GRADIENT SPHERE — Ambient glow
   ═══════════════════════════════════════ */
const GlowOrb = ({ position, color, size, speed }) => {
    const meshRef = useRef()

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.5
            meshRef.current.position.x = position[0] + Math.cos(state.clock.elapsedTime * speed * 0.7) * 0.3
        }
    })

    return (
        <mesh ref={meshRef} position={position}>
            <sphereGeometry args={[size, 32, 32]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.5}
                transparent
                opacity={0.08}
            />
        </mesh>
    )
}

/* ═══════════════════════════════════════
   CONNECTING LINES — Data flow visualization
   ═══════════════════════════════════════ */
const DataLines = () => {
    const groupRef = useRef()

    const lines = useMemo(() => {
        const result = []
        for (let i = 0; i < 8; i++) {
            const points = []
            const startX = (Math.random() - 0.5) * 12
            const startY = (Math.random() - 0.5) * 6
            for (let j = 0; j < 20; j++) {
                points.push(new THREE.Vector3(
                    startX + (j / 19) * (Math.random() * 4 - 2),
                    startY + Math.sin(j * 0.5) * 0.8,
                    -3 + Math.random() * 2
                ))
            }
            const curve = new THREE.CatmullRomCurve3(points)
            result.push({
                geometry: new THREE.TubeGeometry(curve, 40, 0.006, 8, false),
                opacity: 0.06 + Math.random() * 0.08,
                color: Math.random() > 0.5 ? '#7C3AED' : '#06B6D4'
            })
        }
        return result
    }, [])

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.02) * 0.05
        }
    })

    return (
        <group ref={groupRef}>
            {lines.map((line, i) => (
                <mesh key={i} geometry={line.geometry}>
                    <meshStandardMaterial
                        color={line.color}
                        emissive={line.color}
                        emissiveIntensity={2}
                        transparent
                        opacity={line.opacity}
                    />
                </mesh>
            ))}
        </group>
    )
}

/* ═══════════════════════════════════════
   MAIN SCENE
   ═══════════════════════════════════════ */
const HeroScene3D = () => {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            pointerEvents: 'none',
        }}>
            <Canvas
                camera={{ position: [0, 1, 8], fov: 50 }}
                dpr={[1, 1.5]}
                gl={{ alpha: true, antialias: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.1} />
                <pointLight position={[5, 5, 5]} intensity={0.5} color="#7C3AED" distance={20} />
                <pointLight position={[-5, 3, 3]} intensity={0.3} color="#06B6D4" distance={15} />

                {/* Flowing wireframe wave mesh */}
                <WaveMesh />

                {/* Subtle data flow lines */}
                <DataLines />

                {/* Rising particles */}
                <RisingParticles />

                {/* Ambient glow orbs */}
                <GlowOrb position={[-4, 1, -2]} color="#7C3AED" size={2} speed={0.4} />
                <GlowOrb position={[4, -1, -3]} color="#06B6D4" size={1.8} speed={0.6} />
                <GlowOrb position={[0, 2, -4]} color="#8B5CF6" size={1.5} speed={0.3} />
            </Canvas>
        </div>
    )
}

export default HeroScene3D
