# Encoding scale planning

As of 2026-07-11

This document models the cost and calendar path from Axiom's current rule-module stock to three levels of US tax-benefit-law coverage. It combines the inherited denominator and unit-economics model with forward scenarios for model prices, encoder capability, merge throughput, and reproducible cloud execution. The page at `/ops/planning` renders the same model from `src/data/planning/encoding-scale-model.json`, which is the numeric source of truth.

Every model input and output carries one of these labels:

- **[M] Measured:** observed in Axiom records or read from a live public source.
- **[D] Derived:** calculated from measured and explicitly assumed inputs.
- **[A] Assumed:** a planning choice or forward scenario, not an observed result.

## Executive summary

- The canonical stock is **4,103 modules [M]**. The central completion denominators are **24,000 [D]** for Tier A, **53,000 [D]** for Tier B, and **350,000 [A]** for Tier C.
- The recent trajectory supports **about 100 merged modules/day [D]**, with a recent peak of **138/day [M]**. The earlier bulk-import figure is not a sustainable-capacity measure.
- The inherited central system-token proxy is **$0.90 per merged module [D]** in 2026. At constant token volume, a **5× annual price decline [A]** takes that to **$0.18 [D]** in 2027 and **$0.036 [D]** in 2028 before capability effects. The decline applies to the price of encoder-sufficient capability — the cheapest model that passes the production bake-off — realized through quarterly swaps, not to any one model's list price.
- Under the central combined path—**5× annual price decline [A]**, retry and hard-fail improvement, and throughput rising from **100 [D]** to **300 [A]** to **1,000 [A]** modules/day—system-token cost falls from **$0.90 [D]** to **$0.140 [D]** to **$0.023 [D]** per merge.
- Calendar time is governed by merge throughput, not token price. Tier A takes **199 days [D]** at 100/day, **66 days [D]** at 300/day, or **20 days [D]** at 1,000/day.
- Reproducible cloud execution has a central all-Batch lower-bound reuse cost of **$0.437 per merged module [D]**, including the current hard-fail allocation, the system-token proxy, and a paid-equivalent CI shadow cost but excluding unallocated cache-write premiums. That is about **$44/day [D]** at 100 merges, **$131/day [D]** at 300, and **$437/day [D]** at 1,000. A one-write-per-pass sensitivity raises the total to **$0.472/module [D]**.
- Compute remains the small term. Corpus ingest, verification without direct oracles, merge-train engineering, the structural hard tail, and operating capacity dominate broader program cost.

## 1. Inherited measurement base

### 1.1 Cost equation

The inherited model is:

```text
system token cost
  = remaining modules [D]
  × direct generation cost per merged module [D]
  × 3.0 system-token proxy [D]
```

The **3.0× proxy [D]** comes from **1,354 total merged pull requests [M] / approximately 447 module pull requests [M] = 3.03 [D]** during **2026-06-19 through 2026-07-10 [M]**. A small number of repository-level module-PR counts were sampled after rate limiting, so the denominator and ratio are planning-level approximations. The proxy carries surrounding oracle, corpus, and infrastructure work into a token planning proxy. It is not a literal measurement that every module consumes three times its direct generation tokens.

Fixed engineering—source ingest, CI changes, and architect attention to the hard tail—sits outside this token equation.

### 1.2 Unit economics

The run database contains **3,582 encoder runs [M]**, of which **3,380 [M]** carry token data.

| Metric | Value | Provenance |
|---|---:|:---:|
| Median tokens per pass | 54,674 | [M] |
| Representative fresh input | 30,282 tokens/pass | [D] |
| Representative cached input | 18,688 tokens/pass | [M] |
| Representative output | 3,794 tokens/pass | [M] |
| Median duration | 50 seconds/pass | [M] |
| p90 duration | 147 seconds/pass | [M] |
| Mean quality retry multiplier | 1.43 runs/merged module | [M] |
| First-pass band | 63%–73% | [M] |
| Hard-fail tail | 27% | [M] |

Representative fresh input is **48,970 median input tokens [M] − 18,688 median cached-input tokens [M] = 30,282 [D]**. It is a billing-mix estimate, not a separately observed median. The three billing components are independently calculated representative values and do not sum to the 54,674 total-token median.

