import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeLineItemFinancials, calculateQuantityForRule, round2 } from "../src/lib/calc/estimate";

const db = new PrismaClient();

const PRICE_LIST = [
  {
    category: "Removal",
    code: "tear_off_laminated",
    description: "Tear off, haul, and dispose of laminated composition shingles",
    unit: "SQ",
    defaultUnitPrice: 65.0,
    taxable: false,
    calcRule: "removal_squares",
    sortOrder: 10,
  },
  {
    category: "Removal",
    code: "removal_high_roof",
    description: "Additional removal charge for high roof (2-story) areas",
    unit: "SQ",
    defaultUnitPrice: 18.0,
    taxable: false,
    calcRule: "removal_high_roof_squares",
    sortOrder: 20,
  },
  {
    category: "Underlayment",
    code: "ice_water_barrier",
    description: "Ice-and-water barrier (self-adhered membrane) at eaves and valleys",
    unit: "SQ",
    defaultUnitPrice: 128.0,
    taxable: true,
    calcRule: "ice_water_barrier_squares",
    codeCitation: "IRC R905.1.2",
    sortOrder: 30,
  },
  {
    category: "Underlayment",
    code: "roofing_underlayment",
    description: "Synthetic roofing underlayment — remaining field area",
    unit: "SQ",
    defaultUnitPrice: 24.0,
    taxable: true,
    calcRule: "underlayment_remaining_squares",
    codeCitation: "IRC R905.1.1",
    sortOrder: 40,
  },
  {
    category: "Components",
    code: "starter_course",
    description: "Universal starter course",
    unit: "LF",
    defaultUnitPrice: 2.75,
    taxable: true,
    calcRule: "starter_lf",
    sortOrder: 50,
  },
  {
    category: "Components",
    code: "gutter_apron",
    description: "Gutter apron",
    unit: "LF",
    defaultUnitPrice: 3.1,
    taxable: true,
    calcRule: "gutter_apron_lf",
    sortOrder: 60,
  },
  {
    category: "Components",
    code: "rake_drip_edge",
    description: "Rake drip edge",
    unit: "LF",
    defaultUnitPrice: 3.1,
    taxable: true,
    calcRule: "rake_drip_edge_lf",
    sortOrder: 70,
  },
  {
    category: "Roofing",
    code: "laminated_shingles",
    description: "Laminated composition shingles, architectural, installed",
    unit: "SQ",
    defaultUnitPrice: 385.0,
    taxable: true,
    calcRule: "install_squares",
    sortOrder: 80,
  },
  {
    category: "Roofing",
    code: "install_high_roof",
    description: "Additional installation charge for high roof (2-story) areas",
    unit: "SQ",
    defaultUnitPrice: 42.0,
    taxable: false,
    calcRule: "install_high_roof_squares",
    sortOrder: 90,
  },
  {
    category: "Roofing",
    code: "steep_slope_charge",
    description: "Steep-slope charge (7/12 to 9/12 and greater, per contractor policy)",
    unit: "SQ",
    defaultUnitPrice: 35.0,
    taxable: false,
    calcRule: "steep_slope_squares",
    sortOrder: 100,
  },
  {
    category: "Flashing",
    code: "pipe_jack_flashing",
    description: "Pipe-jack flashing, install",
    unit: "EA",
    defaultUnitPrice: 65.0,
    taxable: true,
    calcRule: "pipe_jack_count",
    sortOrder: 110,
  },
  {
    category: "Flashing",
    code: "step_flashing",
    description: "Step flashing",
    unit: "LF",
    defaultUnitPrice: 9.5,
    taxable: true,
    calcRule: "step_flashing_lf",
    sortOrder: 120,
  },
  {
    category: "Flashing",
    code: "counterflashing",
    description: "Counterflashing",
    unit: "LF",
    defaultUnitPrice: 11.0,
    taxable: true,
    calcRule: "counterflashing_lf",
    sortOrder: 130,
  },
  {
    category: "Flashing",
    code: "kickout_diverters",
    description: "Kick-out diverters",
    unit: "EA",
    defaultUnitPrice: 85.0,
    taxable: true,
    calcRule: "kickout_diverter_count",
    codeCitation: "IRC R903.2.1",
    sortOrder: 140,
  },
  {
    category: "Flashing",
    code: "chimney_flashing",
    description: "Chimney flashing, tear off and replace",
    unit: "EA",
    defaultUnitPrice: 425.0,
    taxable: true,
    calcRule: "chimney_flashing_count",
    sortOrder: 150,
  },
  {
    category: "Ventilation",
    code: "roof_vents",
    description: "Roof vents (turtle/box or powered), replace",
    unit: "EA",
    defaultUnitPrice: 95.0,
    taxable: true,
    calcRule: "roof_vent_count",
    sortOrder: 160,
  },
  {
    category: "Roofing",
    code: "hip_ridge_cap",
    description: "Hip and ridge cap, laminated",
    unit: "LF",
    defaultUnitPrice: 6.25,
    taxable: true,
    calcRule: "hip_ridge_cap_lf",
    sortOrder: 170,
  },
  {
    category: "Ventilation",
    code: "ridge_vent",
    description: "Ridge vent, shingle-over",
    unit: "LF",
    defaultUnitPrice: 8.75,
    taxable: true,
    calcRule: "ridge_vent_lf",
    sortOrder: 180,
  },
  {
    category: "Accessories",
    code: "satellite_reset",
    description: "Satellite dish detach and reset",
    unit: "EA",
    defaultUnitPrice: 125.0,
    taxable: false,
    calcRule: "satellite_reset_count",
    sortOrder: 190,
  },
  {
    category: "Structural",
    code: "decking_replacement",
    description: "Decking replacement, 1/2\" OSB or plywood",
    unit: "SF",
    defaultUnitPrice: 6.5,
    taxable: true,
    calcRule: "decking_replacement_sqft",
    codeCitation: "IRC R803",
    sortOrder: 200,
  },
  {
    category: "Administrative",
    code: "permit_fee",
    description: "Permit and administrative fees",
    unit: "LS",
    defaultUnitPrice: 350.0,
    taxable: false,
    calcRule: null,
    sortOrder: 210,
  },
];

