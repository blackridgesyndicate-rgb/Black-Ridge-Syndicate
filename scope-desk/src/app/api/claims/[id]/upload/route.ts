import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { storage, newStorageKey, validateUpload, mimeTypeForExt } from "@/lib/storage";
import { runParser } from "@/lib/parsers";
import { buildMeasurementCreateData } from "@/lib/measurementMerge";
import { runJob } from "@/lib/jobs";
import { parseCodeReportPdf, type ExtractedCodeReportFields } from "@/lib/parsers/codeReportParser";
import { parseWeatherReportPdf, type ExtractedWeatherRow } from "@/lib/parsers/weatherReportParser";

const VALID_KINDS = ["measurement_report", "carrier_estimate", "code_report", "weather_report", "photo", "other"];

async function applyCodeReportFields(claimId: string, fields: ExtractedCodeReportFields) {
  if (Object.keys(fields).length === 0) return null;
  const { verificationDate, ...rest } = fields;
  const data = {
    ...rest,
    ...(verificationDate ? { verificationDate: new Date(verificationDate), verified: true } : {}),
  };
  return db.codeReport.upsert({
    where: { claimId },
    create: { claimId, ...data },
    update: data,
  });
}

async function applyWeatherRows(claimId: string, rows: ExtractedWeatherRow[]) {
  if (rows.length === 0) return 0;
  const existing = await db.weatherEvent.findMany({
    where: { claimId },
    select: { eventDate: true, eventType: true, hailSizeInches: true, windSpeedMph: true },
  });
  const existingKeys = new Set(
    existing.map(
      (e) =>
        `${e.eventType}|${e.eventDate.toISOString().slice(0, 10)}|${e.hailSizeInches ?? ""}|${e.windSpeedMph ?? ""}`
    )
  );
  const toCreate = rows.filter(
    (r) => !existingKeys.has(`${r.eventType}|${r.eventDate}|${r.hailSizeInches ?? ""}|${r.windSpeedMph ?? ""}`)
  );
  if (toCreate.length === 0) return 0;
  await db.weatherEvent.createMany({
    data: toCreate.map((r) => ({
      claimId,
      eventDate: new Date(r.eventDate),
      eventType: r.eventType,
      hailSizeInches: r.hailSizeInches ?? null,
      windSpeedMph: r.windSpeedMph ?? null,
      evidenceLevel: "area_reported",
      source: "Predictive Sales AI — Verified Extreme Weather Report",
      confidenceLevel: r.confidenceLevel,
    })),
  });
  return toCreate.length;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;

    const claim = await db.claim.findUnique({ where: { id: claimId }, include: { property: true } });
    if (!claim) throw new ApiError(404, "Claim not found");

    const formData = await req.formData();
    const kind = String(formData.get("kind") ?? "other");
    if (!VALID_KINDS.includes(kind)) throw new ApiError(400, `Invalid upload kind: ${kind}`);

    const file = formData.get("file");
    if (!(file instanceof Blob)) throw new ApiError(400, "No file provided");
    const filename = (file as File).name ?? "upload";
    const caption = formData.get("caption");
    const damageClassification = formData.get("damageClassification");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validationError = validateUpload(kind, filename, buffer.length);
    if (validationError) throw new ApiError(400, validationError);

    const storageKey = newStorageKey(claimId, filename);
    await storage.put(storageKey, buffer);

    const uploadedFile = await db.uploadedFile.create({
      data: {
        claimId,
        kind,
        filename,
        storageKey,
        mimeType: mimeTypeForExt(filename),
        size: buffer.length,
      },
    });

    if (kind === "photo") {
      const photo = await db.photo.create({
        data: {
          claimId,
          fileId: uploadedFile.id,
          caption: typeof caption === "string" && caption ? caption : null,
          damageClassification:
            typeof damageClassification === "string" && damageClassification ? damageClassification : null,
        },
        include: { file: true },
      });
      return NextResponse.json({ file: uploadedFile, photo }, { status: 201 });
    }

    if (kind === "measurement_report") {
      const { parserType, result } = await runJob(`parse-measurement-report:${uploadedFile.id}`, () =>
        runParser(filename, buffer)
      );

      const hasAnyField = Object.keys(result.fields).length > 0;
      const report = await db.measurementReport.create({
        data: {
          claimId,
          sourceFileId: uploadedFile.id,
          parserType,
          status: hasAnyField ? "extracted" : "needs_review",
          rawText: result.rawText?.slice(0, 200_000) ?? null,
          extracted: JSON.stringify(result.fields),
          errorMessage: result.warnings.join(" "),
        },
      });

      const existingMeasurement = await db.measurement.findUnique({ where: { claimId } });
      const { data, fieldSourceJson, originalValuesJson } = buildMeasurementCreateData(result.fields);

      let measurement;
      if (!existingMeasurement) {
        measurement = await db.measurement.create({
          data: { claimId, ...data, fieldSourceJson, originalValuesJson },
        });
      } else {
        // A newer report was uploaded on an existing job: merge new extracted
        // values in without clobbering fields the contractor already hand-edited.
        const prevSource: Record<string, string> = existingMeasurement.fieldSourceJson
          ? JSON.parse(existingMeasurement.fieldSourceJson)
          : {};
        const mergedData: Record<string, unknown> = {};
        const mergedSource: Record<string, string> = { ...prevSource };
        for (const [key, value] of Object.entries(data)) {
          const baseKey = key.replace(/Json$/, "").replace("pitchAreas", "pitchAreas");
          if (prevSource[baseKey] !== "manual") {
            mergedData[key] = value;
            mergedSource[baseKey] = "extracted";
          }
        }
        measurement = await db.measurement.update({
          where: { claimId },
          data: { ...mergedData, fieldSourceJson: JSON.stringify(mergedSource) },
        });
      }

      return NextResponse.json({ file: uploadedFile, report, measurement }, { status: 201 });
    }

    if (kind === "code_report" || kind === "weather_report") {
      // Some vendors bundle jurisdiction/code data and weather history into
      // one PDF, so both extractors always run regardless of which tab the
      // file was uploaded from — whichever sections are actually present
      // get imported.
      const propertyAddressLine = `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}`;
      const [codeResult, weatherResult] = await runJob(`parse-code-weather-report:${uploadedFile.id}`, () =>
        Promise.all([
          parseCodeReportPdf(buffer, filename, propertyAddressLine),
          parseWeatherReportPdf(buffer, filename),
        ])
      );

      const codeReport = await applyCodeReportFields(claimId, codeResult.fields);
      const createdWeatherCount = await applyWeatherRows(claimId, weatherResult.rows);

      const warnings = [
        ...(kind === "code_report" ? codeResult.warnings : []),
        ...(kind === "weather_report" ? weatherResult.warnings : []),
      ];
      if (kind === "code_report" && createdWeatherCount > 0) {
        warnings.push(`Also found and imported ${createdWeatherCount} weather event(s) from this document.`);
      }
      if (kind === "weather_report" && codeReport) {
        warnings.push("Also found and imported code-report fields from this document.");
      }
      if (warnings.length === 0) {
        warnings.push("No recognized data was found in this document for either the code report or weather history.");
      }

      return NextResponse.json(
        {
          file: uploadedFile,
          codeReport,
          weatherEventsCreated: createdWeatherCount,
          warnings,
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ file: uploadedFile }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
