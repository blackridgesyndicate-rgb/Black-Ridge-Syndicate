import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeLineItemFinancials, calculateQuantityForRule, buildInitialLineItems, round2 } from "../src/lib/calc/estimate";
import { mergeByState } from "../src/lib/productAssemblyCore";

const db = new PrismaClient();

// Unit prices below are calibrated from a real contractor-submitted
// insurance estimate (ScopeConnect / price list ILCC8X_AUG26, Illinois,
// August 2026) rather than invented figures, so a generated estimate lines
// up with real-world Xactimate-style pricing for this market. These rows
// are seeded with state=null (the universal/default assembly) rather than
// scoped to "IL" specifically: the pricing was calibrated for Illinois, but
// the products themselves (GAF's national shingle/component line) aren't
// state-exclusive, and REGIONALLY_REVIEWED_STATES (src/lib/productAssembly.ts)
// records that only this Illinois-calibrated data has been reviewed —
// claims in other states use the same rows unreviewed until an admin adds
// real state-scoped overrides via the price-list editor (no code change
// required — see resolvePriceListForState()).
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
    manufacturer: "GAF",
    productName: "WeatherWatch Ice & Water Shield",
    technicalFunction: "Self-adhering waterproof membrane that seals around fastener penetrations, preventing water intrusion from ice damming at eaves and from concentrated runoff in valleys.",
    reasonSelected: "legally_required_code",
    compatibleSystems: "GAF Timberline HDZ laminate shingle system",
    applicablePitches: "2/12 and greater",
    climateSuitability: "Cold/mixed-humid climate — required in areas with a history of ice damming at the eaves per IRC R905.1.2.",
    codeRelevance: "IRC R905.1.2 (ice barrier)",
    installReference: "GAF WeatherWatch installation instructions — verify current edition at manufacturer site.",
    warrantyRelevance: "Required component of GAF System Plus / Golden Pledge warranty coverage.",
    standardOrUpgrade: "standard",
    dataSheetUrl: "https://www.gaf.com",
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
    manufacturer: "GAF",
    productName: "Pro-Start Starter Strip Shingles",
    technicalFunction: "Factory-applied adhesive starter course at eaves and rakes that seals the first course of field shingles against wind uplift and provides a straight, protected roof edge.",
    reasonSelected: "required_by_manufacturer",
    compatibleSystems: "GAF Timberline HDZ laminate shingle system",
    climateSuitability: "General use — wind-uplift performance benefits high-wind-exposure markets.",
    installReference: "GAF Pro-Start application instructions — verify current edition at manufacturer site.",
    warrantyRelevance: "GAF requires a GAF starter product for enhanced wind-warranty coverage.",
    standardOrUpgrade: "standard",
    dataSheetUrl: "https://www.gaf.com",
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
    manufacturer: "GAF",
    productName: "Timberline HDZ Laminate Shingles",
    technicalFunction: "Primary weatherproof roof covering — a laminated (dimensional) asphalt shingle providing the field roofing surface, wind resistance, and algae-resistant granule surfacing.",
    reasonSelected: "company_standard",
    compatibleSystems: "GAF Pro-Start starter, Seal-A-Ridge hip/ridge cap, WeatherWatch ice barrier, FeltBuster/synthetic underlayment",
    applicablePitches: "2/12 and greater (4/12+ for standard exposure)",
    climateSuitability: "LayerLock adhesive technology rated for high-wind markets; suitable for IL's mixed-humid, freeze-thaw climate.",
    codeRelevance: "ASTM D3462, Class A fire rating, UL 2218 Class 4 impact-resistant variant available",
    installReference: "GAF Timberline HDZ application instructions — verify current edition at manufacturer site.",
    warrantyRelevance: "Eligible for GAF System Plus and Golden Pledge extended warranties when installed with qualifying GAF accessories by a certified contractor.",
    standardOrUpgrade: "standard",
    dataSheetUrl: "https://www.gaf.com",
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
    manufacturer: "GAF",
    productName: "Seal-A-Ridge Hip & Ridge Cap Shingles",
    technicalFunction: "High-profile cap shingle engineered specifically for hip and ridge lines, sealing the roof's most wind-exposed edges against wind-driven rain.",
    reasonSelected: "required_by_manufacturer",
    compatibleSystems: "GAF Timberline HDZ laminate shingle system",
    installReference: "GAF Seal-A-Ridge application instructions — verify current edition at manufacturer site.",
    warrantyRelevance: "GAF requires a matching GAF hip/ridge product for System Plus and Golden Pledge warranty eligibility.",
    standardOrUpgrade: "standard",
    dataSheetUrl: "https://www.gaf.com",
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
    manufacturer: "GAF",
    productName: "Cobra Ridge Vent",
    technicalFunction: "Rigid, externally baffled exhaust vent installed along the ridge that provides continuous, balanced attic exhaust ventilation when paired with soffit/eave intake.",
    reasonSelected: "recommended_climate_performance",
    compatibleSystems: "GAF Timberline HDZ laminate shingle system, GAF Seal-A-Ridge cap",
    climateSuitability: "Balanced attic ventilation reduces winter ice-damming and summer heat buildup — particularly relevant in IL's cold/mixed-humid climate.",
    installReference: "GAF Cobra Ridge Vent installation instructions — verify current edition at manufacturer site; requires matched net-free-area intake ventilation to function as designed.",
    warrantyRelevance: "Contributes to GAF System Plus warranty eligibility as part of a complete GAF ventilation system.",
    standardOrUpgrade: "standard",
    dataSheetUrl: "https://www.gaf.com",
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

  // Nullable columns can't be used in Prisma's compound-unique upsert
  // shorthand (NULL never equals NULL in SQL), so resolve state-scoped
  // uniqueness manually instead.
  for (const item of PRICE_LIST) {
    const existing = await db.priceListItem.findFirst({
      where: { code: item.code, state: (item as { state?: string }).state ?? null },
    });
    if (existing) {
      await db.priceListItem.update({ where: { id: existing.id }, data: item });
    } else {
      await db.priceListItem.create({ data: item });
    }
  }
  console.log(`Price list seeded: ${PRICE_LIST.length} items.`);

  const existingClaim = await db.claim.findFirst({
    where: { claimNumber: "IL-2026-88451" },
  });
  if (existingClaim) {
    console.log("Insurance sample claim already exists — skipping.");
  } else {

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

  // Structured, individually-sourced citations mirroring the CodeReport
  // above — each carries its own source/section/verification status so the
  // report can show "JURISDICTION VERIFICATION REQUIRED" per-item rather
  // than an all-or-nothing verified flag. Permit/sales-tax items were not
  // covered by the OneClick Data report and are seeded unverified rather
  // than assumed.
  await db.codeCitation.createMany({
    data: [
      {
        claimId: claim.id,
        requirementKey: "ice_barrier",
        requirementText: "Ice barrier required, extending 24 in. inside the exterior wall line (36 in. on slopes 8/12+).",
        sourceName: "OneClick Data — address-specific code verification report",
        sourceUrl: "https://www.lith.org/",
        codeSection: "IRC R905.1.2",
        verificationStatus: "verified",
        verifiedDate: new Date("2026-06-18"),
        reviewedByUserId: user.id,
      },
      {
        claimId: claim.id,
        requirementKey: "drip_edge",
        requirementText: "Drip edge required at eaves and rakes, mechanically fastened at 12 in. o.c. max.",
        sourceName: "OneClick Data — address-specific code verification report",
        sourceUrl: "https://www.lith.org/",
        codeSection: "IRC R905.2.8.5",
        verificationStatus: "verified",
        verifiedDate: new Date("2026-06-18"),
        reviewedByUserId: user.id,
      },
      {
        claimId: claim.id,
        requirementKey: "valley_lining",
        requirementText: "Valley lining required per manufacturer instructions; open or closed valley options permitted per Table R905.2.8.2.",
        sourceName: "OneClick Data — address-specific code verification report",
        sourceUrl: "https://www.lith.org/",
        codeSection: "IRC R905.2.8.2",
        verificationStatus: "verified",
        verifiedDate: new Date("2026-06-18"),
        reviewedByUserId: user.id,
      },
      {
        claimId: claim.id,
        requirementKey: "underlayment",
        requirementText: "Underlayment shall conform to ASTM D226/D1970/D4869/D6757 and be applied per Table R905.1.1(2).",
        sourceName: "OneClick Data — address-specific code verification report",
        sourceUrl: "https://www.lith.org/",
        codeSection: "IRC R905.1.1",
        verificationStatus: "verified",
        verifiedDate: new Date("2026-06-18"),
        reviewedByUserId: user.id,
      },
      {
        claimId: claim.id,
        requirementKey: "layer_limitation",
        verificationStatus: "verification_required",
      },
      {
        claimId: claim.id,
        requirementKey: "permit",
        requirementText: "Confirm current permit requirement and application process for like-kind re-roofing directly with the Village Building Department.",
        verificationStatus: "verification_required",
      },
      {
        claimId: claim.id,
        requirementKey: "permit_fee",
        requirementText: "Confirm current permit fee schedule with the Village Building Department.",
        verificationStatus: "verification_required",
      },
      {
        claimId: claim.id,
        requirementKey: "sales_tax",
        verificationStatus: "verification_required",
      },
    ],
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

  // ---------------------------------------------------------------------
  // Retail sample claim — exercises the non-insurance pathway end to end
  // (RetailIntake, retail tiers, retail line-item pricing, no ACV/
  // depreciation/deductible anywhere in its data).
  // ---------------------------------------------------------------------

  const existingRetailTiers = await db.retailTier.count();
  if (existingRetailTiers === 0) {
    await db.retailTier.createMany({
      data: [
        { key: "good", label: "Good", position: 0, description: "Solid, code-compliant base system." },
        { key: "better", label: "Better", position: 1, description: "Upgraded shingle line and extended warranty." },
        { key: "best", label: "Best", position: 2, description: "Top-tier system with maximum warranty coverage." },
      ],
    });
    console.log("Retail tiers seeded: Good / Better / Best.");
  }

  const existingRetailClaim = await db.claim.findFirst({ where: { reportType: "retail", estimator: user.name } });
  if (existingRetailClaim) {
    console.log("Retail sample claim already exists — skipping.");
  } else {

  const retailCustomer = await db.customer.create({
    data: { name: "Robert & Ellen Marsh", phone: "(847) 555-0212", email: "rmarsh@example.com" },
  });
  const retailProperty = await db.property.create({
    data: {
      customerId: retailCustomer.id,
      addressLine1: "812 Windham Court",
      city: "Crystal Lake",
      state: "IL",
      zip: "60014",
    },
  });
  const retailClaim = await db.claim.create({
    data: {
      propertyId: retailProperty.id,
      reportType: "retail",
      estimator: user.name,
      inspectionDate: new Date("2026-08-25"),
      status: "estimating",
      createdById: user.id,
    },
  });

  await db.retailIntake.create({
    data: {
      claimId: retailClaim.id,
      desiredSystem: "GAF Timberline HDZ laminate shingles",
      desiredManufacturer: "GAF",
      shingleStyleColor: "Charcoal",
      warrantySelection: "GAF Golden Pledge (50-yr, transferable)",
      ventilationPreference: "Ridge vent with soffit intake",
      financingInterest: true,
      requestedTimeframe: "Within 60 days",
      knownLeaksConcerns: "Minor granule loss noted near the chimney; no active leaks reported by the homeowner.",
      existingRoofInfo: "Original 25-year architectural shingles installed circa 2003, never replaced.",
      budgetRangeMin: 18000,
      budgetRangeMax: 24000,
      selectedTierKey: "better",
    },
  });

  const retailMeasurement = await db.measurement.create({
    data: {
      claimId: retailClaim.id,
      roofAreaSqFt: 1842,
      measuredSquares: 18.42,
      facets: 8,
      predominantPitch: "6/12",
      pitchAreasJson: JSON.stringify([
        { pitch: "4/12", areaSqFt: 412 },
        { pitch: "6/12", areaSqFt: 1430 },
      ]),
      eaves: 84,
      rakes: 122,
      ridges: 58,
      hips: 0,
      valleys: 22,
      stepFlashingLength: 24,
      apronFlashingLength: 0,
      dripEdgeLength: 206,
      wastePercent: 10,
      membraneWidthFeet: 3,
      fieldSourceJson: JSON.stringify(
        Object.fromEntries(
          [
            "roofAreaSqFt", "measuredSquares", "facets", "predominantPitch", "eaves", "rakes", "ridges", "hips",
            "valleys", "stepFlashingLength", "dripEdgeLength",
          ].map((k) => [k, "manual"])
        )
      ),
    },
  });

  await db.accessory.createMany({
    data: [
      { claimId: retailClaim.id, type: "pipe_jack", quantity: 3 },
      { claimId: retailClaim.id, type: "ridge_vent", quantity: 58, unit: "lf" },
    ],
  });

  await db.inspectionFinding.create({
    data: {
      claimId: retailClaim.id,
      category: "slopes",
      location: "Chimney-adjacent field, south slope",
      damageType: "wear",
      description: "Granule loss and early-stage shingle curling consistent with age, not storm damage.",
      notes: "Homeowner-requested retail replacement — no insurance claim involved.",
    },
  });

  const [retailAllPriceList, retailAccessories] = await Promise.all([
    db.priceListItem.findMany({ where: { active: true } }),
    db.accessory.findMany({ where: { claimId: retailClaim.id } }),
  ]);
  const retailResolvedPriceList = mergeByState(retailAllPriceList, retailProperty.state);
  const retailLineItems = buildInitialLineItems(
    retailResolvedPriceList,
    retailMeasurement,
    retailAccessories,
    10,
    8.5,
    0,
    "retail"
  );

  await db.estimateRevision.create({
    data: {
      claimId: retailClaim.id,
      revisionNumber: 1,
      label: "Revision 1 — Better Package",
      status: "draft",
      wastePercent: 10,
      taxRatePercent: 8.5,
      defaultDepreciationPercent: 0,
      deductible: 0,
      priorPayments: 0,
      retailTierKey: "better",
      lineItems: { create: retailLineItems },
    },
  });

  // No third-party jurisdiction verification report was purchased for this
  // retail job — seeded honestly as outstanding rather than reused from a
  // different municipality (Lake in the Hills' citations do not apply
  // here). Demonstrates the "JURISDICTION VERIFICATION REQUIRED" fallback.
  await db.codeCitation.createMany({
    data: [
      { claimId: retailClaim.id, requirementKey: "ice_barrier", verificationStatus: "verification_required" },
      { claimId: retailClaim.id, requirementKey: "drip_edge", verificationStatus: "verification_required" },
      { claimId: retailClaim.id, requirementKey: "permit", verificationStatus: "verification_required" },
      { claimId: retailClaim.id, requirementKey: "sales_tax", verificationStatus: "verification_required" },
    ],
  });

  console.log(`Retail sample claim created for 812 Windham Court (claim id: ${retailClaim.id}).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
