/**
 * Split rows into chunks bounded by BOTH a row count and an approximate
 * payload budget (sum of rule_yaml lengths). Rows carry whole rule
 * YAML; composition rules run to tens of KB, so a row-count bound alone
 * let single requests reach several MB and the REST gateway answered
 * with Cloudflare error pages, connection resets, and statement
 * timeouts. A single oversized row still ships alone rather than being
 * dropped.
 */
export function budgetedChunks(rows, maxRows, budgetBytes) {
  const chunks = [];
  let chunk = [];
  let spent = 0;
  for (const row of rows) {
    const cost = (row.rule_yaml ?? "").length + 200;
    if (
      chunk.length > 0 &&
      (chunk.length >= maxRows || spent + cost > budgetBytes)
    ) {
      chunks.push(chunk);
      chunk = [];
      spent = 0;
    }
    chunk.push(row);
    spent += cost;
  }
  if (chunk.length > 0) chunks.push(chunk);
  return chunks;
}
