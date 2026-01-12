import { config } from 'dotenv';
config();

import '@/ai/flows/detect-anomalies.ts';
import '@/ai/flows/provide-anomaly-suggestions.ts';
import '@/ai/flows/classify-revenue.ts';
