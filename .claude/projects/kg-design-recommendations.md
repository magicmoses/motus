---
title: Knowledge Graph Design Recommendations for Motus
date: 2026-06-02
author: Research synthesis from SOTA KG implementations
---

# Knowledge Graph Design for Motus

Based on SOTA research across biomedical KGs, lightweight implementations, and sports science–specific ontologies, this document recommends a concrete KG architecture for the 1000-paper research platform.

## Executive Summary

**Recommended Stack:**
- **Storage**: Materialized views in Postgres (leverage existing Supabase)
- **Query Language**: GraphQL over Postgres (not SPARQL)
- **Visualization**: Cytoscape.js with focus+context UI
- **Foundation**: Your tagger already extracts the core entities; KG formalizes relationships

**Timeline**: Phase 1 (schema + materialized views, 3mo) → Phase 2 (GraphQL API, 6mo) → Phase 3 (visualization, 9mo)

**Cost**: ~$0 additional infrastructure, 2–5 weeks engineering per phase

---

## 1. Node/Edge Design (Property Graph Model)

### Core Node Types

Your enrichments table already captures most of this. Extend to explicit entity tables:

#### 1.1 **Paper** (already in schema)
- Properties: `doi`, `title`, `abstract`, `journal`, `published_at`, `citation_count`, `source_name`, `evidence_level`
- Relationships: `:CITES` (paper→paper), `:STUDIES` (paper→sport/intervention), `:REPORTS_OUTCOME` (paper→outcome)

#### 1.2 **Sport** (from enrichments.sports enum)
```sql
CREATE TABLE kg_sports (
  id uuid PRIMARY KEY,
  name text UNIQUE,         -- 'running', 'cycling', etc.
  category text,            -- 'endurance' | 'strength' | 'movement_practice'
  description text,
  parent_sport_id uuid REFERENCES kg_sports(id)  -- for hierarchies like cycling→road_cycling
);
```
Relationships: `:INCLUDES_REGION` (sport→body_region hint), `:RELATED_TO` (sport→sport)

#### 1.3 **BodyRegion** (from enrichments.body_regions enum)
```sql
CREATE TABLE kg_body_regions (
  id uuid PRIMARY KEY,
  name text UNIQUE,         -- 'quads', 'core', etc.
  anatomical_type text,     -- 'muscle' | 'joint' | 'connective_tissue'
  icd11_code text,          -- clinical reference
  parent_region_id uuid REFERENCES kg_body_regions(id)  -- quads → leg
);
```
Relationships: `:CONTAINS` (region→region), `:INNERVATED_BY` (region→nerve), `:ADJACENT_TO` (region→region)

#### 1.4 **Biomarker** (from tagger topics + domain knowledge)
```sql
CREATE TABLE kg_biomarkers (
  id uuid PRIMARY KEY,
  name text UNIQUE,         -- 'VO2max', 'HRV', 'lactate_threshold'
  category text,            -- 'metabolic' | 'cardiovascular' | 'hormonal' | 'inflammatory'
  unit text,                -- 'ml/kg/min', 'ms', 'mmol/L'
  normal_range_min float,
  normal_range_max float,
  measurement_method text   -- 'lab_test', 'wearable', 'calculated'
);
```
Relationships: `:MEASURED_IN` (paper→biomarker with confidence), `:RESPONDS_TO` (biomarker←intervention)

#### 1.5 **Intervention** (implicit from papers; extract via tagger enhancement)
```sql
CREATE TABLE kg_interventions (
  id uuid PRIMARY KEY,
  name text,
  type text,                -- 'training_protocol' | 'supplement' | 'recovery_method' | 'device'
  description text,
  duration_weeks int,
  protocol text             -- freeform protocol description
);
```
Relationships: `:TARGETS` (intervention→body_region), `:MODIFIES` (intervention→biomarker), `:STUDIED_IN` (paper→intervention with effect_size)

#### 1.6 **Outcome** (implicit from papers)
```sql
CREATE TABLE kg_outcomes (
  id uuid PRIMARY KEY,
  name text UNIQUE,         -- 'VO2max_improvement', 'injury_prevention', 'lactate_threshold_increase'
  category text,            -- 'performance' | 'health' | 'adaptation'
  measurement_type text,    -- 'percentage_change', 'absolute_change', 'binary'
  direction text            -- 'higher_is_better' | 'lower_is_better'
);
```
Relationships: `:MEASURED_BY` (paper→outcome with effect_size, p_value, CI), `:INFLUENCED_BY` (outcome←intervention)

