-- P1-B: research_dimensions — cross-cutting lenses separate from topics[]
-- P1-C: citation_count — from Semantic Scholar, foundation for relevance scoring

ALTER TABLE enrichments
  ADD COLUMN IF NOT EXISTS research_dimensions text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS enrichments_research_dimensions_idx
  ON enrichments USING GIN (research_dimensions);

ALTER TABLE papers
  ADD COLUMN IF NOT EXISTS citation_count int;

-- Rebuild enriched_papers view to include both new columns.
-- GRANT must be re-applied after DROP+CREATE.
DROP VIEW IF EXISTS enriched_papers;

CREATE VIEW enriched_papers AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.doi,
  p.title,
  p.abstract,
  p.authors,
  p.journal,
  p.source_url,
  p.source_id,
  p.source_name,
  p.published_at,
  p.created_at,
  p.citation_count,
  e.id                    AS enrichment_id,
  e.sports,
  e.body_regions,
  e.topics,
  e.research_dimensions,
  e.evidence_level,
  e.study_type,
  e.summary,
  e.enrichment_status,
  e.confidence_sports,
  e.confidence_topics,
  e.confidence_regions,
  e.confidence_evidence,
  e.sample_size,
  e.population,
  e.practical_relevance,
  e.tags,
  e.created_at            AS enrichment_created_at
FROM papers p
INNER JOIN enrichments e ON e.paper_id = p.id
  AND e.enrichment_status IN ('auto_committed', 'needs_review')
ORDER BY p.id, e.created_at DESC;

GRANT SELECT ON enriched_papers TO anon, authenticated, service_role;
