---
name: enrichment
description: >
  Use when writing or modifying LLM enrichment prompts, structured output
  schemas, Writer stage logic, or Tagger stage extraction. Also load when
  debugging hallucinated tags or incorrect evidence levels.
---

# Enrichment

## Writer stage — summary prompt
Prompt file: apps/worker/prompts/writer_system.txt
Input: title + abstract
Output: max 120-word evidence-based summary

Tone rules:
- Factual and neutral
- No "you should", no coaching language
- No hedging ("it seems", "perhaps")
- Format: 2–3 sentences on finding + 1 sentence practical context for endurance athletes

## Tagger stage — structured extraction
Prompt file: apps/worker/prompts/tagger_system.txt

JSON schema (response_format: json_schema):
```json
{
  "sports": ["running", "cycling"],
  "body_regions": ["calves", "quads"],
  "topics": ["vo2max", "intervals"],
  "evidence_level": 1,
  "sample_size": 42,
  "study_type": "RCT",
  "population": "trained",
  "confidence": {
    "sports": 0.9,
    "body_regions": 0.8,
    "topics": 0.9,
    "evidence_level": 0.9
  }
}
```

Enums:
- sports: running | cycling | rowing | skiing | hyrox | triathlon
  IMPORTANT: assign multiple sports for cross-sport papers (see tagger_system.txt rules)
- research_dimensions (cross-cutting lenses, separate from topics — assign all that apply):
    female_athlete | masters_longevity | supplements | technology_wearables | ai_ml_research | para_sport
- study_type: RCT | cohort | review | case_study | mechanistic | meta_analysis | cross_sectional
- population: recreational | trained | elite | mixed | unknown
- evidence_level: 1–4 (see ingestion-pipeline skill)

Topics (full list):
  vo2max | lactate | hrv | cardiac_output | altitude | biomechanics |
  pacing | heat_performance | fatigue | periodization | intervals |
  strength | overtraining | sleep | active_recovery | passive_recovery |
  hrv_recovery | carbohydrates | protein | hydration | supplements |
  gut_health | tendon | stress_fracture | it_band | plantar_fascia |
  knee | hamstring | prevention | psychology | pacing_strategy | pain_tolerance |
  marathon | half_marathon | ultramarathon | trail_running | 5k_10k

## Verifier checks
- DOI regex: `^10\.\d{4,}/\S+$`
- Summary ≤ 150 words
- At least 1 sport tag
- Evidence level assigned (not null)
- No hallucinated journal names (cross-check source field)
- paper_id exists in papers table (FK integrity)

## Cost optimization
Use claude-haiku-4-5-20251001 for Writer + Tagger at scale.
Use claude-sonnet-4-6 only for quality checks or ambiguous papers.
Batch API calls where possible (up to 20 papers per run).

## Confidence Scoring
Tagger outputs confidence score (0.0–1.0) per extracted field.
Add to json_schema response_format:

  "confidence": {
    "sports": 0.95,
    "body_regions": 0.80,
    "topics": 0.90,
    "evidence_level": 0.85
  }

Thresholds:
  ≥ 0.85 → auto-commit tag
  0.60–0.84 → flag for review (status: "needs_review" in enrichments table)
  < 0.60 → reject tag, leave field null

Low-confidence papers are stored but excluded from feed until manually reviewed.

## Reflection / Self-Critique (Writer stage)
After generating summary, Writer runs a self-check pass:
  - Does summary contradict the abstract? → regenerate
  - Does summary contain coaching language ("you should", "try to")? → strip and rewrite
  - Is summary > 120 words? → truncate at sentence boundary
Max 1 retry. If still failing after retry → flag paper, skip enrichment.
