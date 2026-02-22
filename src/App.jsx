import React, { useState, useEffect, useRef } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase as _sb } from './supabase'
import HeroScene3D from './HeroScene3D'
import WaitingList from './WaitingList'
import './App.css'

// Initialize Gemini API
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are SnapAI Assistant, the helpful AI chatbot for SnapAI Labs — an AI tools company that builds on-demand AI tools every 15 days.

Current tools:
- AI Resume Builder (LIVE) — Builds professional resumes in 10 minutes via WhatsApp/Telegram chat
- AI Logo Maker (Coming Soon — 15 days)
- AI Email Writer (Coming Soon — 30 days)

Key facts about SnapAI Labs:
- We build AI tools based on user requests
- New tool every 15 days  
- 50+ requests fulfilled
- 4.9★ rating
- Users can request custom AI tools

Keep responses concise (2-3 sentences max), friendly, and helpful. Use emojis occasionally.`
})

// Retry helper for rate-limited requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function callGemini(userMessage, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const result = await model.generateContent(userMessage)
            const response = await result.response
            return response.text()
        } catch (err) {
            console.warn(`Attempt ${attempt + 1} failed:`, err.message || err)
            // If it's a quota/rate error, wait and retry
            if (err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("Resource has been exhausted")) {
                if (attempt < retries - 1) {
                    const waitTime = (attempt + 1) * 3000 // 3s, 6s, 9s
                    console.log(`Rate limited — retrying in ${waitTime / 1000}s...`)
                    await delay(waitTime)
                    continue
                }
            }
            throw err
        }
    }
    throw new Error("Max retries exceeded")
}

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 14, hours: 23, minutes: 59, seconds: 59 })

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
                if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 }
                return prev
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="countdown-container">
            <p className="countdown-label">Next Tool Launches In:</p>
            <div className="countdown-grid">
                {[
                    { label: 'Days', value: timeLeft.days },
                    { label: 'Hours', value: timeLeft.hours },
                    { label: 'Mins', value: timeLeft.minutes },
                    { label: 'Secs', value: timeLeft.seconds }
                ].map((item, idx) => (
                    <div key={idx} className="timer-box glass-morphism">
                        <span className="timer-num">{item.value.toString().padStart(2, '0')}</span>
                        <span className="timer-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        { role: 'ai', content: '👋 Hey! I am your SnapAI Assistant. How can I help you today?' }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const chatEndRef = useRef(null)

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async (text = input) => {
        if (!text.trim()) return

        const userMessage = { role: 'user', content: text }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsTyping(true)

        try {
            const aiText = await callGemini(text)
            setMessages(prev => [...prev, { role: 'ai', content: aiText }])
        } catch (error) {
            console.error("Gemini Error:", error)
            const errorMsg = error.message?.includes("API_KEY")
                ? "⚠️ API key issue. Please check your Gemini API key."
                : error.message?.includes("quota")
                    ? "⚠️ API quota exceeded. Please try again later."
                    : error.message?.includes("blocked")
                        ? "⚠️ Response was blocked by safety filters. Try rephrasing."
                        : `❌ Connection error: ${error.message || "Unknown error"}. Check browser console for details.`
            setMessages(prev => [...prev, { role: 'ai', content: errorMsg }])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className="chatbot-container">
            {isOpen && (
                <div className="chatbot-panel glass-morphism animate-fade-in">
                    <div className="chat-header">
                        <div className="bot-info">
                            <span className="bot-dot"></span>
                            <h4>SnapAI Assistant</h4>
                        </div>
                        <button onClick={() => setIsOpen(false)}>✕</button>
                    </div>
                    <div className="chat-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`message-bubble ${msg.role}`}>
                                {msg.content}
                            </div>
                        ))}
                        {isTyping && <div className="message-bubble ai italic">Thinking...</div>}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="quick-replies">
                        <button onClick={() => handleSend("🔧 Explore AI Tools")}>🔧 Tools</button>
                        <button onClick={() => handleSend("📝 Request a New Tool")}>📝 Request</button>
                        <button onClick={() => handleSend("📄 Try AI Resume Builder")}>📄 Resume</button>
                    </div>
                    <div className="chat-input-area">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                        />
                        <button onClick={() => handleSend()}>🚀</button>
                    </div>
                </div>
            )}
            <div className="chatbot-trigger" onClick={() => setIsOpen(!isOpen)}>
                <div className="ping-effect"></div>
                {isOpen ? '✕' : '💬'}
            </div>
        </div>
    )
}

// Default tools for first load
const DEFAULT_TOOLS = [
    { id: 1, name: 'AI Resume Builder', description: 'Get a professional resume in 10 minutes via chat', status: 'LIVE', icon: '📄', buttons: [{ name: 'WhatsApp', link: '#' }, { name: 'Telegram', link: '#' }], createdAt: new Date().toISOString() },
    { id: 2, name: 'AI Logo Maker', description: 'Create stunning brand assets in seconds', status: 'COMING SOON', icon: '🎨', buttons: [{ name: 'Notify Me', link: '' }], launchDays: '15 Days', createdAt: new Date().toISOString() },
    { id: 3, name: 'AI Email Writer', description: 'Perfect business emails instantly', status: 'COMING SOON', icon: '✉️', buttons: [{ name: 'Notify Me', link: '' }], launchDays: '30 Days', createdAt: new Date().toISOString() }
]


function App() {
    const [filter, setFilter] = useState('All')

    // Waitlist toggle — still a local admin preference
    const [showWaitlist, setShowWaitlist] = useState(() =>
        localStorage.getItem('snapai_waitlist_active') === 'true'
    )

    // Tools — loaded from Supabase
    const [tools, setTools] = useState(DEFAULT_TOOLS)

    // Request form state
    const [reqForm, setReqForm] = useState({ toolName: '', category: 'Productivity', description: '', email: '' })
    const [reqSubmitted, setReqSubmitted] = useState(false)

    // Load tools from Supabase + subscribe to changes
    useEffect(() => {
        const load = async () => {
            const { data } = await _sb.from('tools').select('*').order('created_at')
            if (data && data.length > 0) {
                setTools(data.map(row => ({
                    id: row.id, name: row.name, description: row.description,
                    status: row.status, icon: row.icon,
                    launchDays: row.launch_days, buttons: row.buttons || [],
                    createdAt: row.created_at
                })))
            }
        }
        load()

        const channel = _sb
            .channel('app-tools')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tools' }, load)
            .subscribe()

        // waitlist toggle key (local admin pref)
        const handleStorage = () =>
            setShowWaitlist(localStorage.getItem('snapai_waitlist_active') === 'true')
        window.addEventListener('storage', handleStorage)

        return () => { _sb.removeChannel(channel); window.removeEventListener('storage', handleStorage) }
    }, [])

    // If waitlist is active, show the waitlist page
    if (showWaitlist) {
        return <WaitingList onSkip={() => setShowWaitlist(false)} />
    }

    const handleRequestSubmit = async () => {
        if (!reqForm.toolName.trim() || !reqForm.email.trim()) return
        await _sb.from('requests').insert([{
            tool_name: reqForm.toolName,
            description: reqForm.description,
            category: reqForm.category,
            email: reqForm.email,
            submitted_at: new Date().toISOString()
        }])
        setReqForm({ toolName: '', category: 'Productivity', description: '', email: '' })
        setReqSubmitted(true)
        setTimeout(() => setReqSubmitted(false), 3000)
    }

    const filteredTools = filter === 'All' ? tools : tools.filter(t =>
        filter === 'Live' ? t.status === 'LIVE' : t.status === 'COMING SOON'
    )

    return (
        <div className="app-wrapper">
            <nav className="navbar glass-morphism">
                <div className="nav-container">
                    <div className="logo">SnapAI<span className="dot">.</span></div>
                    <div className="nav-links">
                        <a href="#tools">Tools</a>
                        <a href="#request">Request</a>
                        <a href="#about">About</a>
                    </div>
                    <div className="nav-btns">
                        <button className="btn-outlined">Demo</button>
                        <button className="btn-primary">Get Started</button>
                    </div>
                </div>
            </nav>

            <section className="hero">
                <div className="hero-halo"></div>
                <HeroScene3D />
                <div className="hero-content animate-fade-in">
                    <div className="launch-badge">🔥 NEW LAUNCH</div>
                    <h1 className="glowing-text">AI TOOLS<br />ON DEMAND</h1>
                    <p className="hero-sub">We Build What You Need. Every 15 Days.</p>
                    <div className="hero-actions">
                        <button className="btn-primary" onClick={() => window.location.href = '#tools'}>Explore Tools</button>
                        <button className="btn-outlined" onClick={() => window.location.href = '#request'}>Request a Tool</button>
                    </div>

                    <div className="latest-strip glass-morphism">
                        <span>⚡ LATEST: AI Resume Builder — Get yours in 10 Minutes</span>
                        <div className="strip-social">
                            <button className="wa">W</button>
                            <button className="tg">T</button>
                        </div>
                    </div>

                    <CountdownTimer />
                </div>
            </section>

            <section id="tools" className="section tools-showcase">
                <div className="section-header">
                    <h2>🚀 OUR AI TOOLS</h2>
                    <p>Built for real problems. Launched every 15 days.</p>
                </div>

                <div className="filter-tabs">
                    {['All', 'Live', 'Soon'].map(t => (
                        <button
                            key={t}
                            className={`tab ${filter === t ? 'active' : ''}`}
                            onClick={() => setFilter(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="tools-grid">
                    {filteredTools.map(tool => {
                        const btns = tool.buttons || [{ name: tool.buttonName || 'Try Now', link: tool.buttonLink || '#' }]
                        return (
                            <div key={tool.id} className={`tool-card glass-morphism ${tool.status === 'LIVE' ? 'live' : 'soon'}`}>
                                <div className="card-badge">{tool.status === 'COMING SOON' ? 'SOON' : tool.status}</div>
                                <div className="tool-icon">{tool.status === 'LIVE' ? tool.icon : '🔒'}</div>
                                <h3>{tool.name}</h3>
                                <p>{tool.description}</p>
                                {tool.status === 'LIVE' ? (
                                    <div className="card-btns">
                                        {btns.map((b, i) => (
                                            <a key={i} href={b.link || '#'} className="btn-wa" target="_blank" rel="noopener noreferrer">{b.name || 'Try Now'} ↗</a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="soon-footer">
                                        <span>🔒 Launches in {tool.launchDays || '15 Days'}</span>
                                        <button className="btn-notify">Notify Me</button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>

            <section id="request" className="section request-form-section">
                <div className="request-card glass-morphism">
                    <div className="section-header">
                        <h2>💡 REQUEST AN AI TOOL</h2>
                        <p className="gradient-text">"You Demand, We Supply"</p>
                    </div>
                    <form className="request-form" onSubmit={e => e.preventDefault()}>
                        <div className="form-group">
                            <label>What AI tool do you need?</label>
                            <input type="text" placeholder="e.g. AI Content Planner" value={reqForm.toolName} onChange={e => setReqForm({ ...reqForm, toolName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <select value={reqForm.category} onChange={e => setReqForm({ ...reqForm, category: e.target.value })}>
                                <option>Productivity</option>
                                <option>Creative</option>
                                <option>Business</option>
                                <option>Education</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Describe the problem</label>
                            <textarea rows="4" placeholder="Detail your requirements..." value={reqForm.description} onChange={e => setReqForm({ ...reqForm, description: e.target.value })}></textarea>
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" placeholder="you@example.com" value={reqForm.email} onChange={e => setReqForm({ ...reqForm, email: e.target.value })} required />
                        </div>
                        {reqSubmitted ? (
                            <div className="btn-primary w-full" style={{ textAlign: 'center', background: '#22c55e' }}>✅ Request Submitted!</div>
                        ) : (
                            <button type="button" className="btn-primary w-full" onClick={handleRequestSubmit}>Submit Request ✨</button>
                        )}
                    </form>
                    <div className="popular-tags">
                        <span>📊 Popular:</span>
                        {['AI Logo Maker', 'AI Email Writer', 'AI Interview Coach'].map(tag => (
                            <button key={tag} className="tag">{tag}</button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section featured-tool-section">
                <div className="featured-container">
                    <div className="phone-column">
                        <div className="phone-frame glass-morphism">
                            <div className="phone-screen">
                                <div className="chat-msg bot">Ready to build your resume?</div>
                                <div className="chat-msg user">Yes, let's start!</div>
                                <div className="chat-msg bot">Great! What's your name?</div>
                                <div className="live-stat">2,400+ builds today</div>
                            </div>
                        </div>
                    </div>
                    <div className="content-column">
                        <span className="featured-badge">🎯 FEATURED TOOL</span>
                        <h2>AI Resume Builder</h2>
                        <p className="tagline">"Like 10-Min Blinkit, But For Resumes"</p>
                        <div className="how-it-works">
                            {[
                                { n: '1️⃣', t: 'Open Meta Chat', d: 'Start on WhatsApp or Telegram' },
                                { n: '2️⃣', t: 'Quick Questions', d: 'Answer simple AI prompts' },
                                { n: '3️⃣', t: 'AI Engineering', d: 'Our AI crafts the layout' },
                                { n: '4️⃣', t: 'Instant Download', d: 'Get your PDF in minutes' }
                            ].map((s, i) => (
                                <div key={i} className="step">
                                    <span className="step-n">{s.n}</span>
                                    <div className="step-info">
                                        <h4>{s.t}</h4>
                                        <p>{s.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="featured-btns">
                            <button className="btn-wa-large">WhatsApp Start</button>
                            <button className="btn-tg-large">Telegram Start</button>
                        </div>
                    </div>
                </div>
            </section>

            <section id="about" className="section about-band">
                <div className="band-content">
                    <h2>Built on Demand. Powered by AI.</h2>
                    <p>We build what YOU actually need — fast.</p>
                    <div className="stats-row">
                        {[
                            { n: '01', l: 'Tools Launched', v: '3+' },
                            { n: '02', l: 'Requests', v: '50+' },
                            { n: '03', l: 'Delivery', v: '15 Days' },
                            { n: '04', l: 'Rating', v: '4.9★' }
                        ].map((s, idx) => (
                            <div key={idx} className="stat-card glass-morphism">
                                <span className="stat-num">{s.n}</span>
                                <h4>{s.v}</h4>
                                <p>{s.l}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="footer section">
                <div className="footer-grid">
                    <div className="footer-col">
                        <div className="logo">SnapAI<span className="dot">.</span></div>
                        <p>Demand AI. Supply AI.</p>
                        <div className="socials">
                            <span>𝕏</span> <span>In</span> <span>Ig</span>
                        </div>
                    </div>
                    <div className="footer-col">
                        <h4>Tools</h4>
                        <a>AI Resume</a>
                        <a>Coming Soon</a>
                        <a>Request</a>
                    </div>
                    <div className="footer-col">
                        <h4>Company</h4>
                        <a>About</a>
                        <a>Process</a>
                        <a>Contact</a>
                    </div>
                    <div className="footer-col">
                        <h4>Newsletter</h4>
                        <p>Get notified on every launch</p>
                        <div className="sub-box">
                            <input placeholder="Email" />
                            <button>Join</button>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2025 SnapAI Labs. All Rights Reserved.</p>
                </div>
            </footer>

            <Chatbot />
        </div>
    )
}

export default App
