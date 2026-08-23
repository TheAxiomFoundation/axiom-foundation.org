-- Reverse index from corpus provisions to the RuleSpec files that cite them.
--
-- A rulespec_files citation_path follows the encoding repository layout, so
-- policy-rooted modules cannot be found by the reader's provision-path scan.
-- source_citation_paths records the corpus citations declared by each module
-- and its proof atoms, allowing a bounded GIN-backed reverse lookup.

alter table encodings.rulespec_files
  add column if not exists source_citation_paths text[] not null default '{}';

create index if not exists rulespec_files_source_citation_paths_idx
  on encodings.rulespec_files using gin (source_citation_paths);
