import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import './WaitingList.css'

/* ══════════════════════════════════════════════════
   FLOATING WAVE SHEET
══════════════════════════════════════════════════ */
const FloatingSheet = ({ yPos, flipY }) => {
    const meshRef = useRef()
    const dotsRef = useRef()

    const COLS = 38
    const ROWS = 22

    const { positions, indices } = useMemo(() => {
        const pos = [], idx = []
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                pos.push(
                    (j / (COLS - 1) - 0.5) * 34,
                    0,
                    (i / (ROWS - 1) - 0.5) * 14
                )
            }
        }
        for (let i = 0; i < ROWS - 1; i++) {
            for (let j = 0; j < COLS - 1; j++) {
                const a = i * COLS + j, b = a + 1, c = a + COLS, d = c + 1
                idx.push(a, b, c, b, d, c)
            }
        }
        return { positions: new Float32Array(pos), indices: new Uint32Array(idx) }
    }, [])

    const shared = useMemo(() => new Float32Array(positions), [positions])

    useFrame(({ clock }) => {
        if (!meshRef.current || !dotsRef.current) return
        const t = clock.elapsedTime
        const dir = flipY ? -1 : 1

        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                const k = (i * COLS + j) * 3
                const x = shared[k], z = shared[k + 2]
                shared[k + 1] =
                    Math.sin(x * 0.28 + t * 0.55) * 0.52 * dir +
                    Math.cos(z * 0.38 + t * 0.42) * 0.40 * dir +
                    Math.sin((x + z) * 0.20 + t * 0.32) * 0.28 * dir +
                    Math.cos(x * 0.55 - t * 0.48) * 0.18 * dir
            }
        }
        const mA = meshRef.current.geometry.attributes.position
        const dA = dotsRef.current.geometry.attributes.position
        mA.array.set(shared); mA.needsUpdate = true
        dA.array.set(shared); dA.needsUpdate = true
        meshRef.current.geometry.computeVertexNormals()
    })

    const tiltX = flipY ? 0.28 : -0.28

    return (
        <group position={[0, yPos, 0]} rotation={[tiltX, 0, 0]}>
            <mesh ref={meshRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={ROWS * COLS} array={new Float32Array(positions)} itemSize={3} />
                    <bufferAttribute attach="index" count={indices.length} array={indices} itemSize={1} />
                </bufferGeometry>
                <meshBasicMaterial color={0xffffff} wireframe transparent opacity={0.22} />
            </mesh>
            <points ref={dotsRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={ROWS * COLS} array={new Float32Array(positions)} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial color={0xffffff} size={0.09} transparent opacity={0.92} sizeAttenuation />
            </points>
        </group>
    )
}

const Scene = () => (
    <>
        <FloatingSheet yPos={4.4} flipY={true} />
        <FloatingSheet yPos={-4.4} flipY={false} />
    </>
)

/* ══════════════════════════════════════════════════
   ANIMATED COUNTER — counts up to target with easing
══════════════════════════════════════════════════ */
function AnimCounter({ target, duration = 1800 }) {
    const [val, setVal] = useState(target)
    const raf = useRef(null)

    useEffect(() => {
        const start = performance.now()
        const from = Math.max(0, target - 12)   // count up the last ~12 spots
        const step = (now) => {
            const p = Math.min((now - start) / duration, 1)
            // Ease out cubic
            const ease = 1 - Math.pow(1 - p, 3)
            setVal(Math.round(from + ease * (target - from)))
            if (p < 1) raf.current = requestAnimationFrame(step)
        }
        raf.current = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf.current)
    }, [target, duration])

    return <>{val.toLocaleString()}+</>
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function WaitingList({ onSkip }) {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    // ── Live stats from localStorage ──
    const getWaitlistCount = () => JSON.parse(localStorage.getItem('snapai_waitlist') || '[]').length
    const getToolCount = () => JSON.parse(localStorage.getItem('snapai_tools') || '[]').length
    const getRating = (wlCount) => {
        // Starts at 4.7, gains 0.01 per 100 joins, max 5.0
        const bonus = Math.min((wlCount / 100) * 0.01, 0.3)
        return Math.round((4.7 + bonus) * 10) / 10
    }

    const [liveCount, setLiveCount] = useState(getWaitlistCount())
    const [toolCount, setToolCount] = useState(getToolCount())
    const [rating, setRating] = useState(getRating(getWaitlistCount()))

    // Real member avatars — last 5 entries from waitlist
    const getMembers = () => JSON.parse(localStorage.getItem('snapai_waitlist') || '[]').slice(-5)
    const [members, setMembers] = useState(getMembers())

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!email.trim() || isSubmitting) return
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email.'); return }
        setError('')
        setIsSubmitting(true)
        const existing = JSON.parse(localStorage.getItem('snapai_waitlist') || '[]')
        if (!existing.some(en => en.email.toLowerCase() === email.toLowerCase()))
            existing.push({ email: email.trim(), joinedAt: new Date().toISOString() })
        localStorage.setItem('snapai_waitlist', JSON.stringify(existing))
        setTimeout(() => {
            const newWl = existing.length
            setLiveCount(newWl)
            setToolCount(getToolCount())
            setRating(getRating(newWl))
            setMembers(getMembers())   // refresh avatars
            setSubmitted(true)
            setIsSubmitting(false)
        }, 700)
    }

    return (
        <div className="wl-page">
            <div className="wl-canvas-bg">
                <Canvas
                    camera={{ position: [0, 0, 10], fov: 56, near: 0.1, far: 100 }}
                    dpr={[1, 2]}
                    gl={{ alpha: false, antialias: true }}
                    style={{ background: '#000' }}
                >
                    <Scene />
                </Canvas>
            </div>

            <div className="wl-overlay">
                <div className="wl-top-bar">
                    <div className="wl-logo">
                        <div className="wl-logo-icon">S</div>
                        <span>SnapAI<span className="wl-dot">.</span></span>
                    </div>
                </div>

                <div className="wl-center">
                    {!submitted ? (
                        <>
                            <div className="wl-pill">
                                <span className="wl-pulse-dot" />
                                Launching Feb 2025
                            </div>

                            <h1 className="wl-heading">
                                <span className="wl-line1">
                                    <span className="wl-line1-default">AI Tools.</span>
                                    <span className="wl-line1-hover">People</span>
                                </span>
                                <br />
                                <span className="wl-grad">On Demand.</span>
                            </h1>

                            <p className="wl-sub">
                                New AI tool every <strong>15 days</strong> — built by request.
                                <br />Join early for <strong>20% off</strong> + priority access.
                            </p>

                            <form className="wl-form" onSubmit={handleSubmit}>
                                <div className={`wl-input-wrap ${error ? 'err' : ''}`}>
                                    <input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setError('') }}
                                        required
                                        autoFocus
                                    />
                                    <button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? <span className="wl-spin" /> : 'Join Waitlist'}
                                    </button>
                                </div>
                                {error && <p className="wl-err">{error}</p>}
                            </form>

                            <div className="wl-social-proof">
                                {members.length > 0 && (
                                    <div className="wl-avatars">
                                        {members.map((m, i) => {
                                            const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#6d28d9', '#4c1d95']
                                            const letter = m.email.charAt(0).toUpperCase()
                                            return (
                                                <div
                                                    key={i}
                                                    className="wl-av"
                                                    title={m.email}
                                                    style={{
                                                        background: COLORS[i % COLORS.length],
                                                        marginLeft: i ? -9 : 0,
                                                        zIndex: members.length - i
                                                    }}
                                                >
                                                    {letter}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                <span>
                                    <strong className="wl-live-count">
                                        <AnimCounter target={liveCount} />
                                    </strong>{' '}already joined
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="wl-success">
                            <div className="wl-success-emoji">🎉</div>
                            <h2>You're in!</h2>
                            <p>We'll notify <strong>{email}</strong> on launch day.</p>
                            <p className="wl-success-perk">Early access + 20% off unlocked 🔓</p>
                        </div>
                    )}
                </div>

                <div className="wl-bottom-bar">
                    <div className="wl-stat">
                        <span>
                            {toolCount > 0
                                ? <AnimCounter target={toolCount} duration={1200} />
                                : '0+'}
                        </span>
                        Tools built
                    </div>
                    <div className="wl-stat-div" />
                    <div className="wl-stat">
                        <span>15</span>
                        Days/tool
                    </div>
                    <div className="wl-stat-div" />
                    <div className="wl-stat">
                        <span><AnimCounter target={liveCount} duration={1600} /></span>
                        Members
                    </div>
                    <div className="wl-stat-div" />
                    <div className="wl-stat">
                        <span>{rating.toFixed(1)}★</span>
                        Rating
                    </div>
                </div>
            </div>
        </div>
    )
}
