import type { Program } from "./types";

/**
 * Flagship seed of the program registry.
 *
 * Anchors reference real indexed citation_paths. The registry is a
 * navigation surface, so it should not advertise intended future
 * paths that the current Axiom corpus cannot open.
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
        role: "benefit_calculation",
        citationPath: "us/regulation/7/273/10",
        label: "Benefit calculation",
        displayCitation: "7 CFR § 273.10",
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
    slug: "colorado-snap",
    displayName: "Colorado SNAP",
    aliases: [
      "colorado snap",
      "co snap",
      "colorado food stamps",
      "colorado supplemental nutrition assistance",
    ],
    jurisdiction: "us-co",
    governingBody: "Colorado Department of Human Services",
    summary:
      "Colorado's state-administered SNAP program pages and eligibility guidance.",
    anchors: [
      {
        role: "eligibility",
        citationPath: "us-co/policy/co-cdhs-snap-page",
        label: "SNAP program page",
        displayCitation: "Colorado CDHS SNAP",
      },
      {
        role: "eligibility",
        citationPath: "us-co/policy/co-cdhs-snap-page/block-1",
        label: "SNAP eligibility guidance",
        displayCitation: "Colorado CDHS SNAP eligibility",
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
      "Means-tested benefit combining six prior working-age benefits into a single payment.",
    anchors: [
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
];
