import { Storage } from '@google-cloud/storage';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { createReadStream, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import pdf from 'pdf-parse';

const storage = new Storage();

export interface ProcessedData {
  // VERIFIED METRICS (Calculated deterministically here)
  verifiedMetrics: {
    totalCosts: number;
    retailRevenue: number;
    wholesaleRevenue: number;
    transactionCount: number;
    costsByHolder: { [key: string]: number };
    costsByRegion: { [key: string]: number };
    topCostDrivers: { name: string; amount: number; percentage: string }[];
    regionalDistribution: { region: string; amount: number; percentage: string }[];
    holderDistribution: { holder: string; amount: number; percentage: string }[];
    detailedBreakdown: {
      byBudgetArticle: { [key: string]: number };
      byStructuralUnit: { [key: string]: number };
      byRegion: { [key: string]: number };
    },
  };
  // Raw data is now only for optional context, not for AI calculation
  rawDataForAI: any[];
}


export const processUploadedFiles = async (
  userId: string,
  sessionId: string,
  files: any
): Promise<ProcessedData> => {
  try {
    // Download and parse all files
    const fileData = await downloadAndParseFiles(files);

    // Apply mappings and process data
    const processedData = applyMappings(fileData);

    return processedData;
  } catch (error: any) {
    throw new Error(`Data processing failed: ${error.message}`);
  }
};

const downloadAndParseFiles = async (files: any) => {
  const bucketName = process.env.GCLOUD_STORAGE_BUCKET || '';
  if (!bucketName) {
      throw new Error('GCLOUD_STORAGE_BUCKET environment variable not set.');
  }
  const bucket = storage.bucket(bucketName);
  const fileData: any = {};

  // Download and parse each file
  for (const [fileType, fileInfo] of Object.entries(files)) {
    const info = fileInfo as { name: string; path: string };
    if (!info || !info.path) continue;

    const tempFilePath = join(tmpdir(), info.name);

    try {
        const filePath = info.path;
        
        // Download file to temporary location
        await bucket.file(filePath).download({ destination: tempFilePath });

        // Parse based on file type
        if (filePath.endsWith('.csv')) {
            fileData[fileType] = await parseCSV(tempFilePath);
        } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
            fileData[fileType] = parseExcel(tempFilePath);
        } else if (filePath.endsWith('.pdf')) {
            fileData[fileType] = await parsePDF(tempFilePath);
        }

    } catch (error: any) {
        console.error(`Error processing file ${fileType} (${info.path}):`, error);
        throw new Error(`Failed to download or parse ${info.name}. Reason: ${error.message}`);
    } finally {
        // Clean up the temporary file
        try {
            unlinkSync(tempFilePath);
        } catch (cleanupError) {
            console.warn(`Failed to clean up temporary file ${tempFilePath}:`, cleanupError);
        }
    }
  }

  return fileData;
};

const parseCSV = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const parseExcel = (filePath: string): any[] => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

