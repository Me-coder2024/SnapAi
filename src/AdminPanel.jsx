import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './AdminPanel.css'

// Auth credentials
const ADMIN_USERNAME = 'snapadmin'
const ADMIN_PASSWORD = '0105'

// Default tools (pre-loaded)
const DEFAULT_TOOLS = [
    {
        id: 1,
        name: 'AI Resume Builder',
        description: 'Get a professional resume in 10 minutes via chat',
        status: 'LIVE',
        buttons: [
            { name: 'WhatsApp', link: '#' },
            { name: 'Telegram', link: '#' }
        ],
        icon: '📄',
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        name: 'AI Logo Maker',
        description: 'Create stunning brand assets in seconds',
        status: 'COMING SOON',
        buttons: [{ name: 'Notify Me', link: '' }],
        icon: '🎨',
        launchDays: '15 Days',
        createdAt: new Date().toISOString()
    },
    {
        id: 3,
        name: 'AI Email Writer',
        description: 'Perfect business emails instantly',
        status: 'COMING SOON',
        buttons: [{ name: 'Notify Me', link: '' }],
        icon: '✉️',
        launchDays: '30 Days',
        createdAt: new Date().toISOString()
    }
]

const ICON_OPTIONS = ['🤖', '📄', '🎨', '✉️', '📊', '🔧', '🎯', '💡', '🧠', '⚡', '📱', '🎬', '📝', '🔍', '💬', '🛡️']

/* ═══════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════ */
const LoginScreen = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const handleLogin = (e) => {
        e.preventDefault()
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            sessionStorage.setItem('snapai_admin_auth', 'true')
            onLogin()
        } else {
            setError('Invalid username or password')
            setTimeout(() => setError(''), 3000)
        }
    }

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-logo">
                    SnapAI<span className="dot">.</span>
                </div>
                <span className="login-badge">ADMIN ACCESS</span>
                <p className="login-subtitle">Enter your credentials to continue</p>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="login-field">
                        <label>👤 Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoFocus
                            required
                        />
                    </div>
                    <div className="login-field">
                        <label>🔒 Password</label>
                        <div className="password-wrap">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                className="toggle-pw"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>
                    {error && <div className="login-error">⚠️ {error}</div>}
                    <button type="submit" className="login-btn">Sign In →</button>
                </form>

                <a href="/" className="login-back">← Back to Website</a>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════
   ADMIN PANEL
   ═══════════════════════════════════════ */
