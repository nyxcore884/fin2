/**
 * src/ai/processors/dataProcessor.ts
 *
 * Utility functions for parsing, correcting, mapping and aggregating
 * financial data that has been uploaded to Firebase Storage (or any GCS bucket).
 */

import { Bucket } from '@google-cloud/storage';                 // <-- now available
import { Readable } from 'stream';
import * as ExcelJS from 'exceljs';
import csv from 'csv-parser';

// ---------------------------------------------------------------
//  Types that describe the metadata stored in Firestore/Realtime DB
// ---------------------------------------------------------------
type FileMeta = {
  name: string;
  path: string;
  uploadedAt: any;          // you probably store a timestamp – any is fine for now
};

type SessionFiles = {
  glEntries: FileMeta;
  budgetHolderMapping: FileMeta;
  costItemMap: FileMeta;
  regionalMapping: FileMeta;
  corrections?: FileMeta;            // optional – may be undefined
  revenueReport?: FileMeta;            // optional – may be undefined
};

// ---------------------------------------------------------------
//  Helper: download a file from GCS and turn it into a Buffer
// ---------------------------------------------------------------
async function downloadFile(bucket: Bucket, filePath: string): Promise<Buffer> {
  const file = bucket.file(filePath);

  // The SDK returns `Promise<[Buffer, any]>`; we cast to `[Buffer, any]`
  const [buffer] = await file.download() as Promise<[Buffer, any]>;

  // No need to keep the destination file – we only need the in‑memory Buffer
  return buffer;
}

// ---------------------------------------------------------------
//  Helper: decide whether a file is CSV or XLSX and parse it to JSON
// ---------------------------------------------------------------
async function parseFinancialFile(buffer: Buffer, fileName: string): Promise<any[]> {
  const ext = fileName.toLowerCase();

  // ------------------- CSV -------------------
  if (ext.endsWith('.csv')) {
    // csv-parser does not ship a typings entry for `bom`, so we cast to `any`
    const results: any[] = [];

    // `Readable.from(buffer)` creates a readable stream from the Buffer.
    // The options object is cast to `any` because its shape is not part of the
    // declared type (`Options` does not contain `bom`).
    const stream = Readable.from(buffer).pipe(
      csv({
        bom: true, // <- we know the option exists at runtime, just ignore the type
      })
    );

    stream.on('data', (data: any) => results.push(data));
    stream.on('end', () => {
      // Resolve the promise after the stream ends
      return results;
    });
    stream.on('error', (err: any) => {
      // Throw so the outer Promise rejects
      throw err;
    });

    // The above async function cannot `return` the promise directly, so we
    // wrap it in a Promise constructor.
    return new Promise<any[]>((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer).pipe(csv({ bom: true }));
      stream.on('data', (data: any) => results.push(data));
      stream.on('end', () => resolve(results));
      stream.on('error', (e) => reject(e));
    });
  }

  // ------------------- XLSX / XLS -------------------
  if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return [];
    }

    // Build a header row from the first row of the sheet
    const headerRow: string[] = [];
    worksheet
      .getRow(1)
      .eachCell({ includeEmpty: true }, (cell) => {
        headerRow.push(cell.value?.toString() ?? '');
      });

    const jsonData: any[] = [];

    // Iterate over every subsequent row
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const rowData: Record<string, any> = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headerRow[colNumber - 1];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        jsonData.push(rowData);
      }
    });

    return jsonData;
  }

  // ------------------- Unknown extension -------------------
  throw new Error(`Unsupported file type: ${fileName}`);
}

