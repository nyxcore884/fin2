export const MOCK_UPLOAD_FILES = [
  { id: 'gl-entries', title: 'GL Entries', description: 'Main ledger (CSV/XLSX/PDF).', required: true },
  { id: 'budget-holder-map', title: 'Budget Holder Mapping', description: 'Map cost centers (CSV/XLSX).', required: true },
  { id: 'cost-item-map', title: 'Cost Item Map', description: 'Categorize costs (CSV/XLSX).', required: true },
  { id: 'regional-map', title: 'Regional Mapping', description: 'Assign regions (CSV/XLSX).', required: true },
  { id: 'corrections', title: 'Corrections', description: 'Manual adjustments (CSV/XLSX).', required: false },
  { id: 'revenue-report', title: 'Revenue Report', description: 'Optional revenue data (CSV/XLSX/PDF).', required: false },
];