function AdminPanel() {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(() =>
        sessionStorage.getItem('snapai_admin_auth') === 'true'
    )

    // Data state
    const [tools, setTools] = useState([])
    const [requests, setRequests] = useState([])
    const [waitlist, setWaitlist] = useState([])
    const [waitlistActive, setWaitlistActive] = useState(
        () => localStorage.getItem('snapai_waitlist_active') === 'true'
    )
    const [loading, setLoading] = useState(true)

    // ── Load all data from Supabase on mount ──
    useEffect(() => {
        if (!isAuthenticated) return
        const loadAll = async () => {
            setLoading(true)
            const [{ data: t }, { data: r }, { data: w }] = await Promise.all([
                supabase.from('tools').select('*').order('created_at'),
                supabase.from('requests').select('*').order('submitted_at', { ascending: false }),
                supabase.from('waitlist').select('*').order('joined_at', { ascending: false }),
            ])
            // If no tools yet in DB, seed with defaults
            if (t !== null && t.length === 0) {
                await supabase.from('tools').insert(
                    DEFAULT_TOOLS.map(({ id, ...rest }) => ({
                        id,
                        name: rest.name,
                        description: rest.description,
                        status: rest.status,
                        icon: rest.icon,
                        launch_days: rest.launchDays || '15 Days',
                        buttons: rest.buttons,
                    }))
                )
                setTools(DEFAULT_TOOLS)
            } else {
                setTools((t || []).map(row => ({
                    id: row.id, name: row.name, description: row.description,
                    status: row.status, icon: row.icon,
                    launchDays: row.launch_days, buttons: row.buttons || [],
                    createdAt: row.created_at
                })))
            }
            setRequests((r || []).map(row => ({
                toolName: row.tool_name, description: row.description,
                category: row.category, email: row.email, submittedAt: row.submitted_at
            })))
            setWaitlist(w || [])
            setLoading(false)
        }
        loadAll()

        // Real-time: new waitlist joins
        const channel = supabase
            .channel('admin-waitlist')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, async () => {
                const { data } = await supabase.from('waitlist').select('*').order('joined_at', { ascending: false })
                if (data) setWaitlist(data)
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [isAuthenticated])

    // Reset form
    const resetForm = () => {
        setForm({
            name: '', description: '', status: 'LIVE', icon: '🤖',
            launchDays: '15 Days', buttonCount: 1, buttons: [{ name: '', link: '' }]
        })
        setEditingTool(null)
        setShowForm(false)
    }

    // Handle button count change
    const handleButtonCountChange = (count) => {
        const num = Math.max(1, Math.min(5, parseInt(count) || 1))
        const newButtons = [...form.buttons]
        while (newButtons.length < num) newButtons.push({ name: '', link: '' })
        while (newButtons.length > num) newButtons.pop()
        setForm({ ...form, buttonCount: num, buttons: newButtons })
    }

    // Update individual button
    const updateButton = (idx, field, value) => {
        const newButtons = [...form.buttons]
        newButtons[idx] = { ...newButtons[idx], [field]: value }
        setForm({ ...form, buttons: newButtons })
    }

    // Add or update tool
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) return
        const toolData = {
            name: form.name, description: form.description,
            status: form.status, icon: form.icon,
            launch_days: form.launchDays, buttons: form.buttons,
        }
        if (editingTool) {
            await supabase.from('tools').update(toolData).eq('id', editingTool.id)
            setTools(prev => prev.map(t =>
                t.id === editingTool.id
                    ? { ...t, ...form, launchDays: form.launchDays }
                    : t
            ))
        } else {
            const newId = Date.now()
            await supabase.from('tools').insert([{ id: newId, ...toolData, created_at: new Date().toISOString() }])
            setTools(prev => [...prev, { id: newId, ...form, launchDays: form.launchDays, createdAt: new Date().toISOString() }])
        }
        resetForm()
    }

    // Edit tool
    const handleEdit = (tool) => {
        const btns = tool.buttons || [{ name: tool.buttonName || '', link: tool.buttonLink || '' }]
        setForm({
            name: tool.name,
            description: tool.description,
            status: tool.status,
            icon: tool.icon,
            launchDays: tool.launchDays || '15 Days',
            buttonCount: btns.length,
            buttons: btns
        })
        setEditingTool(tool)
        setShowForm(true)
    }

    // Delete tool
    const handleDelete = async (id) => {
        if (confirm('Delete this tool?')) {
            await supabase.from('tools').delete().eq('id', id)
            setTools(prev => prev.filter(t => t.id !== id))
        }
    }

    // Delete request
    const handleDeleteRequest = async (idx) => {
        const req = requests[idx]
        if (req?.id) await supabase.from('requests').delete().eq('id', req.id)
        setRequests(prev => prev.filter((_, i) => i !== idx))
    }

    // Logout
    const handleLogout = () => {
        sessionStorage.removeItem('snapai_admin_auth')
        setIsAuthenticated(false)
    }

    // Toggle waitlist active
    const toggleWaitlist = () => {
        const newVal = !waitlistActive
        setWaitlistActive(newVal)
        localStorage.setItem('snapai_waitlist_active', newVal.toString())
    }

    // Delete waitlist entry
    const handleDeleteWaitlistEntry = async (idx) => {
        const entry = waitlist[idx]
        if (entry?.id) await supabase.from('waitlist').delete().eq('id', entry.id)
        setWaitlist(prev => prev.filter((_, i) => i !== idx))
    }

    // Export waitlist to CSV
    const exportWaitlistCSV = () => {
        if (waitlist.length === 0) return
        const header = 'Email,Joined Date\n'
        const rows = waitlist.map(entry => {
            const date = new Date(entry.joinedAt).toLocaleDateString()
            return `${entry.email},${date}`
        }).join('\n')
        const csv = header + rows
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'waitlist_emails.csv'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    // ══ AUTH GATE ══
    if (!isAuthenticated) {
        return <LoginScreen onLogin={() => setIsAuthenticated(true)} />
    }

    return (
        <div className="admin-wrapper">
            {/* Header */}
            <header className="admin-header">
                <div className="admin-header-inner">
                    <div className="admin-brand">
                        <a href="/" className="admin-logo">SnapAI<span className="dot">.</span></a>
                        <span className="admin-badge">ADMIN</span>
                    </div>
                    <div className="admin-header-actions">
                        <span className="tools-count">{tools.length} Tools</span>
                        <span className="requests-count">{requests.length} Requests</span>
                        <span className="waitlist-count-badge">{waitlist.length} Waitlist</span>
                        <a href="/" className="admin-link-site">← Back to Site</a>
                        <button className="btn-logout" onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="admin-main">
                {/* Tab Navigation */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'tools' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tools')}
                    >
                        🛠️ AI Tools ({tools.length})
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        📬 Tool Requests ({requests.length})
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'waitlist' ? 'active' : ''}`}
                        onClick={() => setActiveTab('waitlist')}
                    >
                        📋 Waitlist ({waitlist.length})
                    </button>
                </div>

                {/* ═══ TOOLS TAB ═══ */}
                {activeTab === 'tools' && (
                    <div className="admin-section">
                        <div className="section-top">
                            <h2>Manage AI Tools</h2>
                            <button className="btn-add" onClick={() => { resetForm(); setShowForm(true); }}>
                                + Add AI Tool
                            </button>
                        </div>

                        {/* Add/Edit Form */}
                        {showForm && (
                            <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
                                <form className="admin-form" onSubmit={handleSubmit}>
                                    <h3>{editingTool ? '✏️ Edit Tool' : '➕ Add New AI Tool'}</h3>

                                    <div className="form-row">
                                        <label>Icon</label>
                                        <div className="icon-picker">
                                            {ICON_OPTIONS.map(ic => (
                                                <button
                                                    type="button"
                                                    key={ic}
                                                    className={`icon-btn ${form.icon === ic ? 'selected' : ''}`}
                                                    onClick={() => setForm({ ...form, icon: ic })}
                                                >{ic}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <label>Tool Name *</label>
                                        <input
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            placeholder="e.g. AI Content Planner"
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <label>Description *</label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                            placeholder="Short description of the tool..."
                                            rows="3"
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <label>Status</label>
                                        <div className="status-toggle">
                                            <button
                                                type="button"
                                                className={`status-btn ${form.status === 'LIVE' ? 'active live' : ''}`}
                                                onClick={() => setForm({ ...form, status: 'LIVE' })}
                                            >🟢 LIVE</button>
                                            <button
                                                type="button"
                                                className={`status-btn ${form.status === 'COMING SOON' ? 'active soon' : ''}`}
                                                onClick={() => setForm({ ...form, status: 'COMING SOON' })}
                                            >🔒 COMING SOON</button>
                                        </div>
                                    </div>

                                    {form.status === 'COMING SOON' && (
                                        <div className="form-row">
                                            <label>Launch Timeline</label>
                                            <select
                                                value={form.launchDays}
                                                onChange={e => setForm({ ...form, launchDays: e.target.value })}
                                            >
                                                <option>7 Days</option>
                                                <option>15 Days</option>
                                                <option>30 Days</option>
                                                <option>45 Days</option>
                                                <option>60 Days</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Dynamic Button Count */}
                                    <div className="form-row">
                                        <label>Number of Buttons</label>
                                        <div className="btn-count-picker">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <button
                                                    type="button"
                                                    key={n}
                                                    className={`count-btn ${form.buttonCount === n ? 'active' : ''}`}
                                                    onClick={() => handleButtonCountChange(n)}
                                                >{n}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dynamic Button Fields */}
                                    {form.buttons.map((btn, idx) => (
                                        <div key={idx} className="button-group">
                                            <div className="button-group-header">
                                                <span className="btn-num">Button {idx + 1}</span>
                                            </div>
                                            <div className="form-row">
                                                <label>Button Name</label>
                                                <input
                                                    value={btn.name}
                                                    onChange={e => updateButton(idx, 'name', e.target.value)}
                                                    placeholder={form.status === 'LIVE' ? `e.g. Try on WhatsApp ↗` : 'e.g. Notify Me'}
                                                />
                                            </div>
                                            {form.status === 'LIVE' && (
                                                <div className="form-row">
                                                    <label>Button Link (URL)</label>
                                                    <input
                                                        value={btn.link}
                                                        onChange={e => updateButton(idx, 'link', e.target.value)}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="form-actions">
                                        <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
                                        <button type="submit" className="btn-save">
                                            {editingTool ? 'Update Tool' : 'Add Tool'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Tools Grid */}
                        <div className="admin-tools-grid">
                            {tools.map(tool => {
                                const btns = tool.buttons || [{ name: tool.buttonName, link: tool.buttonLink }]
                                return (
                                    <div key={tool.id} className={`admin-tool-card ${tool.status === 'LIVE' ? 'live' : 'soon'}`}>
                                        <div className="atc-header">
                                            <span className="atc-icon">{tool.icon}</span>
                                            <span className={`atc-status ${tool.status === 'LIVE' ? 'live' : 'soon'}`}>
                                                {tool.status}
                                            </span>
                                        </div>
                                        <h4>{tool.name}</h4>
                                        <p>{tool.description}</p>
                                        {tool.status === 'LIVE' ? (
                                            <div className="atc-buttons">
                                                {btns.map((b, i) => (
                                                    <div key={i} className="atc-link">
                                                        <span className="link-label">🔗 {b.name || 'Button'}</span>
                                                        {b.link && <span className="link-url">{b.link}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="atc-link soon-info">
                                                <span>🔒 Launches in {tool.launchDays || '15 Days'}</span>
                                            </div>
                                        )}
                                        <div className="atc-actions">
                                            <button className="btn-edit" onClick={() => handleEdit(tool)}>✏️ Edit</button>
                                            <button className="btn-delete" onClick={() => handleDelete(tool.id)}>🗑️ Delete</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ═══ REQUESTS TAB ═══ */}
                {activeTab === 'requests' && (
                    <div className="admin-section">
                        <div className="section-top">
                            <h2>📬 Tool Requests from Users</h2>
                            <span className="req-info">{requests.length} total requests</span>
                        </div>

                        {requests.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📭</span>
                                <h3>No requests yet</h3>
                                <p>When users submit tool requests from the website, they'll appear here.</p>
                            </div>
                        ) : (
                            <div className="requests-list">
                                {requests.map((req, idx) => (
                                    <div key={idx} className="request-card">
                                        <div className="req-header">
                                            <h4>{req.toolName || 'Unnamed Tool'}</h4>
                                            <span className="req-cat">{req.category}</span>
                                        </div>
                                        <p className="req-desc">{req.description}</p>
                                        <div className="req-footer">
                                            <span className="req-email">📧 {req.email}</span>
                                            <span className="req-date">{new Date(req.submittedAt).toLocaleDateString()}</span>
                                            <button className="btn-del-req" onClick={() => handleDeleteRequest(idx)}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ WAITLIST TAB ═══ */}
                {activeTab === 'waitlist' && (
                    <div className="admin-section">
                        {/* Toggle + Header */}
                        <div className="section-top waitlist-top">
                            <div>
                                <h2>📋 Waiting List</h2>
                                <p className="waitlist-desc">{waitlist.length} email{waitlist.length !== 1 ? 's' : ''} collected</p>
                            </div>
                            <div className="waitlist-actions-row">
                                <div className="waitlist-toggle-wrap">
                                    <span className="toggle-label">{waitlistActive ? 'Waitlist is ON' : 'Waitlist is OFF'}</span>
                                    <button
                                        className={`toggle-switch ${waitlistActive ? 'active' : ''}`}
                                        onClick={toggleWaitlist}
                                        title={waitlistActive ? 'Click to hide waitlist page' : 'Click to show waitlist page'}
                                    >
                                        <span className="toggle-knob"></span>
                                    </button>
                                </div>
                                <button className="btn-export-csv" onClick={exportWaitlistCSV} disabled={waitlist.length === 0}>
                                    📥 Export CSV
                                </button>
                            </div>
                        </div>

                        {waitlistActive && (
                            <div className="waitlist-status-banner active">
                                🟢 Waitlist page is currently <strong>visible</strong> to visitors as the first page.
                            </div>
                        )}
                        {!waitlistActive && (
                            <div className="waitlist-status-banner inactive">
                                ⚫ Waitlist page is <strong>hidden</strong>. Normal landing page is shown.
                            </div>
                        )}

                        {waitlist.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📋</span>
                                <h3>No waitlist entries yet</h3>
                                <p>When visitors join the waiting list, their emails will appear here.</p>
                            </div>
                        ) : (
                            <div className="waitlist-table-wrap">
                                <table className="waitlist-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Email</th>
                                            <th>Joined Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waitlist.map((entry, idx) => (
                                            <tr key={idx}>
                                                <td className="wl-num">{idx + 1}</td>
                                                <td className="wl-email">📧 {entry.email}</td>
                                                <td className="wl-date">{new Date(entry.joinedAt).toLocaleDateString()} {new Date(entry.joinedAt).toLocaleTimeString()}</td>
                                                <td>
                                                    <button className="btn-del-req" onClick={() => handleDeleteWaitlistEntry(idx)}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

export default AdminPanel
