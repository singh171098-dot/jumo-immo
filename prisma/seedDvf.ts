import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CSV_PATH = path.join(process.cwd(), "france_live_data.csv");
const BATCH_SIZE = 5_000;
const LOG_EVERY = 50_000;

interface DvfCsvRow {
  date_mutation: string;
  valeur_fonciere: string;
  code_postal: string;
  nom_commune: string;
  type_local: string;
  surface_reelle_bati: string;
  longitude: string;
  latitude: string;
}

/** Parses one raw CSV row, or returns `null` if the row is missing/invalid data. */
function parseRow(row: DvfCsvRow): Prisma.DVFTransactionCreateManyInput | null {
  const date    = new Date((row.date_mutation ?? "").trim());
  const price   = parseFloat(row.valeur_fonciere);
  const surface = parseFloat(row.surface_reelle_bati);
  const lat     = parseFloat(row.latitude);
  const lng     = parseFloat(row.longitude);
  const rawCode = parseFloat(row.code_postal);
  const city    = (row.nom_commune ?? "").trim();
  const propertyType = (row.type_local ?? "").trim();

  if (
    isNaN(date.getTime()) ||
    isNaN(price) || isNaN(surface) ||
    isNaN(lat) || isNaN(lng) || isNaN(rawCode) ||
    !city || !propertyType
  ) {
    return null;
  }

  // French postal codes are 5 digits — the CSV stores them as floats (e.g. "1370.0" -> "01370").
  const postalCode = String(Math.round(rawCode)).padStart(5, "0");
  const isoDate = date.toISOString().slice(0, 10);

  return {
    // id_mutation is not present in this CSV export.
    mutationId: null,
    date,
    price,
    postalCode,
    city,
    propertyType,
    surface,
    lat,
    lng,
    // Distinguishes multi-lot mutations (same id_mutation, different lots) and
    // collapses true exact-duplicate rows, without merging distinct sales that
    // happen to share price/surface/type but occurred on different dates.
    sourceKey: `${isoDate}_${postalCode}_${city}_${propertyType}_${surface}_${price}`,
  };
}

async function insertBatch(batch: Prisma.DVFTransactionCreateManyInput[]): Promise<{ inserted: number; failed: boolean }> {
  try {
    const result = await prisma.dVFTransaction.createMany({
      data: batch,
      skipDuplicates: true,
    });
    return { inserted: result.count, failed: false };
  } catch (error) {
    console.error(`❌ Batch insert failed (${batch.length} rows):`, error);
    return { inserted: 0, failed: true };
  }
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found at ${CSV_PATH}`);
  }

  let batch: Prisma.DVFTransactionCreateManyInput[] = [];
  let readCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;
  let failedBatchCount = 0;
  let nextLogAt = LOG_EVERY;

  const stream = fs.createReadStream(CSV_PATH).pipe(csv());

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (row: DvfCsvRow) => {
      readCount++;

      const parsed = parseRow(row);
      if (!parsed) {
        skippedCount++;
        return;
      }

      batch.push(parsed);

      if (batch.length === BATCH_SIZE) {
        stream.pause();
        const toInsert = batch;
        batch = [];

        insertBatch(toInsert)
          .then(({ inserted, failed }) => {
            insertedCount += inserted;
            if (failed) failedBatchCount++;

            if (insertedCount >= nextLogAt) {
              console.log(`Uploaded ${insertedCount.toLocaleString("fr-FR")} rows... (read ${readCount.toLocaleString("fr-FR")}, skipped ${skippedCount.toLocaleString("fr-FR")})`);
              nextLogAt += LOG_EVERY;
            }

            stream.resume();
          })
          .catch(reject);
      }
    });

    stream.on("end", () => {
      (async () => {
        if (batch.length > 0) {
          const { inserted, failed } = await insertBatch(batch);
          insertedCount += inserted;
          if (failed) failedBatchCount++;
        }
        resolve();
      })().catch(reject);
    });

    stream.on("error", (err) => {
      console.error("❌ Stream error:", err);
      reject(err);
    });
  });

  console.log("──────────────────────────────────────");
  console.log("✅ Import complete");
  console.log(`   Rows read:      ${readCount.toLocaleString("fr-FR")}`);
  console.log(`   Rows inserted:  ${insertedCount.toLocaleString("fr-FR")}`);
  console.log(`   Rows skipped:   ${skippedCount.toLocaleString("fr-FR")}`);
  console.log(`   Failed batches: ${failedBatchCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
