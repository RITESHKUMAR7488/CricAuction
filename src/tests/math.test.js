import { describe, it, expect } from 'vitest'

// Mimic the exact logic in Auction.jsx
function getTeamSpent(team) {
  return (team.players || [])
    .filter(p => p.status === 'sold')
    .reduce((s, p) => s + (p.sold_price || 0), 0)
}

function computeBidMath(currentBid, increment, teamTotalPurse, teamPlayers) {
  const newBid = Math.round((currentBid + increment) * 100) / 100
  const teamSpent = Math.round(getTeamSpent({ players: teamPlayers }) * 100) / 100
  const purseLeft = Math.round((teamTotalPurse - teamSpent) * 100) / 100
  const exceedsPurse = newBid > purseLeft

  return { newBid, teamSpent, purseLeft, exceedsPurse }
}

describe('Bidding Mathematical Operations', () => {
  it('correctly calculates total spent by a team', () => {
    const mockTeam = {
      players: [
        { status: 'sold', sold_price: 5.50 },
        { status: 'sold', sold_price: 12.25 },
        { status: 'available', sold_price: null },
        { status: 'unsold', sold_price: null }
      ]
    }
    expect(getTeamSpent(mockTeam)).toBe(17.75)
  })

  it('correctly manages floating-point addition for bidding increments', () => {
    // Standard JS float error: 0.1 + 0.2 = 0.30000000000000004
    // Verifies our rounding rounds this cleanly to 0.3
    const result = computeBidMath(0.10, 0.20, 100, [])
    expect(result.newBid).toBe(0.30)
  })

  it('resolves the float subtraction budget edge-case (exact bids)', () => {
    // If a team has exactly 0.25L left, and they place a bid of 0.25L
    // Verify that exceedsPurse is correctly false, and not blocked by float precision error.
    const teamPlayers = [
      { status: 'sold', sold_price: 99.75 }
    ]
    const result = computeBidMath(0.00, 0.25, 100.00, teamPlayers)
    expect(result.teamSpent).toBe(99.75)
    expect(result.purseLeft).toBe(0.25)
    expect(result.newBid).toBe(0.25)
    expect(result.exceedsPurse).toBe(false) // Valid bid (equal to remaining purse)
  })

  it('correctly blocks bids that strictly exceed remaining purse', () => {
    const teamPlayers = [
      { status: 'sold', sold_price: 99.80 }
    ]
    // 0.25L exceeds remaining 0.20L
    const result = computeBidMath(0.00, 0.25, 100.00, teamPlayers)
    expect(result.purseLeft).toBe(0.20)
    expect(result.newBid).toBe(0.25)
    expect(result.exceedsPurse).toBe(true) // Should be blocked
  })
})