Using the representative billing mix, live 2026-07-11 short-context prices, and the **1.43 retry multiplier [M]** (the measured request mix falls within that price band):

| Model and service | Input / cached / output per 1M [M] | Cost/pass [D] | Cost/successful merge [D] |
|---|---:|---:|---:|
| gpt-5.5 standard | $5 / $0.50 / $30 | $0.275 | $0.393 |
| gpt-5.6-terra standard | $2.50 / $0.25 / $15 | $0.137 | $0.196 |
| gpt-5.6-luna standard | $1 / $0.10 / $6 | $0.055 | $0.079 |
| gpt-5.6-terra Batch | $1.25 / $0.125 / $7.50 | $0.069 | $0.098 |

The direct-cost table allocates successful-citation retries but not the failed tail. It also allocates **zero cache-write tokens per representative pass [A]** because write/reuse telemetry is unavailable; it treats cache creation as amortized across reuse. OpenAI's [prompt-caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) documents separate cache-write accounting for newer models. The usage field is a prompt-token detail, so the sensitivity reclassifies written tokens from the ordinary input rate rather than adding the full write rate again. It assumes **one write/pass [A]** of **18,688 tokens/write [A]**, matching the measured **18,688-token cached-prefix scale [M]**. Reclassifying that prefix on terra Batch from **$1.25/M [M]** to **$1.5625/M [M]** adds **$0.00584/pass [D]** before retries and hard-fail allocation, or **$0.01144/accepted module [D]** after both. Treat the displayed terra costs as lower bounds pending write/reuse measurement.

The inherited system-token planning band is **$0.60–$1.65 per merged module [D]**, spanning the models and service tiers in production during the window at the measured token load, times the 3.0× proxy. The **$0.90 central value is a planning midpoint within that band [A]**, sitting above the currently attainable **$0.403 [D]** all-Batch system cost (section 5.2), so the price forecasts start conservative. Treating merged pull requests as equal token workloads is likewise an assumption **[A]**. Flat-rate developer subscriptions have cost **$0.17–$0.24/module [D]** at observed partial utilization and **$0.02–$0.07/module [D]** when saturated. The weekly allowance binds before local compute.

### 1.3 Coverage tiers

The module grain is **about 5.8 rules/module [M]**. Changing grain changes every denominator.

| Tier | Scope | Low | Central | High | Central remaining |
|:---:|---|---:|---:|---:|---:|
| A [D] | Scored computational universe across federal law and 51 jurisdictions | 15,500 | 24,000 | 35,000 | 19,897 [D] |
| B [D] | Tier A plus federal operative guidance and deeper state manuals | 29,000 | 53,000 | 100,000 | 48,897 [D] |
| C [A] | Full revenue and welfare-title breadth | 130,000 | 350,000 | 700,000 | 345,897 [D] |

Tier A arithmetic:

```text
federal statutes and regulations   1,000 / 1,500 / 2,500 [D]
state income taxes                  1,500 / 2,600 / 4,100 [D]
state benefit programs             13,000 / 20,000 / 28,000 [D]
                                   -------------------------------
unrounded Tier A                   15,500 / 24,100 / 34,600 [D]
published Tier A                   15,500 / 24,000 / 35,000 [D]
```

The state-benefit term contributes **about 83% of unrounded central Tier A [D]** and extrapolates from a small measured set of states, so it drives the Tier A range. Tier remainders subtract the full canonical stock from every tier, treating it as in-scope; roughly 18% of the stock is non-US country modules, so remaining-module counts are understated by up to about 4% **[A]**.

Tier B arithmetic:

```text
Tier A                              15,500 / 24,100 / 34,600 [D]
Social Security operating guidance  6,000 / 13,000 / 30,000 [A]
tax administration guidance         1,500 /  4,000 / 10,000 [A]
health and nutrition guidance       1,500 /  4,000 / 10,000 [A]
deeper state manuals                4,000 /  8,000 / 15,000 [D]
                                   -------------------------------
unrounded Tier B                   28,500 / 53,100 / 99,600 [D]
published Tier B                   29,000 / 53,000 / 100,000 [D]
```

