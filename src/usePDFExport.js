// usePDFExport.js
// Universal PDF export hook for all FieldSafe modules
// Uses jsPDF (loaded via CDN in index.html) — add to public/index.html:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>

export function generatePDF({ title, subtitle, module, rows, columns, extraSections = [], filename }) {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PAGE_W    = 210
  const PAGE_H    = 297
  const MARGIN    = 16
  const CONTENT_W = PAGE_W - MARGIN * 2

  // ── PALETTE ──────────────────────────────────────────────────────────────
  const NAVY      = [18,  47,  91]
  const BLUE      = [26, 111, 175]
  const TEAL      = [0,  140, 130]
  const WHITE     = [255, 255, 255]
  const OFFWHITE  = [250, 251, 253]
  const SILVER    = [230, 234, 240]
  const MIDGRAY   = [140, 148, 160]
  const DARKTEXT  = [22,  28,  38]
  const RED       = [180,  30,  30]
  const AMBER     = [172, 100,   0]
  const GREEN     = [20,  120,  60]

  const today     = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  const nowISO    = new Date().toISOString().slice(0, 10)

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════════════════════════════════════

  // Full-bleed navy background top third
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, 110, 'F')

  // Teal accent stripe
  doc.setFillColor(...TEAL)
  doc.rect(0, 108, PAGE_W, 4, 'F')

  // FS badge (top-left)
  doc.setFillColor(...BLUE)
  doc.roundedRect(MARGIN, 18, 22, 22, 3, 3, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('FS', MARGIN + 11, 32, { align: 'center' })

  // FieldSafe wordmark
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('FieldSafe', MARGIN + 28, 28)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 200, 220)
  doc.text('HSE Platform · Nova Scotia', MARGIN + 28, 35)

  // Module pill (top-right)
  const modLabel = module.toUpperCase()
  doc.setFillColor(...TEAL)
  doc.roundedRect(PAGE_W - MARGIN - 52, 19, 52, 11, 2, 2, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(modLabel, PAGE_W - MARGIN - 26, 26, { align: 'center' })

  // Cover title
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(title, MARGIN, 70, { maxWidth: CONTENT_W })

  // Cover subtitle
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 200, 220)
  doc.text(subtitle || 'NS OHS Act Compliance Record', MARGIN, 82, { maxWidth: CONTENT_W })

  // Divider dot row
  doc.setFillColor(80, 120, 170)
  for (let d = 0; d < 18; d++) doc.circle(MARGIN + d * 10, 92, 0.8, 'F')

  // Generated date block
  doc.setFillColor(30, 60, 105)
  doc.roundedRect(MARGIN, 96, 80, 10, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(160, 190, 220)
  doc.text('GENERATED', MARGIN + 5, 102)
  doc.setTextColor(...WHITE)
  doc.text(today, MARGIN + 32, 102)

  // Record count block
  doc.setFillColor(30, 60, 105)
  doc.roundedRect(MARGIN + 84, 96, 60, 10, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(160, 190, 220)
  doc.text('TOTAL RECORDS', MARGIN + 89, 102)
  doc.setTextColor(...WHITE)
  doc.text(String(rows.length), MARGIN + 132, 102)

  // ── SUMMARY KPI BOXES (cover) ────────────────────────────────────────────
  if (extraSections.length > 0) {
    const cols = Math.min(extraSections.length, 4)
    const gap  = 5
    const boxW = (CONTENT_W - gap * (cols - 1)) / cols
    const boxY = 120

    extraSections.slice(0, cols).forEach((s, i) => {
      const bx = MARGIN + i * (boxW + gap)

      // Shadow effect (offset rect)
      doc.setFillColor(210, 218, 228)
      doc.roundedRect(bx + 1, boxY + 1, boxW, 32, 3, 3, 'F')

      // Card
      doc.setFillColor(...WHITE)
      doc.roundedRect(bx, boxY, boxW, 32, 3, 3, 'F')

      // Top accent bar
      doc.setFillColor(...BLUE)
      doc.roundedRect(bx, boxY, boxW, 3, 1, 1, 'F')

      // Value
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NAVY)
      doc.text(String(s.value), bx + boxW / 2, boxY + 19, { align: 'center' })

      // Label
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...MIDGRAY)
      doc.text(s.label.toUpperCase(), bx + boxW / 2, boxY + 27, { align: 'center' })
    })
  }

  // ── COVER META TABLE ─────────────────────────────────────────────────────
  const metaY = extraSections.length > 0 ? 164 : 128
  const metaRows = [
    ['Document Title', title],
    ['Module',         module],
    ['Regulation Ref', subtitle || 'NS OHS Act'],
    ['Generated By',   'FieldSafe HSE Platform'],
    ['Export Date',    today],
    ['Record Count',   String(rows.length)],
  ]

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('DOCUMENT INFORMATION', MARGIN, metaY)
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, metaY + 2, MARGIN + 52, metaY + 2)

  let mY = metaY + 8
  metaRows.forEach(([label, value], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...OFFWHITE)
      doc.rect(MARGIN, mY - 3.5, CONTENT_W, 7, 'F')
    }
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MIDGRAY)
    doc.text(label, MARGIN + 2, mY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARKTEXT)
    doc.text(value, MARGIN + 50, mY)
    mY += 7
  })

  // Cover footer strip
  doc.setFillColor(...NAVY)
  doc.rect(0, PAGE_H - 16, PAGE_W, 16, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140, 170, 200)
  doc.text('CONFIDENTIAL — For internal HSE use only', MARGIN, PAGE_H - 8)
  doc.text('fieldsafe.app · NS OHS Act Compliance', PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' })

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2+ — DATA TABLE
  // ══════════════════════════════════════════════════════════════════════════

  if (rows.length > 0) {
    doc.addPage()

    // ── Compact page header ──────────────────────────────────────────────
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, PAGE_W, 18, 'F')
    doc.setFillColor(...TEAL)
    doc.rect(0, 18, PAGE_W, 2, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text('FieldSafe', MARGIN, 11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 190, 220)
    doc.text(`/ ${module}`, MARGIN + 22, 11)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 190, 220)
    doc.text(`Generated ${today}  ·  ${rows.length} records`, PAGE_W - MARGIN, 11, { align: 'right' })

    // Section label above table
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(title, MARGIN, 30)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MIDGRAY)
    doc.text(subtitle || '', MARGIN, 36)

    doc.setDrawColor(...TEAL)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, 38, PAGE_W - MARGIN, 38)

    // ── AutoTable ───────────────────────────────────────────────────────
    doc.autoTable({
      startY: 42,
      head: [columns.map(c => c.header)],
      body: rows.map(row => columns.map(c => {
        const val = row[c.key]
        if (val === null || val === undefined || val === '') return '—'
        if (Array.isArray(val)) return val.join(', ')
        return String(val)
      })),
      margin: { left: MARGIN, right: MARGIN, bottom: 22 },
      tableWidth: 'auto',
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
        textColor: DARKTEXT,
        overflow: 'linebreak',
        lineColor: SILVER,
        lineWidth: 0.15,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: OFFWHITE,
      },
      bodyStyles: {
        fillColor: WHITE,
      },
      columnStyles: columns.reduce((acc, c, i) => {
        acc[i] = { cellWidth: c.width || 'auto' }
        return acc
      }, {}),
      didParseCell: (data) => {
        if (data.section === 'body') {
          const val = String(data.cell.raw || '').toLowerCase().trim()
          if (['high', 'critical', 'severe', 'stop work order', 'failed', 'overdue'].some(v => val === v)) {
            data.cell.styles.textColor = RED
            data.cell.styles.fontStyle = 'bold'
          } else if (['medium', 'moderate', 'under_investigation', 'open', 'action-required', 'action required'].some(v => val === v)) {
            data.cell.styles.textColor = AMBER
            data.cell.styles.fontStyle = 'bold'
          } else if (['low', 'closed', 'resolved', 'complied', 'passed', 'active', 'compliant'].some(v => val === v)) {
            data.cell.styles.textColor = GREEN
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      didDrawPage: () => {
        // Repeat compact header on every subsequent page
        const pageNum = doc.internal.getCurrentPageInfo().pageNumber
        if (pageNum > 2) {
          doc.setFillColor(...NAVY)
          doc.rect(0, 0, PAGE_W, 18, 'F')
          doc.setFillColor(...TEAL)
          doc.rect(0, 18, PAGE_W, 2, 'F')
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...WHITE)
          doc.text('FieldSafe', MARGIN, 11)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(160, 190, 220)
          doc.text(`/ ${module}`, MARGIN + 22, 11)
          doc.setFontSize(7.5)
          doc.text(`Generated ${today}  ·  ${rows.length} records`, PAGE_W - MARGIN, 11, { align: 'right' })
        }
      },
    })
  }

  // ── FOOTER on all pages except cover ────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i)
    const fy = PAGE_H - 14

    doc.setFillColor(...NAVY)
    doc.rect(0, fy - 2, PAGE_W, 16, 'F')
    doc.setFillColor(...TEAL)
    doc.rect(0, fy - 2, 3, 16, 'F')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(140, 170, 200)
    doc.text('FieldSafe HSE Platform · NS OHS Act Compliance · For internal use only', MARGIN + 2, fy + 5)
    doc.setTextColor(200, 210, 225)
    doc.text(`Page ${i - 1} of ${pageCount - 1}  ·  ${nowISO}`, PAGE_W - MARGIN, fy + 5, { align: 'right' })
  }

  doc.save(filename || `${module.toLowerCase().replace(/\s+/g, '-')}-report-${nowISO}.pdf`)
}