#### 1.7 **Topic** (from enrichments.topics enum)
```sql
CREATE TABLE kg_topics (
  id uuid PRIMARY KEY,
  name text UNIQUE,         -- 'vo2max', 'intervals', 'recovery'
  category text,            -- 'physiology' | 'training_method' | 'nutrition' | 'biomechanics'
  definition text
);
```
Relationships: `:MENTIONED_IN` (paper→topic with context), `:RELATED_TO` (topic→topic)

#### 1.8 **ResearchDimension** (from enrichments.research_dimensions enum)
```sql
CREATE TABLE kg_research_dimensions (
  id uuid PRIMARY KEY,
  name text UNIQUE,         -- 'female_athlete', 'para_sport', etc.
  category text,            -- 'population' | 'technology' | 'health_focus'
  description text
);
```
Relationships: `:APPLIES_TO` (dimension→sport/biomarker), `:STUDIED_IN` (paper→dimension)

---

## 2. Edge Types & Properties

Materialized view approach: store edges as relationships table + properties as JSON.

```sql
CREATE TABLE kg_relationships (
  id uuid PRIMARY KEY,
  source_node_id uuid NOT NULL,
  source_node_type text,      -- 'paper', 'intervention', 'sport', etc.
  target_node_id uuid NOT NULL,
  target_node_type text,
  relation_type text,          -- 'CITES', 'STUDIES', 'MODIFIES', 'RESPONDS_TO', etc.
  properties jsonb DEFAULT '{}',  -- effect_size, p_value, confidence, citation_count, etc.
  created_at timestamptz,
  updated_at timestamptz,
  PRIMARY KEY (source_node_id, relation_type, target_node_id)
);
```

### Recommended Edge Types

| Source → Target | Relation | Properties |
|---|---|---|
| Paper → Paper | `:CITES` | citation_count, is_direct |
| Paper → Sport | `:STUDIES` | confidence |
| Paper → BodyRegion | `:REPORTS_ON` | confidence |
| Paper → Biomarker | `:MEASURES` | confidence, p_value |
| Paper → Intervention | `:EVALUATES` | effect_size, sample_size |
| Paper → Outcome | `:REPORTS_OUTCOME` | effect_size, p_value, CI_lower, CI_upper |
| Paper → Topic | `:DISCUSSES` | confidence, prominence |
| Paper → ResearchDimension | `:FOCUSES_ON` | is_primary |
| Intervention → Biomarker | `:MODIFIES` | expected_effect, mechanism |
| Intervention → BodyRegion | `:TARGETS` | specificity |
| Intervention → Outcome | `:PRODUCES` | typical_effect_size |
| Biomarker → Sport | `:KEY_IN` | relevance_score |
| BodyRegion → Topic | `:RELATES_TO` | — |
| Sport → Sport | `:SHARES_PHYSIOLOGY` | similarity_score |
| Topic → Topic | `:RELATED_TO` | co_occurrence_count |

**Key principle**: Properties encode *certainty* (confidence, p_value, effect_size). This lets the KG distinguish "paper mentions" from "paper proves".

---

## 3. Materialized View Strategy

Your current `enriched_papers` view is read-only. Build on it:

```sql
-- KG node facts (materialized, refreshed nightly)
CREATE MATERIALIZED VIEW kg_nodes AS
SELECT 
  'paper'::text as node_type,
  p.id as node_id,
  p.title as label,
  jsonb_build_object(
    'doi', p.doi,
    'journal', p.journal,
    'evidence_level', e.evidence_level,
    'published_at', p.published_at,
    'citation_count', p.citation_count
  ) as properties
FROM papers p
LEFT JOIN enrichments e ON p.id = e.paper_id
WHERE e.enrichment_status IN ('auto_committed', 'needs_review')

UNION ALL

SELECT 'sport'::text, id, name, jsonb_build_object('category', category)
FROM kg_sports

UNION ALL

SELECT 'biomarker'::text, id, name, jsonb_build_object('category', category, 'unit', unit)
FROM kg_biomarkers

-- ... etc for all node types
WITH DATA;

CREATE INDEX idx_kg_nodes_type ON kg_nodes (node_type);
CREATE INDEX idx_kg_nodes_id ON kg_nodes (node_id);

-- KG relationship facts
CREATE MATERIALIZED VIEW kg_edges AS
SELECT 
  source_node_id,
  source_node_type,
  target_node_id,
  target_node_type,
  relation_type,
  properties,
  properties->>'confidence' as confidence_score
FROM kg_relationships
WHERE properties->>'confidence' IS NOT NULL
  OR properties->>'effect_size' IS NOT NULL
  OR relation_type IN ('CITES', 'STUDIES')
WITH DATA;

CREATE INDEX idx_kg_edges_source ON kg_edges (source_node_id, relation_type);
CREATE INDEX idx_kg_edges_target ON kg_edges (target_node_id, relation_type);

-- Refresh nightly (or after verifier stage completes)
REFRESH MATERIALIZED VIEW CONCURRENTLY kg_nodes;
REFRESH MATERIALIZED VIEW CONCURRENTLY kg_edges;
```

