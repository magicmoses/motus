---
name: data-model
description: >
  Use when working on DB schema, Supabase migrations, queries,
  RLS policies, or data relationships. Load before writing any
  SQL or Supabase client calls.
---

# Data Model

## papers
```sql
CREATE TABLE papers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doi         text UNIQUE,
  title       text NOT NULL,
  abstract    text,
  authors     text[],
  journal     text,
  source_url  text,
  source_id    text,                   -- PubMed PMID or Semantic Scholar ID
  source_name  text,                   -- 'pubmed' | 'semantic_scholar' | 'rss'
  published_at date,
  citation_count int,                  -- from Semantic Scholar (null for PubMed/arXiv)
  created_at   timestamptz DEFAULT now()
);
```

## enrichments
```sql
CREATE TABLE enrichments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id            uuid REFERENCES papers(id) ON DELETE CASCADE,
  summary             text,            -- max 120 words
  tags                text[],
  sports              text[],          -- enum values
  body_regions        text[],          -- enum values
  topics              text[],          -- enum values
  evidence_level      int CHECK (evidence_level BETWEEN 1 AND 4),
  study_type          text,
  sample_size         int,
  population          text,
  practical_relevance boolean DEFAULT true,
  movement_practices  text[] DEFAULT '{}',  -- martial_arts | mind_body | yoga_pilates (NEVER mixed with sports[])
  research_dimensions text[] DEFAULT '{}',  -- cross-cutting lenses: female_athlete | masters_longevity | supplements | technology_wearables | ai_ml_research | para_sport
  confidence_sports      float CHECK (confidence_sports BETWEEN 0 AND 1),
  confidence_regions     float CHECK (confidence_regions BETWEEN 0 AND 1),
  confidence_topics      float CHECK (confidence_topics BETWEEN 0 AND 1),
  confidence_evidence    float CHECK (confidence_evidence BETWEEN 0 AND 1),
  enrichment_status      text DEFAULT 'pending',
                         -- pending | auto_committed | needs_review | rejected
  created_at          timestamptz DEFAULT now()
);
```

## users
```sql
CREATE TABLE users (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id),
  email               text,
  primary_sport       text,
  preferred_distances text[],
  interests           text[],
  onboarded_at        timestamptz
);
```

## saves
```sql
CREATE TABLE saves (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid REFERENCES users(id) ON DELETE CASCADE,
  paper_id  uuid REFERENCES papers(id) ON DELETE CASCADE,
  list_name text DEFAULT 'default',
  saved_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, paper_id)
);
```

## ingestion_queue
```sql
CREATE TABLE ingestion_queue (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw        jsonb NOT NULL,
  source     text,
  status     text DEFAULT 'pending',  -- pending | processing | done | failed
  error      text,
  created_at timestamptz DEFAULT now()
);
```

## Key indexes
```sql
CREATE INDEX ON papers (published_at DESC);
CREATE INDEX ON papers (created_at DESC);
CREATE INDEX ON papers (doi) WHERE doi IS NOT NULL;
CREATE INDEX ON enrichments USING GIN (sports);
CREATE INDEX ON enrichments USING GIN (body_regions);
CREATE INDEX ON enrichments USING GIN (tags);
CREATE INDEX ON enrichments (enrichment_status);
CREATE INDEX ON saves (user_id, list_name);
```

## RLS policies
- papers + enrichments: readable by all authenticated users
- saves: user can only read/write their own rows
- users: user can only read/write their own row
- ingestion_queue: service role only

## Migrations location
supabase/migrations/<timestamp>_<description>.sql

## Supabase client (TypeScript)
```ts
import { createClient } from '@supabase/supabase-js'
// Types auto-generated: apps/web/types/supabase.ts
// Regenerate: supabase gen types typescript --local > apps/web/types/supabase.ts
```
