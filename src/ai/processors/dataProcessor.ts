/**
 * @fileOverview This file contains utility functions for parsing and processing uploaded financial files.
 * It handles reading data, applying corrections, mapping, and aggregating financial entries.
 */

import { Bucket } from '@google-cloud/storage';
import { Readable } from 'stream';
import * as xlsx from 'xlsx';
import csv from 'csv-parser';

type FileMeta = {
    name: string;
    path: string;
    uploadedAt: any;
};

type SessionFiles = {
    glEntries: FileMeta;
    budgetHolderMapping: FileMeta;
    costItemMap: FileMeta;
    regionalMapping: FileMeta;
    corrections?: FileMeta;
    revenueReport?: FileMeta;
};

// Helper to download a file from GCS and return a Buffer
async function downloadFile(bucket: Bucket, filePath: string): Promise<Buffer> {
    const file = bucket.file(filePath);
    const [buffer] = await file.download();
    return buffer;
}

// Helper to parse any file type (CSV or XLSX) from a buffer into JSON
async function parseFinancialFile(buffer: Buffer, fileName: string): Promise<any[]> {
    if (fileName.toLowerCase().endsWith('.csv')) {
        return new Promise((resolve, reject) => {
            const results: any[] = [];
            const stream = Readable.from(buffer);
            stream
                .pipe(csv({ bom: true })) // Handle BOM for UTF-8 files
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    } else if (fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(worksheet);
    } else {
        throw new Error(`Unsupported file type: ${fileName}`);
    }
}

/**
 * Cleans and converts a string containing a number in various European formats.
 * @param value The string value to clean and convert.
 * @returns A number, or 0 if parsing fails.
 */
function cleanAndConvertNumeric(value: any): number {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value !== 'string') {
        return 0;
    }
    // Remove whitespace, then replace comma decimal separator with a period.
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    if (!/^-?\d*\.?\d+$/.test(cleaned)) {
        return 0;
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Downloads, parses, corrects, maps, and aggregates financial data for a session.
 * This optimized version uses a single pass over the GL data to improve performance and memory usage.
 * @param files The file metadata from the session document.
 * @param bucket The Firebase Admin Storage bucket instance.
 * @returns An object with aggregated metrics and the detailed processed data.
 */
export async function processUploadedFiles(files: SessionFiles, bucket: Bucket) {
    // 1. Download and parse all files in parallel
    const filePromises = [
        downloadFile(bucket, files.glEntries.path).then(buffer => parseFinancialFile(buffer, files.glEntries.name)),
        downloadFile(bucket, files.budgetHolderMapping.path).then(buffer => parseFinancialFile(buffer, files.budgetHolderMapping.name)),
        downloadFile(bucket, files.costItemMap.path).then(buffer => parseFinancialFile(buffer, files.costItemMap.name)),
        downloadFile(bucket, files.regionalMapping.path).then(buffer => parseFinancialFile(buffer, files.regionalMapping.name)),
        files.corrections ? downloadFile(bucket, files.corrections.path).then(buffer => parseFinancialFile(buffer, files.corrections.name)) : Promise.resolve([]),
    ];

    const [
        glEntriesData,
        budgetHolderMapData,
        costItemMapData,
        regionalMapData,
        correctionsData,
    ] = await Promise.all(filePromises);

    // 2. Create efficient lookup Maps for all mapping files.
    const correctionsMap = new Map<string, any>(correctionsData.map(c => [c.Transaction_ID, c]));
    const costItemMap = new Map<string, string>(costItemMapData.map(row => [row.cost_item, row.budget_article]));
    const budgetHolderMap = new Map<string, string>(budgetHolderMapData.map(row => [row.budget_article, row.budget_holder]));
    const regionalMap = new Map<string, string>(regionalMapData.map(row => [row.structural_unit, row.region]));

    // 3. Process and aggregate in a single pass to optimize memory and performance.
    const initialState = {
        totalRevenue: 0,
        totalCosts: 0,
        costsByHolder: {} as Record<string, number>,
        costsByRegion: {} as Record<string, number>,
        processedDf: [] as any[],
    };

    const finalState = glEntriesData.reduce((acc, entry) => {
        // Apply correction if it exists
        const correction = correctionsMap.get(entry.Transaction_ID);
        const mergedEntry = correction ? { ...entry, ...correction } : entry;

        // Clean amount and filter out zero-value rows
        const amount = cleanAndConvertNumeric(mergedEntry.Amount_Reporting_Curr);
        if (amount === 0) {
            return acc; // Skip rows with no financial impact
        }
        mergedEntry.Amount_Reporting_Curr = amount;

        // Apply mappings
        const budget_article = costItemMap.get(mergedEntry.cost_item);
        const budget_holder = budget_article ? budgetHolderMap.get(budget_article) : undefined;
        const region = regionalMap.get(mergedEntry.structural_unit);
        
        const processedEntry = {
            ...mergedEntry,
            budget_article,
            budget_holder,
            region,
        };

        // Aggregate data
        if (amount > 0) {
            acc.totalRevenue += amount;
        } else {
            const absAmount = Math.abs(amount);
            acc.totalCosts += absAmount;
            if (budget_holder) {
                acc.costsByHolder[budget_holder] = (acc.costsByHolder[budget_holder] || 0) + absAmount;
            }
            if (region) {
                acc.costsByRegion[region] = (acc.costsByRegion[region] || 0) + absAmount;
            }
        }
        
        acc.processedDf.push(processedEntry);

        return acc;
    }, initialState);

    // 4. Return aggregated metrics and the full processed dataframe
    return {
        totalRevenue: finalState.totalRevenue,
        totalCosts: finalState.totalCosts,
        costsByHolder: finalState.costsByHolder,
        costsByRegion: finalState.costsByRegion,
        processedDf: finalState.processedDf,
    };
}