**Refresh Strategy**: Trigger refresh in `run_pipeline.py` after verifier completes (no lock conflicts with materialized view refresh).

---

## 4. Entity Extraction (Tagger Enhancement)

Your tagger already extracts: `sports`, `topics`, `body_regions`, `research_dimensions`.

To build the KG, enhance tagger to also extract:

```json
{
  "_perspectives": { ... },
  "sports": ["cycling"],
  "topics": ["vo2max", "intervals"],
  "body_regions": ["quads", "core"],
  "research_dimensions": ["masters_longevity"],
  "interventions": [              // NEW
    { "name": "polarized_training", "type": "training_protocol", "confidence": 0.85 }
  ],
  "outcomes": [                   // NEW
    { "name": "lactate_threshold_increase", "effect_size": 0.45, "confidence": 0.88 }
  ],
  "biomarkers": [                 // NEW
    { "name": "VO2max", "measurement": "increased", "p_value": 0.001, "confidence": 0.95 }
  ]
}
```

This is a **Phase 2 task** (after KG foundation is in place). For now, topics + body_regions + research_dimensions suffice to begin building the KG.

---

## 5. GraphQL API Design

Use `postgraphile` (auto-generated GraphQL from Postgres) or hand-written Apollo resolvers.

```graphql
# Example queries

query PapersOnVO2MaxInCyclists {
  papers(
    filter: {
      enrichments: {
        topics: { contains: "vo2max" },
        sports: { contains: "cycling" }
      }
    }
  ) {
    edges {
      node {
        doi
        title
        evidenceLevel
        biomarkers { name, confidence }
        outcomes { name, effectSize }
        relatedPapers(relationshipType: "CITES") { 
          node { title, doi }
          edge { citationCount }
        }
      }
    }
  }
}

# Neighborhood query for KG visualization
query PaperNeighborhood($paperId: UUID!, $hops: Int = 2) {
  paperById(id: $paperId) {
    title
    directRelationships(maxHops: $hops) {
      edges {
        sourceNode { label, nodeType }
        targetNode { label, nodeType }
        relationshipType
        properties
      }
    }
  }
}

# Topic correlation
query RelatedTopics($topic: String!) {
  topics(filter: { name: { eq: $topic } }) {
    edges {
      node {
        name
        relatedTopics {
          edges {
            node { name }
            edge { coOccurrenceCount }
          }
        }
      }
    }
  }
}
```

**N+1 Problem**: Use DataLoader for batch fetching related entities. Standard Apollo middleware.

---

## 6. Visualization UI

### For /explore/kg endpoint:

**Search-first flow** (not rendering full graph):
1. **Search bar**: "VO2 max in cyclists" → autocomplete from topics + sports
2. **Focus node**: Display selected paper/topic/sport in center
3. **Neighborhood graph**: Show 2-hop neighborhood (25–100 nodes typical)
4. **Context panel**: 
   - Node stats (paper count, avg evidence level)
   - Top edges (by effect_size, citation count, or confidence)
   - Filters (by sport, biomarker, confidence threshold)

**Implementation**:
- Backend: `POST /api/kg/neighborhood` — returns node + edges within N hops
- Frontend: Cytoscape.js + custom styling per node type
- Styling:
  ```javascript
  const cytoscapeStyle = [
    { selector: 'node[type="paper"]', style: { 
      width: 25, shape: 'diamond', 
      backgroundColor: `hsl(0, 0%, ${100 - confidence * 100}%)` // darker = higher confidence
    }},
    { selector: 'node[type="sport"]', style: { width: 20, shape: 'round', backgroundColor: '#fbbf24' }},
    { selector: 'node[type="biomarker"]', style: { width: 20, shape: 'hexagon', backgroundColor: '#60a5fa' }},
    { selector: 'edge', style: { 
      lineColor: '#d1d5db',
      width: d => Math.log(d.data('confidence') || 1) // thicker = higher confidence
    }}
  ];
  ```

**Alternative**: Radial/hierarchical view (no force-directed, friendlier UX)
```
                    [VO2 max]
                   /    |    \
          [Paper1] [Paper2] [Paper3]
            / | \    / | \    / | \
      [Sport] [Biomarker] [Outcome]
```

---

## 7. Implementation Roadmap

### **Phase 1 (Now → 3mo): Schema + Materialized Views**

Tasks:
1. Create `kg_sports`, `kg_body_regions`, `kg_biomarkers`, `kg_outcomes`, `kg_topics`, `kg_research_dimensions` tables
2. Create `kg_relationships` edge table with jsonb properties
3. Build materialized views (`kg_nodes`, `kg_edges`)
4. Add refresh trigger after verifier stage in `run_pipeline.py`
5. Write RPC functions (Supabase edge functions) for common queries

