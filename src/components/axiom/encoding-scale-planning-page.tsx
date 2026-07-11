import type { ReactNode } from "react";
import model from "@/data/planning/encoding-scale-model.json";

const integer = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const sourceById = new Map(
  model.sources.map((source) => [source.id, source])
);

const gpt4oMay = required(
  model.price_history.find(
    (row) => row.model === "GPT-4o" && row.date === "2024-05"
  ),
  "Missing May 2024 GPT-4o price history"
);
const gpt4oAugust = required(
  model.price_history.find(
    (row) => row.model === "GPT-4o" && row.date === "2024-08"
  ),
  "Missing August 2024 GPT-4o price history"
);
const centralPriceScenario = required(
  model.price_decline_scenarios.find((scenario) => scenario.id === "central"),
  "Missing central price scenario"
);
const baselineCombined = model.combined_trajectory[0];
const nextCombined = model.combined_trajectory[1];
const finalCombined = model.combined_trajectory.at(-1)!;

export function EncodingScalePlanningPage() {
  const currentModules = model.headline_metrics.find(
    (metric) => metric.id === "current_modules"
  );
  const sustainableRate = model.merge_trajectory.sustainable_rate;
  const priceTrend = model.price_trend_evidence;
  const crossover = model.cloud_scaling.subscription_crossover;

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-[1280px] mx-auto px-6 md:px-8">
        <header className="border-b border-[var(--color-rule)] pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[820px]">
              <p className="eyebrow mb-3">Axiom operations · planning</p>
              <h1 className="font-body text-3xl font-light leading-tight tracking-[0.02em] text-[var(--color-ink)] md:text-[2.6rem]">
                Encoding scale planning
              </h1>
              <p className="mt-4 max-w-[760px] text-sm leading-6 text-[var(--color-ink-secondary)] md:text-base md:leading-7">
                A forward view of token cost, encoder capability, merge
                throughput, and reproducible cloud execution across three
                coverage tiers. Every model input is marked measured, derived,
                or assumed.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm lg:text-right">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  As of
                </dt>
                <dd className="mt-1 font-medium text-[var(--color-ink)]">
                  {formatDate(model.as_of)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Planning pace
                </dt>
                <dd className="mt-1 font-medium text-[var(--color-ink)]">
                  {integer.format(sustainableRate.value)}/day{" "}
                  <Provenance code={sustainableRate.provenance} />
                </dd>
              </div>
            </dl>
          </div>

          <dl className="mt-8 grid border-y border-[var(--color-rule)] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[var(--color-rule)]">
            {model.headline_metrics.map((metric) => (
              <div
                key={metric.id}
                className="border-b border-[var(--color-rule)] py-5 sm:px-4 lg:border-b-0 lg:first:pl-0"
              >
                <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  {metric.label} <Provenance code={metric.provenance} />
                </dt>
                <dd className="tnum mt-2 text-2xl font-light text-[var(--color-ink)]">
                  {formatHeadlineMetric(metric.value, metric.unit)}
                  <span className="mt-1 block font-sans text-xs font-normal text-[var(--color-ink-secondary)]">
                    {metric.detail}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="mt-8 border-b border-[var(--color-rule)] pb-8">
          <div className="grid gap-4 md:grid-cols-3">
            {model.provenance_labels.map((label) => (
              <div key={label.code} className="flex gap-3">
                <Provenance code={label.code} prominent />
                <div>
                  <h2 className="text-sm font-medium text-[var(--color-ink)]">
                    {label.label}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-ink-secondary)]">
                    {label.definition}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Section
          id="coverage-tiers"
          eyebrow="Inherited model"
          title="Coverage tiers and remaining work"
          detail={`${integer.format(currentModules?.value ?? 0)} modules in the canonical set [M]`}
        >
          <p className="max-w-[900px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            Tier A is the scored computational universe, Tier B adds operative
            guidance and manual depth, and Tier C widens to complete revenue and
            welfare-title breadth. The denominator—not generation price—is the
            largest long-horizon uncertainty.
          </p>
          <TableFrame label="Coverage tier ranges">
            <table className="w-full min-w-[940px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <TableHead>Tier</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead align="right">Low</TableHead>
                  <TableHead align="right">Central</TableHead>
                  <TableHead align="right">High</TableHead>
                  <TableHead align="right">Central remaining</TableHead>
                </tr>
              </thead>
              <tbody>
                {model.tiers.map((tier) => (
                  <tr
                    key={tier.id}
                    className="border-t border-[var(--color-rule)] align-top"
                  >
                    <TableCell>
                      <span className="font-mono font-medium text-[var(--color-ink)]">
                        {tier.id}
                      </span>{" "}
                      <Provenance code={tier.provenance} />
                      <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
                        {tier.name}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[480px] leading-5 text-[var(--color-ink-secondary)]">
                      {tier.scope}
                    </TableCell>
                    <TableCell align="right">
                      {integer.format(tier.low_modules)}
                    </TableCell>
                    <TableCell align="right" emphasis>
                      {integer.format(tier.central_modules)}
                    </TableCell>
                    <TableCell align="right">
                      {integer.format(tier.high_modules)}
                    </TableCell>
                    <TableCell align="right" emphasis>
                      {integer.format(tier.remaining_central_modules)}{" "}
                      <Provenance code="D" />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {model.tiers.map((tier) => (
              <div
                key={tier.id}
                className="border-t border-[var(--color-rule-strong)] pt-4"
              >
                <h3 className="text-sm font-medium text-[var(--color-ink)]">
                  Tier {tier.id} arithmetic
                </h3>
                <dl className="mt-3 space-y-2">
                  {tier.components.map((component) => (
                    <div
                      key={component.name}
                      className="grid grid-cols-[1fr_auto] gap-3 text-xs"
                    >
                      <dt className="text-[var(--color-ink-secondary)]">
                        {component.name} <Provenance code={component.provenance} />
                      </dt>
                      <dd className="tnum font-mono text-[var(--color-ink)]">
                        {formatComponentRange(component)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {tier.raw_central_formula_modules !== undefined &&
                  tier.raw_central_formula_provenance !== undefined &&
                  tier.planning_midpoint_modules !== undefined &&
                  tier.planning_midpoint_provenance !== undefined &&
                  tier.planning_midpoint_note !== undefined && (
                  <p className="mt-4 border-t border-[var(--color-rule)] pt-3 text-xs leading-5 text-[var(--color-ink-secondary)]">
                    Raw central product:{" "}
                    {integer.format(tier.raw_central_formula_modules)}{" "}
                    <Provenance code={tier.raw_central_formula_provenance} />;
                    planning midpoint:{" "}
                    {integer.format(tier.planning_midpoint_modules)}{" "}
                    <Provenance code={tier.planning_midpoint_provenance} />.
                    {" "}{tier.planning_midpoint_note}
                  </p>
                  )}
                <p className="mt-4 border-t border-[var(--color-rule)] pt-3 text-xs leading-5 text-[var(--color-ink-secondary)]">
                  {tier.all_in_estimate}{" "}
                  <Provenance code={tier.all_in_provenance} />
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 border-y border-[var(--color-rule)] py-5 md:grid-cols-3">
            {model.denominator_caveats.map((caveat) => (
              <p
                key={caveat.unit}
                className="text-xs leading-5 text-[var(--color-ink-secondary)]"
              >
                <Provenance code={caveat.provenance} prominent />{" "}
                {caveat.statement}
              </p>
            ))}
          </div>
        </Section>

        <Section
          id="unit-economics"
          eyebrow="Measurement"
          title="Unit economics"
          detail={`${integer.format(model.unit_economics.run_sample.value)} measured runs [M]`}
        >
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm leading-6 text-[var(--color-ink-secondary)]">
                A representative pass is input-heavy and compact on output.
                Current quality retries turn one pass into{" "}
                {decimal.format(model.unit_economics.retry_multiplier.value)}
                {" "}runs per accepted module on average{" "}
                <Provenance code={model.unit_economics.retry_multiplier.provenance} />.
              </p>
              <dl className="mt-5 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
                {model.unit_economics.representative_pass.map((metric) => (
                  <div
                    key={metric.metric}
                    className="flex items-baseline justify-between gap-4 py-3 text-sm"
                  >
                    <dt className="text-[var(--color-ink-secondary)]">
                      {metric.metric} <Provenance code={metric.provenance} />
                    </dt>
                    <dd className="tnum text-right font-mono text-[var(--color-ink)]">
                      {integer.format(metric.value)}{" "}
                      <span className="text-[10px] text-[var(--color-ink-muted)]">
                        {metric.unit}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--color-ink)]">
                Current metered cost at the measured token mix, excluding cache writes
              </h3>
              <TableFrame
                label="Current metered model costs"
                className="mt-3"
              >
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                    <tr>
                      <TableHead>Model</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead align="right">Per pass</TableHead>
                      <TableHead align="right">Per successful merge</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {model.unit_economics.model_costs.map((row) => (
                      <tr
                        key={`${row.model}-${row.service}`}
                        className="border-t border-[var(--color-rule)]"
                      >
                        <TableCell>{row.model}</TableCell>
                        <TableCell>{row.service}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.cost_per_pass)}
                        </TableCell>
                        <TableCell align="right" emphasis>
                          {formatCurrency(row.cost_per_merged_module)}{" "}
                          <Provenance code={row.cost_provenance} />
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
              <p className="mt-3 text-xs leading-5 text-[var(--color-ink-secondary)]">
                The inherited system-token proxy is{" "}
                {formatCurrency(model.unit_economics.system_token_proxy.central)}
                /merge central, with a{" "}
                {formatCurrency(model.unit_economics.system_token_proxy.low)}–
                {formatCurrency(model.unit_economics.system_token_proxy.high)}
                {" "}range <Provenance code="D" />. Its{" "}
                {decimal.format(model.unit_economics.system_token_proxy.multiplier)}×
                {" "}multiplier <Provenance code={model.unit_economics.system_token_proxy.multiplier_provenance} /> is a
                planning proxy for surrounding work, not literal token use.
                Its {formatDate(model.unit_economics.system_token_proxy.basis.window_start)}–
                {formatDate(model.unit_economics.system_token_proxy.basis.window_end)} basis is{" "}
                {integer.format(model.unit_economics.system_token_proxy.basis.all_merged_prs)}
                {" "}total merged pull requests <Provenance code={model.unit_economics.system_token_proxy.basis.counts_provenance} />
                {" "}divided by approximately{" "}
                {integer.format(model.unit_economics.system_token_proxy.basis.module_prs)}
                {" "}module pull requests <Provenance code={model.unit_economics.system_token_proxy.basis.counts_provenance} />
                {" "}= {model.unit_economics.system_token_proxy.basis.ratio.toFixed(2)}{" "}
                <Provenance code={model.unit_economics.system_token_proxy.basis.ratio_provenance} />.
              </p>
              <p className="mt-3 text-xs leading-5 text-[var(--color-ink-secondary)]">
                Direct model rows use successful-citation retries and exclude
                failed-tail allocation. The cloud model allocates the measured
                {" "}{formatPercent(model.unit_economics.hard_fail_tail.value)} hard-fail
                tail <Provenance code={model.unit_economics.hard_fail_tail.provenance} />
                {" "}across accepted output.
              </p>
              <p className="mt-3 text-xs leading-5 text-[var(--color-ink-secondary)]">
                Cache-write telemetry is unavailable{" "}
                <Provenance code={model.unit_economics.cache_write_treatment.telemetry_provenance} />.
                Base costs allocate{" "}
                {integer.format(model.unit_economics.cache_write_treatment.allocated_write_tokens_per_pass)}
                {" "}write tokens/pass <Provenance code={model.unit_economics.cache_write_treatment.allocation_provenance} />
                {" "}and treat cache creation as amortized across reuse.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {model.unit_economics.subscription_costs.map((row) => (
              <div
                key={row.utilization}
                className="border-t border-[var(--color-rule-strong)] pt-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Flat-rate · {row.utilization} <Provenance code={row.provenance} />
                </p>
                <p className="tnum mt-2 text-xl font-light text-[var(--color-ink)]">
                  {formatCurrency(row.low)}–{formatCurrency(row.high)}/module
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--color-ink-secondary)]">
                  {row.note}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="merge-rate"
          eyebrow="Throughput"
          title="Use the trajectory, not the mean"
          detail={`${integer.format(model.merge_trajectory.recent_peak.value)}/day recent peak [M]`}
        >
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-y border-[var(--color-rule)] py-5">
              <div className="flex items-end justify-between gap-5">
                {model.merge_trajectory.canonical_counts.map((count) => (
                  <div key={count.date}>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                      {formatDate(count.date)} <Provenance code={count.provenance} />
                    </p>
                    <p className="tnum mt-2 text-3xl font-light text-[var(--color-ink)]">
                      {integer.format(count.modules)}
                    </p>
                  </div>
                ))}
                <div className="pb-1 text-right">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Gross change
                  </p>
                  <p className="tnum mt-2 text-xl text-[var(--color-accent)]">
                    +{integer.format(model.merge_trajectory.gross_additions.value)}{" "}
                    <Provenance code={model.merge_trajectory.gross_additions.provenance} />
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm leading-6 text-[var(--color-ink-secondary)]">
                Netting approximately{" "}
                {integer.format(model.merge_trajectory.pause_day_additions.value)}
                {" "}modules{" "}
                <Provenance code={model.merge_trajectory.pause_day_additions.provenance} />
                {" "}from deliberate pause days leaves about{" "}
                {integer.format(
                  model.merge_trajectory.gross_additions.value -
                    model.merge_trajectory.pause_day_additions.value
                )}
                {" "}modules <Provenance code="D" /> over{" "}
                {integer.format(model.merge_trajectory.active_days.value)} active
                days <Provenance code={model.merge_trajectory.active_days.provenance} />,
                or roughly{" "}
                {integer.format(model.merge_trajectory.sustainable_rate.value)}
                /day <Provenance code="D" />.
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--color-ink-secondary)]">
                {model.merge_trajectory.note}
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="price-declines"
          eyebrow="Part 1a"
          title="Price-decline scenarios"
          detail="Constant token volume"
        >
          <p className="max-w-[920px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            {model.capability_bar.definition}{" "}
            <Provenance code={model.capability_bar.definition_provenance} />{" "}
            Today that is {model.capability_bar.current_cheapest_passing.model} at{" "}
            {formatCurrency(model.capability_bar.current_cheapest_passing.input_per_million, 2)}/
            {formatCurrency(model.capability_bar.current_cheapest_passing.output_per_million, 2)}{" "}
            per million tokens <Provenance code="M" />; its July swap-in
            displaced {model.capability_bar.displaced.model} at{" "}
            {formatCurrency(model.capability_bar.displaced.input_per_million, 2)}/
            {formatCurrency(model.capability_bar.displaced.output_per_million, 2)} — a
            realized {model.capability_bar.realized_substitution_factor}× list-price cut
            at constant task capability{" "}
            <Provenance code={model.capability_bar.realized_substitution_provenance} />
            {" "}(directional — the raw bake-off artifact is unavailable).
            The cheaper {model.capability_bar.failed_cheaper_tier.model} tier
            ({formatCurrency(model.capability_bar.failed_cheaper_tier.input_per_million, 2)}/
            {formatCurrency(model.capability_bar.failed_cheaper_tier.output_per_million, 2)})
            did not pass the same bake-off <Provenance code="M" />.{" "}
            {model.capability_bar.note}
          </p>

          <p className="mt-3 max-w-[920px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            Public prices show step changes rather than a smooth curve. The
            {" "}{gpt4oMay.date} GPT-4o launch was priced at{" "}
            {formatCurrency(gpt4oMay.input_per_million, 2)}/
            {formatCurrency(gpt4oMay.output_per_million, 2)} per million tokens;
            the {formatCurrency(gpt4oAugust.input_per_million, 2)}/
            {formatCurrency(gpt4oAugust.output_per_million, 2)} snapshot arrived
            in {gpt4oAugust.date} <Provenance code="M" />. The forward{" "}
            {model.price_decline_scenarios
              .map((scenario) => `${scenario.annual_decline_factor}×`)
              .join(", ")}{" "}
            annual factors are planning assumptions <Provenance code="A" />
            {" "}applied to the price of that bar, not to any one model's list
            price.{" "}
            {model.pricing_context_note}{" "}
            <Provenance code={model.pricing_context_provenance} />
          </p>

          <TableFrame label="Flagship lineage list prices">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <TableHead>Model</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead align="right">Input / 1M</TableHead>
                  <TableHead align="right">Output / 1M</TableHead>
                  <TableHead>Source</TableHead>
                </tr>
              </thead>
              <tbody>
                {model.price_history.map((row) => (
                  <tr
                    key={`${row.model}-${row.date}`}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <TableCell>{row.model}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(row.input_per_million, 2)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(row.output_per_million, 2)}
                    </TableCell>
                    <TableCell>
                      <SourceLink id={row.source_id} />{" "}
                      <Provenance code={row.provenance} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {priceTrend.map((trend) => (
              <div
                key={trend.source_id}
                className="border-t border-[var(--color-rule-strong)] pt-4"
              >
                <p className="text-sm text-[var(--color-ink)]">
                  <SourceLink id={trend.source_id} />{" "}
                  <Provenance code={trend.provenance} />
                </p>
                <p className="tnum mt-2 text-2xl font-light text-[var(--color-ink)]">
                  {trend.headline}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--color-ink-secondary)]">
                  {trend.note}
                </p>
              </div>
            ))}
            <div className="border-t border-[var(--color-rule-strong)] pt-4">
              <p className="text-sm text-[var(--color-ink)]">
                Small-tier list-price ratio{" "}
                <Provenance code={model.capability_anchor.ratio_provenance} />
              </p>
              <p className="tnum mt-2 text-2xl font-light text-[var(--color-ink)]">
                {integer.format(model.capability_anchor.input_ratio)}× input ·{" "}
                {integer.format(model.capability_anchor.output_ratio)}× output
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--color-ink-secondary)]">
                {model.capability_anchor.flagship.model} listed{" "}
                {formatCurrency(model.capability_anchor.flagship.input_per_million, 2)}/
                {formatCurrency(model.capability_anchor.flagship.output_per_million, 2)}
                {" "}in {model.capability_anchor.flagship.date}; a current
                small tier, {model.capability_anchor.small_tier_today.model},
                lists{" "}
                {formatCurrency(model.capability_anchor.small_tier_today.input_per_million, 2)}/
                {formatCurrency(model.capability_anchor.small_tier_today.output_per_million, 2)}
                {" "}<Provenance code="M" />. {model.capability_anchor.equivalence_note}{" "}
                <Provenance code={model.capability_anchor.equivalence_provenance} />
              </p>
            </div>
          </div>

          <h3 className="mt-9 text-base font-medium text-[var(--color-ink)]">
            Token cost to finish each central tier
          </h3>
          <p className="mt-2 text-xs leading-5 text-[var(--color-ink-secondary)]">
            Formula: {formatCurrency(model.unit_economics.system_token_proxy.central)}
            /module <Provenance code={model.unit_economics.system_token_proxy.provenance} />
            {" "}÷ annual decline factor <Provenance code="A" />^(year − {baselineCombined.year}),
            multiplied by central remaining modules. Capability is held
            constant here. {model.forecast_convention}{" "}
            <Provenance code={model.forecast_convention_provenance} />
          </p>
          <TableFrame
            label="Price-decline tier forecasts"
            className="mt-4"
          >
            <table className="w-full min-w-[940px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <TableHead>Scenario</TableHead>
                  <TableHead align="right">Year</TableHead>
                  <TableHead align="right">Annual decline</TableHead>
                  <TableHead align="right">Cost/module</TableHead>
                  <TableHead align="right">Tier A</TableHead>
                  <TableHead align="right">Tier B</TableHead>
                  <TableHead align="right">Tier C</TableHead>
                </tr>
              </thead>
              <tbody>
                {model.price_decline_scenarios.flatMap((scenario) =>
                  scenario.rows.map((row) => (
                    <tr
                      key={`${scenario.id}-${row.year}`}
                      className="border-t border-[var(--color-rule)]"
                    >
                      <TableCell>
                        {scenario.name}{" "}
                        <Provenance code={scenario.provenance} />
                      </TableCell>
                      <TableCell align="right">{row.year}</TableCell>
                      <TableCell align="right">
                        {scenario.annual_decline_factor}×
                      </TableCell>
                      <TableCell align="right" emphasis>
                        {formatCurrency(row.cost_per_merged_module)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.tier_a_cost, 0)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.tier_b_cost, 0)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.tier_c_cost, 0)}{" "}
                        <Provenance code={row.provenance} />
                      </TableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableFrame>
        </Section>

        <Section
          id="capability"
          eyebrow="Part 1b"
          title="Capability changes accepted-work economics"
          detail={`${model.bakeoff_cadence.value} bake-offs/year [A]`}
        >
          <p className="max-w-[920px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            The large gpt-5.5 sample is the quality baseline. Newer-model
            samples are too small for a general ranking, but the July bake-off
            supports a quarterly swap discipline: compare grounding, accepted
            cost, and wall time on the production task mix before changing the
            pinned encoder.
          </p>
          <TableFrame label="Measured capability evidence">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <TableHead>Model</TableHead>
                  <TableHead align="right">First pass</TableHead>
                  <TableHead align="right">Sample</TableHead>
                  <TableHead align="right">Median duration</TableHead>
                  <TableHead>Interpretation</TableHead>
                </tr>
              </thead>
              <tbody>
                {model.capability_evidence.map((row) => (
                  <tr
                    key={row.model}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <TableCell>{row.model}</TableCell>
                    <TableCell align="right">
                      {formatPercent(row.first_pass_rate)}
                    </TableCell>
                    <TableCell align="right">
                      {integer.format(row.sample_size)}
                    </TableCell>
                    <TableCell align="right">
                      {integer.format(row.duration_seconds)} s
                    </TableCell>
                    <TableCell>
                      {row.note} <Provenance code={row.provenance} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
          <p className="mt-4 border-l-2 border-[var(--color-accent)] pl-4 text-xs leading-5 text-[var(--color-ink-secondary)]">
            July bake-off: {formatPercent(model.bakeoff_evidence.speed_improvement)}
            {" "}faster at equal quality <Provenance code={model.bakeoff_evidence.provenance} />.
            {" "}{model.bakeoff_evidence.note}
          </p>

          <h3 className="mt-9 text-base font-medium text-[var(--color-ink)]">
            Planning trajectory
          </h3>
          <TableFrame
            label="Capability and throughput trajectory"
            className="mt-4"
          >
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <TableHead align="right">Year</TableHead>
                  <TableHead align="right">First pass</TableHead>
                  <TableHead align="right">Retry multiplier</TableHead>
                  <TableHead align="right">Hard-fail tail</TableHead>
                  <TableHead align="right">Workload factor</TableHead>
                  <TableHead align="right">Merged/day</TableHead>
                </tr>
              </thead>
              <tbody>
                {model.capability_trajectory.map((row) => (
                  <tr
                    key={row.year}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <TableCell align="right" emphasis>{row.year}</TableCell>
                    <TableCell align="right">
                      {formatPercent(row.first_pass_rate)}{" "}
                      <Provenance code={row.first_pass_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {decimal.format(row.retry_multiplier)}{" "}
                      <Provenance code={row.retry_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {formatPercent(row.hard_fail_tail)}{" "}
                      <Provenance code={row.hard_fail_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {row.capability_workload_factor.toFixed(3)}{" "}
                      <Provenance code={row.factor_provenance} />
                    </TableCell>
                    <TableCell align="right" emphasis>
                      {integer.format(row.sustainable_merged_per_day)}{" "}
                      <Provenance code={row.throughput_provenance} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
          <p className="mt-3 text-xs leading-5 text-[var(--color-ink-secondary)]">
            Workload factor = (retry ÷ successful share) ÷ the{" "}
            {model.capability_trajectory[0].year} baseline. Fewer failures reduce
            red CI runs and serial repair, but the{" "}
            {model.capability_trajectory
              .slice(1)
              .map((row) => `${integer.format(row.sustainable_merged_per_day)}/day`)
              .join(" and ")}{" "}
            assumptions still require merge-pipeline engineering.
          </p>
        </Section>

        <Section
          id="combined"
          eyebrow="Part 1c"
          title="Combined trajectory"
          detail="Central price path"
        >
          <p className="max-w-[940px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            This is a small scenario table, not a fitted curve. Cost combines
            the central {centralPriceScenario.annual_decline_factor}× annual price
            path <Provenance code={centralPriceScenario.provenance} /> with retry
            and hard-fail workload.
            Calendar divides each central remaining denominator by sustainable
            accepted merges/day. {model.forecast_convention}{" "}
            <Provenance code={model.forecast_convention_provenance} />
          </p>
          <TableFrame label="Combined cost and calendar trajectory">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <TableHead align="right">Year</TableHead>
                  <TableHead align="right">Price decline</TableHead>
                  <TableHead align="right">Capability factor</TableHead>
                  <TableHead align="right">Cost/module</TableHead>
                  <TableHead align="right">Context stress</TableHead>
                  <TableHead align="right">Merged/day</TableHead>
                  <TableHead align="right">Tier A calendar</TableHead>
                  <TableHead align="right">Tier B calendar</TableHead>
                  <TableHead align="right">Tier C calendar</TableHead>
                </tr>
              </thead>
              <tbody>
                {model.combined_trajectory.map((row) => (
                  <tr
                    key={row.year}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <TableCell align="right" emphasis>{row.year}</TableCell>
                    <TableCell align="right">
                      {row.price_decline_factor_from_2026}×{" "}
                      <Provenance code={row.price_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {row.capability_workload_factor.toFixed(3)}{" "}
                      <Provenance code={row.capability_provenance} />
                    </TableCell>
                    <TableCell align="right" emphasis>
                      {formatCurrency(row.cost_per_merged_module)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(row.stress_cost_per_merged_module)}
                    </TableCell>
                    <TableCell align="right">
                      {integer.format(row.sustainable_merged_per_day)}{" "}
                      <Provenance code={row.throughput_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {formatCalendar(row.tier_a_days)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCalendar(row.tier_b_days)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCalendar(row.tier_c_days, true)}{" "}
                      <Provenance code={row.provenance} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_2fr]">
            <div className="border-t border-[var(--color-rule-strong)] pt-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                Counter-force <Provenance code="A" />
              </p>
              <p className="tnum mt-2 text-2xl font-light text-[var(--color-ink)]">
                +{formatPercent(nextCombined.richer_context_token_factor - 1)} tokens/year
              </p>
            </div>
            <p className="border-t border-[var(--color-rule)] pt-4 text-sm leading-6 text-[var(--color-ink-secondary)]">
              Richer context, retrieval evidence, and judging can raise tokens
              per module even as model prices fall. The stress column applies a
              {" "}{finalCombined.richer_context_token_factor.toFixed(2)}×
              {" "}token factor by {finalCombined.year} <Provenance code="D" />.
              Any alternative
              token-growth view scales the result linearly.
            </p>
          </div>
        </Section>

        <Section
          id="cloud-scaling"
          eyebrow="Part 2"
          title="Cloud scaling"
          detail="Reproducible, parallel, fail-closed"
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-base font-medium text-[var(--color-ink)]">
                What changes
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-ink-secondary)]">
                {model.cloud_scaling.migration.unlocks}
              </p>
            </div>
            <div>
              <h3 className="text-base font-medium text-[var(--color-ink)]">
                What remains local today
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-ink-secondary)]">
                {model.cloud_scaling.migration.local_only_today}{" "}
                {model.cloud_scaling.migration.removed_state}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 border-y border-[var(--color-rule)] py-6 md:grid-cols-3">
            <CloudInput
              label="Direct terra Batch"
              value={formatCurrency(
                model.cloud_scaling.batch_generation.direct_cost_per_merged_module
              )}
              suffix="/module"
              provenance={
                model.cloud_scaling.batch_generation.direct_cost_provenance
              }
              detail={`Measured token mix, retry load, and ${formatPercent(model.unit_economics.hard_fail_tail.value)} hard-fail allocation`}
            />
            <CloudInput
              label="System-token proxy"
              value={formatCurrency(
                model.cloud_scaling.batch_generation.system_cost_per_merged_module
              )}
              suffix="/module"
              provenance={
                model.cloud_scaling.batch_generation.system_cost_provenance
              }
              detail={`Direct Batch cost × inherited ${decimal.format(model.cloud_scaling.batch_generation.system_multiplier)}× proxy`}
            />
            <CloudInput
              label="Central CI shadow"
              value={formatCurrency(
                model.cloud_scaling.ci.shadow_cost_per_module_central
              )}
              suffix="/module"
              provenance={model.cloud_scaling.ci.shadow_cost_provenance}
              detail={`${model.cloud_scaling.ci.minutes_per_merged_pr_central} min/PR at ${formatCurrency(model.cloud_scaling.ci.runner_rate_per_minute)}/min`}
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-[var(--color-ink-secondary)]">
            The hard-fail allocation assumes failed citations consume the same
            average token workload as successful citations{" "}
            <Provenance code={model.cloud_scaling.batch_generation.hard_fail_equal_workload_provenance} />.
          </p>

          <p className="mt-3 max-w-[960px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            {model.cloud_scaling.batch_execution_note}{" "}
            <Provenance code={model.cloud_scaling.batch_execution_provenance} />
            {" "}{model.cloud_scaling.flex_note}{" "}
            <SourceLink id={model.cloud_scaling.flex_source_id} />{" "}
            <Provenance code={model.cloud_scaling.flex_provenance} />
          </p>

          <p className="mt-4 max-w-[960px] border-l-2 border-[var(--color-accent)] pl-4 text-xs leading-5 text-[var(--color-ink-secondary)]">
            Cache-write sensitivity: one write/pass{" "}
            <Provenance code={model.cloud_scaling.cache_write_sensitivity.writes_per_pass_provenance} />
            {" "}of {integer.format(model.cloud_scaling.cache_write_sensitivity.assumed_tokens_per_write)}
            {" "}tokens/write <Provenance code={model.cloud_scaling.cache_write_sensitivity.assumed_tokens_per_write_provenance} />,
            matching the measured cached-prefix scale of{" "}
            {integer.format(model.cloud_scaling.cache_write_sensitivity.reference_cached_prefix_tokens)}
            {" "}tokens <Provenance code={model.cloud_scaling.cache_write_sensitivity.reference_prefix_provenance} />.
            Repricing those tokens from{" "}
            {formatCurrency(model.cloud_scaling.cache_write_sensitivity.batch_uncached_input_rate_per_million, 4)}
            {" "}to {formatCurrency(model.cloud_scaling.cache_write_sensitivity.batch_write_rate_per_million, 4)}
            /million <Provenance code={model.cloud_scaling.cache_write_sensitivity.write_rate_provenance} />
            {" "}adds {formatCurrency(model.cloud_scaling.cache_write_sensitivity.added_system_cost_per_merged_module)}
            /module <Provenance code={model.cloud_scaling.cache_write_sensitivity.cost_provenance} />,
            raising the all-Batch total to{" "}
            {formatCurrency(model.cloud_scaling.cache_write_sensitivity.all_batch_total_cost_per_module)}
            /module <Provenance code={model.cloud_scaling.cache_write_sensitivity.cost_provenance} />.
          </p>

          <p className="mt-5 max-w-[960px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            Recent run telemetry was unavailable{" "}
            <Provenance code={model.cloud_scaling.ci.measurement_status_provenance} />,
            so CI duration uses{" "}
            {model.cloud_scaling.ci.minutes_per_merged_pr_low}–
            {model.cloud_scaling.ci.minutes_per_merged_pr_high} minutes per
            merged pull request <Provenance code={model.cloud_scaling.ci.minutes_provenance} />.
            The live two-core Linux reference rate is{" "}
            {formatCurrency(model.cloud_scaling.ci.runner_rate_per_minute)}/minute{" "}
            <Provenance code={model.cloud_scaling.ci.runner_rate_provenance} />,
            replacing the older ~
            {formatCurrency(model.cloud_scaling.ci.superseded_runner_anchor_per_minute)}
            {" "}anchor{" "}
            <Provenance code={model.cloud_scaling.ci.superseded_runner_anchor_provenance} />.
            Standard public-repository
            runners currently have zero marginal cash price; this is a
            paid-equivalent shadow cost for elastic capacity.
          </p>
          <p className="mt-3 max-w-[960px] text-xs leading-5 text-[var(--color-ink-secondary)]">
            CI allocation uses the aligned{" "}
            {formatDate(model.cloud_scaling.ci.measurement_window_start)}–
            {formatDate(model.cloud_scaling.ci.measurement_window_end)} window:{" "}
            {integer.format(model.cloud_scaling.ci.merged_prs_in_window)} merged
            pull requests <Provenance code={model.cloud_scaling.ci.merged_prs_provenance} />
            {" "}÷ {integer.format(model.cloud_scaling.ci.merged_modules_in_window)}
            {" "}merged modules <Provenance code={model.cloud_scaling.ci.merged_modules_provenance} />
            {" "}= {model.cloud_scaling.ci.pr_equivalents_per_module.toFixed(3)}
            {" "}pull-request equivalents/module <Provenance code={model.cloud_scaling.ci.pr_ratio_provenance} />.
          </p>

          <h3 className="mt-9 text-base font-medium text-[var(--color-ink)]">
            All-Batch cloud lower bound
          </h3>
          <TableFrame label="All-Batch cloud scenarios" className="mt-4">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <TableHead>Scenario</TableHead>
                  <TableHead align="right">Merged/day</TableHead>
                  <TableHead align="right">Direct gen/day (subset)</TableHead>
                  <TableHead align="right">System cost/day (incl. direct)</TableHead>
                  <TableHead align="right">CI shadow/day</TableHead>
                  <TableHead align="right">Total/day</TableHead>
                  <TableHead align="right">Total/module</TableHead>
                </tr>
              </thead>
              <tbody>
                {model.cloud_scaling.all_batch_scenarios.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <TableCell>{row.label}</TableCell>
                    <TableCell align="right">
                      {integer.format(row.merged_per_day)}{" "}
                      <Provenance code={row.throughput_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(row.direct_generation_cost_per_day, 2)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(row.system_token_cost_per_day, 2)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(row.ci_shadow_cost_per_day, 2)}
                    </TableCell>
                    <TableCell align="right" emphasis>
                      {formatCurrency(row.total_cost_per_day, 2)}
                    </TableCell>
                    <TableCell align="right" emphasis>
                      {formatCurrency(row.total_cost_per_module)}{" "}
                      <Provenance code={row.cost_provenance} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>

          <h3 className="mt-9 text-base font-medium text-[var(--color-ink)]">
            Subscription baseload plus Batch burst
          </h3>
          <p className="mt-2 max-w-[940px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            The operational crossover is about {integer.format(crossover.low)}–
            {integer.format(crossover.high)} sustained modules/day{" "}
            <Provenance code={crossover.provenance} />. Weekly windows bind,
            while saturated flat-rate work remains cheaper than metered work.
            The hybrid holds{" "}
            {integer.format(model.cloud_scaling.hybrid_baseload.value)} modules/day
            of baseload <Provenance code={model.cloud_scaling.hybrid_baseload.provenance} />
            {" "}and sends the remainder to Batch. This is a normalized future
            steady state using fully utilized flat-rate capacity, not the
            current cash allocation at partial utilization.
            Batch portions are lower-bound reuse costs pending cache-write telemetry.
          </p>
          <TableFrame label="Hybrid cloud scenarios" className="mt-4">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <TableHead align="right">Merged/day</TableHead>
                  <TableHead align="right">Subscription</TableHead>
                  <TableHead align="right">Batch</TableHead>
                  <TableHead align="right">Total/day</TableHead>
                  <TableHead align="right">Total/module</TableHead>
                </tr>
              </thead>
              <tbody>
                {model.cloud_scaling.hybrid_scenarios.map((row) => (
                  <tr
                    key={row.merged_per_day}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <TableCell align="right" emphasis>
                      {integer.format(row.merged_per_day)}{" "}
                      <Provenance code={row.throughput_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {integer.format(row.subscription_modules_per_day)}{" "}
                      <Provenance code={row.subscription_baseload_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {integer.format(row.batch_modules_per_day)}{" "}
                      <Provenance code={row.batch_modules_provenance} />
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(row.daily_cost_low, 2)}–
                      {formatCurrency(row.daily_cost_high, 2)}
                    </TableCell>
                    <TableCell align="right" emphasis>
                      {formatCurrency(row.cost_per_module_low)}–
                      {formatCurrency(row.cost_per_module_high)}{" "}
                      <Provenance code={row.cost_provenance} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
          <p className="mt-4 text-xs leading-5 text-[var(--color-ink-secondary)]">
            The hybrid uses the saturated flat-rate band. At observed partial
            utilization, the current{" "}
            {integer.format(model.cloud_scaling.current_subscription_reference.merged_per_day)}
            /day reference is{" "}
            {formatCurrency(
              model.cloud_scaling.current_subscription_reference.daily_cost_low,
              2
            )}
            –
            {formatCurrency(
              model.cloud_scaling.current_subscription_reference.daily_cost_high,
              2
            )}
            /day after the system proxy and central CI shadow cost{" "}
            <Provenance code={model.cloud_scaling.current_subscription_reference.cost_provenance} />.
          </p>
        </Section>

        <Section
          id="binding-costs"
          eyebrow="Interpretation"
          title="Tokens are not the budget driver"
          detail="Fixed and operational work dominate"
        >
          <div className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
            {model.non_token_costs.map((cost, index) => (
              <div
                key={cost.name}
                className="grid gap-2 py-4 sm:grid-cols-[48px_240px_1fr] sm:items-baseline"
              >
                <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-medium text-[var(--color-ink)]">
                  {cost.name}
                </h3>
                <p className="text-sm leading-6 text-[var(--color-ink-secondary)]">
                  {cost.detail}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="sources"
          eyebrow="Method"
          title="Sources and limits"
          detail={`${model.sources.length} source records`}
        >
          <p className="max-w-[920px] text-sm leading-6 text-[var(--color-ink-secondary)]">
            Price scenarios describe replaceable constant-capability service,
            not guaranteed cuts to a single model. New-model samples remain
            directional, Tier C is assumption-heavy, CI duration is unmeasured,
            and the richer-context case is a stress test. The model should be
            refreshed after each quarterly bake-off or material corpus census.
          </p>
          <ol className="mt-6 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
            {model.sources.map((source, index) => (
              <li
                key={source.id}
                className="grid gap-2 py-4 text-sm md:grid-cols-[40px_1fr_180px] md:items-baseline"
              >
                <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  {source.url ? (
                    <a
                      href={source.url}
                      className="font-medium text-[var(--color-ink)] underline decoration-[var(--color-rule-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
                      rel="noreferrer"
                    >
                      {source.title}
                    </a>
                  ) : (
                    <span className="font-medium text-[var(--color-ink)]">
                      {source.title}
                    </span>
                  )}
                  <p className="mt-1 text-xs leading-5 text-[var(--color-ink-secondary)]">
                    {source.note}
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] md:text-right">
                  Accessed {source.accessed}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <footer className="mt-12 border-t border-[var(--color-rule)] pt-5 text-xs leading-5 text-[var(--color-ink-muted)]">
          Numeric source:{" "}
          <code className="font-mono text-[11px] text-[var(--color-ink-secondary)]">
            src/data/planning/encoding-scale-model.json
          </code>
          . This route is excluded from navigation and the sitemap.
        </footer>
      </div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  detail,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 mt-12">
      <div className="mb-5 flex flex-col gap-2 border-b border-[var(--color-rule)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h2 className="font-body text-xl font-normal tracking-[0.01em] text-[var(--color-ink)] md:text-2xl">
            {title}
          </h2>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {detail}
        </p>
      </div>
      {children}
    </section>
  );
}

function TableFrame({
  children,
  label,
  className = "mt-5",
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      aria-label={label}
      role="region"
      tabIndex={0}
      className={`${className} overflow-x-auto border-y border-[var(--color-rule)] bg-[var(--color-paper-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]`}
    >
      {children}
    </div>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
  emphasis = false,
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right";
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 ${align === "right" ? "tnum text-right font-mono" : "text-left"} ${
        emphasis ? "font-medium text-[var(--color-ink)]" : "text-[var(--color-ink-secondary)]"
      } ${className}`}
    >
      {children}
    </td>
  );
}

function Provenance({
  code,
  prominent = false,
}: {
  code: string;
  prominent?: boolean;
}) {
  return (
    <span
      className={`whitespace-nowrap font-mono font-medium text-[var(--color-accent)] ${
        prominent ? "text-xs" : "text-[10px]"
      }`}
      aria-label={provenanceLabel(code)}
      title={provenanceLabel(code)}
    >
      [{code}]
    </span>
  );
}

function SourceLink({ id }: { id: string }) {
  const source = sourceById.get(id);
  if (!source) return null;
  if (!source.url) return <span>{source.title}</span>;

  return (
    <a
      href={source.url}
      rel="noreferrer"
      className="underline decoration-[var(--color-rule-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
    >
      {source.title}
    </a>
  );
}

function CloudInput({
  label,
  value,
  suffix,
  provenance,
  detail,
}: {
  label: string;
  value: string;
  suffix: string;
  provenance: string;
  detail: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {label} <Provenance code={provenance} />
      </p>
      <p className="tnum mt-2 text-2xl font-light text-[var(--color-ink)]">
        {value}
        <span className="ml-1 text-sm text-[var(--color-ink-secondary)]">
          {suffix}
        </span>
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--color-ink-secondary)]">
        {detail}
      </p>
    </div>
  );
}

function provenanceLabel(code: string): string {
  return (
    model.provenance_labels.find((label) => label.code === code)?.label ?? code
  );
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function formatHeadlineMetric(value: number, unit: string): string {
  if (unit === "modules") return integer.format(value);
  if (unit === "modules/day") return `${integer.format(value)}/day`;
  if (unit === "USD/module") return `${formatCurrency(value)}/module`;
  return `${decimal.format(value)} ${unit}`;
}

function formatComponentRange(component: {
  low: number;
  central: number;
  high: number;
}): string {
  const values = [component.low, component.central, component.high];
  if (values.every((value) => value <= 1.3)) {
    return values.map((value) => decimal.format(value)).join(" / ");
  }
  return values.map((value) => compactNumber(value)).join(" / ");
}

function compactNumber(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
  }
  return decimal.format(value);
}

function formatCurrency(value: number, digits?: number): string {
  const resolvedDigits =
    digits ?? (Math.abs(value) < 1 ? 3 : Math.abs(value) < 100 ? 2 : 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: resolvedDigits,
    maximumFractionDigits: resolvedDigits,
  }).format(value);
}

function formatPercent(value: number): string {
  const percent = value * 100;
  return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(1)}%`;
}

function formatCalendar(days: number, preferYears = false): string {
  if (preferYears && days >= 300) {
    const years = days / 365;
    return `${integer.format(days)} d / ${years < 1 ? years.toFixed(2) : years.toFixed(1)} y`;
  }
  return `${integer.format(days)} d / ${(days / 30.44).toFixed(1)} mo`;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
