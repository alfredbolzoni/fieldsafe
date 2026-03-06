// pdfConfigs.js
// PDF column definitions for every FieldSafe module

export const PDF_CONFIGS = {

  incidents: {
    module: 'Incident Reports',
    title: 'Incident Report Log',
    subtitle: 'NS OHS Act §62-63 — Workplace Incident Records',
    filename: 'incident-report',
    extraSections: (rows) => [
      { label: 'Total Incidents', value: rows.length },
      { label: 'Open', value: rows.filter(r => r.status === 'open').length },
      { label: 'Under Investigation', value: rows.filter(r => r.status === 'under_investigation').length },
      { label: 'Closed', value: rows.filter(r => r.status === 'closed').length },
    ],
    columns: [
      { header: 'Date', key: 'date', width: 22 },
      { header: 'Type', key: 'type', width: 28 },
      { header: 'Location', key: 'location', width: 32 },
      { header: 'Description', key: 'description' },
      { header: 'Reported By', key: 'reported_by', width: 28 },
      { header: 'Severity', key: 'severity', width: 20 },
      { header: 'Status', key: 'status', width: 22 },
    ],
  },

  hazards: {
    module: 'Hazard Register',
    title: 'Hazard Register & Risk Assessment',
    subtitle: 'NS OHS Act §9 — Employer Duty to Protect',
    filename: 'hazard-register',
    extraSections: (rows) => [
      { label: 'Total Hazards', value: rows.length },
      { label: 'High Risk', value: rows.filter(r => r.risk_level === 'high').length },
      { label: 'Medium Risk', value: rows.filter(r => r.risk_level === 'medium').length },
      { label: 'Low Risk', value: rows.filter(r => r.risk_level === 'low').length },
    ],
    columns: [
      { header: 'Hazard', key: 'title', width: 38 },
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Location', key: 'location', width: 28 },
      { header: 'Risk Level', key: 'risk_level', width: 18 },
      { header: 'Controls', key: 'controls' },
      { header: 'Responsible', key: 'responsible', width: 26 },
      { header: 'Review Date', key: 'review_date', width: 22 },
    ],
  },

  inspections: {
    module: 'Site Inspections',
    title: 'Inspection Report Log',
    subtitle: 'NS OHS Act §29 — JOHSC Monthly Workplace Inspections',
    filename: 'inspection-report',
    extraSections: (rows) => [
      { label: 'Total Inspections', value: rows.length },
      { label: 'Avg Score', value: rows.filter(r => r.score).length ? Math.round(rows.filter(r => r.score).reduce((a, r) => a + Number(r.score), 0) / rows.filter(r => r.score).length) + '%' : '—' },
      { label: 'Items Passed', value: rows.reduce((a, r) => a + (Number(r.passed) || 0), 0) },
      { label: 'Items Failed', value: rows.reduce((a, r) => a + (Number(r.failed) || 0), 0) },
    ],
    columns: [
      { header: 'Date', key: 'date', width: 24 },
      { header: 'Location', key: 'location', width: 38 },
      { header: 'Supervisor', key: 'supervisor', width: 34 },
      { header: 'Score', key: 'score', width: 16 },
      { header: 'Passed', key: 'passed', width: 16 },
      { header: 'Failed', key: 'failed', width: 16 },
      { header: 'Status', key: 'status', width: 20 },
    ],
  },

  workers: {
    module: 'Workers',
    title: 'Worker Registry',
    subtitle: 'NS OHS Act §28 — OHS Program Worker Records',
    filename: 'worker-registry',
    extraSections: (rows) => [
      { label: 'Total Workers', value: rows.length },
      { label: 'Active', value: rows.filter(r => r.status === 'active' || !r.status).length },
    ],
    columns: [
      { header: 'First Name', key: 'first_name', width: 28 },
      { header: 'Last Name', key: 'last_name', width: 28 },
      { header: 'Role', key: 'role', width: 38 },
      { header: 'Department / Email', key: 'email' },
      { header: 'Phone', key: 'phone', width: 28 },
    ],
  },

  safe_work_procedures: {
    module: 'Safe Work Procedures',
    title: 'Safe Work Procedures Register',
    subtitle: 'NS OHS Act §28 — High-Risk Task Procedures',
    filename: 'swp-register',
    extraSections: (rows) => [
      { label: 'Total SWPs', value: rows.length },
      { label: 'Active', value: rows.filter(r => r.status === 'active').length },
    ],
    columns: [
      { header: 'Title', key: 'title', width: 48 },
      { header: 'Task', key: 'task' },
      { header: 'Hazards', key: 'hazards', width: 36 },
      { header: 'Approved By', key: 'approved_by', width: 24 },
      { header: 'Review Date', key: 'review_date', width: 22 },
    ],
  },

  whmis_products: {
    module: 'WHMIS / SDS',
    title: 'WHMIS Product Inventory',
    subtitle: 'WHMIS 2015 — GHS-Aligned Hazardous Product Register',
    filename: 'whmis-inventory',
    extraSections: (rows) => [
      { label: 'Total Products', value: rows.length },
      { label: 'Active', value: rows.filter(r => r.status === 'active' || !r.status).length },
    ],
    columns: [
      { header: 'Product Name', key: 'product_name', width: 44 },
      { header: 'Manufacturer', key: 'manufacturer', width: 34 },
      { header: 'Hazard Class', key: 'hazard_class', width: 32 },
      { header: 'Location', key: 'location' },
      { header: 'SDS Date', key: 'sds_date', width: 20 },
      { header: 'Status', key: 'status', width: 16 },
    ],
  },

  emergency_plans: {
    module: 'Emergency Plans',
    title: 'Emergency Response Plans',
    subtitle: 'NS OHS Act §28 — Required Emergency Procedures',
    filename: 'emergency-plans',
    extraSections: (rows) => [
      { label: 'Total Plans', value: rows.length },
      { label: 'Active', value: rows.filter(r => r.status === 'active' || !r.status).length },
    ],
    columns: [
      { header: 'Plan Type', key: 'plan_type', width: 32 },
      { header: 'Title', key: 'title', width: 42 },
      { header: 'Assembly Point', key: 'assembly_point', width: 32 },
      { header: 'Procedures', key: 'procedures' },
      { header: 'Review Date', key: 'review_date', width: 22 },
    ],
  },

  harassment_incidents: {
    module: 'Harassment',
    title: 'Harassment & Violence Incident Register',
    subtitle: 'NS OHS Act §13 — Violence & Harassment Prevention (Sept 2025)',
    filename: 'harassment-register',
    extraSections: (rows) => [
      { label: 'Total Reports', value: rows.length },
      { label: 'Open', value: rows.filter(r => r.status === 'open' || !r.status).length },
      { label: 'Closed', value: rows.filter(r => r.status === 'closed').length },
    ],
    columns: [
      { header: 'Report Date', key: 'report_date', width: 22 },
      { header: 'Incident Date', key: 'incident_date', width: 22 },
      { header: 'Reporter', key: 'reporter_name', width: 28 },
      { header: 'Type', key: 'incident_type', width: 30 },
      { header: 'Location', key: 'location', width: 28 },
      { header: 'Description', key: 'description' },
      { header: 'Status', key: 'status', width: 18 },
    ],
  },

  dol_orders: {
    module: 'DOL Orders',
    title: 'Department of Labour Orders',
    subtitle: 'NS OHS Act §56 — Compliance & Stop Work Orders',
    filename: 'dol-orders',
    extraSections: (rows) => [
      { label: 'Total Orders', value: rows.length },
      { label: 'Open', value: rows.filter(r => r.status === 'open' || !r.status).length },
      { label: 'Stop Work', value: rows.filter(r => r.order_type === 'Stop Work Order').length },
      { label: 'Compliant', value: rows.filter(r => r.status === 'compliant').length },
    ],
    columns: [
      { header: 'Order #', key: 'order_number', width: 28 },
      { header: 'Date', key: 'order_date', width: 22 },
      { header: 'Officer', key: 'officer_name', width: 30 },
      { header: 'Type', key: 'order_type', width: 28 },
      { header: 'Description', key: 'description' },
      { header: 'Due By', key: 'compliance_required_by', width: 20 },
      { header: 'Status', key: 'status', width: 18 },
    ],
  },

  work_refusals: {
    module: 'Work Refusals',
    title: 'Work Refusal Reports',
    subtitle: 'NS OHS Act §43-45 — Right to Refuse Unsafe Work',
    filename: 'work-refusals',
    extraSections: (rows) => [
      { label: 'Total Refusals', value: rows.length },
      { label: 'Open', value: rows.filter(r => r.status === 'open' || !r.status).length },
      { label: 'Resolved', value: rows.filter(r => r.status === 'resolved').length },
    ],
    columns: [
      { header: 'Date', key: 'refusal_date', width: 22 },
      { header: 'Employee', key: 'employee_name', width: 30 },
      { header: 'Work Refused', key: 'work_refused', width: 40 },
      { header: 'Reason', key: 'reason' },
      { header: 'Supervisor', key: 'supervisor', width: 28 },
      { header: 'Status', key: 'status', width: 18 },
    ],
  },
}