const parsePDF = async (filePath: string): Promise<any[]> => {
    try {
      const dataBuffer = readFileSync(filePath);
      const data = await pdf(dataBuffer);
      
      const lines = data.text.split('\n').filter(line => line.trim() !== '');
      
      const results = lines.map(line => {
        const values = line.split(/\s{2,}/); // Split by multiple spaces
        return {
          rawText: line,
          values: values
        };
      });
      
      return results;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  };

const applyMappings = (fileData: any): ProcessedData => {
  const result = {
    retailRevenue: 0,
    wholesaleRevenue: 0,
    totalCosts: 0,
    costsByHolder: {} as {[key: string]: number},
    costsByRegion: {} as {[key: string]: number},
    transactionCount: 0,
    detailedBreakdown: {
      byBudgetArticle: {} as {[key: string]: number},
      byStructuralUnit: {} as {[key: string]: number},
      byRegion: {} as {[key: string]: number}
    },
    rawDataForAI: [] as any[]
  };

  const costItemMap = new Map();
  if (fileData.costItemMap) {
    fileData.costItemMap.forEach((item: any) => costItemMap.set(item.cost_item, item.budget_article));
  }

  const budgetHolderMap = new Map();
  if (fileData.budgetHolderMapping) {
      fileData.budgetHolderMapping.forEach((item: any) => budgetHolderMap.set(item.budget_article, item.budget_holder));
  }
  
  const regionalMap = new Map();
  if (fileData.regionalMapping) {
    fileData.regionalMapping.forEach((item: any) => regionalMap.set(item.structural_unit, item.region));
  }

  const correctionsMap = new Map();
  if (fileData.corrections) {
      fileData.corrections.forEach((correction: any) => {
          const key = `${correction.cost_item}|${correction.structural_unit}|${correction.counterparty}`;
          if (!correctionsMap.has(key) || correctionsMap.get(key).priority > correction.priority) {
              correctionsMap.set(key, correction);
          }
      });
  }

  if (fileData.glEntries) {
    fileData.glEntries.forEach((entry: any) => {
      const amount = parseFloat(entry.Amount_Reporting_Curr || '0');
      const subcDebit = entry.Subc_Debit;
      const structuralUnit = entry.structural_unit;
      const counterparty = entry.counterparty;
      
      let budgetArticle = null;
      let corrected = false;
      const correctionKey = `${subcDebit}|${structuralUnit}|${counterparty}`;

      if (correctionsMap.has(correctionKey)) {
        const correction = correctionsMap.get(correctionKey);
        budgetArticle = correction.corrected_budget_article;
        corrected = true;
      } else {
        budgetArticle = costItemMap.get(subcDebit);
      }
      
      if (budgetArticle) {
          const absAmount = Math.abs(amount);
          if (amount > 0) {
              result.retailRevenue += absAmount; // Preliminary assignment
          } else {
              result.totalCosts += absAmount;
              result.transactionCount++;

              const budgetHolder = budgetHolderMap.get(budgetArticle);
              if (budgetHolder) {
                  result.costsByHolder[budgetHolder] = (result.costsByHolder[budgetHolder] || 0) + absAmount;
              }

              const region = regionalMap.get(structuralUnit);
              if (region) {
                  result.costsByRegion[region] = (result.costsByRegion[region] || 0) + absAmount;
                  result.detailedBreakdown.byRegion[region] = (result.detailedBreakdown.byRegion[region] || 0) + absAmount;
              }
              
              result.detailedBreakdown.byBudgetArticle[budgetArticle] = (result.detailedBreakdown.byBudgetArticle[budgetArticle] || 0) + absAmount;
              result.detailedBreakdown.byStructuralUnit[structuralUnit] = (result.detailedBreakdown.byStructuralUnit[structuralUnit] || 0) + absAmount;
          }

          result.rawDataForAI.push({
              ...entry,
              budget_article: budgetArticle,
              corrected,
              amount: absAmount,
          });
      }
    });
  }

  const totalCostsVerified = result.totalCosts;

  const topCostDrivers = Object.entries(result.costsByHolder)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalCostsVerified > 0 ? ((amount / totalCostsVerified) * 100).toFixed(2) + '%' : '0.00%'
    }));

  const regionalDistribution = Object.entries(result.costsByRegion).map(([region, amount]) => ({
    region,
    amount,
    percentage: totalCostsVerified > 0 ? ((amount / totalCostsVerified) * 100).toFixed(2) + '%' : '0.00%'
  }));
  
  const holderDistribution = Object.entries(result.costsByHolder).map(([holder, amount]) => ({
      holder,
      amount,
      percentage: totalCostsVerified > 0 ? ((amount / totalCostsVerified) * 100).toFixed(2) + '%' : '0.00%'
  }));

  const verifiedMetrics = {
    totalCosts: result.totalCosts,
    retailRevenue: result.retailRevenue,
    wholesaleRevenue: result.wholesaleRevenue,
    transactionCount: result.transactionCount,
    costsByHolder: result.costsByHolder,
    costsByRegion: result.costsByRegion,
    topCostDrivers,
    regionalDistribution,
    holderDistribution,
    detailedBreakdown: result.detailedBreakdown
  };

  return {
    verifiedMetrics,
    rawDataForAI: result.rawDataForAI
  };
};
