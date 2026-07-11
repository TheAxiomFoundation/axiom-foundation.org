import { describe, expect, it } from "vitest";
import model from "./encoding-scale-model.json";

const currentModules = model.headline_metrics.find(
  (metric) => metric.id === "current_modules"
)?.value;
const baseSystemCost = model.unit_economics.system_token_proxy.central;

describe("encoding scale model arithmetic", () => {
  it("derives central remaining modules from the canonical stock", () => {
    expect(currentModules).toBeDefined();

    for (const tier of model.tiers) {
      expect(tier.remaining_central_modules).toBe(
        tier.central_modules - (currentModules ?? 0)
      );
    }
  });

  it("makes the Tier C planning midpoint distinct from its raw product", () => {
    const tierC = model.tiers.find((tier) => tier.id === "C");
    expect(tierC).toBeDefined();
    expect(tierC).toHaveProperty("raw_central_formula_modules");

    if (tierC && "raw_central_formula_modules" in tierC) {
      const [universe, share, density] = tierC.components;
      expect(tierC.raw_central_formula_modules).toBeCloseTo(
        universe.central * share.central * density.central,
        3
      );
      expect(tierC.planning_midpoint_modules).toBe(tierC.central_modules);
      expect(tierC.planning_midpoint_provenance).toBe("A");
    }
  });

  it("applies each price-decline scenario consistently", () => {
    for (const scenario of model.price_decline_scenarios) {
      for (const row of scenario.rows) {
        const years = row.year - scenario.rows[0].year;
        const unitCost =
          baseSystemCost / scenario.annual_decline_factor ** years;

        expect(row.cost_per_merged_module).toBeCloseTo(unitCost, 6);
        expect(row.tier_a_cost).toBeCloseTo(
          model.tiers[0].remaining_central_modules * unitCost,
          3
        );
        expect(row.tier_b_cost).toBeCloseTo(
          model.tiers[1].remaining_central_modules * unitCost,
          3
        );
        expect(row.tier_c_cost).toBeCloseTo(
          model.tiers[2].remaining_central_modules * unitCost,
          3
        );
      }
    }
  });

  it("combines capability, central prices, context, and calendar", () => {
    const baseline = model.capability_trajectory[0];
    const baselineWork =
      baseline.retry_multiplier / (1 - baseline.hard_fail_tail);
    const centralDecline = model.price_decline_scenarios.find(
      (scenario) => scenario.id === "central"
    )?.annual_decline_factor;

    expect(centralDecline).toBeDefined();

    for (const row of model.combined_trajectory) {
      const capability = model.capability_trajectory.find(
        (candidate) => candidate.year === row.year
      );
      expect(capability).toBeDefined();

      const capabilityFactor =
        (capability!.retry_multiplier /
          (1 - capability!.hard_fail_tail)) /
        baselineWork;
      const years = row.year - model.combined_trajectory[0].year;
      const cost =
        (baseSystemCost /
          (centralDecline ?? 1) ** years) *
        capabilityFactor;

      expect(row.capability_workload_factor).toBeCloseTo(
        capabilityFactor,
        6
      );
      expect(row.cost_per_merged_module).toBeCloseTo(cost, 6);
      expect(row.stress_cost_per_merged_module).toBeCloseTo(
        cost * row.richer_context_token_factor,
        6
      );
      expect(row.tier_a_days).toBeCloseTo(
        model.tiers[0].remaining_central_modules /
          row.sustainable_merged_per_day,
        3
      );
      expect(row.tier_b_days).toBeCloseTo(
        model.tiers[1].remaining_central_modules /
          row.sustainable_merged_per_day,
        3
      );
      expect(row.tier_c_days).toBeCloseTo(
        model.tiers[2].remaining_central_modules /
          row.sustainable_merged_per_day,
        3
      );
    }
  });

  it("keeps cloud and hybrid scenarios tied to their inputs", () => {
    const cloud = model.cloud_scaling;
    const batchRow = model.unit_economics.model_costs.find(
      (row) => row.model === "gpt-5.6-terra" && row.service === "Batch"
    );
    const saturatedSubscription = model.unit_economics.subscription_costs.find(
      (row) => row.utilization === "Saturated"
    );

    expect(batchRow).toBeDefined();
    expect(saturatedSubscription).toBeDefined();
    expect(
      cloud.batch_generation.successful_only_cost_per_merged_module
    ).toBeCloseTo(
      batchRow!.cost_per_merged_module,
      6
    );
    expect(cloud.batch_generation.direct_cost_per_merged_module).toBeCloseTo(
      batchRow!.cost_per_merged_module /
        (1 - model.unit_economics.hard_fail_tail.value),
      6
    );
    expect(cloud.batch_generation.system_cost_per_merged_module).toBeCloseTo(
      cloud.batch_generation.direct_cost_per_merged_module *
        cloud.batch_generation.system_multiplier,
      6
    );

    const cacheWrite = cloud.cache_write_sensitivity;
    const addedDirectWriteCost =
      (cacheWrite.writes_per_pass *
        cacheWrite.assumed_tokens_per_write *
        (cacheWrite.batch_write_rate_per_million -
          cacheWrite.batch_uncached_input_rate_per_million) *
        model.unit_economics.retry_multiplier.value) /
      (1 - model.unit_economics.hard_fail_tail.value) /
      1_000_000;
    expect(cacheWrite.added_direct_cost_per_merged_module).toBeCloseTo(
      addedDirectWriteCost,
      6
    );
    expect(cacheWrite.added_system_cost_per_merged_module).toBeCloseTo(
      addedDirectWriteCost * cloud.batch_generation.system_multiplier,
      6
    );

    const prEquivalents =
      cloud.ci.merged_prs_in_window / cloud.ci.merged_modules_in_window;
    const ciShadow =
      prEquivalents *
      cloud.ci.minutes_per_merged_pr_central *
      cloud.ci.runner_rate_per_minute;

    expect(cloud.ci.pr_equivalents_per_module).toBeCloseTo(
      prEquivalents,
      6
    );
    expect(cloud.ci.shadow_cost_per_module_central).toBeCloseTo(ciShadow, 6);
    expect(cacheWrite.all_batch_total_cost_per_module).toBeCloseTo(
      cloud.batch_generation.system_cost_per_merged_module +
        ciShadow +
        cacheWrite.added_system_cost_per_merged_module,
      6
    );

    for (const row of cloud.all_batch_scenarios) {
      const directGeneration =
        row.merged_per_day *
        cloud.batch_generation.direct_cost_per_merged_module;
      const systemTokens =
        row.merged_per_day *
        cloud.batch_generation.system_cost_per_merged_module;
      const ci = row.merged_per_day * ciShadow;
      expect(row.direct_generation_cost_per_day).toBeCloseTo(
        directGeneration,
        4
      );
      expect(row.system_token_cost_per_day).toBeCloseTo(systemTokens, 4);
      expect(row.ci_shadow_cost_per_day).toBeCloseTo(ci, 4);
      expect(row.total_cost_per_day).toBeCloseTo(systemTokens + ci, 4);
      expect(row.total_cost_per_module).toBeCloseTo(
        cloud.batch_generation.system_cost_per_merged_module + ciShadow,
        6
      );
    }

    for (const row of cloud.hybrid_scenarios) {
      const batch =
        row.batch_modules_per_day *
        cloud.batch_generation.system_cost_per_merged_module;
      const ci = row.merged_per_day * ciShadow;
      const low =
        row.subscription_modules_per_day *
          saturatedSubscription!.low *
          cloud.batch_generation.system_multiplier +
        batch +
        ci;
      const high =
        row.subscription_modules_per_day *
          saturatedSubscription!.high *
          cloud.batch_generation.system_multiplier +
        batch +
        ci;

      expect(row.daily_cost_low).toBeCloseTo(low, 4);
      expect(row.daily_cost_high).toBeCloseTo(high, 4);
      expect(row.cost_per_module_low).toBeCloseTo(
        low / row.merged_per_day,
        6
      );
      expect(row.cost_per_module_high).toBeCloseTo(
        high / row.merged_per_day,
        6
      );
    }
  });
});
