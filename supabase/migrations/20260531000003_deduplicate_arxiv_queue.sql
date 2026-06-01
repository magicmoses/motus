-- Clean up arXiv queue backlog.
--
-- arXiv papers have doi=null so the DOI-based dedup in migration 20260531000002
-- never touched them. source_id is the arXiv entry URL (unique per paper).

-- Step 1: remove pending arXiv items whose source_id is already in the papers table
DELETE FROM ingestion_queue
WHERE status = 'pending'
  AND (raw->>'doi' IS NULL OR raw->>'doi' = '')
  AND raw->>'source_id' IS NOT NULL
  AND raw->>'source_id' IN (
    SELECT source_id FROM papers WHERE source_id IS NOT NULL
  );

-- Step 2: deduplicate remaining pending arXiv items — keep only the oldest per source_id
DELETE FROM ingestion_queue
WHERE status = 'pending'
  AND (raw->>'doi' IS NULL OR raw->>'doi' = '')
  AND raw->>'source_id' IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (raw->>'source_id') id
    FROM ingestion_queue
    WHERE status = 'pending'
      AND (raw->>'doi' IS NULL OR raw->>'doi' = '')
      AND raw->>'source_id' IS NOT NULL
    ORDER BY raw->>'source_id', created_at ASC
  );
