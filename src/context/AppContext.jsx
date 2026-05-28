import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null) // 'host' or 'member' for activeAuction
  
  const [leagueName, setLeagueName] = useState('ELITE LEAGUE')
  const [activeAuction, setActiveAuction] = useState(null)
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbReady, setDbReady] = useState(true)

  useEffect(() => {
    // Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    checkAndLoad()
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      loadAuctions()
    }
  }, [user])

  useEffect(() => {
    if (activeAuction && user) {
      if (activeAuction.host_id === user.id) {
        setUserRole('host')
      } else {
        // Double check membership if needed, but if they can see it and aren't host, they're member
        setUserRole('member')
      }
    } else {
      setUserRole(null)
    }
  }, [activeAuction, user])


  async function checkAndLoad() {
    const { error } = await supabase.from('settings').select('id').limit(1)
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      setDbReady(false)
      setLoading(false)
      return
    }
    setDbReady(true)
    await loadSettings()
  }

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) {
      setLeagueName(data.league_name || 'ELITE LEAGUE')
      if (data.active_auction_id) {
        const { data: auction } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', data.active_auction_id)
          .single()
        if (auction) setActiveAuction(auction)
      }
    }
    setLoading(false)
  }

  async function loadAuctions() {
    const { data } = await supabase.from('auctions').select('*').order('created_at', { ascending: false })
    if (data) setAuctions(data)
  }

  async function updateLeagueName(name) {
    setLeagueName(name)
    await supabase.from('settings').upsert({ id: 1, league_name: name })
  }

  async function createAuction(name) {
    if (!user) throw new Error("Must be logged in to create auction")
    // Generate 7-8 char random code
    const join_code = Math.random().toString(36).substring(2, 9).toUpperCase()
    
    const { data, error } = await supabase.from('auctions').insert({ 
      name, 
      host_id: user.id,
      join_code
    }).select().single()
    
    if (error) throw error
    await supabase.from('settings').upsert({ id: 1, active_auction_id: data.id })
    setActiveAuction(data)
    setAuctions(prev => [data, ...prev])
    return data
  }

  async function joinAuction(joinCode) {
    if (!user) throw new Error("Must be logged in to join")
    const { data: auctionId, error } = await supabase.rpc('join_auction_by_code', { p_join_code: joinCode.toUpperCase() })
    if (error) throw error
    
    // Refresh auctions list so it appears in My Auctions
    await loadAuctions()
    
    // Find the joined auction and switch to it
    const { data: auction } = await supabase.from('auctions').select('*').eq('id', auctionId).single()
    if (auction) {
      await switchAuction(auction)
      return auction
    }
  }

  async function switchAuction(auction) {
    setActiveAuction(auction)
    await supabase.from('settings').upsert({ id: 1, active_auction_id: auction.id })
  }

  async function resetAuction() {
    if (!activeAuction || userRole !== 'host') return
    await supabase.from('players')
      .update({ status: 'available', team_id: null, sold_price: null })
      .eq('auction_id', activeAuction.id)
  }
  
  async function logout() {
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
      loadAuctions, loading, dbReady
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