Tier C starts with a **500,000–900,000 provision universe [A]**, applies an **encodable share of 25%–60% [A]**, and uses **1.0–1.3 modules per encodable provision [A]**. The low and high products support a **roughly 130,000–700,000-module range [A]**. The central sub-inputs produce **700,000 × 0.50 × 1.2 = 420,000 modules [D]**; the published **350,000 central value [A]** is an explicit planning midpoint within that wide range, not a rounded product. The central denominator carries roughly **2× uncertainty [A]**.

### 1.4 Canonical merge-rate provenance

Use the trajectory, not a flat mean:

```text
2026-07-01 canonical modules      3,328 [M]
2026-07-10 canonical modules      4,103 [M]
gross change                        775 [D]
approximate pause-day additions     55 [A]
active-period change                720 [D]
active days                           7 [D]
720 / 7 ≈ 103 → planning rate       100 modules/day [D]
recent peak                         138 modules/day [M]
```

The three-week mean blends the late-June ramp with deliberate pause days and understates current capacity. Conversely, the earlier one-time bulk import is retracted as evidence of a sustainable daily ceiling. The binding lever is CI and merge-train throughput: pull-request batch size, test selection, and parallelism.

### 1.5 What broader scale actually costs

The inherited all-in view is broader than token cost:

1. **Corpus ingest.** New source-family scrapers, adapters, and durable release production dominate Tier B prerequisites.
2. **Verification without direct oracles.** Proofs, companion tests, administrative data, and cross-model judging replace direct comparisons as scope expands.
3. **Merge and CI throughput.** Sharded conformance, reverse-closure selection, batching, and parallel runners turn generated modules into sustainable merges.
4. **Structural hard tail.** Dense dependency chains and encoder defects continue to require architect-level intervention.
5. **Operating capacity.** Source operations, review, and exception handling—not raw generation—become the staffing constraint.

On that basis, Tier A is within current program resources **[A]**; Tier B is **$0.5M–$1.5M all-in [A]**; and Tier C is a **single-digit-million program [A]**. Those are program-order estimates, not token totals. The token-only central totals at 2026 prices are **$17,907 [D]**, **$44,007 [D]**, and **$311,307 [D]** respectively.

## 2. Price-decline scenarios

### 2.1 Public anchors

The historical anchors need one date correction:

- GPT-4 launched in 2023-03 at **$30 input / $60 output per 1M tokens [M]**, from OpenAI's [GPT-4 announcement](https://openai.com/index/gpt-4-research/).
- GPT-4o launched in 2024-05 at **$5 / $15 [M]**. The **$2.50 / $10 [M]** snapshot arrived in 2024-08, not May; OpenAI's [Structured Outputs announcement](https://openai.com/index/introducing-structured-outputs-in-the-api/) states that the August snapshot cut input price by **50% [M]** and output price by **33% [M]** from the May snapshot.
- On 2026-07-11, OpenAI's short-context band lists gpt-5.5 at **$5 / $30 [M]**, gpt-5.6-terra at **$2.50 / $15 [M]**, and gpt-5.6-luna at **$1 / $6 [M]**. Batch prices are exactly half. The measured representative request mix falls within this band. See [OpenAI pricing](https://developers.openai.com/api/docs/pricing) and the [Batch guide](https://developers.openai.com/api/docs/guides/batch#overview).
- Also on 2026-07-11, a current small tier, gpt-5.4-nano, lists **$0.20 / $1.25 [M]** — a selected list-price ratio of **150× input / 48× output [D]** below GPT-4's 2023-03 launch price. Fixed-threshold analyses show frontier-level task performance migrating into small tiers within one to two years; the capability-equivalence claim rests on that literature, not on an Axiom measurement **[A]**.

Historical constant-capability research spans or exceeds the scenarios used here. Stanford's 2025 AI Index measured GPT-3.5-level (MMLU 64.8) inference falling from **$20.00 to $0.07 per million tokens [M]** between November 2022 and October 2024 — a **more-than-280× decline in about two years [M]**. A 2024 a16z analysis estimated a **10× annual decline [M, historical estimate]**, while warning that the timescale may change. Epoch AI measured **9×–900× annual declines [M]** across benchmark thresholds, with a **50× median [M]**, and cautioned that the fastest recent declines may not persist. The forward factors below remain assumptions, not extrapolated facts.

