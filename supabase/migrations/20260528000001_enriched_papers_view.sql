-- enriched_papers view: flat join of papers + enrichments for correct pagination.
-- The !inner embedding approach applies OFFSET before filtering by enrichment status,
-- causing pages 2+ to return empty results. A view moves the filter into the WHERE
-- clause so OFFSET is applied only to the valid paper set.
-- DISTINCT ON picks the most recent enrichment per paper (handles re-enrichment runs).

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
  e.id            AS enrichment_id,
  e.sports,
  e.body_regions,
  e.topics,
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
  e.created_at    AS enrichment_created_at
FROM papers p
INNER JOIN enrichments e ON e.paper_id = p.id
  AND e.enrichment_status IN ('auto_committed', 'needs_review')
ORDER BY p.id, e.created_at DESC;

GRANT SELECT ON enriched_papers TO anon, authenticated;
