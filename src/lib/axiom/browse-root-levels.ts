export function browseRootLevels(
  jurisdiction: string,
  docType: string
): number[] {
  if (jurisdiction.startsWith("us-") && docType !== "statute") {
    return [1, 0];
  }
  return [0, 1];
}