### 2.2 Method

**What is being forecast.** The forecast quantity is the price of encoder-sufficient capability: the cheapest model that passes the quarterly production bake-off on the live task mix, not the list price of any fixed model **[A]**. The July 2026 swap realized this once: gpt-5.6-terra (**$2.50 / $15 [M]**) displaced gpt-5.5 (**$5 / $30 [M]**) at equal measured quality on the July bake-off — a **2× [D]** list-price cut at constant task capability. The raw bake-off artifact is unavailable, so the equal-quality reading is directional (section 3.1) and is treated here as one realized substitution **[A]**. The still-cheaper gpt-5.6-luna tier (**$1 / $6 [M]**) did not pass the same bake-off, so its lower price is not yet realizable here. Benchmark-equivalence is not swap-readiness, and that task-transfer friction is why the central **5× [A]** planning factor sits well inside Epoch's **50×/year historical median [M]**.

For annual price-decline factor `d`:

```text
price-only cost/module in year y [D]
  = $0.90 [D] / cumulative factor d^(y - 2026) [D]

tier token cost [D]
  = central remaining modules [D]
  × price-only cost/module [D]
```

Here `d` is the **annual decline assumption [A]**. Raising it to elapsed years produces the **cumulative divisor [D]**.

This section holds retry load, hard-fail load, and tokens per pass constant so it isolates price. Capability enters in section 4.

Each year is a **counterfactual start-year snapshot [A]** against the same 2026-07-11 remaining backlog. The table does not subtract intervening merges and is not a sequential roll-forward.

### 2.3 Price-only forecast

| Scenario | Year | Annual decline | Cost/module | Tier A remaining | Tier B remaining | Tier C remaining |
|---|---:|---:|---:|---:|---:|---:|
| Conservative [A] | 2026 | 2× [A] | $0.900 [D] | $17,907 [D] | $44,007 [D] | $311,307 [D] |
| Conservative [A] | 2027 | 2× [A] | $0.450 [D] | $8,954 [D] | $22,004 [D] | $155,654 [D] |
| Conservative [A] | 2028 | 2× [A] | $0.225 [D] | $4,477 [D] | $11,002 [D] | $77,827 [D] |
| Central [A] | 2026 | 5× [A] | $0.900 [D] | $17,907 [D] | $44,007 [D] | $311,307 [D] |
| Central [A] | 2027 | 5× [A] | $0.180 [D] | $3,581 [D] | $8,801 [D] | $62,261 [D] |
| Central [A] | 2028 | 5× [A] | $0.036 [D] | $716 [D] | $1,760 [D] | $12,452 [D] |
| Aggressive [A] | 2026 | 10× [A] | $0.900 [D] | $17,907 [D] | $44,007 [D] | $311,307 [D] |
| Aggressive [A] | 2027 | 10× [A] | $0.090 [D] | $1,791 [D] | $4,401 [D] | $31,131 [D] |
| Aggressive [A] | 2028 | 10× [A] | $0.009 [D] | $179 [D] | $440 [D] | $3,113 [D] |

The table should not be read as a vendor-price forecast. It asks what happens if Axiom can keep swapping into the cheapest model that clears the bake-off bar at progressively lower effective prices, on the section 3 cadence.

## 3. Capability improvements

### 3.1 Measured evidence

| Model | First-pass rate | Sample | Median duration | Interpretation |
|---|---:|---:|---:|---|
| gpt-5.1 | 64% [M] | 16 [M] | 52 s [M] | Small sample |
| gpt-5.5 | 67% [M] | 3,289 [M] | 53 s [M] | Workhorse sample |
| gpt-5.6-terra | 62% [M] | 8 [M] | 47 s [M] | Very small production sample |

The July bake-off found terra **44% faster at equal quality [M]** and recorded one case in which the 5.6 generation grounded a tax rate that 5.5 fabricated **[M, anecdotal]**. The raw bake-off artifact is unavailable, so this supports a directional swap hypothesis, not a general model ranking. The large production sample remains the sounder quality baseline.

### 3.2 Planning trajectory

