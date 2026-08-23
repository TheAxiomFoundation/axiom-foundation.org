-- Reverse index from corpus provisions to the RuleSpec files that cite them.
--
-- A rulespec_files citation_path follows the encoding repository layout, so
-- policy-rooted modules cannot be found by the reader's provision-path scan.
-- source_citation_paths records every corpus citation declared by each module
-- and its proof atoms; value_citation_paths keeps only the paths cited by
-- kind: parameter atoms — the provisions whose content the module encodes.
-- The reader's reverse lookup keys on value_citation_paths: condition atoms
-- reference provisions without encoding them (every tariff chapter
-- composition cites the witness beer line from regime-guard formulas), so an
-- all-declarations lookup floods a provision page with modules that merely
-- mention it.

alter table encodings.rulespec_files
  add column if not exists source_citation_paths text[] not null default '{}';

create index if not exists rulespec_files_source_citation_paths_idx
  on encodings.rulespec_files using gin (source_citation_paths);

alter table encodings.rulespec_files
  add column if not exists value_citation_paths text[] not null default '{}';

create index if not exists rulespec_files_value_citation_paths_idx
  on encodings.rulespec_files using gin (value_citation_paths);
