import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeLineItemFinancials, calculateQuantityForRule, round2 } from "../src/lib/calc/estimate";

const db = new PrismaClient();

// Unit prices below are calibrated from a real contractor-submitted
// insurance estimate (ScopeConnect / price list ILCC8X_AUG26, Illinois,
// August 2026) rather than invented figures, so a generated estimate lines
// up with real-world Xactimate-style pricing for this market.
const PRICE_LIST = [
  {
    category: "Removal",
    code: "tear_off_laminated",
    description: "Tear off, haul, and dispose of laminated composition shingles",
    unit: "SQ",
    defaultUnitPrice: 101.27,
    taxable: false,
    calcRule: "removal_squares",
    sortOrder: 10,
  },
  {
    category: "Removal",
    code: "removal_high_roof",
    description: "Additional removal charge for high roof (2-story) areas",
    unit: "SQ",
    defaultUnitPrice: 9.55,
    taxable: false,
    calcRule: "removal_high_roof_squares",
    sortOrder: 20,
  },
  {
    category: "Underlayment",
    code: "ice_water_barrier",
    description: "Ice and water barrier — eaves and valleys",
    unit: "SF",
    defaultUnitPrice: 1.97,
    taxable: true,
    calcRule: "ice_water_barrier_sf",
    codeCitation: "IRC R905.1.2",
    sortOrder: 30,
  },
  {
    category: "Underlayment",
    code: "roofing_underlayment",
    description: "Roofing felt underlayment — 15 lb., remaining field area",
    unit: "SQ",
    defaultUnitPrice: 42.83,
    taxable: true,
    calcRule: "underlayment_remaining_squares",
    codeCitation: "IRC R905.1.1",
    sortOrder: 40,
  },
  {
    category: "Components",
    code: "starter_course",
    description: "Asphalt starter — universal starter course",
    unit: "LF",
    defaultUnitPrice: 2.16,
    taxable: true,
    calcRule: "starter_lf",
    sortOrder: 50,
  },
  {
    category: "Components",
    code: "gutter_apron",
    description: "Drip edge / gutter apron",
    unit: "LF",
    defaultUnitPrice: 3.59,
    taxable: true,
    calcRule: "gutter_apron_lf",
    sortOrder: 60,
  },
  {
    category: "Components",
    code: "rake_drip_edge",
    description: "Drip edge",
    unit: "LF",
    defaultUnitPrice: 3.24,
    taxable: true,
    calcRule: "rake_drip_edge_lf",
    sortOrder: 70,
  },
  {
    category: "Roofing",
    code: "laminated_shingles",
    description: "Laminated composition shingle roofing — without felt",
    unit: "SQ",
    defaultUnitPrice: 290.27,
    taxable: true,
    calcRule: "install_squares",
    sortOrder: 80,
  },
  {
    category: "Roofing",
    code: "install_high_roof",
    description: "Additional installation charge for high roof (2-story) areas",
    unit: "SQ",
    defaultUnitPrice: 26.21,
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
    description: "Flashing — pipe jack",
    unit: "EA",
    defaultUnitPrice: 61.1,
    taxable: true,
    calcRule: "pipe_jack_count",
    sortOrder: 110,
  },
  {
    category: "Flashing",
    code: "step_flashing",
    description: "Step flashing",
    unit: "LF",
    defaultUnitPrice: 12.96,
    taxable: true,
    calcRule: "step_flashing_lf",
    sortOrder: 120,
  },
  {
    category: "Flashing",
    code: "counterflashing",
    description: "R&R counterflashing / apron flashing",
    unit: "LF",
    defaultUnitPrice: 14.07,
    taxable: true,
    calcRule: "counterflashing_lf",
    sortOrder: 130,
  },
  {
    category: "Flashing",
    code: "kickout_diverters",
    description: "Flashing — kick-out diverter",
    unit: "EA",
    defaultUnitPrice: 32.55,
    taxable: true,
    calcRule: "kickout_diverter_count",
    codeCitation: "IRC R903.2.1",
    sortOrder: 140,
  },
  {
    category: "Flashing",
    code: "chimney_flashing",
    description: "R&R chimney flashing — average (32 in. x 36 in.)",
    unit: "EA",
    defaultUnitPrice: 560.44,
    taxable: true,
    calcRule: "chimney_flashing_count",
    sortOrder: 150,
  },
  {
    category: "Ventilation",
    code: "roof_vents",
    description: "Roof vent — turtle type, metal",
    unit: "EA",
    defaultUnitPrice: 81.51,
    taxable: true,
    calcRule: "roof_vent_count",
    sortOrder: 160,
  },
  {
    category: "Roofing",
    code: "hip_ridge_cap",
    description: "Hip / ridge cap — standard profile, composition shingles",
    unit: "LF",
    defaultUnitPrice: 7.05,
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
    description: "Digital satellite system — detach and reset",
    unit: "EA",
    defaultUnitPrice: 63.82,
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
    description: "Taxes, insurance, permits and fees (bid item)",
    unit: "EA",
    defaultUnitPrice: 200.0,
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
      claimNumber: "IL-2026-88451",
      policyNumber: "36-BH-K482-9",
      // 1.5" hail + 80 mph wind — the most severe event in the verified
      // weather history for this address (see seeded WeatherEvent records).
      dateOfLoss: new Date("2026-06-24"),
      estimator: user.name,
      inspectionDate: new Date("2026-08-20"),
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
      predominantPitch: "7/12",
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

  // Sourced from a real third-party jurisdiction/code verification report
  // (OneClick Data "Residential Roofing Report Lite" for this address,
  // data verified as of 06/18/2026) rather than invented — the fields left
  // as "Verification required" below genuinely were not covered by that
  // report and still need direct confirmation before relying on them.
  await db.codeReport.create({
    data: {
      claimId: claim.id,
      authorityHavingJurisdiction: "Village of Lake in the Hills, IL",
      departmentContact:
        "Chief Building Official: Marc Nard — (847) 960-7443 — jsvalenka@lith.org — https://www.lith.org",
      adoptedCodeEdition: "2021 IRC; 2021 IECC (climate zone 5 - Moist). Verified as of 06/18/2026.",
      permitRequirements:
        "Verification required — confirm current permit requirement and application process for like-kind re-roofing directly with the Village Building Department.",
      permitFees: "Verification required — confirm current permit fee schedule with the Village Building Department.",
      iceBarrierRequirement:
        "IRC R905.1.2 Ice Barriers: In areas where there has been a history of ice forming along the eaves causing a backup of water as designated in Table R301.2, an ice barrier shall be installed for asphalt shingles, metal roof shingles, mineral-surfaced roll roofing, slate and slate-type shingles, wood shingles and wood shakes. The ice barrier shall consist of not fewer than two layers of underlayment cemented together, or a self-adhering polymer-modified bitumen sheet shall be used in place of normal underlayment and extend from the lowest edges of all roof surfaces to a point not less than 24 inches (610 mm) inside the exterior wall line of the building. On roofs with slope equal to or greater than 8 units vertical in 12 units horizontal (67-percent slope), the ice barrier shall be applied not less than 36 inches (914 mm) measured along the roof slope from the eave edge of the building. Exception: detached accessory structures not containing conditioned floor area.",
      dripEdgeRequirement:
        "IRC R905.2.8.5 Drip Edge: A drip edge shall be provided at eaves and rake edges of shingle roofs. Adjacent segments of drip edge shall be overlapped not less than 2 inches (51 mm). Drip edges shall extend not less than 1/4 inch (6.4 mm) below the roof sheathing and extend up back onto the roof deck not less than 2 inches (51 mm). Drip edges shall be mechanically fastened to the roof deck at not more than 12 inches (305 mm) o.c. with fasteners as specified in Section R905.2.5. Underlayment shall be installed over the drip edge along eaves and under the drip edge along rake edges.",
      valleyLiningRequirement:
        "IRC R905.2.8.2 Valleys: Valley linings shall be installed in accordance with the manufacturer's instructions before applying shingles. For open valleys lined with metal, the valley lining shall be not less than 24 inches (610 mm) wide and of a corrosion-resistant metal per Table R905.2.8.2. For open valleys with two plies of mineral-surfaced roll roofing (ASTM D3909 or D6380 Class M), the bottom layer shall be 18 inches and the top layer not less than 36 inches wide. For closed valleys, one ply of smooth roll roofing (ASTM D6380) not less than 36 inches wide, or self-adhering polymer-modified bitumen underlayment (ASTM D1970), is permitted.",
      underlaymentRequirement:
        "IRC R905.1.1 Underlayment, Table R905.1.1(2): Underlayment for asphalt shingles shall conform to ASTM D226, D1970, D4869, or D6757 and be applied per Table R905.1.1(2) and attached per Table R905.1.1(3). Alternative: self-adhering polymer-modified bitumen underlayment (ASTM D1970) installed per the manufacturer's instructions is permitted in lieu of the standard layered application.",
      chimneyCricketRequirement:
        "IRC R1003.20 Chimney Crickets: Chimneys shall be provided with crickets where the dimension parallel to the ridgeline is greater than 30 inches (762 mm) and does not intersect the ridgeline. The intersection of the cricket and the chimney shall be flashed and counterflashed in the same manner as normal roof-chimney intersections. Crickets shall be constructed in compliance with Figure R1003.20 and Table R1003.20.",
      sourceUrl: "https://www.lith.org/",
      verified: true,
      verificationDate: new Date("2026-06-18"),
      notes:
        "Jurisdiction, adopted code editions, municipal contact, and the code-text citations above are sourced from a third-party address-specific code verification report (OneClick Data, data verified as of 06/18/2026) and from the model 2021 IRC provisions it cites. Permit requirements/fees were not covered by that report and are marked Verification required rather than assumed. Re-verify all citations against the Village's currently adopted local amendments before final claim submission — third-party verification services are not a substitute for confirming directly with the AHJ.",
    },
  });

  // Sourced from a real address-specific verified weather history report
  // (Predictive Sales AI "Verified Extreme Weather Report") rather than
  // invented dates/magnitudes. Only the subset most relevant to the claimed
  // date of loss is seeded here; the full multi-year history the source
  // report contains is intentionally not all transcribed.
  await db.weatherEvent.createMany({
    data: [
      {
        claimId: claim.id,
        eventDate: new Date("2026-06-24"),
        eventType: "hail",
        hailSizeInches: 1.5,
        windSpeedMph: 80,
        distanceFromPropertyMiles: 0,
        evidenceLevel: "verified_report_at_coordinate",
        source: "Predictive Sales AI — Verified Extreme Weather Report",
        sourceUrl: "https://predictivesales.ai/",
        confidenceLevel: "high",
        notes:
          "Most severe verified event in the report period; storm impact zone flagged as over the property address. Proposed primary date of loss.",
      },
      {
        claimId: claim.id,
        eventDate: new Date("2026-07-03"),
        eventType: "wind",
        windSpeedMph: 60,
        distanceFromPropertyMiles: 0,
        evidenceLevel: "area_reported",
        source: "Predictive Sales AI — Verified Extreme Weather Report",
        sourceUrl: "https://predictivesales.ai/",
        confidenceLevel: "medium",
      },
      {
        claimId: claim.id,
        eventDate: new Date("2026-07-04"),
        eventType: "hail",
        hailSizeInches: 0.75,
        distanceFromPropertyMiles: 0,
        evidenceLevel: "area_reported",
        source: "Predictive Sales AI — Verified Extreme Weather Report",
        sourceUrl: "https://predictivesales.ai/",
        confidenceLevel: "medium",
      },
      {
        claimId: claim.id,
        eventDate: new Date("2026-07-27"),
        eventType: "hail",
        hailSizeInches: 1,
        windSpeedMph: 55,
        distanceFromPropertyMiles: 0,
        evidenceLevel: "verified_report_at_coordinate",
        source: "Predictive Sales AI — Verified Extreme Weather Report",
        sourceUrl: "https://predictivesales.ai/",
        confidenceLevel: "high",
      },
      {
        claimId: claim.id,
        eventDate: new Date("2026-08-09"),
        eventType: "hail",
        hailSizeInches: 0.5,
        distanceFromPropertyMiles: 0,
        evidenceLevel: "area_reported",
        source: "Predictive Sales AI — Verified Extreme Weather Report",
        sourceUrl: "https://predictivesales.ai/",
        confidenceLevel: "medium",
      },
      {
        claimId: claim.id,
        eventDate: new Date("2026-08-12"),
        eventType: "wind",
        windSpeedMph: 50,
        distanceFromPropertyMiles: 0,
        evidenceLevel: "area_reported",
        source: "Predictive Sales AI — Verified Extreme Weather Report",
        sourceUrl: "https://predictivesales.ai/",
        confidenceLevel: "medium",
        notes:
          "Post-inspection event, listed for completeness; not applicable as cause of the claimed loss.",
      },
    ],
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
