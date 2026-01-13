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
 * @param files The file metadata from the session document.
 * @param bucket The Firebase Admin Storage bucket instance.
 * @returns An object with aggregated metrics and the detailed processed data.
 */
export async function processUploadedFiles(files: SessionFiles, bucket: Bucket) {
    // 1. Download and parse all files, including optional corrections
    const filePromises: Promise<any[]>[] = [
        downloadFile(bucket, files.glEntries.path).then(buffer => parseFinancialFile(buffer, files.glEntries.name)),
        downloadFile(bucket, files.budgetHolderMapping.path).then(buffer => parseFinancialFile(buffer, files.budgetHolderMapping.name)),
        downloadFile(bucket, files.costItemMap.path).then(buffer => parseFinancialFile(buffer, files.costItemMap.name)),
        downloadFile(bucket, files.regionalMapping.path).then(buffer => parseFinancialFile(buffer, files.regionalMapping.name)),
    ];

    if (files.corrections) {
        filePromises.push(downloadFile(bucket, files.corrections.path).then(buffer => parseFinancialFile(buffer, files.corrections.name)));
    } else {
        filePromises.push(Promise.resolve([])); // Add empty placeholder if no corrections
    }

    const [
        glEntriesData,
        budgetHolderMapData,
        costItemMapData,
        regionalMapData,
        correctionsData,
    ] = await Promise.all(filePromises);

    // 2. Create a lookup map for corrections for efficient access
    const correctionsMap = new Map<string, any>();
    correctionsData.forEach(correction => {
        if (correction.Transaction_ID) {
            correctionsMap.set(correction.Transaction_ID, correction);
        }
    });

    // 3. Process GL Entries: Apply corrections, clean amounts, and filter invalid rows
    const correctedGlEntries = glEntriesData.map(row => {
        const correction = correctionsMap.get(row.Transaction_ID);
        const mergedRow = correction ? { ...row, ...correction } : row;

        return {
            ...mergedRow,
            Amount_Reporting_Curr: cleanAndConvertNumeric(mergedRow.Amount_Reporting_Curr),
        };
    }).filter(row => row.Amount_Reporting_Curr !== 0);

    // 4. Create mapping objects for efficient lookups
    const costItemMap = Object.fromEntries(costItemMapData.map(row => [row.cost_item, row.budget_article]));
    const budgetHolderMap = Object.fromEntries(budgetHolderMapData.map(row => [row.budget_article, row.budget_holder]));
    const regionalMap = Object.fromEntries(regionalMapData.map(row => [row.structural_unit, row.region]));

    // 5. Apply all mappings to the corrected GL entries
    const processedDf = correctedGlEntries.map(entry => {
        const budget_article = costItemMap[entry.cost_item];
        const budget_holder = budget_article ? budgetHolderMap[budget_article] : undefined;
        const region = regionalMap[entry.structural_unit];
        return {
            ...entry,
            budget_article,
            budget_holder,
            region,
        };
    });

    // 6. Aggregate data for the preliminary income statement
    const aggregation = processedDf.reduce((acc, row) => {
        const amount = row.Amount_Reporting_Curr;
        if (amount > 0) {
            acc.totalRevenue += amount;
        } else {
            acc.totalCosts += Math.abs(amount);
            if (row.budget_holder) {
                acc.costsByHolder[row.budget_holder] = (acc.costsByHolder[row.budget_holder] || 0) + Math.abs(amount);
            }
            if (row.region) {
                acc.costsByRegion[row.region] = (acc.costsByRegion[row.region] || 0) + Math.abs(amount);
            }
        }
        return acc;
    }, {
        totalRevenue: 0,
        totalCosts: 0,
        costsByHolder: {} as Record<string, number>,
        costsByRegion: {} as Record<string, number>,
    });

    // 7. Return aggregated metrics and the full processed dataframe
    return {
        ...aggregation,
        processedDf,
    };
}