| Year | First pass | Retry multiplier | Hard-fail tail | Capability workload factor | Sustainable merges/day |
|---:|---:|---:|---:|---:|---:|
| 2026 | 67% [M] | 1.43 [M] | 27% [M] | 1.000 [D] | 100 [D] |
| 2027 | 80% [A] | 1.25 [A] | 18% [A] | 0.778 [D] | 300 [A] |
| 2028 | 88% [A] | 1.15 [A] | 10% [A] | 0.652 [D] | 1,000 [A] |

The workload factor is a transparent planning proxy:

```text
capability workload factor [D]
  = (retry multiplier / (1 - hard-fail tail))
  / (1.43 / (1 - 0.27))
```

It excludes architect labor on failed modules. The expected mechanism on the merge side is fewer red CI runs, fewer repair pull requests, and less serial rework at a fixed CI spend. Capability alone does not produce the 300/day or 1,000/day scenarios; those rates also require batching, hermetic inputs, selective tests, and runner parallelism.

Run **four encoder bake-offs per year [A]**—one per quarter—with the production task mix, grounding failures, cost per accepted module, and wall-clock time as swap criteria. A quarterly checkpoint captures price/capability movement without making every run depend on an unpinned model alias.

## 4. Combined price × capability × throughput path

The central combined cost is:

```text
cost/merged module [D]
  = $0.90 baseline [D]
  ÷ cumulative price-decline factor [D]
  × capability workload factor [D]
```

The cumulative divisor comes from the **5× annual decline assumption [A]**: **1× [D]**, **5× [A]**, and **25× [D]** across the three snapshots.

| Year | Price decline from 2026 | Capability factor | Cost/merged module | +50% tokens/year stress | Throughput | Tier A calendar | Tier B calendar | Tier C calendar |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 | 1× [D] | 1.000 [D] | $0.900 [D] | $0.900 [D] | 100/day [D] | 199 d / 6.5 mo [D] | 489 d / 16.1 mo [D] | 3,459 d / 9.5 y [D] |
| 2027 | 5× [A] | 0.778 [D] | $0.140 [D] | $0.210 [D] | 300/day [A] | 66 d / 2.2 mo [D] | 163 d / 5.4 mo [D] | 1,153 d / 3.2 y [D] |
| 2028 | 25× [D] | 0.652 [D] | $0.023 [D] | $0.053 [D] | 1,000/day [A] | 20 d / 0.7 mo [D] | 49 d / 1.6 mo [D] | 346 d / 0.95 y [D] |

The stress column assumes tokens per pass rise **50% each year [A]** as the encoder carries richer source context, more retrieval evidence, and more judging. By 2028 that is a **2.25× token factor [D]**. Cost still falls in the central path, but only to **$0.053/module [D]** rather than **$0.023 [D]**. Any other context-growth view can be applied linearly.

The calendar calculation is deliberately simple: `central remaining modules [D] / sustainable merged modules per day [D/A]`. Price does not shorten the calendar by itself; it keeps higher-throughput generation affordable while capability and CI work raise accepted merges/day.

As in the price-only table, each calendar row starts from the same as-of backlog **[A]**. It compares start-year conditions rather than forecasting the backlog left after earlier rows.

## 5. Cloud scaling

### 5.1 What the provenance migration unlocks

Today generation depends on flat-rate developer subscriptions, machine-local orchestration, ambient corpus discovery, mutable `current` pointers, and machine-specific pins. A run can be fast and cheap yet still be difficult to reproduce elsewhere because resolution depends on the machine's surrounding state.

The canonical-provenance migration changes that boundary. Immutable named corpus releases, repository-owned `toolchain.toml` pins, hermetic fail-closed resolution, and signed manifests make each run self-describing. Cloud workers can resolve the same corpus and toolchain or fail closed. Local machines remain optional workers, while the signed release and repository pins become the source of truth. That makes generation horizontally parallel, retries relocatable, and CI evidence comparable across workers.

### 5.2 Metered Batch generation

At the measured token mix:

```text
terra standard cost/pass                 $0.137287 [D]
Batch discount × 0.50                         0.50 [M]
terra Batch cost/pass                    $0.068644 [D]
retry multiplier × 1.43                       1.43 [M]
direct Batch cost/successful module      $0.098160 [D]
hard-fail allocation ÷ (1 − 0.27)       1.369863 [D]
direct Batch cost/accepted module        $0.134466 [D]
system-token proxy × 3.0                       3.0 [D]
system Batch cost/accepted module        $0.403398 [D]
```

The hard-fail allocation assumes failed citations consume the same average token workload as successful citations **[A]**.

Batch processing completes asynchronously, so it fits queued generation and retry work better than latency-sensitive repair loops. Interactive failures can stay on standard service while the bulk queue uses Batch.

These Batch rows assume single-shot generation over hermetically assembled context, which the canonical-provenance migration enables: a batch item is one request and one response, with no client-side tool round-trips, so the current agentic dispatch cannot run as-is on the Batch API and meters at standard rates — about twice the Batch figures **[A]**. OpenAI's [flex service tier](https://developers.openai.com/api/docs/guides/flex-processing) prices the gpt-5.5 and gpt-5.6 family — including the pinned encoder — at Batch rates on the synchronous API **[M]**, so the agentic dispatch can reach these economics without the single-shot path, subject to beta capacity limits (uncharged 429s with backoff) and longer timeouts.

### 5.3 Elastic CI

Recent run telemetry for this repository and `rulespec-us` was unavailable during analysis, so CI time uses the requested **2–6 minutes per merged pull request [A]**, with **4 minutes [A]** central.

GitHub's live documentation now lists **$0.006/minute [M]** for the baseline two-core Linux x64 reference, not the older **about $0.008/minute [A, superseded anchor]**. Standard runners for public repositories currently have **$0 marginal cash price [M]**; the model uses $0.006 as a paid-equivalent shadow price for elastic capacity.

The aligned **2026-06-19 through 2026-07-10 window [M]** contains **1,354 merged pull requests [M]** and **959 merged modules [M]**:

```text
PR equivalents/module = 1,354 / 959 = 1.411887 [D]

central CI shadow cost/module
  = 1.411887 [D] × 4 minutes/PR [A] × $0.006/minute [M]
  = $0.033885 [D]

range at 2–6 minutes/PR [A]
  = $0.016943–$0.050828/module [D]
```

### 5.4 All-Batch cloud scenarios

These rows apply the same per-module economics at three throughput levels. They include the system-token proxy and the central paid-equivalent CI shadow cost.

They are lower-bound cache-reuse cases: base costs allocate **zero write premiums [A]** because cache-write telemetry is unavailable. Direct Batch cost allocates the **27% hard-fail tail [M]** across accepted output by dividing successful-citation cost by **73% [D]**. This allocation assumes failed citations consume the same average token workload as successful citations **[A]**. The cache sensitivity assumes **one write/pass [A]** of **18,688 fresh-input tokens/write [A]**, matching the **18,688-token cached-prefix scale [M]**. Repricing those tokens from the live **$1.25/M Batch input rate [M]** to the **$1.5625/M write rate [M]** gives a **$0.3125/M incremental premium [D]**, adds **$0.034/system module [D]** after retry and hard-fail allocation, and raises the all-Batch total from **$0.437 to $0.472/module [D]**.

| Scenario | Merged/day | Direct generation/day (subset) | System cost/day (incl. direct) | CI shadow/day | Total/day | Total/module |
|---|---:|---:|---:|---:|---:|---:|
| Current throughput | 100 [D] | $13.45 [D] | $40.34 [D] | $3.39 [D] | $43.73 [D] | $0.437 [D] |
| Expanded | 300 [A] | $40.34 [D] | $121.02 [D] | $10.17 [D] | $131.19 [D] | $0.437 [D] |
| Elastic | 1,000 [A] | $134.47 [D] | $403.40 [D] | $33.89 [D] | $437.28 [D] | $0.437 [D] |

If standard public-repository runners provide enough concurrency, cash CI spend is lower by the shadow-cost column. If elastic capacity uses larger runners, replace the reference rate with the chosen runner's live rate.

### 5.5 Subscription crossover and hybrid operation