Cost: 1–2 weeks engineering

### **Phase 2 (3mo → 6mo): GraphQL API**

Tasks:
1. Set up Apollo Server (or use `postgraphile`)
2. Implement resolvers for neighborhood queries, filtering, sorting
3. Add DataLoader for N+1 avoidance
4. Test query performance at 1000-paper scale
5. Deploy as Vercel function or standalone service

Cost: 2–3 weeks engineering

### **Phase 3 (6mo → 9mo): Visualization**

Tasks:
1. Build `/explore/kg` page
2. Integrate Cytoscape.js
3. Implement search + focus node + neighborhood rendering
4. Add filters (sport, biomarker, confidence threshold)
5. Optional: statistics panel (top edges, co-occurrence heatmap)

Cost: 2–3 weeks engineering

---

## 8. Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| **Materialized views, not Neo4j** | Already in Postgres, no infrastructure cost, fast enough for 1000 papers, simpler ops |
| **GraphQL, not SPARQL** | Your team knows JS, SPARQL requires RDF expertise, GraphQL better tooling in Node |
| **Entity tables (pg_sports, etc.), not just tagger tags** | Enables rich properties (hierarchy, descriptions, measurement units) and relationships across papers |
| **Cytoscape.js, not D3 force-directed** | Built for biology networks, better layouts, less code |
| **Focus+context UI, not full-graph rendering** | 1000 nodes forces-layout explodes. Search-first is better UX anyway |
| **Confidence as edge property, not separate table** | jsonb properties are flexible, queries simple, aligns with tagger output |
| **Refresh after verifier, not real-time** | Nightly is sufficient, avoids lock contention with live writes |

---

## 9. Example Queries (SQL level, what GraphQL translates to)

```sql
-- Find papers most cited by others on VO2 max in cycling
SELECT p.title, p.doi, COUNT(DISTINCT r.source_node_id) as citing_papers
FROM kg_relationships r
JOIN papers p ON r.target_node_id = p.id
WHERE r.relation_type = 'CITES'
  AND r.target_node_id IN (
    SELECT p2.id FROM papers p2
    JOIN enrichments e ON p2.id = e.paper_id
    WHERE e.topics @> ARRAY['vo2max']::text[]
      AND e.sports @> ARRAY['cycling']::text[]
  )
GROUP BY p.id
ORDER BY citing_papers DESC
LIMIT 10;

-- Find interventions that most consistently improve VO2 max (by effect size)
SELECT i.name, AVG((r.properties->>'effect_size')::float) as avg_effect
FROM kg_relationships r
JOIN kg_interventions i ON r.source_node_id = i.id
WHERE r.relation_type = 'MODIFIES'
  AND r.target_node_id IN (SELECT id FROM kg_biomarkers WHERE name = 'VO2max')
  AND (r.properties->>'confidence')::float > 0.80
GROUP BY i.id
ORDER BY avg_effect DESC;

-- Two-hop neighborhood: papers → interventions → other papers
SELECT DISTINCT p2.title, p2.doi
FROM papers p1
JOIN kg_relationships r1 ON p1.id = r1.source_node_id AND r1.relation_type = 'EVALUATES'
JOIN kg_interventions i ON r1.target_node_id = i.id
JOIN kg_relationships r2 ON i.id = r2.source_node_id AND r2.relation_type = 'EVALUATED_BY'
JOIN papers p2 ON r2.target_node_id = p2.id
WHERE p1.id = $1 AND p1.id != p2.id
LIMIT 20;
```

---

## 10. Next Steps

1. **This week**: Review this document, validate node/edge design with domain knowledge
2. **Next 2 weeks**: Design Phase 1 migrations (Supabase), create entity tables
3. **Weeks 3–4**: Implement materialized views, test refresh performance
4. **Month 2–3**: Add GraphQL layer (Apollo or postgraphile)
5. **Month 3+**: Build visualization UI

---

## Appendix: Excluded Complexity

**Not recommending (for now):**
- RDF/SPARQL: overkill for 1000 papers, harder to manage
- Full-text search on graph (elasticsearch): Postgres FTS sufficient at this scale
- Real-time graph updates: Materialized views (nightly) are simpler and faster
- Vector similarity search: Domain-specific edges (cited papers, shared biomarkers) more interpretable than embeddings
- Multi-hop reasoning via LLM: Phase 3 refinement agent handles this
- Federated queries across external KGs: After Phase 1 is stable and valuable

---

**Document prepared**: 2026-06-02  
**Review & approval**: User + Claude Code team  
**Implementation owner**: To be assigned
