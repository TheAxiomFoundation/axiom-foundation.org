import { JURISDICTIONS_SEED } from "@/lib/axiom/jurisdictions-seed";

export function getLandingJurisdictions(
  countedSlugs = new Set<string>()
) {
  return JURISDICTIONS_SEED.filter(
    (jurisdiction) =>
      jurisdiction.slug === "us" ||
      jurisdiction.slug === "uk" ||
      jurisdiction.slug === "canada" ||
      countedSlugs.has(jurisdiction.slug) ||
      isUsStateOrDistrictSeed(jurisdiction.slug)
  );
}

function isUsStateOrDistrictSeed(slug: string): boolean {
  return /^us-[a-z]{2}$/.test(slug) && !TERRITORY_JURISDICTIONS.has(slug);
}

// Keep known territories off the landing until corpus stats confirm
// they have data; otherwise the static seed can create empty entry
// points before those corpora are loaded.
const TERRITORY_JURISDICTIONS = new Set([
  "us-pr",
  "us-vi",
  "us-gu",
  "us-as",
  "us-mp",
]);