Flat-rate subscriptions remain the cheapest fully utilized baseload. The crossover is operational, not a price equality: at roughly **100–150 sustained modules/day [A]**, weekly windows are expected to bind for the current pool, so additional demand moves to metered Batch generation. An exact economic break-even would require publishing pool-specific details that are neither necessary nor appropriate for this public model.

The hybrid scenario is a normalized future steady state, not today's cash allocation. It holds **100 modules/day of fully utilized subscription baseload [A]** and sends the rest to Batch. It applies the saturated **$0.02–$0.07 direct subscription cost/module [D]**, the **3.0 system-token proxy [D]**, and central CI shadow cost to all modules. Batch portions remain lower-bound reuse costs until cache-write telemetry is available.

| Merged/day | Subscription baseload | Batch burst | Total/day | Total/module |
|---:|---:|---:|---:|---:|
| 100 [D] | 100 [A] | 0 [D] | $9.39–$24.39 [D] | $0.094–$0.244 [D] |
| 300 [A] | 100 [A] | 200 [D] | $96.85–$111.85 [D] | $0.323–$0.373 [D] |
| 1,000 [A] | 100 [A] | 900 [D] | $402.94–$417.94 [D] | $0.403–$0.418 [D] |

The current observed subscription allocation is higher—**$0.17–$0.24/module [D]** before the system proxy—because utilization has been partial. Saturation is an optimization target, not a historical billing result. The operating policy is therefore: fill flat-rate baseload, queue delay-tolerant bursts to Batch, reserve standard metered calls for interactive repair, and scale CI only with accepted merge demand.

## 6. Interpretation and limits

1. **The denominator dominates long-horizon uncertainty.** Tier C's roughly **2× range [A]** matters more than another decimal place in token cost.
2. **Price scenarios are capability-adjusted service scenarios.** The **2× / 5× / 10× annual factors [A]** assume quarterly model substitution, not guaranteed price cuts to one model. Substitution is gated by the production bake-off, not benchmark equivalence: the cheaper luna tier failed the July bake-off while terra passed **[M]**.
3. **Capability evidence is uneven.** The **3,289-run sample [M]** is robust; the newer-model samples of **8–16 runs [M]** are directional.
4. **The capability workload factor is a proxy.** It converts retry and hard-fail improvements into machine workload but excludes the labor intensity of the remaining structural tail.
5. **Throughput needs engineering.** The **300/day and 1,000/day rates [A]** require hermetic inputs, batchable pull requests, selective tests, and CI parallelism. Better models do not create this capacity alone.
6. **Token volume can rise.** The **50% annual context-growth case [A]** is a stress test, not a forecast; the model scales linearly with any replacement assumption.
7. **CI cash and shadow cost differ.** Public standard runners currently have zero marginal cash price **[M]**, but a paid-equivalent rate exposes the resource cost of elastic capacity.

## Sources

- Axiom encoder run records, aggregate as of 2026-07-11 **[M]**.
- Axiom canonical module census and corpus measurements, as of 2026-07-10 **[M]**.
- [OpenAI pricing](https://developers.openai.com/api/docs/pricing), accessed 2026-07-11 **[M]**.
- [OpenAI Batch guide](https://developers.openai.com/api/docs/guides/batch#overview), accessed 2026-07-11 **[M]**.
- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), accessed 2026-07-11 **[M]**.
- [OpenAI flex processing](https://developers.openai.com/api/docs/guides/flex-processing), accessed 2026-07-11 **[M]**.
- [GPT-4](https://openai.com/index/gpt-4-research/), OpenAI, 2023-03-14 **[M]**.
- [Introducing Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/), OpenAI, 2024-08-06 **[M]**.
- [Welcome to LLMflation](https://a16z.com/llmflation-llm-inference-cost/), a16z, 2024-11-12 **[M, historical analysis]**.
- [LLM inference prices have fallen rapidly but unequally across tasks](https://epoch.ai/data-insights/llm-inference-price-trends), Epoch AI, 2025-03-12 **[M, historical analysis]**.
- [The 2025 AI Index Report](https://hai.stanford.edu/ai-index/2025-ai-index-report), Stanford HAI, accessed 2026-07-11 **[M, historical analysis]**.
- [GitHub Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing), accessed 2026-07-11 **[M]**.
- [GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), accessed 2026-07-11 **[M]**.
