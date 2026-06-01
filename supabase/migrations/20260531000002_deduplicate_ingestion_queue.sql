-- One-time cleanup of the ingestion_queue backlog.
--
-- Problem: researcher was re-queuing papers every run because:
--   1. DOIs from RSS feeds included ?af=R tracking params (dedup miss)
--   2. paper_exists_in_queue only checked pending/processing — failed
--      items accumulated and were re-queued on each subsequent run
--
-- Step 1: drop pending items whose DOI is already stored in papers
DELETE FROM ingestion_queue
WHERE status = 'pending'
  AND raw->>'doi' IS NOT NULL
  AND raw->>'doi' IN (SELECT doi FROM papers WHERE doi IS NOT NULL);

-- Step 2: drop pending duplicates — keep only the oldest entry per DOI
DELETE FROM ingestion_queue
WHERE status = 'pending'
  AND raw->>'doi' IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (raw->>'doi') id
    FROM ingestion_queue
    WHERE status = 'pending'
      AND raw->>'doi' IS NOT NULL
    ORDER BY raw->>'doi', created_at ASC
  );

-- Step 3: drop pending items with no DOI and no source_url (will fail normalizer anyway)
DELETE FROM ingestion_queue
WHERE status = 'pending'
  AND (raw->>'doi' IS NULL OR raw->>'doi' = '')
  AND (raw->>'source_url' IS NULL OR raw->>'source_url' = '');
