// usePDFExport.js
// Universal PDF export hook for all FieldSafe modules
// Uses jsPDF (loaded via CDN in index.html) — add to public/index.html:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>

export function generatePDF({ title, subtitle, module, rows, columns, extraSections = [], filename }) {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PAGE_W = 210
  const PAGE_H = 297
  const MARGIN = 14
  const CONTENT_W = PAGE_W - MARGIN * 2

  // ── COLORS (CCOHS-inspired) ──────────────────────────────────────────────
  const NAVY     = [26, 60, 110]
  const BLUE     = [26, 111, 175]
  const LIGHTBLUE= [235, 244, 252]
  const WHITE    = [255, 255, 255]
  const GRAY     = [100, 100, 100]
  const LIGHTGRAY= [245, 245, 245]
  const DARKTEXT = [30, 30, 30]
  const RED      = [180, 30, 30]

  const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── HEADER BAND ──────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, 28, 'F')

  // Logo area — "FS" badge
  doc.setFillColor(...BLUE)
  doc.roundedRect(MARGIN, 6, 16, 16, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('FS', MARGIN + 8, 17, { align: 'center' })

  // Platform name
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FieldSafe', MARGIN + 20, 13)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('HSE Platform · Nova Scotia', MARGIN + 20, 19)

  // Module badge top right
  doc.setFillColor(...BLUE)
  doc.roundedRect(PAGE_W - MARGIN - 42, 7, 42, 14, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(module.toUpperCase(), PAGE_W - MARGIN - 21, 15, { align: 'center' })

  // ── TITLE SECTION ────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE)
  doc.rect(0, 28, PAGE_W, 18, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, MARGIN, 40)

  // ── SUBTITLE BAR ─────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHTBLUE)
  doc.rect(0, 46, PAGE_W, 10, 'F')
  doc.setTextColor(...GRAY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle || `Generated ${today} · NS OHS Act Compliance Record`, MARGIN, 52)
  doc.text(`Total records: ${rows.length}`, PAGE_W - MARGIN, 52, { align: 'right' })

  let y = 62

  // ── EXTRA SECTIONS (summary boxes etc.) ─────────────────────────────────
  if (extraSections.length > 0) {
    const boxW = (CONTENT_W - (extraSections.length - 1) * 4) / extraSections.length
    extraSections.forEach((s, i) => {
      const bx = MARGIN + i * (boxW + 4)
      doc.setFillColor(...LIGHTGRAY)
      doc.roundedRect(bx, y, boxW, 18, 2, 2, 'F')
      doc.setDrawColor(...BLUE)
      doc.setLineWidth(0.5)
      doc.roundedRect(bx, y, boxW, 18, 2, 2, 'S')
      doc.setTextColor(...BLUE)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(String(s.value), bx + boxW / 2, y + 11, { align: 'center' })
      doc.setTextColor(...GRAY)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(s.label, bx + boxW / 2, y + 16, { align: 'center' })
    })
    y += 26
  }

  // ── MAIN TABLE ────────────────────────────────────────────────────────────
  if (rows.length > 0) {
    doc.autoTable({
      startY: y,
      head: [columns.map(c => c.header)],
      body: rows.map(row => columns.map(c => {
        const val = row[c.key]
        if (val === null || val === undefined) return '—'
        if (Array.isArray(val)) return val.join(', ')
        return String(val)
      })),
      margin: { left: MARGIN, right: MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: DARKTEXT,
        overflow: 'linebreak',
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: LIGHTGRAY,
      },
      columnStyles: columns.reduce((acc, c, i) => {
        if (c.width) acc[i] = { cellWidth: c.width }
        return acc
      }, {}),
      didParseCell: (data) => {
        // Colour-code severity/risk/status cells
        if (data.section === 'body') {
          const val = String(data.cell.raw || '').toLowerCase()
          if (['high','critical','severe','stop work order'].some(v => val === v)) {
            data.cell.styles.textColor = RED
            data.cell.styles.fontStyle = 'bold'
          } else if (['medium','moderate','under_investigation'].some(v => val === v)) {
            data.cell.styles.textColor = [180, 100, 0]
          } else if (['low','closed','active','compliant'].some(v => val === v)) {
            data.cell.styles.textColor = [0, 120, 60]
          }
        }
      },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const footerY = PAGE_H - 14

    doc.setFillColor(...LIGHTGRAY)
    doc.rect(0, footerY - 4, PAGE_W, 18, 'F')
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, footerY - 4, PAGE_W - MARGIN, footerY - 4)

    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('FieldSafe HSE Platform · Nova Scotia OHS Act Compliance', MARGIN, footerY + 2)
    doc.text(`Page ${i} of ${pageCount}  ·  Generated ${today}`, PAGE_W - MARGIN, footerY + 2, { align: 'right' })
    doc.setTextColor(...BLUE)
    doc.text('For informational purposes only — verify against current NS OHS Act legislation', PAGE_W / 2, footerY + 7, { align: 'center' })
  }

  doc.save(filename || `${module.toLowerCase().replace(/\s+/g, '-')}-report-${new Date().toISOString().slice(0,10)}.pdf`)
}