import type { PaperWithEnrichment } from '@/types/supabase'

// Converts a flat enriched_papers view row into the PaperWithEnrichment shape
// that FeedList / FeedCard expect.
export function toFeedPaper(row: Record<string, unknown>): PaperWithEnrichment {
  return {
    id: row.id as string,
    doi: row.doi as string | null,
    title: row.title as string,
    abstract: row.abstract as string | null,
    authors: row.authors as string[] | null,
    journal: row.journal as string | null,
    source_url: row.source_url as string | null,
    source_id: row.source_id as string | null,
    source_name: row.source_name as string | null,
    published_at: row.published_at as string | null,
    created_at: row.created_at as string | null,
    enrichments: [{
      id: row.enrichment_id as string,
      paper_id: row.id as string,
      sports: row.sports as string[] | null,
      body_regions: row.body_regions as string[] | null,
      topics: row.topics as string[] | null,
      evidence_level: row.evidence_level as number | null,
      study_type: row.study_type as string | null,
      summary: row.summary as string | null,
      enrichment_status: row.enrichment_status as string | null,
      confidence_sports: row.confidence_sports as number | null,
      confidence_topics: row.confidence_topics as number | null,
      confidence_regions: row.confidence_regions as number | null,
      confidence_evidence: row.confidence_evidence as number | null,
      sample_size: row.sample_size as number | null,
      population: row.population as string | null,
      practical_relevance: row.practical_relevance as boolean | null,
      tags: row.tags as string[] | null,
      created_at: row.enrichment_created_at as string | null,
    }],
  }
}
