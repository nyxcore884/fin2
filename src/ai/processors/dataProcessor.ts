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
  const result: Omit<ProcessedData, 'verifiedMetrics'> & Pick<ProcessedData, 'verifiedMetrics'>['verifiedMetrics'] = {
    retailRevenue: 0,
    wholesaleRevenue: 0,
    totalCosts: 0,
    costsByHolder: {},
    costsByRegion: {},
    transactionCount: 0,
    rawDataForAI: [],
    topCostDrivers: [],
    regionalDistribution: [],
    holderDistribution: []
  };

  if (fileData.glEntries) {
    fileData.glEntries.forEach((entry: any) => {
      let costMapping;
      if (fileData.costItemMap) {
        costMapping = fileData.costItemMap.find(
          (m: any) => m.cost_item === entry.Subc_Debit
        );
      }

      const amount = parseFloat(entry.Amount_Reporting_Curr || '0');

      if (costMapping) {
        result.totalCosts += Math.abs(amount);
        result.transactionCount++;

        if (fileData.budgetHolderMap) {
          const holderMapping = fileData.budgetHolderMap.find(
            (m: any) => m.budget_article === costMapping.budget_article
          );
          if (holderMapping) {
            result.costsByHolder[holderMapping.budget_holder] =
              (result.costsByHolder[holderMapping.budget_holder] || 0) + Math.abs(amount);
          }
        }
        
        if (fileData.regionalMap) {
            const regionMapping = fileData.regionalMap.find(
                (m: any) => m.structural_unit === entry.structural_unit
            );
            if (regionMapping) {
                result.costsByRegion[regionMapping.region] = 
                    (result.costsByRegion[regionMapping.region] || 0) + Math.abs(amount);
            }
        }

      } else {
        // Assume it's revenue if not found in cost map
      }
      
      result.rawDataForAI.push(entry);
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
    holderDistribution
  };

  return {
    verifiedMetrics,
    rawDataForAI: result.rawDataForAI
  };
};
