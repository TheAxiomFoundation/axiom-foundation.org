import type { Program } from "./types";

/**
 * Flagship seed of the program registry.
 *
 * Anchors reference real atomic citation_paths; when a path hasn't
 * been ingested yet the resolver will land on the nearest ancestor
 * and the Atlas viewer shows a "not yet ingested" marker. This is the
 * correct behaviour — the registry captures intent, the atlas
 * captures reality, and the gap is a coverage signal rather than a
 * bug.
 */
export const PROGRAM_SEED: Program[] = [
  // ─────────────────────────────────────────────── US federal
  {
    slug: "snap",
    displayName: "Supplemental Nutrition Assistance Program",
    aliases: ["snap", "food stamps", "supplemental nutrition assistance"],
    jurisdiction: "us",
    governingBody: "USDA Food & Nutrition Service",
    summary:
      "Federal food-assistance program administered by states; covers roughly 1 in 8 Americans.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/7/2011",
        label: "Authorizing statute",
        displayCitation: "7 U.S.C. § 2011",
      },
      {
        role: "regulations",
        citationPath: "us/regulation/7/273",
        label: "Eligibility & administration regulations",
        displayCitation: "7 CFR Part 273",
      },
      {
        role: "income_tests",
        citationPath: "us/regulation/7/273/9",
        label: "Income eligibility and deductions",
        displayCitation: "7 CFR § 273.9",
      },
      {
        role: "deductions",
        citationPath: "us/regulation/7/273/9/c/1",
        label: "Standard deduction",
        displayCitation: "7 CFR § 273.9(c)(1)",
      },
      {
        role: "deductions",
        citationPath: "us/regulation/7/273/9/d/6",
        label: "Excess shelter deduction",
        displayCitation: "7 CFR § 273.9(d)(6)",
      },
      {
        role: "benefit_calculation",
        citationPath: "us/regulation/7/273/10/e",
        label: "Benefit calculation",
        displayCitation: "7 CFR § 273.10(e)",
      },
    ],
  },
  {
    slug: "eitc",
    displayName: "Earned Income Tax Credit",
    aliases: ["eitc", "earned income tax credit", "earned income credit", "eic"],
    jurisdiction: "us",
    governingBody: "IRS",
    summary:
      "Refundable federal tax credit for low- and moderate-income working households.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/26/32",
        label: "EITC statute",
        displayCitation: "26 U.S.C. § 32",
      },
      {
        role: "benefit_calculation",
        citationPath: "us/statute/26/32/a",
        label: "Credit amount",
        displayCitation: "26 U.S.C. § 32(a)",
      },
      {
        role: "phase_out",
        citationPath: "us/statute/26/32/b",
        label: "Phase-out rules",
        displayCitation: "26 U.S.C. § 32(b)",
      },
      {
        role: "eligibility",
        citationPath: "us/statute/26/32/c",
        label: "Qualifying child and taxpayer",
        displayCitation: "26 U.S.C. § 32(c)",
      },
    ],
  },
  {
    slug: "ctc",
    displayName: "Child Tax Credit",
    aliases: [
      "ctc",
      "child tax credit",
      "additional child tax credit",
      "actc",
    ],
    jurisdiction: "us",
    governingBody: "IRS",
    summary:
      "Per-child federal tax credit, partially refundable via the Additional Child Tax Credit.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/26/24",
        label: "CTC statute",
        displayCitation: "26 U.S.C. § 24",
      },
      {
        role: "benefit_calculation",
        citationPath: "us/statute/26/24/a",
        label: "Credit amount",
        displayCitation: "26 U.S.C. § 24(a)",
      },
      {
        role: "phase_out",
        citationPath: "us/statute/26/24/b",
        label: "Income phase-out",
        displayCitation: "26 U.S.C. § 24(b)",
      },
      {
        role: "eligibility",
        citationPath: "us/statute/26/24/c",
        label: "Qualifying child",
        displayCitation: "26 U.S.C. § 24(c)",
      },
      {
        role: "benefit_calculation",
        citationPath: "us/statute/26/24/d",
        label: "Refundable portion (ACTC)",
        displayCitation: "26 U.S.C. § 24(d)",
      },
    ],
  },
  {
    slug: "ssi",
    displayName: "Supplemental Security Income",
    aliases: ["ssi", "supplemental security income"],
    jurisdiction: "us",
    governingBody: "Social Security Administration",
    summary:
      "Cash assistance for aged, blind, or disabled individuals with limited income and resources.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/42/1381",
        label: "Authorizing statute",
        displayCitation: "42 U.S.C. § 1381",
      },
      {
        role: "benefit_calculation",
        citationPath: "us/statute/42/1382",
        label: "Benefit rate & eligibility",
        displayCitation: "42 U.S.C. § 1382",
      },
      {
        role: "income_tests",
        citationPath: "us/statute/42/1382a",
        label: "Income treatment",
        displayCitation: "42 U.S.C. § 1382a",
      },
      {
        role: "resources",
        citationPath: "us/statute/42/1382b",
        label: "Resource limits",
        displayCitation: "42 U.S.C. § 1382b",
      },
    ],
  },
  {
    slug: "aca-ptc",
    displayName: "Premium Tax Credit (ACA)",
    aliases: [
      "aca",
      "ptc",
      "premium tax credit",
      "affordable care act",
      "obamacare",
      "marketplace subsidy",
    ],
    jurisdiction: "us",
    governingBody: "IRS",
    summary:
      "Advance refundable credit for marketplace health insurance premiums under the Affordable Care Act.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/26/36B",
        label: "Premium tax credit statute",
        displayCitation: "26 U.S.C. § 36B",
      },
      {
        role: "benefit_calculation",
        citationPath: "us/statute/26/36B/b",
        label: "Premium assistance amount",
        displayCitation: "26 U.S.C. § 36B(b)",
      },
      {
        role: "income_tests",
        citationPath: "us/statute/26/36B/c",
        label: "Applicable taxpayer and household income",
        displayCitation: "26 U.S.C. § 36B(c)",
      },
    ],
  },
  {
    slug: "medicaid",
    displayName: "Medicaid",
    aliases: ["medicaid"],
    jurisdiction: "us",
    governingBody: "Centers for Medicare & Medicaid Services",
    summary:
      "State-administered health coverage for low-income individuals, jointly funded with the federal government.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/42/1396",
        label: "Authorizing statute",
        displayCitation: "42 U.S.C. § 1396",
      },
      {
        role: "regulations",
        citationPath: "us/regulation/42/435",
        label: "Eligibility regulations",
        displayCitation: "42 CFR Part 435",
      },
    ],
  },
  {
    slug: "tanf",
    displayName: "Temporary Assistance for Needy Families",
    aliases: ["tanf", "welfare", "temporary assistance"],
    jurisdiction: "us",
    governingBody: "HHS Administration for Children & Families",
    summary:
      "Federal block grant program funding state cash assistance and work supports for families with children.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/42/601",
        label: "Authorizing statute",
        displayCitation: "42 U.S.C. § 601",
      },
      {
        role: "regulations",
        citationPath: "us/regulation/45/260",
        label: "Program regulations",
        displayCitation: "45 CFR Part 260",
      },
    ],
  },
  {
    slug: "section-8",
    displayName: "Housing Choice Voucher (Section 8)",
    aliases: [
      "section 8",
      "housing choice voucher",
      "hcv",
      "section eight",
    ],
    jurisdiction: "us",
    governingBody: "HUD",
    summary:
      "Tenant-based rental assistance helping low-income households afford private-market housing.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/42/1437f",
        label: "Authorizing statute",
        displayCitation: "42 U.S.C. § 1437f",
      },
      {
        role: "regulations",
        citationPath: "us/regulation/24/982",
        label: "Program regulations",
        displayCitation: "24 CFR Part 982",
      },
    ],
  },
  {
    slug: "wic",
    displayName: "WIC (Women, Infants & Children)",
    aliases: ["wic", "women infants children"],
    jurisdiction: "us",
    governingBody: "USDA Food & Nutrition Service",
    summary:
      "Supplemental nutrition for pregnant and postpartum women, infants, and children under five.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us/statute/42/1786",
        label: "Authorizing statute",
        displayCitation: "42 U.S.C. § 1786",
      },
      {
        role: "regulations",
        citationPath: "us/regulation/7/246",
        label: "Program regulations",
        displayCitation: "7 CFR Part 246",
      },
    ],
  },
  // ─────────────────────────────────────────────── US-CO
  {
    slug: "colorado-works",
    displayName: "Colorado Works (TANF)",
    aliases: ["colorado works", "cw", "colorado tanf"],
    jurisdiction: "us-co",
    governingBody: "Colorado Department of Human Services",
    summary:
      "Colorado's TANF implementation — Basic Cash Assistance, work supports, and related services.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "us-co/statute/crs/26-2-706",
        label: "Program authorisation",
        displayCitation: "C.R.S. § 26-2-706",
      },
      {
        role: "regulations",
        citationPath: "us-co/regulation/9-CCR-2503-6",
        label: "Program regulations",
        displayCitation: "9 CCR 2503-6",
      },
      {
        role: "benefit_calculation",
        citationPath: "us-co/regulation/9-CCR-2503-6/3.606.1",
        label: "Basic Cash Assistance grant",
        displayCitation: "9 CCR 2503-6 § 3.606.1",
      },
    ],
  },
  // ─────────────────────────────────────────────── UK
  {
    slug: "universal-credit",
    displayName: "Universal Credit",
    aliases: ["universal credit", "uc"],
    jurisdiction: "uk",
    governingBody: "Department for Work and Pensions",
    summary:
      "Means-tested benefit combining six legacy working-age benefits into a single payment.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "uk/legislation/ukpga/2012/5",
        label: "Welfare Reform Act 2012",
        displayCitation: "UKPGA 2012 c.5",
      },
      {
        role: "regulations",
        citationPath: "uk/legislation/uksi/2013/376",
        label: "Universal Credit Regulations 2013",
        displayCitation: "UKSI 2013/376",
      },
      {
        role: "benefit_calculation",
        citationPath: "uk/legislation/uksi/2013/376/regulation/22",
        label: "Work allowance",
        displayCitation: "UKSI 2013/376 regulation 22",
      },
    ],
  },
  // ─────────────────────────────────────────────── Canada
  {
    slug: "ccb",
    displayName: "Canada Child Benefit",
    aliases: ["ccb", "canada child benefit"],
    jurisdiction: "canada",
    governingBody: "Canada Revenue Agency",
    summary:
      "Tax-free monthly payment to help with the cost of raising children under 18.",
    anchors: [
      {
        role: "authorizing_statute",
        citationPath: "canada/statute/rsc-1985/c-1-5th-supp/122.61",
        label: "Canada Child Benefit",
        displayCitation: "Income Tax Act, s 122.61",
      },
    ],
  },
];
