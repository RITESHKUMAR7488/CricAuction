import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'

// Fetch all auction data
async function fetchAuctionData(auctionId) {
  const [
    { data: auction },
    { data: teams },
    { data: players },
    { data: sponsors },
    { data: owners },
    { data: settings },
  ] = await Promise.all([
    supabase.from('auctions').select('*').eq('id', auctionId).single(),
    supabase.from('teams').select('*, owners(name, company)').eq('auction_id', auctionId).order('created_at'),
    supabase.from('players').select('*, teams(name, color)').eq('auction_id', auctionId).order('code'),
    supabase.from('sponsors').select('*').order('category'),
    supabase.from('owners').select('*').order('name'),
    supabase.from('settings').select('*').single(),
  ])

  return { auction, teams: teams || [], players: players || [], sponsors: sponsors || [], owners: owners || [], settings }
}

// ─────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────
export async function exportAuctionPDF(auctionId, leagueName) {
  const { auction, teams, players, sponsors, owners, settings } = await fetchAuctionData(auctionId)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PAGE_W = doc.internal.pageSize.getWidth()
  const lg = leagueName || settings?.league_name || 'ELITE LEAGUE'

  // ── Helper colours (RGB) ──
  const GOLD = [245, 166, 35]
  const DARK = [8, 10, 15]
  const MID  = [18, 22, 31]
  const BLUE = [74, 158, 255]
  const GREEN= [39, 174, 96]
  const RED  = [231, 76, 60]
  const WHITE= [255, 255, 255]
  const GRAY = [136, 146, 164]

  function header(title) {
    // Dark background strip
    doc.setFillColor(...DARK)
    doc.rect(0, 0, PAGE_W, 28, 'F')
    // Gold accent line
    doc.setFillColor(...GOLD)
    doc.rect(0, 28, PAGE_W, 1, 'F')
    // Trophy icon text
    doc.setTextColor(...GOLD)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('🏆', 14, 19)
    // League name
    doc.setFontSize(14)
    doc.text(lg.toUpperCase(), 26, 19)
    // Section title right-aligned
    doc.setTextColor(...GRAY)
    doc.setFontSize(10)
    doc.text(title, PAGE_W - 14, 19, { align: 'right' })
    // Auction name under
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`Auction: ${auction?.name || '—'}  |  Generated: ${new Date().toLocaleString()}`, 14, 26)
  }

  // ══════════════════════════════════════════
  // PAGE 1 — COVER / SUMMARY
  // ══════════════════════════════════════════
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PAGE_W, 297, 'F')

  // Gold banner
  doc.setFillColor(...GOLD)
  doc.rect(0, 60, PAGE_W, 4, 'F')
  doc.rect(0, 200, PAGE_W, 4, 'F')

  // Title block
  doc.setTextColor(...GOLD)
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text(lg.toUpperCase(), PAGE_W / 2, 90, { align: 'center' })

  doc.setTextColor(...WHITE)
  doc.setFontSize(18)
  doc.text('AUCTION REPORT', PAGE_W / 2, 105, { align: 'center' })

  doc.setTextColor(...GRAY)
  doc.setFontSize(12)
  doc.text(auction?.name || '—', PAGE_W / 2, 118, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, PAGE_W / 2, 128, { align: 'center' })

  // Summary stats
  const soldPlayers = players.filter(p => p.status === 'sold')
  const totalSpent = soldPlayers.reduce((s, p) => s + (p.sold_price || 0), 0)
  const topBid = soldPlayers.length > 0 ? Math.max(...soldPlayers.map(p => p.sold_price || 0)) : 0
  const avgBid = soldPlayers.length > 0 ? (totalSpent / soldPlayers.length).toFixed(2) : 0

  const summaryItems = [
    { label: 'TOTAL PLAYERS', value: String(players.length) },
    { label: 'PLAYERS SOLD', value: String(soldPlayers.length) },
    { label: 'TEAMS', value: String(teams.length) },
    { label: 'TOTAL SPENT', value: `₹${totalSpent.toFixed(2)} L` },
    { label: 'HIGHEST BID', value: `₹${topBid} L` },
    { label: 'AVERAGE BID', value: `₹${avgBid} L` },
  ]

  const boxW = (PAGE_W - 28) / 3
  const boxH = 22
  summaryItems.forEach((item, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 14 + col * boxW
    const y = 148 + row * (boxH + 6)

    doc.setFillColor(...MID)
    doc.roundedRect(x, y, boxW - 4, boxH, 3, 3, 'F')
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, y, boxW - 4, boxH, 3, 3, 'S')

    doc.setTextColor(...GOLD)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(item.value, x + (boxW - 4) / 2, y + 11, { align: 'center' })

    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, x + (boxW - 4) / 2, y + 18, { align: 'center' })
  })

  // ══════════════════════════════════════════
  // PAGE 2 — PLAYER RANKINGS (All Players)
  // ══════════════════════════════════════════
  doc.addPage()
  header('PLAYER RANKINGS')

  const rankRows = soldPlayers
    .sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0))
    .map((p, i) => [
      String(i + 1),
      p.code,
      p.name,
      p.role,
      p.teams?.name || '—',
      `₹${p.base_price}L`,
      `₹${p.sold_price}L`,
    ])

  autoTable(doc, {
    head: [['#', 'Code', 'Player Name', 'Role', 'Team', 'Base Price', 'Sold For']],
    body: rankRows,
    startY: 35,
    theme: 'grid',
    styles: { fontSize: 9, textColor: WHITE, fillColor: MID, lineColor: [30, 35, 50], lineWidth: 0.3 },
    headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [14, 17, 24] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18 },
      2: { cellWidth: 45 },
      3: { cellWidth: 28 },
      4: { cellWidth: 35 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right', textColor: GOLD, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  // ══════════════════════════════════════════
  // PAGE 3 — TEAMS SUMMARY
  // ══════════════════════════════════════════
  doc.addPage()
  header('TEAMS SUMMARY')

  const teamsRows = teams.map((t, i) => {
    const tPlayers = players.filter(p => p.team_id === t.id && p.status === 'sold')
    const spent = tPlayers.reduce((s, p) => s + (p.sold_price || 0), 0)
    const purseLeft = t.total_purse - spent
    return [
      String(i + 1),
      t.name,
      t.owners?.name || '—',
      `₹${t.total_purse}L`,
      `₹${spent.toFixed(2)}L`,
      `₹${purseLeft.toFixed(2)}L`,
      `${tPlayers.length}/${t.max_players}`,
    ]
  })

  autoTable(doc, {
    head: [['#', 'Team Name', 'Owner', 'Total Purse', 'Spent', 'Remaining', 'Players']],
    body: teamsRows,
    startY: 35,
    theme: 'grid',
    styles: { fontSize: 9, textColor: WHITE, fillColor: MID, lineColor: [30, 35, 50], lineWidth: 0.3 },
    headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [14, 17, 24] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', textColor: RED },
      5: { halign: 'right', textColor: GREEN },
      6: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Per-team player breakdown ──
  let y = doc.lastAutoTable.finalY + 10

  for (const team of teams) {
    const tPlayers = players.filter(p => p.team_id === team.id && p.status === 'sold')
      .sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0))
    if (tPlayers.length === 0) continue

    if (y > 250) { doc.addPage(); header(`TEAMS — ${team.name}`); y = 35 }

    doc.setFillColor(...MID)
    doc.rect(14, y, PAGE_W - 28, 8, 'F')
    doc.setTextColor(...GOLD)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`  ${team.name.toUpperCase()}`, 14, y + 5.5)
    const spent = tPlayers.reduce((s, p) => s + (p.sold_price || 0), 0)
    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.text(`Spent: ₹${spent.toFixed(2)}L`, PAGE_W - 14, y + 5.5, { align: 'right' })
    y += 10

    autoTable(doc, {
      head: [['Code', 'Name', 'Role', 'Base Price', 'Sold For']],
      body: tPlayers.map(p => [p.code, p.name, p.role, `₹${p.base_price}L`, `₹${p.sold_price}L`]),
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8, textColor: WHITE, fillColor: MID, lineColor: [30, 35, 50], lineWidth: 0.3 },
      headStyles: { fillColor: [10, 14, 22], textColor: GRAY, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [12, 16, 22] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right', textColor: GOLD, fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ══════════════════════════════════════════
  // PAGE — UNSOLD PLAYERS
  // ══════════════════════════════════════════
  const unsoldPlayers = players.filter(p => p.status !== 'sold')
  if (unsoldPlayers.length > 0) {
    doc.addPage()
    header('UNSOLD / AVAILABLE PLAYERS')

    autoTable(doc, {
      head: [['Code', 'Player Name', 'Role', 'Base Price', 'Status']],
      body: unsoldPlayers.map(p => [p.code, p.name, p.role, `₹${p.base_price}L`, p.status.toUpperCase()]),
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 9, textColor: WHITE, fillColor: MID, lineColor: [30, 35, 50], lineWidth: 0.3 },
      headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [14, 17, 24] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'center', textColor: GRAY },
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ══════════════════════════════════════════
  // PAGE — SPONSORS
  // ══════════════════════════════════════════
  if (sponsors.length > 0) {
    doc.addPage()
    header('SPONSORS & PARTNERS')

    autoTable(doc, {
      head: [['Category', 'Sponsor Name', 'Contact Person', 'Role', 'Deal Value', 'Since']],
      body: sponsors.map(s => [
        s.category, s.name, s.contact_person || '—', s.contact_role || '—',
        s.deal_value ? `₹${s.deal_value}L` : '—', s.sponsor_since || '—'
      ]),
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 9, textColor: WHITE, fillColor: MID, lineColor: [30, 35, 50], lineWidth: 0.3 },
      headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [14, 17, 24] },
      columnStyles: {
        4: { halign: 'right', textColor: GOLD },
        5: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Page numbers ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W / 2, 292, { align: 'center' })
  }

  const safeName = (auction?.name || 'auction').replace(/[^a-z0-9]/gi, '_').toLowerCase()
  doc.save(`${lg.replace(/\s+/g, '_')}_${safeName}_report.pdf`)
}

// ─────────────────────────────────────────────
// CSV EXPORT — separate files bundled as one download
// ─────────────────────────────────────────────
export async function exportAuctionCSV(auctionId, leagueName) {
  const { auction, teams, players, sponsors, owners } = await fetchAuctionData(auctionId)

  function toCSV(headers, rows) {
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  }

  const files = []

  // Players CSV
  files.push({
    name: 'players.csv',
    content: toCSV(
      ['Code', 'Name', 'Role', 'Age', 'Style', 'Matches', 'Strike Rate', 'Economy', 'Base Price (L)', 'Status', 'Team', 'Sold Price (L)'],
      players.map(p => [p.code, p.name, p.role, p.age, p.style, p.matches, p.strike_rate, p.economy, p.base_price, p.status, p.teams?.name || '', p.sold_price || ''])
    )
  })

  // Teams CSV
  files.push({
    name: 'teams.csv',
    content: toCSV(
      ['Team Name', 'Owner', 'Total Purse (L)', 'Max Players', 'Players Bought', 'Amount Spent (L)', 'Purse Remaining (L)'],
      teams.map(t => {
        const tPlayers = players.filter(p => p.team_id === t.id && p.status === 'sold')
        const spent = tPlayers.reduce((s, p) => s + (p.sold_price || 0), 0)
        return [t.name, t.owners?.name || '', t.total_purse, t.max_players, tPlayers.length, spent.toFixed(2), (t.total_purse - spent).toFixed(2)]
      })
    )
  })

  // Rankings CSV
  const sold = players.filter(p => p.status === 'sold').sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0))
  files.push({
    name: 'rankings.csv',
    content: toCSV(
      ['Rank', 'Code', 'Player Name', 'Role', 'Team', 'Base Price (L)', 'Sold Price (L)'],
      sold.map((p, i) => [i + 1, p.code, p.name, p.role, p.teams?.name || '', p.base_price, p.sold_price])
    )
  })

  // Sponsors CSV
  files.push({
    name: 'sponsors.csv',
    content: toCSV(
      ['Category', 'Sponsor Name', 'Contact Person', 'Contact Role', 'Deal Value (L)', 'Since'],
      sponsors.map(s => [s.category, s.name, s.contact_person, s.contact_role, s.deal_value, s.sponsor_since])
    )
  })

  // Owners CSV
  files.push({
    name: 'owners.csv',
    content: toCSV(
      ['Owner Name', 'Company'],
      owners.map(o => [o.name, o.company])
    )
  })

  // Download each file
  files.forEach(({ name, content }) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(auction?.name || 'auction').replace(/[^a-z0-9]/gi, '_')}_${name}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}
