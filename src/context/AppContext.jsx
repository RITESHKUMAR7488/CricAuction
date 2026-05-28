import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

// ─── Per-user localStorage helpers ───────────────────────────────────────────
// Active auction is stored PER USER in localStorage so switching one user's
// auction doesn't affect every other user (the old global settings approach did).
function getStoredAuctionId(userId) {
  return localStorage.getItem(`active_auction_${userId}`) || null
}

function setStoredAuctionId(userId, auctionId) {
  if (auctionId) {
    localStorage.setItem(`active_auction_${userId}`, auctionId)
  } else {
    localStorage.removeItem(`active_auction_${userId}`)
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)

  const [leagueName, setLeagueName] = useState('ELITE LEAGUE')
  const [activeAuction, setActiveAuction] = useState(null)
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbReady, setDbReady] = useState(true)

  useEffect(() => {
    // Subscribe to ongoing auth changes (login / logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (_event === 'SIGNED_OUT') {
        setActiveAuction(null)
        setAuctions([])
      }
    })

    // Get the initial session synchronously, THEN load app data.
    // This avoids the race condition where checkAndLoad ran before auth resolved.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      await checkAndLoad(currentUser)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load the auction list whenever the user changes
  useEffect(() => {
    if (user) loadAuctions()
  }, [user])

  // Derive userRole from activeAuction + user
  useEffect(() => {
    if (activeAuction && user) {
      setUserRole(activeAuction.host_id === user.id ? 'host' : 'member')
    } else {
      setUserRole(null)
    }
  }, [activeAuction, user])

  // ─── Internal helpers ─────────────────────────────────────────────────────

  async function checkAndLoad(currentUser) {
    const { error } = await supabase.from('settings').select('id').limit(1)
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      setDbReady(false)
      setLoading(false)
      return
    }
    setDbReady(true)
    await loadSettings(currentUser)
  }

  async function loadSettings(currentUser) {
    // Only load league_name from settings (active_auction_id is now per-user in localStorage)
    const { data } = await supabase.from('settings').select('league_name').single()
    if (data) setLeagueName(data.league_name || 'ELITE LEAGUE')

    // Restore the active auction for this specific user from localStorage
    if (currentUser) {
      const storedId = getStoredAuctionId(currentUser.id)
      if (storedId) {
        const { data: auction } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', storedId)
          .single()
        if (auction) {
          setActiveAuction(auction)
        } else {
          // Auction was deleted — clear the stale reference
          setStoredAuctionId(currentUser.id, null)
        }
      }
    }

    setLoading(false)
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async function loadAuctions() {
    const { data } = await supabase
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAuctions(data)
  }

  async function updateLeagueName(name) {
    setLeagueName(name)
    await supabase.from('settings').upsert({ id: 1, league_name: name })
  }

  async function createAuction(name) {
    if (!user) throw new Error('Must be logged in to create auction')

    // Cryptographically secure join code — Math.random() is not suitable here
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const join_code = Array.from(bytes)
      .map(b => b.toString(36))
      .join('')
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 7)

    const { data, error } = await supabase
      .from('auctions')
      .insert({ name, host_id: user.id, join_code })
      .select()
      .single()

    if (error) throw error

    // Persist choice per-user in localStorage (not global DB)
    setStoredAuctionId(user.id, data.id)
    setActiveAuction(data)
    setAuctions(prev => [data, ...prev])
    return data
  }

  async function joinAuction(joinCode) {
    if (!user) throw new Error('Must be logged in to join')
    const { data: auctionId, error } = await supabase.rpc('join_auction_by_code', {
      p_join_code: joinCode.toUpperCase(),
    })
    if (error) throw error

    await loadAuctions()

    const { data: auction } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single()
    if (auction) {
      await switchAuction(auction)
      return auction
    }
  }

  async function switchAuction(auction) {
    setActiveAuction(auction)
    // Store per-user — does NOT touch global settings table
    if (user) setStoredAuctionId(user.id, auction.id)
  }

  /** Clears activeAuction from state AND localStorage (used after deletion). */
  function clearActiveAuction() {
    setActiveAuction(null)
    if (user) setStoredAuctionId(user.id, null)
  }

  async function resetAuction() {
    if (!activeAuction || userRole !== 'host') return
    await supabase
      .from('players')
      .update({ status: 'available', team_id: null, sold_price: null })
      .eq('auction_id', activeAuction.id)
  }

  async function logout() {
    // Clear stored auction before signing out so it's not restored on next login
    if (user) setStoredAuctionId(user.id, null)
    await supabase.auth.signOut()
    setActiveAuction(null)
    setAuctions([])
  }

  return (
    <AppContext.Provider value={{
      user, userRole, logout,
      leagueName, updateLeagueName,
      activeAuction, auctions,
      createAuction, joinAuction, switchAuction, resetAuction,
      clearActiveAuction,
      loadAuctions, loading, dbReady,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
