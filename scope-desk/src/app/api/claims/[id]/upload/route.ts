import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { storage, newStorageKey, validateUpload, mimeTypeForExt } from "@/lib/storage";
import { runParser } from "@/lib/parsers";
import { buildMeasurementCreateData } from "@/lib/measurementMerge";
import { runJob } from "@/lib/jobs";

const VALID_KINDS = ["measurement_report", "carrier_estimate", "photo", "other"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;

    const claim = await db.claim.findUnique({ where: { id: claimId } });
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

    return NextResponse.json({ file: uploadedFile }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