// ---------------------------------------------------------------
//  Helper: clean numeric strings with European separators
// ---------------------------------------------------------------
function cleanAndConvertNumeric(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'string') {
    return 0;
  }
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(cleaned)) {
    return 0;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ---------------------------------------------------------------
//  Main processing function
// ---------------------------------------------------------------
export async function processUploadedFiles(
  files: SessionFiles,
  bucket: Bucket
): Promise<{
  totalRevenue: number;
  totalCosts: number;
  costsByHolder: Record<string, number>;
  costsByRegion: Record<string, number>;
  processedDf: any[];
}> {
  // -----------------------------------------------------------------
  // 1️⃣ Parallel download & parsing of every uploaded file
  // -----------------------------------------------------------------
  const downloadAndParse = async (meta: FileMeta) => {
    const buf = await downloadFile(bucket, meta.path);
    return parseFinancialFile(buf, meta.name);
  };

  const [
    glEntriesData,          // GL entries (the raw financial rows)
    budgetHolderMapData,    // maps budget_article → budget_holder
    costItemMapData,        // maps cost_item → budget_article
    regionalMapData,        // maps structural_unit → region
    correctionsData = [],   // default to empty array if undefined
  ] = await Promise.all([
    downloadAndParse(files.glEntries),
    downloadAndParse(files.budgetHolderMapping),
    downloadAndParse(files.costItemMap),
    downloadAndParse(files.regionalMapping),
    // `corrections` may be missing – fall back to an empty array
    files.corrections
      ? downloadAndParse(files.corrections)
      : Promise.resolve([]),
  ]);

  // -----------------------------------------------------------------
  // 2️⃣ Build fast lookup maps for the *mapping* files
  // -----------------------------------------------------------------
  // Corrections map: key = Transaction_ID, value = full correction record
  const correctionsMap = new Map<string, any>(correctionsData.map((c) => [
    c.Transaction_ID,
    c,
  ]));

  // cost_item → budget_article
  const costItemMap = new Map<string, string>(
    costItemMapData.map((row) => [row.cost_item, row.budget_article])
  );

  // budget_article → budget_holder
  const budgetHolderMap = new Map<string, string>(
    budgetHolderMapData.map((row) => [row.budget_article, row.budget_holder])
  );

  // structural_unit → region
  const regionalMap = new Map<string, string>(
    regionalMapData.map((row) => [row.structural_unit, row.region])
  );

  // -----------------------------------------------------------------
  // 3️⃣ Reduce the GL data in ONE pass – this is the memory‑efficient core
  // -----------------------------------------------------------------
  const initialState = {
    totalRevenue: 0,
    totalCosts: 0,
    costsByHolder: {} as Record<string, number>,
    costsByRegion: {} as Record<string, number>,
    processedDf: [] as any[],
  } as const;

  const finalState = glEntriesData.reduce((acc, entry) => {
    // ----- Apply a possible correction (if any) -----
    const correction = correctionsMap.get(entry.Transaction_ID);
    const mergedEntry = correction ? { ...entry, ...correction } : entry;

    // ----- Clean the amount (handles European ',' → '.' & whitespace -----
    const amount = cleanAndConvertNumeric(mergedEntry.Amount_Reporting_Curr);
    if (!amount) {
      // Skip rows that evaluate to 0 – they don’t affect aggregates
      return acc;
    }
    // Store the cleaned amount back on the entry (helps downstream)
    mergedEntry.Amount_Reporting_Curr = amount;

    // ----- Resolve the mapping values -----
    const budgetArticle = costItemMap.get(mergedEntry.cost_item);
    const budgetHolder =
      budgetArticle ? budgetHolderMap.get(budgetArticle) : undefined;
    const region = regionalMap.get(mergedEntry.structural_unit);

    const processedEntry = {
      ...mergedEntry,
      budget_article: budgetArticle,
      budget_holder: budgetHolder,
      region,
    };

    // ----- Aggregate -----
    if (amount > 0) {
      acc.totalRevenue += amount;
    } else {
      const abs = Math.abs(amount);
      acc.totalCosts += abs;
      if (budgetHolder) {
        acc.costsByHolder[budgetHolder] = (acc.costsByHolder[budgetHolder] ?? 0) + abs;
      }
      if (region) {
        acc.costsByRegion[region] = (acc.costsByRegion[region] ?? 0) + abs;
      }
    }

    // Keep the fully‑processed row for downstream UI / export
    acc.processedDf.push(processedEntry);

    return acc;
  }, initialState);

  // -----------------------------------------------------------------
  // 4️⃣ Return the aggregated metrics + the full processed dataframe
  // -----------------------------------------------------------------
  return {
    totalRevenue: finalState.totalRevenue,
    totalCosts: finalState.totalCosts,
    costsByHolder: finalState.costsByHolder,
    costsByRegion: finalState.costsByRegion,
    processedDf: finalState.processedDf,
  };
}
