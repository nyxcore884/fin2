import type { ChartConfig } from '@/components/ui/chart';

export const MOCK_USER = {
  name: 'Admin User',
  email: 'admin@budget-insights.com',
  avatar: '/avatar.png',
  role: 'admin',
};

export const MOCK_STATS = [
  { name: 'Total Revenue', value: '$4,050,491', change: '+15.2%', changeType: 'positive' },
  { name: 'Total Costs', value: '$2,876,112', change: '+8.1%', changeType: 'negative' },
  { name: 'Net Income', value: '$1,174,379', change: '+32.8%', changeType: 'positive' },
  { name: 'Anomalies Found', value: '3', change: '', changeType: 'neutral' },
];

export const MOCK_REVENUE_DATA = [
  { type: 'Retail Revenue', amount: 2850341, fill: 'var(--color-retail)' },
  { type: 'Wholesale Revenue', amount: 1200150, fill: 'var(--color-wholesale)' },
];

export const MOCK_REVENUE_CHART_CONFIG = {
  amount: {
    label: '$',
  },
  retail: {
    label: 'Retail',
    color: 'hsl(var(--chart-1))',
  },
  wholesale: {
    label: 'Wholesale',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export const MOCK_COST_DATA = [
    { budgetHolder: "Marketing", costs: 400000, fill: "var(--color-marketing)" },
    { budgetHolder: "Sales", costs: 300000, fill: "var(--color-sales)" },
    { budgetHolder: "Engineering", costs: 750000, fill: "var(--color-engineering)" },
    { budgetHolder: "Operations", costs: 520000, fill: "var(--color-operations)" },
    { budgetHolder: "HR", costs: 180000, fill: "var(--color-hr)" },
    { budgetHolder: "Admin", costs: 230000, fill: "var(--color-admin)" },
];

export const MOCK_COST_CHART_CONFIG = {
    costs: {
      label: "Costs",
    },
    marketing: { label: "Marketing", color: "hsl(var(--chart-1))" },
    sales: { label: "Sales", color: "hsl(var(--chart-2))" },
    engineering: { label: "Engineering", color: "hsl(var(--chart-3))" },
    operations: { label: "Operations", color: "hsl(var(--chart-4))" },
    hr: { label: "HR", color: "hsl(var(--chart-5))" },
    admin: { label: "Admin", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export const MOCK_ANOMALIES = [
  {
    id: 'ANOM-001',
    metric: 'Marketing Spend',
    description: 'Unusually high marketing spend in Q4, 45% above budget.',
    severity: 'high',
    date: '2023-12-15',
  },
  {
    id: 'ANOM-002',
    metric: 'Travel & Expense',
    description: 'Multiple large expense claims from the sales team in October.',
    severity: 'medium',
    date: '2023-10-28',
  },
  {
    id: 'ANOM-003',
    metric: 'Software Licenses',
    description: 'Subscription cost for "PixelPerfect" increased by 200% MoM.',
    severity: 'high',
    date: '2023-11-01',
  },
];

export const MOCK_SUGGESTIONS = {
  suggestions: "Cross-reference the marketing spend with the campaign performance reports for Q4. The high spend could be attributed to a major holiday campaign. Verify if the ROI justifies the expenditure.",
  reasons: "Could be due to end-of-year campaigns, a major product launch, or a miscalculation in budget allocation. It's also possible that some expenses from Q3 were booked in Q4.",
  actions: "1. Request a detailed breakdown from the marketing head. 2. Review the campaign goals and outcomes. 3. Adjust Q1 2024 budget if this is a recurring trend."
}

export const MOCK_REPORTS = [
    { id: 'REP-2024-Q1', name: 'Q1 2024 Financial Summary', date: '2024-04-15', status: 'Completed' },
    { id: 'REP-2023-FY', name: 'Fiscal Year 2023 Full Report', date: '2024-02-20', status: 'Completed' },
    { id: 'REP-2023-Q4', name: 'Q4 2023 Financial Summary', date: '2024-01-18', status: 'Completed' },
    { id: 'REP-2023-Q3', name: 'Q3 2023 Financial Summary', date: '2023-10-12', status: 'Completed' },
    { id: 'REP-2023-Q2', name: 'Q2 2023 Financial Summary', date: '2023-07-15', status: 'Archived' },
];

export const MOCK_UPLOAD_FILES = [
  { id: 'gl-entries', title: 'GL Entries', description: 'Main ledger (CSV/XLSX/PDF).', required: true },
  { id: 'budget-holder-map', title: 'Budget Holder Mapping', description: 'Map cost centers (CSV/XLSX).', required: true },
  { id: 'cost-item-map', title: 'Cost Item Map', description: 'Categorize costs (CSV/XLSX).', required: true },
  { id: 'regional-map', title: 'Regional Mapping', description: 'Assign regions (CSV/XLSX).', required: true },
  { id: 'corrections', title: 'Corrections', description: 'Manual adjustments (CSV/XLSX).', required: false },
  { id: 'revenue-report', title: 'Revenue Report', description: 'Optional revenue data (CSV/XLSX/PDF).', required: false },
];
