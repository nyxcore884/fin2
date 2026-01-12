import { Storage } from '@google-cloud/storage';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { createReadStream, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import pdf from 'pdf-parse';

const storage = new Storage();

export interface ProcessedData {
  retailRevenue: number;
  wholesaleRevenue: number;
  totalCosts: number;
  costsByHolder: { [key: string]: number };
  costsByRegion: { [key: string]: number };
  transactionCount: number;
  // Store raw data for AI analysis
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

    const filePath = info.path;
    const tempFilePath = join(tmpdir(), info.name);

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
      // For PDF files, we need to extract text and then parse it
      const dataBuffer = readFileSync(filePath);
      const data = await pdf(dataBuffer);
      
      // Basic PDF text extraction - you might need more sophisticated parsing
      // depending on your PDF structure
      const lines = data.text.split('\n').filter(line => line.trim() !== '');
      
      // Simple CSV-like parsing for tabular data in PDF
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
  const result: ProcessedData = {
    retailRevenue: 0,
    wholesaleRevenue: 0,
    totalCosts: 0,
    costsByHolder: {},
    costsByRegion: {},
    transactionCount: 0,
    rawDataForAI: []
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
        // It's a cost
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
        // We will classify this later with AI
      }
      
      // Add raw entry for AI analysis
      result.rawDataForAI.push(entry);
    });
  }

  return result;
};
