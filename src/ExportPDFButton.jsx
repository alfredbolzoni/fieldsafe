// ExportPDFButton.jsx
// Drop this button into any page — pass module key and rows
// Usage: <ExportPDFButton moduleKey="incidents" rows={incidents} />

import { generatePDF } from './usePDFExport'
import { PDF_CONFIGS } from './pdfConfigs'

export default function ExportPDFButton({ moduleKey, rows = [], label = 'Export PDF', style = {} }) {
  function handleExport() {
    const config = PDF_CONFIGS[moduleKey]
    if (!config) return alert('PDF config not found for: ' + moduleKey)

    generatePDF({
      ...config,
      rows,
      extraSections: config.extraSections ? config.extraSections(rows) : [],
      filename: `${config.filename}-${new Date().toISOString().slice(0, 10)}.pdf`,
    })
  }

  return (
    <button
      onClick={handleExport}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        ...style,
      }}
      title={`Download ${label}`}
    >
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
        <path d="M3 13h9M7.5 2v8M4.5 7l3 3 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </button>
  )
}