async function main() {
  console.log("Seeding Black Ridge Scope Desk...");

  const passwordHash = await bcrypt.hash("BlackRidge2024!", 12);
  const user = await db.user.upsert({
    where: { email: "estimator@blackridgeroofing.com" },
    update: {},
    create: {
      email: "estimator@blackridgeroofing.com",
      passwordHash,
      name: "Alex Ridgeline",
      role: "admin",
    },
  });
  console.log(`User ready: ${user.email} (password: BlackRidge2024!)`);

  for (const item of PRICE_LIST) {
    await db.priceListItem.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }
  console.log(`Price list seeded: ${PRICE_LIST.length} items.`);

  const existingClaim = await db.claim.findFirst({
    where: { claimNumber: "IL-2024-88451" },
  });
  if (existingClaim) {
    console.log("Sample claim already exists — skipping sample data.");
    return;
  }

  const customer = await db.customer.create({
    data: { name: "Martin & Diane Callahan", phone: "(847) 555-0148", email: "mcallahan@example.com" },
  });
  const property = await db.property.create({
    data: {
      customerId: customer.id,
      addressLine1: "3950 Peartree Drive",
      city: "Lake in the Hills",
      state: "IL",
      zip: "60156",
    },
  });
  const claim = await db.claim.create({
    data: {
      propertyId: property.id,
      insuranceCarrier: "State Farm",
      claimNumber: "IL-2024-88451",
      policyNumber: "36-BH-K482-9",
      dateOfLoss: new Date("2024-06-12"),
      estimator: user.name,
      inspectionDate: new Date("2024-06-20"),
      status: "estimating",
      createdById: user.id,
    },
  });

  const measurement = await db.measurement.create({
    data: {
      claimId: claim.id,
      roofAreaSqFt: 2173,
      measuredSquares: 21.73,
      facets: 12,
      predominantPitch: "6/12",
      pitchAreasJson: JSON.stringify([
        { pitch: "6/12", areaSqFt: 849 },
        { pitch: "7/12", areaSqFt: 1325 },
      ]),
      eaves: 97,
      rakes: 160,
      ridges: 76,
      hips: 5,
      valleys: 54,
      stepFlashingLength: 48,
      apronFlashingLength: 8,
      dripEdgeLength: 258,
      wastePercent: 12,
      membraneWidthFeet: 3,
      fieldSourceJson: JSON.stringify(
        Object.fromEntries(
          [
            "roofAreaSqFt",
            "measuredSquares",
            "facets",
            "predominantPitch",
            "pitchAreas",
            "eaves",
            "rakes",
            "ridges",
            "hips",
            "valleys",
            "stepFlashingLength",
            "apronFlashingLength",
            "dripEdgeLength",
            "wastePercent",
          ].map((k) => [k, "extracted"])
        )
      ),
      originalValuesJson: JSON.stringify({
        roofAreaSqFt: 2173,
        measuredSquares: 21.73,
        facets: 12,
        eaves: 97,
        rakes: 160,
        ridges: 76,
        hips: 5,
        valleys: 54,
        stepFlashingLength: 48,
        apronFlashingLength: 8,
        dripEdgeLength: 258,
        wastePercent: 12,
      }),
    },
  });

  await db.measurementReport.create({
    data: {
      claimId: claim.id,
      sourceFileId: (
        await db.uploadedFile.create({
          data: {
            claimId: claim.id,
            kind: "measurement_report",
            filename: "3950-peartree-drive-sample-report.pdf",
            storageKey: `claims/${claim.id}/seed-sample-report.pdf`,
            mimeType: "application/pdf",
            size: 0,
          },
        })
      ).id,
      parserType: "gaf_quickmeasure",
      status: "extracted",
      rawText: "Sample seed data — no source PDF stored on disk.",
      extracted: JSON.stringify({ note: "Seed data pre-populated for demo purposes." }),
      errorMessage: "Seed record — synthetic sample data based on the acceptance-test address.",
    },
  });

  await db.accessory.createMany({
    data: [
      { claimId: claim.id, type: "pipe_jack", quantity: 3, unit: "ea" },
      { claimId: claim.id, type: "turtle_box_vent", quantity: 4, unit: "ea" },
      { claimId: claim.id, type: "chimney", quantity: 1, unit: "ea", notes: "Brick chimney, rear slope" },
      { claimId: claim.id, type: "chimney_flashing", quantity: 1, unit: "ea" },
      { claimId: claim.id, type: "kickout_diverter", quantity: 2, unit: "ea" },
      { claimId: claim.id, type: "gutter", quantity: 190, unit: "lf" },
      { claimId: claim.id, type: "downspout", quantity: 6, unit: "ea" },
    ],
  });

  await db.inspectionFinding.createMany({
    data: [
      {
        claimId: claim.id,
        category: "slopes",
        location: "All slopes",
        damageType: "hail",
        description: "Random hail impacts with mat exposure across all roof facets, consistent with wind-driven hail.",
        notes: "Test squares marked on north and south slopes; 12-14 hits per 10x10 square.",
      },
      {
        claimId: claim.id,
        category: "flashings",
        location: "Rear chimney",
        damageType: "wear",
        description: "Chimney step flashing shows granule loss and rust staining consistent with age-related wear.",
      },
      {
        claimId: claim.id,
        category: "gutters",
        location: "Front and rear gutters",
        damageType: "hail",
        description: "Denting on gutters and downspouts consistent with hail impact.",
      },
    ],
  });

  await db.codeReport.create({
    data: {
      claimId: claim.id,
      authorityHavingJurisdiction: "Village of Lake in the Hills, IL — Building & Code Enforcement Division",
      departmentContact: "Verification required — confirm current contact via village office before submission.",
      adoptedCodeEdition: "Verification required — confirm currently adopted IRC/IBC edition with the AHJ.",
      permitRequirements: "Verification required — confirm permit requirement for like-kind re-roofing with the AHJ.",
      iceBarrierRequirement:
        "IRC R905.1.2 (as adopted by the State of Illinois) generally requires an ice barrier from the eave's lowest edge to at least 24 in. inside the exterior wall line in regions with a history of ice forming along the eaves. Verification required against the locally adopted code edition.",
      dripEdgeRequirement:
        "IRC R905.2.8.5 generally requires drip edge at eaves and rakes. Verification required against the locally adopted code edition.",
      sourceUrl: "https://www.lith.org/",
      verified: false,
      notes:
        "Citations above reference the model IRC provision typically adopted in Illinois; the specific local amendment and current edition must be confirmed directly with the Village before being relied upon in a claim submission.",
    },
  });

  await db.weatherEvent.create({
    data: {
      claimId: claim.id,
      eventDate: new Date("2024-06-12"),
      eventType: "hail",
      hailSizeInches: 1.5,
      distanceFromPropertyMiles: 0,
      evidenceLevel: "area_reported",
      source: "NOAA NCEI Storm Events Database",
      sourceUrl: "https://www.ncdc.noaa.gov/stormevents/",
      confidenceLevel: "medium",
      notes:
        "Placeholder entry based on the claimed date of loss. Confirm against the NCEI Storm Events Database export before relying on this in a report — this record has not yet been cross-checked against an actual NOAA/NCEI export.",
    },
  });

  const [priceList, accessories] = await Promise.all([
    db.priceListItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.accessory.findMany({ where: { claimId: claim.id } }),
  ]);

  const wastePercent = 12;
  const taxRatePercent = 8.5;

  const lineItemsData = priceList.map((p, idx) => {
    const calcQty = calculateQuantityForRule(
      p.calcRule,
      { ...measurement, wastePercent },
      accessories
    );
    const quantity = calcQty ?? 0;
    const financials = computeLineItemFinancials({
      quantity,
      unitPrice: p.defaultUnitPrice,
      taxable: p.taxable,
      taxableMaterialAmount: null,
      taxRatePercent: p.taxable ? taxRatePercent : 0,
      depreciationPercent: 20,
    });
    return {
      category: p.category,
      description: p.description,
      unit: p.unit,
      quantity: round2(quantity),
      calculatedQuantity: calcQty,
      quantityOverridden: false,
      unitPrice: p.defaultUnitPrice,
      taxable: p.taxable,
      taxRatePercent: p.taxable ? taxRatePercent : 0,
      codeCitation: p.codeCitation ?? null,
      included: true,
      sortOrder: idx,
      priceListItemCode: p.code,
      depreciationPercent: 20,
      ...financials,
    };
  });

  await db.estimateRevision.create({
    data: {
      claimId: claim.id,
      revisionNumber: 1,
      label: "Revision 1 — Initial Estimate",
      status: "draft",
      wastePercent,
      taxRatePercent,
      defaultDepreciationPercent: 20,
      deductible: 1000,
      priorPayments: 0,
      lineItems: { create: lineItemsData },
    },
  });

  console.log(`Sample claim created for 3950 Peartree Drive (claim id: ${claim.id}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
