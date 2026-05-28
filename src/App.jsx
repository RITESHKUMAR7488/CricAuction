import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import Navbar from './components/Navbar'
import SideMenu from './components/SideMenu'
import ToastContainer from './components/Toast'
import Auction from './pages/Auction'
import Teams from './pages/Teams'
import TeamDetail from './pages/TeamDetail'
import Rankings from './pages/Rankings'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Sponsors from './pages/Sponsors'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { Navigate } from 'react-router-dom'

function AuthGuard({ children }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <Navbar />
      <Header onMenuToggle={() => setMenuOpen(o => !o)} />
      {children}
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
    </>
  )
}

function AppInner() {
  const { loading, dbReady, user } = useApp()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" />
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Connecting to database...</div>
      </div>
    )
  }

  if (!dbReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, flexDirection: 'column', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>🏏</div>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 800, color: 'var(--gold)' }}>DATABASE SETUP REQUIRED</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 340 }}>
          Please run the SQL schema in your Supabase project to set up the database tables.
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, width: '100%', maxWidth: 400, textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Steps:</div>
          <ol style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 16 }}>
            <li>Go to your <a href="https://supabase.com/dashboard/project/xorsnqdyzbbkijwfyibo/sql/new" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>Supabase SQL Editor</a></li>
            <li>Open <code style={{ color: 'var(--gold)', background: 'rgba(245,166,35,0.1)', padding: '1px 4px', borderRadius: 4 }}>supabase_schema.sql</code> from the project folder</li>
            <li>Paste and run the entire SQL script</li>
            <li>Refresh this page</li>
          </ol>
        </div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          🔄 Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        
        {/* Protected Dashboard */}
        <Route path="/dashboard" element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } />

        {/* Protected Main App Layout */}
        <Route path="/*" element={
          <AuthGuard>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Auction />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/teams/:id" element={<TeamDetail />} />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/players" element={<Players />} />
                <Route path="/players/:id" element={<PlayerDetail />} />
                <Route path="/sponsors" element={<Sponsors />} />
              </Routes>
            </AppLayout>
          </AuthGuard>
        } />
      </Routes>
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </BrowserRouter>
  )
}
